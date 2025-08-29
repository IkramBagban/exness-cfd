import { TradeType } from "./types";
import { createTradeSchema } from "./zod/schema";

export function fromInt(value: number, decimals: number): number {
  return value / Math.pow(10, decimals);
}

export function toInt(value: number, decimals: number): number {
  return Math.round(value * Math.pow(10, decimals));
}

export { TradeType, createTradeSchema };
