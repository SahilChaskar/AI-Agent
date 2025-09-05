/**
 * server.ts (patched)
 * - collects streaming tokens (textStream)
 * - if the text stream is empty, falls back to tool-result(s) emitted inside fullStream events
 */

import express from "express";
import dotenv from "dotenv";
import { Mastra } from "@mastra/core";
import { PgVector } from "@mastra/pg";
// import ragAgentVector from "./rag/agent/rag_agent_vector_final";
import cors from "cors";
import ragAgentVectorFinal from "./rag_agent_vector_final";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const connectionString = process.env.DATABASE_URL || "";
const vectorStore = new PgVector({ connectionString });

const mastra = new Mastra({
  agents: { ragAgentVectorFinal },
  vectors: { vectorStore },
  telemetry: {
    serviceName: "berkshire-rag-app",
    enabled: true,
    export: {
      type: "console",
    }},
});

const agent = mastra.getAgent("ragAgentVectorFinal");

app.post("/askNew", async (req, res) => {
  const query = req.body.query || req.body.prompt;
  if (!query) return res.status(400).json({ error: "Missing 'query' or 'prompt'" });

  console.log("Incoming Query:", query);

  try {
    const stream = await agent.stream(
      [{ role: "user", content: query }],
      { toolChoice: { type: "tool", toolName: "searchDocs" } }
    );

    // accumulate a final answer
    let answer = "";
    for await (const chunk of stream.textStream) {
      if (chunk) answer += chunk;
    }

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

    console.log(" [Server] Final Answer (/askNew):", answer || "[EMPTY]");

    // Prepare SSE response
    const sseResponse = { delta: answer || "No answer found." };

    // Log response being sent and its format
    console.log(" Sending SSE Response:", sseResponse);
    console.log(" Response Format (JSON string):", JSON.stringify(sseResponse));

    // Send via SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify(sseResponse)}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err: any) {
    console.error(" Streaming error:", err);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const errorResponse = { error: err.message };
    console.log(" Sending SSE Error Response:", errorResponse);
    console.log(" Error Response Format (JSON string):", JSON.stringify(errorResponse));

    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(` Server listening at http://localhost:${PORT}`);
});
