import assert from "node:assert/strict";
import test from "node:test";
import { createNote, deleteNote, loadNotes, patchNote, saveNotes, selectNote } from "./notes-store.js";

function memory() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

test("notes round-trip through storage", () => {
  const storage = memory();
  const created = createNote({ notes: [], selectedId: null });
  const titled = patchNote(created, created.selectedId, { title: "Named", body: "Watch the dock." });
  saveNotes(storage, titled);
  const loaded = loadNotes(storage);
  assert.equal(loaded.notes.length, 1);
  assert.equal(loaded.selectedId, titled.selectedId);
  assert.equal(loaded.notes[0].title, "Named");
  assert.equal(loaded.notes[0].body, "Watch the dock.");
});

test("bad storage starts empty", () => {
  const storage = {
    getItem() {
      return "{";
    },
  };
  assert.deepEqual(loadNotes(storage), { notes: [], selectedId: null });
});

test("create, select, and delete keep a note open", () => {
  let pad = createNote({ notes: [], selectedId: null });
  const first = pad.selectedId;
  pad = patchNote(pad, first, { title: "First" });
  pad = createNote(pad);
  const second = pad.selectedId;
  pad = patchNote(pad, second, { title: "Second" });
  assert.deepEqual(
    pad.notes.map((note) => note.title),
    ["Second", "First"]
  );
  pad = selectNote(pad, first);
  assert.equal(pad.selectedId, first);
  pad = deleteNote(pad, first);
  assert.equal(pad.notes.length, 1);
  assert.equal(pad.selectedId, second);
  pad = deleteNote(pad, second);
  assert.deepEqual(pad, { notes: [], selectedId: null });
});
