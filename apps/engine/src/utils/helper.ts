import { TradeStatus, TradeType } from "@repo/common/types";
import { storeManager } from "./store";
import { createClient } from "redis";

export const validateRequireEnvs = (envs: string[]) => {
  const requiredEnvs = [];
  for (const env of envs) {
    if (!env) {
      requiredEnvs.push(env);
    }
  }

  if (requiredEnvs.length > 0) {
    throw new Error(`These envs are required ${requiredEnvs.join(",")}`);
  }
};

export const throwError = (statusCode: number, errorMessage: any) => {
  const error = new Error(errorMessage) as Error & { statusCode: number };
  error.statusCode = statusCode;
  console.log({ statusCode: error.statusCode, smsg: error.message });
  throw error;
};

export const createTrade = (
  leverage: number | undefined,
  qty: number | undefined,
  type: TradeType,
  margin: number | undefined,
  //   balance: Record<string, { qty: number; type: TradeType }>,
  assetPrice: { bid: number; ask: number },
  symbol: string
) => {
  let orderId;
  const balance = storeManager.getBalance();
  // in both buy and sell, we are decreasing the quantity. because this route is only to make order open, not close. so in both the cases user will making an order.
  if (!leverage) {
    if (!qty) throwError(400, "qty should be greater than 0");
    qty = qty!;
    if (type === TradeType.BUY) {
      if (!balance["usd"] || assetPrice.bid * qty > balance["usd"]?.qty) {
        throwError(400, "Insufficient balance");
      }

      if (!balance[symbol]) {
        balance[symbol] = { qty: 0, type: TradeType.BUY };
      }

      balance[symbol].qty += qty;
      balance[symbol].type = TradeType.BUY;

      orderId = storeManager.storeTrade({
        type: TradeType.BUY,
        symbol,
        qty,
        openPrice: assetPrice.bid,
        status: TradeStatus.OPEN,
      });
      storeManager.updateBalance(
        "usd",
        balance["usd"].qty - assetPrice.bid * qty
      );
      storeManager.updateBalance(
        symbol,
        balance[symbol].qty,
        balance[symbol].type
      );
    } else if (type === TradeType.SELL) {
      // (rough) need to check again..... good night
      if (!balance["usd"] || assetPrice.ask * qty > balance["usd"]?.qty) {
        throwError(400, "Insufficient balance");
      }

      if (!balance[symbol]) {
        balance[symbol] = { qty: 0, type: TradeType.SELL };
      }

      balance[symbol].qty += qty;
      balance[symbol].type = TradeType.SELL;

      orderId = storeManager.storeTrade({
        type: TradeType.SELL,
        symbol,
        qty,
        openPrice: assetPrice.ask,
        status: TradeStatus.OPEN,
      });
      storeManager.updateBalance(
        "usd",
        balance["usd"].qty - assetPrice.ask * qty
      );
      storeManager.updateBalance(
        symbol,
        balance[symbol].qty,
        balance[symbol].type
      );
    }
  } else {
    if (margin! > storeManager.getBalance()["usd"].qty) {
      throwError(400, "Insufficient balance");
    }
    const positionSize = margin! * leverage;

    if (type === TradeType.BUY) {
      const qty = positionSize / assetPrice.bid;
      storeManager.updateBalance(
        "usd",
        balance["usd"].qty - margin!,
        TradeType.BUY
      );
      storeManager.updateBalance(symbol, qty, TradeType.BUY);
      orderId = storeManager.storeTrade({
        type: TradeType.BUY,
        symbol,
        qty,
        openPrice: assetPrice.bid,
        status: TradeStatus.OPEN,
        margin,
        leverage,
      });
    } else if (type === TradeType.SELL) {
      const qty = positionSize / assetPrice.ask;

      storeManager.updateBalance(
        "usd",
        balance["usd"].qty - margin!,
        TradeType.SELL
      );
      storeManager.updateBalance(symbol, qty, TradeType.SELL);
      orderId = storeManager.storeTrade({
        type: TradeType.SELL,
        symbol,
        qty,
        openPrice: assetPrice.ask,
        status: TradeStatus.OPEN,
        margin,
        leverage,
      });
    } else {
      throwError(400, "Invalid order type it should be `buy` | `sell`");
    }
  }

  return { orderId, message: "Trade created successfully" };
};

export const createRedisClient = async (): Promise<any> => {
  const client = createClient({
    url:
      process.env.REDIS_URL ||
      "redis://default:WA9nGxg5rO2UR3GYCb8uwxx96zfrxV6w@redis-14029.c241.us-east-1-4.ec2.redns.redis-cloud.com:14029",
  });

  client.on("error", (err) => console.error("Redis Client Error", err));
  await client.connect();
  console.log("Redis connected. Listening for messages...");
  return client;
};
