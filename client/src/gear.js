// Shared gear helpers: class usability, slot maps, and role-weighted scoring.

/** class id (server CLASSES) -> {{ItemBox}} class abbreviation(s). */
export const CLASS_ABBR = {
  archer: ["ARC"],
  bard: ["BRD"],
  beastmaster: ["BST"],
  cleric: ["CLR"],
  druid: ["DRU"],
  elementalist: ["ELE"],
  enchanter: ["ENC"],
  fighter: ["FTR"],
  inquisitor: ["INQ"],
  monk: ["MNK"],
  necromancer: ["NEC"],
  paladin: ["PAL"],
  ranger: ["RNG"],
  rogue: ["ROG"],
  "shadow-knight": ["SHD", "SHAD"],
  shaman: ["SHM"],
  spellblade: ["SPB"],
  wizard: ["WIZ"],
};

export const ALL_CLASS_TOKENS = new Set(["ALL", "ALLCLASSES", "ANY"]);

/** Primary stat used to weight upgrades per class. */
export const CLASS_PRIMARY = {
  archer: "dex",
  bard: "cha",
  beastmaster: "wis",
  cleric: "wis",
  druid: "wis",
  elementalist: "int",
  enchanter: "int",
  fighter: "str",
  inquisitor: "wis",
  monk: "str",
  necromancer: "int",
  paladin: "wis",
  ranger: "wis",
  rogue: "dex",
  "shadow-knight": "int",
  shaman: "wis",
  spellblade: "int",
  wizard: "int",
};

/** Role-based weights for scoring an item as an upgrade. */
export const ROLE_WEIGHTS = {
  tank: { ac: 1.5, hp: 1.0, mana: 0.0, primary: 0.8, attr: 0.4, resist: 0.6, ratio: 0.4, dmg: 0.2, haste: 0.3 },
  healer: { ac: 0.8, hp: 0.7, mana: 1.0, primary: 1.0, attr: 0.3, resist: 0.4, ratio: 0.0, dmg: 0.0, haste: 0.0 },
  caster: { ac: 0.5, hp: 0.6, mana: 1.0, primary: 1.0, attr: 0.3, resist: 0.3, ratio: 0.0, dmg: 0.0, haste: 0.0 },
  dps: { ac: 0.7, hp: 0.7, mana: 0.1, primary: 0.8, attr: 0.5, resist: 0.3, ratio: 1.2, dmg: 0.6, haste: 0.8 },
  support: { ac: 0.7, hp: 0.7, mana: 0.6, primary: 0.7, attr: 0.4, resist: 0.3, ratio: 0.5, dmg: 0.3, haste: 0.4 },
};

/** Equipment slots in display order. `alias` merges wiki variants. */
export const EQUIP_SLOTS = [
  { key: "PRIMARY", label: "Primary", weapon: true },
  { key: "SECONDARY", label: "Secondary", weapon: true },
  { key: "RANGE", label: "Range", weapon: true, alias: ["RANGED"] },
  { key: "AMMO", label: "Ammo" },
  { key: "HEAD", label: "Head" },
  { key: "FACE", label: "Face" },
  { key: "NECK", label: "Neck" },
  { key: "SHOULDERS", label: "Shoulders" },
  { key: "BACK", label: "Back" },
  { key: "CHEST", label: "Chest" },
  { key: "SHIRT", label: "Shirt" },
  { key: "WRIST", label: "Wrist" },
  { key: "HANDS", label: "Hands" },
  { key: "FINGER", label: "Finger" },
  { key: "WAIST", label: "Waist", alias: ["BELT"] },
  { key: "LEGS", label: "Legs" },
  { key: "FEET", label: "Feet" },
];

const ATTRS = ["str", "sta", "agi", "dex", "int", "wis", "cha"];
const RESISTS = ["cr", "cor", "dr", "er", "fr", "hr", "mr", "pr"];

