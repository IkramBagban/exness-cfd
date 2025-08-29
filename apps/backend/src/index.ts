import express from "express";
import authRoutes from "./routes/auth.route";
import { validateRequireEnvs } from "./utils/helper";
import prismaClient from "@repo/db";
import { StoreManager } from "./utils/store";
import { pubSubManager } from "./utils/pubsub";
import cors from "cors";
const app = express();

const requiredEnvsKeys = ["JWT_SECRET"];

validateRequireEnvs(requiredEnvsKeys);

app.use(express.json());
app.use(cors());
app.use("/api/v1", authRoutes);

const tableMap: Record<string, string> = {
  "1m": "candles_1m",
  "5m": "candles_5m",
  // "15m": "candles_15m",
  // "1h": "candles_1h",
  // "1d": "candles_1d",
};

// { BITC: {bid: 12, ask: 21}}
const assetPrices: Record<string, { bid: number; ask: number }> = {};

pubSubManager.subscribe("live_feed", (msg) => {
  const { symbol, bid, ask }: { symbol: string; bid: number; ask: number } =
    JSON.parse(msg);
  assetPrices[symbol] = { bid, ask };
});

app.get("/api/v1/candles", async (req, res, next) => {
  const { symbol = "BTCUSDT", interval = "1m", limit = "100" } = req.query;
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
      ORDER BY bucket ASC
      LIMIT ${Number(limit)}; 
    `);

    res.status(200).json({
      candles: candles.map((candle) => ({
        ...candle,
        time: Math.floor(new Date(candle.time).getTime() / 1000),
      })),
    });
  } catch (error) {
    console.error("Error fetching candles:", error);
    res.status(500).json({ error: "Internal server error", success: false });
  }
});

app.get("/api/v1/balance", (req, res, next) => {
  res.json({ ...StoreManager.getInstance().getBalance() });
});

app.post("/api/v1/order/open", async (req, res, next) => {
  try {
    // have to add validation and handler error for symbol, user can send wrong symbol
    const { type, symbol, qty } = req.body as {
      type: "buy" | "sell";
      symbol: string;
      qty: number;
    };

    const store = StoreManager.getInstance();
    const balance = store.getBalance();
    console.log("balance", balance);

    const assetPrice = assetPrices[symbol];

    // in both buy and sell, we are decreasing the quantity. because this route is only to make order open, not close. so in both the cases user will making an order.
    if (type === "buy") {
      if (!balance["usd"] || assetPrice.bid * qty > balance["usd"]?.qty) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      if (!balance[symbol]) {
        balance[symbol] = { qty: 0, type: "buy" };
      }
      balance[symbol].qty += qty;
      balance[symbol].type = "buy";

      store.executeOrder({
        type: "buy",
        symbol,
        qty,
        entryPrice: assetPrice.bid,
      });
      store.updateBalance("usd", balance["usd"].qty - assetPrice.bid * qty);
      store.updateBalance(symbol, balance[symbol].qty, balance[symbol].type);
    } else if (type === "sell") {
      // (rough) need to check again..... good night
      if (!balance["usd"] || assetPrice.ask * qty > balance["usd"]?.qty) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      if (!balance[symbol]) {
        balance[symbol] = { qty: 0, type: "sell" };
      }

      balance[symbol].qty += qty;
      balance[symbol].type = "sell";

      store.executeOrder({
        type: "sell",
        symbol,
        qty,
        entryPrice: assetPrice.ask,
      });
      store.updateBalance("usd", balance["usd"].qty - assetPrice.ask * qty);
      store.updateBalance(symbol, balance[symbol].qty, balance[symbol].type);
    }

    // store.updateBalance(symbol, qty, type);
    res.status(201).json({ message: "Order created successfully" });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/v1/orders", async (req, res, next) => {
  const orders = StoreManager.getInstance().orders;
  res.json(orders);
});

app.listen(3000);
