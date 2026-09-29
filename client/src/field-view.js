import * as THREE from "three";
import { conOf } from "../../shared/field.js";

function kindFrom(name) {
  const n = String(name || "").toLowerCase();
  if (/spider|widow/.test(n)) return "spider";
  if (/beetle/.test(n)) return "beetle";
  if (/bat/.test(n)) return "bat";
  if (/snake|viper|asp/.test(n)) return "snake";
  if (/croc|caiman|basilisk/.test(n)) return "lizard";
  if (/wasp/.test(n)) return "wasp";
  if (/drake|dragon/.test(n)) return "drake";
  if (/wolf|rat|burrower|devourer/.test(n)) return "beast";
  if (/skeleton/.test(n)) return "skeleton";
  if (/ghoul|zombie/.test(n)) return "undead";
  if (/goblin/.test(n)) return "goblin";
  if (/orc/.test(n)) return "orc";
  if (/giant/.test(n)) return "giant";
  if (/ashira/.test(n)) return "ashira";
  if (/undead|plague/.test(n)) return "undead";
  return "humanoid";
}

const KIND_COLOR = {
  spider: 0x2a2624,
  beetle: 0x3e4a28,
  bat: 0x3a3048,
  snake: 0x3c6840,
  lizard: 0x4d6a34,
  wasp: 0xc4a02a,
  drake: 0x8a3a32,
  beast: 0x7a5a3c,
  skeleton: 0xe4dcc8,
  undead: 0x6d8a74,
  goblin: 0x4f8a38,
  orc: 0x3f6e32,
  giant: 0xb08958,
  ashira: 0xc4783a,
  humanoid: 0x6a5346,
  hero: 0xc45c26,
};

function kindColor(kind, name) {
  const color = new THREE.Color(KIND_COLOR[kind] || KIND_COLOR.humanoid);
  let h = 0;
  const s = String(name || "");
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * 17) % 30;
  color.offsetHSL(0, 0, (h - 15) / 220);
  return color;
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

