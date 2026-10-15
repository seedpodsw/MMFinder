import assert from "node:assert/strict";
import test from "node:test";
import { findMob, mobNameRank, pinForMob, searchMobs } from "./mob-find.js";

const pois = [
  {
    id: "wiki-lv-blacktide-bay",
    zoneId: "blacktide-bay",
    name: "Wiki hunting levels",
    kind: "camp",
    monsters: "Captain Kruush 29",
  },
  { id: "bt-ships", zoneId: "blacktide-bay", name: "Anchored ships", kind: "dock", mx: 28, my: 88 },
  { id: "bt-entrance", zoneId: "blacktide-bay", name: "Bay entrance", kind: "landmark", mx: 70, my: 72 },
  { id: "ac-brahson", zoneId: "ancient-crypt", name: "Brahson the Butcher", kind: "named", mx: 42, my: 62 },
];

const kruush = {
  id: "captain-kruush",
  name: "Captain Kruush",
  zoneId: "blacktide-bay",
  zoneIds: ["blacktide-bay"],
  zoneName: "Blacktide Bay",
  location: "Deep within the dungeon on the upper deck of main ship in the bay.",
};

const brahson = {
  id: "brahson-the-butcher",
  name: "Brahson the Butcher",
  zoneId: "ancient-crypt",
  zoneIds: ["ancient-crypt"],
  zoneName: "Ancient Crypt",
  location: "Butcher room",
};

test("a mob name matches even when the query is only part of it", () => {
  assert.equal(mobNameRank("Captain Kruush", "captain kruush"), 0);
  assert.equal(mobNameRank("Captain Kruush", "kruush"), 0);
  assert.equal(mobNameRank("Captain Kruush", "bay"), -1);
  assert.deepEqual(
    searchMobs([kruush, brahson], "kruush").map((mob) => mob.id),
    ["captain-kruush"]
  );
});

test("Captain Kruush lands on the ships, not the unplaced hunt list", () => {
  assert.equal(pinForMob(kruush, pois).id, "bt-ships");
});

test("a named pin wins when the plate already marks that mob", () => {
  assert.equal(pinForMob(brahson, pois).id, "ac-brahson");
});

test("findMob prefers the zone the drop names", () => {
  const other = { ...kruush, id: "captain-kruush-elsewhere", zoneId: "night-harbor", zoneIds: ["night-harbor"] };
  assert.equal(findMob([other, kruush], "Captain Kruush", "blacktide-bay").id, "captain-kruush");
});
