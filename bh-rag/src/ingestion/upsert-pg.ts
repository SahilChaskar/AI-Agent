/**
 * Upsert Chunks into pgvector (Table-Aware)
 * -----------------------------------------
 * Stores both narrative text and tables, with metadata.
 */

import { db } from "../config/db";

export async function initVectorTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      content TEXT,
      embedding VECTOR(1536),
      source TEXT,
      type TEXT
    );
  `);
  console.log("Documents table ready");
}

export async function upsertChunks({
  chunks,
  embeddings,
  fileName,
}: {
  chunks: { content: string; type: "text" | "table" }[];
  embeddings: number[][];
  fileName: string;
}) {
  for (let i = 0; i < chunks.length; i++) {
    const { content, type } = chunks[i];
    const vector = `[${embeddings[i].join(",")}]`;

    await db.query(
      "INSERT INTO documents (content, embedding, source, type) VALUES ($1, $2, $3, $4)",
      [content, vector, fileName, type]
    );
  }
}
