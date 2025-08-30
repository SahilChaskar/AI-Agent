/**
 * Smart Chunking (Table-Aware)
 * ----------------------------
 * Separates narrative text from tables.
 * - Text: split into smaller overlapping chunks
 * - Tables: kept whole as a single chunk (preserve structure)
 */

export type Chunk = {
  content: string;
  type: "text" | "table";
};

function isTableLine(line: string): boolean {
  // Heuristics for table detection:
  // - Multiple spaces separating words/numbers
  // - Contains lots of digits
  // - Contains table-like separators
  return (
    (line.match(/\s{2,}/) && /\d/.test(line)) ||
    line.includes("-----") ||
    line.includes("====") ||
    line.includes("Total") // common in financial tables
  );
}

export function smartChunk(text: string): Chunk[] {
  const lines = text.split("\n");
  const chunks: Chunk[] = [];

  let buffer: string[] = [];
  let mode: "text" | "table" = "text";

  const flushBuffer = () => {
    if (buffer.length > 0) {
      chunks.push({ content: buffer.join("\n"), type: mode });
      buffer = [];
    }
  };

  for (const line of lines) {
    const looksLikeTable = isTableLine(line);

    if (looksLikeTable) {
      if (mode === "text") {
        flushBuffer();
        mode = "table";
      }
      buffer.push(line);
    } else {
      if (mode === "table") {
        flushBuffer();
        mode = "text";
      }
      buffer.push(line);
    }
  }

  flushBuffer();
  return chunks;
}

/**
 * Further split narrative text into smaller overlapping chunks.
 */
export function recursiveTextChunk(
  text: string,
  size: number = 800,
  overlap: number = 150
): string[] {
  const words = text.split(" ");
  const result: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = start + size;
    const chunk = words.slice(start, end).join(" ");
    result.push(chunk);
    start = end - overlap;
    if (start < 0) start = 0;
  }

  return result;
}
