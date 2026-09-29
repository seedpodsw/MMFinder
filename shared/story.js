/** Browser-local story layered on the baked atlas. Seed data is never rewritten. */

const WIKI = "https://monstersandmemories.miraheze.org/wiki/";
const NOTE_TARGETS = ["zone", "camp", "pin", "journal", "poi"];

function emptyStory() {
  return {
    settings: null,
    notes: [],
    hiddenNoteIds: [],
    pois: [],
    hiddenPoiIds: [],
    items: [],
  };
}

function normalizeStory(raw) {
  const base = emptyStory();
  if (!raw || typeof raw !== "object") return base;
  return {
    settings: raw.settings && typeof raw.settings === "object" ? raw.settings : null,
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    hiddenNoteIds: Array.isArray(raw.hiddenNoteIds) ? raw.hiddenNoteIds.map(String) : [],
    pois: Array.isArray(raw.pois) ? raw.pois : [],
    hiddenPoiIds: Array.isArray(raw.hiddenPoiIds) ? raw.hiddenPoiIds.map(String) : [],
    items: Array.isArray(raw.items) ? raw.items : [],
  };
}

function slugify(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function numOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function withQuestTitles(pois, quests) {
  const titlesByPoi = {};
  for (const q of quests || []) {
    const ids = new Set([q.poiId, ...(q.steps || []).map((s) => s.poiId)].filter(Boolean));
    for (const id of ids) (titlesByPoi[id] ||= []).push(q.title);
  }
  return pois.map((poi) => {
    if (!titlesByPoi[poi.id]) return poi;
    return { ...poi, quests: [...new Set([...(poi.quests || []), ...titlesByPoi[poi.id]])] };
  });
}

function applyStory(world, seedNotes, story, mapByZone = {}) {
  const local = normalizeStory(story);
  const hiddenNotes = new Set(local.hiddenNoteIds);
  const userNotes = local.notes.filter((n) => !hiddenNotes.has(n.id));
  const userNoteIds = new Set(userNotes.map((n) => n.id));
  const notes = [
    ...userNotes,
    ...(seedNotes || []).filter((n) => !hiddenNotes.has(n.id) && !userNoteIds.has(n.id)),
  ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  const hiddenPois = new Set(local.hiddenPoiIds);
  const userPois = local.pois.filter((p) => !hiddenPois.has(p.id));
  const userPoiIds = new Set(userPois.map((p) => p.id));
  const pois = withQuestTitles(
    [
      ...(world.pois || []).filter((p) => !hiddenPois.has(p.id) && !userPoiIds.has(p.id)),
      ...userPois,
    ].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
    world.quests
  );

  const zones = (world.zones || []).map((zone) => {
    const custom = mapByZone[zone.id];
    return {
      ...zone,
      map: custom?.url || zone.map,
      camps: pois.filter((p) => p.zoneId === zone.id && p.kind === "camp"),
    };
  });

  const overlays = new Map((local.items || []).map((item) => [item.id, item]));
  const items = [];
  for (const item of world.items || []) {
    if (overlays.has(item.id)) {
      items.push(overlays.get(item.id));
      overlays.delete(item.id);
    } else {
      items.push(item);
    }
  }
  for (const item of overlays.values()) items.push(item);

  const atlasOverlays = (world.atlas?.overlays || []).map((overlay) => {
    const custom = mapByZone[overlay.id];
    if (!custom?.url) return overlay;
    return { ...overlay, src: custom.url, placeholder: false, artClip: null, inset: null };
  });

  return {
    ...world,
    settings: local.settings || world.settings,
    zones,
    pois,
    items,
    notes,
    atlas: world.atlas ? { ...world.atlas, overlays: atlasOverlays } : world.atlas,
  };
}

function filterNotes(notes, params = {}) {
  return (notes || []).filter((note) => {
    if (params.targetType && note.targetType !== params.targetType) return false;
    if (params.targetId && note.targetId !== params.targetId) return false;
    return true;
  });
}

function createNote(story, body, ctx) {
  const local = normalizeStory(story);
  const title = String(body?.title || "");
  const text = String(body?.body || "");
  if (!text.trim() && !title.trim()) {
    const err = new Error("Write something first.");
    err.status = 400;
    throw err;
  }
  const targetType = NOTE_TARGETS.includes(body?.targetType) ? body.targetType : "journal";
  const x = Number(body?.x);
  const y = Number(body?.y);
  const note = {
    id: ctx.id(),
    title: title.slice(0, 200),
    body: text.slice(0, 8000),
    targetType,
    targetId: body?.targetId ? String(body.targetId) : null,
    x: Number.isFinite(x) ? x : null,
    y: Number.isFinite(y) ? y : null,
    createdAt: ctx.now(),
    updatedAt: ctx.now(),
  };
  return { story: { ...local, notes: [note, ...local.notes] }, note };
}

function updateNote(story, id, body, seedNotes, ctx) {
  const local = normalizeStory(story);
  const existing = local.notes.find((n) => n.id === id) || (seedNotes || []).find((n) => n.id === id);
  if (!existing) {
    const err = new Error("Note not found.");
    err.status = 404;
    throw err;
  }
  const note = {
    ...existing,
    title: body?.title !== undefined ? String(body.title).slice(0, 200) : existing.title,
    body: body?.body !== undefined ? String(body.body).slice(0, 8000) : existing.body,
    updatedAt: ctx.now(),
  };
  const notes = local.notes.filter((n) => n.id !== id);
  return { story: { ...local, notes: [note, ...notes] }, note };
}

function deleteNote(story, id, seedNotes) {
  const local = normalizeStory(story);
  const known = local.notes.some((n) => n.id === id) || (seedNotes || []).some((n) => n.id === id);
  if (!known) {
    const err = new Error("Note not found.");
    err.status = 404;
    throw err;
  }
  return {
    story: {
      ...local,
      notes: local.notes.filter((n) => n.id !== id),
      hiddenNoteIds: [...new Set([...local.hiddenNoteIds, id])],
    },
    ok: true,
  };
}

function createPoi(story, body, ctx) {
  const local = normalizeStory(story);
  const b = body || {};
  if (!b.zoneId || !(ctx.zones || []).some((z) => z.id === b.zoneId)) {
    const err = new Error("Pick a zone.");
    err.status = 400;
    throw err;
  }
  if (!b.name || !String(b.name).trim()) {
    const err = new Error("POI needs a name.");
    err.status = 400;
    throw err;
  }
  const ts = ctx.now();
  const poi = {
    id: ctx.id(),
    zoneId: b.zoneId,
    name: String(b.name).trim().slice(0, 120),
    kind: String(b.kind || "custom").slice(0, 32),
    mx: numOrNull(b.mx),
    my: numOrNull(b.my),
    lng: numOrNull(b.lng),
    lat: numOrNull(b.lat),
    soloMin: numOrNull(b.soloMin),
    soloMax: numOrNull(b.soloMax),
    groupMin: numOrNull(b.groupMin),
    groupMax: numOrNull(b.groupMax),
    monsters: String(b.monsters || "").slice(0, 400),
    notes: String(b.notes || "").slice(0, 2000),
    source: "user",
    createdAt: ts,
    updatedAt: ts,
    custom: true,
  };
  return { story: { ...local, pois: [...local.pois, poi] }, poi };
}

function updatePoi(story, id, body, seedPois, ctx) {
  const local = normalizeStory(story);
  const existing = local.pois.find((p) => p.id === id) || (seedPois || []).find((p) => p.id === id);
  if (!existing) {
    const err = new Error("POI not found.");
    err.status = 404;
    throw err;
  }
  const b = body || {};
  const poi = {
    ...existing,
    name: b.name !== undefined ? String(b.name).slice(0, 120) : existing.name,
    kind: b.kind !== undefined ? String(b.kind).slice(0, 32) : existing.kind,
    mx: b.mx !== undefined ? numOrNull(b.mx) : existing.mx,
    my: b.my !== undefined ? numOrNull(b.my) : existing.my,
    lng: b.lng !== undefined ? numOrNull(b.lng) : existing.lng,
    lat: b.lat !== undefined ? numOrNull(b.lat) : existing.lat,
    soloMin: b.soloMin !== undefined ? numOrNull(b.soloMin) : existing.soloMin,
    soloMax: b.soloMax !== undefined ? numOrNull(b.soloMax) : existing.soloMax,
    groupMin: b.groupMin !== undefined ? numOrNull(b.groupMin) : existing.groupMin,
    groupMax: b.groupMax !== undefined ? numOrNull(b.groupMax) : existing.groupMax,
    monsters: b.monsters !== undefined ? String(b.monsters).slice(0, 400) : existing.monsters,
    notes: b.notes !== undefined ? String(b.notes).slice(0, 2000) : existing.notes,
    source: "user",
    custom: true,
    updatedAt: ctx.now(),
  };
  return { story: { ...local, pois: [...local.pois.filter((p) => p.id !== id), poi] }, poi };
}

function deletePoi(story, id, seedPois) {
  const local = normalizeStory(story);
  const known = local.pois.some((p) => p.id === id) || (seedPois || []).some((p) => p.id === id);
  if (!known) {
    const err = new Error("POI not found.");
    err.status = 404;
    throw err;
  }
  return {
    story: {
      ...local,
      pois: local.pois.filter((p) => p.id !== id),
      hiddenPoiIds: [...new Set([...local.hiddenPoiIds, id])],
    },
    ok: true,
  };
}

function saveSettings(story, body, ctx) {
  const local = normalizeStory(story);
  const prev = local.settings ||
    ctx.defaults || { characterLevel: 1, characterClass: "", completedSteps: [] };
  const next = {
    characterLevel: prev.characterLevel ?? 1,
    characterClass: prev.characterClass || "",
    completedSteps: Array.isArray(prev.completedSteps) ? [...prev.completedSteps] : [],
  };
  const level = Number(body?.characterLevel);
  if (Number.isFinite(level)) next.characterLevel = Math.min(60, Math.max(1, Math.round(level)));
  if (body?.characterClass !== undefined) {
    const id = String(body.characterClass || "");
    const ok = !id || (ctx.classes || []).some((c) => c.id === id);
    if (ok) next.characterClass = id;
  }
  if (Array.isArray(body?.completedSteps)) next.completedSteps = body.completedSteps.map(String).slice(0, 2000);
  return { story: { ...local, settings: next }, settings: next };
}

function sourceRow(s) {
  return {
    method: String(s.method || "unknown").slice(0, 32),
    label: String(s.label || "").slice(0, 400),
    questId: s.questId ? String(s.questId) : null,
    poiId: s.poiId ? String(s.poiId) : null,
    zoneId: s.zoneId ? String(s.zoneId) : null,
    npc: String(s.npc || "").slice(0, 120),
    notes: String(s.notes || "").slice(0, 800),
    origin: "user",
  };
}

function createItem(story, catalog, body, ctx) {
  const local = normalizeStory(story);
  const b = body || {};
  const name = String(b.name || "").trim().slice(0, 160);
  if (!name) {
    const err = new Error("Item needs a name.");
    err.status = 400;
    throw err;
  }
  const id = String(b.id || slugify(name)).slice(0, 120);
  if (!id) {
    const err = new Error("Bad item id.");
    err.status = 400;
    throw err;
  }
  if (local.items.some((item) => item.id === id)) {
    const err = new Error("Item already exists — edit it instead.");
    err.status = 409;
    throw err;
  }
  const wiki = String(b.wiki || name.replace(/ /g, "_")).slice(0, 200);
  const sources = Array.isArray(b.sources) ? b.sources : b.how ? [{ method: "unknown", label: b.how }] : [];
  const prior = (catalog || []).find((item) => item.id === id) || {};
  const item = {
    ...prior,
    id,
    name,
    kind: String(b.kind || prior.kind || "item").slice(0, 32),
    slot: String(b.slot || prior.slot || "").slice(0, 80),
    wiki,
    notes: String(b.notes || "").slice(0, 2000),
    origin: "user",
    sources: sources.slice(0, 20).map(sourceRow),
    wikiUrl: prior.wikiUrl || WIKI + encodeURIComponent(wiki),
  };
  return { story: { ...local, items: [...local.items, item] }, item };
}

function updateItem(story, id, body, catalog, ctx) {
  const local = normalizeStory(story);
  const b = body || {};
  const existing = local.items.find((item) => item.id === id) || (catalog || []).find((item) => item.id === id);
  const name = String(b.name !== undefined ? b.name : existing?.name || id)
    .trim()
    .slice(0, 160);
  if (!name) {
    const err = new Error("Item needs a name.");
    err.status = 400;
    throw err;
  }
  const wiki = String(b.wiki !== undefined ? b.wiki : existing?.wiki || name.replace(/ /g, "_")).slice(0, 200);
  const item = {
    ...(existing || {}),
    id,
    name,
    kind: String(b.kind !== undefined ? b.kind : existing?.kind || "item").slice(0, 32),
    slot: String(b.slot !== undefined ? b.slot : existing?.slot || "").slice(0, 80),
    wiki,
    notes: String(b.notes !== undefined ? b.notes : existing?.notes || "").slice(0, 2000),
    origin: "user",
    sources: Array.isArray(b.sources) ? b.sources.slice(0, 20).map(sourceRow) : existing?.sources || [],
    wikiUrl: existing?.wikiUrl || WIKI + encodeURIComponent(wiki),
    updatedAt: ctx.now(),
  };
  return { story: { ...local, items: [...local.items.filter((row) => row.id !== id), item] }, item };
}

function deleteItem(story, id) {
  const local = normalizeStory(story);
  if (!local.items.some((item) => item.id === id)) {
    const err = new Error("Curated item not found (wiki/quest items cannot be deleted here).");
    err.status = 404;
    throw err;
  }
  return { story: { ...local, items: local.items.filter((item) => item.id !== id) }, ok: true };
}

function searchItems(items, query, limit = 24) {
  const q = String(query || "").trim().toLowerCase();
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const item of items || []) {
    const hay = [item.name, item.kind, item.slot, item.notes, ...(item.sources || []).map((s) => s.label)]
      .join(" ")
      .toLowerCase();
    if (!tokens.every((token) => hay.includes(token))) continue;
    const name = String(item.name || "").toLowerCase();
    const rank = name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2;
    scored.push({ item, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || String(a.item.name).localeCompare(String(b.item.name)));
  return scored.slice(0, limit).map((row) => row.item);
}

module.exports = {
  emptyStory,
  normalizeStory,
  slugify,
  applyStory,
  filterNotes,
  createNote,
  updateNote,
  deleteNote,
  createPoi,
  updatePoi,
  deletePoi,
  saveSettings,
  createItem,
  updateItem,
  deleteItem,
  searchItems,
};
