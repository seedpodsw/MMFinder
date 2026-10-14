/**
 * Adapted from FuStv1337/MnMWebsite (https://github.com/FuStv1337/MnMWebsite).
 * Used to tag and parse spell/ability descriptions for MMFinder.
 */

import { tagEntry } from './classify-spell.mjs';
import { withEffects } from './parse-effects.mjs';

/**
 * Merge semantic and stat tags, applying slow-specific cleanup.
 * @param {string[]} classTags
 * @param {string[]} statTags
 */
export function finalizeTags(classTags, statTags, effects = []) {
  let tags = [...new Set([...(classTags || []), ...(statTags || [])])];
  let stats = [...(statTags || [])];

  const effectKinds = new Set((effects || []).map((effect) => effect.kind));
  const hasDot = effectKinds.has('dot');
  const hasUpfrontDamage = (effects || []).some((effect) => effect.kind === 'damage');

  if (hasUpfrontDamage && hasDot) {
    tags = [...new Set([...tags, 'damage', 'dot'])];
  } else if (hasDot) {
    tags = tags.filter((tag) => tag !== 'damage');
    tags = [...new Set([...tags, 'dot'])];
  } else if (hasUpfrontDamage && !tags.includes('damage') && !effectKinds.has('shield')) {
    tags = [...new Set([...tags, 'damage'])];
  }
  if (effectKinds.has('heal') && effectKinds.has('hot')) {
    tags = [...new Set([...tags, 'heal', 'hot'])];
  }
  if (effectKinds.has('shield') && !tags.includes('shield')) {
    tags = [...new Set([...tags, 'shield'])];
    tags = tags.filter((tag) => tag !== 'damage');
  }
  if (effectKinds.has('buff') && !tags.includes('buff')) {
    tags = [...new Set([...tags, 'buff'])];
  }
  if (
    !tags.includes('mana-drain') &&
    (effects || []).some(
      (effect) => effect.kind === 'resource' && /mana.*drain|mana burn|mana\/\d/i.test(effect.display || '')
    )
  ) {
    tags = [...new Set([...tags, 'mana-drain'])];
  }

  // MS and ATK duplicate movement/haste/exhaust semantic tags on entries.
  tags = tags.filter((tag) => tag !== 'MS' && tag !== 'ATK');
  stats = stats.filter((tag) => tag !== 'MS' && tag !== 'ATK');

  if (tags.includes('slow')) {
    tags = tags.filter((tag) => tag !== 'movement');
  }

  return { tags, statTags: stats };
}

/**
 * @param {object} entry
 * @param {string} [className]
 */
export function enrichEntry(entry, className) {
  const tagged = tagEntry(entry, { className });
  const withFx = withEffects(tagged);
  const { tags, statTags } = finalizeTags(withFx.tags, withFx.statTags, withFx.effects);
  return { ...withFx, tags, statTags };
}
