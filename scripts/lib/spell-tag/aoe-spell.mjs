/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect spells/abilities that affect an area rather than a single target.
 * @param {string} description
 * @param {string} [name]
 */
export function isAoeSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  return (
    /\btargets?\s+within\s+the\s+affected\s+area\b/i.test(text) ||
    /\bnearby\s+targets?\b/i.test(text) ||
    /\b(?:your|the)\s+target\s+and\s+those\s+(?:around\s+it|nearby)\b/i.test(text) ||
    /\b(?:at|to)\s+your\s+target\s+and\s+those\s+(?:around\s+it|nearby)\b/i.test(text) ||
    /\byour\s+target\s+and\s+up\s+to\s+\d+\s+nearby\s+targets?\b/i.test(text) ||
    /\byour\s+target\s+and\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+other\s+(?:nearby\s+)?targets?\s+within\s+\d+\s+meters?\b/i.test(
      text
    ) ||
    /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+other\s+(?:nearby\s+)?targets?\s+(?:as|within)\s+/i.test(
      text
    ) ||
    /\bup\s+to\s+\d+\s+(?:additional\s+)?nearby\s+targets?\b/i.test(text) ||
    /\bhitting\s+your\s+target\s+and\s+up\s+to\s+\d+\s+nearby\s+targets?\b/i.test(text) ||
    /\bhits?\s+up\s+to\s+\d+\s+targets?\b/i.test(text) ||
    /\bradius\s+\d+(?:\.\d+)?\s+meters?\b/i.test(text) ||
    /\bnova\s+upon\s+nearby\s+targets?\b/i.test(text) ||
    /\bengulf\s+your\s+target\s+and\s+those\s+around\s+it\b/i.test(text) ||
    /\b(?:crash|strike)\s+(?:lightning\s+upon\s+)?your\s+target\s+and\s+those\s+around\s+it\b/i.test(text) ||
    /\bto\s+nearby\s+targets?\s+when\s+triggered\b/i.test(text)
  );
}

/**
 * "Call forth …" phrasing used for storms, barriers, and heals — not creature summons.
 * @param {string} description
 * @param {string} [name]
 */
export function isFalseSummonCall(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!/\bcall(?:s|ing)?\s+(?:forth|upon)\s+(?:a|an|the)\s+/i.test(text)) return false;

  if (isAoeSpell(description, name)) return true;
  if (/\b(?:consecrated|exalted|sacred)\s+barrier\b/i.test(text)) return true;
  if (/\bspark\s+of\s+nature'?s?\s+energy\b/i.test(text)) return true;
  if (/\b(?:fire|ice|cold|lightning|static|arcane|holy|nature|poison|shadow)\s+(?:storm|field|wall|rain|nova|bonds)\b/i.test(text)) {
    return true;
  }

  if (/\bsummon\s+[A-Z][\w\s]+,\s*that\b/i.test(text)) return true;

  return false;
}

/**
 * Periodic damage within an affected area (no upfront hit).
 * @param {string} description
 * @param {string} [name]
 */
export function isAreaPeriodicDamage(description, name = '') {
  const text = `${name} ${description}`.trim();
  return (
    /\bto\s+targets\s+within\s+the\s+affected\s+area\s+every\s+\d+\s+seconds?\b/i.test(text) &&
    !/\band an additional\b/i.test(text)
  );
}
