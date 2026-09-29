/** Local overworld character. Saved in the browser, never sent anywhere. */

export const SAVE_KEY = "mmfinder.field.v1";

export const ORIGINS = [
  { id: "night-harbor", name: "Night Harbor", note: "The western port." },
  { id: "faelindral", name: "Faelindral", note: "The city in the trees." },
  { id: "underdocks", name: "The Underdocks", note: "Beneath the harbor." },
  { id: "ail-vorith", name: "Ail'vorith", note: "The deep elf city." },
];

export const CLASSES = [
  { id: "fighter", name: "Fighter", role: "tank", passive: "Thick hide", blurb: "You can take a hit.", mods: { hp: 1.28 } },
  { id: "paladin", name: "Paladin", role: "tank", passive: "Lay on hands", blurb: "You mend while you fight.", mods: { hp: 1.12, regen: 0.012 } },
  { id: "shadow-knight", name: "Shadow Knight", role: "tank", passive: "Harm touch", blurb: "Your blows steal life.", mods: { hp: 1.1, leech: 0.22 } },
  { id: "archer", name: "Archer", role: "dps", passive: "Aimed shot", blurb: "Your hits land harder.", mods: { dmg: 1.22 } },
  { id: "ranger", name: "Ranger", role: "dps", passive: "Woodcraft", blurb: "You cover ground faster.", mods: { dmg: 1.08, speed: 1.16 } },
  { id: "rogue", name: "Rogue", role: "dps", passive: "Opener", blurb: "The first blow cuts deep.", mods: { opener: 1.75 } },
  { id: "monk", name: "Monk", role: "dps", passive: "Flurry", blurb: "Every third swing hits twice.", mods: { flurry: 3, speed: 1.08 } },
  { id: "bard", name: "Bard", role: "support", passive: "Anthem", blurb: "A little more health, a little more bite.", mods: { hp: 1.1, dmg: 1.1, regen: 0.008 } },
  { id: "beastmaster", name: "Beastmaster", role: "dps", passive: "Animal bond", blurb: "Beasts feel your blows.", mods: { beast: 1.3 } },
  { id: "cleric", name: "Cleric", role: "healer", passive: "Mending", blurb: "Health comes back on its own.", mods: { regen: 0.028, dmg: 0.85 } },
  { id: "druid", name: "Druid", role: "healer", passive: "Barkskin", blurb: "Blows glance off.", mods: { taken: 0.8, regen: 0.01 } },
  { id: "shaman", name: "Shaman", role: "healer", passive: "Crippling hex", blurb: "What you strike swings slower.", mods: { slow: 1.4, dmg: 0.95 } },
  { id: "elementalist", name: "Elementalist", role: "caster", passive: "Surge", blurb: "Your hits splash to a neighbor.", mods: { dmg: 1.12, splash: 0.45 } },
  { id: "enchanter", name: "Enchanter", role: "caster", passive: "Mesmer", blurb: "Some blows freeze them for a beat.", mods: { dmg: 0.92, stun: 0.2 } },
  { id: "necromancer", name: "Necromancer", role: "caster", passive: "Lifetap", blurb: "Pain you deal comes back as health.", mods: { dmg: 1.05, leech: 0.3, hp: 0.9 } },
  { id: "inquisitor", name: "Inquisitor", role: "caster", passive: "Zeal", blurb: "Undead take the worst of it.", mods: { dmg: 1.05, undead: 1.4 } },
  { id: "spellblade", name: "Spellblade", role: "dps", passive: "Enchanted edge", blurb: "Cuts that give a little life back.", mods: { dmg: 1.15, leech: 0.1 } },
  { id: "wizard", name: "Wizard", role: "caster", passive: "Evocation", blurb: "Heavy bolts, a thin robe.", mods: { dmg: 1.4, hp: 0.82 } },
];

export const REACH = 9;
const AGGRO = 6;
const LEASH = 42;
const SHOW = 220;
const HIDE = 400;

export function classById(id) {
  return CLASSES.find((c) => c.id === id) || null;
}

export function originById(id) {
  return ORIGINS.find((o) => o.id === id) || ORIGINS[0];
}

export function xpToNext(level) {
  return 30 + level * 28;
}

export function maxHpFor(level, klass) {
  const base = 24 + level * 8;
  return Math.max(1, Math.round(base * (klass?.mods?.hp || 1)));
}

