/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect spells that drain or burn mana from an enemy target.
 * @param {string} description
 * @param {string} [name]
 */
export function isManaDrainSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (/\b(?:grant(?:ing|s)|fill(?:s|ing)?)\s+(?:your|their|the)\s+target(?:'?s)?\s+(?:mind\s+with\s+)?/i.test(text)) {
    if (/\bgrant(?:ing|s)\s+(?:them|your target)\s+\d+\s+Mana/i.test(text)) return false;
  }
  if (/\bgrant(?:ing|s)\s+(?:them|your target)\s+\d+\s+Mana/i.test(text)) return false;
  if (/\bincreasing\s+(?:their|your)\s+Mana\s+Regeneration/i.test(text)) return false;
  if (/\bsiphon(?:s|ing)?\s+(?:your|the)\s+target(?:'s)?\s+life\s+force/i.test(text)) return false;
  if (/\bmana\s+cost\s+of\b/i.test(text) && !/\b(?:drain|burn|deplet)/i.test(text)) return false;

  if (/\bmana\s+drain\b/i.test(name)) return true;
  if (/\bmana\s+burn\b/i.test(name)) return true;
  if (/\bincinerate\s+mana\b/i.test(name)) return true;

  if (/\b(?:drain(?:ing|s)?|siphons?)\s+\d+(?:\.\d+)?\s+Mana\s+every/i.test(text)) return true;
  if (/\b(?:burns|burn)\s+(?:up to\s+)?\d+(?:\.\d+)?\s+Mana\s+from\s+(?:your\s+)?target/i.test(text)) {
    return true;
  }
  if (
    /\bdeplet(?:e|es|ing)\s+\d+(?:\.\d+)?\s+Mana/i.test(text) &&
    /\b(?:your|the)\s+target/i.test(text)
  ) {
    return true;
  }
  if (/\bamount of mana drained/i.test(text)) return true;

  return false;
}
