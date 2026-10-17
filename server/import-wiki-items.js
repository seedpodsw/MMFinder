/**
 * Import items from the Monsters & Memories wiki into data/wiki-items.json.
 * Default source is every page that uses {{ItemBox}}. Category:Items is only
 * a parent category now; robes and blades live under Chest, Primary, and so on.
 * Usage: node server/import-wiki-items.js [--limit=200] [--categories=Chest,Primary]
 */
const fs = require("fs");
const path = require("path");
const { slugify, sourcesFromWikiItem, guessKind, WIKI_CACHE } = require("./items");

const API = "https://monstersandmemories.miraheze.org/w/api.php";
const ITEM_TEMPLATE = "Template:ItemBox";

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiGet(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("format", "json");
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    lastErr = new Error(`Wiki API ${res.status}`);
    await sleep(400 * (attempt + 1));
  }
  throw lastErr;
}

async function categoryMembers(title) {
  const members = [];
  let cont;
  do {
    const data = await apiGet({
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${title}`,
      cmlimit: "500",
      cmtype: "page",
      ...(cont ? { cmcontinue: cont } : {}),
    });
    for (const m of data.query?.categorymembers || []) {
      if (m.ns === 0) members.push(m.title);
    }
    cont = data.continue?.cmcontinue;
  } while (cont);
  return members;
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

async function templatePages(template) {
  const titles = [];
  let cont;
  do {
    const data = await apiGet({
      action: "query",
      list: "embeddedin",
      eititle: template,
      einamespace: "0",
      eilimit: "500",
      ...(cont ? { eicontinue: cont } : {}),
    });
    for (const row of data.query?.embeddedin || []) titles.push(row.title);
    cont = data.continue?.eicontinue;
  } while (cont);
  return titles;
}

/** Numeric / combat / flag fields from {{ItemBox}}. */
const BOX_STAT_FIELDS = [
  "ac",
  "dmg",
  "delay",
  "skill",
  "str",
  "sta",
  "agi",
  "dex",
  "int",
  "wis",
  "cha",
  "hp",
  "mana",
  "hp_regen",
  "mana_regen",
  "haste",
  "spell_haste",
  "ranged_haste",
  "cr",
  "cor",
  "dr",
  "er",
  "fr",
  "hr",
  "mr",
  "pr",
  "weight",
  "size",
  "class",
  "race",
  "magic",
  "unique",
  "nodrop",
  "norent",
  "handed",
  "effect",
  "effect1",
  "effect2",
  "effect3",
];

function pickBoxStats(box) {
  const out = {};
  for (const key of BOX_STAT_FIELDS) {
    const v = box[key];
    out[key] = v == null ? "" : String(v).trim();
  }
  return out;
}

async function fetchPages(titles) {
  const out = [];
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const data = await apiGet({
      action: "query",
      prop: "revisions|categories",
      rvprop: "content",
      rvslots: "main",
      cllimit: "500",
      titles: batch.join("|"),
    });
    const pages = data.query?.pages || {};
    for (const page of Object.values(pages)) {
      if (page.missing != null) continue;
      const wikitext = page.revisions?.[0]?.slots?.main?.["*"] || page.revisions?.[0]?.["*"] || "";
      const box = parseTemplate(wikitext, "ItemBox");
      const pageFields = parseTemplate(wikitext, "Itempage");
      const cats = (page.categories || []).map((c) => String(c.title || "").replace(/^Category:/, ""));
      const name = box.item_name || page.title;
      const stats = pickBoxStats(box);
      const raw = {
        id: slugify(name),
        name,
        wiki: page.title.replace(/ /g, "_"),
        slot: box.slot || "",
        notes: pageFields.notes || "",
        relatedquests: pageFields.relatedquests || "",
        dropsfrom: pageFields.dropsfrom || "",
        soldby: pageFields.soldby || "",
        playercrafted: pageFields.playercrafted || "",
        recipes: pageFields.recipes || "",
        categories: cats,
        item_link_id: String(box.item_link_id || "").trim(),
        ...stats,
      };
      raw.kind = guessKind(raw);
      raw.sources = sourcesFromWikiItem(raw);
      out.push(raw);
    }
    process.stdout.write(`\rFetched ${Math.min(i + batch.length, titles.length)}/${titles.length} pages`);
    await sleep(120);
  }
  process.stdout.write("\n");
  return out;
}

async function main() {
  const limit = Number(arg("limit", "0")) || 0;
  const catArg = String(arg("categories", "")).trim();
  const titles = new Map();

  if (catArg) {
    const cats = catArg
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    console.log(`Listing wiki categories: ${cats.join(", ")}`);
    for (const cat of cats) {
      const members = await categoryMembers(cat);
      console.log(`  ${cat}: ${members.length}`);
      for (const t of members) {
        if (!titles.has(t)) titles.set(t, new Set());
        titles.get(t).add(cat);
      }
    }
  } else {
    console.log(`Listing pages that use ${ITEM_TEMPLATE}`);
    for (const title of await templatePages(ITEM_TEMPLATE)) titles.set(title, new Set());
    console.log(`  ${titles.size} item pages`);
  }

  const removed = new Set(await categoryMembers("Removed Items"));
  if (removed.size) console.log(`Skipping ${removed.size} removed items`);
  let list = [...titles.keys()].filter((title) => !removed.has(title)).sort((a, b) => a.localeCompare(b));
  if (limit > 0) list = list.slice(0, limit);
  console.log(`Importing ${list.length} item pages…`);

  const items = await fetchPages(list);
  for (const item of items) {
    const fromList = titles.get(item.name) || titles.get(item.wiki?.replace(/_/g, " "));
    if (fromList?.size) {
      item.categories = [...new Set([...(item.categories || []), ...fromList])];
    }
    item.kind = guessKind(item);
  }
  const kinds = {};
  for (const item of items) kinds[item.kind] = (kinds[item.kind] || 0) + 1;
  console.log("Kinds:", kinds);
  const payload = {
    importedAt: new Date().toISOString(),
    source: catArg ? catArg : ITEM_TEMPLATE,
    count: items.length,
    items,
  };
  const dir = path.dirname(WIKI_CACHE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${WIKI_CACHE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
  fs.renameSync(tmp, WIKI_CACHE);
  console.log(`Wrote ${items.length} items → ${WIKI_CACHE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
