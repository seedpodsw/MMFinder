import assert from "node:assert/strict";
import test from "node:test";
import {
  basicStatRows,
  bestUpgrades,
  defaultStatWeights,
  EQUIP_SLOTS,
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
