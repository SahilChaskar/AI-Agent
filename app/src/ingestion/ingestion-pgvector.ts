import fs from "fs";
import path from "path";
import pdf from "pdf-parse";
import { embedText } from "./embed-openai";
import { smartChunk, recursiveTextChunk } from "./chunk";
import { upsertChunks } from "./upsert-pgvector";

const LETTERS_DIR = path.join(__dirname, "../../data/letters");

// Configurable chunking parameters
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

async function processPDF(filePath: string, fileName: string) {
  try {
    console.log(`Processing: ${fileName}`);

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text;

    //  Table-aware chunking
    const rawChunks = smartChunk(text);
    const expandedChunks: { content: string; type: "text" | "table"; year: number | null }[] = [];

    const year = extractYear(fileName);

    //  Expand text chunks with overlap, keep tables as-is
    for (const chunk of rawChunks) {
      if (chunk.type === "text") {
        const subChunks = recursiveTextChunk(chunk.content, CHUNK_SIZE, CHUNK_OVERLAP);
        for (const sub of subChunks) {
          expandedChunks.push({ content: sub, type: "text", year });
        }
      } else {
        expandedChunks.push({ content: chunk.content, type: "table", year });
      }
    }

    console.log(`Generated ${expandedChunks.length} final chunks`);

    //  Embed chunks
    const embeddings: number[][] = [];
    for (const chunk of expandedChunks) {
      const embedding = await embedText(chunk.content);
      embeddings.push(embedding);
    }

    //  Upsert into pgvector
    await upsertChunks({
      fileName,
      chunks: expandedChunks,
      embeddings,
    });

    console.log(` Finished upserting all chunks for ${fileName}`);
  } catch (err) {
    console.error(`Failed to process ${fileName}:`, err);
  }
}

async function parseAllPDFsInFolder(folderPath: string) {
  const files = fs.readdirSync(folderPath).filter((file) => file.endsWith(".pdf"));
  for (const file of files) {
    await processPDF(path.join(folderPath, file), file);
  }
}

function extractYear(fileName: string): number | null {
  const match = fileName.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : null;
}

async function main() {
  console.log("Starting ingestion...");
  await parseAllPDFsInFolder(LETTERS_DIR);
  console.log(" Ingestion complete");
}

main();