import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { findLootItem, indexItems, isNamedMob, itemGlance, levelNote, namedsByLevel, nearestNamedLevel, parseMobLevel } from "./named-list.js";

test("a single level, a guess, and a plus stay on that number", () => {
  assert.deepEqual(parseMobLevel("10"), { label: "10", levels: [10] });
  assert.deepEqual(parseMobLevel("~16"), { label: "~16", levels: [16] });
  assert.deepEqual(parseMobLevel("63+"), { label: "63+", levels: [63] });
  assert.deepEqual(parseMobLevel("30s"), { label: "30s", levels: [30] });
  assert.deepEqual(parseMobLevel(""), { label: "", levels: [] });
});

test("a range is listed under every level it covers", () => {
  assert.deepEqual(parseMobLevel("10-12").levels, [10, 11, 12]);
  assert.deepEqual(parseMobLevel("3 - 10").levels, [3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(parseMobLevel("16 or 17").levels, [16, 17]);
  assert.deepEqual(parseMobLevel("36 - 40+").levels, [36, 37, 38, 39, 40]);
  assert.equal(levelNote(11, "10-12"), "10-12");
  assert.equal(levelNote(10, "10"), "");
  assert.equal(levelNote(16, "~16"), "~16");
});

test("nameds group by level and keep blanks for the end of the list", () => {
  const { groups, unknown } = namedsByLevel([
    { id: "a", name: "Zed", level: "12" },
    { id: "b", name: "Ann", level: "10-12" },
    { id: "c", name: "Blank", level: "" },
    { id: "d", name: "Mid", level: "12" },
  ]);
  assert.deepEqual(
    groups.map((group) => [group.level, group.mobs.map((row) => row.mob.id)]),
    [
      [10, ["b"]],
      [11, ["b"]],
      [12, ["b", "d", "a"]],
    ]
  );
  assert.deepEqual(
    unknown.map((mob) => mob.id),
    ["c"]
  );
  assert.equal(nearestNamedLevel(groups, 12), 12);
  assert.equal(nearestNamedLevel(groups, 9), 10);
  assert.equal(nearestNamedLevel([], 12), null);
});

test("common a/an mobs stay off the named list unless the wiki marks them named", () => {
  assert.equal(isNamedMob({ name: "A Blacktide brute" }), false);
  assert.equal(isNamedMob({ name: "Ashir the Protector" }), true);
  assert.equal(isNamedMob({ name: "A Bloodynose hag", named: true }), true);
  assert.equal(isNamedMob({ name: "Captain Kruush", named: false }), false);
  const { groups, unknown } = namedsByLevel([
    { id: "brute", name: "A Blacktide brute", level: "23-25" },
    { id: "ashir", name: "Ashir the Protector", level: "25" },
    { id: "hag", name: "A Bloodynose hag", level: "15", named: true },
  ]);
  const ids = groups.flatMap((group) => group.mobs.map((row) => row.mob.id));
  assert.deepEqual([...new Set(ids)].sort(), ["ashir", "hag"]);
  assert.equal(unknown.length, 0);
});

test("a loot name finds the item, and a shortened title still matches", () => {
  const index = indexItems([
    { id: "ashira-protector-axe", name: "Ashira Protector Axe", slot: "PRIMARY SECONDARY", dmg: "8", ac: "0", skill: "1HS" },
    { id: "design-doc", name: "Adrullan: Online Adventures Design Doc", kind: "item" },
    { id: "shield", name: "Shield", slot: "SECONDARY" },
  ]);
  assert.equal(findLootItem(index, "Ashira Protector Axe").id, "ashira-protector-axe");
  assert.equal(findLootItem(index, "Adrullan: Online Adventures Design Document").id, "design-doc");
  assert.equal(findLootItem(index, "Shield of the Protector"), null);
  const wraps = indexItems([{ name: 'D<span class="item-title-sm">uskswamp</span> Wraps', slot: "HANDS" }]);
  assert.equal(findLootItem(wraps, "Duskswamp Wraps").slot, "HANDS");
  assert.equal(itemGlance(wraps.list[0]).name, "Duskswamp Wraps");
  const glance = itemGlance(index.byNorm.get("ashira protector axe"));
  assert.equal(glance.line, "Primary, Secondary · 1HS");
  assert.deepEqual(glance.stats, ["DMG 8"]);
  assert.equal(itemGlance(null), null);
});

test("every wiki named with a level is listed", () => {
  const data = JSON.parse(fs.readFileSync(new URL("../../data/wiki-mobs.json", import.meta.url), "utf8"));
  const { groups, unknown } = namedsByLevel(data.mobs);
  const listed = new Set();
  for (const group of groups) {
    for (const row of group.mobs) listed.add(row.mob.id);
  }
  const roster = data.mobs.filter(isNamedMob);
  const leveled = roster.filter((mob) => parseMobLevel(mob.level).levels.length);
  for (const mob of leveled) assert.ok(listed.has(mob.id), mob.name);
  assert.equal(listed.has("a-blacktide-brute"), false);
  assert.equal(unknown.length, roster.length - leveled.length);
  assert.ok(groups.length > 10);
  assert.ok(groups[0].level < groups.at(-1).level);
});
