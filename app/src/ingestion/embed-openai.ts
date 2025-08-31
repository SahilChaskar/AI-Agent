/**
 * OpenAI Embeddings
 * -----------------
 * Calls OpenAI's embedding API to convert text into vectors.
 */
import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small", // efficient + 1536 dims
    input: text,
  });

  return response.data[0].embedding;
}
