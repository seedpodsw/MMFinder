const test = require("node:test");
const assert = require("node:assert/strict");
const { assetName, ART_LONG } = require("./maps");

test("downloaded map art is served as webp at a pages-friendly size", () => {
  assert.equal(assetName("night-harbor.jpg"), "night-harbor.webp");
  assert.equal(assetName("vale-of-zintar.png"), "vale-of-zintar.webp");
  assert.equal(assetName("ail-vorith.png"), "ail-vorith.webp");
  assert.equal(ART_LONG, 2048);
});
