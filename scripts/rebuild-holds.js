/**
 * Rothold and Blind Midden plates for the Deep atlas.
 * Rothold is the wiki sheet (File:Rothold map by skoop.png), scaled so the floor labels stay readable.
 * Blind Midden is two wiki drawings joined side by side: ground floor, then the unfinished basement.
 */
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const tmp = path.join(root, "tmp-maps");
const out = path.join(root, "client", "public", "maps");

const PAD = 28;
const GAP = 48;
const HEAD = 42;

async function rothold() {
  const dest = path.join(out, "rothold.webp");
  await sharp(path.join(tmp, "rothold.png"))
    .resize({ width: 4096, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(dest);
  const meta = await sharp(dest).metadata();
  console.log("rothold", meta.width, meta.height, meta.size);
}

async function midden() {
  const ground = path.join(tmp, "midden-ground.png");
  const base = path.join(tmp, "midden-base.png");
  const g = await sharp(ground).metadata();
  const b = await sharp(base).metadata();
  const width = PAD + g.width + GAP + b.width + PAD;
  const height = HEAD + Math.max(g.height, b.height) + PAD;
  const gx = PAD;
  const gy = HEAD;
  const bx = PAD + g.width + GAP;
  const by = HEAD;
  const svg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="${gx}" y="30" font-family="Arial, sans-serif" font-size="22" fill="#1c1c1c">Ground floor</text>
    <text x="${bx}" y="30" font-family="Arial, sans-serif" font-size="22" fill="#1c1c1c">Basement</text>
  </svg>`);
  const dest = path.join(out, "blind-midden.webp");
  await sharp({
    create: { width, height, channels: 3, background: { r: 150, g: 150, b: 150 } },
  })
    .composite([
      { input: ground, left: gx, top: gy },
      { input: base, left: bx, top: by },
      { input: svg, left: 0, top: 0 },
    ])
    .webp({ quality: 82 })
    .toFile(dest);
  const meta = await sharp(dest).metadata();
  const groundPin = { x: gx + 906, y: gy + 625 };
  const basePin = { x: bx + 307, y: by + 100 };
  console.log("midden", meta.width, meta.height, meta.size);
  console.log(
    "pins",
    (groundPin.x / width * 100).toFixed(2),
    (groundPin.y / height * 100).toFixed(2),
    (basePin.x / width * 100).toFixed(2),
    (basePin.y / height * 100).toFixed(2)
  );
}

(async () => {
  await rothold();
  await midden();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
