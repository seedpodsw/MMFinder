/**
 * Pull in-game item hashes from the wiki items bucket.
 * Writes data/item-links.json, keyed by wiki page and by item name.
 * Usage: node scripts/fetch-item-links.js
 */
const fs = require("fs");
const path = require("path");

const API = "https://monstersandmemories.miraheze.org/w/api.php";
const OUT = path.join(__dirname, "..", "data", "item-links.json");
const LINK_ID = /^[0-9a-fA-F]{24}$/;

function cleanId(value) {
  if (Array.isArray(value)) value = value.find(Boolean);
  const id = String(value || "").trim();
  return LINK_ID.test(id) ? id.toLowerCase() : "";
}

function text(value) {
  if (Array.isArray(value)) value = value.find(Boolean);
  return String(value || "").trim();
}

async function query(offset) {
  const lua = `bucket('items').select('page_name','item_name','item_link_id').orderBy('page_name','asc').limit(5000).offset(${offset}).run()`;
  const url = new URL(API);
  url.searchParams.set("action", "bucket");
  url.searchParams.set("format", "json");
  url.searchParams.set("query", lua);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wiki bucket ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  return Array.isArray(data.bucket) ? data.bucket : [];
}

async function main() {
  const byPage = {};
  const nameIds = new Map();
  let offset = 0;
  let rows = 0;
  for (;;) {
    const page = await query(offset);
    if (!page.length) break;
    rows += page.length;
    for (const row of page) {
      const id = cleanId(row.item_link_id);
      if (!id) continue;
      const pageName = text(row.page_name).replace(/ /g, "_");
      const name = text(row.item_name).toLowerCase();
      if (pageName && !byPage[pageName]) byPage[pageName] = id;
      if (name) {
        if (!nameIds.has(name)) nameIds.set(name, new Set());
        nameIds.get(name).add(id);
      }
    }
    console.log(`Fetched ${rows} bucket rows`);
    if (page.length < 5000) break;
    offset += page.length;
  }

  const byName = {};
  for (const [name, ids] of nameIds) {
    if (ids.size === 1) byName[name] = [...ids][0];
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    pages: Object.keys(byPage).length,
    names: Object.keys(byName).length,
    byPage,
    byName,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload));
  console.log(`Wrote ${payload.pages} page hashes, ${payload.names} names → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
