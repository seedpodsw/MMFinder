const test = require("node:test");
const assert = require("node:assert/strict");
const { assetName, ART_LONG, buildAtlas } = require("./maps");

test("downloaded map art is served as webp at a pages-friendly size", () => {
  assert.equal(assetName("night-harbor.jpg"), "night-harbor.webp");
  assert.equal(assetName("vale-of-zintar.png"), "vale-of-zintar.webp");
  assert.equal(assetName("ail-vorith.png"), "ail-vorith.webp");
  assert.equal(ART_LONG, 2048);
});

test("world bounds keep Grimtide inside the pannable map", () => {
  const atlas = buildAtlas();
  const grim = atlas.overlays.find((o) => o.id === "grimtide-sanctum");
  const [[south, west], [north, east]] = atlas.continent.bounds;
  assert.ok(grim, "grimtide overlay");
  assert.ok(grim.bounds[0][0] > south + 400, "room south of Grimtide");
  assert.ok(grim.bounds[0][1] > west + 400, "room west of Grimtide");
  assert.ok(grim.bounds[1][0] < north);
  assert.ok(grim.bounds[1][1] < east);
});