function part(figure, geo, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  const mesh = new THREE.Mesh(geo, lit(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.rotation.set(rx, 0, rz);
  figure.add(mesh);
  return mesh;
}

function eyes(figure, s, x, y, z, dark) {
  part(figure, new THREE.SphereGeometry(0.07 * s, 6, 5), dark, x - 0.12 * s, y, z);
  part(figure, new THREE.SphereGeometry(0.07 * s, 6, 5), dark, x + 0.12 * s, y, z);
}

function biped(figure, s, paint, { tall = 1, wide = 1, headScale = 0.42, dark = 0x241810 } = {}) {
  const body = part(figure, new THREE.SphereGeometry(0.55 * s, 14, 10), paint, 0, 0.85 * s * tall, 0, wide, 1.15 * tall, 0.75);
  const head = part(figure, new THREE.SphereGeometry(headScale * s, 12, 10), paint, 0, (1.55 * tall) * s, -0.08 * s);
  part(figure, new THREE.CylinderGeometry(0.08 * s, 0.1 * s, 0.7 * s * tall, 6), paint, -0.42 * s * wide, 0.85 * s, -0.05 * s);
  part(figure, new THREE.CylinderGeometry(0.08 * s, 0.1 * s, 0.7 * s * tall, 6), paint, 0.42 * s * wide, 0.85 * s, -0.05 * s);
  part(figure, new THREE.CylinderGeometry(0.1 * s, 0.08 * s, 0.62 * s, 6), dark, -0.2 * s, 0.32 * s, 0);
  part(figure, new THREE.CylinderGeometry(0.1 * s, 0.08 * s, 0.62 * s, 6), dark, 0.2 * s, 0.32 * s, 0);
  eyes(figure, s, 0, head.position.y + 0.04 * s, -headScale * s * 0.85, dark);
  return { body, head, tail: null };
}

function buildKind(figure, kind, s, paint) {
  const dark = 0x241810;
  const bone = 0xd8d0c0;
  if (kind === "beast") {
    const body = part(figure, new THREE.SphereGeometry(0.55 * s, 14, 10), paint, 0, 0.48 * s, 0.1 * s, 1, 0.75, 1.55);
    const head = part(figure, new THREE.SphereGeometry(0.32 * s, 12, 8), paint, 0, 0.62 * s, -0.72 * s);
    part(figure, new THREE.ConeGeometry(0.12 * s, 0.28 * s, 6), paint, 0, 0.55 * s, -0.98 * s, 1, 1, 1, -Math.PI / 2);
    part(figure, new THREE.CylinderGeometry(0.06 * s, 0.05 * s, 0.38 * s, 5), dark, -0.28 * s, 0.22 * s, -0.35 * s);
    part(figure, new THREE.CylinderGeometry(0.06 * s, 0.05 * s, 0.38 * s, 5), dark, 0.28 * s, 0.22 * s, -0.35 * s);
    part(figure, new THREE.CylinderGeometry(0.06 * s, 0.05 * s, 0.38 * s, 5), dark, -0.28 * s, 0.22 * s, 0.45 * s);
    part(figure, new THREE.CylinderGeometry(0.06 * s, 0.05 * s, 0.38 * s, 5), dark, 0.28 * s, 0.22 * s, 0.45 * s);
    const tail = part(figure, new THREE.CylinderGeometry(0.04 * s, 0.08 * s, 0.5 * s, 5), paint, 0, 0.5 * s, 0.85 * s, 1, 1, 1, Math.PI / 2.4);
    part(figure, new THREE.ConeGeometry(0.08 * s, 0.18 * s, 5), paint, -0.12 * s, 0.82 * s, -0.7 * s);
    part(figure, new THREE.ConeGeometry(0.08 * s, 0.18 * s, 5), paint, 0.12 * s, 0.82 * s, -0.7 * s);
    eyes(figure, s * 0.8, 0, 0.68 * s, -0.98 * s, dark);
    return { body, head, tail };
  }
  if (kind === "spider") {
    const body = part(figure, new THREE.SphereGeometry(0.48 * s, 12, 10), paint, 0, 0.42 * s, 0.28 * s, 1, 0.8, 1.15);
    const head = part(figure, new THREE.SphereGeometry(0.26 * s, 10, 8), paint, 0, 0.4 * s, -0.38 * s);
    for (let i = 0; i < 4; i++) {
      const z = (-0.15 + i * 0.22) * s;
      part(figure, new THREE.CylinderGeometry(0.025 * s, 0.02 * s, 0.7 * s, 4), dark, -0.42 * s, 0.28 * s, z, 1, 1, 1, 0.35, 1.05);
      part(figure, new THREE.CylinderGeometry(0.025 * s, 0.02 * s, 0.7 * s, 4), dark, 0.42 * s, 0.28 * s, z, 1, 1, 1, 0.35, -1.05);
    }
    eyes(figure, s * 0.7, 0, 0.46 * s, -0.58 * s, 0xc43a3a);
    return { body, head, tail: null };
  }
  if (kind === "beetle") {
    const body = part(figure, new THREE.SphereGeometry(0.55 * s, 14, 10), paint, 0, 0.42 * s, 0.05 * s, 1.15, 0.55, 1.35);
    const head = part(figure, new THREE.SphereGeometry(0.22 * s, 10, 8), 0x2a2418, 0, 0.32 * s, -0.62 * s);
    part(figure, new THREE.CylinderGeometry(0.04 * s, 0.03 * s, 0.32 * s, 4), dark, -0.35 * s, 0.16 * s, -0.2 * s);
    part(figure, new THREE.CylinderGeometry(0.04 * s, 0.03 * s, 0.32 * s, 4), dark, 0.35 * s, 0.16 * s, -0.2 * s);
    part(figure, new THREE.CylinderGeometry(0.04 * s, 0.03 * s, 0.32 * s, 4), dark, -0.38 * s, 0.16 * s, 0.25 * s);
    part(figure, new THREE.CylinderGeometry(0.04 * s, 0.03 * s, 0.32 * s, 4), dark, 0.38 * s, 0.16 * s, 0.25 * s);
    return { body, head, tail: null };
  }
  if (kind === "bat") {
    const body = part(figure, new THREE.SphereGeometry(0.32 * s, 10, 8), paint, 0, 0.7 * s, 0, 0.8, 1.1, 0.7);
    const head = part(figure, new THREE.SphereGeometry(0.22 * s, 10, 8), paint, 0, 1.05 * s, -0.08 * s);
    part(figure, new THREE.ConeGeometry(0.28 * s, 0.9 * s, 4), paint, -0.55 * s, 0.85 * s, 0, 1, 0.15, 1, -0.4);
    part(figure, new THREE.ConeGeometry(0.28 * s, 0.9 * s, 4), paint, 0.55 * s, 0.85 * s, 0, 1, 0.15, 1, 0.4);
    part(figure, new THREE.ConeGeometry(0.08 * s, 0.28 * s, 4), paint, -0.12 * s, 1.28 * s, 0);
    part(figure, new THREE.ConeGeometry(0.08 * s, 0.28 * s, 4), paint, 0.12 * s, 1.28 * s, 0);
    eyes(figure, s * 0.7, 0, 1.08 * s, -0.24 * s, 0xc43a3a);
    return { body, head, tail: null };
  }
  if (kind === "snake") {
    const body = part(figure, new THREE.SphereGeometry(0.28 * s, 10, 8), paint, 0, 0.28 * s, 0.45 * s, 1, 0.7, 1.4);
    part(figure, new THREE.SphereGeometry(0.24 * s, 10, 8), paint, 0, 0.32 * s, -0.05 * s, 0.9, 0.7, 1.2);
    const head = part(figure, new THREE.SphereGeometry(0.2 * s, 10, 8), paint, 0, 0.36 * s, -0.55 * s, 0.8, 0.7, 1.3);
    part(figure, new THREE.ConeGeometry(0.08 * s, 0.2 * s, 5), paint, 0, 0.32 * s, -0.78 * s, 1, 1, 1, -Math.PI / 2);
    eyes(figure, s * 0.6, 0, 0.42 * s, -0.7 * s, 0xc4a02a);
    return { body, head, tail: null };
  }
  if (kind === "lizard") {
    const body = part(figure, new THREE.SphereGeometry(0.4 * s, 12, 8), paint, 0, 0.38 * s, 0.05 * s, 0.9, 0.6, 1.8);
    const head = part(figure, new THREE.SphereGeometry(0.24 * s, 10, 8), paint, 0, 0.42 * s, -0.7 * s, 0.7, 0.6, 1.4);
    part(figure, new THREE.ConeGeometry(0.1 * s, 0.35 * s, 5), paint, 0, 0.38 * s, -1.05 * s, 1, 1, 1, -Math.PI / 2);
    const tail = part(figure, new THREE.ConeGeometry(0.1 * s, 0.7 * s, 5), paint, 0, 0.36 * s, 0.85 * s, 1, 1, 1, Math.PI / 2);
    part(figure, new THREE.CylinderGeometry(0.05 * s, 0.04 * s, 0.28 * s, 4), dark, -0.22 * s, 0.16 * s, -0.35 * s);
    part(figure, new THREE.CylinderGeometry(0.05 * s, 0.04 * s, 0.28 * s, 4), dark, 0.22 * s, 0.16 * s, -0.35 * s);
    part(figure, new THREE.CylinderGeometry(0.05 * s, 0.04 * s, 0.28 * s, 4), dark, -0.22 * s, 0.16 * s, 0.4 * s);
    part(figure, new THREE.CylinderGeometry(0.05 * s, 0.04 * s, 0.28 * s, 4), dark, 0.22 * s, 0.16 * s, 0.4 * s);
    eyes(figure, s * 0.7, 0, 0.5 * s, -0.88 * s, 0xc4a02a);
    return { body, head, tail };
  }
  if (kind === "wasp") {
    const body = part(figure, new THREE.SphereGeometry(0.28 * s, 10, 8), paint, 0, 0.7 * s, 0.15 * s);
    const head = part(figure, new THREE.SphereGeometry(0.2 * s, 10, 8), 0x2a2418, 0, 0.72 * s, -0.32 * s);
    part(figure, new THREE.SphereGeometry(0.22 * s, 10, 8), 0x3a3218, 0, 0.68 * s, 0.48 * s, 0.7, 0.7, 1.2);
    part(figure, new THREE.ConeGeometry(0.06 * s, 0.22 * s, 5), dark, 0, 0.62 * s, 0.72 * s, 1, 1, 1, Math.PI / 2);
    part(figure, new THREE.ConeGeometry(0.22 * s, 0.55 * s, 4), 0xe8e4dc, -0.32 * s, 0.85 * s, 0, 1, 0.12, 1);
    part(figure, new THREE.ConeGeometry(0.22 * s, 0.55 * s, 4), 0xe8e4dc, 0.32 * s, 0.85 * s, 0, 1, 0.12, 1);
    return { body, head, tail: null };
  }
  if (kind === "drake") {
    const body = part(figure, new THREE.SphereGeometry(0.48 * s, 12, 10), paint, 0, 0.55 * s, 0.05 * s, 0.9, 0.8, 1.4);
    const head = part(figure, new THREE.SphereGeometry(0.26 * s, 10, 8), paint, 0, 0.85 * s, -0.62 * s);
    part(figure, new THREE.ConeGeometry(0.1 * s, 0.3 * s, 5), paint, 0, 0.8 * s, -0.9 * s, 1, 1, 1, -Math.PI / 2);
    part(figure, new THREE.ConeGeometry(0.34 * s, 0.7 * s, 4), paint, -0.45 * s, 0.85 * s, 0.05 * s, 1, 0.2, 1);
    part(figure, new THREE.ConeGeometry(0.34 * s, 0.7 * s, 4), paint, 0.45 * s, 0.85 * s, 0.05 * s, 1, 0.2, 1);
    const tail = part(figure, new THREE.ConeGeometry(0.1 * s, 0.7 * s, 5), paint, 0, 0.55 * s, 0.8 * s, 1, 1, 1, Math.PI / 2.2);
    eyes(figure, s * 0.7, 0, 0.92 * s, -0.82 * s, 0xc4a02a);
    return { body, head, tail };
  }
  if (kind === "skeleton") {
    const body = part(figure, new THREE.SphereGeometry(0.32 * s, 10, 8), bone, 0, 0.9 * s, 0, 0.7, 1.2, 0.45);
    const head = part(figure, new THREE.SphereGeometry(0.28 * s, 10, 8), bone, 0, 1.45 * s, 0);
    part(figure, new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.7 * s, 5), bone, -0.32 * s, 0.9 * s, 0);
    part(figure, new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.7 * s, 5), bone, 0.32 * s, 0.9 * s, 0);
    part(figure, new THREE.CylinderGeometry(0.06 * s, 0.05 * s, 0.7 * s, 5), bone, -0.14 * s, 0.38 * s, 0);
    part(figure, new THREE.CylinderGeometry(0.06 * s, 0.05 * s, 0.7 * s, 5), bone, 0.14 * s, 0.38 * s, 0);
    eyes(figure, s, 0, 1.48 * s, -0.24 * s, 0x1a120c);
    return { body, head, tail: null };
  }
  if (kind === "goblin") {
    const built = biped(figure, s * 0.85, paint, { tall: 0.85, wide: 0.9, headScale: 0.5 });
    part(figure, new THREE.ConeGeometry(0.16 * s, 0.32 * s, 4), paint, -0.28 * s, 1.55 * s, 0);
    part(figure, new THREE.ConeGeometry(0.16 * s, 0.32 * s, 4), paint, 0.28 * s, 1.55 * s, 0);
    part(figure, new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 0.45 * s, 4), 0x6a5340, 0.55 * s, 0.7 * s, -0.1 * s);
    return built;
  }
  if (kind === "orc" || kind === "giant") {
    const built = biped(figure, s, paint, { tall: kind === "giant" ? 1.35 : 1.1, wide: 1.35, headScale: 0.4 });
    part(figure, new THREE.ConeGeometry(0.06 * s, 0.16 * s, 4), bone, -0.1 * s, 1.35 * s, -0.38 * s, 1, 1, 1, -Math.PI / 2);
    part(figure, new THREE.ConeGeometry(0.06 * s, 0.16 * s, 4), bone, 0.1 * s, 1.35 * s, -0.38 * s, 1, 1, 1, -Math.PI / 2);
    part(figure, new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.7 * s, 5), 0x5a4632, 0.7 * s, 0.9 * s, -0.15 * s);
    return built;
  }
  if (kind === "ashira") {
    const built = biped(figure, s, paint, { tall: 1.05, wide: 0.85, headScale: 0.38 });
    part(figure, new THREE.ConeGeometry(0.08 * s, 0.22 * s, 4), paint, -0.16 * s, 1.85 * s, 0);
    part(figure, new THREE.ConeGeometry(0.08 * s, 0.22 * s, 4), paint, 0.16 * s, 1.85 * s, 0);
    const tail = part(figure, new THREE.CylinderGeometry(0.04 * s, 0.07 * s, 0.55 * s, 5), paint, 0, 0.7 * s, 0.4 * s, 1, 1, 1, Math.PI / 3);
    return { ...built, tail };
  }
  if (kind === "undead") {
    const built = biped(figure, s, paint, { tall: 1.05, wide: 0.8, headScale: 0.4, dark: 0x1a2218 });
    return built;
  }
  const built = biped(figure, s, paint, { tall: kind === "hero" ? 1.05 : 1, wide: kind === "hero" ? 0.9 : 1 });
  if (kind !== "hero") part(figure, new THREE.BoxGeometry(0.08 * s, 0.4 * s, 0.08 * s), 0xc8c4bc, 0.48 * s, 0.85 * s, -0.2 * s);
  return built;
}

