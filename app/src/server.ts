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
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const connectionString = process.env.DATABASE_URL || "";
const vectorStore = new PgVector({ connectionString });

const mastra = new Mastra({
  agents: { ragAgentVector },
  vectors: { vectorStore },
});

const agent = mastra.getAgent("ragAgentVector");

app.post("/ask", async (req, res) => {
  try {
    const query = req.body.query || req.body.prompt;
    if (!query) return res.status(400).json({ error: "Missing 'query' or 'prompt'" });

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


// app.post("/askNew", async (req, res) => {
//   const query = req.body.query || req.body.prompt;
//   if (!query) return res.status(400).json({ error: "Missing 'query' or 'prompt'" });

//   console.log("🟢 Incoming Query:", query);

//   try {
//     const stream = await agent.stream(
//       [{ role: "user", content: query }],
//       { toolChoice: { type: "tool", toolName: "searchDocs" } }
//     );

//     // 👇 Copy logic from /ask: accumulate a final answer
//     let answer = "";
//     for await (const chunk of stream.textStream) {
//       if (chunk) answer += chunk;
//     }

//     if (!answer) {
//       for await (const ev of stream.fullStream) {
//         if (ev?.type === "tool-result" && ev?.result) {
//           const r = ev.result;
//           if (typeof r.text === "string" && r.text.trim().length > 0) {
//             answer = r.text;
//             break;
//           }
//         }
//       }
//     }

//     console.log("✅ [Server] Final Answer (/askNew):", answer || "[EMPTY]");

//     // 👇 Send once via SSE so your current frontend can still consume it
//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");
//     res.flushHeaders?.();

//     res.write(`data: ${JSON.stringify({ delta: answer || "No answer found." })}\n\n`);
//     res.write(`data: [DONE]\n\n`);
//     res.end();
//   } catch (err: any) {
//     console.error("❌ Streaming error:", err);
//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");
//     res.flushHeaders?.();

//     res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
//     res.write(`data: [DONE]\n\n`);
//     res.end();
//   }
// });

//below one is with the console logs
// app.post("/askNew", async (req, res) => {
//   const query = req.body.query || req.body.prompt;
//   if (!query) return res.status(400).json({ error: "Missing 'query' or 'prompt'" });

//   console.log("🟢 Incoming Query:", query);

//   try {
//     const stream = await agent.stream(
//       [{ role: "user", content: query }],
//       { toolChoice: { type: "tool", toolName: "searchDocs" } }
//     );

//     // accumulate a final answer
//     let answer = "";
//     for await (const chunk of stream.textStream) {
//       if (chunk) answer += chunk;
//     }

//     if (!answer) {
//       for await (const ev of stream.fullStream) {
//         if (ev?.type === "tool-result" && ev?.result) {
//           const r = ev.result;
//           if (typeof r.text === "string" && r.text.trim().length > 0) {
//             answer = r.text;
//             break;
//           }
//         }
//       }
//     }

//     console.log("✅ [Server] Final Answer (/askNew):", answer || "[EMPTY]");

//     // Prepare SSE response
//     const sseResponse = { delta: answer || "No answer found." };

//     // Log response being sent and its format
//     console.log("📤 Sending SSE Response:", sseResponse);
//     console.log("📤 Response Format (JSON string):", JSON.stringify(sseResponse));

//     // Send via SSE
//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");
//     res.flushHeaders?.();

//     res.write(`data: ${JSON.stringify(sseResponse)}\n\n`);
//     res.write(`data: [DONE]\n\n`);
//     res.end();
//   } catch (err: any) {
//     console.error("❌ Streaming error:", err);
//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");
//     res.flushHeaders?.();

//     const errorResponse = { error: err.message };
//     console.log("📤 Sending SSE Error Response:", errorResponse);
//     console.log("📤 Error Response Format (JSON string):", JSON.stringify(errorResponse));

//     res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
//     res.write(`data: [DONE]\n\n`);
//     res.end();
//   }
// });


//dummy
app.post("/askNew", async (req, res) => {
  const query = req.body.query || req.body.prompt;
  if (!query) return res.status(400).json({ error: "Missing 'query' or 'prompt'" });

  console.log("🟢 Incoming Query:", query);

  try {
    // 🔹 Dummy response (same as your last successful call)
    const answer = `Direct Answer: In 1992, Berkshire Hathaway's insurance operations, which began with the acquisition of National Indemnity Company, were a significant part of the company's business strategy. The performance of these operations is a crucial focus, as highlighted through the provided table showing key figures for the property-casualty insurance industry, such as the statutory combined ratio and changes in premiums written.

Supporting Evidence:
- The shareholder letter mentions, 'insurance operations since we entered the business 34 years ago upon acquiring National Indemnity Company.' This places the acquisition and subsequent operations timeline in accurate context, which indicates how central the insurance operations have been to Berkshire's strategy.

Contextual Analysis:
The insurance sector has been pivotal for Berkshire Hathaway, serving as both a source of substantial underwriting profit and as a generator of float, which Buffett invests. This dual advantage provided by the insurance operations has supported Berkshire's broader investment strategy and growth over decades.

Source Documentation:
- The excerpts provided from the 1992 Shareholder Letter discuss the continuation and importance of their long-standing insurance operations.`;

    // Prepare SSE response
    const sseResponse = { delta: answer };

    // Log response being sent
    console.log("📤 Sending Dummy SSE Response:", sseResponse);
    console.log("📤 Response Format (JSON string):", JSON.stringify(sseResponse));

    // Send via SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify(sseResponse)}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err: any) {
    console.error("❌ Error in dummy route:", err);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const errorResponse = { error: err.message };
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});


const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`✅ Server listening at http://localhost:${PORT}`);
});
