import assert from "node:assert/strict";
import test from "node:test";
import { breadcrumb, readPlace, writePlace } from "./place.js";

test("atlas zone and pin round-trip", () => {
  const search = writePlace({
    view: "atlas",
    zone: "night-harbor",
    poi: "dock-rats",
  });
  assert.equal(search, "?zone=night-harbor&poi=dock-rats");
  assert.deepEqual(readPlace(search), {
    view: "atlas",
    zone: "night-harbor",
    poi: "dock-rats",
    class: null,
    quest: null,
    item: null,
    q: null,
    slot: null,
    type: null,
    farm: false,
    lvl: null,
    cols: null,
  });
});

test("each tab is a link you can open", () => {
  assert.equal(writePlace({ view: "atlas" }), "?");
  assert.equal(writePlace({ view: "walk" }), "?view=walk");
  assert.equal(writePlace({ view: "turnins" }), "?view=turnins");
  assert.equal(writePlace({ view: "items" }), "?view=items");
  assert.equal(writePlace({ view: "spells" }), "?view=spells");
  assert.equal(writePlace({ view: "gear" }), "?view=gear");
  assert.equal(writePlace({ view: "quests" }), "?view=quests");
  assert.equal(writePlace({ view: "who" }), "?view=who");
  assert.equal(readPlace("?view=who").view, "who");
  assert.equal(readPlace("?view=gear").view, "gear");
  assert.equal(readPlace("?view=turnins").view, "turnins");
});

test("spells and quests keep class in the link", () => {
  assert.equal(writePlace({ view: "spells", class: "wizard" }), "?view=spells&class=wizard");
  assert.equal(
    writePlace({ view: "quests", class: "fighter", quest: "fighter-starter-nh" }),
    "?view=quests&class=fighter&quest=fighter-starter-nh"
  );
});

test("item grid filters round-trip into a link", () => {
  const cols = {
    name: { filterType: "text", type: "contains", filter: "iron" },
    ac: { filterType: "number", type: "greaterThan", filter: 10 },
    zoneName: { filterType: "set", values: ["Night Harbor", "Faelindral"] },
  };
  const search = writePlace({
    view: "items",
    class: "fighter",
    type: "armor",
    slot: "chest",
    q: "plate",
    farm: true,
    lvl: 12,
    cols,
  });
  assert.equal(
    search,
    "?view=items&class=fighter&q=plate&slot=CHEST&type=armor&farm=1&lvl=12&f.name=text.contains%3Airon&f.ac=number.greaterThan%3A10&f.zoneName=set%3ANight%2520Harbor%2CFaelindral"
  );
  const place = readPlace(search);
  assert.equal(place.slot, "CHEST");
  assert.equal(place.type, "armor");
  assert.equal(place.q, "plate");
  assert.equal(place.farm, true);
  assert.equal(place.lvl, 12);
  assert.deepEqual(place.cols, cols);
  const crumbs = breadcrumb(place, { class: "Fighter" });
  assert.deepEqual(
    crumbs.map((crumb) => crumb.label),
    ["MMFinder", "Items", "Fighter", "armor", "CHEST", "plate", "Farmable ≤ 12", "Column filters"]
  );
  assert.equal(crumbs[2].href, "?view=items&class=fighter");
  assert.equal(crumbs[4].href, "?view=items&class=fighter&slot=CHEST&type=armor");
  assert.equal(crumbs.at(-1).href, search);
});

test("breadcrumb links narrow toward the current place", () => {
  const crumbs = breadcrumb(
    { view: "atlas", zone: "night-harbor", poi: "dock-rats" },
    { zone: "Night Harbor", poi: "Dock rats" }
  );
  assert.deepEqual(
    crumbs.map((crumb) => crumb.label),
    ["MMFinder", "Atlas", "Night Harbor", "Dock rats"]
  );
  assert.equal(crumbs.at(-1).href, "?zone=night-harbor&poi=dock-rats");
  assert.equal(crumbs[1].href, "?");
});
