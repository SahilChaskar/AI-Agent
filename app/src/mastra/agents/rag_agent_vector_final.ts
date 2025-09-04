/**
 * rag_agent_vector_final.ts
 *
 * Table-aware RAG agent with two-step refinement.
 */

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { PgVector } from "@mastra/pg";
import { rerank } from "@mastra/rag";
import { embed } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Memory } from "@mastra/memory";
import { PostgresStore } from "@mastra/pg";
import { SummarizationMetric } from "@mastra/evals/llm";
import {
    ContentSimilarityMetric,
    ToneConsistencyMetric,
} from "@mastra/evals/nlp";
import { TemporalRelevanceMetric } from "../evals/TemporalRelevance.js";
import { CitationPresenceMetric } from "../evals/CitationPresent.js";


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

interface RagAnswer {
    direct_answer: string;
    supporting_evidence: string[];
    contextual_analysis: string;
    sources: string[];
}

const promptsDir = path.join(process.cwd(), "src", "mastra", "prompts");
const description = fs.existsSync(path.join(promptsDir, "description.txt"))
    ? fs.readFileSync(path.join(promptsDir, "description.txt"), "utf8")
    : "Berkshire RAG agent";
const instructions = fs.existsSync(path.join(promptsDir, "instructions.txt"))
    ? fs.readFileSync(path.join(promptsDir, "instructions.txt"), "utf8")
    : "You are an agent that must only use the shareholder letters as the source.";

// Vector store + memory
const vectorStore = new PgVector({ connectionString });
const memory = new Memory({
    storage: new PostgresStore({ host, port, user, database, password }),
    options: {
        lastMessages: 10,
        //   semanticRecall: {
        //     topK: 3, 
        //     messageRange: 2, 
        //     scope: 'resource',
        //   },
    },
});

function safeJSONParse(text: string): any {
    try {
        const cleaned = text
            .trim()
            .replace(/^```(?:json)?/i, "")
            .replace(/```$/, "")
            .trim();
        return JSON.parse(cleaned);
    } catch {
        return null;
    }
}

// Tool: searchDocs
const searchDocs = createTool({
    id: "searchDocs",
    description: "Search and answer questions using pgvector and reranking.",
    inputSchema: z.object({ input: z.string() }),
    outputSchema: z.object({
        text: z.string(),
        citations: z.array(z.object({ fileName: z.string(), chunkIndex: z.number().optional() })),
    }),
    execute: async ({ context }) => {
        const query = (context as any).input as string;
        console.log("[Tool] searchDocs — query:", query);

        // 1) embed query
        const { embedding } = await embed({
            model: openai.embedding("text-embedding-3-small"),
            value: query,
        });

        // 2) query pgvector
        const results = await vectorStore.query({
            indexName,
            queryVector: embedding,
            topK: 10,
            includeVector: false,
        });
        if (!results.length) return { text: "No relevant content found.", citations: [] };

        // 3) rerank
        const reranked = await rerank(results, query, openai("gpt-4o-mini"), { topK: 5 });

        const contextText = reranked.map((r) => r.result?.metadata?.text ?? "").join("\n---\n");
        const citations = reranked.map((r) => ({
            fileName: r.result?.metadata?.fileName || "unknown",
            chunkIndex: r.result?.metadata?.chunkIndex,
        }));

        const citationsList = citations
            .map((c) => {
                const link = `http://localhost:4112/letters/${c.fileName}`;
                return `<a href="${link}" target="_blank">${c.fileName}</a>`;
            })
            .join("<br>");


        // 4) freeform synthesis
        const systemPrompt = instructions;
        const userPrompt = `Given the following shareholder letter excerpts, answer clearly and concisely:\n\n${contextText}\n\nQuestion: ${query}`;

        const answerResult = await openai("gpt-4o").doGenerate({
            inputFormat: "messages",
            mode: { type: "regular" },
            prompt: [
                { role: "system", content: systemPrompt },
                { role: "user", content: [{ type: "text" as const, text: userPrompt }] },
            ],
        });
        const raw = (answerResult as any).text ?? "";
        console.log("Raw synthesis (truncated):", raw.slice(0, 500));

        // 5) refinement
        const refinePrompt = `
Return ONLY valid JSON with this schema:

{
  "direct_answer": string,
  "supporting_evidence": string[],
  "contextual_analysis": string,
  "sources": string[]
}

Text:
${raw}`;

        const refineResult = await openai("gpt-4o").doGenerate({
            inputFormat: "messages",
            mode: { type: "regular" },
            prompt: [
                { role: "system", content: refinePrompt },
                { role: "user", content: [{ type: "text" as const, text: raw }] },
            ],
        });

        const parsed = safeJSONParse((refineResult as any).text) as RagAnswer | null;

        // 6) build final answer
        let composed: string;
        if (parsed && parsed.direct_answer) {
            composed = [
                `Direct Answer: ${parsed.direct_answer}`,
                parsed.supporting_evidence?.length
                    ? `\nSupporting Evidence:\n- ${parsed.supporting_evidence.join("\n- ")}`
                    : "\nSupporting Evidence: (none)",
                `\nContextual Analysis:\n${parsed.contextual_analysis || "(none)"}`,
                parsed.sources?.length ? `\nSource Documentation:\n- ${parsed.sources.join("\n- ")}` : "",
            ].join("\n");
        } else {
            composed = raw;
        }

        // 7) safeguard trim
        const start = composed.indexOf("Direct Answer:");
        const next = composed.indexOf("Direct Answer:", start + 14);
        const finalText =
            start !== -1 && next !== -1 ? composed.slice(start, next).trim() : composed.trim();
        console.log("Final Answer with Citations:\n", `${finalText}\n\nSources: \n${citationsList}`);

        const finalAnswer = `
${finalText}
<br><br>
<strong>Sources:</strong><br>
${citationsList}
`;

        return { text: finalAnswer, citations };
    },
});

// Agent
export const ragAgentVectorFinal = new Agent({
    name: "ragAgentVectorFinal",
    description,
    instructions,
    model: openai("gpt-4o"),
    memory,
    tools: { searchDocs },
    evals: {
        summarization: new SummarizationMetric(openai("gpt-4o")),
        contentSimilarity: new ContentSimilarityMetric(),
        tone: new ToneConsistencyMetric(),
        temporalRelevance: new TemporalRelevanceMetric(),
        citationPresence: new CitationPresenceMetric(),
    },
});

export default ragAgentVectorFinal;

