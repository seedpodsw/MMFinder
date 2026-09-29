/**
 * Resize wiki mob portraits for the Who's that round.
 * Usage: node scripts/download-who.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const MOBS = path.join(ROOT, "data", "wiki-mobs.json");
const INDEX = path.join(ROOT, "data", "who-index.json");
const OUT = path.join(ROOT, "client", "public", "who");

function plain(value) {
  return String(value || "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{\{[^}]*\}\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchBuf(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "MMFinder/1.0 (personal atlas)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function mapPool(items, limit, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, run));
  return out;
}

async function main() {
  const mobs = JSON.parse(fs.readFileSync(MOBS, "utf8")).mobs;
  const byTitle = new Map(mobs.map((mob) => [mob.name.toLowerCase(), mob]));
  const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  fs.mkdirSync(OUT, { recursive: true });

  const creatures = [];
  let skipped = 0;
  await mapPool(index, 8, async (row) => {
    const mob = byTitle.get(String(row.title || "").toLowerCase());
    if (!mob) {
      skipped++;
      return;
    }
    const src = String(row.src || "");
    const w = Number(row.w) || 0;
    const h = Number(row.h) || 0;
    if (Math.max(w, h) < 48 || /placeholder\.png|wikimedia\.org/i.test(src)) {
      skipped++;
      return;
    }
    const dest = path.join(OUT, `${mob.id}.webp`);
    try {
      const buf = await fetchBuf(row.src);
      await sharp(buf)
        .rotate()
        .resize(360, 360, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, alphaQuality: 100 })
        .toFile(dest);
      creatures.push({
        id: mob.id,
        name: mob.name,
        race: plain(mob.race),
        zone: plain(mob.zone),
        level: plain(mob.level),
        wiki: mob.wiki,
        file: `${mob.id}.webp`,
      });
      process.stdout.write(`\r${creatures.length} saved`);
    } catch (err) {
      skipped++;
      process.stderr.write(`\nskip ${mob.name}: ${err.message}\n`);
    }
  });

  const seen = new Set();
  const unique = [];
  for (const creature of creatures) {
    if (seen.has(creature.id)) continue;
    seen.add(creature.id);
    unique.push(creature);
  }
  unique.sort((a, b) => a.name.localeCompare(b.name));
  const manifest = { count: unique.length, creatures: unique };
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest));
  console.log(`\nWrote ${creatures.length} portraits, skipped ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
