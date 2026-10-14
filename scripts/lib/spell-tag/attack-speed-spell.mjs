/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * @param {string} text
 */
function hasAttackSpeed(text) {
  return /\b(?:melee\s+and\s+ranged\s+|melee\s+|ranged\s+)?attack\s+speed/i.test(text);
}

/**
 * @param {string} text
 */
function isCastingSpeedOnly(text) {
  const mentionsCast = /\b(?:casting|cast)\s+speed/i.test(text);
  return mentionsCast && !hasAttackSpeed(text);
}

/**
 * Detect buffs that increase attack speed (not casting speed alone).
 * @param {string} description
 * @param {string} [name]
 */
export function isAttackSpeedHaste(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text || isCastingSpeedOnly(text)) return false;

  if (/\bhaste\s+(?:your|the)\s+target'?s?\s+mind\b/i.test(text)) return false;
  if (/\bspell\s+casting\s+speed/i.test(text) && !hasAttackSpeed(text)) return false;

  return (
    /\bhaste\s+(?:your|the)\s+target,?\s+increasing\s+their\s+(?:melee\s+and\s+ranged\s+)?attack\s+speed/i.test(
      text
    ) ||
    /\bincreasing\s+(?:your|their|the)\s+(?:melee\s+and\s+ranged\s+|melee\s+|ranged\s+)?attack\s+speed/i.test(
      text
    ) ||
    /\bincrease(?:s|d|ing)?\s+(?:your|their|the)\s+(?:melee\s+and\s+ranged\s+|melee\s+|ranged\s+)?attack\s+speed/i.test(
      text
    )
  );
}

/**
 * Detect debuffs that slow enemy/target attack speed (not casting speed alone).
 * @param {string} description
 * @param {string} [name]
 */
export function isEnemyAttackSpeedSlow(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text || isCastingSpeedOnly(text)) return false;

  return (
    /\bslowing\s+(?:their|your)\s+(?:melee\s+and\s+ranged\s+|melee\s+|ranged\s+)?attack\s+speed/i.test(
      text
    ) ||
    /\bdecreasing\s+their\s+(?:melee\s+and\s+ranged\s+|melee\s+|ranged\s+)?attack\s+speed/i.test(
      text
    ) ||
    /\breduc(?:e|es|ing)\s+(?:the\s+)?attack\s+speed\s+of\s+your\s+target/i.test(text) ||
    /\bdecreasing\s+their\s+movement\s+speed[^.]{0,60}\band\s+attack\s+speed/i.test(text)
  );
}
