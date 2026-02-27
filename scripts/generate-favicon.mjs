import sharp from "sharp";
import pngToIco from "png-to-ico";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.join(__dirname, "../public/logo.png");
const tempPath = path.join(__dirname, "../public/logo-favicon-temp.png");
const outputPath = path.join(__dirname, "../src/app/favicon.ico");

sharp(logoPath)
  .resize(256, 256)
  .png()
  .toFile(tempPath)
  .then(() => pngToIco(tempPath))
  .then((buf) => {
    fs.writeFileSync(outputPath, buf);
    fs.unlinkSync(tempPath);
    console.log("favicon.ico generado en src/app/");
  })
  .catch((err) => {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error("Error:", err);
    process.exit(1);
  });
