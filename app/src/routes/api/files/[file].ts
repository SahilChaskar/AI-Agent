// src/routes/files/[file].ts
import fs from "fs";
import path from "path";
import { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  console.log("➡️ /api/files route hit:", req.url);

  const fileName = req.url?.split("/").pop();
  console.log("📄 requested file:", fileName);

  if (!fileName) {
    res.statusCode = 400;
    res.end("Missing file name");
    return;
  }

  const filePath = path.join(process.cwd(), "data", "letters", fileName);
  console.log("📂 resolved path:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("❌ not found:", filePath);
    res.statusCode = 404;
    res.end(`File not found: ${fileName}`);
    return;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  fs.createReadStream(filePath).pipe(res);
}
