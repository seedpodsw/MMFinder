import { CLASS_ABBR, EQUIP_SLOTS } from "./gear.js";

export const CHARACTERS_KEY = "mmfinder.characters.v1";
export const LEGACY_LOADOUT_KEY = "mmfinder.gear.loadout.v1";

const MAX_CHARACTERS = 12;
const SLOT_KEYS = new Set(EQUIP_SLOTS.map((slot) => slot.key));

export function emptyBook() {
  return { activeId: null, characters: [], seeded: false };
}

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `char-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function clampLevel(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(60, Math.max(1, Math.round(n)));
}

function cleanName(value) {
  return String(value || "").trim().slice(0, 24);
}

export function cleanGear(gear) {
  if (!gear || typeof gear !== "object") return {};
  const out = {};
  for (const [slot, itemId] of Object.entries(gear)) {
    if (!SLOT_KEYS.has(slot) || typeof itemId !== "string" || !itemId) continue;
    out[slot] = itemId;
  }
  return out;
}

function cleanCharacter(row) {
  if (!row || typeof row.id !== "string" || !row.id) return null;
  const name = cleanName(row.name);
  if (!name) return null;
  return {
    id: row.id,
    name,
    classId: typeof row.classId === "string" ? row.classId : "",
    level: clampLevel(row.level),
    gear: cleanGear(row.gear),
  };
}

export function classTag(classId) {
  return CLASS_ABBR[classId]?.[0] || "";
}

export function characterLabel(character, classes = []) {
  const name = classes.find((c) => c.id === character.classId)?.name || classTag(character.classId);
  return name ? `${character.name} · ${character.level} ${name}` : `${character.name} · ${character.level}`;
}

export function loadCharacters(storage) {
  try {
    const raw = JSON.parse(storage.getItem(CHARACTERS_KEY) || "null");
    if (!raw || raw.v !== 1 || !Array.isArray(raw.characters)) return emptyBook();
    const characters = [];
    for (const row of raw.characters) {
      const character = cleanCharacter(row);
      if (character && !characters.some((c) => c.id === character.id)) characters.push(character);
      if (characters.length >= MAX_CHARACTERS) break;
    }
    const activeId = characters.some((c) => c.id === raw.activeId) ? raw.activeId : characters[0]?.id || null;
    return { activeId, characters, seeded: true };
  } catch {
    return emptyBook();
  }
}

export function saveCharacters(storage, book) {
  storage.setItem(
    CHARACTERS_KEY,
    JSON.stringify({
      v: 1,
      activeId: book.activeId,
      characters: book.characters,
      seeded: true,
    })
  );
}

export function readLegacyLoadout(storage) {
  try {
    return cleanGear(JSON.parse(storage.getItem(LEGACY_LOADOUT_KEY) || "null"));
  } catch {
    return {};
  }
}

export function createCharacter(book, input = {}) {
  if (book.characters.length >= MAX_CHARACTERS) return book;
  const name = cleanName(input.name);
  if (!name) return book;
  const character = {
    id: newId(),
    name,
    classId: typeof input.classId === "string" ? input.classId : "",
    level: clampLevel(input.level ?? 1),
    gear: cleanGear(input.gear),
  };
  return {
    ...book,
    seeded: true,
    activeId: character.id,
    characters: [...book.characters, character],
  };
}

export function selectCharacter(book, id) {
  if (!book.characters.some((character) => character.id === id) || book.activeId === id) return book;
  return { ...book, activeId: id };
}

export function patchCharacter(book, id, patch) {
  let changed = false;
  const characters = book.characters.map((character) => {
    if (character.id !== id) return character;
    const next = { ...character };
    if (patch.name != null) {
      const name = cleanName(patch.name);
      if (name && name !== character.name) {
        next.name = name;
        changed = true;
      }
    }
    if (patch.classId != null && patch.classId !== character.classId) {
      next.classId = String(patch.classId);
      changed = true;
    }
    if (patch.level != null) {
      const level = clampLevel(patch.level);
      if (level !== character.level) {
        next.level = level;
        changed = true;
      }
    }
    if (patch.gear != null) {
      next.gear = cleanGear(patch.gear);
      changed = true;
    }
    return next;
  });
  return changed ? { ...book, characters } : book;
}

export function equipItem(book, id, slot, itemId) {
  const character = book.characters.find((row) => row.id === id);
  if (!character || !SLOT_KEYS.has(slot) || typeof itemId !== "string" || !itemId) return book;
  if (character.gear[slot] === itemId) return book;
  return patchCharacter(book, id, { gear: { ...character.gear, [slot]: itemId } });
}

export function unequipItem(book, id, slot) {
  const character = book.characters.find((row) => row.id === id);
  if (!character || !character.gear[slot]) return book;
  const gear = { ...character.gear };
  delete gear[slot];
  return patchCharacter(book, id, { gear });
}

export function deleteCharacter(book, id) {
  if (!book.characters.some((character) => character.id === id)) return book;
  const characters = book.characters.filter((character) => character.id !== id);
  const activeId = book.activeId === id ? characters[0]?.id || null : book.activeId;
  return { ...book, characters, activeId, seeded: true };
}

/** Turn the old single level / class / gear loadout into the first character, once. */
export function adoptLegacy(book, { level = 1, classId = "", className = "", loadout = {} } = {}) {
  if (book.seeded || book.characters.length) return book.seeded ? book : { ...book, seeded: true };
  const gear = cleanGear(loadout);
  const klass = String(classId || "");
  if (!klass && Object.keys(gear).length === 0) return { ...book, seeded: true };
  return createCharacter(
    { ...book, seeded: true },
    { name: cleanName(className) || "My character", classId: klass, level, gear }
  );
}
