/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect spells/abilities that remove beneficial magic from a target.
 * @param {string} description
 * @param {string} [name]
 */
export function isPurgeSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (/\bdispels?\s+(?:one\s+of\s+)?(?:your\s+target'?s?\s+)?beneficial\s+buffs?/i.test(text)) {
    return true;
  }

  if (/\bremov(?:e|es|ing)\s+(?:one|two|\d+|a)\s+beneficial\s+(?:effects?|buffs?)/i.test(text)) {
    return true;
  }

  if (/\b(?:purge|purging)\s+(?:your|an)\s+(?:target|enemy)\b/i.test(text)) {
    return true;
  }

  if (/\b(?:purge|purging)\s+[^.]{0,100}\bdispelling\s+a\s+magical\s+effect/i.test(text)) {
    return true;
  }

  if (
    /\bdispelling\b/i.test(text) &&
    /\bremov(?:e|es|ing)\s+(?:one|two|\d+|a)\s+beneficial\s+effects?/i.test(text)
  ) {
    return true;
  }

  if (/\bpurge\b/i.test(name)) return true;

  return false;
}
