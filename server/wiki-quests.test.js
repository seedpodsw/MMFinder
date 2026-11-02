const test = require("node:test");
const assert = require("node:assert/strict");
const { parseQuestWikitext, mergeWikiQuests } = require("./wiki-quests");

const BONE = `{{Quest
|Start Zone = [[Night Harbor]]
|Quest Giver = [[Squire Ryland]]
|Minimum Level = 1
|Classes = All
|Quest Rewards = (exp)
}}
{{QuestInfo|This quest is repeatable.}}
{{QuestNote|Give 5 [[Bone Chips]] to [[Squire Ryland]].}}
* Faction gained with [[Penitent Knights of the Hospice]]
`;

const FUNGAL = `{{Quest
|Start Zone = [[Ail'Vorith]]
|Quest Giver = [[Leatherworker Vex]]
|Minimum Level = 5
|Classes = ALL
|Quest Rewards = [[Fungal Coat]]; [[Fungal Helm]]
}}
== Reward ==
* [[Fungal Boots]]
{{QuestNote|Hunt [[a cave myconid]] and hand the parts to [[Leatherworker Vex]].}}
`;

test("a quest page keeps the giver, level, zone, rewards, and note", () => {
  const bone = parseQuestWikitext("Bone Chips for Squire Ryland", BONE);
  assert.equal(bone.giver, "Squire Ryland");
  assert.equal(bone.levelMin, 1);
  assert.equal(bone.zoneId, "night-harbor");
  assert.equal(bone.repeatable, true);
  assert.deepEqual(bone.classIds, ["all"]);
  assert.ok(bone.rewards.includes("Experience"));
  assert.ok(bone.rewards.includes("Penitent Knights of the Hospice faction"));
  assert.match(bone.notes[0], /5 Bone Chips/);

  const docks = parseQuestWikitext(
    "Find Delilah's Pet",
    "{{Quest\n|Start Zone = [[Underdocks]]\n|Quest Giver = [[Delilah]]\n|Minimum Level = 1\n|Classes = All\n|Related NPCs = [[?]]\n|Quest Rewards = [[Turtle Shell Shield]], 1; (money: 55S)\n}}"
  );
  assert.equal(docks.zoneId, "underdocks");
  assert.equal(docks.city, "The Underdocks");
  assert.deepEqual(docks.npcs, []);
  assert.deepEqual(docks.rewards, ["Turtle Shell Shield", "Coin"]);

  const fungal = parseQuestWikitext("Fungal Armor Quests", FUNGAL);
  assert.equal(fungal.zoneId, "ail-vorith");
  assert.equal(fungal.levelMin, 5);
  assert.ok(fungal.rewards.includes("Fungal Coat"));
  assert.ok(fungal.rewards.includes("Fungal Boots"));
});

test("wiki facts land on a hand-written quest and new pages are added", () => {
  const catalog = [
    {
      id: "bone-chips-ryland",
      title: "Bone Chips for Squire Ryland",
      wiki: "Bone_Chips_for_Squire_Ryland",
      npc: "Squire Ryland",
      zoneId: "night-harbor",
      city: "Night Harbor",
      levelMin: 1,
      rewards: ["Experience, Penitent Knights faction"],
      steps: [
        {
          id: "ryland-2",
          action: "Hand him 5 at a time.",
          turnIn: "5 Bone Chips",
        },
      ],
    },
  ];
  const wiki = [
    parseQuestWikitext("Bone Chips for Squire Ryland", BONE),
    parseQuestWikitext("Fungal Armor Quests", FUNGAL),
  ];
  const merged = mergeWikiQuests(catalog, wiki);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, "bone-chips-ryland");
  assert.equal(merged[0].npc, "Squire Ryland");
  assert.equal(merged[0].repeatable, true);
  assert.ok(!merged[0].rewards.some((reward) => /Hospice faction/.test(reward)));
  assert.equal(merged[1].title, "Fungal Armor Quests");
  assert.equal(merged[1].kind, "armor");
  assert.equal(merged[1].zoneId, "ail-vorith");
  assert.equal(merged[1].levelMin, 5);
  assert.match(merged[1].steps[0].action, /cave myconid/);
});
