import assert from "node:assert/strict";
import test from "node:test";
import { cleanLinkId, gameItemLink } from "./item-link.js";

test("a wiki hash becomes the in-game chat anchor", () => {
  assert.equal(
    gameItemLink("Tattered Cloth Gorget", "12331F1850EE94625029BC27"),
    '<a href="item|12331f1850ee94625029bc27">[Tattered Cloth Gorget]</a>'
  );
});

test("names are escaped and bad hashes are dropped", () => {
  assert.equal(gameItemLink("A & B <C>", "12331f1850ee94625029bc27"), '<a href="item|12331f1850ee94625029bc27">[A &amp; B &lt;C&gt;]</a>');
  assert.equal(cleanLinkId("item|12331f1850ee94625029bc27"), "12331f1850ee94625029bc27");
  assert.equal(gameItemLink("Short Sword", "not-a-hash"), "");
  assert.equal(gameItemLink("", "12331f1850ee94625029bc27"), "");
});
