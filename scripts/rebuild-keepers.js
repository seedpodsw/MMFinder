/**
 * The wiki plate draws the orc caves, then leaves the Vale road in the grass
 * beside them. Connect that road into the south cave mouth. The rooms above
 * it already run to the lift. Source is keepers-bight-wiki.webp.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const dir = path.join(__dirname, "..", "client", "public", "maps");
const source = path.join(dir, "keepers-bight-wiki.webp");
const dest = path.join(dir, "keepers-bight.webp");

async function main() {
  if (!fs.existsSync(source)) throw new Error("Missing " + source);
  const pathMark = await sharp(
    Buffer.from(`<svg width="140" height="90" xmlns="http://www.w3.org/2000/svg">
      <path d="M 114 28 C 82 42, 46 54, 16 64" fill="none" stroke="#4a453e" stroke-width="12" stroke-linecap="round"/>
      <path d="M 114 28 C 82 42, 46 54, 16 64" fill="none" stroke="#d5cec4" stroke-width="7" stroke-linecap="round"/>
    </svg>`)
  )
    .png()
    .toBuffer();
  await sharp(source)
    .composite([{ input: pathMark, left: 850, top: 1778 }])
    .webp({ quality: 82, effort: 4 })
    .toFile(dest + ".next");
  fs.renameSync(dest + ".next", dest);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
