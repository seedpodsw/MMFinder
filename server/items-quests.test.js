const test = require("node:test");
const assert = require("node:assert/strict");
const { turnInNames, deriveFromQuests, linkIdFor, publicItems, guessKind, knownLootFromWikitext } = require("./items");
const { publicQuests } = require("./quests");
const { sellStopsFor, sellToFor } = require("./vendors");
const { zones } = require("./world");
const { seedPois } = require("./poi-seed");
const { parseCraftBlocks, attachCraftInfo } = require("./craft");

test("item hashes attach by wiki page, including a pasted item| prefix", () => {
  const links = { byPage: { Tattered_Cloth_Gorget: "12331f1850ee94625029bc27" }, byName: { "short sword": "abcdefabcdefabcdefabcdef" } };
  assert.equal(linkIdFor({ wiki: "Tattered Cloth Gorget", name: "Other" }, links), "12331f1850ee94625029bc27");
  assert.equal(linkIdFor({ name: "Short Sword" }, links), "abcdefabcdefabcdefabcdef");
  assert.equal(linkIdFor({ item_link_id: "item|12331f1850ee94625029bc27", name: "Short Sword" }, links), "12331f1850ee94625029bc27");
});

test("worn armor stays armor when the wiki category is only Items", () => {
  assert.equal(guessKind({ name: "Acolyte Robe Of Ashes", slot: "Chest", categories: ["Items"], ac: "6" }), "armor");
  assert.equal(guessKind({ name: "Aged Craftsman Bracer", slot: "WRIST", categories: ["Items"], ac: "25" }), "armor");
  assert.equal(guessKind({ name: "Academy Robe", slot: "", categories: ["Chest", "Wizard Equipment"] }), "armor");
  assert.equal(guessKind({ name: "Tattered Cloth Gorget", slot: "NECK", categories: ["Neck"], ac: "1" }), "jewelry");
  assert.equal(guessKind({ name: "Short Sword", slot: "PRIMARY", skill: "SLA", categories: ["Primary"] }), "weapon");
  assert.equal(guessKind({ name: "Buckler", slot: "SECONDARY", ac: "3", categories: ["Secondary"] }), "shield");
  assert.equal(guessKind({ name: "Simple Wooden Lute", slot: "SECONDARY", categories: ["Secondary"] }), "item");
  assert.equal(guessKind({ name: "Lantern", slot: "PRIMARY SECONDARY BELT", categories: ["Items"] }), "item");
  assert.equal(
    guessKind({ name: "The Wrekronomicon", slot: "PRIMARY SECONDARY WAIST BELT", skill: "BLG", dmg: "5" }),
    "weapon"
  );
  assert.equal(guessKind({ name: "Cooked Rat Meat", slot: "", categories: ["Food"] }), "food");
  assert.equal(guessKind({ name: "Spider Silk", slot: "", categories: ["Items"] }), "item");
  assert.equal(guessKind({ name: "Corrupted Leather Boots", slot: "", ac: "9", categories: ["All Race Equipment"] }), "armor");
  assert.equal(guessKind({ name: "Shield of Bones", slot: "", ac: "24", categories: ["All Race Equipment"] }), "shield");
  assert.equal(guessKind({ name: "Ruby Pendant of the Nine", slot: "", ac: "1", categories: ["All Class Equipment"] }), "jewelry");
  assert.equal(guessKind({ name: "Enchant Boots: Agility", slot: "", categories: ["All Class Equipment"] }), "item");
  assert.equal(guessKind({ name: "Ba'Haara Lute", slot: "SECONDARY", ac: "30", categories: ["Instruments"] }), "instrument");
  assert.equal(guessKind({ name: "Moondew Moss", slot: "", categories: ["Herb"] }), "herb");
});

test("the published catalog does not file robes as generic items", () => {
  const items = publicItems([], null, {});
  const robe = items.find((item) => item.name === "Acolyte Robe Of Ashes");
  assert.ok(robe, "Acolyte Robe Of Ashes");
  assert.equal(robe.kind, "armor");
  const armor = items.filter((item) => item.kind === "armor").length;
  assert.ok(armor > 500, `expected hundreds of armor pieces, got ${armor}`);
});

