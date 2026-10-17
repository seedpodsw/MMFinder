import assert from "node:assert/strict";
import test from "node:test";
import { HOME_ZONE, loadMapView, MAP_VIEW_KEY, openingPlace, saveMapView } from "./map-view.js";

function memory() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

test("a first visit with nothing stored opens on Night Harbor", () => {
  assert.deepEqual(openingPlace({ view: "atlas", zone: null }, null), {
    zone: HOME_ZONE,
    layer: "surface",
    camera: null,
  });
});

test("a saved camera is where the atlas opens next", () => {
  const saved = {
    zone: "shaded-dunes",
    layer: "surface",
    camera: { lat: 12, lng: 40, zoom: 2.2 },
  };
  assert.deepEqual(openingPlace({ view: "atlas", zone: null }, saved), saved);
});

test("a shared zone link wins over the saved camera", () => {
  const saved = {
    zone: "night-harbor",
    layer: "surface",
    camera: { lat: 1, lng: 2, zoom: 3 },
  };
  assert.deepEqual(openingPlace({ view: "atlas", zone: "sungreet-strand" }, saved), {
    zone: "sungreet-strand",
    layer: null,
    camera: null,
  });
});

test("the same zone in the address keeps the saved camera", () => {
  const saved = {
    zone: "night-harbor",
    layer: "surface",
    camera: { lat: 8, lng: 9, zoom: 2.5 },
  };
  assert.deepEqual(openingPlace({ view: "atlas", zone: "night-harbor" }, saved), saved);
});

test("a place pin opens the zone instead of the old camera", () => {
  const saved = {
    zone: "night-harbor",
    layer: "surface",
    camera: { lat: 8, lng: 9, zoom: 2.5 },
  };
  assert.deepEqual(openingPlace({ view: "atlas", zone: "night-harbor", poi: "nh-palace" }, saved), {
    zone: "night-harbor",
    layer: null,
    camera: null,
  });
});

test("map view round-trips and ignores junk", () => {
  const storage = memory();
  saveMapView(storage, {
    zone: "underdocks",
    layer: "deep",
    camera: { lat: -4.5, lng: 80, zoom: 1.25 },
  });
  assert.deepEqual(loadMapView(storage), {
    zone: "underdocks",
    layer: "deep",
    camera: { lat: -4.5, lng: 80, zoom: 1.25 },
  });
  storage.setItem(MAP_VIEW_KEY, "{");
  assert.equal(loadMapView(storage), null);
  storage.setItem(MAP_VIEW_KEY, JSON.stringify({ zone: "nope zone", lat: 1, lng: 2, zoom: 1 }));
  assert.equal(loadMapView(storage), null);
});
