/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect self-buffs that grant melee/on-hit proc damage or effects.
 * @param {string} description
 * @param {string} [name]
 */
export function isMeleeProcBuffSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (
    /\b(?:infuse|imbue|imbued)\s+(?:your\s+)?weapon\b/i.test(text) &&
    /\bon\s+melee(?:\s+attacks|\s+hits)?\b/i.test(text) &&
    /\b(?:grant(?:ing|s)?(?:\s+you)?\s+a\s+chance|chance\s+to\s+(?:deal|activate|strike))\b/i.test(text)
  ) {
    return true;
  }

  if (
    /\bgrant(?:ing|s)?\s+you\s+a\s+chance\s+to\s+activate\s+[\w\s]+?\s+on\s+melee\s+attacks\b/i.test(text) &&
    /\b(?:deal(?:ing|s)?|leech|unleash|restore(?:s|ing)?)\b/i.test(text)
  ) {
    return true;
  }

  if (
    /\binvoke\s+a\s+[\w\s]+?\s+aspect\b/i.test(text) &&
    /\bon\s+melee\s+attacks\b/i.test(text) &&
    /\bgrant(?:ing|s)?\s+you\s+a\s+chance\b/i.test(text)
  ) {
    return true;
  }

  return false;
}
