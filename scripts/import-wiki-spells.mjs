/**
 * Fetch class spell/ability lists from the Monsters & Memories wiki and write
 * data/spells/. Tags and effects use FuStv1337's classifiers for new/changed
 * descriptions; unchanged descriptions keep existing tags, effects, and cast time.
 *
 * Usage: node scripts/import-wiki-spells.mjs [--force-retag]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enrichEntry } from "./lib/spell-tag/enrich-entry.mjs";
import { ALL_TAGS } from "./lib/spell-tag/classify-spell.mjs";
import {
  parseClassWikitext,
  spellSlug,
  spellWikiUrl,
} from "../shared/spell-wiki.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPELLS_DIR = path.join(ROOT, "data", "spells");
const CLASSES_DIR = path.join(SPELLS_DIR, "classes");
const API = "https://monstersandmemories.miraheze.org/w/api.php";
const SOURCE = "https://monstersandmemories.miraheze.org/wiki/Spells_By_Class";
const UA = "MMFinder/1.0 (personal atlas; wiki spell import)";

const FORCE_RETAG = process.argv.includes("--force-retag");

const CLASS_PAGES = [
  "Archer",
  "Bard",
  "Beastmaster",
  "Cleric",
  "Druid",
  "Elementalist",
  "Enchanter",
  "Fighter",
  "Inquisitor",
  "Monk",
  "Necromancer",
  "Paladin",
  "Ranger",
  "Rogue",
  "Shadow_Knight",
  "Shaman",
  "Spellblade",
  "Wizard",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normDesc(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function fileId(className) {
  return className.toLowerCase().replace(/_/g, " ").replace(/ /g, "-");
}

function displayName(page) {
  return page.replace(/_/g, " ");
}

async function fetchWikitext(page) {
  const url = new URL(API);
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", page);
  url.searchParams.set("prop", "wikitext");
  url.searchParams.set("format", "json");
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`Wiki API ${res.status} for ${page}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.info || `API error for ${page}`);
      return data.parse.wikitext["*"];
    } catch (err) {
      lastErr = err;
      await sleep(400 * (attempt + 1));
    }
  }
  throw lastErr;
}

function loadExistingMap(classData) {
  const byKey = new Map();
  const byName = new Map();
  for (const entry of classData?.entries || []) {
    const nameKey = String(entry.name || "").toLowerCase();
    const key = `${entry.level}::${nameKey}`;
    byKey.set(key, entry);
    if (!byName.has(nameKey)) byName.set(nameKey, []);
    byName.get(nameKey).push(entry);
  }
  return { byKey, byName };
}

function findPrior(row, existing) {
  const nameKey = row.name.toLowerCase();
  const exact = existing.byKey.get(`${row.level}::${nameKey}`);
  if (exact) return exact;
  const sameName = existing.byName.get(nameKey) || [];
  if (sameName.length === 1) return sameName[0];
  return sameName.find((entry) => entry.level === row.level) || null;
}

function buildEntry(row, className, type, prior) {
  const base = {
    name: row.name,
    slug: spellSlug(row.name),
    wikiUrl: spellWikiUrl(row.name),
    description: row.description,
    category: row.category,
    categorySlug: row.categorySlug,
    categoryUrl: row.categoryUrl,
    location: row.location,
    mana: row.mana,
    castTime: prior?.castTime ?? null,
    level: row.level,
    type,
  };

  const priorDesc = normDesc(prior?.description);
  const nextDesc = normDesc(row.description);
  const sameDesc = !FORCE_RETAG && prior && priorDesc === nextDesc;

  if (
    sameDesc &&
    Array.isArray(prior.tags) &&
    (prior.primaryTag !== undefined || prior.tags.length === 0)
  ) {
    return {
      ...base,
      tags: prior.tags,
      primaryTag: prior.primaryTag ?? null,
      effects: prior.effects || [],
      valuesSummary: prior.valuesSummary || "",
      statTags: prior.statTags || [],
    };
  }

  return enrichEntry(base, className);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function entryKey(entry) {
  return `${entry.level}::${String(entry.name || "").toLowerCase()}`;
}

function diffSpellEntries(previousEntries, nextEntries) {
  const prev = new Map((previousEntries || []).map((e) => [entryKey(e), e]));
  const next = new Map((nextEntries || []).map((e) => [entryKey(e), e]));
  const added = [];
  const changed = [];
  const removed = [];
  for (const [key, entry] of next) {
    if (!prev.has(key)) {
      added.push(entry.name);
      continue;
    }
    const prior = prev.get(key);
    const fields = ["description", "category", "location", "mana", "level", "type"];
    const same = fields.every((f) => String(prior[f] ?? "") === String(entry[f] ?? ""));
    if (!same) changed.push(entry.name);
  }
  for (const [key, entry] of prev) {
    if (!next.has(key)) removed.push(entry.name);
  }
  added.sort((a, b) => a.localeCompare(b));
  changed.sort((a, b) => a.localeCompare(b));
  removed.sort((a, b) => a.localeCompare(b));
  return { added, changed, removed };
}

async function listIndexClassPages() {
  try {
    const wikitext = await fetchWikitext("Spells_By_Class");
    const names = new Set();
    for (const match of wikitext.matchAll(/\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]/g)) {
      const title = match[1].replace(/_/g, " ").trim();
      if (title && !title.includes(":")) names.add(title.replace(/ /g, "_"));
    }
    return [...names];
  } catch {
    return [];
  }
}

async function importClass(page) {
  const className = displayName(page);
  const id = fileId(page);
  const filePath = path.join(CLASSES_DIR, `${id}.json`);
  const previous = await readJson(filePath);
  const existing = loadExistingMap(previous);

  const wikitext = await fetchWikitext(page);
  const parsed = parseClassWikitext(wikitext);
  const entries = parsed.rows.map((row) =>
    buildEntry(row, className, parsed.type, findPrior(row, existing))
  );

  const entriesByLevel = {};
  for (const entry of entries) {
    const key = String(entry.level);
    if (!entriesByLevel[key]) entriesByLevel[key] = [];
    entriesByLevel[key].push(entry);
  }

  const levels = Object.keys(entriesByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  const sectionTitle =
    parsed.sectionTitle ||
    previous?.sectionTitle ||
    `${className} ${parsed.type === "ability" ? "Abilities" : "Spells"}`;

  const classData = {
    className,
    slug: page,
    type: parsed.type,
    sectionTitle,
    wikiUrl: `https://monstersandmemories.miraheze.org/wiki/${page}`,
    entryCount: entries.length,
    levels,
    entriesByLevel,
    entries,
  };

  const diff = diffSpellEntries(previous?.entries || [], entries);
  console.log(
    ` ${entries.length} (was ${previous?.entryCount ?? 0}; added ${diff.added.length}, changed ${diff.changed.length}, removed ${diff.removed.length})`
  );
  if (diff.added.length) console.log(`    Added: ${diff.added.join(", ")}`);
  if (diff.changed.length) console.log(`    Changed: ${diff.changed.join(", ")}`);
  if (diff.removed.length) console.log(`    Removed: ${diff.removed.join(", ")}`);

  await writeJson(filePath, classData);

  let kept = 0;
  if (!FORCE_RETAG) {
    for (const row of parsed.rows) {
      const prior = findPrior(row, existing);
      if (prior && normDesc(prior.description) === normDesc(row.description)) kept++;
    }
  }

  return {
    index: {
      name: className,
      slug: page,
      file: `classes/${id}.json`,
      type: parsed.type,
      wikiUrl: classData.wikiUrl,
      entryCount: entries.length,
      levels,
    },
    stats: {
      className,
      total: entries.length,
      kept,
      enriched: entries.length - kept,
      previous: previous?.entryCount ?? 0,
      diff,
    },
  };
}

async function main() {
  await fs.mkdir(CLASSES_DIR, { recursive: true });
  console.log(`Fetching ${CLASS_PAGES.length} class pages from wiki...`);

  const known = new Set(CLASS_PAGES);
  const indexPages = await listIndexClassPages();
  const unknown = indexPages.filter((page) => !known.has(page) && !known.has(page.replace(/ /g, "_")));
  if (unknown.length) {
    console.log(
      `Spells index names class pages outside CLASS_PAGES (not imported): ${unknown.join(", ")}`
    );
  }

  const classes = [];
  const stats = [];
  const unique = new Set();

  for (const page of CLASS_PAGES) {
    process.stdout.write(`  ${displayName(page)}...`);
    const result = await importClass(page);
    classes.push(result.index);
    stats.push(result.stats);
    console.log(`    kept tags ${result.stats.kept}, retagged ${result.stats.enriched}`);
    await sleep(250);
  }

  for (const item of classes) {
    const data = await readJson(path.join(SPELLS_DIR, item.file));
    for (const entry of data.entries) {
      unique.add(entry.slug || entry.name);
    }
  }

  const fetchedAt = new Date().toISOString();
  const meta = {
    source: SOURCE,
    fetchedAt,
    classCount: classes.length,
    totalEntries: classes.reduce((sum, item) => sum + item.entryCount, 0),
    uniqueEntries: unique.size,
    tags: ALL_TAGS,
    taggedAt: fetchedAt,
  };

  await writeJson(path.join(SPELLS_DIR, "meta.json"), meta);
  await writeJson(path.join(SPELLS_DIR, "index.json"), { meta, classes });

  console.log("\nDone.");
  console.log(`  Classes: ${meta.classCount}`);
  console.log(`  Total entries: ${meta.totalEntries}`);
  console.log(`  Unique: ${meta.uniqueEntries}`);
  console.log(`  Output: ${SPELLS_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
