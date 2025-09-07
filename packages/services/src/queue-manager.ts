import { createClient, RedisClientType } from "redis";

export class QueueManager {
  client: RedisClientType;

  static instance: QueueManager;
  constructor(url: string) {
    this.client = createClient({ url: url });
    this.client.on("error", (err: any) =>
      console.log("Redis QueueManager Client Error", err)
    );
    this.connect();
  }

  async connect() {
    await this.client.connect();
  }

  static getInstance(url: string) {
    if (!this.instance) {
      this.instance = new QueueManager(url);
    }
    return this.instance;
  }

  async push(key: string, value: string) {
    await this.client.lPush(key, value);
  }
  async pop(key: string) {
    return await this.client.rPop(key);
  }
  async bPop(key: string) {
    return await this.client.rPop(key);
  }
}
