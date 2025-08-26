import prismaClient from "@repo/db";
import express, { json, NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

router.post(
  "/signup",
  async (req: Request, res: Response, next: NextFunction) => {
    const { username, email, password } = req.body;

    if (!username || email || password) {
      res.json({ message: "all the fields are mandatory", body: req.body });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const response = await prismaClient.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
      },
    });

    res
      .status(201)
      .json({ message: "user has been created successfully.", success: true });
  }
);

router.post(
  "/signin",
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (email || password) {
      res.json({ message: "all the fields are mandatory", body: req.body });
      return;
    }

    const user = await prismaClient.user.findFirst({
      where: {
        email: email,
      },
    });

    if (!user) {
      res.status(401).json({ message: "user not find", success: false });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      res.status(401).json({ message: "Invalid password", success: false });

    const payload = {
      userId: user.id,
      email: user.email,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET!);
    res.cookie("token", token);
    res.status(200).json({ message: "User loggedin successfully" });
  }
);

export default router;
