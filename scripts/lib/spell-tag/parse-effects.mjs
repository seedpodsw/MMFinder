/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Parse numeric effects from spell/ability descriptions.
 * @typedef {{ kind: string, display: string, sortKey: number, stat?: string, statTag?: string, unit?: string, [key: string]: unknown }} Effect
 */

import {
  normalizeStatName,
  statToTag,
  formatPercentDisplay,
  extractStatTags,
} from './stat-tags.mjs';
import { parseEffectDurationSeconds } from './dot-spell.mjs';

const DAMAGE_TYPES =
  /(?:Cold|Fire|Holy|Magic|Physical|Melee|Poison|Disease|Shadow|Lightning|Electricity|Arcane|Nature)\s+Damage|Damage/i;

const DAMAGE_TYPE_NAMES =
  'Cold|Fire|Holy|Magic|Physical|Melee|Poison|Disease|Shadow|Lightning|Electricity|Arcane|Nature';

const EFFECT_LABEL =
  `(?:(?:${DAMAGE_TYPE_NAMES})\\s+)?Damage|Health|health|Mana|damage received|Experience|(?:points?\\s+of\\s+(?:${DAMAGE_TYPE_NAMES})\\s+)?Damage`;

const ACTION_VERBS =
  'dealing|deals|restoring|restore|healing|heals|for|absorbing|absorbs|recovering|recovers|causing|cause|burns|burn|striking|strikes|inflicting|inflicts|granting|grants|draining|drains|siphons|siphon|assaulting|assaults|smite|smites|engulfing|engulfs|unleashing|unleashes|launching|launches|bursting|bursts|hitting|hits';

/**
 * @param {string} description
 */
