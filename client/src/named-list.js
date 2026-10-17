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

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normItem(value) {
  return stripTags(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugItem(value) {
  return normItem(value).replace(/ /g, "-");
}

/** Index item names so a named's loot line can find the item page. */
export function indexItems(items) {
  const byNorm = new Map();
  const list = [];
  for (const item of items || []) {
    if (!item?.name) continue;
    list.push(item);
    byNorm.set(normItem(item.name), item);
    if (item.id && !byNorm.has(item.id)) byNorm.set(String(item.id), item);
  }
  return { byNorm, list };
}

/** Exact name, then a near title such as "Design Document" vs "Design Doc". */
export function findLootItem(index, name) {
  if (!index || !name) return null;
  const key = normItem(name);
  const direct = index.byNorm.get(key) || index.byNorm.get(slugItem(name));
  if (direct) return direct;
  if (key.length < 12) return null;
  let best = null;
  let bestGap = Infinity;
  for (const item of index.list) {
    const other = normItem(item.name);
    const shorter = Math.min(key.length, other.length);
    if (shorter < 12) continue;
    if (!other.startsWith(key) && !key.startsWith(other)) continue;
    const gap = Math.abs(key.length - other.length);
    if (gap < bestGap) {
      best = item;
      bestGap = gap;
    }
  }
  return best;
}

const GLANCE_STATS = [
  ["AC", "ac"],
  ["DMG", "dmg"],
  ["Delay", "delay"],
  ["Wt", "weight"],
  ["STR", "str"],
  ["STA", "sta"],
  ["AGI", "agi"],
  ["DEX", "dex"],
  ["INT", "int"],
  ["WIS", "wis"],
  ["CHA", "cha"],
  ["HP", "hp"],
  ["Mana", "mana"],
  ["Haste", "haste"],
  ["MR", "mr"],
  ["FR", "fr"],
  ["CR", "cr"],
  ["DR", "dr"],
  ["PR", "pr"],
  ["ER", "er"],
];

function shownStat(raw) {
  const text = String(raw ?? "").trim();
  if (!text || text === "0" || text === "+0" || text === "-") return "";
  return text;
}

function plainLine(value) {
  return String(value || "")
    .replace(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g, (_, title, label) => (label || title).trim())
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slotLabel(slot) {
  return String(slot || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(", ");
}

/** Compact "what is this" lines for a loot hover card. */
export function itemGlance(item) {
  if (!item) return null;
  const stats = [];
  for (const [label, key] of GLANCE_STATS) {
    const text = shownStat(item[key]);
    if (text) stats.push(`${label} ${text}`);
  }
  const effect = [item.effect, item.effect1, item.effect2, item.effect3].map(plainLine).filter(Boolean).join(" · ");
  const klass = plainLine(item.class);
  const race = plainLine(item.race);
  const skill = plainLine(item.skill);
  const slot = slotLabel(item.slot);
  const kind = plainLine(item.kind);
  const line = [slot, skill, slot ? "" : kind].filter(Boolean).join(" · ");
  return {
    name: stripTags(item.name),
    line,
    stats,
    effect,
    classReq: klass && !/^(all|any|all classes)$/i.test(klass) ? klass : "",
    race: race && !/^(all|any)$/i.test(race) ? race : "",
  };
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
