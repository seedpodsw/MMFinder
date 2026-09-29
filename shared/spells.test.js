import assert from "node:assert/strict";
import test from "node:test";
import { filterEntries, sortEntries, toggleQuickGroup, QUICK_TAG_GROUPS } from "./spells.js";

const sample = [
  {
    name: "Minor Flash of Ice",
    description: "Cold flash",
    category: "Evo",
    level: 1,
    mana: 8,
    castTime: "2.0s",
    tags: ["damage", "slow"],
    primaryTag: "damage",
    effects: [{ sortKey: 9 }],
  },
  {
    name: "Heal",
    description: "Restore health",
    category: "Alt",
    level: 12,
    mana: "Innate",
    castTime: null,
    tags: ["heal"],
    primaryTag: "heal",
    effects: [{ sortKey: 40 }],
  },
];

test("filters by search, tag, and level", () => {
  const tagged = filterEntries(sample, {
    search: "flash",
    tags: new Set(["damage"]),
    levelMin: null,
    levelMax: 5,
    primaryTagOnly: false,
  });
  assert.equal(tagged.length, 1);
  assert.equal(tagged[0].name, "Minor Flash of Ice");
});

test("primary tag only ignores secondary tags", () => {
  const tagged = filterEntries(sample, {
    search: "",
    tags: new Set(["slow"]),
    levelMin: null,
    levelMax: null,
    primaryTagOnly: true,
  });
  assert.equal(tagged.length, 0);
});

test("sorts innate mana after numeric mana", () => {
  const sorted = sortEntries(sample, "mana-asc");
  assert.equal(sorted[0].name, "Minor Flash of Ice");
  assert.equal(sorted[1].name, "Heal");
});

test("quick groups toggle every member tag", () => {
  const group = QUICK_TAG_GROUPS.find((item) => item.id === "damage");
  const available = [
    { tag: "damage", count: 1 },
    { tag: "dot", count: 1 },
  ];
  const on = toggleQuickGroup(group, available, new Set());
  assert.equal(on.has("damage"), true);
  assert.equal(on.has("dot"), true);
  assert.equal(on.has("aoe"), false);
  const off = toggleQuickGroup(group, available, on);
  assert.equal(off.size, 0);
});
