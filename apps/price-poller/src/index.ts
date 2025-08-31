import dotenv from "dotenv";
dotenv.config();
import { WebSocket } from "ws";
import { pubSubManager } from "./utils/services";
import prismaClient from "@repo/db";

const symbols = ["btcusdt", "ethusdt", "solusdt"];

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
  console.log("connecting ws");

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

    // const bidPrice = price + (price * 5) / 100;
    // const askPrice = price - (price * 5) / 100;
    const bidPrice = price + (price * 1) / 100;
    const askPrice = price;
    Promise.all([
      await pubSubManager.publish("live_feed", {
        time: new Date(data.T),
        symbol: data.s,
        bid: bidPrice,
        ask: askPrice,
      }),
      await pubSubManager.publish(`live_feed:${data.s}`, {
        time: new Date(data.T),
        symbol: data.s,
        bid: bidPrice,
        ask: askPrice,
      }),
    ]);
  });

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
};

main();
