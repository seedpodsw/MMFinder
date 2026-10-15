/**
 * The wiki has one Blacktide Bay plate (chazsolo's draft). This crops the
 * parchment, paints out the title, compass, and margin caption, and darkens
 * the pencil. Source is client/public/maps/blacktide-bay-wiki.webp.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const dir = path.join(__dirname, "..", "client", "public", "maps");
const source = path.join(dir, "blacktide-bay-wiki.webp");
const dest = path.join(dir, "blacktide-bay.webp");

function inkBox(data, width, height, stride) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * stride;
      if (data[i] > 160) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

async function main() {
  if (!fs.existsSync(source)) throw new Error("Missing " + source);
  const base = sharp(source).removeAlpha();
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const paper = [data[0], data[1], data[2]];
  const paint = (x0, y0, x1, y1) => {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * width + x) * channels;
        data[i] = paper[0];
        data[i + 1] = paper[1];
        data[i + 2] = paper[2];
      }
    }
  };
  paint(0, 0, 760, 300);
  paint(160, 1740, 520, 1860);
  paint(1080, 1830, width, height);

  const box = inkBox(data, width, height, channels);
  const pad = 36;
  const left = Math.max(0, box.minX - pad);
  const top = Math.max(0, box.minY - pad);
  const cropW = Math.min(width, box.maxX + pad + 1) - left;
  const cropH = Math.min(height, box.maxY + pad + 1) - top;

  await sharp(data, { raw: { width, height, channels } })
    .extract({ left, top, width: cropW, height: cropH })
    .linear(1.55, -62)
    .sharpen({ sigma: 0.5 })
    .webp({ quality: 80, effort: 4 })
    .toFile(dest);

  console.log(JSON.stringify({ fromW: width, fromH: height, left, top, cropW, cropH }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
