import { PubSubManager } from "../services/pubsub";

export const pubSubManager = PubSubManager.getInstance(process.env.REDIS_URL!);