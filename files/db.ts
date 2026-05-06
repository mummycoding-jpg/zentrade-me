import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  ssl: process.env["NODE_ENV"] === "production" ? { rejectUnauthorized: false } : false,
});

// Create all required tables
export async function setupDatabase() {
  try {
    await pool.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        upstox_user_id VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        mobile VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Watchlist table
      CREATE TABLE IF NOT EXISTS watchlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(100) NOT NULL,
        instrument_key VARCHAR(200) NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        name VARCHAR(255),
        exchange VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, instrument_key)
      );

      -- Alerts table
      CREATE TABLE IF NOT EXISTS price_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(100) NOT NULL,
        instrument_key VARCHAR(200) NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        alert_type VARCHAR(20) NOT NULL, -- 'ABOVE' or 'BELOW'
        target_price DECIMAL(12,2) NOT NULL,
        is_triggered BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Database tables ready");
  } catch (err) {
    console.error("Database setup error", err);
    throw err;
  }
}
