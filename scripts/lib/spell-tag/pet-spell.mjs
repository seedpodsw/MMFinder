/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect whether a spell/ability targets or relates to a player pet or minion.
 * @param {string} description
 * @param {string} [name]
 */
export function isPetSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (/\bpet(?:s|'s)?\b/i.test(text)) return true;
  if (/\bcompanion\b/i.test(text)) return true;

  if (/\b(?:your|their)\s+minion\b/i.test(text)) return true;
  if (/\bminion to serve you\b/i.test(text)) return true;
  if (/\bcommand your pet\b/i.test(text)) return true;
  if (/\b(?:both\s+)?you and your pet\b/i.test(text)) return true;
  if (/\bmovement speed of your pet\b/i.test(text)) return true;
  if (/\bhealth of your pet\b/i.test(text)) return true;
  if (/\battack speed of your pet\b/i.test(text)) return true;

  if (/\bpet tier\b/i.test(name)) return true;
  if (/\bswarm pet\b/i.test(name)) return true;
  if (/\bzombie pet\b/i.test(name)) return true;

  return false;
}
