/** Look up a named mob and the closest real pin for that place. */

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(a|an|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set([
  "deep",
  "within",
  "inside",
  "upper",
  "lower",
  "near",
  "next",
  "room",
  "rooms",
  "area",
  "just",
  "left",
  "right",
  "from",
  "with",
  "part",
  "spawn",
  "spawns",
  "before",
  "after",
  "main",
  "and",
  "that",
  "this",
  "into",
  "onto",
  "over",
  "under",
  "past",
  "side",
  "first",
  "second",
  "third",
  "level",
  "coming",
  "directly",
  "confirmed",
  "about",
  "north",
  "south",
  "east",
  "west",
  "path",
  "following",
]);

/** 0 when the query is the mob's name, 1 when every word is in the name, otherwise -1. */
export function mobNameRank(name, query) {
  const n = norm(name);
  const raw = norm(query);
  if (!n || raw.length < 2) return -1;
  if (n === raw || n.startsWith(raw) || n.includes(raw)) return 0;
  const tokens = raw.split(" ").filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => n.includes(t))) return 1;
  return -1;
}

export function searchMobs(mobs, query, limit = 8) {
  const hits = [];
  for (const mob of mobs || []) {
    const rank = mobNameRank(mob.name, query);
    if (rank < 0) continue;
    hits.push({ mob, rank });
  }
  hits.sort((a, b) => a.rank - b.rank || a.mob.name.localeCompare(b.mob.name));
  return hits.slice(0, limit).map((hit) => hit.mob);
}

export function findMob(mobs, npc, zoneId) {
  const want = norm(npc);
  if (want.length < 2) return null;
  const list = mobs || [];
  const named = list.filter((mob) => norm(mob.name) === want);
  if (!named.length) return null;
  if (!zoneId) return named[0];
  return named.find((mob) => mob.zoneId === zoneId || (mob.zoneIds || []).includes(zoneId)) || named[0];
}

function placed(poi) {
  return poi && poi.mx != null && poi.my != null && !String(poi.id || "").startsWith("wiki-lv-") && poi.kind !== "zoneline";
}

/** A pin that names this mob, or the landmark the location text points at. */
export function pinForMob(mob, pois) {
  if (!mob) return null;
  const zoneIds = new Set(mob.zoneIds?.length ? mob.zoneIds : mob.zoneId ? [mob.zoneId] : []);
  const pool = (pois || []).filter((poi) => placed(poi) && (zoneIds.size === 0 || zoneIds.has(poi.zoneId)));
  const name = norm(mob.name);
  if (name.length >= 4) {
    const named = pool.find((poi) => norm(`${poi.name} ${poi.monsters || ""} ${poi.notes || ""}`).includes(name));
    if (named) return named;
  }
  const zoneTokens = new Set(norm(mob.zoneName).split(" ").filter(Boolean));
  const tokens = norm(mob.location)
    .split(" ")
    .filter((token) => token.length > 3 && !STOP.has(token) && !zoneTokens.has(token));
  if (!tokens.length) return null;
  let best = null;
  let bestScore = 0;
  let tied = false;
  for (const poi of pool) {
    const words = norm(poi.name).split(" ").filter(Boolean);
    let score = 0;
    for (const token of tokens) {
      if (words.some((word) => word === token || word.startsWith(token) || (token.startsWith(word) && word.length >= 4))) {
        score += token.length;
      }
    }
    if (score > bestScore) {
      best = poi;
      bestScore = score;
      tied = false;
    } else if (score === bestScore && score > 0) {
      tied = true;
    }
  }
  if (tied || bestScore < 4) return null;
  return best;
}

export function mobSearchHits(mobs, pois, query, limit = 8) {
  return searchMobs(mobs, query, limit).map((mob) => {
    const pin = pinForMob(mob, pois);
    return {
      type: "mob",
      id: mob.id,
      title: mob.name,
      mob: { ...mob, poiId: pin?.id || null },
      poiId: pin?.id || null,
      zoneId: pin?.zoneId || mob.zoneId || null,
      rank: mobNameRank(mob.name, query),
    };
  });
}
