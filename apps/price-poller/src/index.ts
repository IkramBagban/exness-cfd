import dotenv from "dotenv";
dotenv.config();
import { WebSocket } from "ws";
import { pubSubManager } from "./utils/services";
import prismaClient from "@repo/db";

const wss = new WebSocket(
  "wss://stream.binance.com:9443/stream?streams=btcusdt@trade"
);

interface MessageData {
  e: string;
  p: string;
  T: number;
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
      symbol: "BTCUSDT",
      price,
    };

    buffer.push(tick);

    await pubSubManager.publish("live_feed", tick);
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
  }, 2000);
};

main();
