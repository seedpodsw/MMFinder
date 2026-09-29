/** Gear / items catalog — quest-derived + wiki import + user curation. */

const fs = require("fs");
const path = require("path");
const { wikiUrl, NPC_POI, QUESTS } = require("./quests");

const DATA_DIR = path.join(__dirname, "..", "data");
const WIKI_CACHE = path.join(DATA_DIR, "wiki-items.json");
const MOB_CACHE = path.join(DATA_DIR, "wiki-mobs.json");

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
    .filter((s) => s && !/^(experience|xp|pinwheel tokens|elemental essences|degree sashes)$/i.test(s));
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
  const camps = pool.filter((p) => p.kind === "camp" || p.kind === "named");

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
  const detail = [camp?.name && `near ${camp.name}`, mob?.location, camp?.monsters && `camp: ${camp.monsters}`]
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
    location: mob?.location || "",
    notes: [src.notes, detail].filter(Boolean).join(" · "),
    label: bits.join(" · "),
  };
}

function deriveFromQuests(publicQuests) {
  const byId = new Map();

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
    const key = [source.method, source.questId || "", source.poiId || "", source.label || ""].join("|");
    if (item.sources.some((s) => [s.method, s.questId || "", s.poiId || "", s.label || ""].join("|") === key)) {
      return;
    }
    item.sources.push(source);
  }

  for (const quest of publicQuests || []) {
    const names = new Set([
      ...(quest.rewards || []).flatMap(splitNames),
      ...(quest.steps || []).flatMap((s) => splitNames(s.reward)),
    ]);
    for (const name of names) {
      const item = ensure(name);
      if (!item) continue;
      const step =
        (quest.steps || []).find((s) => splitNames(s.reward).some((n) => slugify(n) === item.id)) ||
        (quest.steps || [])[quest.steps.length - 1];
      addSource(item, {
        method: "quest",
        label: `${quest.title}${step?.action ? ` — ${step.action}` : ""}`,
        questId: quest.id,
        poiId: step?.poiId || quest.poiId || null,
        zoneId: step?.zoneId || quest.zoneId || null,
        npc: step?.npc || quest.npc || "",
        notes: step?.turnIn ? `Turn in: ${step.turnIn}` : "",
        origin: "quest",
      });
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

function fromWikiCache(cacheItems) {
  return (cacheItems || []).map((raw) => {
    const name = raw.name || raw.item_name || raw.title;
    const id = raw.id || slugify(name);
    return {
      id,
      name,
      kind: raw.kind || guessKind(raw),
      slot: raw.slot || "",
      wiki: raw.wiki || wikiTitleToSlug(name),
      notes: raw.notes || "",
      categories: Array.isArray(raw.categories) ? raw.categories : [],
      origin: "wiki",
      sources: sourcesFromWikiItem(raw),
      ...pickItemStats(raw),
    };
  });
}

function guessKind(raw) {
  const slot = String(raw.slot || "").toUpperCase();
  const cats = (raw.categories || []).map((c) => String(c).toLowerCase());
  if (cats.some((c) => c.includes("weapon")) || raw.dmg || raw.skill) return "weapon";
  if (cats.some((c) => c.includes("armor")) || slot.includes("CHEST") || slot.includes("LEGS")) return "armor";
  if (cats.some((c) => c.includes("jewelry")) || /EAR|FINGER|NECK|WRIST/.test(slot)) return "jewelry";
  if (cats.some((c) => c.includes("shield")) || slot.includes("SECONDARY")) return "shield";
  return "item";
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

  return [...byId.values()]
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
        primary?.campName,
        primary?.zoneName,
        primary?.location,
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
        primaryQuestId: primary?.questId || null,
        wikiUrl: item.wikiUrl || wikiUrl(item.wiki || item.name.replace(/ /g, "_")),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
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
  return mergeCatalog([deriveFromQuests(publicQuests), fromWikiCache(loadWikiCache()), curatedFromDb(db)], enrichCtx);
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
  sourcesFromWikiItem,
  collectDropMobTitles,
};
