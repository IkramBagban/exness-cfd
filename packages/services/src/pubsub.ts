import { createClient, RedisClientType } from "redis";
export class PubSubManager {
  publisher: RedisClientType;
  subscriber: RedisClientType;
  static instance: PubSubManager;

  constructor(url: string) {
    this.publisher = createClient({
      url: url,
    });
    this.subscriber = createClient({
      url: url,
    });
    this.publisher.on("error", (err: any) =>
      console.log("Redis this.publisher Error", err)
    );
    this.subscriber.on("error", (err: any) =>
      console.log("Redis subscriber Error", err)
    );

    this.connect();
  }

  static getInstance() {
    if (!this.instance) {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      this.instance = new PubSubManager(redisUrl);
    }
    return this.instance;
  }

  async connect() {
    await this.publisher.connect();
    await this.subscriber.connect();
  }

  async publish(channel: string, message: any) {
    // #todo update it, to accept both json and string
    await this.publisher.publish(channel, JSON.stringify(message));
  }
  async subscribe(channel: string, cb: (msg: string) => void) {
    await this.subscriber.subscribe(channel, (message) => {
      console.log(message);
      cb(message);
    });
  }
}

export const pubSubManager = PubSubManager.getInstance();
