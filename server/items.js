/** Gear / items catalog — quest-derived + wiki import + user curation. */

const fs = require("fs");
const path = require("path");
const { wikiUrl, NPC_POI, QUESTS } = require("./quests");
const { sellStopsFor, sellToFor } = require("./vendors");
const { attachCraftInfo } = require("./craft");

const DATA_DIR = path.join(__dirname, "..", "data");
const WIKI_CACHE = path.join(DATA_DIR, "wiki-items.json");
const MOB_CACHE = path.join(DATA_DIR, "wiki-mobs.json");
const LINK_CACHE = path.join(DATA_DIR, "item-links.json");

const METHOD_LABEL = {
  quest: "Quest",
  drop: "Drop",
  vendor: "Vendor",
  craft: "Craft",
  unknown: "Unknown",
};

function slugify(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function splitNames(raw) {
  return String(raw || "")
    .split(/\s*,\s*/)
    .map((s) => s.replace(/\s*\([^)]*\)\s*$/, "").trim())
    .filter((s) => {
      if (!s) return false;
      if (/^(experience|xp|pinwheel tokens|elemental essences|degree sashes)$/i.test(s)) return false;
      if (/faction$/i.test(s)) return false;
      if (/^\d+\s*(copper|silver|gold|platinum)$/i.test(s)) return false;
      return true;
    });
}

function wikiTitleToSlug(title) {
  return String(title || "")
    .replace(/ /g, "_")
    .replace(/^\|+|\|+$/g, "");
}

function parseWikiLinks(field) {
  if (!field || !String(field).trim()) return [];
  const links = [];
  const re = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;
  let m;
  const text = String(field);
  while ((m = re.exec(text))) {
    links.push({ title: m[1].trim(), label: (m[2] || m[1]).trim() });
  }
  if (!links.length && text.trim() && !text.includes("{{")) {
    links.push({ title: text.trim(), label: text.trim() });
  }
  return links;
}

function questByWiki(wikiSlug) {
  const norm = wikiTitleToSlug(wikiSlug).toLowerCase();
  return QUESTS.find((q) => (q.wiki || "").toLowerCase() === norm || q.title.toLowerCase() === wikiSlug.toLowerCase());
}

function poiForNpcName(npc) {
  if (!npc) return null;
  for (const name of String(npc).split(",")) {
    const id = NPC_POI[name.trim()];
    if (id) return id;
  }
  return null;
}

function loadItemLinks() {
  try {
    if (!fs.existsSync(LINK_CACHE)) return { byPage: {}, byName: {} };
    const data = JSON.parse(fs.readFileSync(LINK_CACHE, "utf8"));
    return {
      byPage: data.byPage && typeof data.byPage === "object" ? data.byPage : {},
      byName: data.byName && typeof data.byName === "object" ? data.byName : {},
    };
  } catch {
    return { byPage: {}, byName: {} };
  }
}

function cleanLinkId(value) {
  const id = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^item\|/, "");
  return /^[0-9a-f]{24}$/.test(id) ? id : "";
}

function linkIdFor(raw, links) {
  const direct = cleanLinkId(raw?.item_link_id || raw?.linkId);
  if (direct) return direct;
  const page = String(raw?.wiki || "")
    .trim()
    .replace(/ /g, "_");
  const name = String(raw?.name || raw?.item_name || "")
    .trim()
    .toLowerCase();
  return cleanLinkId(links?.byPage?.[page]) || cleanLinkId(links?.byName?.[name]) || "";
}

