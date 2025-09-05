import fs from "fs";
import path from "path";
import { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const fileName = req.url?.split("/").pop();
  console.log("📂 Requested file:", fileName);

  if (!fileName) {
    console.error("❌ Missing file name");
    res.statusCode = 400;
    res.end("Missing file name");
    return;
  }

  const filePath = path.join(process.cwd(), "data", "letters", fileName);
  console.log("📂 Resolved file path:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("❌ File does not exist:", filePath);
    res.statusCode = 404;
    res.end(`File not found: ${fileName}`);
    return;
  }

  console.log("✅ Serving file:", filePath);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);

  fs.createReadStream(filePath).pipe(res);
}
