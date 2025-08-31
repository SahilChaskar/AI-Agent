// rag_agent_vector.ts
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { PgVector } from "@mastra/pg";
import { rerank } from "@mastra/rag";
import { embed } from "ai";
import { z } from "zod";
import fs from "fs";
import dotenv from "dotenv";
import { Memory } from "@mastra/memory";
import { PostgresStore } from "@mastra/pg";
import { createTool } from "@mastra/core/tools";
import path from "path";

dotenv.config();

const host = process.env.PG_HOST || "localhost";
const port = process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432;
const user = process.env.PG_USER || "postgres";
const database = process.env.PG_DATABASE || "postgres";
const password = process.env.PG_PASSWORD || "postgres";
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${user}:${password}@${host}:${port}/${database}`;

const indexName = "shareholder_letters_1977_2024";

// Load description and instructions
const description = fs.readFileSync(path.join(__dirname, "prompts/description.txt"), "utf-8");
const instructions = fs.readFileSync(path.join(__dirname, "prompts/instructions.txt"), "utf-8");

// Initialize Vector Store and Memory
const vectorStore = new PgVector({ connectionString });
const memory = new Memory({
  storage: new PostgresStore({ host, port, user, database, password }),
  options: { lastMessages: 10 },
});

// Helper → extract year from query if present
function extractYearFromQuery(query: string): number | null {
  const match = query.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : null;
}

// Create the search tool
// Create the search tool
const searchDocs = createTool({
  id: "searchDocs",
  description: "Search and answer questions using pgvector and reranking.",
  inputSchema: z.object({
    input: z.string().describe("User's question or query."),
  }),
  // ✅ Keep citations inside tool but bubble text to top-level
  outputSchema: z.object({
    text: z.string(),
    citations: z.array(
      z.object({
        fileName: z.string(),
        chunkIndex: z.number().optional(),
      })
    ),
  }),
  execute: async ({ context }) => {
    console.log("🔍 [Tool] searchDocs started");
    console.log("👉 Query:", context.input);

    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: context.input,
    });

    const results = await vectorStore.query({
      indexName,
      queryVector: embedding,
      topK: 10,
      includeVector: false,
    });

    if (!results || results.length === 0) {
      return { text: "No relevant content found.", citations: [] };
    }

    const reranked = await rerank(results, context.input, openai("gpt-4o-mini"), {
      topK: 5,
    });

    const contextText = reranked
      .map((r) => r.result?.metadata?.text ?? "")
      .join("\n---\n");

    const citations = reranked.map((r) => {
      const meta = r.result?.metadata || {};
      return {
        fileName: meta.fileName || "unknown",
        chunkIndex: meta.chunkIndex ?? undefined,
      };
    });

    const answerPrompt = `Given the following PDF content, answer the user's question.\n\nPDF Chunks:\n${contextText}\n\nQuestion: ${context.input}`;

    const answerResult = await openai("gpt-4o").doGenerate({
      inputFormat: "messages",
      mode: { type: "regular" },
      prompt: [{ role: "user", content: [{ type: "text", text: answerPrompt }] }],
    });

    const finalAnswer = answerResult.text ?? "No answer found.";

    // ✅ Bubble text + citations up so server sees it at `response.text`
    return {
      text: finalAnswer,
      citations,
    };
  },
});


// Create the agent
export const ragAgentVector = new Agent({
  name: "ragAgentVector",
  description,
  instructions,
  model: openai("gpt-4o"),
  memory,
  tools: {
    searchDocs,
  },
});

export default ragAgentVector;
