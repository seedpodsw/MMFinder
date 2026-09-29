import assert from "node:assert/strict";
import test from "node:test";
import { EARLY_ACCESS_AT, formatEastern, partsUntil, releaseInstant } from "./release.js";

const release = releaseInstant();

test("release is 9:00 Bahrain on 1 Oct 2026", () => {
  assert.equal(release.toISOString(), "2026-10-01T06:00:00.000Z");
  assert.equal(EARLY_ACCESS_AT, "2026-10-01T09:00:00+03:00");
});

test("counts a full day before release", () => {
  const left = partsUntil(new Date("2026-09-30T06:00:00.000Z"), release);
  assert.deepEqual(left, { done: false, days: 1, hours: 0, minutes: 0, seconds: 0 });
});

test("eastern clock reads 2:00 a.m. on October 1", () => {
  const label = formatEastern(release);
  assert.match(label, /October 1, 2026/);
  assert.match(label, /2:00/);
  assert.match(label, /EDT/);
});

test("is done at the release instant", () => {
  const left = partsUntil(release, release);
  assert.equal(left.done, true);
  assert.equal(left.days, 0);
});
