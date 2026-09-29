const { regions, zones } = require("./world");
const maps = require("./maps");
const db = require("./db");
const quests = require("./quests");
const items = require("./items");

function buildWorld() {
  const customRows = db.all("SELECT * FROM custom_maps");
  const customMaps = Object.fromEntries(customRows.map((r) => [r.zone_id, r]));
  const publicQuests = quests.publicQuests();
  const titlesByPoi = {};
  for (const q of publicQuests) {
    const ids = new Set([q.poiId, ...(q.steps || []).map((s) => s.poiId)].filter(Boolean));
    for (const id of ids) {
      (titlesByPoi[id] ||= []).push(q.title);
    }
  }
  const pois = db.all("SELECT * FROM pois ORDER BY name").map((row) => {
    const poi = db.rowPoi(row);
    if (titlesByPoi[poi.id]) poi.quests = [...new Set(titlesByPoi[poi.id])];
    return poi;
  });

  const mergedZones = zones.map((zone) => {
    const atlas = maps.zoneMaps[zone.id];
    const custom = customMaps[zone.id];
    return {
      ...zone,
      map: custom
        ? `/maps/custom/${custom.filename}?v=${encodeURIComponent(custom.updated_at)}`
        : atlas
          ? `/maps/${maps.assetName(atlas.file)}`
          : null,
      wikiFile: atlas?.wikiFile || null,
      wikiUrl: atlas?.wikiFile
        ? maps.wikiFileUrl(atlas.wikiFile)
        : `https://monstersandmemories.miraheze.org/wiki/${encodeURIComponent(zone.name)}`,
      camps: pois.filter((p) => p.zoneId === zone.id && p.kind === "camp"),
    };
  });

  return {
    regions,
    zones: mergedZones,
    atlas: maps.buildAtlas(customMaps, pois),
    pois,
    settings: db.readSettings(),
    classes: quests.CLASSES,
    quests: publicQuests,
    items: items.publicItems(publicQuests, db, { zones: mergedZones, pois }),
  };
}

module.exports = { buildWorld };
