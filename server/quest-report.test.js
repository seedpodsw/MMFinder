const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { compareQuestToPage, buildQuestReport } = require("./quest-report");

const QUESTS_PATH = path.join(__dirname, "quests.js");

test("quest report matches turn-in npc reward, not the action sentence", () => {
  const quest = {
    id: "fighter-starter",
    title: "Fighter Starter",
    wiki: "Fighter_Starter_Quest_(Night_Harbor)",
    steps: [
      {
        id: "s1",
        action: "A hand-written paraphrase that will never appear on the wiki page.",
        turnIn: "Rusty Short Sword",
        npc: "Fedamius Steele III",
        reward: "Experience",
      },
    ],
  };
  const pageOk =
    "Talk to Fedamius Steele III and hand him a Rusty Short Sword. Reward: Experience.";
  const ok = compareQuestToPage(quest, pageOk);
  assert.equal(ok.diverged, false);

  const pageMissing = "Talk to Fedamius Steele III. Reward: Experience.";
  const bad = compareQuestToPage(quest, pageMissing);
  assert.equal(bad.diverged, true);
  assert.ok(bad.missingTokens.some((t) => t.value === "Rusty Short Sword"));

  const bare = {
    ...quest,
    steps: [{ id: "s2", action: "Only prose, no tokens." }],
  };
  assert.equal(compareQuestToPage(bare, "").diverged, false);
});

test("quest report lists wiki titles missing from the atlas", () => {
  const catalog = [{ title: "Known", wiki: "Known_Quest", steps: [] }];
  const pages = new Map([["Known_Quest", "anything"]]);
  const report = buildQuestReport(catalog, pages, ["Known Quest", "Brand New Quest"]);
  assert.deepEqual(report.missingFromAtlas, ["Brand New Quest"]);
  assert.equal(report.diverged.length, 0);
});

test("quest report comparer does not write quests.js", () => {
  const before = fs.readFileSync(QUESTS_PATH, "utf8");
  const quest = {
    title: "T",
    wiki: "T",
    steps: [{ id: "1", turnIn: "X", npc: "Y" }],
  };
  compareQuestToPage(quest, "no tokens here");
  buildQuestReport([quest], new Map([["T", "no"]]), ["Other"]);
  assert.equal(fs.readFileSync(QUESTS_PATH, "utf8"), before);
});
