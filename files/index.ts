import express from "express";
import cors from "cors";
import { setupDatabase } from "./lib/db";

// Routes
import authRouter from "./routes/auth";
import stocksRouter from "./routes/stocks";
import watchlistRouter from "./routes/watchlist";
import ordersRouter from "./routes/orders";
import portfolioRouter from "./routes/portfolio";
import chatRouter from "./routes/chat"; // your existing Groq chatbot

const app = express();
const PORT = process.env["PORT"] || 8080;

// Middleware
app.use(cors({
  origin: process.env["FRONTEND_URL"] || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/api/healthz", (req, res) => {
  res.json({ status: "ok", service: "Zentrade API" });
});

// Register all routes
app.use("/api/auth", authRouter);
app.use("/api/stocks", stocksRouter);
app.use("/api/watchlist", watchlistRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/portfolio", portfolioRouter);
app.use("/api/chat", chatRouter);

// Start server
async function start() {
  await setupDatabase();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start();

export default app;
