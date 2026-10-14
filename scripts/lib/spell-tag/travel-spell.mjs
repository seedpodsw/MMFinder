/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect group portal travel spells.
 * @param {string} description
 * @param {string} [name]
 */
export function isPortalSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  return /\bportal\b/i.test(text) || /\bthrough a portal\b/i.test(text);
}

/**
 * Detect evacuation / emergency escape relocation spells.
 * @param {string} description
 * @param {string} [name]
 */
export function isEscapeSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  return (
    /\bevacuat(?:e|es|ing|ion)\b/i.test(text) ||
    /\burgent escape\b/i.test(text)
  );
}
