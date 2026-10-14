/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect stun crowd control on enemies/targets.
 * @param {string} description
 * @param {string} [name]
 */
export function isStunSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (/\bremov(?:e|es|ing)\s+all\s+stun/i.test(text)) return false;
  if (/\bcan be used while stunned/i.test(text)) return false;
  if (/\bused while stunned/i.test(text)) return false;
  if (/\bCan use while Stunned/i.test(text)) return false;

  // Immobilize-only effects are root, not stun.
  if (/\bimmobiliz/i.test(text) && !/\bstun/i.test(text)) return false;

  return (
    /\bstun(?:s|ning|ned)?\b/i.test(text) ||
    /\bapplying\s+a\s+stun\b/i.test(text) ||
    /\btrip(?:ping)?\s+[^.]{0,80}\bstunning\b/i.test(text)
  );
}

/**
 * Detect mesmerize / sleep / incapacitate crowd control.
 * @param {string} description
 * @param {string} [name]
 */
export function isMezSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (/\bcan be used while (?:stunned, )?(?:incapacitated|mesmerized)/i.test(text)) return false;
  if (/\bCan use while Stunned, Mesmerized/i.test(text)) return false;

  return (
    /\bmesmeriz(?:e|es|ed|ing)\b/i.test(text) ||
    /\bputting them to sleep\b/i.test(text) ||
    /\bputting them to Sleep\b/.test(text) ||
    /\bsleep for \d+/i.test(text) ||
    /\bincapacitat(?:e|es|ed|ing)\b/i.test(text)
  );
}

/**
 * Detect root / immobilize crowd control (not movement-speed snares).
 * @param {string} description
 * @param {string} [name]
 */
export function isRootSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  // Snare — roots mentioned but target is slowed, not rooted.
  if (/\bdecreasing\s+(?:their\s+)?movement\s+speed/i.test(text)) return false;
  if (/\breduc(?:e|es|ing)\s+(?:their\s+)?movement\s+speed/i.test(text)) return false;

  if (/\bremov(?:e|es|ing)\s+all\s+(?:stun\s+and\s+)?immobilize/i.test(text)) return false;
  if (/\bcan be used while (?:stunned|immobilized)/i.test(text)) return false;

  return (
    /\broot(?:s|ed|ing)?\s+(?:your|the|a|in place|with|them)\b/i.test(text) ||
    /\brooted in place\b/i.test(text) ||
    /\bimmobiliz(?:e|es|ed|ing)\b/i.test(text) ||
    /\bshackle\s+(?:your|the)\s+target\b/i.test(text) ||
    /\bencircling tendrils\b/i.test(text) ||
    /\btwisting tendrils\b/i.test(text)
  );
}

/**
 * Detect spells/abilities that interrupt an enemy's casting.
 * @param {string} description
 * @param {string} [name]
 */
export function isInterruptSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (/\block(?:s|ing)?\s+them\s+out\s+of\s+that\s+school\b/i.test(text)) return true;

  if (!/\binterrupt(?:ing|s|ed)?\b/i.test(text)) return false;

  return (
    /\b(?:cast(?:ing)?|spellcasting|spell casting)\b/i.test(text) ||
    /\bpreventing them from casting\b/i.test(text)
  );
}

/**
 * Detect fear crowd control — causes enemies to flee or run in terror.
 * @param {string} description
 * @param {string} [name]
 */
export function isFearSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (/\bcan be used while (?:stunned, )?(?:incapacitated, )?(?:or )?feared/i.test(text)) return false;
  if (/\bCan use while Stunned, Mesmerized, and Feared/i.test(text)) return false;

  return (
    /\bfear(?:s|ed|ing)?\s+(?:a|an|your|the|enemy|nearby|target|beast|undead|elemental)/i.test(text) ||
    /\bfear(?:s|ed|ing)?\s+[^.]{0,40}\b(?:run away|flee|terror)\b/i.test(text) ||
    /\brun\s+away\s+in\s+(?:fear|terror)\b/i.test(text) ||
    /\bcausing them to flee\b/i.test(text) ||
    /\bcower(?:ing)?\s+in\s+fear\b/i.test(text) ||
    /\bintimidates?\s+[^.]{0,80}\b(?:run away|fear)\b/i.test(text) ||
    /\bterrify\s+[^.]{0,80}\bflee/i.test(text)
  );
}

/**
 * Detect silence crowd control — prevents spellcasting without an interrupt.
 * @param {string} description
 * @param {string} [name]
 */
export function isSilenceSpell(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  // School lockouts and cast interrupts are interrupt, not silence.
  if (/\binterrupt(?:ing|s|ed)?\b/i.test(text)) return false;
  if (/\block(?:s|ing)?\s+them\s+out\s+of\s+that\s+school\b/i.test(text)) return false;
  if (/\bsame school of magic\b/i.test(text)) return false;

  return (
    /\bsilenc(?:e|es|ed|ing)\b/i.test(text) ||
    /\bpreventing them from spellcasting\b/i.test(text) ||
    /\bpreventing them from casting spells\b/i.test(text)
  );
}

/**
 * Any core CC sub-type (stun, mez, root, or enemy movement slow).
 * @param {string} description
 * @param {string} [name]
 * @param {(description: string, name?: string) => boolean} isSlowCc
 */
export function hasCoreCcComponent(description, name = '', isSlowCc) {
  return (
    isStunSpell(description, name) ||
    isMezSpell(description, name) ||
    isRootSpell(description, name) ||
    isSlowCc(description, name)
  );
}
