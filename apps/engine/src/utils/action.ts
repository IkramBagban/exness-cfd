import { RedisClientType } from "redis";
import { assetPrices, CALLBACK_QUEUE } from "./constants";
import { createTrade } from "./helper";
import { storeManager } from "./store";
import { TradeType, TradeStatus } from "@repo/common/types";

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

export const handleCloseOrder = async ({
  id,
  orderId,
  client,
}: {
  id: string;
  orderId: string;
  client: RedisClientType;
}) => {
  const trade = storeManager.getTradeById(orderId);

  if (!trade) {
    await client.xAdd(CALLBACK_QUEUE, "*", {
      id,
      error: JSON.stringify({ statusCode: 404, message: "Trade not found" }),
      data: "{}",
    });
    return;
  }

  const marketPrice =
    trade.type === TradeType.BUY
      ? assetPrices[trade.symbol].ask
      : assetPrices[trade.symbol].bid;

  if (!marketPrice) {
    await client.xAdd(CALLBACK_QUEUE, "*", {
      id,
      error: JSON.stringify({
        statusCode: 400,
        message: "Market price not available for the symbol",
      }),
      data: "{}",
    });
    return;
  }

  const balance = storeManager.getBalance();
  let newUsdBalance: number;

  if (trade.margin && trade.leverage) {
    const pnl =
      trade.type === TradeType.BUY
        ? (marketPrice - trade.openPrice) * trade.qty
        : (trade.openPrice - marketPrice) * trade.qty;

    const equity = trade.margin + pnl;
    newUsdBalance = balance.usd.qty + equity;

    console.log(`Trade ${orderId} closed with PnL: ${pnl}`);
  } else {
    if (!trade.qty) {
      await client.xAdd(CALLBACK_QUEUE, "*", {
        id,
        error: JSON.stringify({
          statusCode: 400,
          message: "Trade quantity is zero or undefined",
        }),
        data: "{}",
      });
      return;
    }

    const proceeds = trade.qty * marketPrice;
    newUsdBalance = balance.usd.qty + proceeds;

    const pnl =
      (trade.type === TradeType.BUY
        ? marketPrice - trade.openPrice
        : trade.openPrice - marketPrice) * trade.qty;

    console.log({
      orderId,
      pnl,
      marketPrice,
      openPrice: trade.openPrice,
      qty: trade.qty,
      proceeds,
      balance: balance.usd.qty,
      newUsdBalance,
      prices: assetPrices[trade.symbol],
    });
  }

  await storeManager.closeTrade(orderId, marketPrice);
  storeManager.updateBalance("usd", newUsdBalance!);

  await client.xAdd(CALLBACK_QUEUE, "*", {
    id,
    error: "{}",
    data: JSON.stringify({ message: "Trade closed successfully" }),
  });
};

export const getBalance = async ({
  id,
  client,
}: {
  id: string;
  client: any;
}) => {
  try {
    const balance = storeManager.getBalance();
    const responseData = { usd_balance: balance.usd?.qty };
    await client.xAdd(CALLBACK_QUEUE, "*", {
      id,
      error: "{}",
      data: JSON.stringify(responseData),
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

export const getClosedTrades = async ({
  id,
  client,
}: {
  id: string;
  client: any;
}) => {
  try {
    const closedTrades = storeManager.getClosedTrades() || [];
    
    const formattedTrades = closedTrades.map(trade => {
      const pnl = trade.type === TradeType.BUY 
        ? (trade.closePrice! - trade.openPrice) * trade.qty
        : (trade.openPrice - trade.closePrice!) * trade.qty;

      const response: any = {
        orderId: trade.orderId,
        type: trade.type,
        openPrice: trade.openPrice * 10000, 
        closePrice: trade.closePrice! * 10000, 
        pnl: pnl, 
      };

      if (trade.leverage && trade.margin) {
        response.leverage = trade.leverage;
        response.margin = trade.margin;
      } else {
        response.qty = trade.qty;
      }

      return response;
    });

    await client.xAdd(CALLBACK_QUEUE, "*", {
      id,
      error: "{}",
      data: JSON.stringify(formattedTrades),
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

export const checkLiquidation = () => {
  const openTrades = storeManager.getOpenTrades();
  if (!openTrades || openTrades.length === 0) return;

  const liquidatedTrades: string[] = [];

  for (const trade of openTrades) {
    if (!trade.leverage || !trade.margin) continue;

    const currentPrices = assetPrices[trade.symbol];
    if (!currentPrices) continue;

    const markPrice =
      trade.type === TradeType.BUY ? currentPrices.bid : currentPrices.ask;

    const pnl =
      trade.type === TradeType.BUY
        ? (markPrice - trade.openPrice) * trade.qty
        : (trade.openPrice - markPrice) * trade.qty;

    const equity = trade.margin + pnl;

    const positionSize = trade.margin * trade.leverage;
    const maintenanceMarginRatio = 0.005; // 0.5%
    const maintenanceMargin = positionSize * maintenanceMarginRatio;

    if (equity <= maintenanceMargin) {
      console.log(
        `Liquidating trade ${trade.orderId}: equity ${equity} <= maintenance margin ${maintenanceMargin}`
      );

      storeManager.closeTrade(trade.orderId, markPrice);

      const balance = storeManager.getBalance();
      const newUsdBalance = balance.usd.qty + equity; // equity can be negative here, so if user get liquidated with their margin and some loss, their usd balance will decrease.
      storeManager.updateBalance("usd", newUsdBalance);

      liquidatedTrades.push(trade.orderId);
    }
  }

  if (liquidatedTrades.length > 0) {
    console.log(
      `Liquidated ${liquidatedTrades.length} trades:`,
      liquidatedTrades
    );
  }
};

export const getAssets = async ({
  id,
  client,
}: {
  id: string;
  client: any;
}) => {
  try {
    const assetsMetadata = [
      {
        name: "Bitcoin",
        symbol: "BTCUSDT",
        imageUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.png"
      },
      {
        name: "Ethereum",
        symbol: "ETHUSDT", 
        imageUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png"
      },
      {
        name: "Solana",
        symbol: "SOLUSDT",
        imageUrl: "https://cryptologos.cc/logos/solana-sol-logo.png"
      }
    ];

    const assets = assetsMetadata.map(asset => {
      const livePrice = assetPrices[asset.symbol];
      return {
        name: asset.name,
        symbol: asset.symbol,
        buyPrice: livePrice?.ask || 0,
        sellPrice: livePrice?.bid || 0,
        imageUrl: asset.imageUrl
      };
    });

    const responseData = { assets };

    await client.xAdd(CALLBACK_QUEUE, "*", {
      id,
      error: "{}",
      data: JSON.stringify(responseData),
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
