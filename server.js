const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const { exec } = require("child_process");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const upload = multer({ dest: "/tmp" });

// Add a health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.post("/process", upload.single("pdf"), async (req, res) => {
  const { normalizeHeight, optimizePdf, enableOcr, ocrLanguages } = req.body;
  const inputPath = req.file.path;
  const outputPath = `/tmp/${uuidv4()}.pdf`;

  try {
    let currentPdfPath = inputPath;

    if (optimizePdf) {
      const optimizedPath = `/tmp/${uuidv4()}.pdf`;
      await execPromise(
        `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${optimizedPath} ${currentPdfPath}`
      );
      currentPdfPath = optimizedPath;
    }

    if (enableOcr === "true") {
      const ocrPath = `/tmp/${uuidv4()}.pdf`;
      const langs = ocrLanguages || "eng";
      await execPromise(
        `tesseract ${currentPdfPath} ${ocrPath.replace(
          ".pdf",
          ""
        )} -l ${langs} pdf`
      );
      currentPdfPath = ocrPath;
    }

    const finalBuffer = await fs.readFile(currentPdfPath);
    res.setHeader("Content-Type", "application/pdf");
    res.send(finalBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Also add a simple frontend for manual testing
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>PDF Processor</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        form { max-width: 500px; }
        label { display: block; margin: 10px 0 5px; }
        button { margin-top: 20px; padding: 10px; }
      </style>
    </head>
    <body>
      <h1>PDF Processor</h1>
      <form action="/process" method="post" enctype="multipart/form-data">
        <label for="pdf">Select PDF:</label>
        <input type="file" id="pdf" name="pdf" accept="application/pdf" required>
        
        <label>
          <input type="checkbox" name="optimizePdf" value="true" checked>
          Optimize PDF (reduce file size)
        </label>
        
        <label>
          <input type="checkbox" name="enableOcr" value="true">
          Enable OCR
        </label>
        
        <label for="ocrLanguages">OCR Languages (comma separated):</label>
        <input type="text" id="ocrLanguages" name="ocrLanguages" value="eng" placeholder="eng,fra,nld">
        
        <button type="submit">Process PDF</button>
      </form>
    </body>
    </html>
  `);
});

const execPromise = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(stderr || stdout || error.message);
      else resolve(stdout);
    });
  });

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
