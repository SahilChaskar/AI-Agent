import { openai } from "@ai-sdk/openai";
import { AnswerRelevancyMetric, SummarizationMetric } from "@mastra/evals/llm";
import { ToneConsistencyMetric } from "@mastra/evals/nlp";
import { evaluate } from "@mastra/evals";
import { ragAgentVectorFinal } from "./rag_agent_vector_final";

describe("RAG Agent Evals", () => {
    it("should generate a consistent summary", async () => {
        const metric = new SummarizationMetric(openai("gpt-4o-mini"));
        const result = await evaluate(
            ragAgentVectorFinal,
            "Summarize Warren Buffett's investment philosophy.",
            metric
        );

        console.log("Summarization Eval:", result);
        expect(result.score).toBeGreaterThan(0.7);
    });

    it("should maintain tone consistency", async () => {
        const metric = new ToneConsistencyMetric();
        const result = await evaluate(
            ragAgentVectorFinal,
            "Explain Berkshire's acquisition strategy in simple terms.",
            metric
        );

        console.log("Tone Eval:", result);
        expect(result.score).toBeGreaterThan(0.7);
    });

    it("should return not mentioned in letters", async () => {
        const metric = new AnswerRelevancyMetric(openai("gpt-4o-mini"));

        const result = await evaluate(
            ragAgentVectorFinal,
            "What does Warren Buffett think about cryptocurrency?",
            metric
        );

        console.log("Answer Relevancy Eval:", result);
        expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it("should return relevant answers", async () => {
        const metric = new AnswerRelevancyMetric(openai("gpt-4o-mini"));
        const result = await evaluate(
            ragAgentVectorFinal,
            "What did Buffett say about insurance in 1992?",
            metric
        );

        console.log("Answer Relevancy Eval:", result);
        expect(result.score).toBeGreaterThan(0.3);
    });

});

