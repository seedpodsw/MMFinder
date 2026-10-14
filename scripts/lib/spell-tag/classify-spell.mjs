/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/** @typedef {'damage' | 'dot' | 'heal' | 'hot' | 'buff' | 'debuff' | 'crowd-control' | 'stun' | 'mez' | 'root' | 'interrupt' | 'silence' | 'fear' | 'taunt' | 'shield' | 'thorns' | 'dispel' | 'purge' | 'cure' | 'summon' | 'portal' | 'escape' | 'teleport' | 'invisibility' | 'resurrection' | 'stance' | 'slow' | 'haste' | 'exhaust' | 'movement' | 'utility' | 'song' | 'self' | 'pet' | 'charm' | 'aoe' | 'mana-drain'} SpellTag */

import { isSelfCast } from './self-cast.mjs';
import { isPetSpell } from './pet-spell.mjs';
import { isCharmSpell } from './charm-spell.mjs';
import { isTauntSpell } from './taunt-spell.mjs';
import { isThornsSpell, isAbsorbShield } from './thorns-spell.mjs';
import { isAbsorbWardSpell, isAbsorbShieldSpell } from './ward-spell.mjs';
import { isEnemyMovementSlow } from './slow-spell.mjs';
import { isAttackSpeedHaste, isEnemyAttackSpeedSlow } from './attack-speed-spell.mjs';
import { isAoeSpell, isFalseSummonCall, isAreaPeriodicDamage } from './aoe-spell.mjs';
import { isPureDotSpell, isUpfrontPlusDotSpell } from './dot-spell.mjs';
import { isPoisonDiseaseDispelSpell } from './dispel-spell.mjs';
import { isPurgeSpell } from './purge-spell.mjs';
import { isPortalSpell, isEscapeSpell } from './travel-spell.mjs';
import { isStunSpell, isMezSpell, isRootSpell, isInterruptSpell, isSilenceSpell, isFearSpell } from './cc-spell.mjs';
import { isManaDrainSpell } from './mana-drain-spell.mjs';
import { isMeleeProcBuffSpell } from './melee-proc-spell.mjs';

/** @type {SpellTag[]} */
export const ALL_TAGS = [
  'damage',
  'dot',
  'heal',
  'hot',
  'song',
  'buff',
  'debuff',
  'crowd-control',
  'stun',
  'mez',
  'root',
  'interrupt',
  'silence',
  'fear',
  'taunt',
  'shield',
  'thorns',
  'dispel',
  'purge',
  'cure',
  'summon',
  'portal',
  'escape',
  'teleport',
  'invisibility',
  'resurrection',
  'stance',
  'slow',
  'haste',
  'exhaust',
  'movement',
  'utility',
  'self',
  'pet',
  'charm',
  'aoe',
  'mana-drain',
];

/** Bard instrument categories used for songs (excludes Martial, Subterfuge, etc.). */
const BARD_INSTRUMENT_CATEGORIES = new Set([
  'Percussion',
  'String',
  'Brass',
  'Wind',
  'Singing',
]);

/** Priority for choosing primaryTag when multiple tags match. */
const PRIMARY_TAG_PRIORITY = /** @type {SpellTag[]} */ ([
  'resurrection',
  'hot',
  'dot',
  'heal',
  'damage',
  'mana-drain',
  'stun',
  'mez',
  'root',
  'interrupt',
  'silence',
  'fear',
  'taunt',
  'slow',
  'crowd-control',
  'song',
  'stance',
  'shield',
  'thorns',
  'debuff',
  'exhaust',
  'slow',
  'buff',
  'haste',
  'summon',
  'cure',
  'dispel',
  'purge',
  'portal',
  'escape',
  'teleport',
  'invisibility',
  'movement',
  'utility',
  'self',
  'charm',
  'pet',
]);

/**
 * Ordered rules — earlier rules win for overlapping patterns.
 * @type {{ tag: SpellTag, patterns: RegExp[] }[]}
 */