export function tokensOf(value) {
  return String(value || "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
}

export function num(value) {
  if (value == null || value === "") return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** True if an item is usable by the given class id (empty class => usable by all). */
export function canUseByClass(item, classId) {
  if (!classId) return true;
  const abbrs = CLASS_ABBR[classId] || [];
  const tokens = tokensOf(item.class);
  if (tokens.length === 0) return true;
  if (tokens.some((t) => ALL_CLASS_TOKENS.has(t))) return true;
  return tokens.some((t) => abbrs.includes(t));
}

/** True if the item is farmable at or below `level` (unknown level counts as yes). */
export function farmableAtLevel(item, level) {
  const min = item.levelMin;
  if (min == null || min === "") return true;
  return Number(min) <= (Number(level) || 0);
}

/** Uppercase slot tokens for an item. */
export function itemSlotTokens(item) {
  return tokensOf(item.slot);
}

export function matchesSlot(item, slotDef) {
  const tokens = itemSlotTokens(item);
  if (tokens.includes(slotDef.key)) return true;
  return (slotDef.alias || []).some((a) => tokens.includes(a));
}

/** Weighted upgrade score for an item, given role + primary stat + weapon-ness. */
export function scoreItem(item, role, primaryStat, isWeapon) {
  const w = ROLE_WEIGHTS[role] || ROLE_WEIGHTS.dps;
  const attrSum = ATTRS.reduce((s, k) => s + num(item[k]), 0);
  const resistSum = RESISTS.reduce((s, k) => s + num(item[k]), 0);
  const dmg = num(item.dmg);
  const delay = num(item.delay);
  const ratio = isWeapon && dmg > 0 && delay > 0 ? (dmg / delay) * 100 : 0;

  let score = 0;
  score += num(item.ac) * w.ac;
  score += num(item.hp) * w.hp;
  score += num(item.mana) * w.mana;
  score += num(item.hp_regen) * (w.hp * 2);
  score += num(item.mana_regen) * (w.mana * 2);
  score += (primaryStat ? num(item[primaryStat]) : 0) * w.primary;
  score += attrSum * w.attr;
  score += resistSum * w.resist;
  score += ratio * w.ratio;
  score += dmg * w.dmg;
  score += num(item.haste) * w.haste;
  score += num(item.spell_haste) * w.haste;
  score += num(item.ranged_haste) * (isWeapon ? w.haste : 0);
  if (item.effect || item.effect1) score += 5; // proc/effect bump
  return Math.round(score * 10) / 10;
}

/** Short human stat summary for a card. */
export function statSummary(item, isWeapon) {
  const bits = [];
  const dmg = num(item.dmg);
  const delay = num(item.delay);
  if (isWeapon && dmg) bits.push(`${dmg}/${delay || "?"} dmg/dly`);
  if (num(item.ac)) bits.push(`AC ${num(item.ac)}`);
  if (num(item.hp)) bits.push(`HP ${num(item.hp)}`);
  if (num(item.mana)) bits.push(`Mana ${num(item.mana)}`);
  for (const k of ATTRS) {
    const v = num(item[k]);
    if (v) bits.push(`${k.toUpperCase()} ${v > 0 ? "+" : ""}${v}`);
  }
  const resist = RESISTS.reduce((s, k) => s + num(item[k]), 0);
  if (resist) bits.push(`Resists +${resist}`);
  if (item.effect || item.effect1) bits.push("Effect");
  return bits.slice(0, 6).join(" · ");
}

/**
 * Rank upgrades per slot.
 * @returns [{ slot, label, weapon, items: [{item, score, summary}] }]
 */
export function bestUpgrades(items, { classId, role, level, onlyFarmable = true, slotKey = "", perSlot = 5 }) {
  const primaryStat = CLASS_PRIMARY[classId] || "str";
  const slots = slotKey ? EQUIP_SLOTS.filter((s) => s.key === slotKey) : EQUIP_SLOTS;

  const usable = (items || []).filter(
    (it) => canUseByClass(it, classId) && (!onlyFarmable || farmableAtLevel(it, level))
  );

  const out = [];
  for (const slotDef of slots) {
    const matches = usable.filter((it) => matchesSlot(it, slotDef));
    const ranked = matches
      .map((item) => ({
        item,
        score: scoreItem(item, role, primaryStat, slotDef.weapon),
        summary: statSummary(item, slotDef.weapon),
      }))
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .slice(0, perSlot);
    out.push({ slot: slotDef.key, label: slotDef.label, weapon: !!slotDef.weapon, items: ranked });
  }
  return out;
}
