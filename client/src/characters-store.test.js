import assert from "node:assert/strict";
import test from "node:test";
import {
  adoptLegacy,
  createCharacter,
  deleteCharacter,
  equipItem,
  loadCharacters,
  patchCharacter,
  readLegacyLoadout,
  saveCharacters,
  selectCharacter,
  unequipItem,
} from "./characters-store.js";

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

test("characters round-trip through storage", () => {
  const storage = memory();
  let book = createCharacter(
    { activeId: null, characters: [], seeded: false },
    { name: "Ada", classId: "shadow-knight", level: 29, gear: { PRIMARY: "blade", BAG: "nope" } }
  );
  book = createCharacter(book, { name: "Bram", classId: "cleric", level: 12 });
  book = selectCharacter(book, book.characters[0].id);
  saveCharacters(storage, book);
  const loaded = loadCharacters(storage);
  assert.equal(loaded.seeded, true);
  assert.equal(loaded.activeId, book.characters[0].id);
  assert.equal(loaded.characters[1].name, "Bram");
  assert.deepEqual(loaded.characters[0].gear, { PRIMARY: "blade" });
  assert.equal(loaded.characters[0].level, 29);
});

test("bad storage starts empty and unseeded", () => {
  const storage = {
    getItem() {
      return "{";
    },
  };
  assert.deepEqual(loadCharacters(storage), { activeId: null, characters: [], seeded: false });
});

test("legacy level, class, and loadout become one character", () => {
  const storage = memory();
  storage.setItem("mmfinder.gear.loadout.v1", JSON.stringify({ CHEST: "robe", NOPE: "x", PRIMARY: "" }));
  const book = adoptLegacy(loadCharacters(storage), {
    level: 80,
    classId: "shadow-knight",
    className: "Shadow Knight",
    loadout: readLegacyLoadout(storage),
  });
  assert.equal(book.characters.length, 1);
  assert.equal(book.characters[0].name, "Shadow Knight");
  assert.equal(book.characters[0].classId, "shadow-knight");
  assert.equal(book.characters[0].level, 60);
  assert.deepEqual(book.characters[0].gear, { CHEST: "robe" });
  const again = adoptLegacy(book, { level: 1, classId: "wizard", className: "Wizard", loadout: { HEAD: "hat" } });
  assert.equal(again, book);
});

test("a level with no class and no gear is not invented", () => {
  const next = adoptLegacy(
    { activeId: null, characters: [], seeded: false },
    { level: 29, classId: "", loadout: {} }
  );
  assert.equal(next.characters.length, 0);
  assert.equal(next.seeded, true);
});

test("an emptied bench is not refilled from old settings", () => {
  const storage = memory();
  saveCharacters(storage, { activeId: null, characters: [], seeded: true });
  const loaded = loadCharacters(storage);
  const next = adoptLegacy(loaded, {
    level: 29,
    classId: "shadow-knight",
    className: "Shadow Knight",
    loadout: { CHEST: "robe" },
  });
  assert.equal(next, loaded);
  assert.equal(next.characters.length, 0);
});

test("equip, rename, and delete stay on the selected character", () => {
  let book = createCharacter(
    { activeId: null, characters: [], seeded: true },
    { name: "Ada", classId: "shadow-knight", level: 29 }
  );
  const ada = book.activeId;
  book = createCharacter(book, { name: "Bram", classId: "cleric", level: 4 });
  const bram = book.activeId;
  book = equipItem(book, ada, "PRIMARY", "blade");
  book = equipItem(book, ada, "PRIMARY", "blade");
  book = equipItem(book, ada, "BAG", "sack");
  assert.deepEqual(book.characters.find((c) => c.id === ada).gear, { PRIMARY: "blade" });
  assert.equal(book.activeId, bram);
  book = patchCharacter(book, ada, { name: "  Ada the Grim  ", level: 0, classId: "paladin" });
  const renamed = book.characters.find((c) => c.id === ada);
  assert.equal(renamed.name, "Ada the Grim");
  assert.equal(renamed.level, 1);
  assert.equal(renamed.classId, "paladin");
  book = unequipItem(book, ada, "PRIMARY");
  assert.deepEqual(book.characters.find((c) => c.id === ada).gear, {});
  book = deleteCharacter(book, bram);
  assert.equal(book.activeId, ada);
  book = deleteCharacter(book, ada);
  assert.deepEqual(book.characters, []);
  assert.equal(book.activeId, null);
  assert.equal(book.seeded, true);
});
