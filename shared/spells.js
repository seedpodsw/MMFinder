/**
 * Spell browser helpers for the class lists compiled by FuStv1337.
 * Data and tag model: https://github.com/FuStv1337/MnMWebsite
 * Site: https://fustv1337.github.io/MnMWebsite
 */

export const TAG_LABELS = {
  damage: "Damage",
  dot: "DoT",
  heal: "Heal",
  hot: "HoT",
  song: "Song",
  buff: "Buff",
  debuff: "Debuff",
  "crowd-control": "CC",
  stun: "Stun",
  mez: "Mez",
  root: "Root",
  interrupt: "Interrupt",
  silence: "Silence",
  fear: "Fear",
  taunt: "Taunt",
  shield: "Shield",
  thorns: "Thorns",
  dispel: "Dispel",
  purge: "Purge",
  cure: "Cure",
  summon: "Summon",
  portal: "Portal",
  escape: "Escape",
  teleport: "Teleport",
  invisibility: "Invis",
  resurrection: "Rez",
  stance: "Stance",
  slow: "Slow",
  haste: "Haste",
  exhaust: "Exhaust",
  movement: "Movement",
  utility: "Utility",
  self: "Self",
  pet: "Pet",
  charm: "Charm",
  aoe: "AOE",
  "mana-drain": "Mana Drain",
};

export const TAG_COLORS = {
  damage: "#e85555",
  dot: "#e07848",
  aoe: "#d45050",
  heal: "#4cb87a",
  hot: "#42b8a8",
  song: "#d4a830",
  buff: "#4a88e8",
  debuff: "#a858e0",
  "crowd-control": "#8060e0",
  stun: "#e8c040",
  mez: "#9870d8",
  root: "#52a048",
  interrupt: "#d07050",
  silence: "#6888a0",
  fear: "#906878",
  taunt: "#c08850",
  shield: "#3aa8d8",
  thorns: "#7a9858",
  dispel: "#7898b0",
  purge: "#b87898",
  cure: "#58b868",
  summon: "#b89060",
  portal: "#9888d8",
  escape: "#88a8c8",
  teleport: "#5890b8",
  invisibility: "#687888",
  resurrection: "#d8c050",
  stance: "#b87848",
  slow: "#6090b0",
  haste: "#e8b840",
  exhaust: "#907088",
  movement: "#48b8c8",
  utility: "#889098",
  self: "#a89878",
  pet: "#907860",
  charm: "#a88868",
  "mana-drain": "#6888d8",
};

export const STAT_FILTER_GROUPS = [
  { id: "attributes", color: "#c9785a", stats: ["STR", "DEX", "AGI", "INT", "WIS", "CHA", "STA"] },
  { id: "vitality", color: "#5ab87a", stats: ["MAX HP", "HP REGEN", "MANA"] },
  { id: "defense", color: "#5aa8c9", stats: ["AC", "BLOCK", "DEF"] },
  { id: "resists", color: "#7a5ae0", stats: ["MR", "FR", "CR", "PR", "DR", "HR", "COR", "ER"] },
  { id: "combat", color: "#e0885a", stats: ["ATK", "CAST", "MS", "OFF", "DMG", "THREAT"] },
];

const STAT_TAGS = new Set(STAT_FILTER_GROUPS.flatMap((group) => group.stats));
const STAT_TAG_COLOR = "#7a8a9a";

export const QUICK_TAG_GROUPS = [
  { id: "damage", label: "Damage", tags: ["damage", "dot", "aoe"], color: TAG_COLORS.damage },
  { id: "heal", label: "Heal", tags: ["heal", "hot"], color: TAG_COLORS.heal },
  {
    id: "buff",
    label: "Buff",
    tags: ["buff", "shield", "thorns", "haste", "stance", "self"],
    color: TAG_COLORS.buff,
  },
  {
    id: "debuff",
    label: "Debuff",
    tags: ["debuff", "slow", "exhaust", "mana-drain"],
    color: TAG_COLORS.debuff,
  },
  {
    id: "crowd-control",
    label: "CC",
    tags: ["crowd-control", "stun", "mez", "root", "fear", "silence"],
    color: TAG_COLORS["crowd-control"],
  },
  { id: "interrupt", label: "Interrupt", tags: ["interrupt"], color: TAG_COLORS.interrupt },
  { id: "taunt", label: "Taunt", tags: ["taunt"], color: TAG_COLORS.taunt },
  { id: "pet", label: "Pet", tags: ["pet", "charm", "summon"], color: TAG_COLORS.pet },
  { id: "song", label: "Song", tags: ["song"], color: TAG_COLORS.song },
  {
    id: "utility",
    label: "Utility",
    tags: [
      "utility",
      "dispel",
      "purge",
      "cure",
      "portal",
      "escape",
      "teleport",
      "invisibility",
      "resurrection",
      "movement",
    ],
    color: TAG_COLORS.utility,
  },
];

