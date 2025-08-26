import axios from "axios";
import dotenv, { parse } from "dotenv";
dotenv.config();
import { WebSocket } from "ws";
import { pubSubManager } from "./utils/services";

const wss = new WebSocket(
  "wss://stream.binance.com:9443/stream?streams=btcusdt@trade"
);

const dataToPushToDB = [];

interface MessageData {
  e: string;
  p: string;
  T: number;
}
interface Message {
  data: MessageData;
}

const main = async () => {
  console.log("connecting ws");

  setTimeout(() => {
    // pushing to db after 10sec
  }, 10 * 1000);
  wss.on("message", async (msg) => {
    const parsedData: Message = JSON.parse(msg.toString());

    const { data } = parsedData;
    const price = parseFloat(data.p);
    const payload = {
      event: data.e,
      price: (price * 2) / 100 + price,
      time: data.T,
    };
    console.log("data", payload);
    await pubSubManager.publish("live_feed", payload);
    dataToPushToDB.push(parsedData);
  });
};

main();
