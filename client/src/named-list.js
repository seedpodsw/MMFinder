/** Group wiki named mobs under the levels they can be. */

const COMMON_NAME = /^(a|an|the)\s+/i;

/** A unique name, or a common-looking name the wiki marks as the named. `named: false` is a placeholder or trash mob. */
export function isNamedMob(mob) {
  if (!mob?.name) return false;
  if (typeof mob.named === "boolean") return mob.named;
  const name = String(mob.name).trim();
  if (!name || /^x\d+\s+recipient$/i.test(name)) return false;
  return !COMMON_NAME.test(name);
}

function numbersIn(text) {
  return [...String(text).matchAll(/\d+/g)]
    .map((match) => Number(match[0]))
    .filter((n) => n >= 1 && n <= 80);
}

function steps(lo, hi) {
  const levels = [];
  const end = Math.min(hi, lo + 30);
  for (let n = lo; n <= end; n++) levels.push(n);
  return levels;
}

/** Levels a wiki string should be listed under. A range is listed at each step. "30s" and a trailing + stay on that number. */
export function parseMobLevel(raw) {
  const text = String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text) return { label: "", levels: [] };
  const nums = numbersIn(text);
  if (!nums.length) return { label: text, levels: [] };
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  if (/s$/i.test(text) && nums.length === 1) return { label: text, levels: [lo] };
  if (hi > lo) return { label: text, levels: steps(lo, hi) };
  return { label: text, levels: [lo] };
}

/** Extra level text to show when the wiki string is not a single number. */
export function levelNote(level, label) {
  const shown = String(label || "").trim();
  if (!shown || shown.replace(/\s+/g, "") === String(level)) return "";
  return shown;
}

export function namedsByLevel(mobs) {
  const buckets = new Map();
  const unknown = [];
  for (const mob of mobs || []) {
    if (!isNamedMob(mob)) continue;
    const parsed = parseMobLevel(mob.level);
    if (!parsed.levels.length) {
      unknown.push(mob);
      continue;
    }
    for (const level of parsed.levels) {
      const list = buckets.get(level) || [];
      if (list.some((row) => row.mob.id === mob.id)) continue;
      list.push({ mob, levelLabel: parsed.label });
      buckets.set(level, list);
    }
  }
  const groups = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([level, list]) => ({
      level,
      mobs: list.sort((a, b) => a.mob.name.localeCompare(b.mob.name) || String(a.mob.id).localeCompare(String(b.mob.id))),
    }));
  unknown.sort((a, b) => a.name.localeCompare(b.name) || String(a.id).localeCompare(String(b.id)));
  return { groups, unknown };
}

/** Closest listed level. On a tie, the lower level wins. */
export function nearestNamedLevel(groups, level) {
  if (!groups?.length) return null;
  const want = Number(level);
  let best = groups[0].level;
  let bestDist = Math.abs(best - want);
  for (const group of groups) {
    const dist = Math.abs(group.level - want);
    if (dist < bestDist) {
      best = group.level;
      bestDist = dist;
    }
  }
  return best;
}
