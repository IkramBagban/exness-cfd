import { TradeStatus, TradeType } from "@repo/common/types";
import { v4 as uuidv4 } from "uuid";

interface Order {
  orderId: string;
  type: TradeType;
  symbol: string;
  qty: number;
  openPrice: number; // this would be in usd
  status: TradeStatus;
  leverage: number;
  margin: number;
  closePrice?: number;
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
    openPrice,
    status,
    margin,
    leverage,
  }: {
    type: TradeType;
    symbol: string;
    qty: number;
    openPrice: number;
    status: TradeStatus;
    margin?: number;
    leverage?: number;
  }): string {
    const orderId = uuidv4();
    const order = {
      orderId,
      type,
      symbol,
      qty,
      openPrice,
      status,
      margin: margin!,
      leverage: leverage!,
    };
    this.orders.push(order);
    return orderId;
  }

  public closeTrade(orderId: string, closePrice: number) {
   this.orders = this.orders.map((o) => {
      if (o.orderId === orderId) {
        o = { ...o, status: TradeStatus.CLOSED, closePrice };
      }
      return o;
    });
  }

  public getOpenTrades(): Order[] | undefined {
    return this.orders.filter((o) => o.status === TradeStatus.OPEN);
  }

  public getClosedTrades(): Order[] | undefined {
    return this.orders.filter((o) => o.status === TradeStatus.CLOSED);
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
