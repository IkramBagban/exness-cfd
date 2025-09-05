import cors from "cors";
import prismaClient from "@repo/db";
import authRoutes from "./routes/auth.route";
import express, { NextFunction, Request, Response } from "express";
import { throwError, validateRequireEnvs } from "./utils/helper";
import { createTradeSchema, TradeType } from "@repo/common";
import { storeManager, StoreManager } from "./utils/store";
import { pubSubManager } from "./utils/pubsub";

import { TradeStatus } from "@repo/common/types";
const app = express();

const requiredEnvsKeys = ["JWT_SECRET"];

validateRequireEnvs(requiredEnvsKeys);

app.use(express.json());
app.use(cors());
app.use("/api/v1", authRoutes);

const tableMap: Record<string, string> = {
  "1m": "candles_1m",
  "5m": "candles_5m",
  "15m": "candles_15m",
  "1h": "candles_1h",
  "1d": "candles_1d",
};

// { BITC: {bid: 12, ask: 21}}
const assetPrices: Record<string, { bid: number; ask: number }> = {};

pubSubManager.subscribe("live_feed", (msg) => {
  const { symbol, bid, ask }: { symbol: string; bid: number; ask: number } =
    JSON.parse(msg);
  assetPrices[symbol] = { bid, ask };

  const allLeverageOrder = storeManager.orders.filter(
    (o) => o.status === TradeStatus.OPEN && o.leverage && o.margin
  );

  for (const o of allLeverageOrder) {
    if (o.symbol !== symbol) continue;

    const positionSize = o.margin * o.leverage;
    const markPrice = o.type === TradeType.BUY ? bid : ask;
    const pnl =
      (markPrice - o.openPrice) * o.qty * (o.type === TradeType.BUY ? 1 : -1);

    const equity = o.margin + pnl;

    const mmr = 0.005;
    const maintenanceMargin = positionSize * mmr;

    if (equity <= maintenanceMargin) {
      storeManager.closeTrade(o.orderId, markPrice);
    }
  }
});

app.get("/api/v1/candles", async (req, res, next) => {
  const { symbol = "BTCUSDT", interval = "1h", limit = "100" } = req.query;
  const tableName = tableMap[interval as string];
  console.log({ symbol, interval, limit });

  if (!tableName) {
    return res.status(400).json({ error: "Unsupported interval" });
  }

  if (!symbol) {
    return res.status(400).json({ error: "Missing required query parameters" });
  }

  try {
    const candles: any[] = await prismaClient.$queryRawUnsafe(`
      SELECT bucket as time,
             open,
             high,
             low,
             close
      FROM ${tableName}
      WHERE symbol = '${symbol}'
      ORDER BY bucket DESC
      LIMIT ${Number(limit)}; 
    `);

    res.status(200).json({
      length: candles.length,
      candles: candles.reverse().map((candle) => ({
        ...candle,
        time: Math.floor(new Date(candle.time).getTime() / 1000),
      })),
    });
  } catch (error) {
    console.error("Error fetching candles:", error);
    res.status(500).json({ error: "Internal server error", success: false });
  }
});

app.post("/api/v1/trade/open", async (req, res, next) => {
  try {
    // have to add validation and handler error for symbol, user can send wrong symbol
    const { type, symbol, qty, margin, leverage } = req.body as {
      type: TradeType;
      symbol: string;
      qty: number;
      margin?: number;
      leverage?: number; // 1-100
    };

    const schemaResult = createTradeSchema.safeParse(req.body);

    if (!schemaResult.success) {
      return res.status(400).json({
        error: schemaResult.error.flatten().fieldErrors,
        success: false,
      });
    }

    const store = StoreManager.getInstance();
    const balance = store.getBalance();
    console.log("balance", balance);

    if (!assetPrices[symbol]) {
      throwError(400, "Invalid or unavailable symbol");
    }

    const assetPrice = assetPrices[symbol];
    let orderId;
    // in both buy and sell, we are decreasing the quantity. because this route is only to make order open, not close. so in both the cases user will making an order.
    if (!leverage) {
      if (!qty) throwError(400, "qty should be greater than 0");
      if (type === TradeType.BUY) {
        if (!balance["usd"] || assetPrice.bid * qty > balance["usd"]?.qty) {
          throwError(400, "Insufficient balance");
        }

        if (!balance[symbol]) {
          balance[symbol] = { qty: 0, type: TradeType.BUY };
        }

        balance[symbol].qty += qty;
        balance[symbol].type = TradeType.BUY;

        orderId = store.storeTrade({
          type: TradeType.BUY,
          symbol,
          qty,
          openPrice: assetPrice.bid,
          status: TradeStatus.OPEN,
        });
        store.updateBalance("usd", balance["usd"].qty - assetPrice.bid * qty);
        store.updateBalance(symbol, balance[symbol].qty, balance[symbol].type);
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

        orderId = store.storeTrade({
          type: TradeType.SELL,
          symbol,
          qty,
          openPrice: assetPrice.ask,
          status: TradeStatus.OPEN,
        });
        store.updateBalance("usd", balance["usd"].qty - assetPrice.ask * qty);
        store.updateBalance(symbol, balance[symbol].qty, balance[symbol].type);
      }
    } else {
      if (margin! > store.getBalance()["usd"].qty) {
        throwError(400, "Insufficient balance");
      }
      const positionSize = margin! * leverage;

      if (type === TradeType.BUY) {
        const qty = positionSize / assetPrice.bid;
        store.updateBalance("usd", balance["usd"].qty - margin!, TradeType.BUY);
        store.updateBalance(symbol, qty, TradeType.BUY);
        orderId = store.storeTrade({
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

        store.updateBalance(
          "usd",
          balance["usd"].qty - margin!,
          TradeType.SELL
        );
        store.updateBalance(symbol, qty, TradeType.SELL);
        orderId = store.storeTrade({
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
    res.status(201).json({ message: "Order created successfully", orderId });
  } catch (error) {
    console.error("Error creating order:", error);
    next(error);
  }
});

app.get("/api/v1/trades/open", async (req, res, next) => {
  try {
    const trades = StoreManager.getInstance().getOpenTrades();
    res.status(200).json(trades);
  } catch (error) {
    console.error("Error fetching open trades:", error);
    next(error);
  }
});

app.get("/api/v1/balance", (req, res, next) => {
  try {
    const balance = StoreManager.getInstance().getBalance();
    res.status(200).json({ usd_balance: balance.usd?.qty });
  } catch (error) {
    console.error("Error fetching balance:", error);
    next(error);
  }
});

app.get("/api/v1/trades/closed", async (req, res, next) => {
  try {
    const trades = StoreManager.getInstance().getClosedTrades();
    res.json(trades);
  } catch (error) {
    console.error("Error fetching closed trades:", error);
    next(error);
  }
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const errorMessage = err.message || "Internal Server error";
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({ error: errorMessage, success: false });
});

app.listen(3000);
