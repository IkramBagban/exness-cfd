import { createClient } from "redis";

export const createRedisClient = async (redisURL: string) => {
  try {
    const client = createClient({ url: redisURL });

    client.on("error", (err) => console.log("Redis Client Error", err));

    await client.connect();
    return client;
  } catch (error) {
    console.error("Error while creating redis client", error);
    return null;
  }
};
