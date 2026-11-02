/**
 * Fetch every {{Quest}} page and write data/wiki-quests.json.
 * The hand-written steps in server/quests.js stay. publicQuests merges this file.
 *
 * Usage: node scripts/import-wiki-quests.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { atomicWriteJson } = require("../server/wiki-catalog-diff.js");
const { CACHE, parseQuestWikitext } = require("../server/wiki-quests.js");

const API = "https://monstersandmemories.miraheze.org/w/api.php";
const UA = "MMFinder/1.0 (personal atlas; wiki quest import)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiGet(params) {
  const url = new URL(API);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("format", "json");
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`Wiki API ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.info || "API error");
      return data;
    } catch (err) {
      lastErr = err;
      await sleep(400 * (attempt + 1));
    }
  }
  throw lastErr;
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

async function fetchPages(titles) {
  const pages = [];
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
      if (!/\{\{Quest\b/i.test(wikitext)) continue;
      pages.push(parseQuestWikitext(page.title, wikitext));
    }
    process.stdout.write(`\rFetched ${Math.min(i + batch.length, titles.length)}/${titles.length} quest pages`);
    await sleep(120);
  }
  process.stdout.write("\n");
  return pages;
}

async function main() {
  const titles = await templatePages("Template:Quest");
  console.log(`Listing ${titles.length} quest pages`);
  if (!titles.length) throw new Error("Wiki returned no quest pages");
  const quests = (await fetchPages(titles)).sort((a, b) => a.title.localeCompare(b.title));
  atomicWriteJson(CACHE, {
    importedAt: new Date().toISOString(),
    source: "Template:Quest",
    count: quests.length,
    quests,
  });
  const withNotes = quests.filter((quest) => quest.notes.length).length;
  console.log(`Wrote ${quests.length} quests (${withNotes} with steps) → ${CACHE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