function loadWikiCache() {
  try {
    if (!fs.existsSync(WIKI_CACHE)) return [];
    const data = JSON.parse(fs.readFileSync(WIKI_CACHE, "utf8"));
    return Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function loadMobCache() {
  try {
    if (!fs.existsSync(MOB_CACHE)) return {};
    const data = JSON.parse(fs.readFileSync(MOB_CACHE, "utf8"));
    const list = Array.isArray(data.mobs) ? data.mobs : Array.isArray(data) ? data : [];
    const map = {};
    for (const m of list) {
      if (!m) continue;
      const id = m.id || slugify(m.name);
      if (!id) continue;
      map[id] = m;
      if (m.name) map[slugify(m.name.replace(/^(a|an|the)\s+/i, ""))] = m;
    }
    return map;
  } catch {
    return {};
  }
}

function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function plainWiki(s) {
  return String(s || "")
    .replace(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g, (_, title, label) => (label || title).trim())
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function junkLootName(name) {
  const text = String(name || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!text || text.length < 2) return true;
  if (/^(unknown|unkown|\?+|n\/a|none|no loot|todo|tbd)$/.test(text)) return true;
  if (/no loot|chance of|confirmed by|hover-list|^<\/?[a-z]/.test(text)) return true;
  return false;
}

function tidyLootText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Notable drops from a Namedmobpage `known_loot` field. One item per bullet. */
function parseKnownLoot(field) {
  const out = [];
  const seen = new Set();
  const push = (name, note) => {
    const clean = tidyLootText(name);
    if (!clean || junkLootName(clean)) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const extra = tidyLootText(note).replace(/^[-–—:,\s]+/, "");
    out.push(extra ? { name: clean, note: extra } : { name: clean });
  };

  const source = String(field || "")
    .replace(/<li[^>]*>/gi, "\n* ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/?(?:ul|ol)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  for (const rawLine of source.split("\n")) {
    const line = rawLine
      .trim()
      .replace(/^[*#]+\s*/, "")
      .trim();
    if (!line) continue;
    const links = [...line.matchAll(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g)];
    if (links.length) {
      const note = line
        .replace(/\[\[[^\]]+\]\]/g, " ")
        .replace(/'{2,}/g, "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/\s+/g, " ")
        .replace(/^[-–—:,\s]+/, "")
        .trim();
      links.forEach((match, i) => push((match[2] || match[1]).trim(), i === links.length - 1 ? note : ""));
      continue;
    }
    const plain = line
      .replace(/'{2,}/g, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const dash = plain.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    if (dash) push(dash[1], dash[2]);
    else push(plain, "");
  }
  return out;
}

/** Every `known_loot` list on a mob page, including one block per zone. */
function knownLootFromWikitext(wikitext) {
  const parts = [];
  const re = /\|\s*known_loot\s*=/gi;
  let match;
  const text = String(wikitext || "");
  while ((match = re.exec(text))) {
    const rest = text.slice(match.index + match[0].length);
    const end = rest.search(/\n\s*\|\s*[a-z0-9_]+\s*=|\n\s*\}\}/i);
    parts.push(end < 0 ? rest : rest.slice(0, end));
  }
  return parseKnownLoot(parts.join("\n"));
}

/** Parse Itempage dropsfrom: zone headers with * [[mob]] lists underneath. */
function parseDropsFrom(field) {
  const groups = [];
  let current = { zone: null, mobs: [], notes: [] };
  const push = () => {
    if (current.zone || current.mobs.length || current.notes.length) {
      groups.push(current);
      current = { zone: null, mobs: [], notes: [] };
    }
  };

  for (const rawLine of String(field || "").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const bullet = line.startsWith("*") || line.startsWith("#");
    const content = bullet ? line.replace(/^[*#]\s*/, "").trim() : line;
    const links = parseWikiLinks(content);

    if (!bullet && links.length === 1) {
      push();
      current.zone = links[0];
      continue;
    }
    if (!bullet && links.length > 1) {
      push();
      current.zone = links[0];
      current.mobs.push(...links.slice(1));
      continue;
    }
    if (links.length) current.mobs.push(...links);
    else if (content) current.notes.push(content);
  }
  push();
  return groups;
}

function findZone(title, zones) {
  if (!title || !zones?.length) return null;
  const n = normName(title);
  return (
    zones.find((z) => normName(z.name) === n) ||
    zones.find((z) => n.length > 3 && (normName(z.name).includes(n) || n.includes(normName(z.name)))) ||
    null
  );
}

function levelLabel(min, max, exact) {
  if (exact != null && exact !== "" && Number.isFinite(Number(exact))) return `lvl ${Number(exact)}`;
  if (min != null && max != null) return min === max ? `lvl ${min}` : `lvl ${min}–${max}`;
  if (min != null) return `lvl ${min}+`;
  if (max != null) return `lvl ≤${max}`;
  return "";
}

function matchCampForMob(mobName, zoneId, pois) {
  if (!pois?.length || !mobName) return null;
  const n = normName(mobName);
  const tokens = n.split(/\s+/).filter((t) => t.length > 2);
  const pool = zoneId ? pois.filter((p) => p.zoneId === zoneId) : pois;
  const camps = pool.filter(
    (p) => (p.kind === "camp" || p.kind === "named") && !String(p.id).startsWith("wiki-lv-")
  );

  let best = null;
  let bestScore = 0;
  for (const poi of camps) {
    const hay = normName(`${poi.name} ${poi.monsters || ""} ${poi.notes || ""}`);
    let score = 0;
    if (hay === n || hay.includes(n)) score += 5;
    for (const t of tokens) {
      if (hay.includes(t)) score += 1;
    }
    // Prefer named pins whose name matches the mob closely
    if (poi.kind === "named" && normName(poi.name).includes(n.split(" ")[0])) score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = poi;
    }
  }
  return bestScore >= 2 ? best : null;
}

function enrichDropSource(src, ctx) {
  const { zones = [], pois = [], mobs = {} } = ctx;
  if (src.method !== "drop") {
    if (src.zoneId || src.npc) {
      const zone = src.zoneId ? zones.find((z) => z.id === src.zoneId) : findZone(src.npc, zones);
      return {
        ...src,
        zoneId: src.zoneId || zone?.id || null,
        zoneName: zone?.name || src.zoneName || "",
      };
    }
    return src;
  }

  const zone = src.zoneId
    ? zones.find((z) => z.id === src.zoneId)
    : findZone(src.zoneName, zones) || findZone(src.npc, zones);
  const zoneId = zone?.id || src.zoneId || null;
  const zoneName = zone?.name || src.zoneName || "";
  const isZoneOnly = zone && normName(src.npc) === normName(zone.name);

  const mob =
    mobs[slugify(src.npc)] ||
    mobs[slugify(String(src.npc || "").replace(/^(a|an|the)\s+/i, ""))] ||
    null;
  const camp = isZoneOnly ? null : matchCampForMob(src.npc, zoneId, pois);

  let levelMin = null;
  let levelMax = null;
  let levelExact = null;
  let levelSource = "";

  if (mob?.level != null && String(mob.level).trim()) {
    const lv = String(mob.level).trim();
    const range = lv.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (range) {
      levelMin = Number(range[1]);
      levelMax = Number(range[2]);
      levelSource = "mob";
    } else if (/^\d+$/.test(lv)) {
      levelExact = Number(lv);
      levelMin = levelExact;
      levelMax = levelExact;
      levelSource = "mob";
    }
  }
  if (levelMin == null && camp && (camp.soloMin != null || camp.groupMin != null)) {
    levelMin = camp.soloMin ?? camp.groupMin;
    levelMax = camp.soloMax ?? camp.groupMax ?? levelMin;
    levelSource = "camp";
  }
  if (levelMin == null && zone) {
    levelMin = zone.levelMin ?? null;
    levelMax = zone.levelMax ?? null;
    levelSource = "zone";
  }

  const lvl = levelLabel(levelMin, levelMax, levelExact);
  const mobPart = isZoneOnly ? `Trash / zone loot` : src.npc || "Unknown mob";
  const bits = [mobPart, zoneName, lvl].filter(Boolean);
  const detail = [camp?.name && `near ${camp.name}`, plainWiki(mob?.location || ""), camp?.monsters && `camp: ${camp.monsters}`]
    .filter(Boolean)
    .join(" · ");

  return {
    ...src,
    zoneId,
    zoneName,
    poiId: src.poiId || camp?.id || null,
    levelMin,
    levelMax,
    levelExact,
    level: lvl,
    levelSource,
    campName: camp?.name || "",
    monsters: camp?.monsters || mob?.race || "",
    location: plainWiki(mob?.location || ""),
    notes: [src.notes, detail].filter(Boolean).join(" · "),
    label: bits.join(" · "),
  };
}

/**
 * Item names handed in or named in a step.
 * A leading count ("5 Bone Chips", "1x Fire Beetle Eye") is enough to keep a phrase.
 * Other phrases are kept only when they match a known item name.
 */
function turnInNames(text, knownLower) {
  const known = knownLower instanceof Set ? knownLower : new Set(knownLower || []);
  const found = new Map();
  const add = (name) => {
    const clean = String(name || "")
      .replace(/[.,;:]+$/g, "")
      .replace(/^(a|an|the)\s+/i, "")
      .trim();
    if (clean.length < 4 || clean.length > 60) return;
    const key = clean.toLowerCase();
    if (!found.has(key)) found.set(key, clean);
  };

  const raw = String(text || "");
  const qty = /(\d+)\s*(?:x\s+|\s+)([A-Z][\w'’-]*(?:\s+[A-Z][\w'’-]*){0,5})/g;
  let match;
  while ((match = qty.exec(raw))) {
    const phrase = match[2].replace(/[.,;:]+$/g, "").trim();
    const words = phrase.split(/\s+/).filter(Boolean);
    if (words.length >= 2) add(phrase);
    else if (known.has(phrase.toLowerCase())) add(phrase);
  }

  if (known.size) {
    const tokens = raw.split(/[^A-Za-z0-9'’.-]+/).filter(Boolean);
    for (let i = 0; i < tokens.length; i++) {
      let phrase = "";
      for (let len = 1; len <= 6 && i + len <= tokens.length; len++) {
        phrase = phrase ? `${phrase} ${tokens[i + len - 1]}` : tokens[i];
        if (known.has(phrase.toLowerCase())) add(phrase);
      }
    }
  }

  return [...found.values()];
}

function knownItemNames(quests, wikiNames) {
  const known = new Set(wikiNames || []);
  for (const quest of quests || []) {
    for (const step of quest.steps || []) {
      for (const name of step.items || []) {
        const key = String(name || "").trim().toLowerCase();
        if (key) known.add(key);
      }
    }
  }
  return known;
}

function deriveFromQuests(publicQuests, wikiNames) {
  const byId = new Map();
  const known = knownItemNames(publicQuests, wikiNames);

  function ensure(name, extra = {}) {
    const clean = String(name || "").trim();
    if (!clean) return null;
    const id = slugify(clean);
    if (!id) return null;
    let item = byId.get(id);
    if (!item) {
      item = {
        id,
        name: clean,
        kind: extra.kind || "gear",
        slot: extra.slot || "",
        wiki: extra.wiki || clean.replace(/ /g, "_"),
        notes: "",
        origin: "quest",
        sources: [],
      };
      byId.set(id, item);
    }
    return item;
  }

  function addSource(item, source) {
    if (!item || !source) return;
    const keyOf = (s) => [s.method, s.role || "", s.questId || "", s.label || ""].join("|");
    if (item.sources.some((s) => keyOf(s) === keyOf(source))) return;
    item.sources.push(source);
  }

  for (const quest of publicQuests || []) {
    const rewardNames = new Set([
      ...(quest.rewards || []).flatMap(splitNames),
      ...(quest.steps || []).flatMap((s) => splitNames(s.reward)),
    ]);
    for (const name of rewardNames) {
      const item = ensure(name, { kind: "item" });
      if (!item) continue;
      const step =
        (quest.steps || []).find((s) => splitNames(s.reward).some((n) => slugify(n) === item.id)) ||
        (quest.steps || [])[quest.steps.length - 1];
      addSource(item, {
        method: "quest",
        role: "reward",
        label: quest.title,
        questId: quest.id,
        poiId: step?.poiId || quest.poiId || null,
        zoneId: step?.zoneId || quest.zoneId || null,
        npc: step?.npc || quest.npc || "",
        notes: "Reward",
        origin: "quest",
      });
    }

    for (const step of quest.steps || []) {
      const named = [
        ...(step.items || []),
        ...turnInNames([step.action, step.turnIn].filter(Boolean).join("\n"), known),
      ];
      for (const name of named) {
        if (rewardNames.has(name)) continue;
        const item = ensure(name, { kind: "item" });
        if (!item) continue;
        addSource(item, {
          method: "quest",
          role: "turn-in",
          label: quest.title,
          questId: quest.id,
          poiId: step.poiId || quest.poiId || null,
          zoneId: step.zoneId || quest.zoneId || null,
          npc: step.npc || quest.npc || "",
          notes: step.turnIn ? `Turn in: ${step.turnIn}` : "Turn in",
          origin: "quest",
        });
      }
    }
  }

  return [...byId.values()];
}

function sourcesFromWikiItem(raw) {
  const sources = [];
  for (const link of parseWikiLinks(raw.relatedquests)) {
    const quest = questByWiki(link.title);
    sources.push({
      method: "quest",
      label: quest ? `Quest: ${quest.title}` : `Quest: ${link.label}`,
      questId: quest?.id || null,
      poiId: quest ? poiForNpcName(quest.npc) : null,
      zoneId: quest?.zoneId || null,
      npc: quest?.npc || "",
      notes: "",
      origin: "wiki",
    });
  }

  for (const group of parseDropsFrom(raw.dropsfrom)) {
    const zoneName = group.zone?.label || group.zone?.title || "";
    if (group.mobs.length) {
      for (const mob of group.mobs) {
        sources.push({
          method: "drop",
          label: `Drops from ${mob.label}`,
          questId: null,
          poiId: null,
          zoneId: null,
          zoneName,
          npc: mob.label,
          notes: group.notes.join("; "),
          origin: "wiki",
        });
      }
    } else if (zoneName) {
      sources.push({
        method: "drop",
        label: `Drops in ${zoneName}`,
        questId: null,
        poiId: null,
        zoneId: null,
        zoneName,
        npc: zoneName,
        notes: group.notes.join("; "),
        origin: "wiki",
      });
    } else if (group.notes.length) {
      sources.push({
        method: "drop",
        label: group.notes.join("; "),
        questId: null,
        poiId: null,
        zoneId: null,
        zoneName: "",
        npc: "",
        notes: group.notes.join("; "),
        origin: "wiki",
      });
    }
  }

  for (const link of parseWikiLinks(raw.soldby)) {
    const poiId = poiForNpcName(link.label);
    sources.push({
      method: "vendor",
      label: `Sold by ${link.label}`,
      questId: null,
      poiId,
      zoneId: null,
      npc: link.label,
      notes: "",
      origin: "wiki",
    });
  }
  for (const link of parseWikiLinks(raw.playercrafted)) {
    sources.push({
      method: "craft",
      label: `Crafted: ${link.label}`,
      questId: null,
      poiId: null,
      zoneId: null,
      npc: "",
      notes: link.label,
      origin: "wiki",
    });
  }
  return sources;
}

const ITEM_STAT_FIELDS = [
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

function pickItemStats(raw = {}) {
  const out = {};
  for (const key of ITEM_STAT_FIELDS) {
    const v = raw[key];
    out[key] = v == null || v === "" ? "" : String(v).trim();
  }
  return out;
}

function mergeItemStats(prev, next) {
  for (const key of ITEM_STAT_FIELDS) {
    if (!prev[key] && next[key]) prev[key] = next[key];
  }
}

const ARMOR_SLOTS = new Set(["CHEST", "HEAD", "LEGS", "FEET", "HANDS", "WRIST", "SHOULDERS", "FACE", "ARMS", "SHIRT"]);
const WORN_ALSO = new Set(["WAIST", "BACK"]);
const WEAPON_SLOTS = new Set(["PRIMARY", "SECONDARY", "RANGE", "AMMO"]);
const JEWEL_SLOTS = new Set(["NECK", "FINGER", "EAR"]);
const BAG_SLOTS = new Set(["BAG", "BACKPACK", "BELT", "SADDLEBAG"]);
const WEAPON_SKILLS = new Set(["SLA", "BLG", "ARC", "H2H", "THR", "1HS", "1HB", "1HP", "2HS", "2HB", "2HP", "PRC", "PIE"]);
const SLOT_BY_CATEGORY = {
  chest: "CHEST",
  head: "HEAD",
  legs: "LEGS",
  feet: "FEET",
  hands: "HANDS",
  wrist: "WRIST",
  waist: "WAIST",
  shoulders: "SHOULDERS",
  back: "BACK",
  face: "FACE",
  arms: "ARMS",
  shirt: "SHIRT",
  neck: "NECK",
  finger: "FINGER",
  ear: "EAR",
  primary: "PRIMARY",
  secondary: "SECONDARY",
  range: "RANGE",
  ammo: "AMMO",
  bag: "BAG",
  backpack: "BACKPACK",
  belt: "BELT",
};

function slotTokens(slot) {
  return String(slot || "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);
}

function categoryNames(raw) {
  return (raw?.categories || []).map((c) => String(c).trim()).filter(Boolean);
}

const NAME_SLOT_RULES = [
  [/\bearrings?\b/i, "EAR"],
  [/\brings?\b/i, "FINGER"],
  [/\b(necklaces?|pendants?|amulets?)\b/i, "NECK"],
  [/\b(boots?)\b/i, "FEET"],
  [/\b(leggings|greaves)\b/i, "LEGS"],
  [/\b(bracers?|vambraces?|cuffs?)\b/i, "WRIST"],
  [/\b(gauntlets?|gloves)\b/i, "HANDS"],
  [/\b(helms?|helmets?|coifs?)\b/i, "HEAD"],
  [/\b(robes?|tunics?|breastplates?|hauberks?|cuirasses?)\b/i, "CHEST"],
  [/\b(pauldrons?|mantles?|spaulders?)\b/i, "SHOULDERS"],
  [/\b(cloaks?|capes?)\b/i, "BACK"],
  [/\bmasks?\b/i, "FACE"],
  [/\b(bucklers?|shields?|bulwarks?|aegis(?:es)?)\b/i, "SECONDARY"],
  [/\b(backpacks?|satchels?)\b/i, "BAG"],
];
const NAME_SLOT_IF_ARMOR = [
  [/\b(cords?|cinches?|girdles?)\b/i, "WAIST"],
];

/** Fill an empty slot from wiki slot categories, then from a clear gear name. */
function slotFromCategories(raw) {
  const existing = String(raw?.slot || "").trim();
  if (existing) return existing;
  const found = [];
  for (const name of categoryNames(raw)) {
    const mapped = SLOT_BY_CATEGORY[name.toLowerCase()];
    if (mapped && !found.includes(mapped)) found.push(mapped);
  }
  if (found.length) return found.join(" ");
  const name = String(raw?.name || raw?.item_name || "");
  if (!name || /^(enchant|scroll|recipe|token)\b/i.test(name)) return "";
  for (const [re, slot] of NAME_SLOT_RULES) {
    if (re.test(name)) return slot;
  }
  const ac = Number(String(raw?.ac ?? "").replace(/[^0-9.-]/g, ""));
  if (Number.isFinite(ac) && ac > 0) {
    for (const [re, slot] of NAME_SLOT_IF_ARMOR) {
      if (re.test(name)) return slot;
    }
  }
  return "";
}

function hasCategory(raw, re) {
  return categoryNames(raw).some((name) => re.test(name));
}

function weaponLike(raw) {
  const skill = String(raw?.skill || "")
    .trim()
    .toUpperCase();
  if (WEAPON_SKILLS.has(skill)) return true;
  const dmg = Number(String(raw?.dmg ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(dmg) && dmg > 0;
}

function shieldLike(raw) {
  const name = String(raw?.name || raw?.item_name || "");
  if (/\b(lute|drum|flute|horn|recorder|lyre|harp|sconce|lamp|lantern|lightstone)\b/i.test(name)) return false;
  if (hasCategory(raw, /^shields?$/i)) return true;
  if (/\b(shield|buckler|bulwark|aegis|ward|board|guard)\b/i.test(name)) return true;
  const ac = Number(String(raw?.ac ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(ac) && ac > 0;
}

/**
 * Kind from the worn slot first, then wiki categories.
 * Category:Items is the whole catalog, so a robe filed only there is still armor.
 */
function guessKind(raw) {
  const slot = slotFromCategories(raw);
  const slots = slotTokens(slot);
  const any = (set) => slots.some((s) => set.has(s));
  const only = (set) => slots.length > 0 && slots.every((s) => set.has(s));
  const held = any(WEAPON_SLOTS);
  const jewel = any(JEWEL_SLOTS);
  const worn =
    any(ARMOR_SLOTS) ||
    (any(WORN_ALSO) && !held && !jewel) ||
    hasCategory(raw, /^armor$/i) ||
    hasCategory(raw, /^(chest|head|legs|feet|hands|wrist|shoulders|face|arms|shirt)$/i);

  if (worn) return "armor";
  if ((only(new Set(["SECONDARY"])) || hasCategory(raw, /^shields?$/i)) && shieldLike(raw)) return "shield";
  if ((jewel && !weaponLike(raw)) || hasCategory(raw, /^jewelry$/i) || hasCategory(raw, /^(neck|finger|ear)$/i)) return "jewelry";
  const offhandOnly = only(new Set(["SECONDARY"]));
  if (
    weaponLike(raw) ||
    (only(WEAPON_SLOTS) && !offhandOnly) ||
    hasCategory(raw, /^(weapon|primary|range|ammo|slashing weapon|archery weapon)$/i)
  ) {
    return "weapon";
  }
  if ((any(BAG_SLOTS) && !held && !jewel) || hasCategory(raw, /^bags?( & containers)?$/i)) return "bag";
  if (hasCategory(raw, /^food$/i)) return "food";
  if (hasCategory(raw, /^drink$/i)) return "drink";
  if (hasCategory(raw, /^quest_?items?$/i)) return "quest";
  if (hasCategory(raw, /^instruments?$/i)) return "instrument";
  if (hasCategory(raw, /^herbs?$/i)) return "herb";
  if (hasCategory(raw, /^fish$/i)) return "fish";
  if (hasCategory(raw, /^bandages?$/i)) return "bandage";
  if (any(WORN_ALSO)) return "armor";
  return "item";
}

function resolveKind(raw) {
  const guessed = guessKind(raw);
  if (guessed !== "item") return guessed;
  const stored = String(raw?.kind || "").toLowerCase();
  if (stored && stored !== "gear" && stored !== "item") return stored;
  return "item";
}

function fromWikiCache(cacheItems, links = loadItemLinks()) {
  return (cacheItems || []).map((raw) => {
    const name = raw.name || raw.item_name || raw.title;
    const id = raw.id || slugify(name);
    const wiki = raw.wiki || wikiTitleToSlug(name);
    const slot = slotFromCategories(raw);
    return {
      id,
      name,
      kind: resolveKind({ ...raw, name, slot }),
      slot,
      wiki,
      linkId: linkIdFor({ ...raw, wiki, name }, links),
      notes: raw.notes || "",
      playercrafted: raw.playercrafted || "",
      recipes: raw.recipes || "",
      categories: Array.isArray(raw.categories) ? raw.categories : [],
      origin: "wiki",
      sources: sourcesFromWikiItem(raw),
      ...pickItemStats(raw),
    };
  });
}

function mergeCatalog(parts, ctx = {}) {
  const byId = new Map();
  for (const list of parts) {
    for (const item of list || []) {
      if (!item?.id || !item?.name) continue;
      const prev = byId.get(item.id);
      if (!prev) {
        byId.set(item.id, {
          ...item,
          sources: [...(item.sources || [])],
          wikiUrl: wikiUrl(item.wiki || item.name.replace(/ /g, "_")),
        });
        continue;
      }
      if (item.origin === "user" || (item.origin === "quest" && prev.origin === "wiki")) {
        prev.name = item.name || prev.name;
        if (item.kind && item.kind !== "gear" && item.kind !== "item") prev.kind = item.kind;
        else if (!prev.kind || prev.kind === "gear" || prev.kind === "item") prev.kind = item.kind || prev.kind;
        prev.slot = item.slot || prev.slot;
        prev.notes = item.notes || prev.notes;
        mergeItemStats(prev, item);
        if (item.categories?.length) prev.categories = item.categories;
        if (item.origin === "user") prev.origin = "user";
      } else {
        if ((!prev.kind || prev.kind === "gear" || prev.kind === "item") && item.kind) prev.kind = item.kind;
        if (!prev.slot && item.slot) prev.slot = item.slot;
        mergeItemStats(prev, item);
        if ((!prev.categories || !prev.categories.length) && item.categories?.length) prev.categories = item.categories;
      }
      if (!prev.linkId && item.linkId) prev.linkId = item.linkId;
      for (const src of item.sources || []) {
        const key = [src.method, src.questId || "", src.poiId || "", src.npc || "", src.zoneName || "", src.label || ""].join(
          "|"
        );
        if (
          !prev.sources.some(
            (s) => [s.method, s.questId || "", s.poiId || "", s.npc || "", s.zoneName || "", s.label || ""].join("|") === key
          )
        ) {
          prev.sources.push(src);
        }
      }
    }
  }

  const rows = [...byId.values()]
    .map((item) => {
      const sources = (item.sources || []).map((s) => enrichDropSource(s, ctx));
      // Prefer drop sources with levels, then any mapped poi/zone
      const ranked = [...sources].sort((a, b) => {
        const score = (s) =>
          (s.method === "drop" ? 2 : 0) + (s.level ? 2 : 0) + (s.poiId ? 1 : 0) + (s.zoneId ? 1 : 0);
        return score(b) - score(a);
      });
      const primary = ranked[0] || sources[0];
      const how = primary
        ? `${METHOD_LABEL[primary.method] || primary.method}: ${String(primary.label || "").replace(
            /^(Quest|Drops from|Sold by|Crafted):\s*/i,
            ""
          )}`
        : item.wikiUrl
          ? "See wiki for how to get"
          : "How to get: unknown";
      const farmBits = [
        primary?.location,
        primary?.campName,
        primary?.zoneName,
        primary?.method === "drop" ? primary?.npc : "",
      ].filter(Boolean);
      const farmAt = [...new Set(farmBits)].join(" · ") || (primary?.label ? String(primary.label).replace(/^(Quest|Drops from|Sold by|Crafted):\s*/i, "") : "");
      return {
        ...item,
        ...pickItemStats(item),
        categories: item.categories || [],
        sources,
        how,
        method: primary?.method || "",
        level: primary?.level || "",
        levelMin: primary?.levelMin ?? null,
        levelMax: primary?.levelMax ?? null,
        zoneName: primary?.zoneName || "",
        npc: primary?.npc || "",
        campName: primary?.campName || "",
        monsters: primary?.monsters || "",
        farmAt,
        primaryPoiId: primary?.poiId || null,
        primaryZoneId: primary?.zoneId || null,
        primaryQuestId: primary?.questId || sources.find((s) => s.questId)?.questId || null,
        quests: [...new Set(sources.filter((s) => s.method === "quest" && s.label).map((s) => s.label))],
        sellTo: sellToFor(item),
        sellTos: sellStopsFor(item, ctx.zones, ctx.pois),
        wikiUrl: item.wikiUrl || wikiUrl(item.wiki || item.name.replace(/ /g, "_")),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return attachCraftInfo(rows);
}

function curatedFromDb(db) {
  if (!db) return [];
  const rows = db.all("SELECT * FROM items ORDER BY name");
  const sources = db.all("SELECT * FROM item_sources");
  const byItem = {};
  for (const s of sources) {
    (byItem[s.item_id] ||= []).push({
      method: s.method,
      label: s.label,
      questId: s.quest_id,
      poiId: s.poi_id,
      zoneId: s.zone_id,
      npc: s.npc || "",
      notes: s.notes || "",
      origin: s.source || "user",
    });
  }
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind || "item",
    slot: r.slot || "",
    wiki: r.wiki || r.name.replace(/ /g, "_"),
    notes: r.notes || "",
    origin: r.source || "user",
    sources: byItem[r.id] || [],
  }));
}

function publicItems(publicQuests, db, ctx = {}) {
  const enrichCtx = {
    zones: ctx.zones || [],
    pois: ctx.pois || [],
    mobs: ctx.mobs || loadMobCache(),
  };
  const cache = loadWikiCache();
  const wikiNames = [];
  for (const raw of cache) {
    const name = String(raw.name || raw.item_name || raw.title || "").trim().toLowerCase();
    if (name) wikiNames.push(name);
  }
  return mergeCatalog(
    [deriveFromQuests(publicQuests, wikiNames), fromWikiCache(cache), curatedFromDb(db)],
    enrichCtx
  );
}

function searchItems(items, query, limit = 24) {
  const q = String(query || "").trim().toLowerCase();
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const item of items || []) {
    const hay = [
      item.name,
      item.kind,
      item.slot,
      item.how,
      item.notes,
      item.ac,
      item.dmg,
      item.skill,
      item.class,
      item.race,
      item.effect,
      item.effect1,
      item.effect2,
      item.effect3,
      item.recipe,
      item.materials,
      item.usedIn,
      item.sellTo,
      ...(item.quests || []),
      ...(item.sources || []).flatMap((s) => [
        s.label,
        s.npc,
        s.method,
        s.notes,
        s.zoneName,
        s.level,
        s.campName,
        s.monsters,
        s.location,
      ]),
    ]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q) && !tokens.every((t) => hay.includes(t))) continue;
    const name = item.name.toLowerCase();
    const rank = name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2;
    scored.push({ item, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name));
  return scored.slice(0, limit).map((s) => s.item);
}

/** Unique mob titles referenced by wiki dropsfrom fields. */
function zonesForMob(raw, zones) {
  const text = plainWiki(raw);
  const parts = text
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const ids = [];
  const names = [];
  for (const part of parts.length ? parts : [text]) {
    const zone = findZone(part, zones);
    if (!zone || ids.includes(zone.id)) continue;
    ids.push(zone.id);
    names.push(zone.name);
  }
  return { zoneId: ids[0] || null, zoneIds: ids, zoneName: names.join(", ") || text };
}

const COMMON_MOB_NAME = /^(a|an|the)\s+/i;

/** True for a unique named. "A blacktide brute" is trash. "A bloodynose hag" stays when the wiki gives it a placeholder. */
function mobIsNamed(mob) {
  const name = String(mob?.name || "").trim();
  if (!name || /^x\d+\s+recipient$/i.test(name)) return false;
  const desc = String(mob?.description || "");
  if (/\b(?:placeholder|ph)\s+for\b/i.test(desc)) return false;
  if (/\bnamed\b/i.test(desc) || /\bph\b|placeholder/i.test(desc)) return true;
  return !COMMON_MOB_NAME.test(name);
}

/** Named mobs from the wiki, slim enough to ship with the atlas search. */
function publicMobs(zones = []) {
  const seen = new Set();
  const out = [];
  for (const mob of Object.values(loadMobCache())) {
    if (!mob?.id || !mob.name || seen.has(mob.id)) continue;
    seen.add(mob.id);
    const place = zonesForMob(mob.zone, zones);
    const loot = (Array.isArray(mob.loot) ? mob.loot : [])
      .map((row) => {
        if (typeof row === "string") return { name: row.trim() };
        const name = String(row?.name || "").trim();
        if (!name) return null;
        const note = String(row.note || "").trim();
        return note ? { name, note } : { name };
      })
      .filter((row) => row?.name);
    out.push({
      id: mob.id,
      name: mob.name,
      named: mobIsNamed(mob),
      level: String(mob.level || "").trim(),
      race: plainWiki(mob.race),
      zoneId: place.zoneId,
      zoneIds: place.zoneIds,
      zoneName: place.zoneName,
      location: plainWiki(mob.location),
      loot,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

function collectDropMobTitles(cacheItems = loadWikiCache()) {
  const titles = new Set();
  for (const raw of cacheItems) {
    for (const group of parseDropsFrom(raw.dropsfrom)) {
      for (const mob of group.mobs) titles.add(mob.title);
    }
  }
  return [...titles].sort();
}

module.exports = {
  slugify,
  splitNames,
  turnInNames,
  loadWikiCache,
  loadMobCache,
  deriveFromQuests,
  publicItems,
  searchItems,
  METHOD_LABEL,
  ITEM_STAT_FIELDS,
  WIKI_CACHE,
  MOB_CACHE,
  parseWikiLinks,
  parseDropsFrom,
  parseKnownLoot,
  knownLootFromWikitext,
  sourcesFromWikiItem,
  collectDropMobTitles,
  mobIsNamed,
  publicMobs,
  linkIdFor,
  guessKind,
  resolveKind,
};
