/**
 * Fetch Namedmobpage levels for mobs that drop wiki items, plus any other
 * Namedmobpage that is not already named as a drop.
 * Usage: node server/import-wiki-mobs.js [--limit=100]
 */
const fs = require("fs");
const path = require("path");
const { slugify, collectDropMobTitles, MOB_CACHE, loadWikiCache, knownLootFromWikitext } = require("./items");

const API = "https://monstersandmemories.miraheze.org/w/api.php";

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

async function apiGet(params, attempt = 0) {
  const url = new URL(API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    return apiGet(params, attempt + 1);
  }
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
        loot: knownLootFromWikitext(wikitext),
      });
    }
    process.stdout.write(`\rFetched ${Math.min(i + batch.length, titles.length)}/${titles.length} mob pages`);
  }
  process.stdout.write("\n");
  return out;
}

async function namedMobTitles() {
  const titles = [];
  let cont;
  do {
    const data = await apiGet({
      action: "query",
      list: "embeddedin",
      eititle: "Template:Namedmobpage",
      einamespace: "0",
      eilimit: "500",
      ...(cont ? { eicontinue: cont } : {}),
    });
    for (const row of data.query?.embeddedin || []) titles.push(row.title);
    cont = data.continue?.eicontinue;
  } while (cont);
  return titles;
}

async function fetchKnownLoot(titles) {
  const byTitle = new Map();
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
      if (page.missing != null || !page.title) continue;
      const wikitext = page.revisions?.[0]?.slots?.main?.["*"] || page.revisions?.[0]?.["*"] || "";
      const loot = knownLootFromWikitext(wikitext);
      byTitle.set(page.title, loot);
      byTitle.set(slugify(page.title), loot);
    }
    process.stdout.write(`\rLoot ${Math.min(i + batch.length, titles.length)}/${titles.length}`);
  }
  process.stdout.write("\n");
  return byTitle;
}

/** Add known_loot onto the mob cache without rewriting levels or locations. */
async function mergeLoot() {
  const raw = JSON.parse(fs.readFileSync(MOB_CACHE, "utf8"));
  const mobs = Array.isArray(raw.mobs) ? raw.mobs : [];
  const titles = [...new Set(mobs.map((mob) => String(mob?.name || "").trim()).filter(Boolean))];
  console.log(`Reading known loot for ${titles.length} mob pages…`);
  const byTitle = await fetchKnownLoot(titles);
  let withLoot = 0;
  for (const mob of mobs) {
    const loot = byTitle.get(mob.name) || byTitle.get(slugify(mob.name));
    if (!loot) continue;
    if (loot.length) {
      mob.loot = loot;
      withLoot++;
    } else delete mob.loot;
  }
  raw.importedAt = new Date().toISOString();
  fs.writeFileSync(MOB_CACHE, JSON.stringify(raw, null, 2));
  console.log(`Wrote loot for ${withLoot} mobs → ${MOB_CACHE}`);
}

async function main() {
  if (process.argv.includes("--merge-loot")) {
    await mergeLoot();
    return;
  }
  const limit = Number(arg("limit", "0")) || 0;
  const titles = new Set(collectDropMobTitles(loadWikiCache()));
  const named = await namedMobTitles();
  for (const title of named) titles.add(title);
  let list = [...titles]
    .map((title) => String(title || "").trim())
    .filter((title) => title && title.length <= 180 && !/[|\n\r<>{}]/.test(title) && !/^[*#/]/.test(title))
    .sort((a, b) => a.localeCompare(b));
  if (limit > 0) list = list.slice(0, limit);
  console.log(`Importing ${list.length} mob pages (${named.length} Namedmobpage)…`);
  const mobs = await fetchMobPages(list);
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
