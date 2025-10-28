import { RedisClientType } from "redis";
import { assetPrices, CALLBACK_QUEUE } from "./constants";
import { createTrade } from "./helper";
import { storeManager } from "./store";
import { TradeType, TradeStatus } from "@repo/common/types";
import { userManager } from "./user-manager";
import jwt from "jsonwebtoken";

// Helper to add messages with automatic trimming
const xAddWithTrim = async (client: any, queue: string, data: any) => {
  return await client.xAdd(queue, "*", data, {
    TRIM: {
      strategy: "MAXLEN",
      threshold: 500,
      strategyModifier: "~"
    }
  });
};

export const handleCreateOrder = async (
  client: RedisClientType,
  msg: any,
  USDBalance: number | undefined
) => {
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
    }, {
      TRIM: {
        strategy: "MAXLEN",
        threshold: 500,
        strategyModifier: "~"
      }
    });
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const errorMessage = error?.message || "Internal Server Error";

    await client.xAdd(CALLBACK_QUEUE, "*", {
      id,
      error: JSON.stringify({ statusCode, message: errorMessage }),
      data: "{}",
    }, {
      TRIM: {
        strategy: "MAXLEN",
        threshold: 500,
        strategyModifier: "~"
      }
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
    }, {
      TRIM: {
        strategy: "MAXLEN",
        threshold: 500,
        strategyModifier: "~"
      }
    });
  } catch (error) {
    const statusCode = (error as any).statusCode || 500;
    const errorMessage = (error as any).message || "Internal Server Error";
    await xAddWithTrim(client, CALLBACK_QUEUE, {
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

  console.log("trade", trade)
  if (!trade) {
    await xAddWithTrim(client, CALLBACK_QUEUE, {
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

      console.log("market price", marketPrice)
  if (!marketPrice) {
    await xAddWithTrim(client, CALLBACK_QUEUE, {
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
      await xAddWithTrim(client, CALLBACK_QUEUE, {
        id,
        error: JSON.stringify({
          statusCode: 400,
          message: "Trade quantity is zero or undefined",
        }),
        data: "{}",
      });
      return;
    }

    /// buy at 100;
    // 10 qty 
    // market price = 110
    // proceed = 110 * 10 = 1100 
    // new balance = 

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

  await xAddWithTrim(client, CALLBACK_QUEUE, {
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
    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: "{}",
      data: JSON.stringify(responseData),
    });
  } catch (error) {
    const statusCode = (error as any).statusCode || 500;
    const errorMessage = (error as any).message || "Internal Server Error";
    await xAddWithTrim(client, CALLBACK_QUEUE, {
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
        openPrice: trade.openPrice, 
        closePrice: trade.closePrice!, 
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

    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: "{}",
      data: JSON.stringify(formattedTrades),
    });
  } catch (error) {
    const statusCode = (error as any).statusCode || 500;
    const errorMessage = (error as any).message || "Internal Server Error";
    await xAddWithTrim(client, CALLBACK_QUEUE, {
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

    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: "{}",
      data: JSON.stringify(responseData),
    });
  } catch (error) {
    const statusCode = (error as any).statusCode || 500;
    const errorMessage = (error as any).message || "Internal Server Error";
    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: JSON.stringify({ statusCode, message: errorMessage, error }),
      data: "{}",
    });
  }
};

export const handleSignup = async ({
  id,
  client,
  email,
}: {
  id: string;
  client: any;
  email: string;
}) => {
  try {
    if (userManager.userExists(email)) {
      await xAddWithTrim(client, CALLBACK_QUEUE, {
        id,
        error: JSON.stringify({ statusCode: 409, message: "User already exists with this email" }),
        data: "{}",
      });
      return;
    }

    console.log("process.env.JWT_SECRET", process.env.JWT_SECRET);
    const verificationToken = jwt.sign(
      { email, action: "signup" },
      process.env.JWT_SECRET! || "mysupersecret",
      { expiresIn: "1h" }
    );

    userManager.addPendingVerification(email, "signup", verificationToken);

    const responseData = {
      message: "Verification token generated successfully",
      verificationToken,
    };



    console.log("Verification token generated:");
    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: "{}",
      data: JSON.stringify(responseData),
    });
  } catch (error) {
    const statusCode = (error as any).statusCode || 500;
    const errorMessage = (error as any).message || "Internal Server Error";
    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: JSON.stringify({ statusCode, message: errorMessage, error }),
      data: "{}",
    });
  }
};

export const handleSignin = async ({
  id,
  client,
  email,
}: {
  id: string;
  client: any;
  email: string;
}) => {
  try {
    if (!userManager.userExists(email)) {
      await xAddWithTrim(client, CALLBACK_QUEUE, {
        id,
        error: JSON.stringify({ statusCode: 404, message: "No account found with this email. Please sign up first." }),
        data: "{}",
      });
      return;
    }

    const user = userManager.getUserByEmail(email);
    
    const verificationToken = jwt.sign(
      { email, userId: user?.id, action: "signin" },
      process.env.JWT_SECRET! || "mysupersecret",
      { expiresIn: "1h" }
    );

    userManager.addPendingVerification(email, "signin", verificationToken);

    const responseData = {
      message: "Sign-in verification token generated successfully",
      verificationToken,
    };

    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: "{}",
      data: JSON.stringify(responseData),
    });
  } catch (error) {
    const statusCode = (error as any).statusCode || 500;
    const errorMessage = (error as any).message || "Internal Server Error";
    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: JSON.stringify({ statusCode, message: errorMessage, error }),
      data: "{}",
    });
  }
};

export const handleVerifyAuth = async ({
  id,
  client,
  token,
}: {
  id: string;
  client: any;
  token: string;
}) => {
  try {
    const result = userManager.completeVerification(token);
    
    if (!result.success || !result.user) {
      await xAddWithTrim(client, CALLBACK_QUEUE, {
        id,
        error: JSON.stringify({ statusCode: 400, message: result.error || "Verification failed" }),
        data: "{}",
      });
      return;
    }

    const sessionToken = userManager.createSession(result.user.id);

    const responseData = {
      message: result.user ? "Authentication successful" : "User created and authenticated",
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
      },
      sessionToken,
    };

    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: "{}",
      data: JSON.stringify(responseData),
    });
  } catch (error) {
    const statusCode = (error as any).statusCode || 500;
    const errorMessage = (error as any).message || "Internal Server Error";
    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: JSON.stringify({ statusCode, message: errorMessage, error }),
      data: "{}",
    });
  }
};

export const handleLogout = async ({
  id,
  client,
  sessionToken,
}: {
  id: string;
  client: any;
  sessionToken: string;
}) => {
  try {
    const removed = userManager.removeSession(sessionToken);

    const responseData = {
      message: removed ? "Logged out successfully" : "Session not found",
    };

    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: "{}",
      data: JSON.stringify(responseData),
    });
  } catch (error) {
    const statusCode = (error as any).statusCode || 500;
    const errorMessage = (error as any).message || "Internal Server Error";
    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: JSON.stringify({ statusCode, message: errorMessage, error }),
      data: "{}",
    });
  }
};

export const getUserStats = async ({
  id,
  client,
}: {
  id: string;
  client: any;
}) => {
  try {
    const stats = userManager.getStats();
    
    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: "{}",
      data: JSON.stringify(stats),
    });
  } catch (error) {
    const statusCode = (error as any).statusCode || 500;
    const errorMessage = (error as any).message || "Internal Server Error";
    await xAddWithTrim(client, CALLBACK_QUEUE, {
      id,
      error: JSON.stringify({ statusCode, message: errorMessage, error }),
      data: "{}",
    });
  }
};
