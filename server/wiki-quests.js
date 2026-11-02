/** Wiki {{Quest}} pages: parse, load, and merge onto the hand-written catalog. */

const fs = require("fs");
const path = require("path");
const { zones } = require("./world");

const CACHE = path.join(__dirname, "..", "data", "wiki-quests.json");

const CLASS_BY_NAME = {
  archer: "archer",
  bard: "bard",
  beastmaster: "beastmaster",
  cleric: "cleric",
  druid: "druid",
  elementalist: "elementalist",
  enchanter: "enchanter",
  fighter: "fighter",
  inquisitor: "inquisitor",
  monk: "monk",
  necromancer: "necromancer",
  paladin: "paladin",
  ranger: "ranger",
  rogue: "rogue",
  "shadow knight": "shadow-knight",
  shaman: "shaman",
  spellblade: "spellblade",
  wizard: "wizard",
};

function plain(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[([^\]|#]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]|#]+)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/\{\{[^{}]*\}\}/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function norm(value) {
  return plain(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sliceTemplate(wikitext, name) {
  const re = new RegExp(`\\{\\{${name}\\b`, "i");
  const start = String(wikitext || "").search(re);
  if (start < 0) return "";
  let depth = 0;
  for (let i = start; i < wikitext.length - 1; i++) {
    if (wikitext.startsWith("{{", i)) {
      depth++;
      i++;
      continue;
    }
    if (wikitext.startsWith("}}", i)) {
      depth--;
      if (depth === 0) return wikitext.slice(start, i + 2);
      i++;
    }
  }
  return "";
}

function templateFields(body) {
  const fields = {};
  const inner = body.replace(/^\{\{[^{}|]+/, "").replace(/\}\}$/, "");
  let key = null;
  let buf = [];
  const flush = () => {
    if (!key) return;
    fields[key] = buf.join("\n").trim();
    key = null;
    buf = [];
  };
  for (const line of inner.split("\n")) {
    const match = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/);
    if (match) {
      flush();
      key = match[1].trim().toLowerCase();
      buf = [match[2]];
    } else if (key) {
      buf.push(line);
    }
  }
  flush();
  return fields;
}

function allTemplates(wikitext, name) {
  const out = [];
  const re = new RegExp(`\\{\\{${name}\\b`, "gi");
  let match;
  const text = String(wikitext || "");
  while ((match = re.exec(text))) {
    const body = sliceTemplate(text.slice(match.index), name);
    if (!body) continue;
    out.push(body);
    re.lastIndex = match.index + body.length;
  }
  return out;
}

function section(wikitext, heading) {
  const text = String(wikitext || "");
  const start = text.search(new RegExp(`^==\\s*${heading}\\s*==\\s*$`, "im"));
  if (start < 0) return "";
  const rest = text.slice(start);
  const next = rest.slice(1).search(/^==[^=]/m);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

function wikiLinks(value) {
  const names = [];
  const re = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;
  let match;
  while ((match = re.exec(String(value || "")))) {
    const label = plain(match[2] || match[1]);
    if (label && !names.some((name) => name.toLowerCase() === label.toLowerCase())) names.push(label);
  }
  return names;
}

function cleanReward(name) {
  let text = plain(name).replace(/^\*+\s*/, "").trim();
  text = text.replace(/,?\s*\d+\s*$/, "").replace(/^\d+\s*[x×]\s+/i, "").trim();
  if (!text || text === "-" || text === "?" || /^placeholder/i.test(text)) return "";
  if (/^\(?\s*exp(erience)?\s*\)?$/i.test(text)) return "Experience";
  if (/money\s*:/i.test(text) || /^\(?\s*money\b/i.test(text)) return "Coin";
  if (text.startsWith("(") || text.length > 80) return "";
  return text;
}

function personName(raw) {
  const text = plain(raw);
  if (!text || text === "?" || text === "-" || /^none$/i.test(text) || text.length > 80) return "";
  return text;
}

function classIdsFrom(raw) {
  const text = plain(raw);
  if (!text || text === "-" || /^all(classes)?$/i.test(text)) return ["all"];
  const ids = [];
  for (const part of text.split(/[,;/]+/)) {
    const id = CLASS_BY_NAME[norm(part)];
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids.length ? ids : ["all"];
}

function levelFrom(raw) {
  const match = String(raw || "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function giverFrom(raw) {
  const text = plain(raw);
  if (!text || text === "-" || /^none$/i.test(text)) return "";
  return text;
}

const zoneNames = zones
  .map((zone) => ({ id: zone.id, name: zone.name, n: norm(zone.name) }))
  .filter((zone) => zone.n.length >= 4)
  .sort((a, b) => b.n.length - a.n.length);

function zoneFor(raw) {
  const text = norm(raw);
  if (!text) return { zoneId: "", city: "" };
  for (const zone of zoneNames) {
    if (text.includes(zone.n)) return { zoneId: zone.id, city: zone.name };
  }
  for (const zone of zoneNames) {
    if (text.length >= 8 && (zone.n === text || zone.n.endsWith(` ${text}`))) {
      return { zoneId: zone.id, city: zone.name };
    }
  }
  return { zoneId: "", city: plain(raw) };
}

function instructionLines(wikitext) {
  const notes = [];
  for (const body of allTemplates(wikitext, "QuestNote")) {
    const inner = body.replace(/^\{\{QuestNote\s*\|/i, "").replace(/\}\}$/, "");
    const text = plain(inner);
    if (text.length >= 8) notes.push(text);
  }
  if (notes.length) return notes.slice(0, 12);
  for (const match of String(wikitext || "").matchAll(/'''([^']{12,280})'''/g)) {
    const text = plain(match[1]);
    if (/^(head|hand|kill|gather|collect|bring|combine|return|speak|hail|give|loot|hunt|deliver|read|go|take|ask)\b/i.test(text)) {
      notes.push(text);
    }
  }
  return notes.slice(0, 12);
}

function factionsFrom(wikitext) {
  const names = [];
  const re = /faction(?:\s+gained)?\s+with\s+\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/gi;
  let match;
  while ((match = re.exec(String(wikitext || "")))) {
    const name = personName(match[2] || match[1]);
    if (name && !names.some((have) => have.toLowerCase() === name.toLowerCase())) names.push(name);
  }
  return names.map((name) => `${name} faction`);
}

function parseQuestWikitext(title, wikitext) {
  const pageTitle = plain(title).replace(/_/g, " ");
  const box = templateFields(sliceTemplate(wikitext, "Quest") || "");
  const rewardBits = [
    ...wikiLinks(box["quest rewards"] || ""),
    ...String(box["quest rewards"] || "")
      .split(/[;\n]/)
      .map(cleanReward),
    ...wikiLinks(section(wikitext, "Reward")),
    ...factionsFrom(wikitext),
  ];
  const rewards = [];
  for (const reward of rewardBits) {
    const text = cleanReward(reward);
    if (!text) continue;
    if (!rewards.some((have) => have.toLowerCase() === text.toLowerCase())) rewards.push(text);
  }
  const giver = giverFrom(box["quest giver"]);
  const place = zoneFor(box["start zone"]);
  return {
    title: pageTitle,
    wiki: pageTitle.replace(/ /g, "_"),
    giver,
    npcs: wikiLinks(box["related npcs"] || "")
      .map(personName)
      .filter((name) => name && name !== giver),
    levelMin: levelFrom(box["minimum level"]),
    classIds: classIdsFrom(box.classes),
    zoneId: place.zoneId,
    city: place.city,
    rewards,
    repeatable: /this quest is repeatable/i.test(wikitext),
    notes: instructionLines(wikitext),
  };
}

function loadWikiQuests() {
  try {
    if (!fs.existsSync(CACHE)) return [];
    const data = JSON.parse(fs.readFileSync(CACHE, "utf8"));
    return Array.isArray(data.quests) ? data.quests : [];
  } catch {
    return [];
  }
}

function uniqueRewards(list) {
  const out = [];
  for (const reward of list || []) {
    const text = cleanReward(reward);
    if (!text) continue;
    if (!out.some((have) => have.toLowerCase() === text.toLowerCase())) out.push(text);
  }
  return out;
}

function mergeRewards(existing, incoming) {
  const out = uniqueRewards(existing);
  for (const reward of uniqueRewards(incoming)) {
    const key = norm(reward).replace(/ faction$/, "");
    const covered = out.some((have) => {
      const text = norm(have);
      if (text === norm(reward)) return true;
      if (/faction$/i.test(reward) && /faction/i.test(have) && key && text.includes(key.split(" ").slice(0, 2).join(" "))) {
        return true;
      }
      if (norm(reward) === "experience" && /\bexperience\b/.test(text)) return true;
      return false;
    });
    if (!covered) out.push(reward);
  }
  return out;
}

function kindFor(title) {
  if (/starter/i.test(title)) return "class";
  if (/armor/i.test(title)) return "armor";
  return "turnin";
}

function applyWikiFacts(quest, wiki) {
  const stepsText = norm((quest.steps || []).map((step) => `${step.action || ""} ${step.turnIn || ""} ${step.reward || ""}`).join(" "));
  const wikiNotes = (wiki.notes || []).filter((note) => {
    const key = norm(note);
    return key && !stepsText.includes(key);
  });
  const giver = wiki.giver && wiki.giver !== "-" ? wiki.giver : "";
  return {
    ...quest,
    levelMin: Number.isFinite(wiki.levelMin) ? wiki.levelMin : quest.levelMin,
    repeatable: Boolean(quest.repeatable || wiki.repeatable),
    rewards: mergeRewards(quest.rewards, wiki.rewards),
    npc: quest.npc && quest.npc !== "-" ? quest.npc : giver || quest.npc,
    zoneId: quest.zoneId || wiki.zoneId || "",
    city: quest.city || wiki.city || "",
    wikiNotes,
  };
}

function questFromWiki(wiki, id) {
  const level = Number.isFinite(wiki.levelMin) ? wiki.levelMin : 1;
  const notes = wiki.notes?.length ? wiki.notes : ["Walkthrough is on the wiki."];
  return {
    id,
    title: wiki.title,
    wiki: wiki.wiki,
    kind: kindFor(wiki.title),
    classIds: wiki.classIds?.length ? wiki.classIds : ["all"],
    city: wiki.city || "",
    zoneId: wiki.zoneId || "",
    npc: wiki.giver || wiki.npcs?.[0] || "",
    where: wiki.city ? `Starts in ${wiki.city}.` : "",
    levelMin: level,
    repeatable: Boolean(wiki.repeatable),
    rewards: uniqueRewards(wiki.rewards),
    origin: "wiki",
    steps: notes.map((note, index) => ({
      id: `${id}-${index + 1}`,
      level,
      action: note,
      npc: wiki.giver || "",
      zoneId: wiki.zoneId || "",
    })),
  };
}

function mergeWikiQuests(catalog, wikiQuests) {
  const byWiki = new Map();
  for (const wiki of wikiQuests || []) {
    const key = String(wiki?.wiki || "").toLowerCase();
    if (key) byWiki.set(key, wiki);
  }
  const used = new Set();
  const ids = new Set();
  const merged = (catalog || []).map((quest) => {
    ids.add(quest.id);
    const wiki = byWiki.get(String(quest.wiki || "").toLowerCase());
    if (!wiki) return quest;
    used.add(String(wiki.wiki || "").toLowerCase());
    return applyWikiFacts(quest, wiki);
  });
  const added = [];
  for (const wiki of wikiQuests || []) {
    const key = String(wiki?.wiki || "").toLowerCase();
    if (!key || used.has(key)) continue;
    let id = slugify(wiki.title);
    if (!id || ids.has(id)) id = `wiki-${id || "quest"}`;
    while (ids.has(id)) id = `${id}-2`;
    ids.add(id);
    added.push(questFromWiki(wiki, id));
  }
  added.sort((a, b) => a.title.localeCompare(b.title));
  return [...merged, ...added];
}

module.exports = {
  CACHE,
  plain,
  parseQuestWikitext,
  loadWikiQuests,
  mergeWikiQuests,
  applyWikiFacts,
  questFromWiki,
};
