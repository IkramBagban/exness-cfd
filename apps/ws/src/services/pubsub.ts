// #todo put this file in packages
import { createClient } from "redis";
export class PubSubManager {
  publisher;
  subscriber;
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

  static getInstance(url: string) {
    if (!this.instance) {
      this.instance = new PubSubManager(url);
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