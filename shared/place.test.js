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
