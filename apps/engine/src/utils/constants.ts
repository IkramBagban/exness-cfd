
export const CREATE_ORDER_QUEUE = "trade-stream";
export const CALLBACK_QUEUE = "callback-queue";


export type AssetPrice = { bid: number; ask: number };
export const assetPrices: Record<string, AssetPrice> = {};
