import * as THREE from "three";
import { conOf } from "../../shared/field.js";

const PALETTE = ["#7dbe6a", "#e0a15a", "#8f7cc4", "#5eaea0", "#e07a62", "#c4b15a", "#d4899a", "#6aa4c4"];

function colorOf(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % PALETTE.length;
  return PALETTE[h];
}

const PLATE_W = 256;
const PLATE_H = 48;

function labelTexture(name, level) {
  const c = document.createElement("canvas");
  c.width = PLATE_W;
  c.height = PLATE_H;
  const g = c.getContext("2d");
  const text = `${name}  ${level}`;
  let size = 28;
  g.font = `600 ${size}px sans-serif`;
  while (size > 15 && g.measureText(text).width > PLATE_W - 20) {
    size -= 1;
    g.font = `600 ${size}px sans-serif`;
  }
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 5;
  g.strokeStyle = "#000000";
  g.strokeText(text, PLATE_W / 2, PLATE_H / 2);
  g.fillStyle = "#ffffff";
  g.fillText(text, PLATE_W / 2, PLATE_H / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function lit(color) {
  return new THREE.MeshLambertMaterial({ color });
}

export function makeCritter({ color, scale = 1, named = false, mobId = null }) {
  const figure = new THREE.Group();
  const s = scale;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.92 * s, 22, 16), lit(color));
  body.scale.set(1.15, 0.95, 1.05);
  body.position.y = 0.82 * s;
  if (mobId) body.userData.mobId = mobId;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.64 * s, 20, 14), lit(color));
  head.position.set(0, 1.62 * s, -0.06 * s);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 14, 10), lit(0xfff3e4));
  belly.scale.set(1, 0.82, 0.5);
  belly.position.set(0, 0.66 * s, -0.78 * s);

  const earMat = lit(0xfff6ea);
  const earInner = lit(0xf3a0a8);
  const ear = (x) => {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.3 * s, 12, 8), earMat);
    outer.scale.set(0.5, 1.45, 0.42);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 8, 6), earInner);
    inner.scale.set(0.4, 0.95, 0.3);
    inner.position.set(0, -0.02 * s, -0.08 * s);
    g.add(outer, inner);
    g.position.set(x * 0.48 * s, 2.12 * s, -0.02 * s);
    g.rotation.z = x > 0 ? -0.4 : 0.4;
    return g;
  };

  const white = lit(0xfffdf8);
  const pupilMat = lit(0x241810);
  const eye = (x) => {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18 * s, 12, 8), white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 8, 6), pupilMat);
    pupil.position.set(0, -0.01 * s, -0.13 * s);
    g.add(ball, pupil);
    g.position.set(x * 0.26 * s, 1.7 * s, -0.56 * s);
    return g;
  };

  const blushMat = lit(0xf09098);
  const blush = (x) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 8, 6), blushMat);
    m.scale.set(1.25, 0.7, 0.35);
    m.position.set(x * 0.42 * s, 1.46 * s, -0.6 * s);
    return m;
  };

  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.11 * s, 0.028 * s, 6, 12, Math.PI), lit(0x3a2820));
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, 1.36 * s, -0.64 * s);

  const footMat = lit(0x3a2820);
  const foot = (x) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 10, 8), footMat);
    m.scale.set(1.15, 0.42, 1.35);
    m.position.set(x * 0.4 * s, 0.1 * s, -0.28 * s);
    return m;
  };

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.24 * s, 10, 8), lit(color));
  tail.position.set(0, 0.72 * s, 0.9 * s);

  figure.add(body, head, belly, ear(-1), ear(1), eye(-1), eye(1), blush(-1), blush(1), mouth, foot(-1), foot(1), tail);

  if (named) {
    const hornMat = lit(0xf0c14b);
    const horn = (x) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.11 * s, 0.42 * s, 7), hornMat);
      m.position.set(x * 0.22 * s, 2.22 * s, 0.04 * s);
      return m;
    };
    figure.add(horn(-1), horn(1));
  }

  return { figure, body, head, tail };
}

