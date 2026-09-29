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
  g.font = "600 36px Cinzel, serif";
  const width = Math.max(96, Math.ceil(g.measureText(text).width + 24));
  c.width = width;
  c.height = 52;
  g.font = "600 36px Cinzel, serif";
  g.fillStyle = "rgba(12, 8, 6, 0.78)";
  g.fillRect(0, 4, width, 44);
  g.fillStyle = "#f3e6c8";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, width / 2, 28);
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
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(2.1 * scale, 6.2 * scale, 7),
      new THREE.MeshBasicMaterial({ color: colorOf(mob.name) })
    );
    body.position.y = 3.3 * scale;
    body.userData.mobId = mob.id;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.1 * scale, 3.8 * scale, 18),
      new THREE.MeshBasicMaterial({ color: 0xf3e6c8, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.9;
    const bar = new THREE.Mesh(
      new THREE.PlaneGeometry(6.2, 0.55),
      new THREE.MeshBasicMaterial({ color: 0x6dbf6a })
    );
    bar.rotation.x = -Math.PI / 2;
    bar.position.y = 0.95;
    const { tex, width } = labelTexture(mob.name, mob.level);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    const worldW = Math.min(12, Math.max(7.5, width * 0.042));
    sprite.scale.set(worldW, worldW * (52 / width), 1);
    sprite.position.y = 7.4 * scale;
    sprite.visible = false;
    group.add(body, ring, bar, sprite);
    scene.add(group);
    bodies.push(body);
    const entry = { group, body, ring, bar, sprite };
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
      if (Number.isFinite(px) && Number.isFinite(pz)) {
        entry.group.rotation.y = Math.atan2(px - mob.x, pz - mob.z);
      }
      const ratio = Math.max(0.05, mob.hp / mob.maxHp);
      entry.bar.scale.x = ratio;
      entry.bar.position.x = (ratio - 1) * 3.1;
      entry.bar.material.color.set(ratio < 0.35 ? 0xd4544a : 0x6dbf6a);
      entry.ring.material.color.set(conOf(mob.level, playerLevel));
      const marked = mob.id === targetId;
      entry.sprite.visible = marked;
      entry.ring.scale.setScalar(marked ? 1.2 : 1);
      entry.body.position.y = 3.3 * (mob.named ? 1.28 : 1) + Math.sin(performance.now() / 280 + mob.phase) * 0.25;
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
    const hit = hits.find((h) => h.object.visible && h.object.parent?.visible);
    return hit?.object.userData.mobId || null;
  }

  function dispose() {
    for (const entry of groups.values()) destroy(entry);
    groups.clear();
  }

  return { sync, pick, dispose };
}
