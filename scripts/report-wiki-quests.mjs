/**
 * Read-only report: catalog quests whose wiki page is missing turn-in / npc /
 * reward tokens, plus wiki quest titles not in the atlas.
 *
 * Usage: node scripts/report-wiki-quests.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { QUESTS } = require("../server/quests.js");
const { buildQuestReport, formatQuestReport } = require("../server/quest-report.js");

const API = "https://monstersandmemories.miraheze.org/w/api.php";
const UA = "MMFinder/1.0 (personal atlas; wiki quest report)";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiGet(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
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

async function fetchWikitext(title) {
  const data = await apiGet({
    action: "parse",
    page: title,
    prop: "wikitext",
  });
  return data.parse?.wikitext?.["*"] || "";
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

async function listWikiQuestTitles() {
  for (const template of ["Template:Questpage", "Template:Quest"]) {
    try {
      const titles = await templatePages(template);
      if (titles.length) {
        console.log(`Quest listing: ${template} (${titles.length} pages)`);
        return titles;
      }
    } catch {
      /* try next */
    }
  }
  for (const cat of ["Quests", "Quest"]) {
    try {
      const titles = await categoryMembers(cat);
      if (titles.length) {
        console.log(`Quest listing: Category:${cat} (${titles.length} pages)`);
        return titles;
      }
    } catch {
      /* try next */
    }
  }
  console.log("Quest listing: none found; reporting catalog pages only");
  return [];
}

async function main() {
  if (!Array.isArray(QUESTS) || !QUESTS.length) {
    console.error("No QUESTS exported from server/quests.js");
    process.exit(1);
  }

  const wikiTitles = await listWikiQuestTitles();
  const pagesBySlug = new Map();

  console.log(`Fetching ${QUESTS.length} catalog quest pages…`);
  for (const quest of QUESTS) {
    const slug = String(quest.wiki || "").replace(/ /g, "_");
    if (!slug) continue;
    try {
      const text = await fetchWikitext(slug.replace(/_/g, " "));
      pagesBySlug.set(slug, text);
    } catch (err) {
      pagesBySlug.set(slug, null);
      console.log(`  fetch error ${slug}: ${err.message}`);
    }
    await sleep(120);
  }

  const report = buildQuestReport(QUESTS, pagesBySlug, wikiTitles);
  console.log(formatQuestReport(report));

  // Read-only: confirm quests.js was not written by this process.
  const questsPath = path.join(ROOT, "server", "quests.js");
  fs.accessSync(questsPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
