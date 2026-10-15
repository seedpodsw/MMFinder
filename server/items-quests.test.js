const test = require("node:test");
const assert = require("node:assert/strict");
const { turnInNames, deriveFromQuests } = require("./items");
const { publicQuests } = require("./quests");
const { sellStopsFor, sellToFor } = require("./vendors");
const { zones } = require("./world");
const { seedPois } = require("./poi-seed");
const { parseCraftBlocks, attachCraftInfo } = require("./craft");

test("turn-in text keeps counted item names", () => {
  const names = turnInNames(
    "Combine 2 Bone Chips, 1 Fire Beetle Gland, and Moondew Moss in the pouch.",
    new Set(["moondew moss"])
  );
  assert.ok(names.includes("Bone Chips"));
  assert.ok(names.includes("Fire Beetle Gland"));
  assert.ok(names.includes("Moondew Moss"));
});

test("Bone Chips is attached to its quests", () => {
  const quests = publicQuests();
  const items = deriveFromQuests(quests, []);
  const chips = items.find((item) => item.name === "Bone Chips");
  assert.ok(chips, "Bone Chips item");
  const titles = chips.sources.map((s) => s.label).sort();
  assert.ok(titles.includes("Bone Chips for Squire Ryland"));
  assert.ok(titles.includes("Bone Chips for Moon Dances"));
  assert.ok(titles.includes("Shaman Starter Quest"));
});

test("Zombie Skin lists reagent vendors and a no-drop item has no vendor", () => {
  const zombie = sellToFor({ name: "Zombie Skin", kind: "item", slot: "", categories: ["Items"], nodrop: "" });
  assert.match(zombie, /reagent vendor/);
  assert.match(zombie, /Night Harbor/);
  assert.equal(zombie.includes("no known vendor"), false);
  assert.equal(sellToFor({ name: "Zombie Skin", nodrop: "true" }), "no known vendor");
  assert.equal(sellToFor({ name: "Not A Real Drop", kind: "item", slot: "", categories: [] }), "no known vendor");
});

test("a sell stop names the stall and pins it when the map has that place", () => {
  const stops = sellStopsFor(
    { name: "Zombie Skin", kind: "item", slot: "", categories: ["Items"], nodrop: "" },
    zones,
    seedPois
  );
  const shortfolk = stops.find((stop) => stop.place === "Shortfolk Area");
  const spire = stops.find((stop) => /Spellbinders of the Spire bottom floor/.test(stop.place));
  assert.ok(shortfolk);
  assert.equal(shortfolk.zone, "Night Harbor");
  assert.equal(shortfolk.type, "reagent vendor");
  assert.equal(shortfolk.buys, "Zombie Skin");
  assert.equal(shortfolk.poiId, "");
  assert.equal(spire.pin, "Spellbinders Spire");
  assert.equal(spire.zoneId, "night-harbor");
});

