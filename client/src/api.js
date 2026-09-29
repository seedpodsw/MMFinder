import {
  applyStory,
  createItem,
  createNote,
  createPoi,
  deleteItem,
  deleteNote,
  deletePoi,
  filterNotes,
  normalizeStory,
  saveSettings,
  searchItems,
  updateItem,
  updateNote,
  updatePoi,
} from "../../shared/story.js";
import { listMaps, saveMap } from "./map-store";

const STORY_KEY = "mmfinder.story.v1";
const MAX_MAP_BYTES = 12 * 1024 * 1024;

const clock = {
  id: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
};

const mapUrls = new Map();

function asset(path) {
  const base = import.meta.env.BASE_URL || "/";
  const root = base.endsWith("/") ? base : `${base}/`;
  return root + String(path).replace(/^\//, "");
}

function prefixAsset(src) {
  if (!src || /^(https?:|blob:|data:)/i.test(src)) return src;
  if (src.startsWith("/")) return asset(src);
  return src;
}

function prefixWorld(world) {
  const next = structuredClone(world);
  for (const zone of next.zones || []) zone.map = prefixAsset(zone.map);
  for (const overlay of next.atlas?.overlays || []) overlay.src = prefixAsset(overlay.src);
  for (const key of ["continent", "discovered"]) {
    if (next.atlas?.[key]?.src) next.atlas[key].src = prefixAsset(next.atlas[key].src);
  }
  return next;
}

function readStory() {
  try {
    return normalizeStory(JSON.parse(localStorage.getItem(STORY_KEY) || "null"));
  } catch {
    return normalizeStory(null);
  }
}

function writeStory(story) {
  localStorage.setItem(STORY_KEY, JSON.stringify(normalizeStory(story)));
}

let seedPromise;

function loadSeed() {
  if (!seedPromise) {
    seedPromise = Promise.all([
      fetch(asset("data/world.json")).then(readJson),
      fetch(asset("data/notes.json")).then(readJson),
    ]).then(([world, notes]) => ({
      world: prefixWorld(world),
      notes: Array.isArray(notes) ? notes : [],
    }));
  }
  return seedPromise;
}

async function readJson(res) {
  if (!res.ok) throw new Error("The atlas data did not load.");
  return res.json();
}

async function localMaps() {
  let rows = [];
  try {
    rows = await listMaps();
  } catch {
    rows = [];
  }
  const out = {};
  for (const row of rows) {
    if (!row?.zoneId || !row.blob) continue;
    const key = `${row.zoneId}:${row.updatedAt}`;
    if (!mapUrls.has(key)) mapUrls.set(key, URL.createObjectURL(row.blob));
    out[row.zoneId] = { url: mapUrls.get(key), filename: row.filename, updatedAt: row.updatedAt };
  }
  return out;
}

async function view() {
  const seed = await loadSeed();
  const story = readStory();
  const maps = await localMaps();
  const merged = applyStory(seed.world, seed.notes, story, maps);
  const { notes, ...world } = merged;
  return { seed, story, world, notes };
}

function persist(next) {
  writeStory(next);
  return next;
}

export const api = {
  async world() {
    return (await view()).world;
  },
  async notes(params = {}) {
    return filterNotes((await view()).notes, params);
  },
  async createNote(payload) {
    const { story } = await view();
    const result = createNote(story, payload, clock);
    persist(result.story);
    return result.note;
  },
  async updateNote(id, payload) {
    const { seed, story } = await view();
    const result = updateNote(story, id, payload, seed.notes, clock);
    persist(result.story);
    return result.note;
  },
  async deleteNote(id) {
    const { seed, story } = await view();
    const result = deleteNote(story, id, seed.notes);
    persist(result.story);
    return { ok: true };
  },
  async pois(params = {}) {
    const { world } = await view();
    return world.pois.filter((poi) => {
      if (params.zoneId && poi.zoneId !== params.zoneId) return false;
      if (params.kind && poi.kind !== params.kind) return false;
      return true;
    });
  },
  async createPoi(payload) {
    const { seed, story } = await view();
    const result = createPoi(story, payload, { ...clock, zones: seed.world.zones });
    persist(result.story);
    return result.poi;
  },
  async updatePoi(id, payload) {
    const { seed, story } = await view();
    const result = updatePoi(story, id, payload, seed.world.pois, clock);
    persist(result.story);
    return result.poi;
  },
  async deletePoi(id) {
    const { seed, story } = await view();
    const result = deletePoi(story, id, seed.world.pois);
    persist(result.story);
    return { ok: true };
  },
  async saveSettings(payload) {
    const { seed, story } = await view();
    const result = saveSettings(story, payload, {
      classes: seed.world.classes,
      defaults: seed.world.settings,
    });
    persist(result.story);
    return result.settings;
  },
  async items(q) {
    const { world } = await view();
    if (q) return searchItems(world.items, q, 40);
    return world.items;
  },
  async createItem(payload) {
    const { seed, story } = await view();
    const result = createItem(story, seed.world.items, payload, clock);
    persist(result.story);
    return result.item;
  },
  async updateItem(id, payload) {
    const { seed, story } = await view();
    const result = updateItem(story, id, payload, seed.world.items, clock);
    persist(result.story);
    return result.item;
  },
  async deleteItem(id) {
    const { story } = await view();
    const result = deleteItem(story, id);
    persist(result.story);
    return { ok: true };
  },
  async uploadMap(zoneId, file) {
    const { seed } = await view();
    if (!seed.world.zones.some((zone) => zone.id === zoneId)) throw new Error("Unknown zone.");
    if (!file) throw new Error("Drop a map image.");
    if (!/image\/(jpeg|png|webp|gif)/.test(file.type || "")) throw new Error("Drop a jpg or png map.");
    if (file.size > MAX_MAP_BYTES) throw new Error("That map is larger than 12 MB.");
    const saved = await saveMap(zoneId, file);
    const key = `${zoneId}:${saved.updatedAt}`;
    if (!mapUrls.has(key)) mapUrls.set(key, URL.createObjectURL(file));
    return { ok: true, filename: saved.filename, src: mapUrls.get(key) };
  },
};