test("a published wiki item keeps its chat hash", () => {
  const items = publicItems([], null, {});
  const gorget = items.find((item) => item.name === "Tattered Cloth Gorget");
  assert.equal(gorget && gorget.linkId, "12331f1850ee94625029bc27");
});

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

test("known loot keeps linked names, a trailing note, and each zone block", () => {
  const text = `{{Namedmobpage
| known_loot =
* [[Ashira Protector Axe]]
* [[Mote of Shadow]] - Tailoring, Rare drop
*
| factions =
* [[Benu Memza]]
}}
{{Namedmobpage
| known_loot =
* [[Zone B Drop]]
* [[Ashira Protector Axe]]
}}`;
  assert.deepEqual(knownLootFromWikitext(text), [
    { name: "Ashira Protector Axe" },
    { name: "Mote of Shadow", note: "Tailoring, Rare drop" },
    { name: "Zone B Drop" },
  ]);
  const html = `| known_loot =
<ul class="hover-list">
<li>[[Commander's Cloak]] - Common</li>
<li>Corroded Bronze Armor</li>
<li>?</li>
</ul>
| factions =`;
  assert.deepEqual(knownLootFromWikitext(html), [
    { name: "Commander's Cloak", note: "Common" },
    { name: "Corroded Bronze Armor" },
  ]);
});

test("named mobs keep a zone and a written spot", () => {
  const { publicMobs } = require("./items");
  const mobs = publicMobs(zones);
  const brute = mobs.find((mob) => mob.name === "A Blacktide brute");
  const hag = mobs.find((mob) => mob.name === "A Bloodynose hag");
  const steward = mobs.find((mob) => mob.name === "A Claw steward");
  assert.equal(brute?.named, false);
  assert.equal(hag?.named, true);
  assert.equal(steward?.named, false);
  assert.equal(mobs.find((mob) => mob.name === "X2 Recipient")?.named, false);
  const kruush = mobs.find((mob) => mob.name === "Captain Kruush");
  assert.ok(kruush, "Captain Kruush");
  assert.equal(kruush.named, true);
  assert.equal(kruush.zoneId, "blacktide-bay");
  assert.match(kruush.location, /upper deck of main ship/);
  assert.equal(kruush.location.includes("[["), false);
  assert.ok(mobs.length > 100);
  const ashir = mobs.find((mob) => mob.name === "Ashir the Protector");
  assert.ok(ashir.loot.some((drop) => drop.name === "Ashira Protector Axe"));
  assert.equal(
    ashir.loot.some((drop) => /scrap|meat/i.test(drop.name)),
    false
  );
});

test("wiki levels land on named pins and unplaced hunts stay off the plate", () => {
  const { loadMobCache } = require("./items");
  const bone = seedPois.find((p) => p.id === "tw-construct");
  const boneMob = Object.values(loadMobCache()).find((m) => m.name === "Bone Construct");
  const boneLevel = Number(String(boneMob?.level || "").match(/(\d+)/)?.[1]);
  assert.ok(boneLevel, "Bone Construct level in mob cache");
  assert.equal(bone.soloMin, boneLevel);
  assert.equal(bone.mx, 54);
  assert.equal(bone.my, 22);
  const kruushPin = seedPois.find((p) => p.id === "bt-kruush");
  assert.equal(kruushPin.zoneId, "blacktide-bay");
  assert.ok(kruushPin.mx > 40 && kruushPin.mx < 55);
  assert.equal(kruushPin.soloMin, 29);
  const ships = seedPois.find((p) => p.id === "bt-ships");
  assert.ok(ships.mx > 40, "ships sit on the boats, not the margin caption");
  const bay = seedPois.find((p) => p.id === "wiki-lv-blacktide-bay");
  assert.ok(bay, "blacktide hunt list");
  assert.equal(bay.mx, undefined);
  assert.equal(/Captain Kruush/.test(bay.monsters), false);
  const fae = seedPois.find((p) => p.id === "wiki-lv-faelindral");
  assert.ok(fae, "faelindral hunt list");
  assert.equal(fae.mx, undefined);
  assert.equal(fae.my, undefined);
});

