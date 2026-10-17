/**
 * Refresh data/merchant-buys.json from {{Merchantpage}} buys lists.
 * Usage: node server/import-wiki-merchants.js
 */
const fs = require("fs");
const { BUYS_PATH, cleanMerchant } = require("./vendors");
const { diffCatalog, printCatalogDiff, atomicWriteJson } = require("./wiki-catalog-diff");

const API = "https://monstersandmemories.miraheze.org/w/api.php";

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
    } else if (key) buf.push(line);
  }
  flush();
  return fields;
}

async function apiGet(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("format", "json");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wiki API ${res.status}`);
  return res.json();
}

async function merchantTitles() {
  const titles = [];
  let cont;
  do {
    const data = await apiGet({
      action: "query",
      list: "embeddedin",
      eititle: "Template:Merchantpage",
      einamespace: "0",
      eilimit: "500",
      ...(cont ? { eicontinue: cont } : {}),
    });
    for (const row of data.query?.embeddedin || []) titles.push(row.title);
    cont = data.continue?.eicontinue;
  } while (cont);
  return titles;
}

async function main() {
  const titles = await merchantTitles();
  console.log(`Fetching ${titles.length} merchant pages…`);
  const fresh = [];
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
      const wikitext = page.revisions?.[0]?.slots?.main?.["*"] || "";
      const box = parseTemplate(wikitext, "Merchantpage");
      const merchant = cleanMerchant({
        title: page.title,
        zone: box.zone || "",
        location: box.location || "",
        buys: box.buys || "",
      });
      if (merchant) fresh.push(merchant);
    }
  }

  const prior = fs.existsSync(BUYS_PATH) ? JSON.parse(fs.readFileSync(BUYS_PATH, "utf8")) : { merchants: [] };
  const previous = Array.isArray(prior.merchants) ? prior.merchants : [];
  const byName = new Map(fresh.map((merchant) => [merchant.name, merchant]));
  const kept = previous.filter((merchant) => byName.has(merchant.name)).map((merchant) => byName.get(merchant.name));
  const seen = new Set(kept.map((merchant) => merchant.name));
  const appended = fresh.filter((merchant) => !seen.has(merchant.name)).sort((a, b) => a.name.localeCompare(b.name));
  const merchants = [...kept, ...appended];
  const diff = diffCatalog(previous, merchants, {
    keyFn: (row) => String(row?.name || "").trim(),
    nameFn: (row) => row.name,
  });
  printCatalogDiff("Merchants", diff);
  const payload = {
    importedAt: new Date().toISOString(),
    count: merchants.length,
    merchants,
  };
  atomicWriteJson(BUYS_PATH, payload);
  console.log(`Wrote ${merchants.length} merchants → ${BUYS_PATH}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
