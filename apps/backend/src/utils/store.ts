import { TradeStatus, TradeType } from "@repo/common/types";

interface Order {
  orderId: number;
  type: TradeType;
  symbol: string;
  qty: number;
  entryPrice: number; // this would be in usd
  status: TradeStatus;
  leverage: number;
  margin: number;
  closedAt?: number;
}
export class StoreManager {
  static instance: StoreManager;
  balance: { [key: string]: { qty: number; type?: TradeType } };
  orders: Order[] = [];
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
    margin,
    leverage,
  }: {
    type: TradeType;
    symbol: string;
    qty: number;
    entryPrice: number;
    status: TradeStatus;
    margin?: number;
    leverage?: number;
  }): void {
    const orderId = Date.now() + Math.floor(Math.random() * 10000 + 1000);
    const order = {
      orderId,
      type,
      symbol,
      qty,
      entryPrice,
      status,
      margin: margin!,
      leverage: leverage!,
    };
    this.orders.push(order);
  }

  public closeTrade(orderId: number, closedAt: number) {
    this.orders.map((o) => {
      if (o.orderId === orderId) {
        o = { ...o, status: TradeStatus.CLOSED, closedAt };
      }
      return o;
    });
  }

  public getOpenOrders(): Order[] | undefined {
    return this.orders.filter((o) => o.status === TradeStatus.OPEN);
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