export const SORT_OPTIONS = [
  { value: "level-asc", label: "Level (low → high)" },
  { value: "level-desc", label: "Level (high → low)" },
  { value: "name-asc", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
  { value: "mana-asc", label: "Mana (low → high)" },
  { value: "mana-desc", label: "Mana (high → low)" },
  { value: "cast-asc", label: "Cast time (fast → slow)" },
  { value: "cast-desc", label: "Cast time (slow → fast)" },
  { value: "value-desc", label: "Value (high → low)" },
  { value: "value-asc", label: "Value (low → high)" },
];

const TAG_DISPLAY_ORDER = QUICK_TAG_GROUPS.flatMap((group) => group.tags);
const tagDisplayIndex = new Map(TAG_DISPLAY_ORDER.map((tag, index) => [tag, index]));

export function tagLabel(tag) {
  return TAG_LABELS[tag] || tag;
}

export function getTagColor(tag) {
  if (STAT_TAGS.has(tag)) {
    const group = STAT_FILTER_GROUPS.find((item) => item.stats.includes(tag));
    return group?.color || STAT_TAG_COLOR;
  }
  return TAG_COLORS[tag] || "#888";
}

export function sortDisplayTags(tags, primaryTag = null) {
  return [...tags].sort((a, b) => {
    if (a === primaryTag) return -1;
    if (b === primaryTag) return 1;
    const indexDiff = (tagDisplayIndex.get(a) ?? 999) - (tagDisplayIndex.get(b) ?? 999);
    if (indexDiff !== 0) return indexDiff;
    return a.localeCompare(b);
  });
}

export function sortAvailableTags(availableTags) {
  return [...availableTags].sort((a, b) => {
    const indexDiff = (tagDisplayIndex.get(a.tag) ?? 999) - (tagDisplayIndex.get(b.tag) ?? 999);
    if (indexDiff !== 0) return indexDiff;
    return a.tag.localeCompare(b.tag);
  });
}

export function getQuickGroupMemberTags(group, availableTags) {
  const available = new Set(availableTags.map(({ tag }) => tag));
  return group.tags.filter((tag) => available.has(tag));
}

export function isQuickGroupActive(group, availableTags, selectedTags) {
  const members = getQuickGroupMemberTags(group, availableTags);
  if (!members.length) return false;
  return members.every((tag) => selectedTags.has(tag));
}

export function toggleQuickGroup(group, availableTags, selectedTags) {
  const members = getQuickGroupMemberTags(group, availableTags);
  const allActive = members.every((tag) => selectedTags.has(tag));
  const next = new Set(selectedTags);
  for (const tag of members) {
    if (allActive) next.delete(tag);
    else next.add(tag);
  }
  return next;
}

export function quickGroupTitle(group, availableTags) {
  return getQuickGroupMemberTags(group, availableTags).map(tagLabel).join(", ");
}

export function parseMana(mana) {
  if (mana === "Innate" || mana === "" || mana == null) return null;
  const n = Number(mana);
  return Number.isFinite(n) ? n : null;
}

export function parseCastTime(castTime) {
  if (!castTime) return null;
  const match = String(castTime).match(/([\d.]+)/);
  return match ? Number(match[1]) : null;
}

export function getMaxEffectValue(entry) {
  if (!entry.effects?.length) return null;
  return Math.max(...entry.effects.map((effect) => effect.sortKey || 0));
}

export function filterEntries(entries, filters) {
  const { search, tags, levelMin, levelMax, primaryTagOnly } = filters;
  const query = (search || "").trim().toLowerCase();

  return entries.filter((entry) => {
    if (query) {
      const haystack = `${entry.name} ${entry.description} ${entry.category || ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (tags && tags.size > 0) {
      const entryTags = entry.tags || [];
      const matches = primaryTagOnly
        ? tags.has(entry.primaryTag)
        : [...tags].some((tag) => entryTags.includes(tag));
      if (!matches) return false;
    }

    if (levelMin != null && entry.level < levelMin) return false;
    if (levelMax != null && entry.level > levelMax) return false;
    return true;
  });
}

export function sortEntries(entries, sortKey) {
  const [column, dir] = String(sortKey || "level-asc").split("-");
  const mult = dir === "desc" ? -1 : 1;

  return [...entries].sort((a, b) => {
    let cmp = 0;
    switch (column) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "mana": {
        const ma = parseMana(a.mana);
        const mb = parseMana(b.mana);
        if (ma == null && mb == null) cmp = 0;
        else if (ma == null) cmp = 1;
        else if (mb == null) cmp = -1;
        else cmp = ma - mb;
        break;
      }
      case "cast": {
        const ca = parseCastTime(a.castTime);
        const cb = parseCastTime(b.castTime);
        if (ca == null && cb == null) cmp = 0;
        else if (ca == null) cmp = 1;
        else if (cb == null) cmp = -1;
        else cmp = ca - cb;
        break;
      }
      case "category":
        cmp = (a.category || "").localeCompare(b.category || "");
        break;
      case "value": {
        const va = getMaxEffectValue(a);
        const vb = getMaxEffectValue(b);
        if (va == null && vb == null) cmp = 0;
        else if (va == null) cmp = 1;
        else if (vb == null) cmp = -1;
        else cmp = va - vb;
        break;
      }
      case "level":
      default:
        cmp = a.level - b.level || a.name.localeCompare(b.name);
        break;
    }
    return cmp * mult;
  });
}

export function getAvailableTags(entries) {
  const counts = new Map();
  for (const entry of entries) {
    for (const tag of entry.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()].map(([tag, count]) => ({ tag, count }));
}

export function entryKey(entry) {
  return `${entry.level}-${entry.slug || entry.name}`;
}

export function classFileId(meta) {
  return String(meta.file || "")
    .replace(/^classes\//, "")
    .replace(/\.json$/, "");
}
