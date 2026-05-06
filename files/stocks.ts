import { Router } from "express";
import { requireAuth } from "../lib/auth";
import {
  searchInstruments,
  getQuotes,
  getOHLC,
  getFunds,
} from "../lib/upstox";

const router = Router();

// All routes protected
router.use(requireAuth);

// GET /api/stocks/search?q=TCS
// Search for stocks by name or symbol
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Query must be at least 2 characters" });
    }
    const user = (req as any).user;
    const results = await searchInstruments(query, user.accessToken);
    return res.json({ results });
  } catch (err) {
    console.error("Stock search error", err);
    return res.status(500).json({ error: "Search failed" });
  }
});

// GET /api/stocks/quotes?keys=NSE_EQ|INE467B01029,NSE_EQ|INE009A01021
// Get live quotes for multiple stocks
router.get("/quotes", async (req, res) => {
  try {
    const keys = req.query.keys as string;
    if (!keys) {
      return res.status(400).json({ error: "instrument keys are required" });
    }
    const instrumentKeys = keys.split(",");
    if (instrumentKeys.length > 20) {
      return res.status(400).json({ error: "Max 20 instruments per request" });
    }
    const user = (req as any).user;
    const quotes = await getQuotes(instrumentKeys, user.accessToken);
    return res.json({ quotes });
  } catch (err) {
    console.error("Quotes error", err);
    return res.status(500).json({ error: "Failed to get quotes" });
  }
});

// GET /api/stocks/chart/:instrumentKey?interval=1D&from=2024-01-01&to=2024-12-31
// Get OHLC data for charting
router.get("/chart/:instrumentKey", async (req, res) => {
  try {
    const { instrumentKey } = req.params;
    const interval = (req.query.interval as string) || "1D";
    const from = (req.query.from as string) || getDefaultFrom(interval);
    const to = (req.query.to as string) || today();

    const validIntervals = ["1m","5m","15m","30m","1H","1D","1W","1M"];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({ error: `Invalid interval. Use: ${validIntervals.join(", ")}` });
    }

    const user = (req as any).user;
    const candles = await getOHLC(instrumentKey, interval, from, to, user.accessToken);
    return res.json({ candles });
  } catch (err) {
    console.error("Chart data error", err);
    return res.status(500).json({ error: "Failed to get chart data" });
  }
});

// GET /api/stocks/funds
// Get user's available funds and margin
router.get("/funds", async (req, res) => {
  try {
    const user = (req as any).user;
    const funds = await getFunds(user.accessToken);
    return res.json({ funds });
  } catch (err) {
    console.error("Funds error", err);
    return res.status(500).json({ error: "Failed to get funds" });
  }
});

// Helper functions
function today(): string {
  return new Date().toISOString().split("T")[0];
}

function getDefaultFrom(interval: string): string {
  const d = new Date();
  if (interval === "1m" || interval === "5m") d.setDate(d.getDate() - 1);
  else if (interval === "15m" || interval === "30m") d.setDate(d.getDate() - 7);
  else if (interval === "1H") d.setDate(d.getDate() - 30);
  else if (interval === "1D") d.setFullYear(d.getFullYear() - 1);
  else if (interval === "1W") d.setFullYear(d.getFullYear() - 3);
  else d.setFullYear(d.getFullYear() - 5);
  return d.toISOString().split("T")[0];
}

export default router;
