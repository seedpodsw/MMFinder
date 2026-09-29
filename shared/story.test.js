const test = require("node:test");
const assert = require("node:assert/strict");
const story = require("./story");

const world = {
  settings: { characterLevel: 1, characterClass: "", completedSteps: [] },
  classes: [{ id: "warrior", name: "Warrior" }],
  quests: [{ id: "q1", title: "Rats", poiId: "camp-1", steps: [] }],
  zones: [{ id: "night-harbor", name: "Night Harbor", map: "/maps/night-harbor.webp", camps: [] }],
  pois: [
    {
      id: "camp-1",
      zoneId: "night-harbor",
      name: "Yard",
      kind: "camp",
      source: "seed",
      notes: "Newbie yard",
    },
  ],
  items: [{ id: "rusty-sword", name: "Rusty Sword", origin: "wiki", sources: [], wikiUrl: "https://example/wiki" }],
  atlas: {
    overlays: [{ id: "night-harbor", src: "/maps/night-harbor.webp", placeholder: false, artClip: { l: 1 }, inset: { l: 1 } }],
  },
};

const seedNotes = [
  { id: "seed-note", title: "Seed", body: "Ships with the atlas", targetType: "journal", targetId: null, updatedAt: "2020-01-01T00:00:00.000Z" },
];

test("seed notes stay, and a local note is added without touching the seed list", () => {
  const created = story.createNote(story.emptyStory(), { title: "Mine", body: "Local only" }, { id: () => "n1", now: () => "2026-01-01T00:00:00.000Z" });
  const view = story.applyStory(world, seedNotes, created.story);
  assert.equal(created.note.id, "n1");
  assert.deepEqual(
    view.notes.map((n) => n.id),
    ["n1", "seed-note"]
  );
  assert.equal(seedNotes.length, 1);
});

test("deleting a seed note hides it locally and keeps the seed file intact", () => {
  const removed = story.deleteNote(story.emptyStory(), "seed-note", seedNotes);
  const view = story.applyStory(world, seedNotes, removed.story);
  assert.deepEqual(view.notes, []);
  assert.equal(seedNotes[0].id, "seed-note");
});

test("empty notes are rejected", () => {
  assert.throws(
    () => story.createNote(story.emptyStory(), { title: "", body: "  " }, { id: () => "n", now: () => "t" }),
    /Write something first/
  );
});

test("a local camp shows on its zone, and deleting a seed camp stays deleted", () => {
  const made = story.createPoi(
    story.emptyStory(),
    { zoneId: "night-harbor", name: "My rock", kind: "camp", monsters: "crabs" },
    { zones: world.zones, id: () => "p1", now: () => "2026-01-02T00:00:00.000Z" }
  );
  const withCamp = story.applyStory(world, [], made.story);
  assert.equal(withCamp.zones[0].camps.some((p) => p.id === "p1"), true);
  assert.equal(withCamp.pois.find((p) => p.id === "p1").custom, true);

  const removed = story.deletePoi(story.emptyStory(), "camp-1", world.pois);
  const after = story.applyStory(world, [], removed.story);
  assert.equal(after.pois.some((p) => p.id === "camp-1"), false);
  assert.equal(world.pois.length, 1);
});

test("settings override the baked defaults and reject an unknown class", () => {
  const saved = story.saveSettings(
    story.emptyStory(),
    { characterLevel: 80, characterClass: "nope", completedSteps: ["a"] },
    { classes: world.classes, defaults: world.settings }
  );
  assert.equal(saved.settings.characterLevel, 60);
  assert.equal(saved.settings.characterClass, "");
  const known = story.saveSettings(saved.story, { characterClass: "warrior" }, { classes: world.classes, defaults: world.settings });
  const view = story.applyStory(world, [], known.story);
  assert.equal(view.settings.characterClass, "warrior");
  assert.deepEqual(view.settings.completedSteps, ["a"]);
});

test("a local item overlays the catalog entry and can be removed", () => {
  const made = story.createItem(
    story.emptyStory(),
    world.items,
    { name: "Rusty Sword", notes: "mine" },
    { id: () => "unused", now: () => "2026-01-03T00:00:00.000Z" }
  );
  assert.equal(made.item.id, "rusty-sword");
  const view = story.applyStory(world, [], made.story);
  assert.equal(view.items.find((it) => it.id === "rusty-sword").notes, "mine");
  assert.equal(view.items.find((it) => it.id === "rusty-sword").origin, "user");

  const removed = story.deleteItem(made.story, "rusty-sword");
  const after = story.applyStory(world, [], removed.story);
  assert.equal(after.items.find((it) => it.id === "rusty-sword").origin, "wiki");
});

test("wiki items that were never saved locally cannot be deleted", () => {
  assert.throws(() => story.deleteItem(story.emptyStory(), "rusty-sword"), /cannot be deleted/);
});

test("a local map replaces the zone image and the atlas overlay", () => {
  const view = story.applyStory(world, [], story.emptyStory(), {
    "night-harbor": { url: "blob:local-map", filename: "night-harbor.webp", updatedAt: "t" },
  });
  assert.equal(view.zones[0].map, "blob:local-map");
  assert.equal(view.atlas.overlays[0].src, "blob:local-map");
  assert.equal(view.atlas.overlays[0].artClip, null);
  assert.equal(view.atlas.overlays[0].inset, null);
});

test("quest titles stay attached when a seed camp is still present", () => {
  const view = story.applyStory(world, [], story.emptyStory());
  assert.deepEqual(view.pois[0].quests, ["Rats"]);
});
