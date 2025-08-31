import { PgVector } from "@mastra/pg";
import dotenv from "dotenv";

dotenv.config();

const PG_CONNECTION_STRING = process.env.DATABASE_URL || "";
const INDEX_NAME = "shareholder_letters_1977_2024";

const vectorStore = new PgVector({ connectionString: PG_CONNECTION_STRING });

let indexInitialized = false;

async function ensureIndex(dimension: number) {
  if (!indexInitialized) {
    await vectorStore.createIndex({
      indexName: INDEX_NAME,
      dimension,
      metric: "cosine",
    });
    indexInitialized = true;
    console.log(`✅ Index '${INDEX_NAME}' ready`);
  }
}

export async function upsertChunks({
  fileName,
  chunks,
  embeddings,
}: {
  fileName: string;
  chunks: { content: string; type: "text" | "table"; year: number | null }[];
  embeddings: number[][];
}) {
  await ensureIndex(embeddings[0].length);

  await vectorStore.upsert({
    indexName: INDEX_NAME,
    vectors: embeddings,
    metadata: chunks.map((chunk, i) => ({
      text: chunk.content,
      fileName,
      type: chunk.type,
      year: chunk.year,
      chunkIndex: i,
    })),
    ids: chunks.map((_, i) => `${fileName}_${i}`),
  });
}
