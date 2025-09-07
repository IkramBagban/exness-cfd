import { createClient, RedisClientType } from "redis";
export class PubSubManager {
  publisher: RedisClientType;
  subscriber: RedisClientType;
  static instance: PubSubManager;

  constructor(url: string) {
    this.publisher = createClient({
      url: "redis://default:WA9nGxg5rO2UR3GYCb8uwxx96zfrxV6w@redis-14029.c241.us-east-1-4.ec2.redns.redis-cloud.com:14029",
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
      this.instance = new PubSubManager(
        "redis://default:WA9nGxg5rO2UR3GYCb8uwxx96zfrxV6w@redis-14029.c241.us-east-1-4.ec2.redns.redis-cloud.com:14029"
      );
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
