import express from "express";
import authRoutes from "./routes/auth.route";
import { validateRequireEnvs } from "./utils/helper";
const app = express();

const requiredEnvsKeys = ["JWT_SECRET"];

validateRequireEnvs(requiredEnvsKeys);

app.use(express.json());
app.use("/api/v1", authRoutes);

app.listen(3000);
