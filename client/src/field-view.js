import * as THREE from "three";
import { conOf } from "../../shared/field.js";

const PALETTE = ["#6b8f4a", "#8a6232", "#6a5a78", "#4e6e66", "#7a4e3c", "#5c6a38", "#6e5644", "#3e5c4c"];

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
    const scale = mob.named ? 1.18 : 1;
    const color = colorOf(mob.name);
    const figure = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05 * scale, 1.05 * scale, 0.55, 12),
      new THREE.MeshBasicMaterial({ color })
    );
    body.position.y = 0.4;
    body.userData.mobId = mob.id;
    const pip = new THREE.Mesh(
      new THREE.ConeGeometry(0.32 * scale, 0.75 * scale, 3),
      new THREE.MeshBasicMaterial({ color: 0xfff6e4 })
    );
    pip.rotation.x = Math.PI / 2;
    pip.position.set(0, 0.62, -1.05 * scale);
    figure.add(body, pip);
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(2.1 * scale, 16),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.16;
    pad.userData.mobId = mob.id;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.45 * scale, 1.78 * scale, 20),
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
    sprite.scale.set(8, 8 * (PLATE_H / PLATE_W), 1);
    sprite.center.set(0.5, 0);
    sprite.position.y = 1.35;
    group.add(figure, pad, ring, bar, sprite);
    scene.add(group);
    bodies.push(body, pad);
    const entry = { group, figure, body, ring, bar, sprite, color, lastHp: mob.maxHp, flash: 0 };
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
      entry.body.material.color.set(entry.flash > performance.now() ? 0xfff6e4 : entry.color);
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
