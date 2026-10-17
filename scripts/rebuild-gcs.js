/**
 * Stitch the MnM Atlas Great Cavern Sea chart into client/public/maps/great-cavern-sea.webp.
 * Tiles: https://www.mnmatlas.com/great-cavern-sea/  (ocombe, illustrated fan atlas)
 * The sheet is 7744×10368 at zoom 6. Zoom 5 is half of that, enough to read the labels.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ZOOM = Number(process.argv[2] || 5);
const SRC_W = 7744;
const SRC_H = 10368;
const TILE = 256;
const COORD_ZOOM = 6;
const scale = 2 ** (ZOOM - COORD_ZOOM);
const W = Math.round(SRC_W * scale);
const H = Math.round(SRC_H * scale);
const cols = Math.ceil(W / TILE);
const rows = Math.ceil(H / TILE);
const tileDir = path.join(__dirname, "..", "tmp-maps", "gcs-tiles", String(ZOOM));
const destArg = process.argv[3];
const dest = destArg
  ? path.resolve(destArg)
  : path.join(__dirname, "..", "client", "public", "maps", "great-cavern-sea.webp");
const base = "https://www.mnmatlas.com/assets/tiles/great-cavern-sea";

async function fetchTile(x, y) {
  const file = path.join(tileDir, `${x}-${y}.webp`);
  if (fs.existsSync(file) && fs.statSync(file).size > 80) return file;
  const url = `${base}/${ZOOM}/${x}/${y}.webp?v=v2`;
  const res = await fetch(url, { headers: { "User-Agent": "MMFinder/1.0" } });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 40) return null;
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
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const jobs = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) jobs.push(() => fetchTile(x, y).then((file) => ({ x, y, file })));
  }
  const tiles = await pool(jobs, 12);
  const layers = [];
  let missing = 0;
  for (const tile of tiles) {
    if (!tile.file) {
      missing++;
      continue;
    }
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
    create: { width: W, height: H, channels: 4, background: { r: 14, g: 22, b: 32, alpha: 1 } },
  })
    .composite(layers)
    .webp({ quality: 78, effort: 4 })
    .toFile(dest + ".next");
  fs.renameSync(dest + ".next", dest);
  console.log("great-cavern-sea", W, H, "tiles", layers.length, "missing", missing, Math.round(fs.statSync(dest).size / 1024) + "kb");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