test("recipe text keeps the skill, materials, and products", () => {
  const made = parseCraftBlocks(`* [[Tailoring]] (Trivial: 15)
** '''Yield: Spider Silk Thread''' x1
** In [[Tailoring Kit]]:
:: x2 [[Spider Silk]] - Dropped, Bought`);
  assert.equal(made[0].skill, "Tailoring");
  assert.equal(made[0].trivial, "15");
  assert.equal(made[0].container, "Tailoring Kit");
  assert.deepEqual(made[0].materials, [{ qty: "2", name: "Spider Silk", alt: false }]);

  const used = parseCraftBlocks(`[[Tailoring]]
* [[Spider Silk Thread]] (Trivial: 15)
* [[Spider Silk Cap]] (Trivial: ~55)`);
  assert.equal(used[0].skill, "Tailoring");
  assert.equal(used[0].yieldName, "Spider Silk Thread");
  assert.equal(used[1].yieldName, "Spider Silk Cap");

  const rows = attachCraftInfo([
    {
      id: "spider-silk",
      name: "Spider Silk",
      recipes: "[[Tailoring]]\n* [[Spider Silk Thread]] (Trivial: 15)",
      playercrafted: "",
    },
    {
      id: "spider-silk-thread",
      name: "Spider Silk Thread",
      playercrafted: "* [[Tailoring]] (Trivial: 15)\n** '''Yield: Spider Silk Thread''' x1\n** In [[Tailoring Kit]]:\n:: x2 [[Spider Silk]]",
      recipes: "",
    },
    { id: "plain-rock", name: "Plain Rock", playercrafted: "", recipes: "" },
  ]);
  const silk = rows.find((row) => row.name === "Spider Silk");
  const thread = rows.find((row) => row.name === "Spider Silk Thread");
  const rock = rows.find((row) => row.name === "Plain Rock");
  assert.match(silk.usedIn, /Spider Silk Thread \(Tailoring, trivial 15 in Tailoring Kit\): 2× Spider Silk/);
  assert.equal(silk.recipe, "Tailoring");
  assert.equal(thread.materials, "2× Spider Silk");
  assert.match(thread.recipe, /Tailoring, trivial 15 in Tailoring Kit/);
  assert.equal(rock.recipe, "no known recipe");
  assert.equal(rock.materials, "no known recipe");
  assert.equal(rock.usedIn, "no known recipe");

  const alumRows = attachCraftInfo([
    {
      id: "alum",
      name: "Alum",
      playercrafted: "",
      recipes: "[[Alchemy]]\n* [[Alum Solution]]",
    },
    {
      id: "alum-solution",
      name: "Alum Solution",
      playercrafted: "",
      recipes: "* [[Alchemy]] (Trivial: 25)\n** '''Yield: Alum Solution''' x1\n** In [[Cauldron]]:\n:: x5 [[Alum]]\n:: x5 [[Resin]]",
    },
    {
      id: "animal-glue",
      name: "Animal Glue",
      playercrafted: "",
      recipes: "",
    },
    {
      id: "cracked-amphora",
      name: "Cracked Amphora",
      playercrafted: "* [[Pottery]] (Trivial: 0)\n** '''Yield: [[Repaired Hathalian Amphora]]''' x1\n** In [[Cracked Amphora]]:\n:: x1 [[Antique Ceramic Fragment]]\n:: x1 [[Animal Glue]]",
      recipes: "",
    },
  ]);
  const alum = alumRows.find((row) => row.name === "Alum");
  const solution = alumRows.find((row) => row.name === "Alum Solution");
  const glue = alumRows.find((row) => row.name === "Animal Glue");
  assert.match(alum.usedIn, /Alum Solution \(Alchemy, trivial 25 in Cauldron\): 5× Alum, 5× Resin/);
  assert.equal(solution.usedIn, "no known recipe");
  assert.match(solution.materials, /5× Alum, 5× Resin/);
  assert.match(glue.usedIn, /Repaired Hathalian Amphora \(Pottery, trivial 0 in Cracked Amphora\): 1× Antique Ceramic Fragment, 1× Animal Glue/);
});

test("quest list is not class-limited", () => {
  const quests = publicQuests();
  const titles = new Set(quests.map((q) => q.id));
  assert.ok(titles.has("bone-chips-ryland"));
  assert.ok(titles.has("fighter-starter-nh"));
  assert.ok(titles.has("wizard-starter-nh"));
  assert.equal(quests.filter((q) => q.kind === "turnin").length >= 6, true);
});

test("named mobs keep a zone and a written spot", () => {
  const { publicMobs } = require("./items");
  const mobs = publicMobs(zones);
  const kruush = mobs.find((mob) => mob.name === "Captain Kruush");
  assert.ok(kruush, "Captain Kruush");
  assert.equal(kruush.zoneId, "blacktide-bay");
  assert.match(kruush.location, /upper deck of main ship/);
  assert.equal(kruush.location.includes("[["), false);
  assert.ok(mobs.length > 100);
});

test("wiki levels land on named pins and unplaced hunts stay off the plate", () => {
  const bone = seedPois.find((p) => p.id === "tw-construct");
  assert.equal(bone.soloMin, 63);
  assert.match(bone.notes, /63\+/);
  const bay = seedPois.find((p) => p.id === "wiki-lv-blacktide-bay");
  assert.ok(bay, "blacktide hunt list");
  assert.equal(bay.mx, undefined);
  assert.match(bay.monsters, /Captain Kruush 29/);
  assert.equal(seedPois.some((p) => p.id === "wiki-lv-faelindral"), false);
});
