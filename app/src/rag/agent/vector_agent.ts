import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { Memory } from "@mastra/memory";
import { PostgresStore } from "@mastra/pg";
import { createVectorQueryTool } from "@mastra/rag";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const host = (process.env.PG_HOST || "localhost").trim();
const port = process.env.PG_PORT ? parseInt(process.env.PG_PORT.trim()) : 5434;
const user = (process.env.PG_USER || "postgres").trim();
const database = (process.env.PG_DATABASE || "mastra_rag_db").trim();
const password = (process.env.PG_PASSWORD || "admin").trim();

const connectionString = process.env.DATABASE_URL || `postgresql://${user}:${password}@${host}:${port}/${database}`;


// 1) Load your prompts
const description = fs.readFileSync(
  path.join(__dirname, "prompts/description.txt"),
  "utf-8"
);
const instructions = fs.readFileSync(
  path.join(__dirname, "prompts/instructions.txt"),
  "utf-8"
);

// 2) Set up memory
// const memory = new Memory({
//   storage: new PostgresStore({ connectionString: process.env.DATABASE_URL! }),
//   options: { lastMessages: 10 },
// });

const memory = new Memory({
  storage: new PostgresStore({ host, port, user, database, password }),
  options: { lastMessages: 10 },
});


console.log("DB config", { host, port, user, database, password });
console.log("Password type:", typeof password);



// 3) Configure vector query tool with optional filtering enabled
const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: "pgVector",
  indexName: "shareholder_letters_1977_2024",
  model: openai.embedding("text-embedding-3-small"),
  enableFilter: true, // allows year/type filtering if needed later
});

// 4) Build agent
export const ragAgentVector = new Agent({
  name: "rag-agent-vector",
  description,
  instructions,
  model: openai("gpt-4o"),
  memory,
  tools: { vectorQueryTool },
});

export default ragAgentVector;
