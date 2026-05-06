import { Router } from "express";
import { getLoginUrl, getAccessToken, getUserProfile } from "../lib/upstox";
import { signToken, requireAuth } from "../lib/auth";

const router = Router();

// GET /api/auth/login
// Returns the Upstox OAuth URL — frontend redirects user here
router.get("/login", (req, res) => {
  try {
    const url = getLoginUrl();
    return res.json({ url });
  } catch (err) {
    console.error("Login URL error", err);
    return res.status(500).json({ error: "Failed to generate login URL" });
  }
});

// GET /api/auth/callback?code=xxxx
// Upstox redirects here after user logs in
router.get("/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).json({ error: "Authorization code missing" });
    }

    // Exchange code for access token
    const tokenData = await getAccessToken(code);
    const accessToken = tokenData.access_token;

    // Get user profile from Upstox
    const profile = await getUserProfile(accessToken);

    // Sign our own JWT with user info + Upstox token
    const jwt = signToken({
      userId: profile.user_id,
      email: profile.email,
      accessToken,
    });

    // Redirect to frontend with JWT
    const frontendUrl = process.env["FRONTEND_URL"] || "http://localhost:5173";
    return res.redirect(`${frontendUrl}/auth/success?token=${jwt}`);

  } catch (err) {
    console.error("Auth callback error", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
});

// GET /api/auth/me
// Returns current user profile (protected)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const profile = await getUserProfile(user.accessToken);
    return res.json({ user: profile });
  } catch (err) {
    console.error("Profile fetch error", err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// GET /api/auth/logout
router.get("/logout", (req, res) => {
  return res.json({ message: "Logged out successfully" });
});

export default router;
