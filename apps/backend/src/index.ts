import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();
import prismaClient from "@repo/db";
import { createAuthRoutes } from "./routes/auth.route";
import express, { NextFunction, Request, Response } from "express";
import { validateRequireEnvs } from "./utils/helper";
import { createTradeSchema, TradeType } from "@repo/common";
import { createClient } from "redis";
import { v4 as uuidv4 } from "uuid";
import { RedisSubscriber } from "./utils/redis-subscriber";

const app = express();
const CREATE_ORDER_QUEUE = "trade-stream";
// const requiredEnvsKeys = ["JWT_SECRET", "RESEND_API_KEY", "RESEND_FROM_EMAIL"];
const requiredEnvsKeys = ["JWT_SECRET"];

validateRequireEnvs(requiredEnvsKeys);

const client = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
client.connect();

const redisSubscriber = new RedisSubscriber();

app.use(express.json());
app.use(cookieParser());
app.use(cors());

const authRoutes = createAuthRoutes(client, redisSubscriber);
app.use("/api/v1", authRoutes);

const tableMap: Record<string, string> = {
  "1m": "candles_1m",
  "5m": "candles_5m",
  "15m": "candles_15m",
  "1h": "candles_1h",
  "1d": "candles_1d",
};

client.on("error", (err: any) => console.log("Redis Client Error", err));


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
    const startTime = Date.now();
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

    let id = uuidv4();

    await client.xAdd(CREATE_ORDER_QUEUE, "*", {
      message: JSON.stringify({
        id: id,
        kind: "create-order",
        type,
        symbol,
        qty,
        margin,
        leverage,
      }),
    });

    try {
      let responseFromEngine = await redisSubscriber.waitForMessage(id);
      console.log("response from engine", responseFromEngine);
      const errorResponse = JSON.parse(responseFromEngine.message.error);
      const dataResponse = JSON.parse(responseFromEngine.message.data);

      if (Object.keys(dataResponse).length > 0) {
        res.status(200).json({
          message: "Order placed",
          time: Date.now() - startTime,
          data: dataResponse,
        });
      } else {
        res.status(errorResponse.statusCode || 500).json({
          error: errorResponse.message,
          time: Date.now() - startTime,
        });
      }
    } catch (e) {
      console.log("E", e);
      res.status(500).json({
        message: "Trade not placed",
        error: e,
      });
    }
  } catch (error) {
    console.error("Error creating order:", error);
    next(error);
  }
});

app.get("/api/v1/trades/open", async (req, res, next) => {
  try {
    const id = uuidv4();
    await client.xAdd(CREATE_ORDER_QUEUE, "*", {
      message: JSON.stringify({
        id: id,
        kind: "get-open-trades",
      }),
    });
    let responseFromEngine = await redisSubscriber.waitForMessage(id);
    const errorResponse = JSON.parse(responseFromEngine.message.error);
    const dataResponse = JSON.parse(responseFromEngine.message.data);
    if (Object.keys(dataResponse).length > 0) {
      res.status(200).json(dataResponse);
    } else {
      res.status(errorResponse.statusCode || 500).json({
        error: errorResponse.message,
      });
    }
  } catch (error) {
    console.error("Error fetching open trades:", error);
    next(error);
  }
});

app.get("/api/v1/balance", async (req, res, next) => {
  try {
    const id = uuidv4();
    await client.xAdd(
      CREATE_ORDER_QUEUE,
      "*",
      {
        message: JSON.stringify({
          id: id,
          kind: "get-balance",
        }),
      },
      {}
    );
    let responseFromEngine = await redisSubscriber.waitForMessage(id);
    const errorResponse = JSON.parse(responseFromEngine.message.error);
    const dataResponse = JSON.parse(responseFromEngine.message.data);
    if (Object.keys(dataResponse).length > 0) {
      res.status(200).json(dataResponse);
    } else {
      res.status(errorResponse.statusCode || 500).json({
        error: errorResponse.message,
      });
    }
  } catch (error) {
    console.error("Error fetching balance:", error);
    next(error);
  }
});

app.post("/api/v1/trade/close/:orderId", async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const id = uuidv4();
    await client.xAdd(CREATE_ORDER_QUEUE, "*", {
      message: JSON.stringify({
        id: id,
        kind: "close-trade",
        orderId,
      }),
    });

    const responseFromEngine = await redisSubscriber.waitForMessage(id);

    const errorResponse = JSON.parse(responseFromEngine.message.error);
    const dataResponse = JSON.parse(responseFromEngine.message.data);

    if (Object.keys(dataResponse).length > 0) {
      res.status(200).json({
        message: "Trade closed",
        data: dataResponse,
      });
    } else {
      res.status(errorResponse.statusCode || 500).json({
        error: errorResponse.message,
      });
    }
  } catch (error) {
    console.error("Error closing trade:", error);
    next(error);
  }
});

app.get("/api/v1/trades/closed", async (req, res, next) => {
  try {
    const id = uuidv4();
    await client.xAdd(CREATE_ORDER_QUEUE, "*", {
      message: JSON.stringify({
        id: id,
        kind: "get-closed-trades",
      }),
    });
    let responseFromEngine = await redisSubscriber.waitForMessage(id);
    const errorResponse = JSON.parse(responseFromEngine.message.error);
    const dataResponse = JSON.parse(responseFromEngine.message.data);
    if (Object.keys(dataResponse).length > 0) {
      res.status(200).json(dataResponse);
    } else {
      res.status(errorResponse.statusCode || 500).json({
        error: errorResponse.message,
      });
    }
  } catch (error) {
    console.error("Error fetching closed trades:", error);
    next(error);
  }
});

app.get("/api/v1/assets", async (req, res, next) => {
  try {
    const id = uuidv4();
    await client.xAdd(CREATE_ORDER_QUEUE, "*", {
      message: JSON.stringify({
        id: id,
        kind: "get-assets",
      }),
    });
    let responseFromEngine = await redisSubscriber.waitForMessage(id);
    const errorResponse = JSON.parse(responseFromEngine.message.error);
    const dataResponse = JSON.parse(responseFromEngine.message.data);
    if (Object.keys(dataResponse).length > 0) {
      res.status(200).json(dataResponse);
    } else {
      res.status(errorResponse.statusCode || 500).json({
        error: errorResponse.message,
      });
    }
  } catch (error) {
    console.error("Error fetching assets:", error);
    next(error);
  }
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const errorMessage = err.message || "Internal Server error";
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({ error: errorMessage, success: false });
});

app.listen(3000);
