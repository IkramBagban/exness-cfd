import { QueueManager } from "@repo/services";
import { PubSubManager } from "../services/pubsub";

export const pubSubManager = PubSubManager.getInstance(process.env.REDIS_URL!)

export const queueManager = QueueManager.getInstance(process.env.REDIS_URL!);
