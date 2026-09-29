import { appliesToClass, nextOpenStep } from "./Enhance";

function campFits(camp, level) {
  const lo = camp.groupMin ?? camp.soloMin;
  const hi = camp.groupMax ?? camp.soloMax;
  if (lo == null && hi == null) return true;
  if (lo == null) return level <= hi + 3;
  if (hi == null) return level >= lo - 3;
  return level >= lo - 3 && level <= hi + 3;
}

function huntMin(poi) {
  return poi.soloMin ?? poi.groupMin ?? 99;
}

export function routeBetween(zones, fromId, toId) {
  if (!fromId || !toId) return [];
  if (fromId === toId) return [fromId];
  const byId = Object.fromEntries(zones.map((z) => [z.id, z]));
  const queue = [fromId];
  const prev = new Map([[fromId, null]]);
  while (queue.length) {
    const cur = queue.shift();
    if (cur === toId) break;
    for (const next of byId[cur]?.adjacent || []) {
      if (prev.has(next) || !byId[next]) continue;
      prev.set(next, cur);
      queue.push(next);
    }
  }
  if (!prev.has(toId)) return [fromId, toId];
  const path = [];
  for (let n = toId; n; n = prev.get(n)) path.push(n);
  return path.reverse();
}

export function startCityFor(zone) {
  if (!zone) return "night-harbor";
  if (zone.start) return zone.id;
  if (zone.layer === "deep") return "underdocks";
  if (zone.regionId === "calafrey") return "faelindral";
  return "night-harbor";
}

export function huntsHere(pois, zoneId, level) {
  return (pois || [])
    .filter((p) => p.zoneId === zoneId && (p.kind === "camp" || p.kind === "named"))
    .filter((p) => campFits(p, level))
    .sort((a, b) => huntMin(a) - huntMin(b));
}

export function huntsAtLevel(pois, level) {
  return (pois || [])
    .filter((p) => (p.kind === "camp" || p.kind === "named") && campFits(p, level))
    .sort((a, b) => Math.abs(huntMin(a) - level) - Math.abs(huntMin(b) - level) || huntMin(a) - huntMin(b));
}

export function huntZonesNear(pois, zones, fromId, level, limit = 4) {
  const counts = new Map();
  for (const p of pois || []) {
    if (p.kind !== "camp" && p.kind !== "named") continue;
    if (!campFits(p, level)) continue;
    const cur = counts.get(p.zoneId) || { count: 0, min: 99 };
    cur.count += 1;
    cur.min = Math.min(cur.min, huntMin(p));
    counts.set(p.zoneId, cur);
  }
  return [...counts.entries()]
    .map(([id, info]) => {
      const path = routeBetween(zones, fromId, id);
      return { id, ...info, hops: path.length ? path.length - 1 : 99, path };
    })
    .filter((row) => row.id !== fromId)
    .sort((a, b) => a.hops - b.hops || Math.abs(a.min - level) - Math.abs(b.min - level))
    .slice(0, limit);
}

export function questTarget(quest, completed, level) {
  if (!quest) return {};
  const step = nextOpenStep(quest, completed, level);
  return {
    poiId: step?.poiId || quest.poiId || null,
    zoneId: step?.zoneId || quest.zoneId || null,
    step: step || null,
  };
}

export function nextForYou(quests, klass, completed, level) {
  if (!klass) return null;
  const mine = (quests || []).filter((q) => appliesToClass(q, klass));
  const pick =
    mine.find((q) => q.kind === "class" && nextOpenStep(q, completed, level)) ||
    mine.find((q) => nextOpenStep(q, completed, level));
  if (!pick) return null;
  const step = nextOpenStep(pick, completed, level);
  return { quest: pick, step, ...questTarget(pick, completed, level) };
}
