import { WebSocket, WebSocketServer } from "ws";
import dotenv from "dotenv";
dotenv.config();
import { pubSubManager } from "./utils/services";

const wss = new WebSocketServer({ port: 8080 });

const main = async () => {
  console.log("connecting to subscriber");

  let isSubscribed = false;

  wss.on("connection", async (ws) => {
    console.log("Client connected");

    if (!isSubscribed) {
      isSubscribed = true;
      await pubSubManager.subscribe("live_feed", (msg) => {
        wss.clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            client.send(msg);
          }
        });
      });
    }

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
};

main();
