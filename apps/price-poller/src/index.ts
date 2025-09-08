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
const wss = new WebSocket(wsURL);

interface MessageData {
  e: string;
  p: string;
  T: number;
  s: string;
}
interface Message {
  data: MessageData;
}

const buffer: any[] = [];

const main = async () => {
  try {
    const client = await createRedisClient(process.env.REDIS_URL!);

    console.log("connecting ws");

    let updatedTickForstream:
      | {
          symbol: string;
          bid: number;
          ask: number;
          time: Date;
        }
      | {} = {};
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
        symbol: data.s,
        bid: bidPrice,
        ask: askPrice,
        time: new Date(data.T),
      };

      Promise.all([
        pubSubManager.publish("live_feed", {
          time: new Date(data.T),
          symbol: data.s,
          bid: bidPrice,
          ask: askPrice,
        }),
        pubSubManager.publish(`live_feed:${data.s}`, {
          time: new Date(data.T),
          symbol: data.s,
          bid: bidPrice,
          ask: askPrice,
        }),
      ]);
    });

    setInterval(async () => {
      if (Object.keys(updatedTickForstream).length === 0) return;
      await client.xAdd(CREATE_ORDER_QUEUE, "*", {
        message: JSON.stringify({ ...updatedTickForstream, kind: "tick" }),
      });
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

main();
