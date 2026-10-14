/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect dispels that remove poison and/or disease effects.
 * @param {string} description
 * @param {string} [name]
 */
export function isPoisonDiseaseDispelSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (
    /\bremov(?:e|es|ing)\s+(?:one|two|\d+|a)\s+(?:[\w]+\s+and\s+(?:one\s+)?)?(?:Poison|Disease|poison|disease)(?:\s+and\s+(?:one\s+)?(?:Poison|Disease|poison|disease))?\s+effects?/i.test(
      text
    )
  ) {
    return true;
  }

  if (
    /\b(?:cleanse|cure)(?:s|d|ing)?\s+(?:your|the)\s+(?:target|pet)\b/i.test(text) &&
    /\b(?:Poison|Disease|poison|disease)\s+effects?/i.test(text)
  ) {
    return true;
  }

  return false;
}
