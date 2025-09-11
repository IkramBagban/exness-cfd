import { createClient, type RedisClientType } from "redis";

export const CALLBACK_QUEUE = "callback-queue";
export class RedisSubscriber {
  private client: RedisClientType;
  private callbacks: Record<string, (data: any) => void>;
  private lastProcessedId: string = "0";

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
      try {
        const response = await this.client.xRead(
          {
            key: CALLBACK_QUEUE,
            id: this.lastProcessedId,
          },
          {
            COUNT: 10,
            BLOCK: 1000,
          }
        );

        if (!response || response.length === 0) {
          continue;
        }

        const { name, messages } = response[0];

        for (const message of messages) {
          console.log(
            "received message from the callback queue/engine",
            JSON.stringify(message)
          );

          const messageId = message.message.id;
          const callback = this.callbacks[messageId];

          if (callback && typeof callback === "function") {
            // console.log("Processing callback for message ID:", messageId);
            callback(message);
            delete this.callbacks[messageId];
          } else {
            console.warn(`No callback found for message ID: ${messageId}`);
          }

          this.lastProcessedId = message.id;
        }
      } catch (error) {
        console.error("Error in Redis subscriber runLoop:", error);
      }
    }
  }

  // throw an error (reject) if u dont get back a message in 5s
  waitForMessage(callbackId: string): Promise<{
    id: string;
    message: { id: string; error: string; data: string };
  }> {
    return new Promise((resolve, reject) => {
      this.callbacks[callbackId] = resolve;

      const timeoutId = setTimeout(() => {
        if (this.callbacks[callbackId]) {
          delete this.callbacks[callbackId];
          console.log(`Timeout waiting for message with ID: ${callbackId}`);
          reject(new Error("Timeout waiting for message"));
        }
      }, 5000);

      const originalResolve = this.callbacks[callbackId];
      this.callbacks[callbackId] = (data: any) => {
        clearTimeout(timeoutId);
        originalResolve(data);
      };
    });
  }
}
