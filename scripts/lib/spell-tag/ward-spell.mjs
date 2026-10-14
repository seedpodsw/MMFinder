/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Ward placed on a specific target type that absorbs damage.
 * e.g. "Wards an elemental target with elemental energy for 30 points of Magic Damage"
 * @param {string} description
 * @param {string} [name]
 */
export function isTargetTypeWardSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  return (
    /\bwards?(?:\s+off)?\s+an?\s+[\w\s]+target\s+with\b/i.test(text) &&
    /\bfor \d+\s+points?\s+of\b/i.test(text)
  );
}

/**
 * Detect ward spells that absorb incoming damage (not resistance buffs).
 * @param {string} description
 * @param {string} [name]
 */
export function isAbsorbWardSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (isTargetTypeWardSpell(description, name)) return true;

  // Resistance buffs: "Ward your target against frost, increasing their Cold Resistance..."
  if (/\bward(?:s|ing)?\s+(?:your target|an? )\s+against\b/i.test(text)) return false;
  if (/\bincreasing their [\w\s]+Resistance\b/i.test(text)) return false;

  if (!/\bward\b/i.test(text)) return false;

  return (
    /\babsorb(?:ing|s)?\b/i.test(text) ||
    /\bshield your target with (?:a|an) [\w\s]*ward\b/i.test(text)
  );
}

/**
 * Detect any absorb shield, including non-ward phrasing.
 * @param {string} description
 * @param {string} [name]
 */
export function isAbsorbShieldSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  return (
    /\babsorb(?:ing|s)?\s+\d+(?:\.\d+)?%?\s+(?:[\w]+\s+)?damage(?:\s+received)?\b/i.test(text) ||
    /\babsorb(?:ing|s)?\s+\d+(?:\.\d+)?%?\s+of\s+damage\s+received\b/i.test(text) ||
    isAbsorbWardSpell(description, name)
  );
}

/** @deprecated Use isTargetTypeWardSpell */
export const isOffensiveWardSpell = isTargetTypeWardSpell;
