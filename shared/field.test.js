import assert from "node:assert/strict";
import test from "node:test";
import {
  addXp,
  classById,
  clearHero,
  createHero,
  createSession,
  damageFor,
  layoutPack,
  loadHero,
  maxHpFor,
  saveHero,
  xpForKill,
  xpToNext,
} from "./field.js";

function mem() {
  const box = new Map();
  return {
    getItem: (k) => (box.has(k) ? box.get(k) : null),
    setItem: (k, v) => box.set(k, v),
    removeItem: (k) => box.delete(k),
  };
}

const rats = {
  id: "yard-rats",
  zoneId: "night-harbor",
  kind: "camp",
  name: "Yard rats",
  monsters: "Rats, bats",
  soloMin: 1,
  soloMax: 2,
};

test("a fighter wears more health than a wizard, and the wizard hits harder", () => {
  const fighter = classById("fighter");
  const wizard = classById("wizard");
  assert.ok(maxHpFor(1, fighter) > maxHpFor(1, wizard));
  assert.ok(damageFor(1, wizard) > damageFor(1, fighter));
});

test("kills grant xp and a gray con is worth one point", () => {
  const hero = createHero({ name: "Ada", classId: "fighter", originId: "night-harbor" });
  const need = xpToNext(1);
  const levels = addXp(hero, need);
  assert.deepEqual(levels, [2]);
  assert.equal(hero.level, 2);
  assert.equal(hero.hp, maxHpFor(2, classById("fighter")));
  assert.equal(xpForKill(1, 20, false), 1);
});

test("a camp pack is stable and a named is a single tougher spawn", () => {
  const a = layoutPack(rats);
  const b = layoutPack(rats);
  assert.equal(a.length, 2);
  assert.deepEqual(a.map((m) => m.id), b.map((m) => m.id));
  assert.equal(a[0].name, "Rat");
  const named = layoutPack({ ...rats, kind: "named", name: "Snar the Egg Collector", monsters: "" });
  assert.equal(named.length, 1);
  assert.equal(named[0].name, "Snar the Egg Collector");
  assert.equal(named[0].named, true);
});

test("the opener cuts once, lifetap gives health back, and the save round-trips", () => {
  const store = mem();
  const hero = createHero({ name: "Vex", classId: "necromancer", originId: "ail-vorith" });
  hero.hp = 10;
  const session = createSession(hero, store);
  const now = Date.now();
  session.update(0.2, 0, 0, "deep", "ail-vorith", now, [rats], () => ({ x: 0, z: 0, layer: "deep" }));
  const mob = [...session.mobs.values()][0];
  assert.ok(mob);
  mob.x = 0;
  mob.z = 0;
  const before = hero.hp;
  const after = session.swingAt(mob.id, 0, 0, now + 10, () => 0.5);
  assert.ok(after.hp > before);
  assert.ok(hero.hp <= maxHpFor(1, classById("necromancer")));
  saveHero(hero, store);
  const loaded = loadHero(store);
  assert.equal(loaded.name, "Vex");
  assert.equal(loaded.classId, "necromancer");
  assert.equal(loaded.originId, "ail-vorith");
  clearHero(store);
  assert.equal(loadHero(store), null);
});

test("the first rogue blow is the opener and the next is not", () => {
  const hero = createHero({ classId: "rogue", originId: "night-harbor" });
  const session = createSession(hero, mem());
  const now = 1_000_000;
  session.update(0.2, 0, 0, "surface", "night-harbor", now, [rats], () => ({ x: 0, z: 0, layer: "surface" }));
  const mob = [...session.mobs.values()][0];
  mob.x = 0;
  mob.z = 0;
  mob.hp = 500;
  const first = session.swingAt(mob.id, 0, 0, now + 5, () => 0);
  const second = session.swingAt(mob.id, 0, 0, now + 2000, () => 0);
  assert.match(first.line, /Opener/);
  assert.doesNotMatch(second.line, /Opener/);
});

test("dying sends you back to the city you conjured in", () => {
  const hero = createHero({ classId: "wizard", originId: "faelindral" });
  hero.hp = 1;
  const session = createSession(hero, mem());
  const now = 5_000_000;
  session.update(0.2, 0, 0, "surface", "faelindral", now, [rats], () => ({ x: 0, z: 0, layer: "surface" }));
  const mob = [...session.mobs.values()][0];
  mob.x = 0;
  mob.z = 0;
  mob.level = 40;
  mob.named = true;
  mob.nextSwing = 0;
  mob.aggro = true;
  const step = session.update(
    0.2,
    0,
    0,
    "surface",
    "faelindral",
    now + 400,
    [rats],
    () => ({ x: 0, z: 0, layer: "surface" }),
    () => 0
  );
  assert.equal(step.died, true);
  assert.equal(step.originId, "faelindral");
  assert.match(step.hud.line, /Faelindral/);
  assert.equal(hero.zoneId, "faelindral");
});

test("pulling one creature brings the rest of its camp", () => {
  const hero = createHero({ classId: "fighter", originId: "night-harbor" });
  const session = createSession(hero, mem());
  const now = 2_000_000;
  session.update(0.2, 0, 0, "surface", "night-harbor", now, [rats], () => ({ x: 0, z: 0, layer: "surface" }));
  const pack = [...session.mobs.values()];
  assert.equal(pack.length, 2);
  for (const mob of pack) {
    mob.x = 0;
    mob.z = 0;
    mob.aggro = false;
  }
  session.swingAt(pack[0].id, 0, 0, now + 5, () => 0);
  assert.equal(pack[1].aggro, true);
  assert.match(session.hud().line, /You hit/);
});

test("a far target is marked, and a wild swing can miss", () => {
  const hero = createHero({ classId: "fighter", originId: "night-harbor" });
  const session = createSession(hero, mem());
  const now = 3_000_000;
  session.update(0.2, 0, 0, "surface", "night-harbor", now, [rats], () => ({ x: 0, z: 0, layer: "surface" }));
  const mob = [...session.mobs.values()][0];
  const hp = mob.hp;
  mob.x = 80;
  mob.z = 0;
  const aimed = session.engage(mob.id);
  assert.equal(aimed.target.id, mob.id);
  assert.equal(mob.hp, hp);
  assert.match(aimed.line, /looks/);
  mob.x = 0;
  const missed = session.swingAt(mob.id, 0, 0, now + 5, () => 0.99);
  assert.equal(mob.hp, hp);
  assert.match(missed.line, /miss/);
});
