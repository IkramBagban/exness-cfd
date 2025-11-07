import dotenv from "dotenv";
import prismaClient from "@repo/db";
dotenv.config();
import { WebSocket } from "ws";
import { pubSubManager } from "./utils/services";
import { createRedisClient } from "@repo/services";

const symbols = ["btcusdt", "ethusdt", "solusdt"];
export const CREATE_ORDER_QUEUE = "trade-stream";

const streams = symbols.map((s) => `${s}@trade`).join("/");
const wsURL = `wss://stream.binance.com:9443/stream?streams=${streams}`;
console.log(wsURL);

interface MessageData {
  e: string;
  p: string;
  T: number;
  s: string;
}
interface Message {
  data: MessageData;
}

interface Tick {
  symbol: string;
  bid: number;
  ask: number;
  time: Date;
}

const buffer: any[] = [];
let updatedTickForstream: Tick | {} = {};

const connectWs = () => {
  let wss = new WebSocket(wsURL);
  console.log("Connecting to Binance WS...");
  const pingInterval = setInterval(() => {
    if (wss.readyState === WebSocket.OPEN) wss.ping();
  }, 30000);

  wss.on("open", () => console.log("Connected to Binance stream"));

  wss.on("message", async (msg) => {
    const parsedData: Message = JSON.parse(msg.toString());
    const { data } = parsedData;
    const price = parseFloat(data.p);

    const tick = {
      time: new Date(data.T),
      symbol: data.s,
      price: price,
    };

    buffer.push(tick);

    const bidPrice = price + (price * 1) / 100;
    const askPrice = price;

    updatedTickForstream = {
      time: new Date(data.T),
      symbol: data.s,
      bid: bidPrice,
      ask: askPrice,
    };
  });
  wss.on("close", (code) => {
    console.warn(`Binance WS closed (${code}), reconnecting in 5s...`);
    clearInterval(pingInterval);
    setTimeout(connectWs, 5000);
  });

  wss.on("error", (err) => {
    console.error("Binance WS error:", err.message);
    wss.close();
  });
};

const main = async () => {
  try {
    const client = await createRedisClient(process.env.REDIS_URL!);

    connectWs();

    setInterval(async () => {
      if (Object.keys(updatedTickForstream).length === 0) return;
      await client.xAdd(
        CREATE_ORDER_QUEUE,
        "*",
        {
          message: JSON.stringify({ ...updatedTickForstream, kind: "tick" }),
        },
        {
          TRIM: {
            strategy: "MAXLEN",
            threshold: 1000,
            strategyModifier: "~",
          },
        }
      );

      await Promise.all([
        pubSubManager.publish("live_feed", updatedTickForstream),
        pubSubManager.publish(
          `live_feed:${(updatedTickForstream as Tick).symbol}`,
          updatedTickForstream
        ),
      ]);
    }, 100);

    setInterval(async () => {
      if (buffer.length > 0) {
        const batch = [...buffer];
        buffer.length = 0;

        try {
          await prismaClient.ticks.createMany({
            data: batch,
            skipDuplicates: true,
          });
        } catch (err) {
          console.error("Dv insert error:", err);
        }
      }
    }, 10000);
  } catch (error) {
    console.error("Error:", error);
  }
};

main().catch((err) => {
  console.error("Price poller crashed:", err);
});