const TAG_RULES = [
  {
    tag: 'resurrection',
    patterns: [
      /\bresurrect/i,
      /\bredeem a target corpse/i,
      /\brestor(?:e|ing)\s+\d+%?\s*experience/i,
      /\bresurrection illness/i,
    ],
  },
  {
    tag: 'hot',
    patterns: [
      /\brestor(?:e|ing)\s+\d+\s+health\s+after\s+\d+\s+seconds?/i,
      /\badditional\s+\d+\s+health\s+every\s+\d+\s+seconds?/i,
      /\bevery\s+\d+\s+seconds?[^.]{0,80}\b(?:heal|health|restore)/i,
      /\brenew[^.]{0,60}\bevery\s+\d+\s+seconds?/i,
      /\bover\s+\d+\s+seconds?[^.]{0,40}\brestor/i,
      /\bheal(?:ing)?\s+over\s+time/i,
    ],
  },
  {
    tag: 'dot',
    patterns: [
      /\bdealing\s+\d+[^.]{0,80}\band an additional \d+[^.]{0,60}\bdamage every \d+\s+seconds?/i,
      /\band an additional \d+[^.]{0,60}\bdamage every \d+\s+seconds?/i,
      /\bevery\s+\d+\s+seconds?[^.]{0,80}\bdamage/i,
      /\bdealing\s+\d+[^.]{0,120}\bevery\s+\d+\s+seconds?/i,
      /\bto\s+targets\s+within\s+the\s+affected\s+area\s+every\s+\d+\s+seconds?/i,
      /\bafflict[^.]{0,80}\bevery\s+\d+\s+seconds?/i,
      /\bdamage\s+over\s+time/i,
      /\bpoison(?:ed|s)?\s+for\s+\d+\s+seconds?/i,
    ],
  },
  {
    tag: 'heal',
    patterns: [
      /\b(?:gently|lightly|greatly|fully|powerfully)\s+heal/i,
      /\bheal(?:s|ing)?\s+(?:your|the|a|targets?\b)/i,
      /\brestor(?:e|ing)\s+\d+\s+health\b(?!.*after\s+\d+\s+seconds?)/i,
      /\brestor(?:e|ing)\s+\d+\s+health\s+and\s+an\s+additional/i, // handled by hot, but fallback
      /\bhealing\s+light[^.]{0,40}\brestor/i,
      /\brestor(?:e|ing)\s+\d+%?\s+of\s+(?:your|their|target'?s?)\s+health/i,
      /\brestor(?:e|ing)\s+health/i,
    ],
  },
  {
    tag: 'damage',
    patterns: [
      /\bdealing\s+\d+/i,
      /\bdeals?\s+\d+/i,
      /\bdeal(?:s|ing)?\s+\d+%?\s*(?:weapon|melee|ranged|physical|holy|cold|fire|magic|poison|disease|shadow|lightning|arcane|nature)\s+damage/i,
      /\b\d+\s*(?:weapon|melee|ranged|physical|holy|cold|fire|magic|poison|disease|shadow|lightning|arcane|nature)\s+damage/i,
      /\bweapon\s+ratio\s+damage/i,
      /\bsmite\s+/i,
      /\bstrike(?:s|ing)?\s+(?:down\s+)?(?:your|the)\s+target/i,
      /\b(?:assault|blast|burn|freeze|shock|rend|stab|jab|kick|shoot|throw)[^.]{0,60}\bdamage/i,
      /\b(?:purge|purify)[^.]{0,40}\bdealing\s+\d+/i,
      /\btorments?[^.]{0,40}\b(?:magic\s+)?damage/i,
    ],
  },
  {
    tag: 'crowd-control',
    patterns: [
      /\bimmobiliz/i,
      /\broot(?:s|ed|ing)?\s+(?:your|the)\s+target/i,
      /\bstun(?:s|ning)?\s+/i,
      /\bapplying\s+a\s+stun/i,
      /\bsleep\s+for\s+\d+\s+seconds?/i,
      /\bmesmeriz/i,
      /\bpacify\s+(?:your|the)\s+target/i,
      /\bplacates?\s+an?\s+aggressive\s+target/i,
      /\blull\s+a\s+target/i,
      /\bshackle\s+(?:your|the)\s+target/i,
      /\bblind(?:s|ing)?\s+(?:your|the)\s+target/i,
    ],
  },
  {
    tag: 'shield',
    patterns: [
      /\babsorb(?:ing|s)?\s+\d+(?:\.\d+)?%?\s+(?:[\w]+\s+)?damage(?:\s+received)?\b/i,
      /\babsorb(?:ing|s)?\s+\d+(?:\.\d+)?%?\s+of\s+damage\s+received\b/i,
      /\bspellshield\b/i,
      /\bshield\s+(?:your|the)\s+target\s+with/i,
      /\b(?:construct|weave)\s+(?:a|an)\s+[\w\s]*ward\b/i,
    ],
  },
  {
    tag: 'thorns',
    patterns: [
      /\bdamage\s+shield\s+that\s+deals/i,
      /\bgranting\s+(?:them|you|your\s+target)\s+(?:a\s+)?damage\s+shield/i,
      /\bproviding a Damage Shield with \d+/i,
      /\bgrants?\s+Damage Shield(?:\s+Damage Shield)?\s+\d+/i,
      /\bbacklash of \w+:\s*grants?\s+damage shield/i,
      /\b(?:prickly|bristly|brambly|spiky|thorny|jagged)\s+(?:barrier|tunic)/i,
    ],
  },
  {
    tag: 'debuff',
    patterns: [
      /\bdecreasing\s+their/i,
      /\breduc(?:e|es|ed|ing)\s+(?:their|the(?!\s+(?:mana|spell)\s+cost\b)|melee|ranged|physical|magic|attack|damage|armor|ac)\b/i,
      /\breduce(?:s|ing)?\s+(?:their|the(?!\s+(?:mana|spell)\s+cost\b))\s+/i,
      /\bbreak(?:s|ing)?\s+(?:the\s+)?armor/i,
      /\bslow(?:s|ing)?\s+(?:their|the)\s+/i,
      /\bexhaust\s+(?:your|the)\s+target/i,
      /\bafflict\s+(?:your|the)\s+target/i,
      /\btorments?\s+(?:your|the)\s+target/i,
      /\bweakens?\s+(?:your|the)\s+target/i,
      /\bpoison(?:s|ed|ing)?\s+(?:your|the)\s+target/i,
      /\bdisease(?:s|d|ing)?\s+(?:your|the)\s+target/i,
      /\bcurse(?:s|d|ing)?\s+(?:your|the)\s+target/i,
      /\b(?:decreases?|lowers?|diminish(?:es|ing)?)\s+(?:the\s+)?(?:strength|dexterity|agility|intelligence|wisdom|charisma|armor|ac|attack|defense|resistance)/i,
    ],
  },
  {
    tag: 'buff',
    patterns: [
      /\bincreasing\s+(?:your|their|the)\s+/i,
      /\bincrease(?:s|d|ing)?\s+(?:your|their|the|a\s+friendly)\s+/i,
      /\bincrease(?:s|d|ing)?\s+(?:the\s+)?(?:strength|dexterity|agility|intelligence|wisdom|charisma|stamina)\s*(?:of\s+(?:a\s+)?(?:friendly\s+)?(?:target|your target)\s+)?by\s+\d/i,
      /\bbestow(?:s|ing)?\s+/i,
      /\bgrant(?:s|ing)?\s+(?:you|them|your|their|a\s+friendly)/i,
      /\bbless(?:es|ing)?\s+(?:your|the)\s+target\b[^.]{0,200}\b(?:increasing|granting|raising|bestow)/i,
      /\bhaste\s+(?:your|the)\s+target/i,
      /\bward(?:s|ing)?\s+(?:your|the)\s+target\s+against/i,
      /\brais(?:e|es|ing)\s+(?:your|their|the)\s+/i,
      /\b(?:enhance|empower|fortify|bolster)(?:s|ing|ed)?\s+/i,
      /\b(?:invisibility|invisible)\s+versus/i,
      /\bdefensive\s+posture\b/i,
      /\breducing\s+(?:melee|ranged|physical|magic)\s+damage\s+dealt\s+to\s+you\b/i,
    ],
  },
  {
    tag: 'summon',
    patterns: [
      /\bsummon(?:s|ing)?\s+(?:a|an|the|\d+)\s+/i,
      /\bconjure(?:s|ing)?\s+(?:a|an|the|\d+)\s+/i,
      /\bcall(?:s|ing)?\s+(?:forth|upon)\s+(?:a|an|the)\s+/i,
      /\bcalls?\s+on\s+a\s+friendly/i,
    ],
  },
  {
    tag: 'cure',
    patterns: [
      /\bcure(?:s|d|ing)?\s+(?:your|the)\s+target/i,
      /\bcures?\s+(?:blindness|paralysis|curse)/i,
    ],
  },
  {
    tag: 'dispel',
    patterns: [
      /\bdispel(?:s|ling)?\s+(?:magic|harmful|a\s+magical\s+effect)/i,
      /\babolish\s+(?:magic|harmful)/i,
      /\bremov(?:e|es|ing)\s+(?:one|two|\d+|a)\s+harmful\s+(?:effects?|magical\s+effects?)/i,
      /\bremoves?\s+a\s+harmful\s+magical\s+effect/i,
      /\bremov(?:e|es|ing)\s+(?:one|two|\d+|a)\s+(?:[\w]+\s+and\s+(?:one\s+)?)?(?:Poison|Disease|poison|disease)(?:\s+and\s+(?:one\s+)?(?:Poison|Disease|poison|disease))?\s+effects?/i,
      /\b(?:cleanse|cure)(?:s|d|ing)?\s+(?:your|the)\s+(?:target|pet),?\s*removing\s+.*(?:Poison|Disease|poison|disease)/i,
    ],
  },
  {
    tag: 'teleport',
    patterns: [
      /\bteleport(?:s|ing|ation)?\s+/i,
      /\b(?:magical\s+)?gate(?:s|ing)?\b/i,
      /\bbind(?:s|ing)?\s+(?:the\s+soul|your\s+target|a\s+target)/i,
      /\breturning\s+you\s+to\s+your\s+bind\s+location/i,
      /\bto\s+your\s+bind\s+location/i,
    ],
  },
  {
    tag: 'invisibility',
    patterns: [
      /\binvisib/i,
      /\bstealth\b/i,
      /\bsneak(?:s|ing)?\s*,?\s*causing\s+you\s+to\s+be\s+hidden/i,
      /\bunseen\s+by/i,
      /\bshroud(?:s|ed|ing)?\s+(?:a\s+target|your\s+target|you)/i,
      /\bhidden\s+from\s+enemies/i,
    ],
  },
  {
    tag: 'stance',
    patterns: [
      /\b(?:offensive|defensive|battle|guard|evasive|arcane|melee|ranged)\s+stance\b/i,
      /\benter\s+\w+\s+stance/i,
      /\btake\s+up\s+a\s+defensive\s+posture/i,
    ],
  },
  {
    tag: 'exhaust',
    patterns: [
      /\bslowing\s+(?:their|your)\s+(?:melee\s+and\s+ranged\s+|melee\s+|ranged\s+)?attack\s+speed/i,
      /\bdecreasing\s+their\s+(?:melee\s+and\s+ranged\s+|melee\s+|ranged\s+)?attack\s+speed/i,
      /\breduc(?:e|es|ing)\s+(?:the\s+)?attack\s+speed\s+of\s+your\s+target/i,
    ],
  },
  {
    tag: 'haste',
    patterns: [
      /\bhaste\s+(?:your|the)\s+target,?\s+increasing\s+their\s+(?:melee\s+and\s+ranged\s+)?attack\s+speed/i,
      /\bincreasing\s+(?:your|their|the)\s+(?:melee\s+and\s+ranged\s+|melee\s+|ranged\s+)?attack\s+speed/i,
    ],
  },
  {
    tag: 'slow',
    patterns: [
      /\bdecreasing\s+their\s+movement\s+speed/i,
      /\breduc(?:e|es|ing)\s+(?:their|your\s+targets?\s+)?movement\s+speed/i,
      /\bslowing\s+their\s+movement\s+speed/i,
      /\bslowing\s+your\s+targets?\s+movement\s+speed/i,
      /\b\d+(?:\.\d+)?%?\s+snare\s+effect/i,
      /\bapplying\s+a\s+\d+(?:\.\d+)?%?\s+snare\s+effect/i,
    ],
  },
  {
    tag: 'movement',
    patterns: [
      /\bmovement\s+speed/i,
      /\b(?:increase|decrease)(?:s|ing)?\s+(?:your|their)\s+movement/i,
      /\bsprint(?:s|ing)?\b/i,
      /\b(?:run|leap|dash|blink|charge)\s+(?:forward|toward|at|to)\b/i,
    ],
  },
  {
    tag: 'utility',
    patterns: [
      /\btransmut(?:e|es|ing)\s+/i,
      /\bmorph\s+to\s+/i,
      /\bsee\s+(?:invisible|magical\s+effects|buffs)/i,
      /\bgranting\s+(?:them|your\s+target)[^.]{0,60}\b(?:see|ability\s+to\s+see)/i,
      /\bbreathe\s+underwater/i,
      /\bsalvage\s+/i,
      /\bpolar\s+align/i,
      /\bmagically\s+align/i,
      /\b(?:orient|orienting)\s+you\s+toward/i,
      /\bconsume\s+the\s+essence\s+of\s+your\s+pet/i,
      /\b(?:identify|inspect|consider)\s+/i,
      /\b(?:track|forage|skin|butcher|fish|mine|harvest)\b/i,
      /\bgranting\s+\d+\s+mana\s+at\s+the\s+cost/i,
      /\bfill\s+(?:your|their)\s+(?:mind|lungs)/i,
    ],
  },
];

/**
 * Bard songs are channeled group buffs. Detect via description and class context.
 * @param {string} text
 * @param {{ className?: string, category?: string | null }} [context]
 */
function isBardSong(text, context = {}) {
  const isGroupSong =
    /\b(?:immerse|inspire)\s+your\s+group\b/i.test(text) ||
    /\bimmerse\s+your\s+gorup\b/i.test(text);

  if (!isGroupSong) return false;

  // Exclude non-bard entries that happen to use similar wording
  if (context.className && context.className !== 'Bard') return false;

  // When class is unknown (spells index), require a bard instrument category if available
  if (!context.className && context.category && !BARD_INSTRUMENT_CATEGORIES.has(context.category)) {
    return false;
  }

  return true;
}

/**
 * @param {string} description
 * @param {string} [name]
 * @param {{ className?: string, category?: string | null }} [context]
 * @returns {{ tags: SpellTag[], primaryTag: SpellTag | null }}
 */
export function classifySpell(description, name = '', context = {}) {
  const text = `${name} ${description}`.trim();
  /** @type {Set<SpellTag>} */
  const tags = new Set();

  // Name-based hints before description rules
  if (/\bstance\b/i.test(name)) {
    tags.add('stance');
  }

  for (const rule of TAG_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      tags.add(rule.tag);
    }
  }

  if (isBardSong(text, context)) {
    tags.add('song');
    tags.add('buff');
  }

  if (isSelfCast(description, name)) {
    tags.add('self');
  }

  if (isPetSpell(description, name)) {
    tags.add('pet');
  }

  if (isCharmSpell(description, name)) {
    tags.add('charm');
    tags.delete('crowd-control');
  }

  if (isTauntSpell(description, name)) {
    tags.add('taunt');
    tags.delete('crowd-control');
  }

  if (isAbsorbShieldSpell(description, name) || isAbsorbWardSpell(description, name)) {
    tags.add('shield');
    tags.delete('damage');
  }

  if (isThornsSpell(description, name)) {
    tags.add('thorns');
    tags.add('buff');
    tags.delete('damage');
    if (!isAbsorbShield(description, name)) {
      tags.delete('shield');
    }
  }

  // Refinements: direct heal shouldn't also be hot if hot already matched from "additional every"
  if (tags.has('hot') && tags.has('heal')) {
    // keep both — many HOT spells also mention initial heal
  }

  // Damage + dot: keep both
  // Buff that also increases movement speed
  if (tags.has('movement') && tags.has('buff') && !/\bdecreasing\s+their\s+movement/i.test(text)) {
    // both valid
  }

  // If damage debuff (e.g. slow + damage), keep damage and debuff
  if (/\bdealing\s+\d+[^.]{0,80}\bdecreasing\s+their\s+movement/i.test(text)) {
    tags.add('damage');
    tags.add('debuff');
    tags.add('slow');
    tags.delete('movement');
  }

  if (isEnemyMovementSlow(description, name)) {
    tags.add('slow');
    tags.add('debuff');
    tags.delete('movement');
    tags.delete('crowd-control');
  }

  if (isStunSpell(description, name)) {
    tags.add('stun');
    tags.add('crowd-control');
  }

  if (isMezSpell(description, name)) {
    tags.add('mez');
    tags.add('crowd-control');
  }

  if (isRootSpell(description, name)) {
    tags.add('root');
    tags.add('crowd-control');
  }

  // Offensive root barriers (e.g. Grip of Nature) grant CC on hit, not friendly buffs.
  if (tags.has('buff') && tags.has('root') && /\bimmobiliz(?:e|es|ed|ing)\s+targets?\b/i.test(text)) {
    tags.delete('buff');
  }

  if (isInterruptSpell(description, name)) {
    tags.add('interrupt');
  }

  if (isSilenceSpell(description, name)) {
    tags.add('silence');
    tags.add('crowd-control');
  }

  if (isFearSpell(description, name)) {
    tags.add('fear');
    tags.add('crowd-control');
  }

  if (isAttackSpeedHaste(description, name)) {
    tags.add('haste');
    tags.add('buff');
  }

  if (isEnemyAttackSpeedSlow(description, name)) {
    tags.add('exhaust');
    tags.add('debuff');
  }

  if (isAoeSpell(description, name)) {
    tags.add('aoe');
  }

  if (isFalseSummonCall(description, name)) {
    tags.delete('summon');
  }

  if (isAreaPeriodicDamage(description, name)) {
    tags.add('dot');
    tags.delete('damage');
  }

  if (isPoisonDiseaseDispelSpell(description, name)) {
    tags.add('dispel');
    tags.delete('cure');
  }

  if (isPurgeSpell(description, name)) {
    tags.add('purge');
    tags.delete('dispel');
  }

  if (isPortalSpell(description, name)) {
    tags.add('portal');
  }

  if (isEscapeSpell(description, name)) {
    tags.add('escape');
  }

  if (isManaDrainSpell(description, name)) {
    tags.add('mana-drain');
  }

  if (isMeleeProcBuffSpell(description, name)) {
    tags.add('buff');
    tags.add('self');
  }

  if (tags.has('mana-drain') && tags.has('damage')) {
    const hasHpDamage =
      /\bdealing\s+damage/i.test(text) ||
      /\bdamage equal to/i.test(text) ||
      /\b(?:physical|magic|cold|fire|holy|poison|disease|shadow|lightning|arcane|nature|electric)\s+damage/i.test(
        text
      );
    if (!hasHpDamage) {
      tags.delete('damage');
    }
  }

  if (isUpfrontPlusDotSpell(description, name)) {
    tags.add('dot');
    tags.add('damage');
  } else if (isPureDotSpell(description, name)) {
    tags.add('dot');
    tags.delete('damage');
  }

  // Interrupts and snares are not crowd control unless paired with hard CC.
  if (tags.has('interrupt') && tags.has('crowd-control')) {
    const hasHardCc =
      tags.has('stun') ||
      tags.has('mez') ||
      tags.has('root') ||
      tags.has('silence') ||
      tags.has('fear');
    if (!hasHardCc) {
      tags.delete('crowd-control');
    }
  }

  if (tags.has('slow') && tags.has('crowd-control')) {
    const hasHardCc =
      tags.has('stun') ||
      tags.has('mez') ||
      tags.has('root') ||
      tags.has('silence') ||
      tags.has('fear');
    if (!hasHardCc) {
      tags.delete('crowd-control');
    }
  }

  // Fallback heuristics for unmatched combat abilities
  if (tags.size === 0) {
    if (/\b(?:shoot|throw|attack|strike|slash|cleave|bash|frenzy|riposte|parry|block|clobber|defense)\b/i.test(text)) {
      if (/\bdefensive posture\b/i.test(text) || /\bdefense\b/i.test(name)) {
        tags.add('buff');
      } else if (/\b(?:shoot|throw)\b/i.test(text) && !/\bdamage\b/i.test(text)) {
        tags.add('damage');
      } else {
        tags.add('damage');
      }
    } else if (/\b(?:track|forage|salvage|bind|gate)\b/i.test(text)) {
      tags.add('utility');
    }
  }

  const tagList = ALL_TAGS.filter((tag) => tags.has(tag));
  const primaryTag = PRIMARY_TAG_PRIORITY.find((tag) => tags.has(tag)) ?? tagList[0] ?? null;

  return { tags: tagList, primaryTag };
}

/**
 * @param {object} entry
 * @param {{ className?: string }} [context]
 * @returns {object}
 */
export function tagEntry(entry, context = {}) {
  const { tags, primaryTag } = classifySpell(entry.description || '', entry.name || '', {
    className: context.className,
    category: entry.category,
  });
  return { ...entry, tags, primaryTag };
}