export function createFieldView(scene) {
  const groups = new Map();
  const bodies = [];

  function destroy(entry) {
    const idx = bodies.indexOf(entry.body);
    if (idx >= 0) bodies.splice(idx, 1);
    entry.group.removeFromParent();
    entry.group.traverse((obj) => {
      obj.geometry?.dispose?.();
      const mats = obj.material ? [].concat(obj.material) : [];
      for (const m of mats) {
        m.map?.dispose?.();
        m.dispose?.();
      }
    });
  }

  function make(mob) {
    const group = new THREE.Group();
    const scale = mob.named ? 1.62 : 1.45;
    const color = colorOf(mob.name);
    const critter = makeCritter({ color, scale, named: mob.named, mobId: mob.id });
    const figure = critter.figure;
    const body = critter.body;
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(2.1 * scale, 16),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.16;
    pad.userData.mobId = mob.id;
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.15 * scale, 18),
      new THREE.MeshBasicMaterial({ color: 0x1a120c, transparent: true, opacity: 0.28, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.06;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.15 * scale, 1.42 * scale, 20),
      new THREE.MeshBasicMaterial({ color: 0xf3e6c8, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    const bar = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x6dbf6a })
    );
    bar.rotation.x = -Math.PI / 2;
    bar.position.set(0, 0.22, 1.55 * scale);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: labelTexture(mob.name, mob.level), transparent: true, depthWrite: false })
    );
    sprite.scale.set(5.2, 5.2 * (PLATE_H / PLATE_W), 1);
    sprite.center.set(0.5, 0);
    sprite.position.y = 2.35 * scale;
    group.add(shadow, figure, pad, ring, bar, sprite);
    scene.add(group);
    bodies.push(body, pad);
    const entry = { group, figure, body, head: critter.head, ring, bar, sprite, color, lastHp: mob.maxHp, flash: 0 };
    groups.set(mob.id, entry);
    return entry;
  }

  function sync(mobs, targetId, playerLevel, px, pz) {
    const live = new Set();
    for (const mob of mobs.values()) {
      live.add(mob.id);
      const entry = groups.get(mob.id) || make(mob);
      entry.group.visible = mob.alive;
      if (!mob.alive) continue;
      entry.group.position.set(mob.x, 0, mob.z);
      entry.group.rotation.y = 0;
      if (Number.isFinite(px) && Number.isFinite(pz) && mob.aggro) {
        entry.figure.rotation.y = Math.atan2(mob.x - px, mob.z - pz);
      }
      const ratio = Math.max(0.05, mob.hp / mob.maxHp);
      const marked = mob.id === targetId;
      if (mob.hp < entry.lastHp) entry.flash = performance.now() + 140;
      entry.lastHp = mob.hp;
      const tint = entry.flash > performance.now() ? 0xfff6e4 : entry.color;
      entry.body.material.color.set(tint);
      entry.head.material.color.set(tint);
      entry.bar.scale.x = ratio;
      entry.bar.position.x = (ratio - 1) * 1.2;
      entry.bar.material.color.set(ratio < 0.35 ? 0xd4544a : 0x6dbf6a);
      entry.bar.visible = marked && mob.hp < mob.maxHp;
      const con = conOf(mob.level, playerLevel);
      entry.ring.material.color.set(con);
      entry.sprite.material.color.set(con);
      entry.ring.scale.setScalar(marked ? 1.35 : 1);
      entry.figure.position.y = 0;
    }
    for (const [id, entry] of groups) {
      if (!live.has(id)) {
        destroy(entry);
        groups.delete(id);
      }
    }
  }

  function pick(raycaster) {
    const hits = raycaster.intersectObjects(bodies, false);
    const hit = hits.find((h) => {
      let node = h.object;
      while (node) {
        if (!node.visible) return false;
        node = node.parent;
      }
      return true;
    });
    return hit?.object.userData.mobId || null;
  }

  function dispose() {
    for (const entry of groups.values()) destroy(entry);
    groups.clear();
  }

  return { sync, pick, dispose };
}
