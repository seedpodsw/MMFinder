/** Where a player can sell an item, from wiki merchant "buys" lists. */

const fs = require("fs");
const path = require("path");

const BUYS_PATH = path.join(__dirname, "..", "data", "merchant-buys.json");

const ARMOR_SLOTS = new Set(["CHEST", "HEAD", "LEGS", "FEET", "HANDS", "WRIST", "WAIST", "SHOULDERS", "BACK", "FACE", "ARMS", "SHIRT"]);
const WEAPON_SLOTS = new Set(["PRIMARY", "SECONDARY", "RANGE", "AMMO"]);
const JEWEL_SLOTS = new Set(["NECK", "FINGER", "EAR"]);
const BAG_SLOTS = new Set(["BAG", "BACKPACK", "SADDLEBAG"]);

const NO_DROP = /^(yes|true|y|1|nodrop)$/i;

function stripWiki(text) {
  return String(text || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g, (_, title, label) => label || title)
    .replace(/\s+/g, " ")
    .trim();
}

function zonesOf(raw) {
  const names = [];
  const re = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;
  let m;
  const text = String(raw || "");
  while ((m = re.exec(text))) names.push((m[2] || m[1]).trim());
  if (!names.length && text.trim()) names.push(stripWiki(text));
  return [...new Set(names.filter(Boolean))];
}

function vendorType(title) {
  const base = String(title || "").replace(/\s*\([^)]*\)/g, "").trim();
  if (/^(a|an)\s+/i.test(base)) return base.replace(/^(a|an)\s+/i, "").toLowerCase();
  const named = [
    [/reagent/i, "reagent vendor"],
    [/poison/i, "poison maker"],
    [/herbalist/i, "herbalist"],
    [/alchemist/i, "alchemist"],
    [/weaponsmith/i, "weaponsmith"],
    [/blacksmith|smelter/i, "blacksmith"],
    [/jewel/i, "jewelcrafter"],
    [/butcher/i, "butcher"],
    [/grocer|produce/i, "grocer"],
    [/barkeep/i, "barkeep"],
    [/cook|chef/i, "cook"],
    [/leather|tanner|pelt/i, "leatherworker"],
    [/fisherman|fishing/i, "fisherman"],
    [/miner/i, "miner"],
    [/cobbler/i, "cobbler"],
    [/armou?rer/i, "armorer"],
    [/outfitter|goods merchant/i, "goods merchant"],
    [/scribe/i, "scribe"],
    [/medic/i, "medic"],
  ];
  for (const [re, type] of named) if (re.test(title)) return type;
  return "";
}