export function damageFor(level, klass) {
  return Math.max(1, Math.round((3 + level * 2) * (klass?.mods?.dmg || 1)));
}

export function mobMaxHp(level, named) {
  return Math.round((12 + level * 7) * (named ? 2.6 : 1));
}

export function mobDamage(level, named) {
  return Math.max(1, Math.round((1 + level * 0.55) * (named ? 1.45 : 1)));
}

export function xpForKill(mobLevel, playerLevel, named) {
  let base = (named ? 22 : 10) + mobLevel * 5;
  const diff = mobLevel - playerLevel;
  if (diff <= -8) return 1;
  if (diff <= -4) base = Math.max(1, Math.round(base * 0.4));
  else if (diff >= 6) base = Math.round(base * 1.4);
  return base;
}

export function conOf(mobLevel, playerLevel) {
  const diff = mobLevel - playerLevel;
  if (diff <= -8) return "#9a9a9a";
  if (diff <= -3) return "#6dbf6a";
  if (diff <= 1) return "#f3e6c8";
  if (diff <= 4) return "#e2c15a";
  return "#d4544a";
}

export function monsterNames(raw) {
  return String(raw || "")
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function campLevel(poi) {
  const lo = poi?.soloMin ?? poi?.groupMin;
  const hi = poi?.soloMax ?? poi?.groupMax;
  if (lo == null && hi == null) return null;
  if (lo == null) return Number(hi);
  if (hi == null) return Number(lo);
  return Math.round((Number(lo) + Number(hi)) / 2);
}

export function isSpawn(poi) {
  if (!poi || (poi.kind !== "camp" && poi.kind !== "named")) return false;
  if (campLevel(poi) == null) return false;
  if (poi.kind === "named") return true;
  return monsterNames(poi.monsters).length > 0;
}

function hash(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function singular(name) {
  const s = String(name || "").trim();
  if (s.length > 3 && /s$/i.test(s) && !/ss$/i.test(s) && !/us$/i.test(s)) return s.slice(0, -1);
  return s;
}

function cap(s) {
  const t = String(s || "").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Creature";
}

function traitOf(name) {
  const n = String(name || "").toLowerCase();
  return {
    beast: /wolf|croc|rat|spider|bat|snake|beetle|bear|lion|tiger|boar|hound|drake|wyrm|crab|shark|caiman|gator|cat|hawk|bird/.test(n),
    undead: /skeleton|zombie|undead|ghoul|wraith|spectre|ghost|mummy|lich/.test(n),
  };
}

export function layoutPack(poi) {
  const level = campLevel(poi);
  if (level == null) return [];
  const named = poi.kind === "named";
  const names = monsterNames(poi.monsters);
  const count = named ? 1 : Math.min(4, Math.max(1, names.length || 1));
  const pack = [];
  for (let i = 0; i < count; i++) {
    const raw = named ? poi.name : names[i % Math.max(1, names.length)] || poi.name || "creature";
    const name = cap(named ? raw : singular(raw));
    const h = hash(`${poi.id}:${i}`);
    const ang = ((h % 360) * Math.PI) / 180;
    const dist = 9 + (h % 16);
    pack.push({
      id: `${poi.id}:${i}`,
      poiId: poi.id,
      name,
      named,
      level,
      ox: Math.cos(ang) * dist,
      oz: Math.sin(ang) * dist,
      ...traitOf(name),
    });
  }
  return pack;
}

export function addXp(hero, amount) {
  const levels = [];
  hero.xp += Math.max(0, amount);
  while (hero.level < 60 && hero.xp >= xpToNext(hero.level)) {
    hero.xp -= xpToNext(hero.level);
    hero.level += 1;
    levels.push(hero.level);
    hero.hp = maxHpFor(hero.level, classById(hero.classId));
  }
  if (hero.level >= 60) hero.xp = 0;
  return levels;
}

export function createHero(draft) {
  const klass = classById(draft?.classId) || CLASSES[0];
  const origin = originById(draft?.originId);
  const name = String(draft?.name || "").trim().slice(0, 24) || "Adventurer";
  return {
    v: 1,
    id: `w${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`,
    name,
    classId: klass.id,
    originId: origin.id,
    level: 1,
    xp: 0,
    hp: maxHpFor(1, klass),
    kills: 0,
    born: Date.now(),
    down: {},
    x: null,
    z: null,
    layer: null,
    zoneId: origin.id,
  };
}

function pruneDown(down, now) {
  const next = {};
  for (const [id, at] of Object.entries(down || {})) {
    const n = Number(at);
    if (n > now) next[id] = n;
  }
  return next;
}

export function sanitizeHero(raw) {
  if (!raw || raw.v !== 1) return null;
  const klass = classById(raw.classId);
  if (!klass) return null;
  const origin = ORIGINS.some((o) => o.id === raw.originId) ? raw.originId : ORIGINS[0].id;
  const level = Math.min(60, Math.max(1, Math.round(Number(raw.level) || 1)));
  const maxHp = maxHpFor(level, klass);
  const hp = Math.min(maxHp, Math.max(0, Math.round(Number(raw.hp) || maxHp)));
  const x = Number(raw.x);
  const z = Number(raw.z);
  return {
    v: 1,
    id: String(raw.id || `w${raw.born || 1}`).slice(0, 40),
    name: String(raw.name || "Adventurer").slice(0, 24),
    classId: klass.id,
    originId: origin,
    level,
    xp: Math.max(0, Math.round(Number(raw.xp) || 0)),
    hp: hp || maxHp,
    kills: Math.max(0, Math.round(Number(raw.kills) || 0)),
    born: Number(raw.born) || 1,
    down: pruneDown(raw.down, Date.now()),
    x: Number.isFinite(x) ? x : null,
    z: Number.isFinite(z) ? z : null,
    layer: raw.layer === "deep" || raw.layer === "surface" ? raw.layer : null,
    zoneId: raw.zoneId ? String(raw.zoneId) : origin,
  };
}

function browserStore(storage) {
  if (storage?.getItem || storage?.setItem) return storage;
  try {
    if (typeof globalThis.localStorage?.getItem === "function") return globalThis.localStorage;
  } catch {
    return null;
  }
  return null;
}

function readBook(storage) {
  const box = browserStore(storage);
  let raw = null;
  try {
    raw = JSON.parse(box?.getItem?.(SAVE_KEY) || "null");
  } catch {
    raw = null;
  }
  if (!raw) return { active: null, heroes: [] };
  if (raw.v === 1 && raw.classId) {
    const hero = sanitizeHero(raw);
    return hero ? { active: hero.id, heroes: [hero] } : { active: null, heroes: [] };
  }
  if (raw.v !== 2 || !Array.isArray(raw.heroes)) return { active: null, heroes: [] };
  const heroes = [];
  for (const row of raw.heroes) {
    const hero = sanitizeHero(row);
    if (hero && !heroes.some((h) => h.id === hero.id)) heroes.push(hero);
    if (heroes.length >= 8) break;
  }
  const active = heroes.some((h) => h.id === raw.active) ? raw.active : heroes[0]?.id || null;
  return { active, heroes };
}

function writeBook(book, storage) {
  const box = browserStore(storage);
  if (!box?.setItem) return;
  box.setItem(
    SAVE_KEY,
    JSON.stringify({
      v: 2,
      active: book.active,
      heroes: book.heroes.map((h) => ({ ...h, down: pruneDown(h.down, Date.now()) })),
    })
  );
}

export function loadRoster(storage) {
  return readBook(storage);
}

export function loadHero(storage) {
  const book = readBook(storage);
  return book.heroes.find((h) => h.id === book.active) || null;
}

export function saveHero(hero, storage) {
  const clean = sanitizeHero(hero);
  if (!clean || !storage?.setItem) return;
  const book = readBook(storage);
  const index = book.heroes.findIndex((h) => h.id === clean.id);
  if (index >= 0) book.heroes[index] = clean;
  else if (book.heroes.length < 8) book.heroes.push(clean);
  else return;
  book.active = clean.id;
  writeBook(book, storage);
}

export function removeHero(id, storage) {
  const book = readBook(storage);
  book.heroes = book.heroes.filter((h) => h.id !== id);
  if (book.active === id) book.active = book.heroes[book.heroes.length - 1]?.id || null;
  writeBook(book, storage);
  return book;
}

export function clearHero(storage) {
  browserStore(storage)?.removeItem?.(SAVE_KEY);
}

function blankMob(spec, layer, homeX, homeZ, alive) {
  const maxHp = mobMaxHp(spec.level, spec.named);
  return {
    ...spec,
    layer,
    homeX,
    homeZ,
    x: homeX,
    z: homeZ,
    hp: maxHp,
    maxHp,
    alive,
    aggro: false,
    nextSwing: 0,
    stunUntil: 0,
    slow: 1,
    opened: false,
    phase: hash(spec.id) % 1000,
  };
}

/**
 * One browser character walking the stitched map.
 * `now` is epoch ms. Positions are atlas units.
 */
export function createSession(hero, storage) {
  const mobs = new Map();
  let targetId = null;
  let nextSwing = 0;
  let swingN = 0;
  let lastHurt = 0;
  let lastSwing = 0;
  let lastSave = 0;
  let nextScan = 0;
  let line = "Find a camp. Click a creature, or press Space.";
  const log = [line];

  function klass() {
    return classById(hero.classId) || CLASSES[0];
  }

  function note(text) {
    line = text;
    log.unshift(text);
    if (log.length > 3) log.pop();
  }

  function currentTarget() {
    const mob = targetId ? mobs.get(targetId) : null;
    if (!mob || !mob.alive) return null;
    return {
      id: mob.id,
      name: mob.name,
      level: mob.level,
      hp: Math.max(0, Math.round(mob.hp)),
      maxHp: mob.maxHp,
      named: !!mob.named,
      con: conOf(mob.level, hero.level),
    };
  }

  function consider(mob) {
    const diff = mob.level - hero.level;
    if (diff <= -8) return `${mob.name} looks like a pushover.`;
    if (diff <= -3) return `${mob.name} looks like an easy mark.`;
    if (diff <= 1) return `${mob.name} looks about your size.`;
    if (diff <= 4) return `${mob.name} looks like a tough fight.`;
    return `${mob.name} looks ready to crush you.`;
  }

  function nearestAggro() {
    let best = null;
    let bestD = Infinity;
    for (const other of mobs.values()) {
      if (!other.alive || !other.aggro) continue;
      const d = Math.hypot(other.x - hero.x, other.z - hero.z);
      if (d < bestD) {
        bestD = d;
        best = other.id;
      }
    }
    return best;
  }

  function hud() {
    const k = klass();
    const maxHp = maxHpFor(hero.level, k);
    const marked = targetId ? mobs.get(targetId) : null;
    const attacking = !!(marked && marked.alive && Math.hypot(marked.x - hero.x, marked.z - hero.z) <= REACH);
    return {
      name: hero.name,
      classId: k.id,
      className: k.name,
      passive: k.passive,
      blurb: k.blurb,
      level: hero.level,
      xp: hero.xp,
      xpNext: xpToNext(hero.level),
      hp: Math.max(0, Math.round(hero.hp)),
      maxHp,
      attack: damageFor(hero.level, k),
      kills: hero.kills,
      line,
      log: log.slice(),
      target: currentTarget(),
      attacking,
      speed: k.mods.speed || 1,
    };
  }

  function persist(force) {
    const now = Date.now();
    if (!force && now - lastSave < 4000) return;
    lastSave = now;
    saveHero(hero, storage);
  }

  function finish(mob, now) {
    if (!mob.alive && mob.hp <= 0) return;
    mob.alive = false;
    mob.aggro = false;
    mob.hp = 0;
    const wait = (mob.named ? 48000 : 20000) + mob.level * 500;
    hero.down[mob.id] = now + wait;
    hero.kills += 1;
    if (targetId === mob.id) targetId = nearestAggro();
    const gain = xpForKill(mob.level, hero.level, mob.named);
    const levels = addXp(hero, gain);
    if (levels.length) note(`Level ${levels[levels.length - 1]}. ${klass().passive} holds. +${gain} XP.`);
    else note(`${mob.name} falls. +${gain} XP.`);
  }

  function strike(mob, now, rng, neighbors) {
    const k = klass();
    mob.aggro = true;
    const diff = mob.level - hero.level;
    const hitChance = Math.min(0.97, Math.max(0.5, 0.9 - diff * 0.045));
    if (rng() > hitChance) {
      note(`You miss ${mob.name}.`);
      nextSwing = now + 880;
      lastSwing = now;
      return;
    }
    let dmg = damageFor(hero.level, k);
    let tag = "";
    if (k.mods.opener && !mob.opened) {
      dmg = Math.round(dmg * k.mods.opener);
      mob.opened = true;
      tag = "Opener";
    }
    swingN += 1;
    if (k.mods.flurry && swingN % k.mods.flurry === 0) {
      dmg *= 2;
      tag = "Flurry";
    }
    if (k.mods.beast && mob.beast) dmg = Math.round(dmg * k.mods.beast);
    if (k.mods.undead && mob.undead) dmg = Math.round(dmg * k.mods.undead);
    dmg = Math.max(1, Math.round(dmg * (0.88 + rng() * 0.24)));
    mob.hp -= dmg;
    if (k.mods.slow) mob.slow = k.mods.slow;
    if (k.mods.stun && rng() < k.mods.stun) {
      mob.stunUntil = now + 1400;
      if (!tag) tag = "Mesmer";
    }
    if (k.mods.leech) {
      const heal = Math.max(1, Math.round(dmg * k.mods.leech));
      hero.hp = Math.min(maxHpFor(hero.level, k), hero.hp + heal);
    }
    if (k.mods.splash) {
      let nearest = null;
      let best = 20;
      for (const other of neighbors) {
        if (other === mob || !other.alive) continue;
        const d = Math.hypot(other.x - mob.x, other.z - mob.z);
        if (d < best) {
          best = d;
          nearest = other;
        }
      }
      if (nearest) {
        nearest.hp -= Math.max(1, Math.round(dmg * k.mods.splash));
        if (nearest.hp <= 0) finish(nearest, now);
      }
    }
    if (mob.hp <= 0) finish(mob, now);
    else note(`${tag ? `${tag}. ` : ""}You hit ${mob.name} for ${dmg}.`);
    nextSwing = now + 880;
    lastSwing = now;
  }

  function ensure(pois, posOf, px, pz, layer, now) {
    const want = new Set();
    for (const poi of pois || []) {
      if (!isSpawn(poi)) continue;
      const pos = posOf(poi);
      if (!pos || pos.layer !== layer) continue;
      if (Math.hypot(pos.x - px, pos.z - pz) > SHOW) continue;
      for (const spec of layoutPack(poi)) {
        want.add(spec.id);
        if (mobs.has(spec.id)) continue;
        const homeX = pos.x + spec.ox;
        const homeZ = pos.z + spec.oz;
        const alive = now >= (hero.down[spec.id] || 0);
        mobs.set(spec.id, blankMob(spec, layer, homeX, homeZ, alive));
      }
    }
    for (const [id, mob] of mobs) {
      if (mob.layer !== layer || (!want.has(id) && Math.hypot(mob.homeX - px, mob.homeZ - pz) > HIDE)) {
        mobs.delete(id);
      }
    }
  }

  function engage(id) {
    const mob = mobs.get(id);
    if (!mob || !mob.alive) return hud();
    if (targetId !== id) {
      targetId = id;
      note(consider(mob));
    }
    return hud();
  }

  function clearTarget() {
    targetId = null;
    return hud();
  }

  function cycleTarget(px, pz) {
    const near = [];
    for (const mob of mobs.values()) {
      if (!mob.alive) continue;
      const d = Math.hypot(mob.x - px, mob.z - pz);
      if (d < 280) near.push({ id: mob.id, d });
    }
    near.sort((a, b) => a.d - b.d);
    if (!near.length) return hud();
    const idx = near.findIndex((row) => row.id === targetId);
    return engage(near[(idx + 1) % near.length].id);
  }

  function swingAt(id, px, pz, now, rng = Math.random) {
    const mob = mobs.get(id);
    if (!mob || !mob.alive) return hud();
    targetId = id;
    if (Math.hypot(mob.x - px, mob.z - pz) > REACH) return hud();
    if (now < nextSwing) return hud();
    strike(mob, now, rng, [...mobs.values()]);
    persist(true);
    return hud();
  }

  function nearestId(px, pz, limit = REACH + 4) {
    let best = null;
    let bestD = limit;
    for (const mob of mobs.values()) {
      if (!mob.alive) continue;
      const d = Math.hypot(mob.x - px, mob.z - pz);
      if (d < bestD) {
        bestD = d;
        best = mob.id;
      }
    }
    return best;
  }

  function update(dt, px, pz, layer, zoneId, now, pois, posOf, rng = Math.random) {
    hero.x = px;
    hero.z = pz;
    hero.layer = layer;
    if (zoneId) hero.zoneId = zoneId;
    if (now >= nextScan) {
      ensure(pois, posOf, px, pz, layer, now);
      nextScan = now + 350;
    }
    const k = klass();
    const maxHp = maxHpFor(hero.level, k);
    let engaged = false;
    let nearest = null;
    let nearestD = AGGRO;
    for (const mob of mobs.values()) {
      if (!mob.alive) continue;
      if (mob.aggro) engaged = true;
      const dist = Math.hypot(mob.x - px, mob.z - pz);
      if (!mob.aggro && dist < nearestD) {
        nearestD = dist;
        nearest = mob;
      }
    }
    if (!engaged && nearest) nearest.aggro = true;
    for (const mob of mobs.values()) {
      if (!mob.alive) {
        if (now >= (hero.down[mob.id] || 0)) {
          const fresh = blankMob(mob, mob.layer, mob.homeX, mob.homeZ, true);
          Object.assign(mob, fresh);
          delete hero.down[mob.id];
        }
        continue;
      }
      const dist = Math.hypot(mob.x - px, mob.z - pz);
      const home = Math.hypot(mob.x - mob.homeX, mob.z - mob.homeZ);
      if (mob.aggro && home > LEASH) {
        mob.aggro = false;
        mob.hp = mob.maxHp;
        mob.x = mob.homeX;
        mob.z = mob.homeZ;
        mob.stunUntil = 0;
        continue;
      }
      if (mob.aggro && now >= (mob.stunUntil || 0)) {
        if (dist > 5.2) {
          const step = Math.min(dist - 4.2, 11 * dt);
          if (step > 0) {
            mob.x += ((px - mob.x) / dist) * step;
            mob.z += ((pz - mob.z) / dist) * step;
          }
        }
        const reach = Math.hypot(mob.x - px, mob.z - pz);
        if (reach < 8 && now >= mob.nextSwing) {
          const gap = mob.level - hero.level;
          const mobHit = Math.min(0.94, Math.max(0.4, 0.7 + gap * 0.04));
          mob.nextSwing = now + 1500 * (mob.slow || 1);
          if (rng() > mobHit) {
            note(`${mob.name} misses.`);
            continue;
          }
          let taken = mobDamage(mob.level, mob.named);
          taken = Math.max(1, Math.round(taken * (k.mods.taken || 1) * (0.9 + rng() * 0.2)));
          hero.hp -= taken;
          lastHurt = now;
          note(`${mob.name} hits you for ${taken}.`);
          if (hero.hp <= 0) {
            hero.hp = maxHp;
            hero.x = null;
            hero.z = null;
            hero.zoneId = hero.originId;
            hero.layer = null;
            targetId = null;
            for (const other of mobs.values()) other.aggro = false;
            note(`You died. You wake in ${originById(hero.originId).name}.`);
            persist(true);
            return { died: true, originId: hero.originId, hud: hud() };
          }
        }
      } else if (!mob.aggro) {
        const wob = Math.sin((now + mob.phase) / 680);
        mob.x += (mob.homeX + wob * 3.5 - mob.x) * Math.min(1, dt * 0.7);
        mob.z += (mob.homeZ + Math.cos((now + mob.phase) / 860) * 3.5 - mob.z) * Math.min(1, dt * 0.7);
      }
    }
    if (targetId && now >= nextSwing) {
      const mob = mobs.get(targetId);
      if (!mob || !mob.alive) targetId = null;
      else if (Math.hypot(mob.x - px, mob.z - pz) <= REACH) strike(mob, now, rng, [...mobs.values()]);
    }
    const idle = now - Math.max(lastHurt, lastSwing) > 3200;
    const regen = (k.mods.regen || 0) + (idle ? 0.04 : 0);
    if (regen > 0 && hero.hp < maxHp) hero.hp = Math.min(maxHp, hero.hp + maxHp * regen * dt);
    persist(false);
    return { died: false, hud: hud() };
  }

  return {
    mobs,
    hud,
    update,
    swingAt,
    engage,
    clearTarget,
    cycleTarget,
    nearestId,
    speed() {
      return klass().mods.speed || 1;
    },
    flush() {
      persist(true);
    },
    get targetId() {
      return targetId;
    },
  };
}
