import { createClient } from "redis";
import dotenv from "dotenv";
import { createTrade } from "./utils/helper";
import { storeManager } from "./utils/store";
dotenv.config();

export const CREATE_ORDER_QUEUE = "trade-stream";
export const CALLBACK_QUEUE = "callback-queue";

// console.log("Redis URL:", process.env.REDIS_URL);

const assetPrices: Record<string, { bid: number; ask: number }> = {};

const main = async () => {
  const client = createClient({
    url:
      process.env.REDIS_URL! ||
      "redis://default:WA9nGxg5rO2UR3GYCb8uwxx96zfrxV6w@redis-14029.c241.us-east-1-4.ec2.redns.redis-cloud.com:14029",
  });

  client.on("error", (err) => console.log("Redis Client Error", err));

  await client.connect();
  console.log("Listening for messages...");

  while (true) {
    const messages = await client.xRead(
      {
        key: CREATE_ORDER_QUEUE,
        id: "$",
      },
      { COUNT: 10, BLOCK: 0 }
    );

    // console.log("Messages:", JSON.stringify(messages));

    if (!messages) {
      continue;
    }

    // @ts-ignore
    const { name, messages: msgs } = messages[0];
    // console.log(`Received ${msgs.length} messages from ${name}`);
    // console.log({ name, msgs: msgs });

    for (const message of msgs) {
      const { id, message: values } = message;

      // currently i am not doing this based on user. so just taking the usd balance which currently global here, means currently there is no concept of user in this.
      const USDBalance = storeManager.getBalance().usd?.qty;
      const msg = JSON.parse(values.message as string);
      console.log("msg", msg);
      if (!msg.kind) {
        console.log("Invalid message format, missing 'kind' field");
        continue;
        // console.log("USDBalance", USDBalance);
      }

      if (msg.kind === "create-order") {
        console.log("create trade USDBalance", USDBalance);
        const { symbol, type, qty, leverage, margin, id } = msg;
        try {
          const tradeResponse = createTrade(
            leverage,
            qty,
            type,
            margin,
            assetPrices[symbol],
            symbol
          );
          await client.xAdd(CALLBACK_QUEUE, "*", {
            id,
            error: "{}",
            data: JSON.stringify(tradeResponse),
          });
        } catch (error) {
          const statusCode = (error as any).statusCode || 500;
          const errorMessage =
            (error as any).message || "Internal Server Error";
          await client.xAdd(CALLBACK_QUEUE, "*", {
            id,
            error: JSON.stringify({ statusCode, message: errorMessage, error }),
            data: "{}",
          });
        }
      } else if (msg.kind === "get-open-trades") {
        const { id } = msg;
        try {
          const openTrades = storeManager.getOpenTrades() || [];
          await client.xAdd(CALLBACK_QUEUE, "*", {
            id,
            error: "{}",
            data: JSON.stringify(openTrades),
          });
        } catch (error) {
          const statusCode = (error as any).statusCode || 500;
          const errorMessage =
            (error as any).message || "Internal Server Error";
          await client.xAdd(CALLBACK_QUEUE, "*", {
            id,
            error: JSON.stringify({ statusCode, message: errorMessage, error }),
            data: "{}",
          });
        }
      } else if (msg.kind === "tick") {
        const { symbol, bid, ask, time } = msg;
        assetPrices[symbol] = { bid, ask };
      }
      // console.log("Received message:", msg);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

main();
