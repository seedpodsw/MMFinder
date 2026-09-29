/**
 * Fetch Namedmobpage levels for mobs that drop wiki items.
 * Usage: node server/import-wiki-mobs.js [--limit=100]
 */
const fs = require("fs");
const path = require("path");
const { slugify, collectDropMobTitles, MOB_CACHE, loadWikiCache } = require("./items");

const API = "https://monstersandmemories.miraheze.org/w/api.php";

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

async function apiGet(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wiki API ${res.status}`);
  return res.json();
}

function parseTemplate(wikitext, name) {
  const start = wikitext.indexOf(`{{${name}`);
  if (start < 0) return {};
  let i = start + 2 + name.length;
  let depth = 1;
  let end = -1;
  while (i < wikitext.length) {
    if (wikitext.startsWith("{{", i)) {
      depth++;
      i += 2;
      continue;
    }
    if (wikitext.startsWith("}}", i)) {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
      i += 2;
      continue;
    }
    i++;
  }
  if (end < 0) return {};
  const body = wikitext.slice(start + 2 + name.length, end);
  const fields = {};
  let key = null;
  let buf = [];
  const flush = () => {
    if (!key) return;
    fields[key] = buf.join("\n").trim();
    key = null;
    buf = [];
  };
  for (const line of body.split("\n")) {
    const m = line.match(/^\|\s*([a-z0-9_]+)\s*=\s*(.*)$/i);
    if (m) {
      flush();
      key = m[1].toLowerCase();
      buf = [m[2]];
    } else if (key) {
      buf.push(line);
    }
  }
  flush();
  return fields;
}

async function fetchMobPages(titles) {
  const out = [];
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const data = await apiGet({
      action: "query",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      titles: batch.join("|"),
    });
    for (const page of Object.values(data.query?.pages || {})) {
      if (page.missing != null) continue;
      const wikitext = page.revisions?.[0]?.slots?.main?.["*"] || page.revisions?.[0]?.["*"] || "";
      const box = parseTemplate(wikitext, "Namedmobpage");
      if (!Object.keys(box).length) continue;
      out.push({
        id: slugify(page.title),
        name: page.title,
        wiki: page.title.replace(/ /g, "_"),
        level: box.level || "",
        race: box.race || "",
        zone: box.zone || "",
        location: box.location || "",
        description: box.description || "",
        hp: box.hp || "",
      });
    }
    process.stdout.write(`\rFetched ${Math.min(i + batch.length, titles.length)}/${titles.length} mob pages`);
  }
  process.stdout.write("\n");
  return out;
}

async function main() {
  const limit = Number(arg("limit", "0")) || 0;
  let titles = collectDropMobTitles(loadWikiCache());
  if (limit > 0) titles = titles.slice(0, limit);
  console.log(`Importing ${titles.length} drop mobs from wiki…`);
  const mobs = await fetchMobPages(titles);
  const payload = {
    importedAt: new Date().toISOString(),
    count: mobs.length,
    mobs,
  };
  const dir = path.dirname(MOB_CACHE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MOB_CACHE, JSON.stringify(payload, null, 2));
  const withLevel = mobs.filter((m) => m.level).length;
  console.log(`Wrote ${mobs.length} mobs (${withLevel} with level) → ${MOB_CACHE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
