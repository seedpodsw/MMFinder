const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { zoneMaps, worldMaps, thumbUrl, assetName, ART_LONG } = require("../server/maps");

const outDir = path.join(__dirname, "..", "client", "public", "maps");
fs.mkdirSync(outDir, { recursive: true });

const UA = "MMFinder/1.0 (personal Monsters & Memories atlas; local use)";
const API = "https://monstersandmemories.miraheze.org/w/api.php";
const MAX_EDGE = ART_LONG;
const WEBP_QUALITY = 72;

async function imageInfo(names) {
  const out = new Map();
  for (let i = 0; i < names.length; i += 10) {
    const titles = names
      .slice(i, i + 10)
      .map((n) => `File:${n}`)
      .join("|");
    const url = `${API}?action=query&prop=imageinfo&iiprop=url|size|mime&format=json&titles=${encodeURIComponent(titles)}`;
    const json = await fetch(url, { headers: { "User-Agent": UA } }).then((r) => r.json());
    for (const page of Object.values(json.query.pages)) {
      const info = page.imageinfo?.[0];
      const name = String(page.title || "").replace(/^File:/, "");
      if (info) out.set(name, info);
    }
  }
  return out;
}

async function fetchBytes(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*" }, redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const type = res.headers.get("content-type") || "";
  if (!type.includes("image") && !type.includes("octet-stream")) {
    throw new Error(`not an image (${type}) ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error(`too small (${buf.length}) ${url}`);
  return buf;
}

async function writeWebp(buf, dest) {
  const out = await sharp(buf, { limitInputPixels: false, animated: false })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
  fs.writeFileSync(dest, out);
  const base = dest.slice(0, dest.lastIndexOf("."));
  for (const ext of [".png", ".jpg", ".jpeg"]) {
    const stale = base + ext;
    if (stale !== dest && fs.existsSync(stale)) fs.rmSync(stale);
  }
  return { kb: Math.round(out.length / 1024), fromKb: Math.round(buf.length / 1024) };
}

async function saveCompressed(url, dest) {
  const buf = await fetchBytes(url);
  return writeWebp(buf, dest);
}

(async () => {
  const infos = await imageInfo([
    ...worldMaps.map((m) => m.wikiFile),
    ...Object.values(zoneMaps).map((z) => z.wikiFile).filter(Boolean),
  ]);

  console.log(`Wiki map art → WebP ≤${MAX_EDGE}px q${WEBP_QUALITY} in ${outDir}`);

  async function pull(wikiFile, destName, fallbackUrl) {
    const dest = path.join(outDir, destName);
    const info = wikiFile ? infos.get(wikiFile) : null;
    const thumb = wikiFile ? thumbUrl(wikiFile, MAX_EDGE) : null;
    const original = info?.url || fallbackUrl;
    try {
      const r = await saveCompressed(thumb || original, dest);
      console.log("ok", destName, `${r.fromKb}kb → ${r.kb}kb`);
      return;
    } catch (err) {
      if (!original || original === thumb) {
        console.error("FAIL", destName, err.message);
        return;
      }
      try {
        const r = await saveCompressed(original, dest);
        console.log("ok", destName, `${r.fromKb}kb → ${r.kb}kb`, "original");
      } catch (err2) {
        console.error("FAIL", destName, err2.message);
      }
    }
  }

  for (const m of worldMaps) {
    await pull(m.wikiFile, assetName(m.file), null);
  }
  for (const z of Object.values(zoneMaps)) {
    if (!z.wikiFile) continue;
    await pull(z.wikiFile, assetName(z.file), null);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