export function makeCritter({ name = "", color = null, scale = 1, named = false, mobId = null }) {
  const figure = new THREE.Group();
  const kind = name ? kindFrom(name) : "hero";
  const paint = color != null ? color : kindColor(kind, name);
  const { body, head, tail } = buildKind(figure, kind, scale, paint);
  if (mobId) body.userData.mobId = mobId;
  if (named && head) {
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.22 * scale, 0.035 * scale, 6, 10), lit(0xf0c14b));
    crown.rotation.x = Math.PI / 2;
    crown.position.set(head.position.x, head.position.y + 0.22 * scale, head.position.z);
    figure.add(crown);
  }
  return { figure, body, head, tail, color: body.material.color.getHex() };
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
    const kind = kindFrom(mob.name);
    let scale = mob.named ? 1.55 : 1.4;
    if (kind === "giant") scale *= 1.35;
    if (kind === "goblin" || kind === "bat" || kind === "spider") scale *= 0.9;
    const critter = makeCritter({ name: mob.name, scale, named: mob.named, mobId: mob.id });
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
    const entry = { group, figure, body, head: critter.head, ring, bar, sprite, color: critter.color, lastHp: mob.maxHp, flash: 0 };
    groups.set(mob.id, entry);
    return entry;
  }

  function sync(mobs, targetId, playerLevel, px, pz, groundAt) {
    const live = new Set();
    for (const mob of mobs.values()) {
      live.add(mob.id);
      const entry = groups.get(mob.id) || make(mob);
      entry.group.visible = mob.alive;
      if (!mob.alive) continue;
      const gy = typeof groundAt === "function" ? groundAt(mob.x, mob.z) : 0;
      entry.group.position.set(mob.x, gy, mob.z);
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
