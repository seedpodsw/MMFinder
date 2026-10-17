import assert from "node:assert/strict";
import test from "node:test";
import {
  basicStatRows,
  bestUpgrades,
  defaultStatWeights,
  EQUIP_SLOTS,
  itemInLevelBand,
  matchesSlot,
  normalizeStatWeights,
  priorityLabel,
  scoreItem,
  statSummary,
  weightsDiffer,
} from "./gear.js";

test("default weights match the old primary-stat score", () => {
  const item = { wis: 10, str: 4, ac: 5, name: "Test" };
  const defaults = defaultStatWeights("cleric", "healer");
  assert.equal(defaults.wis, 1.3);
  assert.equal(defaults.str, 0.3);
  assert.equal(scoreItem(item, "healer", "wis", false), scoreItem(item, "healer", "wis", false, defaults));
});

test("raising another stat reorders upgrades for that class", () => {
  const items = [
    { id: "wis-ring", name: "Wisdom Band", slot: "FINGER", class: "CLR", levelMin: 1, wis: 8 },
    { id: "sta-ring", name: "Stamina Band", slot: "FINGER", class: "CLR", levelMin: 1, sta: 8 },
  ];
  const defaults = bestUpgrades(items, { classId: "cleric", role: "healer", level: 10, perSlot: 2 });
  const finger = defaults.find((group) => group.slot === "FINGER");
  assert.equal(finger.items[0].item.id, "wis-ring");

  const stamina = { ...defaultStatWeights("cleric", "healer"), sta: 3, wis: 0 };
  const custom = bestUpgrades(items, {
    classId: "cleric",
    role: "healer",
    level: 10,
    perSlot: 2,
    statWeights: stamina,
  });
  const customFinger = custom.find((group) => group.slot === "FINGER");
  assert.equal(customFinger.items[0].item.id, "sta-ring");
  assert.ok(customFinger.items[0].score > customFinger.items[1].score);
});

test("weights stay in range and report the leader", () => {
  const fallback = defaultStatWeights("rogue", "dps");
  const normalized = normalizeStatWeights({ dex: 9, str: -2, agi: "nope" }, fallback);
  assert.equal(normalized.dex, 3);
  assert.equal(normalized.str, 0);
  assert.equal(normalized.agi, fallback.agi);
  assert.equal(weightsDiffer(normalized, fallback), true);
  assert.equal(priorityLabel({ ...fallback, str: 3, dex: 3 }), "DEX 3, STR 3");
  assert.equal(priorityLabel(defaultStatWeights("wizard", "caster")), "INT 1.3");
});

test("basic stat rows list numbered weapon and armor fields", () => {
  const weapon = { dmg: 12, delay: 24, str: 3, ac: 0, hp: 5 };
  const rows = basicStatRows(weapon, true);
  assert.deepEqual(
    rows.map((row) => `${row.label} ${row.value}`),
    ["DMG 12", "DLY 24", "HP 5", "STR +3"]
  );
  assert.equal(statSummary(weapon, true), "DMG 12 · DLY 24 · HP 5 · STR +3");
});

test("near-level upgrades stay around that level, lowest to best", () => {
  const items = [
    { id: "wide", name: "Fine Black Robe", slot: "CHEST", class: "WIZ", levelMin: 1, levelMax: 40, int: 20, ac: 20 },
    { id: "higher", name: "Dashing Robe", slot: "CHEST", class: "WIZ", levelMin: 10, levelMax: 35, int: 15, ac: 12 },
    { id: "lowwide", name: "Beguiler Tunic", slot: "CHEST", class: "WIZ", levelMin: 1, levelMax: 15, int: 25, ac: 20 },
    { id: "now", name: "Scholar Robe", slot: "CHEST", class: "WIZ", levelMin: 12, levelMax: 22, int: 6, ac: 8 },
    { id: "low", name: "Tattered Robe", slot: "CHEST", class: "WIZ", levelMin: 8, levelMax: 12, int: 1, ac: 2 },
    { id: "old", name: "Ancient Robe", slot: "CHEST", class: "WIZ", levelMin: 1, levelMax: 1, int: 1 },
    { id: "quest", name: "Academy Robe", slot: "CHEST", class: "WIZ", int: 4, ac: 6 },
    { id: "mythic", name: "Wyrmsbane", slot: "CHEST", class: "WIZ", int: 30, ac: 30 },
  ];
  assert.equal(itemInLevelBand(items[3], 12), true);
  assert.equal(itemInLevelBand(items[0], 12), false);
  assert.equal(itemInLevelBand(items[1], 12), false);
  assert.equal(itemInLevelBand(items[2], 12), false);
  const [chest] = bestUpgrades(items, {
    classId: "wizard",
    role: "caster",
    level: 12,
    nearLevel: true,
    order: "asc",
    perSlot: 0,
    slotKey: "CHEST",
  });
  assert.deepEqual(
    chest.items.map((row) => row.item.id),
    ["low", "quest", "now"]
  );
  assert.ok(chest.items.at(-1).score >= chest.items[0].score);
});

test("paired slots accept the wiki item slot", () => {
  const ear = { slot: "EAR" };
  const wrist = { slot: "WRIST" };
  const finger = { slot: "FINGER" };
  const byKey = Object.fromEntries(EQUIP_SLOTS.map((slot) => [slot.key, slot]));
  assert.equal(matchesSlot(ear, byKey.EAR), true);
  assert.equal(matchesSlot(ear, byKey.EAR2), true);
  assert.equal(matchesSlot(wrist, byKey.WRIST2), true);
  assert.equal(matchesSlot(finger, byKey.FINGER2), true);
  assert.equal(matchesSlot(ear, byKey.FINGER), false);
});
