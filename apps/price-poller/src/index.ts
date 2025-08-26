import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
import { WebSocket, WebSocketServer } from "ws";
import { pubSubManager } from "./utils/services";

const wss = new WebSocket(
  "wss://stream.binance.com:9443/stream?streams=btcusdt@bookTicker"
);

const main = async () => {
  console.log("connecting ws");
  wss.on("message", async (data) => {
    const parsedData = JSON.parse(data.toString());
    // console.log("data", parsedData);
    await pubSubManager.publish("live_feed", parsedData);
  });
};

main();
