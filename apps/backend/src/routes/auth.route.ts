import express, { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendEmail } from "../utils/resend";
import { v4 as uuidv4 } from "uuid";
import { RedisSubscriber } from "../utils/redis-subscriber";

dotenv.config();

export const createAuthRoutes = (client: any, redisSubscriber: RedisSubscriber) => {
  const router = express.Router();
  const CREATE_ORDER_QUEUE = "trade-stream";

router.post(
  "/signup",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          message: "Email is required",
          success: false,
        });
      }

      const id = uuidv4();

      await client.xAdd(CREATE_ORDER_QUEUE, "*", {
        message: JSON.stringify({
          kind: "signup",
          id,
          email,
        }),
      });

      const callbackMessage = await redisSubscriber.waitForMessage(id);

      if (
        callbackMessage.message.error &&
        callbackMessage.message.error !== "{}"
      ) {
        const error = JSON.parse(callbackMessage.message.error);
        return res.status(error.statusCode || 500).json({
          error: error.message || "Failed to process signup",
          success: false,
        });
      }

      const responseData = JSON.parse(callbackMessage.message.data);

      const verificationUrl = `${process.env.BASE_URL || "http://localhost:3000"}/api/v1/auth/verify?token=${responseData.verificationToken}`;
      console.log("Verification URL:", verificationUrl);

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Exness Trading Platform!</h2>
          <p>Click the button below to verify your email and complete your registration:</p>
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
            Verify Email & Sign Up
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p><small>This link will expire in 1 hour.</small></p>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: "Verify your email - Exness Trading Platform",
        html: emailHtml,
      });

      res.status(200).json({
        message:
          "Verification email sent successfully. Please check your email.",
        success: true,
      });
    } catch (error) {
      console.error("Signup error:", error);
      next(error);
    }
  }
);

router.post(
  "/signin",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          message: "Email is required",
          success: false,
        });
      }

      const id = uuidv4();

      await client.xAdd(CREATE_ORDER_QUEUE, "*", {
        message: JSON.stringify({
          kind: "signin",
          id,
          email,
        }),
      });

      const callbackMessage = await redisSubscriber.waitForMessage(id);

      if (
        callbackMessage.message.error &&
        callbackMessage.message.error !== "{}"
      ) {
        const error = JSON.parse(callbackMessage.message.error);
        return res.status(error.statusCode || 500).json({
          error: error.message || "Failed to process signin",
          success: false,
        });
      }

      const responseData = JSON.parse(callbackMessage.message.data);

      const signinUrl = `${process.env.BASE_URL || "http://localhost:3000"}/api/v1/auth/verify?token=${responseData.verificationToken}`;
      console.log("Signin URL:", signinUrl);

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Sign in to Exness Trading Platform</h2>
          <p>Click the button below to sign in to your account:</p>
          <a href="${signinUrl}" 
             style="background-color: #28a745; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
            Sign In to Account
          </a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${signinUrl}</p>
          <p><small>This link will expire in 1 hour.</small></p>
          <p><small>If you didn't request this sign-in, please ignore this email.</small></p>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: "Sign in link - Exness Trading Platform",
        html: emailHtml,
      });

      res.status(200).json({
        message: "Sign-in link sent to your email. Please check your email.",
        success: true,
      });
    } catch (error) {
      console.error("Signin error:", error);
      next(error);
    }
  }
);

router.get(
  "/auth/verify",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          message: "Verification token is required",
          success: false,
        });
      }

      const id = uuidv4();

      await client.xAdd(CREATE_ORDER_QUEUE, "*", {
        message: JSON.stringify({
          kind: "verify-auth",
          id,
          token: token as string,
        }),
      });

      const callbackMessage = await redisSubscriber.waitForMessage(id);

      if (
        callbackMessage.message.error &&
        callbackMessage.message.error !== "{}"
      ) {
        const error = JSON.parse(callbackMessage.message.error);
        return res.status(error.statusCode || 500).json({
          error: error.message || "Verification failed",
          success: false,
        });
      }

      const responseData = JSON.parse(callbackMessage.message.data);

      res.cookie("token", responseData.sessionToken);

      res.status(200).json({
        message: responseData.message,
        success: true,
        user: responseData.user,
      });
    } catch (error) {
      console.error("Verification error:", error);
      next(error);
    }
  }
);

router.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = req.cookies.token;

      if (sessionToken) {
        const id = uuidv4();

        await client.xAdd(CREATE_ORDER_QUEUE, "*", {
          message: JSON.stringify({
            kind: "logout",
            id,
            sessionToken,
          }),
        });

        // Don't wait for response, just clear cookie
        await redisSubscriber.waitForMessage(id);
      }

      res.clearCookie("token");
      res.status(200).json({
        message: "Logged out successfully",
        success: true,
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.clearCookie("token");
      res.status(200).json({
        message: "Logged out successfully",
        success: true,
      });
    }
  }
);

router.get(
  "/stats",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = uuidv4();

      await client.xAdd(CREATE_ORDER_QUEUE, "*", {
        message: JSON.stringify({
          kind: "get-user-stats",
          id,
        }),
      });

      const callbackMessage = await redisSubscriber.waitForMessage(id);
      const responseData = JSON.parse(callbackMessage.message.data);

      res.status(200).json({
        ...responseData,
        success: true,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      next(error);
    }
  }
);

  return router;
};

export default createAuthRoutes;