function parseBuys(text) {
  const items = [];
  const categories = [];
  let skip = false;
  for (const rawLine of String(text || "").split("\n")) {
    if (/^\s*\|/.test(rawLine)) break;
    let line = rawLine.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").trim();
    if (!line) continue;
    if (/buys\s*:/i.test(line) && /nothing|none/i.test(line)) {
      skip = true;
      continue;
    }
    if (/buys\s*:/i.test(line)) {
      skip = false;
      continue;
    }
    if (skip) continue;
    if (/about anything|most items at discounted|not a good commerce|^\*?\s*(unknown|none|nothing)\b/i.test(line)) continue;
    line = line.replace(/^\*\s*/, "").trim();
    if (!line) continue;
    const links = [];
    const re = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;
    let m;
    while ((m = re.exec(line))) links.push((m[2] || m[1]).trim());
    const paren = line.match(/\(([^)]+)\)/);
    const keywords = paren
      ? paren[1]
          .replace(/\.\.\./g, "")
          .split(/,|\/|\band\b/)
          .map((s) => s.replace(/\(.*?\)/g, "").trim().toLowerCase())
          .filter((s) => s && s.length > 2 && !/^\d/.test(s))
      : [];
    const phrase = line
      .replace(/\[\[[^\]|#]+(?:\|[^\]]+)?\]\]/g, " ")
      .replace(/\([^)]*\)/g, " ")
      .replace(/^\*\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
    for (const name of links) items.push(name);
    if (!links.length && phrase && !/^(unknown|none|nothing)$/i.test(phrase)) {
      categories.push({ phrase, keywords });
    }
  }
  return { items: [...new Set(items)], categories };
}

function cleanMerchant(raw) {
  const buys = parseBuys(raw.buys);
  if (!buys.items.length && !buys.categories.length) return null;
  const type = vendorType(raw.title);
  return {
    name: raw.title,
    type,
    zones: zonesOf(raw.zone),
    place: stripWiki(raw.location).replace(/\s+/g, " ").trim(),
    items: buys.items,
    categories: buys.categories,
  };
}

function loadMerchants() {
  try {
    const data = JSON.parse(fs.readFileSync(BUYS_PATH, "utf8"));
    return Array.isArray(data.merchants) ? data.merchants : [];
  } catch {
    return [];
  }
}

function slotList(item) {
  return String(item.slot || "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);
}

function hasCat(item, re) {
  return (item.categories || []).some((c) => re.test(c));
}

function isLoose(item) {
  if (["weapon", "armor", "jewelry", "shield"].includes(item.kind)) return false;
  const slots = slotList(item);
  if (slots.some((s) => ARMOR_SLOTS.has(s) || WEAPON_SLOTS.has(s) || JEWEL_SLOTS.has(s) || BAG_SLOTS.has(s))) return false;
  return true;
}

function isWeapon(item) {
  if (item.kind === "weapon") return true;
  if (hasCat(item, /weapon|slashing|piercing|bludgeoning|archery|^arrow$|^ammo$/i)) return true;
  const slots = slotList(item);
  return slots.length > 0 && slots.every((s) => WEAPON_SLOTS.has(s));
}

function isArmor(item) {
  if (item.kind === "armor" || item.kind === "shield") return true;
  if (hasCat(item, /^armor$|^chest$|^head$|^legs$|^feet$|^hands$|^back$|^shoulders$|^wrist$|^waist$|^face$/i)) return true;
  return slotList(item).some((s) => ARMOR_SLOTS.has(s));
}

function isJewelry(item) {
  if (item.kind === "jewelry") return true;
  if (hasCat(item, /^jewelry$|^neck$|^ear$|^finger$/i)) return true;
  const slots = slotList(item);
  return slots.length > 0 && slots.every((s) => JEWEL_SLOTS.has(s));
}

function isBag(item) {
  if (hasCat(item, /bag|container/i)) return true;
  return slotList(item).some((s) => BAG_SLOTS.has(s));
}

function nameHas(item, re) {
  return re.test(item.name || "");
}

function looseNameHit(item, keywords, fallback) {
  if (!isLoose(item)) return false;
  const words = keywords?.length ? keywords : fallback;
  const name = String(item.name || "").toLowerCase();
  return words.some((word) => name.includes(word));
}

function isNoDrop(item) {
  return NO_DROP.test(String(item.nodrop || "").trim());
}

const CATEGORY_TESTS = [
  { phrases: ["all weapons", "weapons", "weapon", "blacksmithed items"], test: isWeapon },
  { phrases: ["various armor drops", "armor", "armors"], test: isArmor },
  { phrases: ["cloth armor", "tailored armor"], test: (item) => isArmor(item) && nameHas(item, /cloth|robe/i) },
  { phrases: ["leather armor", "leather"], test: (item) => isArmor(item) && nameHas(item, /leather|rawhide/i) },
  { phrases: ["chain armor"], test: (item) => isArmor(item) && nameHas(item, /chain/i) },
  { phrases: ["plate armor"], test: (item) => isArmor(item) && nameHas(item, /plate/i) },
  { phrases: ["boots"], test: (item) => slotList(item).includes("FEET") },
  { phrases: ["jewelry"], test: isJewelry },
  { phrases: ["bags", "bags and packs"], test: isBag },
  { phrases: ["torches"], test: (item) => nameHas(item, /\btorch/i) },
  { phrases: ["food"], test: (item) => hasCat(item, /^food$/i) },
  { phrases: ["drinks", "drink"], test: (item) => hasCat(item, /^drink$/i) },
  { phrases: ["herbs", "herb"], test: (item) => hasCat(item, /^herb$/i) || (isLoose(item) && nameHas(item, /\bherb\b/i)) },
  { phrases: ["fish"], test: (item) => isLoose(item) && nameHas(item, /\bfish\b/i) },
  { phrases: ["vegetables", "various vegetables"], test: (item) => isLoose(item) && nameHas(item, /carrot|pepper|mushroom|potato|cabbage|onion|turnip/i) },
  { phrases: ["thread", "threads"], test: (item) => isLoose(item) && nameHas(item, /\bthreads?\b/i) },
  { phrases: ["cloth scraps", "tailoring material"], test: (item) => isLoose(item) && nameHas(item, /cloth scrap|tattered cloth/i) },
  { phrases: ["hides", "pelts and hides"], test: (item) => isLoose(item) && nameHas(item, /\b(hide|pelt)s?\b/i) },
  { phrases: ["ores", "ore"], test: (item) => isLoose(item) && nameHas(item, /\bore\b/i) },
  { phrases: ["gems", "chipped gems"], test: (item) => isLoose(item) && nameHas(item, /\bgem\b|malachite|emerald|ruby|sapphire|topaz/i) },
  { phrases: ["wood"], test: (item) => isLoose(item) && nameHas(item, /\bwood\b/i) },
  { phrases: ["bandages"], test: (item) => nameHas(item, /bandage/i) },
  { phrases: ["carapaces"], test: (item) => isLoose(item) && nameHas(item, /carapace/i) },
  { phrases: ["metal scraps"], test: (item) => isLoose(item) && nameHas(item, /metal scrap/i) },
  { phrases: ["stones", "stone"], test: (item) => isLoose(item) && nameHas(item, /\bstone\b/i) },
  { phrases: ["resins", "resin"], test: (item) => isLoose(item) && nameHas(item, /\bresin\b/i) },
  { phrases: ["sealants"], test: (item) => isLoose(item) && nameHas(item, /sealant/i) },
  { phrases: ["limestone"], test: (item) => nameHas(item, /limestone/i) },
  { phrases: ["spell scrolls"], test: (item) => nameHas(item, /\bscroll\b/i) },
  { phrases: ["bait"], test: (item) => isLoose(item) && nameHas(item, /\b(grub|bait)\b/i) },
  { phrases: ["cauldrons"], test: (item) => nameHas(item, /cauldron/i) },
  {
    phrases: ["animal parts", "monster parts"],
    test: (item, keywords) => {
      if (!isLoose(item)) return false;
      const words = keywords?.length ? keywords : ["meat", "wing", "fur", "fang", "ear", "tooth", "eye", "egg", "skin", "hide", "gland", "tail", "silk", "pelt", "scale"];
      const name = String(item.name || "").toLowerCase();
      return words.some((w) => name.includes(w));
    },
  },
  {
    phrases: ["animal fur fangs silk"],
    test: (item) => isLoose(item) && nameHas(item, /\b(fur|fangs?|silk)\b/i),
  },
  {
    phrases: ["undead parts"],
    test: (item, keywords) => looseNameHit(item, keywords, ["bone", "skeleton", "zombie", "ghoul", "skull", "femur", "jawbone"]),
  },
  {
    phrases: ["skeleton parts"],
    test: (item, keywords) => looseNameHit(item, keywords, ["bone", "skeleton", "skull", "femur", "jawbone", "chip"]),
  },
];

function normPhrase(phrase) {
  return String(phrase || "")
    .toLowerCase()
    .replace(/armour/g, "armor")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function categoryMatches(item, entry) {
  const phrase = normPhrase(entry.phrase);
  if (phrase && phrase === normPhrase(item.name)) return true;
  let best = null;
  for (const rule of CATEGORY_TESTS) {
    for (const known of rule.phrases) {
      if (phrase === known || phrase.startsWith(`${known} `)) {
        if (!best || known.length > best.len) best = { len: known.length, test: rule.test };
      }
    }
  }
  if (!best) return false;
  return best.test(item, entry.keywords);
}

function sellMatches(item, merchants = loadMerchants()) {
  if (!item || isNoDrop(item)) return [];
  const wanted = String(item.name || "").trim().toLowerCase();
  if (!wanted) return [];
  const hits = [];
  for (const merchant of merchants) {
    const named = (merchant.items || []).some((name) => String(name).trim().toLowerCase() === wanted);
    const bought = named
      ? [item.name]
      : (merchant.categories || []).filter((entry) => categoryMatches(item, entry)).map((entry) => entry.phrase);
    if (!named && !bought.length) continue;
    hits.push({ ...merchant, bought });
  }
  return hits;
}

function placeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchVendorPoi(pois, zoneId, place, type) {
  const hay = placeKey(`${place} ${type}`);
  if (!hay || !zoneId) return null;
  let best = null;
  for (const poi of pois || []) {
    if (poi.zoneId !== zoneId) continue;
    const name = placeKey(poi.name);
    if (name.length < 4) continue;
    let score = 0;
    if (hay.includes(name)) score += 10 + name.length;
    else {
      const words = name.split(" ").filter((word) => word.length > 3);
      const hit = words.filter((word) => hay.includes(word)).length;
      if (words.length && hit === words.length) score += 6 + hit;
    }
    if (poi.kind === "vendor") score += 2;
    if (score > (best?.score || 0)) best = { poi, score };
  }
  return best && best.score >= 8 ? best.poi : null;
}

function sellStopsFor(item, zones = [], pois = [], merchants) {
  const stops = [];
  for (const merchant of sellMatches(item, merchants)) {
    const zoneNames = (merchant.zones || []).filter(Boolean);
    const targets = zoneNames.length ? zoneNames : [""];
    for (const zoneName of targets) {
      const zone = (zones || []).find((entry) => placeKey(entry.name) === placeKey(zoneName));
      const poi = zone ? matchVendorPoi(pois, zone.id, merchant.place, merchant.type) : null;
      stops.push({
        name: merchant.name,
        type: merchant.type || merchant.name,
        zone: zoneName,
        zoneId: zone?.id || "",
        place: merchant.place || "",
        poiId: poi?.id || "",
        pin: poi?.name || "",
        buys: (merchant.bought || []).join(", "),
      });
    }
  }
  return stops;
}

function formatSellTo(matches) {
  if (!matches.length) return "no known vendor";
  const groups = new Map();
  for (const merchant of matches) {
    const type = merchant.type || merchant.name;
    const where = [merchant.zones.filter(Boolean).join(", "), merchant.place].filter(Boolean).join(" — ");
    if (!groups.has(type)) groups.set(type, []);
    const list = groups.get(type);
    if (where && !list.includes(where)) list.push(where);
  }
  return [...groups.entries()]
    .map(([type, places]) => (places.length ? `${type}: ${places.join("; ")}` : type))
    .join(" | ");
}

function sellToFor(item, merchants) {
  return formatSellTo(sellMatches(item, merchants));
}

module.exports = {
  BUYS_PATH,
  cleanMerchant,
  loadMerchants,
  sellMatches,
  sellStopsFor,
  matchVendorPoi,
  sellToFor,
  isNoDrop,
};
