export class StoreManager {
  static instance: StoreManager;
  balance: { [key: string]: { qty: number; type?: "sell" | "buy" } };
  orders: {
    orderId: number;
    type: "buy" | "sell";
    symbol: string;
    qty: number;
    entryPrice: number; // this would be in usd
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

  public executeOrder({
    type,
    symbol,
    qty,
    entryPrice,
  }: {
    type: "buy" | "sell";
    symbol: string;
    qty: number;
    entryPrice: number;
  }): void {
    const orderId = Date.now() + Math.floor(Math.random() * 10000 + 1000);
    const order = { orderId, type, symbol, qty, entryPrice };
    this.orders.push(order);
  }

  public getBalance(): {
    [key: string]: { qty: number; type?: "sell" | "buy" };
  } {
    return this.balance;
  }

  public updateBalance(
    symbol: string,
    qty: number,
    type?: "sell" | "buy"
  ): void {
    this.balance[symbol] = { qty, type };
  }
}

export const storeManager = StoreManager.getInstance();