function normalizeDescription(description) {
  return description
    .replace(/\s+/g, ' ')
    // Expand attributes sharing a level-scaled value so every stat is parsed.
    .replace(/\b(increasing|decreasing|reducing)\s+(?:(?:their|your|the)\s+)?((?:Strength|Stamina|Dexterity|Agility|Intelligence|Wisdom|Charisma)(?:\s*(?:,\s*(?:and\s+)?|and\s+)(?:Strength|Stamina|Dexterity|Agility|Intelligence|Wisdom|Charisma))+)(?:\s+of\s+you\s+and\s+your\s+group)?\s+by\s+(\d+(?:\.\d+)?\s*\(L\d+\)\s+to\s+\d+(?:\.\d+)?\s*\(L\d+\))/gi,
      (_, verb, list, value) => list.match(/Strength|Stamina|Dexterity|Agility|Intelligence|Wisdom|Charisma/gi)
        .map((stat) => `${verb} ${stat} by ${value}`).join('; '))
    .replace(/(\d+(?:\.\d+)?)\s*\(L(\d+)\s+(?!(?:up to|to)\s)([A-Z][\w\s]*(?:Damage|Health|Mana|Resistance|Speed|AC|HP))/gi, '$1 (L$2) $3')
    .trim();
}

/**
 * @param {string} label
 */
function cleanDamageType(label) {
  return label
    .replace(/^points?\s+of\s+/i, '')
    .replace(/\s+to\s+targets\s+within\s+the\s+affected\s+area/i, '')
    .replace(/\s*Damage\s*Variance?/i, '')
    .replace(/\s*Damage/i, '')
    .trim() || 'dmg';
}

/**
 * @param {string} label
 * @param {number} min
 * @param {number} max
 * @param {number} [minLevel]
 * @param {number} [maxLevel]
 * @param {boolean} [isPercent]
 */
function formatScaledEffect(label, min, max, minLevel, maxLevel, isPercent = false) {
  const lvl = levelRangeLabel(min, max, minLevel, maxLevel);
  const val = isPercent ? `${valueRange(min, max)}%` : valueRange(min, max);

  if (/health/i.test(label)) {
    return { kind: 'heal', min, max, minLevel, maxLevel, display: `${val} heal${lvl}`, sortKey: max };
  }
  if (DAMAGE_TYPES.test(label) || /damage variance/i.test(label)) {
    const dmgType = cleanDamageType(label);
    const val = isPercent ? `${valueRange(min, max)}%` : valueRange(min, max);
    const dmgDisplay = dmgType === 'dmg' ? `${val} dmg${lvl}` : `${val} ${dmgType} dmg${lvl}`;
    return {
      kind: 'damage',
      min,
      max,
      minLevel,
      maxLevel,
      damageType: dmgType,
      display: dmgDisplay,
      sortKey: max,
    };
  }
  if (/%/.test(label) || /weapon ratio/i.test(label)) {
    return {
      kind: 'damage',
      min,
      max,
      minLevel,
      maxLevel,
      display: `${val} weapon dmg${lvl}`,
      sortKey: max,
    };
  }
  return {
    kind: 'buff',
    stat: label.trim(),
    min,
    max,
    minLevel,
    maxLevel,
    display: `+${val} ${label.trim()}${lvl}`,
    sortKey: max,
  };
}

/**
 * @param {number} min
 * @param {number} max
 * @param {number} [minLevel]
 * @param {number} [maxLevel]
 */
function levelRangeLabel(min, max, minLevel, maxLevel) {
  if (minLevel != null && maxLevel != null && (minLevel !== maxLevel || min !== max)) {
    return ` (L${minLevel}–L${maxLevel})`;
  }
  return '';
}

/**
 * @param {number} min
 * @param {number} max
 */
function valueRange(min, max) {
  return min === max ? String(min) : `${min}–${max}`;
}

/**
 * @param {string} description
 * @param {string | null} [primaryTag]
 * @returns {{ effects: Effect[], summary: string }}
 */
export function parseEffects(description, primaryTag = null) {
  if (!description) return { effects: [], summary: '' };

  /** @type {Effect[]} */
  const effects = [];
  const text = normalizeDescription(description);

  const add = (effect) => {
    if (!effect.display || /^for \d/i.test(effect.display)) return;
    if (effect.stat) {
      const tag = statToTag(effect.stat);
      if (tag === 'MS' && effect.kind === 'debuff') {
        effect.statTag = undefined;
      } else if (tag === 'ATK' && effect.kind === 'debuff') {
        effect.statTag = undefined;
      } else {
        effect.statTag = tag || undefined;
      }
    }
    effects.push(effect);
  };

  /**
   * @param {string} rawLabel
   * @param {number} amount
   * @param {boolean} [isPercent]
   * @param {string} [verb]
   */
  function addFlatEffect(rawLabel, amount, isPercent = false, verb = '') {
    const label = rawLabel.trim();
    const val = isPercent ? `${amount}%` : String(amount);
    const dmgType = cleanDamageType(label);
    const dmgDisplay = dmgType === 'dmg' ? `${val} dmg` : `${val} ${dmgType} dmg`;

    if (/health/i.test(label)) {
      add({ kind: 'heal', amount, display: `${val} heal`, sortKey: amount });
    } else if (/mana/i.test(label)) {
      add({ kind: 'resource', amount, display: `${val} mana`, sortKey: amount });
    } else if (/experience/i.test(label)) {
      add({ kind: 'utility', amount, display: `${val} XP`, sortKey: amount });
    } else if (/damage received|absorb/i.test(label) || (/^damage$/i.test(label) && /absorb/i.test(verb))) {
      add({ kind: 'shield', amount, display: `${val} absorb`, sortKey: amount });
    } else if (/damage/i.test(label)) {
      add({
        kind: 'damage',
        amount,
        damageType: dmgType,
        display: dmgDisplay,
        sortKey: amount,
      });
    }
  }

  /**
   * @param {string} stat
   * @param {boolean} isDebuff
   * @param {number} min
   * @param {number} [max]
   * @param {number} [minLevel]
   * @param {number} [maxLevel]
   */
  function addPercentStat(stat, isDebuff, min, max = min, minLevel, maxLevel) {
    const statName = stat.trim();
    if (isDebuff && /\bcost\b/i.test(statName)) {
      isDebuff = false;
    }
    const lvl =
      minLevel != null && maxLevel != null && (minLevel !== maxLevel || min !== max)
        ? ` (L${minLevel}–L${maxLevel})`
        : '';
    add({
      kind: isDebuff ? 'debuff' : 'buff',
      stat: statName,
      min,
      max,
      minLevel,
      maxLevel,
      unit: '%',
      display: `${formatPercentDisplay(isDebuff, min, max)}${lvl}`,
      sortKey: max,
    });
  }

  /**
   * @param {string} listStr
   */
  function splitStatList(listStr) {
    return listStr
      .replace(/\s+and\s+/gi, ',')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  /**
   * @param {string} rawStat
   * @param {number} val
   * @param {boolean} isDebuff
   * @param {boolean} [isPercent]
   */
  function addFlatStatEffect(rawStat, val, isDebuff, isPercent = false) {
    const statName = rawStat.trim().replace(/^(?:their|your|maximum|max|and)\s+/i, '');
    if (!statName) return;
    if (isDebuff && /\bcost\b/i.test(statName)) {
      isDebuff = false;
    }

    const canonical = normalizeStatName(statName);
    const displayName = canonical === 'agility' && /^ability$/i.test(statName) ? 'Agility' : statName;

    if (
      effects.some(
        (e) => e.stat && normalizeStatName(e.stat) === canonical && (e.amount === val || e.max === val)
      )
    ) {
      return;
    }

    add({
      kind: isDebuff ? 'debuff' : 'buff',
      stat: displayName,
      amount: val,
      unit: isPercent ? '%' : undefined,
      display: isPercent
        ? formatPercentDisplay(isDebuff, val)
        : `${isDebuff ? '−' : '+'}${val} ${displayName}`,
      sortKey: val,
    });
  }

  let match;

  let hasWeaponPlus = false;
  const weaponPlusRe =
    /(\d+(?:\.\d+)?)%\s*\(L(\d+)\)\s*(?:up to|to)\s*(\d+(?:\.\d+)?)%\s*\(L(\d+)\)\s+Weapon(?:\s+Ratio)?\s+Damage\s+plus\s+(\d+(?:\.\d+)?)\s*\(L(\d+)\)\s*(?:up to|to)\s*(\d+(?:\.\d+)?)\s*\(L(\d+)\)\s+([\w\s]+Damage)/gi;
  while ((match = weaponPlusRe.exec(text)) !== null) {
    hasWeaponPlus = true;
    const [, wMin, wMinL, wMax, wMaxL, pMin, , pMax, , pType] = match;
    add({
      kind: 'damage',
      display: `${valueRange(Number(wMin), Number(wMax))}% weapon + ${valueRange(Number(pMin), Number(pMax))} ${cleanDamageType(pType)} (L${wMinL}–L${wMaxL})`,
      sortKey: Number(pMax),
    });
  }

  // Flat weapon ratio: 50% Weapon Ratio Damage (optionally plus scaled damage parsed separately)
  const weaponRatioRe = /(\d+(?:\.\d+)?)%\s+Weapon(?:\s+Ratio)?\s+Damage/gi;
  while ((match = weaponRatioRe.exec(text)) !== null) {
    if (hasWeaponPlus) continue;
    add({
      kind: 'damage',
      display: `${match[1]}% weapon dmg`,
      sortKey: Number(match[1]),
    });
  }

  // Area DoT — tick damage within an affected area
  let areaDotHandled = false;

  const areaDotScaledRe =
    /dealing\s+(\d+(?:\.\d+)?)\s*\(L(\d+)\)\s*(?:up to|to)\s*(\d+(?:\.\d+)?)\s*\(L(\d+)\)\s+([\w\s]+?Damage)\s+to\s+targets\s+within\s+the\s+affected\s+area\s+every\s+(\d+(?:\.\d+)?)\s+seconds?(?:\s+for\s+(\d+(?:\.\d+)?)\s+seconds?)?/i;
  const areaDotScaledMatch = text.match(areaDotScaledRe);
  if (areaDotScaledMatch) {
    const [, minS, minLvl, maxS, maxLvl, dmgLabel, intervalS, durationS] = areaDotScaledMatch;
    const min = Number(minS);
    const max = Number(maxS);
    const interval = Number(intervalS);
    const duration = durationS ? Number(durationS) : undefined;
    const type = cleanDamageType(dmgLabel);
    const lvl = levelRangeLabel(min, max, Number(minLvl), Number(maxLvl));
    const tickDisplay = type === 'dmg' ? valueRange(min, max) + ' dmg' : `${valueRange(min, max)} ${type}`;
    const durationSuffix = duration ? ` (${duration}s)` : '';
    areaDotHandled = true;
    add({
      kind: 'dot',
      min,
      max,
      minLevel: Number(minLvl),
      maxLevel: Number(maxLvl),
      interval,
      duration,
      damageType: type,
      display: `${tickDisplay}/${interval}s${durationSuffix}${lvl}`,
      sortKey: max * (duration ? duration / interval : 1),
    });
  }

  const areaDotFlatRe =
    /dealing\s+(\d+(?:\.\d+)?)\s+([\w\s]+?Damage)\s+to\s+targets\s+within\s+the\s+affected\s+area\s+every\s+(\d+(?:\.\d+)?)\s+seconds?(?:\s+for\s+(\d+(?:\.\d+)?)\s+seconds?)?/i;
  if (!areaDotHandled) {
    const areaDotFlatMatch = text.match(areaDotFlatRe);
    if (areaDotFlatMatch) {
      const [, amountS, dmgLabel, intervalS, durationS] = areaDotFlatMatch;
      const amount = Number(amountS);
      const interval = Number(intervalS);
      const duration = durationS ? Number(durationS) : undefined;
      const type = cleanDamageType(dmgLabel);
      const tickDisplay = type === 'dmg' ? `${amount} dmg` : `${amount} ${type}`;
      const durationSuffix = duration ? ` (${duration}s)` : '';
      areaDotHandled = true;
      add({
        kind: 'dot',
        min: amount,
        max: amount,
        interval,
        duration,
        damageType: type,
        display: `${tickDisplay}/${interval}s${durationSuffix}`,
        sortKey: amount * (duration ? duration / interval : 1),
      });
    }
  }

  // X (L1) to/up to Y (L60) Cold Damage / Health / etc.
  const scaledRangeRe =
    /(\d+(?:\.\d+)?)%?\s*\(L(\d+)\)\s*(?:up to|to)\s*(\d+(?:\.\d+)?)%?\s*\(L(\d+)\)\s+([\w\s%]+?(?:Damage|Health|Variance|Speed|Resistance|AC|HP|Mana|Strength|Dexterity|Agility|Intelligence|Wisdom|Charisma|Block|Armor|Threat|Regeneration)[\w\s%]*?)(?=\.|,|\s+and\s+|\s+with\s+|\s+for\s+\d|\s+every\s+|$)/gi;
  while ((match = scaledRangeRe.exec(text)) !== null) {
    const [, minS, minLvl, maxS, maxLvl, rawLabel] = match;
    const label = rawLabel.trim();
    if (/^for\b/i.test(label)) continue;
    if (/within the affected area/i.test(label)) continue;
    if (
      /damage/i.test(label) &&
      /\bevery\s+\d+\s+seconds?/i.test(text.slice(match.index + match[0].length, match.index + match[0].length + 30))
    ) {
      continue;
    }
    const min = Number(minS);
    const max = Number(maxS);
    const minLevel = Number(minLvl);
    const maxLevel = Number(maxLvl);
    const isPercent = match[0].includes('%');
    const effect = formatScaledEffect(label, min, max, minLevel, maxLevel, isPercent);
    if (hasWeaponPlus && (effect.kind === 'damage' || /weapon/i.test(label))) continue;
    add(effect);
  }

  // Percent stat ranges: 40% (2.8) to 58% (2.60) or 40% (L8) to 60% (L60)
  const pctRangeRe =
    /(?:increasing|decreasing|reducing)(?:\s+(?:their|your|the|maximum|max|physical|magic))*\s+([\w\s]+?)\s+by\s+(\d+(?:\.\d+)?)%\s*\((?:L)?(\d+(?:\.\d+)?)\)\s*to\s*(\d+(?:\.\d+)?)%\s*\((?:L)?(\d+(?:\.\d+)?)\)/gi;
  while ((match = pctRangeRe.exec(text)) !== null) {
    const [, stat, minS, , maxS, ,] = match;
    addPercentStat(stat, /decreasing|reducing/i.test(match[0]), Number(minS), Number(maxS));
  }

  // Single percentage buffs/debuffs
  const pctRe =
    /(?:increasing|decreasing|reducing)(?:\s+(?:their|your|the|maximum|max|physical|magic))*\s+([\w\s]+?)\s+by\s+(\d+(?:\.\d+)?)%(?!\s*\([^)]+\)\s*to)/gi;
  while ((match = pctRe.exec(text)) !== null) {
    const [, stat, valS] = match;
    addPercentStat(stat, /decreasing|reducing/i.test(match[0]), Number(valS));
  }

  // HoT
  const hotRe =
    /restor(?:e|ing)\s+(\d+)\s+Health\s+and\s+an\s+additional\s+(\d+)\s+Health\s+every\s+(\d+)\s+seconds?\s+for\s+(\d+)\s+seconds?/i;
  const hotMatch = text.match(hotRe);
  if (hotMatch) {
    const [, initial, tick, interval, duration] = hotMatch;
    const total = Number(initial) + Number(tick) * (Number(duration) / Number(interval));
    add({
      kind: 'hot',
      initial: Number(initial),
      tick: Number(tick),
      interval: Number(interval),
      duration: Number(duration),
      display: `${initial} + ${tick}/${interval}s heal (${duration}s)`,
      sortKey: total,
    });
  }

  // Upfront damage plus a damage-over-time component
  const damageDotRe =
    /dealing\s+(\d+(?:\.\d+)?)\s+([\w\s]*?[Dd]amage)\s+and\s+an\s+additional\s+(\d+(?:\.\d+)?)\s+([\w\s]*?[Dd]amage)\s+every\s+(\d+)\s+seconds?\s+for\s+(\d+)\s+seconds?/i;
  const damageDotMatch = text.match(damageDotRe);
  if (damageDotMatch) {
    const [, upfrontS, upfrontLabel, tickS, tickLabel, intervalS, durationS] = damageDotMatch;
    const upfront = Number(upfrontS);
    const tick = Number(tickS);
    const interval = Number(intervalS);
    const duration = Number(durationS);
    const upfrontType = cleanDamageType(upfrontLabel);
    const tickType = cleanDamageType(tickLabel);
    const ticks = duration / interval;

    add({
      kind: 'damage',
      amount: upfront,
      damageType: upfrontType,
      display: upfrontType === 'dmg' ? `${upfront} dmg` : `${upfront} ${upfrontType} dmg`,
      sortKey: upfront,
    });
    add({
      kind: 'dot',
      min: tick,
      max: tick,
      interval,
      duration,
      damageType: tickType,
      display: `${tickType === 'dmg' ? `${tick} dmg` : `${tick} ${tickType}`}/${interval}s (${duration}s)`,
      sortKey: tick * ticks,
    });
  }

  // DoT with tick interval
  let pureDotHandled = false;

  const burnsDotRe =
    /\bburns?\s+your\s+target\s+for\s+(\d+(?:\.\d+)?)\s+seconds?,\s*dealing\s+(\d+(?:\.\d+)?)\s+([\w\s]+?)\s+every\s+(\d+(?:\.\d+)?)\s+seconds?/i;
  const burnsDotMatch = !damageDotMatch && text.match(burnsDotRe);
  if (burnsDotMatch) {
    const [, durationS, amountS, dmgLabel, intervalS] = burnsDotMatch;
    const amount = Number(amountS);
    const interval = Number(intervalS);
    const duration = Number(durationS);
    const type = cleanDamageType(dmgLabel);
    pureDotHandled = true;
    add({
      kind: 'dot',
      min: amount,
      max: amount,
      interval,
      duration,
      damageType: type,
      display: `${type === 'dmg' ? `${amount} dmg` : `${amount} ${type}`}/${interval}s (${duration}s)`,
      sortKey: amount * (duration / interval),
    });
  }

  const scaledDotRe =
    /dealing\s+(\d+(?:\.\d+)?)\s*\(L(\d+)\)\s*(?:up to|to)\s*(\d+(?:\.\d+)?)\s*\(L(\d+)\)\s+([\w\s]+?)\s+every\s+(\d+(?:\.\d+)?)\s+seconds?(?:\s+for\s+(\d+(?:\.\d+)?)\s+(seconds?|minutes?))?/i;
  const scaledDotMatch = !damageDotMatch && !burnsDotMatch && text.match(scaledDotRe);
  if (scaledDotMatch) {
    const [, minS, minLvl, maxS, maxLvl, dmgLabel, intervalS, durationS, durationUnit] = scaledDotMatch;
    const min = Number(minS);
    const max = Number(maxS);
    const interval = Number(intervalS);
    const duration =
      durationS != null
        ? durationUnit?.startsWith('minute')
          ? Number(durationS) * 60
          : Number(durationS)
        : parseEffectDurationSeconds(text, scaledDotMatch.index, scaledDotMatch[0].length);
    const type = cleanDamageType(dmgLabel);
    const lvl = levelRangeLabel(min, max, Number(minLvl), Number(maxLvl));
    const durationSuffix = duration ? ` (${duration}s)` : '';
    pureDotHandled = true;
    add({
      kind: 'dot',
      min,
      max,
      minLevel: Number(minLvl),
      maxLevel: Number(maxLvl),
      interval,
      duration,
      damageType: type,
      display: `${type === 'dmg' ? valueRange(min, max) + ' dmg' : `${valueRange(min, max)} ${type}`}/${interval}s${durationSuffix}${lvl}`,
      sortKey: max * (duration ? duration / interval : 1),
    });
  }

  const dotRe =
    /dealing\s+(\d+(?:\.\d+)?)\s*(?:\(L\d+\)\s*to\s*(\d+(?:\.\d+)?)\s*\(L\d+\)\s*)?([\w\s]+?\s+[Dd]amage|[\w\s]+?\s+damage)\s+every\s+(\d+(?:\.\d+)?)\s+seconds?(?:\s+for\s+(\d+(?:\.\d+)?)\s+(seconds?|minutes?))?/i;
  if (!damageDotMatch && !burnsDotMatch && !scaledDotMatch && !areaDotHandled) {
    const dotMatch = text.match(dotRe);
    if (dotMatch) {
      const [, minS, maxS, dmgType, intervalS, durationS, durationUnit] = dotMatch;
      const min = Number(minS);
      const max = maxS ? Number(maxS) : min;
      const interval = Number(intervalS);
      const duration =
        durationS != null
          ? durationUnit?.startsWith('minute')
            ? Number(durationS) * 60
            : Number(durationS)
          : parseEffectDurationSeconds(text, dotMatch.index, dotMatch[0].length);
      const type = cleanDamageType(dmgType);
      const ticks = duration ? duration / interval : 1;
      pureDotHandled = true;
      add({
        kind: 'dot',
        min,
        max,
        interval,
        duration,
        damageType: type,
        display: `${type === 'dmg' ? valueRange(min, max) + ' dmg' : `${valueRange(min, max)} ${type}`}/${interval}s${duration ? ` (${duration}s)` : ''}`,
        sortKey: max * ticks,
      });
    }
  }

  /**
   * @param {number} min
   * @param {number} [max]
   * @param {number} [minLevel]
   * @param {number} [maxLevel]
   */
  function addThornsEffect(min, max = min, minLevel, maxLevel) {
    const lvl = levelRangeLabel(min, max, minLevel, maxLevel);
    add({
      kind: 'thorns',
      min,
      max,
      minLevel,
      maxLevel,
      display: `${valueRange(min, max)} thorns/hit${lvl}`,
      sortKey: max,
    });
  }

  // Thorns / damage shields (retaliation when hit)
  const thornsWhenHitRe =
    /(?:Damage Shield that deals|damage shield that deals)\s+(\d+(?:\.\d+)?)(?:\s*\(L(\d+)\)\s*(?:up to|to)\s*(\d+(?:\.\d+)?)\s*\(L(\d+)\))?\s+damage when hit/gi;
  while ((match = thornsWhenHitRe.exec(text)) !== null) {
    const [, minS, minLvl, maxS, maxLvl] = match;
    addThornsEffect(
      Number(minS),
      maxS ? Number(maxS) : Number(minS),
      minLvl ? Number(minLvl) : undefined,
      maxLvl ? Number(maxLvl) : undefined
    );
  }

  const thornsDamageWhenHitRe = /Damage Shield that deals (\d+(?:\.\d+)?)\s+Damage when Hit/gi;
  while ((match = thornsDamageWhenHitRe.exec(text)) !== null) {
    addThornsEffect(Number(match[1]));
  }

  const thornsBacklashRe =
    /grants Damage Shield(?: Damage Shield)?\s+(\d+(?:\.\d+)?)\s*\(L(\d+)\)\s*(?:up to|to)\s*(\d+(?:\.\d+)?)\s*\(L(\d+)\)\s+Per Hit/gi;
  while ((match = thornsBacklashRe.exec(text)) !== null) {
    addThornsEffect(Number(match[1]), Number(match[3]), Number(match[2]), Number(match[4]));
  }

  const thornsPerHitRe =
    /(?:providing|granting|grants?)\s+(?:them|you|your\s+target\s+)?(?:a\s+)?Damage Shield with (\d+(?:\.\d+)?)\s+Damage(?:\s+Per Hit)?/gi;
  while ((match = thornsPerHitRe.exec(text)) !== null) {
    addThornsEffect(Number(match[1]));
  }

  // Target-type ward shields: "Wards an elemental target ... for 30 points of Magic Damage"
  const targetWardShieldRe =
    /\bwards?(?:\s+off)?\s+an?\s+[\w\s]+target\s+with\s+[\w\s]+?\s+for\s+(\d+(?:\.\d+)?)\s+points?\s+of\s+([\w\s]+?)Damage\.?/i;
  const targetWardMatch = text.match(targetWardShieldRe);
  if (targetWardMatch) {
    const [, amountS, typeLabel] = targetWardMatch;
    const amount = Number(amountS);
    const dmgType = cleanDamageType(`${typeLabel.trim()} Damage`);
    add({
      kind: 'shield',
      amount,
      damageType: dmgType,
      display: dmgType === 'dmg' ? `${amount} absorb` : `${amount} ${dmgType} absorb`,
      sortKey: amount,
    });
  }

  // Flat damage/heal/absorb
  const flatRe = new RegExp(
    `\\b(${ACTION_VERBS})\\s+(\\d+(?:\\.\\d+)?)(?:\\s*(?:points?\\s+of|%))?\\s+((?:${EFFECT_LABEL}|damage received))(?=\\b|\\.|,)`,
    'gi'
  );
  while ((match = flatRe.exec(text)) !== null) {
    const [full, verb, amountS, label] = match;
    if (/health/i.test(label) && /\bafter\s+\d/i.test(text.slice(match.index, match.index + full.length + 30))) {
      continue;
    }
    if (/mana/i.test(label) && /\bevery\s+(?:\d|second|minute)/i.test(text.slice(match.index, match.index + full.length + 20))) {
      continue;
    }
    if (/mana/i.test(label) && /\bfrom\s+(?:your\s+)?target/i.test(text.slice(match.index, match.index + full.length + 40))) {
      continue;
    }
    if (/damage/i.test(label) && /\bwhen hit/i.test(text.slice(match.index, match.index + full.length + 20))) {
      continue;
    }
    if (
      /damage/i.test(label) &&
      /\band an additional \d+[^.]{0,80}\bevery \d+\s+seconds?/i.test(
        text.slice(match.index, match.index + full.length + 120)
      )
    ) {
      continue;
    }
    if (
      /damage/i.test(label) &&
      /\bevery\s+\d+\s+seconds?/i.test(text.slice(match.index, match.index + full.length + 40))
    ) {
      continue;
    }
    if (/to targets within the affected area every/i.test(text.slice(match.index, match.index + full.length + 100))) {
      continue;
    }
    if (targetWardMatch && /\bfor \d+\s+points?\s+of/i.test(full)) {
      continue;
    }
    addFlatEffect(label, Number(amountS), full.includes('%'), verb);
  }

  // Percent heals: restoring 50% Health
  const pctHealRe = /\b(?:restoring|restore|healing|heals)\s+(?:them\s+for\s+)?(\d+(?:\.\d+)?)%\s+Health\b/gi;
  while ((match = pctHealRe.exec(text)) !== null) {
    addFlatEffect('Health', Number(match[1]), true);
  }

  // "healing them for 25 Health" / "targets of 30 points of Fire Damage"
  const healForRe = /\bhealing\s+them\s+for\s+(\d+(?:\.\d+)?)\s+Health\b/gi;
  while ((match = healForRe.exec(text)) !== null) {
    addFlatEffect('Health', Number(match[1]));
  }

  const aoeDamageRe =
    /\btargets?\s+of\s+(\d+(?:\.\d+)?)\s+points?\s+of\s+((?:[\w\s]+?)Damage)\b/gi;
  while ((match = aoeDamageRe.exec(text)) !== null) {
    addFlatEffect(match[2], Number(match[1]));
  }

  // Delayed heal: restoring 15 Health after 3 seconds
  const delayedHealRe =
    /\b(?:restoring|restore)\s+(\d+(?:\.\d+)?)\s+Health\s+after\s+(\d+(?:\.\d+)?)\s+seconds?/gi;
  while ((match = delayedHealRe.exec(text)) !== null) {
    add({
      kind: 'heal',
      amount: Number(match[1]),
      delay: Number(match[2]),
      display: `${match[1]} heal (${match[2]}s delay)`,
      sortKey: Number(match[1]),
    });
  }

  // Mana drain over time
  const manaDrainRe =
    /\b(?:draining|drains|siphons?)\s+(\d+(?:\.\d+)?)\s+Mana\s+every\s+(?:(\d+(?:\.\d+)?)\s+seconds?|second)/gi;
  while ((match = manaDrainRe.exec(text)) !== null) {
    const interval = match[2] || '1';
    add({
      kind: 'resource',
      amount: Number(match[1]),
      interval: Number(interval),
      display: `${match[1]} mana/${interval}s drain`,
      sortKey: Number(match[1]),
    });
  }

  const manaBurnRe =
    /\b(?:burns|burn)\s+(?:up to\s+)?(\d+(?:\.\d+)?)\s+Mana\s+from\s+(?:your\s+)?target/i;
  const manaBurnMatch = text.match(manaBurnRe);
  if (manaBurnMatch) {
    add({
      kind: 'resource',
      amount: Number(manaBurnMatch[1]),
      display: `${manaBurnMatch[1]} mana burn`,
      sortKey: Number(manaBurnMatch[1]),
    });
  }

  const manaDepleteRe = /\bdeplet(?:e|es|ing)\s+(\d+(?:\.\d+)?)\s+Mana/i;
  const manaDepleteMatch = text.match(manaDepleteRe);
  if (manaDepleteMatch && /\b(?:your|the)\s+target/i.test(text)) {
    add({
      kind: 'resource',
      amount: Number(manaDepleteMatch[1]),
      display: `${manaDepleteMatch[1]} mana drain`,
      sortKey: Number(manaDepleteMatch[1]),
    });
  }

  // Scaled stat buffs/debuffs
  const statScaledRe =
    /(?:increasing|decreasing|reducing)(?:\s+(?:their|your|the|maximum|max))*\s+([\w\s]+?)\s+by\s+(\d+(?:\.\d+)?)\s*\(L(\d+)\)\s*to\s*(\d+(?:\.\d+)?)\s*\(L(\d+)\)/gi;
  while ((match = statScaledRe.exec(text)) !== null) {
    const [, stat, minS, minLvl, maxS, maxLvl] = match;
    const min = Number(minS);
    const max = Number(maxS);
    const isDebuff = /decreasing|reducing/i.test(match[0]);
    add({
      kind: isDebuff ? 'debuff' : 'buff',
      stat: stat.trim(),
      min,
      max,
      minLevel: Number(minLvl),
      maxLevel: Number(maxLvl),
      display: `${isDebuff ? '−' : '+'}${valueRange(min, max)} ${stat.trim()} (L${minLvl}–L${maxLvl})`,
      sortKey: max,
    });
  }

  // Scaled stat after a shared list: "... Slashing by 5 and Dexterity by 1 (L1) to 15 (L60)"
  const andScaledStatRe =
    /\band\s+([\w\s]+?)\s+by\s+(\d+(?:\.\d+)?)\s*\(L(\d+)\)\s*(?:up to|to)\s*(\d+(?:\.\d+)?)\s*\(L(\d+)\)/gi;
  while ((match = andScaledStatRe.exec(text)) !== null) {
    const [, stat, minS, minLvl, maxS, maxLvl] = match;
    const statName = stat.trim();
    if (effects.some((e) => e.stat && normalizeStatName(e.stat) === normalizeStatName(statName) && e.max != null)) {
      continue;
    }
    add({
      kind: /decreasing|reducing/i.test(text.slice(0, match.index)) ? 'debuff' : 'buff',
      stat: statName,
      min: Number(minS),
      max: Number(maxS),
      minLevel: Number(minLvl),
      maxLevel: Number(maxLvl),
      display: `+${valueRange(Number(minS), Number(maxS))} ${statName} (L${minLvl}–L${maxLvl})`,
      sortKey: Number(maxS),
    });
  }

  // Increases/Decreases the Strength, Stamina... of a friendly target by 15
  const formalStatChangeRe =
    /(?:increase|increases|decrease|decreases)\s+(?:the\s+)?([\w\s,]+)\s+of\s+(?:a\s+)?(?:friendly\s+)?(?:target|your target|group member'?s?)\s+by\s+(\d+(?:\.\d+)?)(%?)/gi;
  while ((match = formalStatChangeRe.exec(text)) !== null) {
    const [, rawStats, valS, pct] = match;
    const isDebuff = /decrease/i.test(match[0]);
    const val = Number(valS);
    const isPercent = pct === '%';
    const stats = rawStats.includes(',') ? splitStatList(rawStats) : [rawStats.trim()];

    for (const statName of stats) {
      addFlatStatEffect(statName, val, isDebuff, isPercent);
    }
  }

  // Terse attribute buffs: "Increase Charisma by 2 for 1h."
  const terseAttributeBuffRe =
    /\b(?:increase|increases|decrease|decreases)\s+(?:the\s+)?(Strength|Dexterity|Agility|Intelligence|Wisdom|Charisma|Stamina)\s+by\s+(\d+(?:\.\d+)?)(%?)(?=\s+for|\s*\.|$)/gi;
  while ((match = terseAttributeBuffRe.exec(text)) !== null) {
    addFlatStatEffect(match[1], Number(match[2]), /decrease/i.test(match[0]), match[3] === '%');
  }

  // Slowing attack speed variant: slowing their Melee and Ranged Attack Speed by 30%
  const slowingRe = /\bslowing\s+(?:their|your)\s+([\w\s]+?)\s+by\s+(\d+(?:\.\d+)?)%/gi;
  while ((match = slowingRe.exec(text)) !== null) {
    addPercentStat(match[1], true, Number(match[2]));
  }

  const snareEffectRe =
    /\bapplying\s+a\s+(\d+(?:\.\d+)?)%\s+Snare\s+effect\s+for\s+(\d+)\s+minutes?/i;
  const snareMatch = text.match(snareEffectRe);
  if (snareMatch) {
    add({
      kind: 'debuff',
      stat: 'Movement Speed',
      amount: Number(snareMatch[1]),
      unit: '%',
      display: `−${snareMatch[1]}% snare (${snareMatch[2]} min)`,
      sortKey: Number(snareMatch[1]),
      statTag: 'MS',
    });
  }

  // Comma-separated stats sharing one value: Strength, Stamina, Dexterity, and Agility by 2
  const sharedStatListRe =
    /(?:increasing|decreasing|reducing|raising)(?:\s+(?:their|your|the|maximum|max))*\s+([\w\s,]+)\s+by\s+(\d+(?:\.\d+)?)(%?)(?!\s*\()/gi;
  while ((match = sharedStatListRe.exec(text)) !== null) {
    const [, listStr, valS, pct] = match;
    if (!listStr.includes(',')) continue;
    if (/\sby\s+\d/i.test(listStr)) continue;

    const isDebuff = /decreasing|reducing/i.test(match[0]);
    const val = Number(valS);
    const isPercent = pct === '%';

    for (const statName of splitStatList(listStr)) {
      addFlatStatEffect(statName, val, isDebuff, isPercent);
    }
  }

  // Per-stat values in a list: HP by 10, AC by 5, and Magic Resistance by 5
  const compoundStatRe =
    /(?:increasing|decreasing|reducing|raising)(?:\s+(?:their|your|the|maximum|max))*\s+(.+?)(?=\.|,\s*granting|,\s*and\s+granting| for \d)/i;
  const compoundMatch = text.match(compoundStatRe);
  if (compoundMatch) {
    const statPart = compoundMatch[1];
    const isDebuff = /decreasing|reducing/i.test(compoundMatch[0]);
    const statRe = /([\w\s]+?)\s+by\s+(\d+(?:\.\d+)?)(?!%|\d|\s*\()/g;
    let statMatch;
    while ((statMatch = statRe.exec(statPart)) !== null) {
      addFlatStatEffect(statMatch[1], Number(statMatch[2]), isDebuff);
    }
  }

  // Flat stat boosts (single stat, no comma-separated list)
  const multiStatRe =
    /(?:increasing|decreasing|reducing|raising)(?:\s+(?:their|your|the|maximum|max))*\s+([\w\s]+?)\s+by\s+(\d+(?:\.\d+)?)(?!%|\d)/gi;
  while ((match = multiStatRe.exec(text)) !== null) {
    const [, stat, valS] = match;
    const statName = stat.trim().replace(/^(?:their|your|maximum|max|and)\s+/i, '');
    if (statName.includes(',')) continue;
    addFlatStatEffect(statName, Number(valS), /decreasing|reducing/i.test(match[0]));
  }

  // Percentage buffs/debuffs block removed — handled above by pctRe/pctRangeRe

  // CC duration fallback
  const durationCcRe =
    /(?:stun(?:ning)?|immobiliz(?:e|ing)|root(?:ing)?|sleep(?:ing)?|incapacitat(?:e|ing)|charm(?:ing)?|fear(?:ing)?)\s+(?:them\s+)?(?:for\s+)?(\d+(?:\.\d+)?)\s+seconds?/i;
  const ccMatch = text.match(durationCcRe);
  if (ccMatch && !effects.some((e) => e.kind === 'crowd-control')) {
    add({
      kind: 'crowd-control',
      duration: Number(ccMatch[1]),
      display: `${ccMatch[1]}s duration`,
      sortKey: Number(ccMatch[1]),
    });
  }

  const unique = dedupeEffects(effects);

  return { effects: unique, summary: buildSummary(unique, primaryTag), statTags: extractStatTags(unique) };
}

/**
 * @param {string} [stat]
 */
function isAttackSpeedStat(stat) {
  if (!stat) return false;
  return /attack speed/.test(normalizeStatName(stat));
}

/**
 * Prefer percentage effects over duplicate flat stat lines for the same stat.
 * @param {Effect[]} effects
 */
function dedupeEffects(effects) {
  /** @type {Map<string, Effect>} */
  const best = new Map();

  for (const effect of effects) {
    const statKey = effect.stat ? normalizeStatName(effect.stat) : '';
    const typeKey = effect.damageType ? effect.damageType.toLowerCase() : '';
    const bucket = typeKey
      ? `${effect.kind}:${typeKey}`
      : statKey
        ? `${effect.kind}:${statKey}`
        : `${effect.kind}:${effect.display}`;

    const existing = best.get(bucket);
    if (!existing) {
      best.set(bucket, effect);
      continue;
    }

    if (effect.unit === '%' && existing.unit !== '%') {
      best.set(bucket, effect);
    }
  }

  const seen = new Set();
  let result = [...best.values()].filter((e) => {
    if (seen.has(e.display)) return false;
    seen.add(e.display);
    return true;
  });

  const hasPercentAttackSpeed = result.some((e) => e.unit === '%' && isAttackSpeedStat(e.stat));
  if (hasPercentAttackSpeed) {
    result = result.filter((e) => !(e.unit !== '%' && isAttackSpeedStat(e.stat)));
  }

  return result;
}

/**
 * @param {Effect[]} effects
 * @param {string | null} primaryTag
 */
function buildSummary(effects, primaryTag) {
  if (!effects.length) return '';

  /** @type {string[]} */
  const parts = [];
  let remaining = [...effects];

  const sameValueBuffs = remaining.filter(
    (e) => (e.kind === 'buff' || e.kind === 'debuff') && e.amount != null && !e.unit
  );
  if (sameValueBuffs.length >= 3) {
    const amount = sameValueBuffs[0].amount;
    const sign = sameValueBuffs[0].kind === 'debuff' ? '−' : '+';
    if (sameValueBuffs.every((e) => e.amount === amount && e.kind === sameValueBuffs[0].kind)) {
      const labels = sameValueBuffs
        .map((e) => e.statTag || e.stat)
        .filter(Boolean)
        .join('/');
      if (labels) {
        parts.push(`${sign}${amount} ${labels}`);
        const matched = new Set(sameValueBuffs);
        remaining = remaining.filter((e) => !matched.has(e));
      }
    }
  }

  const priority = {
    damage: 1,
    dot: 2,
    heal: 3,
    hot: 4,
    song: 5,
    buff: 6,
    thorns: 6,
    shield: 7,
    debuff: 8,
    'crowd-control': 9,
    resource: 10,
    utility: 11,
  };

  const sorted = [...remaining].sort((a, b) => {
    const pa = primaryTag && a.kind === primaryTag ? 0 : priority[a.kind] ?? 99;
    const pb = primaryTag && b.kind === primaryTag ? 0 : priority[b.kind] ?? 99;
    if (pa !== pb) return pa - pb;
    return (b.sortKey || 0) - (a.sortKey || 0);
  });

  const rest = sorted.slice(0, Math.max(0, 3 - parts.length)).map((e) => e.display);
  return [...parts, ...rest].join(' · ');
}

/**
 * @param {object} entry
 * @returns {object}
 */
export function withEffects(entry) {
  const { effects, summary, statTags } = parseEffects(
    entry.description || '',
    entry.primaryTag || null
  );
  return { ...entry, effects, valuesSummary: summary, statTags };
}
