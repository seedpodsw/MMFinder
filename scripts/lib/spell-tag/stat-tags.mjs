/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/** Maps normalized stat names to short tag abbreviations. */
export const STAT_TAG_MAP = {
  strength: 'STR',
  str: 'STR',
  dexterity: 'DEX',
  dex: 'DEX',
  agility: 'AGI',
  agi: 'AGI',
  intelligence: 'INT',
  int: 'INT',
  wisdom: 'WIS',
  wis: 'WIS',
  charisma: 'CHA',
  cha: 'CHA',
  stamina: 'STA',
  sta: 'STA',
  hp: 'MAX HP',
  health: 'MAX HP',
  'maximum health': 'MAX HP',
  'max health': 'MAX HP',
  ac: 'AC',
  'armor class': 'AC',
  'magic resistance': 'MR',
  mr: 'MR',
  'fire resistance': 'FR',
  'cold resistance': 'CR',
  'poison resistance': 'PR',
  'disease resistance': 'DR',
  'holy resistance': 'HR',
  'corruption resistance': 'COR',
  'electricity resistance': 'ER',
  'movement speed': 'MS',
  'attack speed': 'ATK',
  'casting speed': 'CAST',
  'melee attack speed': 'ATK',
  'ranged attack speed': 'ATK',
  'melee and ranged attack speed': 'ATK',
  'mana regeneration': 'MANA',
  'health regeneration': 'HP REGEN',
  'health regen': 'HP REGEN',
  block: 'BLOCK',
  offense: 'OFF',
  defense: 'DEF',
  'physical damage': 'DMG',
  'magic damage': 'DMG',
  threat: 'THREAT',
};

/** Stats that are typically expressed as percentages in-game. */
export const PERCENT_STATS = new Set([
  'movement speed',
  'attack speed',
  'casting speed',
  'melee attack speed',
  'ranged attack speed',
  'melee and ranged attack speed',
  'physical damage',
  'magic damage',
  'damage',
  'max health',
  'maximum health',
]);

/**
 * @param {string} stat
 */
export function normalizeStatName(stat) {
  const cleaned = stat
    .trim()
    .replace(/^(?:their|your|maximum|max|and)\s+/i, '')
    .replace(/\s+of\s+(?:you\s+and\s+)?(?:your\s+)?group\b/i, '')
    .replace(/\bspeedy\b/gi, 'speed')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  // Common wiki typos in compound stat lists
  if (cleaned === 'ability') return 'agility';

  return cleaned;
}

/**
 * @param {string} stat
 */
export function statToTag(stat) {
  const key = normalizeStatName(stat);

  if (/health regeneration|health regen/.test(key)) return 'HP REGEN';
  if (key === 'hp' || key === 'health' || /max(?:imum)? health/.test(key)) return 'MAX HP';
  if (/melee and ranged attack speed/.test(key)) return 'ATK';
  if (/attack speed/.test(key) && !/casting/.test(key)) return 'ATK';

  return STAT_TAG_MAP[key] || null;
}

/**
 * @param {object[]} effects
 * @param {string} [description]
 */
export function extractStatTags(effects = []) {
  /** @type {Set<string>} */
  const tags = new Set();

  for (const effect of effects) {
    if (effect.statTag) tags.add(effect.statTag);
    if (effect.stat) {
      const tag = statToTag(effect.stat);
      if (tag) tags.add(tag);
    }
  }

  return [...tags].sort();
}

/**
 * @param {boolean} isDebuff
 * @param {number} min
 * @param {number} [max]
 */
export function formatPercentDisplay(isDebuff, min, max) {
  const sign = isDebuff ? '−' : '+';
  const value = max != null && max !== min ? `${min}–${max}%` : `${min}%`;
  return `${sign}${value}`;
}
