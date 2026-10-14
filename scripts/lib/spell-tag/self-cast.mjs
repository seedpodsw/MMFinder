/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

/**
 * Detect whether a spell/ability is self-cast only.
 * @param {string} description
 * @param {string} [name]
 */
export function isSelfCast(description, name = '') {
  const text = `${name} ${description}`.trim();
  if (!text) return false;

  if (/\bself only\b/i.test(text)) return true;

  const hasTarget =
    /\byour target(?:'s)?\b/i.test(text) ||
    /\btheir target(?:'s)?\b/i.test(text) ||
    /\ba target\b/i.test(text) ||
    /\bthe target\b/i.test(text) ||
    /\btarget group\b/i.test(text) ||
    /\bgroup member\b/i.test(text) ||
    /\byour group\b/i.test(text) ||
    /\ban ally\b/i.test(text) ||
    /\bfriendly target\b/i.test(text) ||
    /\bnearby target/i.test(text) ||
    /\bnearby enem/i.test(text) ||
    /\bpoint blank target/i.test(text) ||
    /\bcharm your target\b/i.test(text) ||
    /\bforcing them\b/i.test(text) ||
    /\bdecreasing their\b/i.test(text) ||
    /\bincreasing their\b/i.test(text) ||
    (/\brestor(?:e|ing)\b/i.test(text) && /\btarget\b/i.test(text) && !/\byourself\b/i.test(text));

  if (hasTarget) return false;

  const selfPatterns = [
    /\byourself\b/i,
    /\bencircles you\b/i,
    /\benshroud yourself\b/i,
    /\bward yourself\b/i,
    /\baround yourself\b/i,
    /\bteleport yourself\b/i,
    /\bchannels[^.]*\bthrough you\b/i,
    /\bgranting you\b/i,
    /\bagainst you\b/i,
    /\bdealt to you\b/i,
    /\bon you\b/i,
    /\benter (?:offensive|defensive|\w+) stance\b/i,
    /\btake up a defensive posture\b/i,
    /\bincreasing your (?!target)/i,
    /\breducing melee damage dealt to you\b/i,
    /\breducing physical damage against you\b/i,
    /\bshapeshift into\b/i,
    /\bself only morph\b/i,
    /\b(?:infuse|imbue|imbued)\s+(?:your\s+)?weapon\b/i,
  ];

  return selfPatterns.some((p) => p.test(text));
}
