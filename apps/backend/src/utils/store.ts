import { TradeType } from "@repo/common";
import { TradeStatus } from "@repo/common/types";

export class StoreManager {
  static instance: StoreManager;
  balance: { [key: string]: { qty: number; type?: TradeType } };
  orders: {
    orderId: number;
    type: TradeType;
    symbol: string;
    qty: number;
    entryPrice: number; // this would be in usd
    status: TradeStatus;
  }[] = [];
  private constructor() {
    this.balance = { usd: { qty: 200000 } };
  }

  public static getInstance(): StoreManager {
    if (!StoreManager.instance) {
      StoreManager.instance = new StoreManager();
    }
    return StoreManager.instance;
  }

  public storeTrade({
    type,
    symbol,
    qty,
    entryPrice,
    status,
  }: {
    type: TradeType;
    symbol: string;
    qty: number;
    entryPrice: number;
    status: TradeStatus;
  }): void {
    const orderId = Date.now() + Math.floor(Math.random() * 10000 + 1000);
    const order = { orderId, type, symbol, qty, entryPrice, status };
    this.orders.push(order);
  }

  public getBalance(): {
    [key: string]: { qty: number; type?: TradeType };
  } {
    return this.balance;
  }

  public updateBalance(symbol: string, qty: number, type?: TradeType): void {
    this.balance[symbol] = { qty, type };
  }
}

export const storeManager = StoreManager.getInstance();
