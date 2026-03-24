import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import developerRoutes from "./routes/developer.routes.js";
import appRoutes from "./routes/app.routes.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use("/auth", authRoutes);
app.use("/developer", developerRoutes);
app.use("/app", appRoutes);

export default app;