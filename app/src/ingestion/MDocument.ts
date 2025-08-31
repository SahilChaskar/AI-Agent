/**
 * Alternate simple document chunker (naive baseline).
 *
 * - Loads PDF and extracts plain text
 * - Splits into fixed-size chunks with overlap
 * - Ignores tables/semantics (baseline approach)
 */

import fs from "fs";
import pdfParse from "pdf-parse";
import { Chunk } from "./chunk";

export class MDocument {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Recursively splits text into chunks of maxLength with overlap
   */
  static recursiveChunk(
    text: string,
    maxLength: number = 1000,
    overlap: number = 200
  ): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + maxLength;
      if (end > text.length) end = text.length;

      const chunk = text.slice(start, end).trim();
      if (chunk.length > 0) chunks.push(chunk);

      start = end - overlap;
      if (start < 0) start = 0;
    }

    return chunks;
  }

  /**
   * Loads the file, extracts text, and produces Chunk[] for ingestion
   */
  async toChunks(): Promise<Chunk[]> {
    const buffer = fs.readFileSync(this.filePath);
    const pdfData = await pdfParse(buffer);

    const text = pdfData.text;
    const rawChunks = MDocument.recursiveChunk(text, 1000, 200);

    // Map to { content, type }
    const chunks: Chunk[] = rawChunks.map((c) => ({
      content: c,
      type: "text", // naive baseline: everything is text
    }));

    return chunks;
  }
}
