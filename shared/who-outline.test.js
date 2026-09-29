import assert from "node:assert/strict";
import test from "node:test";
import { whiteOutline } from "./who-outline.js";

test("a cutout creature becomes a pure white outline", () => {
  const width = 24;
  const height = 24;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 6; y < 18; y++) {
    for (let x = 6; x < 18; x++) {
      const o = (y * width + x) * 4;
      rgba[o] = 40;
      rgba[o + 1] = 30;
      rgba[o + 2] = 20;
      rgba[o + 3] = 255;
    }
  }
  const stroke = whiteOutline(rgba, width, height);
  const at = (x, y) => stroke[(y * width + x) * 4 + 3];
  assert.equal(at(12, 12), 0);
  assert.equal(stroke[(7 * width + 6) * 4], 255);
  assert.ok(at(6, 12) === 255 || at(7, 12) === 255);
});
