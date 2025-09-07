import { RedisClientType } from "redis";
import { assetPrices, CALLBACK_QUEUE } from "./constants";
import { createTrade } from "./helper";
import { storeManager } from "./store";

export const handleCreateOrder = async (
  client: RedisClientType,
  msg: any,
  USDBalance: number | undefined
) => {
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
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const errorMessage = error?.message || "Internal Server Error";

    await client.xAdd(CALLBACK_QUEUE, "*", {
      id,
      error: JSON.stringify({ statusCode, message: errorMessage }),
      data: "{}",
    });
  }
};

export const getOpenOrders = async ({
  id,
  client,
}: {
  id: string;
  client: any;
}) => {
  try {
    const openTrades = storeManager.getOpenTrades() || [];
    await client.xAdd(CALLBACK_QUEUE, "*", {
      id,
      error: "{}",
      data: JSON.stringify(openTrades),
    });
  } catch (error) {
    const statusCode = (error as any).statusCode || 500;
    const errorMessage = (error as any).message || "Internal Server Error";
    await client.xAdd(CALLBACK_QUEUE, "*", {
      id,
      error: JSON.stringify({ statusCode, message: errorMessage, error }),
      data: "{}",
    });
  }
};
