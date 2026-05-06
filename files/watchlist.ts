import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { getQuotes } from "../lib/upstox";
import { pool } from "../lib/db";

const router = Router();
router.use(requireAuth);

// GET /api/watchlist
// Get user's watchlist with live prices
router.get("/", async (req, res) => {
  try {
    const user = (req as any).user;

    // Get saved watchlist from DB
    const result = await pool.query(
      "SELECT * FROM watchlist WHERE user_id = $1 ORDER BY created_at DESC",
      [user.userId]
    );
    const items = result.rows;

    if (items.length === 0) return res.json({ watchlist: [] });

    // Fetch live quotes from Upstox
    const keys = items.map((i: any) => i.instrument_key);
    const quotes = await getQuotes(keys, user.accessToken);

    // Merge DB data with live quotes
    const watchlist = items.map((item: any) => ({
      ...item,
      quote: quotes[item.instrument_key] || null,
    }));

    return res.json({ watchlist });
  } catch (err) {
    console.error("Watchlist fetch error", err);
    return res.status(500).json({ error: "Failed to get watchlist" });
  }
});

// POST /api/watchlist
// Add stock to watchlist
router.post("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const { instrument_key, symbol, name, exchange } = req.body;

    if (!instrument_key || !symbol) {
      return res.status(400).json({ error: "instrument_key and symbol are required" });
    }

    // Check if already in watchlist
    const existing = await pool.query(
      "SELECT id FROM watchlist WHERE user_id = $1 AND instrument_key = $2",
      [user.userId, instrument_key]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Already in watchlist" });
    }

    // Add to watchlist
    const result = await pool.query(
      `INSERT INTO watchlist (user_id, instrument_key, symbol, name, exchange, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [user.userId, instrument_key, symbol, name, exchange]
    );

    return res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error("Watchlist add error", err);
    return res.status(500).json({ error: "Failed to add to watchlist" });
  }
});

// DELETE /api/watchlist/:instrumentKey
// Remove stock from watchlist
router.delete("/:instrumentKey", async (req, res) => {
  try {
    const user = (req as any).user;
    const { instrumentKey } = req.params;

    await pool.query(
      "DELETE FROM watchlist WHERE user_id = $1 AND instrument_key = $2",
      [user.userId, instrumentKey]
    );

    return res.json({ message: "Removed from watchlist" });
  } catch (err) {
    console.error("Watchlist remove error", err);
    return res.status(500).json({ error: "Failed to remove from watchlist" });
  }
});

export default router;
