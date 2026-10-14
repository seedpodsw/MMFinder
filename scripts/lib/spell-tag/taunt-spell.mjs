/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect taunt abilities that force enemies to attack the caster.
 * @param {string} description
 * @param {string} [name]
 */
export function isTauntSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  // Pet proc lists taunt as a melee swing option, not a taunt spell.
  if (/\b(?:swing|Strike,)\s*[^)]*\bTaunt\b/i.test(text)) return false;
  if (
    /\([^)]*\bTaunt\b[^)]*\)/i.test(description) &&
    !/\btaunt(?:s|ing)?\s+(?:your|the|point blank)\b/i.test(description)
  ) {
    return false;
  }

  return (
    /\btaunt(?:s|ing)?\s+(?:your|the|point blank)\b/i.test(text) ||
    /\btaunt\b/i.test(name)
  );
}
