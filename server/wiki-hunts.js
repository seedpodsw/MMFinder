/** Wiki mob levels for pins that already name that mob, plus a hunt entry
 *  for leveled mobs the plate does not mark. No guessed map coordinates. */

const { zones } = require("./world");
const { loadMobCache, loadWikiCache, parseDropsFrom } = require("./items");

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\[\[|\]\]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(a|an|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const zoneNames = zones
  .map((z) => ({ id: z.id, n: norm(z.name) }))
  .filter((z) => z.n.length >= 4)
  .sort((a, b) => b.n.length - a.n.length);

function zoneIds(raw) {
  let text = norm(raw);
  const ids = [];
  for (const z of zoneNames) {
    if (!text.includes(z.n)) continue;
    ids.push(z.id);
    text = text.replaceAll(z.n, " ");
  }
  return ids;
}

function parseLevel(raw) {
  const lv = String(raw || "").replace(/~/g, "").trim();
  const range = lv.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) return { soloMin: Number(range[1]), soloMax: Number(range[2]), label: `${range[1]}–${range[2]}` };
  const plus = lv.match(/(\d+)\s*\+/);
  if (plus) return { soloMin: Number(plus[1]), soloMax: Number(plus[1]), label: `${plus[1]}+` };
  const one = lv.match(/(\d+)/);
  if (one) return { soloMin: Number(one[1]), soloMax: Number(one[1]), label: one[1] };
  return null;
}

function leveledMobs() {
  const out = [];
  const seen = new Set();
  for (const mob of Object.values(loadMobCache())) {
    if (!mob?.name || seen.has(mob.id)) continue;
    seen.add(mob.id);
    const level = parseLevel(mob.level);
    if (!level) continue;
    const ids = zoneIds(mob.zone);
    for (const zoneId of ids) {
      out.push({ name: mob.name, zoneId, level, key: norm(mob.name), zoneCount: ids.length });
    }
  }
  return out;
}

function strongMatch(poiName, mobName) {
  if (!poiName || !mobName || mobName.length < 6) return false;
  if (poiName === mobName) return true;
  const words = mobName.split(" ").filter((w) => w.length > 2);
  if (words.length < 2) return false;
  return poiName.includes(mobName);
}

function mentioned(poi, mobName) {
  const hay = norm(`${poi.name} ${poi.monsters || ""} ${poi.notes || ""}`);
  return hay.includes(mobName);
}

function dropNames(zoneId, mobNames) {
  const want = new Set(mobNames);
  const found = [];
  for (const item of loadWikiCache()) {
    if (found.length >= 4) break;
    for (const group of parseDropsFrom(item.dropsfrom)) {
      const zonesHere = zoneIds(group.zone?.title || "");
      if (!zonesHere.includes(zoneId)) continue;
      const fromListed = group.mobs.some((m) => want.has(norm(m.title || m.label || "")));
      if (!fromListed && want.size) continue;
      if (!found.includes(item.name)) found.push(item.name);
    }
  }
  return found;
}

function withWikiLevels(pois) {
  const mobs = leveledMobs();
  const next = pois.map((poi) => {
    if (poi.soloMin != null || (poi.kind !== "named" && poi.kind !== "camp")) return poi;
    const poiName = norm(poi.name);
    const hits = mobs.filter((m) => m.zoneId === poi.zoneId && strongMatch(poiName, m.key));
    if (!hits.length) return poi;
    hits.sort((a, b) => b.key.length - a.key.length);
    const hit = hits[0];
    const note = `Wiki level ${hit.level.label}.`;
    const notes = poi.notes && poi.notes.includes("Wiki level") ? poi.notes : [poi.notes, note].filter(Boolean).join(" ");
    const monsters = poi.monsters || `${hit.name} ${hit.level.label}`;
    return { ...poi, soloMin: hit.level.soloMin, soloMax: hit.level.soloMax, monsters, notes };
  });

  const summaries = [];
  for (const zone of zones) {
    const here = mobs.filter((m) => m.zoneId === zone.id && m.zoneCount < 3);
    const pins = next.filter((p) => p.zoneId === zone.id);
    const fresh = [];
    const seen = new Set();
    for (const mob of here) {
      if (seen.has(mob.key)) continue;
      if (pins.some((p) => mentioned(p, mob.key))) continue;
      seen.add(mob.key);
      fresh.push(mob);
    }
    if (!fresh.length) continue;
    fresh.sort((a, b) => a.level.soloMin - b.level.soloMin || a.name.localeCompare(b.name));
    const shown = fresh.slice(0, 14);
    const lo = Math.min(...shown.map((m) => m.level.soloMin));
    const hi = Math.max(...shown.map((m) => m.level.soloMax));
    const more = fresh.length - shown.length;
    const drops = dropNames(zone.id, shown.map((m) => m.key));
    const notes = [
      "Wiki levels for mobs this plate does not mark. No dot, because the client scenes do not give a spot.",
      more > 0 ? `${more} more leveled mobs are on the wiki.` : "",
      drops.length ? `Drops include ${drops.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    summaries.push({
      id: `wiki-lv-${zone.id}`,
      zoneId: zone.id,
      name: "Wiki hunting levels",
      kind: "camp",
      soloMin: lo,
      soloMax: hi,
      monsters: shown.map((m) => `${m.name} ${m.level.label}`).join(", "),
      notes,
    });
  }
  return [...next, ...summaries];
}

module.exports = { withWikiLevels };
