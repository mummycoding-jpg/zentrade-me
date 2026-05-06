// ============================================
// Upstox API Client
// ============================================

const UPSTOX_BASE_URL = "https://api.upstox.com/v2";

const UPSTOX_CONFIG = {
  apiKey: process.env["UPSTOX_API_KEY"] || "",
  apiSecret: process.env["UPSTOX_API_SECRET"] || "",
  redirectUrl: process.env["UPSTOX_REDIRECT_URL"] || "",
};

// Generate Upstox OAuth login URL
export function getLoginUrl(): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: UPSTOX_CONFIG.apiKey,
    redirect_uri: UPSTOX_CONFIG.redirectUrl,
  });
  return `https://api.upstox.com/v2/login/authorization/dialog?${params}`;
}

// Exchange auth code for access token
export async function getAccessToken(code: string): Promise<{
  access_token: string;
  user_id: string;
  email: string;
  name: string;
}> {
  const res = await fetch(`${UPSTOX_BASE_URL}/login/authorization/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: UPSTOX_CONFIG.apiKey,
      client_secret: UPSTOX_CONFIG.apiSecret,
      redirect_uri: UPSTOX_CONFIG.redirectUrl,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Failed to get access token");
  return res.json();
}

// Get user profile
export async function getUserProfile(accessToken: string) {
  const res = await fetch(`${UPSTOX_BASE_URL}/user/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to get user profile");
  const data = await res.json();
  return data.data;
}

// Get fund/margin details
export async function getFunds(accessToken: string) {
  const res = await fetch(`${UPSTOX_BASE_URL}/user/get-funds-and-margin?segment=SEC`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to get funds");
  const data = await res.json();
  return data.data;
}

// Search instruments
export async function searchInstruments(query: string, accessToken: string) {
  const res = await fetch(
    `${UPSTOX_BASE_URL}/instruments/search?query=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error("Failed to search instruments");
  const data = await res.json();
  return data.data;
}

// Get market quotes for multiple instruments
export async function getQuotes(instrumentKeys: string[], accessToken: string) {
  const keys = instrumentKeys.join(",");
  const res = await fetch(
    `${UPSTOX_BASE_URL}/market-quote/quotes?instrument_key=${keys}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error("Failed to get quotes");
  const data = await res.json();
  return data.data;
}

// Get OHLC data for charting
export async function getOHLC(
  instrumentKey: string,
  interval: string,
  fromDate: string,
  toDate: string,
  accessToken: string
) {
  const res = await fetch(
    `${UPSTOX_BASE_URL}/historical-candle/${instrumentKey}/${interval}/${toDate}/${fromDate}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error("Failed to get OHLC data");
  const data = await res.json();
  return data.data;
}

// Get holdings (delivery stocks)
export async function getHoldings(accessToken: string) {
  const res = await fetch(`${UPSTOX_BASE_URL}/portfolio/long-term-holdings`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to get holdings");
  const data = await res.json();
  return data.data;
}

// Get positions (intraday)
export async function getPositions(accessToken: string) {
  const res = await fetch(`${UPSTOX_BASE_URL}/portfolio/short-term-positions`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to get positions");
  const data = await res.json();
  return data.data;
}

// Place an order
export async function placeOrder(
  accessToken: string,
  order: {
    quantity: number;
    product: "I" | "D" | "CO" | "OCO"; // Intraday, Delivery, etc.
    validity: "DAY" | "IOC";
    price: number;
    instrument_token: string;
    order_type: "MARKET" | "LIMIT" | "SL" | "SL-M";
    transaction_type: "BUY" | "SELL";
    disclosed_quantity?: number;
    trigger_price?: number;
    is_amo?: boolean;
  }
) {
  const res = await fetch(`${UPSTOX_BASE_URL}/order/place`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.errors?.[0]?.message || "Failed to place order");
  }
  const data = await res.json();
  return data.data;
}

// Get order book
export async function getOrders(accessToken: string) {
  const res = await fetch(`${UPSTOX_BASE_URL}/order/retrieve-all`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to get orders");
  const data = await res.json();
  return data.data;
}

// Cancel an order
export async function cancelOrder(orderId: string, accessToken: string) {
  const res = await fetch(`${UPSTOX_BASE_URL}/order/cancel?order_id=${orderId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to cancel order");
  const data = await res.json();
  return data.data;
}

// Get trade history
export async function getTradeHistory(accessToken: string) {
  const res = await fetch(`${UPSTOX_BASE_URL}/order/trades/get-trades-for-day`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to get trade history");
  const data = await res.json();
  return data.data;
}
