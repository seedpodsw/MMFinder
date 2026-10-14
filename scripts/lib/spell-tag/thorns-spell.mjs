/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect damage shield / thorns effects (retaliatory damage when hit).
 * @param {string} description
 * @param {string} [name]
 */
export function isThornsSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (/\bdamage\s+shield\s+that\s+deals/i.test(text)) return true;
  if (/\bgranting\s+(?:them|you|your\s+target)\s+(?:a\s+)?damage\s+shield/i.test(text)) return true;
  if (/\bproviding a Damage Shield with \d+/i.test(text)) return true;
  if (/\bgrants?\s+Damage Shield(?:\s+Damage Shield)?\s+\d+/i.test(text)) return true;
  if (/\bbacklash of \w+:\s*grants?\s+damage shield/i.test(text)) return true;
  if (/\b(?:prickly|bristly|brambly|spiky|thorny|jagged)\s+(?:barrier|tunic)/i.test(text)) return true;
  if (
    /\b(?:flame|fire|magma|lava|blazing|inferno|firestorm)\s+shield/i.test(text) &&
    /\bdamage shield|per hit|when hit/i.test(text)
  ) {
    return true;
  }

  return false;
}

/**
 * @param {string} description
 * @param {string} [name]
 */
export function isAbsorbShield(description, name = '') {
  const text = `${name} ${description}`.trim();
  return (
    /\babsorb(?:ing|s)?\s+\d+(?:\.\d+)?%?\s+(?:[\w]+\s+)?damage(?:\s+received)?\b/i.test(text) ||
    /\babsorb(?:ing|s)?\s+\d+(?:\.\d+)?%?\s+of\s+damage\s+received\b/i.test(text)
  );
}
