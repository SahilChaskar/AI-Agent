/**
 * PDF Parsing
 * -----------
 * Uses pdf-parse to extract raw text from PDF files.
 */

import fs from "fs";
import pdf from "pdf-parse";

export async function extractTextFromPdf(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
}
