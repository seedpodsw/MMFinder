/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect damage-over-time without an upfront hit.
 * @param {string} description
 * @param {string} [name]
 */
export function isPureDotSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (isUpfrontPlusDotSpell(description, name)) return false;

  if (/\bto\s+targets\s+within\s+the\s+affected\s+area\s+every\s+\d+\s+seconds?/i.test(text)) {
    return true;
  }

  if (
    /\bburns?\s+your\s+target\s+for\s+\d+[^.]{0,80}\bdealing\s+\d+[^.]{0,80}\bevery\s+\d+\s+seconds?/i.test(
      text
    )
  ) {
    return true;
  }

  if (/\bdealing\s+\d+[^.]{0,120}\bevery\s+\d+\s+seconds?/i.test(text)) {
    return true;
  }

  if (/\bafflict[^.]{0,120}\bdealing\s+\d+[^.]{0,80}\bevery\s+\d+\s+seconds?/i.test(text)) {
    return true;
  }

  if (/\bdamage\s+over\s+time/i.test(text)) return true;

  return false;
}

/**
 * Detect upfront damage plus a periodic tick component.
 * @param {string} description
 * @param {string} [name]
 */
export function isUpfrontPlusDotSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  return (
    /\bdealing\s+\d+[^.]{0,120}\band an additional\s+\d+[^.]{0,80}\bevery\s+\d+\s+seconds?/i.test(
      text
    ) ||
    /\bdeal(?:s|ing)?\s+\d+[^.]{0,120}\band an additional\s+\d+[^.]{0,80}\bdamage every\s+\d+\s+seconds?/i.test(
      text
    )
  );
}

/**
 * Parse spell duration in seconds from common phrasing.
 * @param {string} text
 * @param {number} [matchIndex]
 * @param {number} [matchLength]
 */
export function parseEffectDurationSeconds(text, matchIndex = 0, matchLength = 0) {
  const local = text.slice(matchIndex, matchIndex + Math.max(matchLength, 0) + 160);
  const full = text;

  let m = local.match(/\bfor\s+(\d+(?:\.\d+)?)\s+seconds?\b/i);
  if (m) return Number(m[1]);

  m = local.match(/\bfor\s+(\d+(?:\.\d+)?)\s+minutes?\b/i);
  if (m) return Number(m[1]) * 60;

  m = full.match(/\bburns?\s+your\s+target\s+for\s+(\d+(?:\.\d+)?)\s+seconds?\b/i);
  if (m) return Number(m[1]);

  m = full.match(/\bfor\s+(\d+(?:\.\d+)?)\s+minutes?\b/i);
  if (m) return Number(m[1]) * 60;

  m = full.match(/\bfor\s+(\d+(?:\.\d+)?)\s+seconds?\b/i);
  if (m) return Number(m[1]);

  return undefined;
}
