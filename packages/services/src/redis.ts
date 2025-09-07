import { createClient, RedisClientType } from "redis";

// @ts-ignore
export const createRedisClient = async (redisURL: string): any => {
  try {
    const client = createClient({ url: redisURL });

    client.on("error", (err: any) => console.log("Redis Client Error", err));

    await client.connect();
    return client;
  } catch (error) {
    console.error("Error while creating redis client", error);
    return null;
  }
};
