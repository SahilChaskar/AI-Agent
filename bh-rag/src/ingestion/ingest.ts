/**
 * Ingestion Pipeline (Table-Aware + MDocument fallback)
 * -----------------------------------------------------
 * 1. Reads PDFs
 * 2. If USE_ADVANCED_CHUNKING = true → Table-aware chunking
 * 3. If USE_ADVANCED_CHUNKING = false → Generic MDocument parsing
 * 4. Embeds chunks
 * 5. Upserts into PostgreSQL (pgvector)
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { extractTextFromPdf } from "./parse-pdf";
import { smartChunk, recursiveTextChunk, Chunk } from "./chunk";
import { embedText } from "./embed-openai";
import { upsertChunks, initVectorTable } from "./upsert-pg";
import { testDbConnection } from "../config/db";
import { MDocument } from "./MDocument";

const LETTERS_DIR = path.join(__dirname, "../../data/letters");

// Flip this flag to switch modes the advance one is better as it has table awarness and seperates the tables from the text in case of embeddings 
const USE_ADVANCED_CHUNKING = true;

async function processPDF(filePath: string, fileName: string) {
    try {
        console.log(`Processing: ${fileName}`);

        let expandedChunks: Chunk[] = [];

        if (USE_ADVANCED_CHUNKING) {
            // 1. Extract text
            const text = await extractTextFromPdf(filePath);

            // 2. Smart chunking (text vs tables)
            const rawChunks = smartChunk(text);

            // 3. Expand narrative text into smaller sub-chunks
            for (const chunk of rawChunks) {
                if (chunk.type === "text") {
                    const subChunks = recursiveTextChunk(chunk.content, 800, 150);
                    for (const sub of subChunks) {
                        expandedChunks.push({ content: sub, type: "text" });
                    }
                } else {
                    expandedChunks.push(chunk); // tables kept whole
                }
            }
        } else {
            // Simpler, generic chunking using MDocument
            const mdoc = new MDocument(filePath);
            expandedChunks = await mdoc.toChunks();
        }

        console.log(`Generated ${expandedChunks.length} final chunks`);

        // 4. Embed chunks
        const embeddings: number[][] = [];
        for (const chunk of expandedChunks) {
            const embedding = await embedText(chunk.content);
            embeddings.push(embedding);
        }

        // 5. Upsert into pgvector
        await upsertChunks({ chunks: expandedChunks, embeddings, fileName });
        console.log(`Finished upserting chunks for ${fileName}`);
    } catch (err) {
        console.error(`Failed to process ${fileName}:`, err);
    }
}

async function parseAllPDFsInFolder(folderPath: string) {
    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".pdf"));
    for (const file of files) {
        const fullPath = path.join(folderPath, file);
        await processPDF(fullPath, file);
    }
}

async function main() {
    console.log("Starting ingestion pipeline...");
    await testDbConnection();
    await initVectorTable();
    await parseAllPDFsInFolder(LETTERS_DIR);
    console.log("Ingestion complete");
}

main();
