/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect debuffs that slow enemy/target movement speed (not attack speed or self utility).
 * @param {string} description
 * @param {string} [name]
 */
export function isEnemyMovementSlow(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (/\bslowing\s+your\s+descent\b/i.test(text)) return false;
  if (/\bincreasing\s+(?:your|their|the)\s+movement\s+speed/i.test(text)) return false;
  if (/\bslowing\s+(?:their|your)\s+(?:melee|ranged|attack)\b/i.test(text)) return false;
  if (/\bslowing\s+(?:their|your)\s+[\w\s]*attack\s+speed/i.test(text)) return false;
  if (/\b(?:remov(?:e|es|ing)|immunity to)\s+all\s+root\s+and\s+snare/i.test(text)) return false;
  if (/\broot\s+or\s+snare\s+line\b/i.test(text)) return false;

  return (
    /\bdecreasing\s+their\s+movement\s+speed/i.test(text) ||
    /\breduc(?:e|es|ing)\s+(?:their|your\s+targets?\s+)?movement\s+speed/i.test(text) ||
    /\bslowing\s+their\s+movement\s+speed/i.test(text) ||
    /\bslowing\s+your\s+targets?\s+movement\s+speed/i.test(text) ||
    /\bslowing\s+(?:the|a)\s+targets?\s+movement\s+speed/i.test(text) ||
    /\bapplying\s+a\s+\d+(?:\.\d+)?%?\s+snare\s+effect/i.test(text) ||
    /\b\d+(?:\.\d+)?%?\s+snare\s+effect\s+for/i.test(text)
  );
}
