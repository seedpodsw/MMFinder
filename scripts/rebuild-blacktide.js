/**
 * Serve Chazsolo's full Blacktide Bay plate (title + name kept).
 * Source is client/public/maps/blacktide-bay-wiki.webp — the wiki draft.
 * Pins in poi-seed.js are percent positions on this 1536×2048 plate.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const dir = path.join(__dirname, "..", "client", "public", "maps");
const source = path.join(dir, "blacktide-bay-wiki.webp");
const dest = path.join(dir, "blacktide-bay.webp");

async function main() {
  if (!fs.existsSync(source)) throw new Error("Missing " + source);
  const meta = await sharp(source).metadata();
  await sharp(source).webp({ quality: 80, effort: 4 }).toFile(dest);
  console.log(
    JSON.stringify({
      width: meta.width,
      height: meta.height,
      kept: "title and chazsolo credit",
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
