import { Router } from "express";
import { requireAuth } from "../lib/auth";
import {
  placeOrder,
  getOrders,
  cancelOrder,
  getTradeHistory,
} from "../lib/upstox";

const router = Router();
router.use(requireAuth);

// GET /api/orders
// Get all orders for today
router.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const orders = await getOrders(user.accessToken);
    return res.json({ orders });
  } catch (err) {
    console.error("Get orders error", err);
    return res.status(500).json({ error: "Failed to get orders" });
  }
});

// POST /api/orders
// Place a new order
router.post("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      instrument_token,
      transaction_type,
      quantity,
      order_type,
      product,
      price,
      trigger_price,
      validity,
    } = req.body;

    // Validate required fields
    if (!instrument_token || !transaction_type || !quantity || !order_type || !product) {
      return res.status(400).json({
        error: "instrument_token, transaction_type, quantity, order_type and product are required",
      });
    }

    if (!["BUY", "SELL"].includes(transaction_type)) {
      return res.status(400).json({ error: "transaction_type must be BUY or SELL" });
    }

    if (!["MARKET", "LIMIT", "SL", "SL-M"].includes(order_type)) {
      return res.status(400).json({ error: "Invalid order_type" });
    }

    if (!["I", "D"].includes(product)) {
      return res.status(400).json({ error: "product must be I (Intraday) or D (Delivery)" });
    }

    if (order_type === "LIMIT" && !price) {
      return res.status(400).json({ error: "price is required for LIMIT orders" });
    }

    if ((order_type === "SL" || order_type === "SL-M") && !trigger_price) {
      return res.status(400).json({ error: "trigger_price is required for SL orders" });
    }

    const order = await placeOrder(user.accessToken, {
      instrument_token,
      transaction_type,
      quantity: Number(quantity),
      order_type,
      product,
      price: Number(price) || 0,
      trigger_price: Number(trigger_price) || 0,
      validity: validity || "DAY",
      disclosed_quantity: 0,
      is_amo: false,
    });

    return res.status(201).json({ order, message: "Order placed successfully" });
  } catch (err: any) {
    console.error("Place order error", err);
    return res.status(500).json({ error: err.message || "Failed to place order" });
  }
});

// DELETE /api/orders/:orderId
// Cancel a pending order
router.delete("/:orderId", async (req, res) => {
  try {
    const user = (req as any).user;
    const { orderId } = req.params;
    const result = await cancelOrder(orderId, user.accessToken);
    return res.json({ result, message: "Order cancelled successfully" });
  } catch (err) {
    console.error("Cancel order error", err);
    return res.status(500).json({ error: "Failed to cancel order" });
  }
});

// GET /api/orders/trades
// Get today's executed trades
router.get("/trades", async (req, res) => {
  try {
    const user = (req as any).user;
    const trades = await getTradeHistory(user.accessToken);
    return res.json({ trades });
  } catch (err) {
    console.error("Trade history error", err);
    return res.status(500).json({ error: "Failed to get trade history" });
  }
});

export default router;
