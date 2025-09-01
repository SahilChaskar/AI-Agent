
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { PgVector } from "@mastra/pg";
import ragAgent from "./agents/rag_agent_vector_final.js"; // after refactor to use createVectorQueryTool
import dotenv from "dotenv";

dotenv.config();
// Database connection details
const host = process.env.PG_HOST || "localhost";
const port = process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5434;
const user = process.env.PG_USER || "postgres";
const database = process.env.PG_DATABASE || "mastra_rag_db";
const password = process.env.PG_PASSWORD || "admin";

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${user}:${password}@${host}:${port}/${database}`;

// Initialize PgVector store
const pgVectorStore = new PgVector({ connectionString });

export const mastra = new Mastra({
  agents: { ragAgent },
  vectors: { pgVector: pgVectorStore }, // ✅ match the name here
});

export const agent = mastra.getAgent("ragAgent");


