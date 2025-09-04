/* 
  To serve the citations files through this lightweight server
*/
const express = require("express");
const path = require("path");

const app = express();
const PORT = 4112;

const lettersPath = path.join(process.cwd(), "data", "letters");

app.use("/letters", express.static(lettersPath));

app.get("/", (req, res) => {
  res.send("Static file server is running");
});

app.listen(PORT, () => {
  console.log(`File server running at http://localhost:${PORT}/letters`);
});
