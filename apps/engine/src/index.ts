import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";
import { createRedisClient } from "./utils/helper";
import { storeManager } from "./utils/store";
import {
  assetPrices,
  CALLBACK_QUEUE,
  CREATE_ORDER_QUEUE,
} from "./utils/constants";
import {
  getOpenOrders,
  handleCreateOrder,
  getBalance,
  checkLiquidation,
  handleCloseOrder,
  getClosedTrades,
  getAssets,
} from "./utils/action";

dotenv.config();

const handleMessage = async (client: RedisClientType, msg: any, id: string) => {
  const USDBalance = storeManager.getBalance().usd?.qty;
  console.log("\n\n============= Received message:\n", msg);

  switch (msg.kind) {
    case "create-order":
      await handleCreateOrder(client, msg, USDBalance);
      break;
    case "get-open-trades":
      await getOpenOrders({ id: msg.id, client });
      break;
    case "close-trade":
      await handleCloseOrder({
        orderId: msg.orderId,
        id: msg.id,
        client,
      });
      break;
    case "get-closed-trades":
      await getClosedTrades({ id: msg.id, client });
      break;
    case "get-assets":
      await getAssets({ id: msg.id, client });
      break;
    case "get-balance":
      await getBalance({ id: msg.id, client });
      break;
    case "tick":
      assetPrices[msg.symbol] = { bid: msg.bid, ask: msg.ask };
      checkLiquidation();
      break;
    default:
      console.warn("Invalid message format, missing or unknown 'kind' field");
  }
};

const main = async () => {
  const client = await createRedisClient();

  let lastId = "0";

  while (true) {
    const messages = await client.xRead(
      { key: CREATE_ORDER_QUEUE, id: lastId },
      { COUNT: 50, BLOCK: 0 } 
    );

    if (!messages) continue;

    for (const { messages: msgs } of messages) {
      for (const { id, message: values } of msgs) {
        try {
          const msg = JSON.parse(values.message as string);
          await handleMessage(client, msg, id);
        } catch (err) {
          console.error("Error handling message:", err);
        }
        lastId = id;
      }
    }
  }
};

main().catch((err) => {
  console.error("Engine crashed:", err);
  process.exit(1);
});
