/**
 * Stitch the MnM Atlas Ail'vorith chart into client/public/maps/ail-vorith.webp.
 * Tiles: https://www.mnmatlas.com/ail-vorith/  (ocombe; Foreign Quarter after Neeferio, CC BY-SA 4.0)
 * Zoom 4 is half of the 7424×8192 sheet. POI percents are of that full sheet, so keep the whole frame.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ZOOM = 4;
const SRC_W = 7424;
const SRC_H = 8192;
const TILE = 256;
const scale = 2 ** (ZOOM - 5);
const W = Math.round(SRC_W * scale);
const H = Math.round(SRC_H * scale);
const cols = Math.ceil(W / TILE);
const rows = Math.ceil(H / TILE);
const tileDir = path.join(__dirname, "..", "tmp-maps", "ail-tiles", String(ZOOM));
const dest = path.join(__dirname, "..", "client", "public", "maps", "ail-vorith.webp");
const base = "https://www.mnmatlas.com/assets/tiles/ail-vorith";

async function fetchTile(x, y) {
  const file = path.join(tileDir, `${x}-${y}.webp`);
  if (fs.existsSync(file) && fs.statSync(file).size > 100) return file;
  const url = `${base}/${ZOOM}/${x}/${y}.webp?v=v2`;
  const res = await fetch(url, { headers: { "User-Agent": "MMFinder/1.0" } });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 50) return null;
  fs.writeFileSync(file, buf);
  return file;
}

async function pool(jobs, n) {
  let i = 0;
  const out = [];
  async function worker() {
    while (i < jobs.length) {
      const job = jobs[i++];
      out.push(await job());
    }
  }
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

async function main() {
  fs.mkdirSync(tileDir, { recursive: true });
  const jobs = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) jobs.push(() => fetchTile(x, y).then((file) => ({ x, y, file })));
  }
  const tiles = await pool(jobs, 10);
  const layers = [];
  for (const tile of tiles) {
    if (!tile.file) continue;
    const left = tile.x * TILE;
    const top = tile.y * TILE;
    const tw = Math.min(TILE, W - left);
    const th = Math.min(TILE, H - top);
    let input = tile.file;
    if (tw < TILE || th < TILE) {
      input = await sharp(tile.file).extract({ left: 0, top: 0, width: tw, height: th }).toBuffer();
    }
    layers.push({ input, left, top });
  }
  await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(layers)
    .webp({ quality: 80, effort: 4 })
    .toFile(dest + ".next");
  fs.renameSync(dest + ".next", dest);
  console.log("ail-vorith", W, H, Math.round(fs.statSync(dest).size / 1024) + "kb");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
