import { createClient, type RedisClientType } from "redis";

export const CALLBACK_QUEUE = "callback-queue";
export class RedisSubscriber {
  private client: RedisClientType;
  private callbacks: Record<string, (data: any) => void>;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    this.client.connect();
    this.runLoop();
    this.callbacks = {};
  }

  async runLoop() {
    while (1) {
      const response = await this.client.xRead(
        {
          key: CALLBACK_QUEUE,
          id: "$",
        },
        {
          COUNT: 1,
          BLOCK: 0,
        }
      );

      if (!response) {
        continue;
      }

      const { name, messages } = response[0];
      console.log(
        "received message from the callback queue/engine",
        JSON.stringify(messages[0])
      );
      this.callbacks[messages[0].message.id](messages[0]);
      delete this.callbacks[messages[0].message.id];
    }
  }

  // throw an error (reject) if u dont get back a message in 5s
  waitForMessage(callbackId: string): Promise<{
    id: string;
    message: { id: string; error: string; data: string };
  }> {
    return new Promise((resolve, reject) => {
      this.callbacks[callbackId] = resolve;
      setTimeout(() => {
        if (this.callbacks[callbackId]) {
          reject();
        }
      }, 5000);
    });
  }
}
