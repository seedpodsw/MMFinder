export const NOTES_KEY = "mmfinder.notes.v1";

export function emptyPad() {
  return { notes: [], selectedId: null };
}

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanNote(note) {
  if (!note || typeof note.id !== "string" || !note.id) return null;
  const updatedAt = Number(note.updatedAt);
  return {
    id: note.id,
    title: typeof note.title === "string" ? note.title : "",
    body: typeof note.body === "string" ? note.body : "",
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
  };
}

export function loadNotes(storage) {
  try {
    const raw = JSON.parse(storage.getItem(NOTES_KEY) || "null");
    if (!raw || !Array.isArray(raw.notes)) return emptyPad();
    const notes = raw.notes.map(cleanNote).filter(Boolean);
    const selectedId = notes.some((note) => note.id === raw.selectedId) ? raw.selectedId : notes[0]?.id || null;
    return { notes, selectedId };
  } catch {
    return emptyPad();
  }
}

export function saveNotes(storage, pad) {
  storage.setItem(NOTES_KEY, JSON.stringify(pad));
}

export function createNote(pad) {
  const note = { id: newId(), title: "", body: "", updatedAt: Date.now() };
  return { notes: [note, ...pad.notes], selectedId: note.id };
}

export function selectNote(pad, id) {
  if (!pad.notes.some((note) => note.id === id)) return pad;
  return { ...pad, selectedId: id };
}

export function patchNote(pad, id, patch) {
  return {
    ...pad,
    notes: pad.notes.map((note) => {
      if (note.id !== id) return note;
      return {
        ...note,
        title: patch.title == null ? note.title : String(patch.title),
        body: patch.body == null ? note.body : String(patch.body),
        updatedAt: Date.now(),
      };
    }),
  };
}

export function deleteNote(pad, id) {
  const index = pad.notes.findIndex((note) => note.id === id);
  const notes = pad.notes.filter((note) => note.id !== id);
  let selectedId = pad.selectedId;
  if (selectedId === id) {
    const neighbor = pad.notes[index + 1] || pad.notes[index - 1];
    selectedId = neighbor && neighbor.id !== id ? neighbor.id : null;
  }
  if (selectedId && !notes.some((note) => note.id === selectedId)) selectedId = notes[0]?.id || null;
  return { notes, selectedId };
}
