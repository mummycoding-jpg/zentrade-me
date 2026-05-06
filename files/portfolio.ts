import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { getHoldings, getPositions, getFunds } from "../lib/upstox";

const router = Router();
router.use(requireAuth);

// GET /api/portfolio/holdings
// Get long term delivery holdings
router.get("/holdings", async (req, res) => {
  try {
    const user = (req as any).user;
    const holdings = await getHoldings(user.accessToken);

    // Calculate summary
    const summary = holdings.reduce(
      (acc: any, h: any) => {
        const invested = h.average_price * h.quantity;
        const current = h.last_price * h.quantity;
        const pnl = current - invested;
        acc.totalInvested += invested;
        acc.currentValue += current;
        acc.totalPnl += pnl;
        return acc;
      },
      { totalInvested: 0, currentValue: 0, totalPnl: 0 }
    );

    summary.pnlPercent = ((summary.totalPnl / summary.totalInvested) * 100).toFixed(2);

    return res.json({ holdings, summary });
  } catch (err) {
    console.error("Holdings error", err);
    return res.status(500).json({ error: "Failed to get holdings" });
  }
});

// GET /api/portfolio/positions
// Get intraday positions
router.get("/positions", async (req, res) => {
  try {
    const user = (req as any).user;
    const positions = await getPositions(user.accessToken);

    // Calculate day P&L
    const dayPnl = positions.reduce((acc: number, p: any) => {
      return acc + (p.realised + p.unrealised);
    }, 0);

    return res.json({ positions, dayPnl: dayPnl.toFixed(2) });
  } catch (err) {
    console.error("Positions error", err);
    return res.status(500).json({ error: "Failed to get positions" });
  }
});

// GET /api/portfolio/summary
// Get full portfolio summary — holdings + positions + funds
router.get("/summary", async (req, res) => {
  try {
    const user = (req as any).user;

    const [holdings, positions, funds] = await Promise.all([
      getHoldings(user.accessToken),
      getPositions(user.accessToken),
      getFunds(user.accessToken),
    ]);

    // Holdings summary
    const holdingsSummary = holdings.reduce(
      (acc: any, h: any) => {
        acc.invested += h.average_price * h.quantity;
        acc.current += h.last_price * h.quantity;
        acc.pnl += (h.last_price - h.average_price) * h.quantity;
        return acc;
      },
      { invested: 0, current: 0, pnl: 0 }
    );

    // Positions P&L
    const positionsPnl = positions.reduce((acc: number, p: any) => {
      return acc + p.realised + p.unrealised;
    }, 0);

    return res.json({
      holdings: {
        count: holdings.length,
        ...holdingsSummary,
        pnlPercent: ((holdingsSummary.pnl / holdingsSummary.invested) * 100).toFixed(2),
      },
      positions: {
        count: positions.length,
        dayPnl: positionsPnl.toFixed(2),
      },
      funds: {
        available: funds?.equity?.available_margin || 0,
        used: funds?.equity?.used_margin || 0,
        total: funds?.equity?.net || 0,
      },
    });
  } catch (err) {
    console.error("Portfolio summary error", err);
    return res.status(500).json({ error: "Failed to get portfolio summary" });
  }
});

export default router;
