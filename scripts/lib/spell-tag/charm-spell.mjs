/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect abilities that charm an entity to fight for or alongside the caster.
 * @param {string} description
 * @param {string} [name]
 */
export function isCharmSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  // Bard mez line — enthrall without turning the target into an ally.
  if (/\benthrall[^.]{0,80}\bincapacitat/i.test(text)) return false;

  if (/\bcharm(?:s|ed|ing)?\s+(?:a|an|your|the)\b/i.test(text)) return true;
  if (/\binstantly charms\b/i.test(text)) return true;

  return (
    /\b(?:beguile|coax|persuade|enthrall|dominate)\b/i.test(text) &&
    /\b(?:fight for you|fight alongside you)\b/i.test(text)
  );
}
