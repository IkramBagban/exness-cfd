import { z } from "zod";

export const createTradeSchema = z
  .object({
    type: z.enum(["buy", "sell"]),
    symbol: z.string(),
    qty: z.number().min(1).optional(),
    leverage: z.number().min(1).max(100).optional(),
    margin: z.number().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    console.log({val, ctx})
    if(!val.leverage && !val.qty) {
      ctx.addIssue({code: z.ZodIssueCode.custom, path: ["qty"], message: "qty is required"})
      return 
    }
    if (val.leverage && !val.margin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["margin"],
        message: "margin is required when leverage is provided",
      });
    }
  });
