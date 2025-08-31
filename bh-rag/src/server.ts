/**
 * server.ts (patched)
 * - collects streaming tokens (textStream)
 * - if the text stream is empty, falls back to tool-result(s) emitted inside fullStream events
 */

import express from "express";
import dotenv from "dotenv";
import { Mastra } from "@mastra/core";
import { PgVector } from "@mastra/pg";
import ragAgentVector from "./rag/agent/rag_agent_vector_final"; // <- use the new file
dotenv.config();

const app = express();
app.use(express.json());

const connectionString = process.env.DATABASE_URL || "";
const vectorStore = new PgVector({ connectionString });

const mastra = new Mastra({
  agents: { ragAgentVector },
  vectors: { vectorStore },
});

const agent = mastra.getAgent("ragAgentVector");

app.post("/ask", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Missing 'query'" });

    console.log("🟢 [Server] Incoming Query:", query);

    // request the agent to use the searchDocs tool (force tool)
    const stream = await agent.stream(
      [{ role: "user", content: query }],
      {
        toolChoice: { type: "tool", toolName: "searchDocs" },
      }
    );

    // 1) collect tokens from textStream (if any)
    let answer = "";

    // collect tokens
    for await (const chunk of stream.textStream) {
      if (chunk) answer += chunk;
    }

    // if no textStream output, fallback to tool-result
    if (!answer) {
      for await (const ev of stream.fullStream) {
        if (ev?.type === "tool-result" && ev?.result) {
          const r = ev.result;
          if (typeof r.text === "string" && r.text.trim().length > 0) {
            answer = r.text;
            break;
          }
        }
      }
    }


    console.log("✅ [Server] Final Answer:", answer || "[EMPTY]");

    return res.json({ success: true, answer: answer || "No answer found." });
  } catch (err: any) {
    console.error("❌ [Server] Agent error:", err);
    return res.status(500).json({ error: "Agent failed", details: err?.message || String(err) });
  }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`✅ Server listening at http://localhost:${PORT}`);
});
