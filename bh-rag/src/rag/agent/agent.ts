// import { Agent } from "@mastra/core/agent";
// import { createTool } from "@mastra/core/tools";
// import { openai } from "@ai-sdk/openai";
// import { rerank } from "@mastra/rag";
// import { embed } from "ai";
// import { z } from "zod";
// import { Memory } from "@mastra/memory";
// import { PostgresStore } from "@mastra/pg";
// import { db } from "../../config/db";
// import fs from "fs";
// import path from "path";
// import dotenv from "dotenv";

// dotenv.config();

// // DB config from env
// const host = (process.env.PG_HOST || "localhost").trim();
// const port = process.env.PG_PORT ? parseInt(process.env.PG_PORT.trim()) : 5434;
// const user = (process.env.PG_USER || "postgres").trim();
// const database = (process.env.PG_DATABASE || "mastra_rag_db").trim();
// const password = (process.env.PG_PASSWORD || "admin").trim();

// const connectionString = process.env.DATABASE_URL || `postgresql://${user}:${password}@${host}:${port}/${database}`;

// // Load prompts
// const description = fs.readFileSync(path.join(__dirname, "prompts/description.txt"), "utf-8");
// const instructions = fs.readFileSync(path.join(__dirname, "prompts/instructions.txt"), "utf-8");

// // const memory = new Memory({
// //   storage: new PostgresStore({ connectionString: process.env.DATABASE_URL! }),
// //   options: { lastMessages: 10 },
// // });

// const memory = new Memory({
//   storage: new PostgresStore({ host, port, user, database, password }),
//   options: { lastMessages: 10 },
// });


// console.log("DB config", { host, port, user, database, password });
// console.log("Password type:", typeof password);


// // searchDocs tool
// const searchDocs = createTool({
//   id: "searchDocs",
//   description: "Semantic search over shareholder letters with optional year/type filtering.",
//   inputSchema: z.object({
//     query: z.string(),
//     year: z.number().optional(),
//     type: z.enum(["text", "table"]).optional(),
//   }),
//   outputSchema: z.object({
//     text: z.string(),
//     citations: z.array(z.string()),
//   }),
//   execute: async ({ context }) => {
//     const { embedding } = await embed({
//       model: openai.embedding("text-embedding-3-small"),
//       value: context.query,
//     });
//     const vectorStr = `[${embedding.join(",")}]`;

//     const conditions: string[] = [];
//     const params: any[] = [vectorStr];
//     let idx = 2;
//     if (context.year) {
//       conditions.push(`source = $${idx++}`);
//       params.push(`${context.year}.pdf`);
//     }
//     if (context.type) {
//       conditions.push(`type = $${idx++}`);
//       params.push(context.type);
//     }
//     const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

//     const sql = `
//       SELECT id, content, source, type, (embedding <-> $1::vector) AS distance
//       FROM documents
//       ${where}
//       ORDER BY distance
//       LIMIT 15;
//     `;
//     const { rows } = await db.query(sql, params);
//     if (rows.length === 0) return { text: "No relevant content found.", citations: [] };

//     // Build QueryResult objects as per Mastra spec
//     const queryResults = rows.map(r => ({
//       id: r.id.toString(),
//       score: 1 - r.distance, // convert to similarity
//       metadata: { source: r.source, type: r.type },
//       document: r.content,
//     }));

//     // Rerank the results
//     const reranked = await rerank(queryResults, context.query, openai("gpt-4o-mini"), { topK: 5 });

//     const contextText = reranked.map(r => r.result.document || "").join("\n---\n");

//     const citations = reranked.map(r => {
//       const meta = r.result.metadata ?? {};
//       return meta.source || "unknown";
//     });

//     const prompt = `
// ${instructions}

// Context:
// ${contextText}

// Question: ${context.query}

// Rules:
// - Only use the context above
// - Cite using [YEAR, file.pdf]
// - If information isn't found, say so clearly
//     `;

//     const answer = await openai("gpt-4o").doGenerate({
//       inputFormat: "messages",
//       mode: { type: "regular" },
//       prompt: [{ role: "user", content: [{ type: "text", text: prompt }] }],
//     });

//     return {
//       text: answer.text ?? "",
//       citations,
//     };
//   },
// });

// export const ragAgent = new Agent({
//   name: "rag-agent",
//   description,
//   instructions,
//   model: openai("gpt-4o"),
//   memory,
//   tools: { searchDocs },
// });

// export default ragAgent;


import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { createVectorQueryTool } from "@mastra/rag";
import { Memory } from "@mastra/memory";
import { PostgresStore } from "@mastra/pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const host = process.env.PG_HOST || "localhost";
const port = process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5434;
const user = process.env.PG_USER || "postgres";
const database = process.env.PG_DATABASE || "mastra_rag_db";
const password = process.env.PG_PASSWORD || "admin";

const memory = new Memory({
  storage: new PostgresStore({ host, port, user, database, password }),
  options: { lastMessages: 10 },
});

// Load description and instructions
const description = fs.readFileSync(path.join(__dirname, "prompts/description.txt"), "utf-8");
const instructions = fs.readFileSync(path.join(__dirname, "prompts/instructions.txt"), "utf-8");

// Vector query tool (replace searchDocs)
const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: "pgVector",
  indexName: "shareholder_letters_1977_2024",
  model: openai.embedding("text-embedding-3-small"),
});

export const ragAgent = new Agent({
  name: "rag-agent",
  description,
  instructions,
  model: openai("gpt-4o"),
  memory,
  tools: { vectorQueryTool },
});

export default ragAgent;
