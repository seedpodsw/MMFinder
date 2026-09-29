import * as THREE from "three";
import { conOf } from "../../shared/field.js";

const PALETTE = ["#6b8f4a", "#8a6232", "#6a5a78", "#4e6e66", "#7a4e3c", "#5c6a38", "#6e5644", "#3e5c4c"];

function colorOf(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % PALETTE.length;
  return PALETTE[h];
}

function labelTexture(name, level) {
  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  const text = `${name}  ${level}`;
  g.font = "600 28px sans-serif";
  const width = Math.max(64, Math.ceil(g.measureText(text).width + 8));
  c.width = width;
  c.height = 36;
  g.font = "600 28px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 5;
  g.strokeStyle = "#9a9084";
  g.strokeText(text, width / 2, 18);
  g.fillStyle = "#ffffff";
  g.fillText(text, width / 2, 18);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, width };
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
    const scale = mob.named ? 1.28 : 1;
    const figure = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35 * scale, 1.85 * scale, 2.2 * scale, 8),
      new THREE.MeshBasicMaterial({ color: colorOf(mob.name) })
    );
    body.position.y = 1.25 * scale;
    body.userData.mobId = mob.id;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.85 * scale, 10, 8),
      new THREE.MeshBasicMaterial({ color: colorOf(mob.name) })
    );
    head.position.y = 2.55 * scale;
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.4 * scale, 0.3 * scale, 1.1 * scale),
      new THREE.MeshBasicMaterial({ color: 0xfff6e4 })
    );
    nose.position.set(0, 2.55 * scale, -1.15 * scale);
    figure.add(body, head, nose);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.5 * scale, 3.15 * scale, 18),
      new THREE.MeshBasicMaterial({ color: 0xf3e6c8, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.35;
    const bar = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 0.38),
      new THREE.MeshBasicMaterial({ color: 0x6dbf6a })
    );
    bar.rotation.x = -Math.PI / 2;
    bar.position.set(0, 0.4, 2.3 * scale);
    const { tex, width } = labelTexture(mob.name, mob.level);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    const worldW = Math.min(26, Math.max(16, width * 0.08));
    sprite.scale.set(worldW, worldW * (36 / width), 1);
    sprite.position.y = 5.6 * scale;
    group.add(figure, ring, bar, sprite);
    scene.add(group);
    bodies.push(body);
    const entry = { group, figure, body, ring, bar, sprite };
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
      entry.bar.scale.x = ratio;
      entry.bar.position.x = 0;
      entry.bar.material.color.set(ratio < 0.35 ? 0xd4544a : 0x6dbf6a);
      entry.bar.visible = marked || mob.hp < mob.maxHp;
      const con = conOf(mob.level, playerLevel);
      entry.ring.material.color.set(con);
      entry.sprite.material.color.set(con);
      entry.ring.scale.setScalar(marked ? 1.25 : 1);
      entry.figure.position.y = Math.sin(performance.now() / 280 + mob.phase) * 0.12;
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
