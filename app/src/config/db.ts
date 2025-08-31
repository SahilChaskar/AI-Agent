/**
 * PostgreSQL Database Connection
 * ------------------------------
 * Centralized DB pool using pg library.
 */

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const db = new Pool({
  connectionString: (process.env.DATABASE_URL || "").trim(),
});

export async function testDbConnection() {
  try {
    const res = await db.query("SELECT NOW()");
    console.log("Connected to DB at:", res.rows[0].now);
  } catch (err) {
    console.error("DB connection failed:", err);
    process.exit(1);
  }
}