test("catalog diff reports added changed and removed names", () => {
  const { diffCatalog, atomicWriteJson } = require("./wiki-catalog-diff");
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const previous = [
    { wiki: "A", name: "A", ac: "1" },
    { wiki: "B", name: "B", ac: "1" },
  ];
  const next = [
    { wiki: "A", name: "A", ac: "2" },
    { wiki: "C", name: "C", ac: "1" },
  ];
  const diff = diffCatalog(previous, next, { keyFn: (r) => r.wiki, nameFn: (r) => r.name });
  assert.deepEqual(diff.added, ["C"]);
  assert.deepEqual(diff.changed, ["A"]);
  assert.deepEqual(diff.removed, ["B"]);

  const merchantsPrev = [{ name: "Shortfolk", items: ["a"] }, { name: "Gone Stall", items: ["b"] }];
  const merchantsNext = [{ name: "Shortfolk", items: ["a"] }];
  const mDiff = diffCatalog(merchantsPrev, merchantsNext, {
    keyFn: (r) => r.name,
    nameFn: (r) => r.name,
  });
  assert.deepEqual(mDiff.removed, ["Gone Stall"]);

  const file = path.join(os.tmpdir(), `mmfinder-catalog-${Date.now()}.json`);
  const prior = { importedAt: "2020-01-01", mobs: [{ name: "Old" }] };
  fs.writeFileSync(file, JSON.stringify(prior));
  const before = fs.readFileSync(file, "utf8");
  try {
    throw new Error("fetch failed");
  } catch {
    /* no write after failed fetch */
  }
  assert.equal(fs.readFileSync(file, "utf8"), before);
  atomicWriteJson(file, { importedAt: "2026-01-01", mobs: [{ name: "New" }] });
  assert.match(fs.readFileSync(file, "utf8"), /New/);
  fs.rmSync(file, { force: true });
});

test("wiki level notes fill empty pins and annotate hand levels without moving them", () => {
  const { withWikiLevels, setWikiLevelNote } = require("./wiki-hunts");
  assert.equal(setWikiLevelNote("Wiki level 16.", "18"), "Wiki level 18.");
  assert.equal(setWikiLevelNote("North floor.", "31"), "North floor. Wiki level 31.");

  const mobs = [
    {
      name: "Bone Construct",
      zoneId: "tomb-wyrmsbane",
      key: "bone construct",
      zoneCount: 1,
      level: { soloMin: 63, soloMax: 63, label: "63+" },
    },
    {
      name: "Captain Kruush",
      zoneId: "blacktide-bay",
      key: "captain kruush",
      zoneCount: 1,
      level: { soloMin: 31, soloMax: 31, label: "31" },
    },
    {
      name: "Blacktide warmage",
      zoneId: "blacktide-bay",
      key: "blacktide warmage",
      zoneCount: 1,
      level: { soloMin: 22, soloMax: 22, label: "22" },
    },
  ];
  const pois = [
    { id: "tw-construct", zoneId: "tomb-wyrmsbane", name: "Bone Construct", kind: "named", mx: 54, my: 22, notes: "North 1–3F." },
    {
      id: "bt-kruush",
      zoneId: "blacktide-bay",
      name: "Captain Kruush",
      kind: "named",
      mx: 46.6,
      my: 85.3,
      soloMin: 29,
      soloMax: 29,
      monsters: "Captain Kruush 29",
      notes: "Upper deck of the main ship.",
    },
  ];
  const logged = [];
  const out = withWikiLevels(pois, {
    mobs,
    zones: [
      { id: "tomb-wyrmsbane", name: "Tomb of the Last Wyrmsbane" },
      { id: "blacktide-bay", name: "Blacktide Bay" },
    ],
    skipDrops: true,
    log: (line) => logged.push(line),
  });
  const bone = out.find((p) => p.id === "tw-construct");
  assert.equal(bone.soloMin, 63);
  assert.equal(bone.mx, 54);
  assert.match(bone.notes, /63\+/);
  const kruush = out.find((p) => p.id === "bt-kruush");
  assert.equal(kruush.soloMin, 29);
  assert.equal(kruush.mx, 46.6);
  assert.match(kruush.notes, /Wiki level 31\./);
  const bay = out.find((p) => p.id === "wiki-lv-blacktide-bay");
  assert.ok(bay);
  assert.equal(bay.mx, undefined);
  assert.equal(/Captain Kruush/.test(bay.monsters), false);
  assert.match(bay.monsters, /Blacktide warmage/);
  assert.ok(logged.some((line) => /Blacktide warmage/.test(line)));
});
