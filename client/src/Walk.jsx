import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import CharacterCreate from "./CharacterCreate";
import { createFieldView } from "./field-view";
import { REACH, createHero, createSession, loadRoster, removeHero, saveHero } from "../../shared/field.js";

const KIND_COLOR = {
  camp: "#c45c26",
  vendor: "#d4a017",
  quest: "#f0c14b",
  trainer: "#6b8ecf",
  zoneline: "#e8c478",
  dungeon: "#8b3a4a",
  named: "#c43b6a",
  landmark: "#7a9e6e",
  dock: "#4a8aa8",
  custom: "#fff8ea",
};

const KIND_NAME = {
  camp: "Camp",
  vendor: "Vendor",
  quest: "Turn-in",
  trainer: "Trainer",
  zoneline: "Zoneline",
  dungeon: "Dungeon",
  named: "Named",
  landmark: "Landmark",
  dock: "Dock",
  custom: "Custom",
};

const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);

const CLASS_TINT = {
  fighter: 0xb5522a,
  paladin: 0xd8c27a,
  "shadow-knight": 0x6a3a55,
  archer: 0x6e8f4a,
  ranger: 0x3f6b45,
  rogue: 0x8a7048,
  monk: 0xc4a574,
  bard: 0x7a5ea8,
  beastmaster: 0x6a5330,
  cleric: 0xf0efe4,
  druid: 0x4e7a48,
  shaman: 0x3d6a62,
  elementalist: 0x4a78a8,
  enchanter: 0x9a6a9a,
  necromancer: 0x5c3d55,
  inquisitor: 0xc8b48a,
  spellblade: 0x6a7a9a,
  wizard: 0x3a4a78,
};

function classTint(id) {
  return CLASS_TINT[id] || 0xc45c26;
}

const emptyHud = {
  zoneId: "",
  zoneName: "",
  kind: "",
  levels: "",
  travel: "",
  nearId: "",
  nearName: "",
};

function readRect(bounds) {
  if (!bounds) return null;
  const south = bounds[0][0];
  const west = bounds[0][1];
  const north = bounds[1][0];
  const east = bounds[1][1];
  const w = east - west;
  const h = north - south;
  if (!(w > 1) || !(h > 1)) return null;
  return {
    west,
    east,
    south,
    north,
    w,
    h,
    x: (west + east) / 2,
    z: -(south + north) / 2,
    zNorth: -north,
    zSouth: -south,
  };
}

function poiPosition(poi, tile) {
  const r = tile?.full;
  if (!r || poi?.mx == null || poi?.my == null) return null;
  const x = r.west + (poi.mx / 100) * r.w;
  const lat = r.north - (poi.my / 100) * r.h;
  return { x, z: -lat };
}

function rot2(x, z, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - z * s, z: x * s + z * c };
}

function makeLabel(text) {
  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  const size = 42;
  g.font = `600 ${size}px Cinzel, serif`;
  const width = Math.max(64, Math.ceil(g.measureText(text).width + 28));
  c.width = width;
  c.height = 64;
  g.font = `600 ${size}px Cinzel, serif`;
  g.fillStyle = "rgba(18, 12, 8, 0.78)";
  g.fillRect(0, 10, width, 44);
  g.fillStyle = "#f3e6c8";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, width / 2, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  const worldW = Math.min(150, width * 0.62);
  sprite.scale.set(worldW, worldW * (64 / width), 1);
  sprite.renderOrder = 3;
  return sprite;
}

function dotTexture(cache, color) {
  const hit = cache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.beginPath();
  g.arc(32, 32, 22, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = "#1a120c";
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(color, tex);
  return tex;
}

export default function Walk({
  atlas,
  zones,
  pois,
  layer,
  selectedId,
  focusPoiId,
  onEnterZone,
  onSelectPoi,
  onHoverPoi,
  onBind,
}) {
  const stageRef = useRef(null);
  const hostRef = useRef(null);
  const miniRef = useRef(null);
  const tipRef = useRef(null);
  const apiRef = useRef(null);
  const miniStamp = useRef(0);
  const zonesRef = useRef(zones);
  const poisRef = useRef(pois);
  const selectedRef = useRef(selectedId);
  const focusRef = useRef(focusPoiId);
  const layerPropRef = useRef(layer);
  const onEnterRef = useRef(onEnterZone);
  const onSelectRef = useRef(onSelectPoi);
  const onHoverRef = useRef(onHoverPoi);
  const hudRef = useRef(emptyHud);
  const [hud, setHud] = useState(emptyHud);
  const [hover, setHover] = useState(null);
  const [roster, setRoster] = useState(() => loadRoster().heroes);
  const [hero, setHero] = useState(null);
  const [combat, setCombat] = useState(null);
  const heroRef = useRef(hero);
  const onBindRef = useRef(onBind);
  const onCombatRef = useRef(setCombat);
  heroRef.current = hero;
  onBindRef.current = onBind;
  onCombatRef.current = setCombat;
  const [miniAspect, setMiniAspect] = useState(1.35);
  const [failed, setFailed] = useState(false);

  zonesRef.current = zones;
  poisRef.current = pois;
  selectedRef.current = selectedId;
  focusRef.current = focusPoiId;
  layerPropRef.current = layer;
  onEnterRef.current = onEnterZone;
  onSelectRef.current = onSelectPoi;
  onHoverRef.current = onHoverPoi;

  const atlasKey = (atlas?.overlays || []).map((o) => `${o.id}|${o.layer}|${o.src}`).join(";");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !atlas?.overlays?.length) return;

    let alive = true;
    let frame = 0;
    let layerNow = layerPropRef.current || "surface";
    let target = null;
    let reported = "";
    let standing = "";
    let hoverId = null;
    let bob = 0;
    let snapCam = true;
    let dragging = false;
    const keys = new Set();
    const tiles = [];
    const tileById = new Map();
    const poiSprites = [];
    const labels = [];
    const pickMeshes = [];
    const dotCache = new Map();
    const bounds = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
    let aspectNow = 0;
    const cam = { yaw: 0, pitch: 1.2, dist: 104 };
    const desired = new THREE.Vector3();

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(layerNow === "deep" ? 0x140c16 : 0x0d1c24, 1);
    renderer.domElement.className = "walk-view";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.4, 20000);
    const anisotropy = renderer.capabilities.getMaxAnisotropy();

    const voidGeo = new THREE.PlaneGeometry(1, 1);
    voidGeo.rotateX(-Math.PI / 2);
    const voidMat = new THREE.MeshBasicMaterial({ color: layerNow === "deep" ? 0x140c16 : 0x0d1c24 });
    const voidMesh = new THREE.Mesh(voidGeo, voidMat);
    voidMesh.position.y = -0.8;
    scene.add(voidMesh);
    pickMeshes.push(voidMesh);

    const zoneById = new Map((zonesRef.current || []).map((z) => [z.id, z]));
    const loader = new THREE.TextureLoader();

    for (const spec of atlas.overlays) {
      const zone = zoneById.get(spec.id);
      const art = readRect(spec.geoBounds || spec.bounds);
      const full = readRect(spec.bounds || spec.geoBounds);
      if (!art || !full) continue;
      const tileLayer = spec.layer || zone?.layer || "surface";
      const role = spec.role || "outdoor";
      const geo = new THREE.PlaneGeometry(Math.max(art.w, 1), Math.max(art.h, 1));
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0x4a3b2a });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(art.x, role === "nested" ? 0.35 : 0.05, art.z);
      scene.add(mesh);
      pickMeshes.push(mesh);
      const tile = {
        id: spec.id,
        layer: tileLayer,
        role,
        art,
        full,
        mesh,
        name: zone?.name || spec.id,
        artClip: spec.artClip,
        image: null,
      };
      tiles.push(tile);
      tileById.set(spec.id, tile);

      if (spec.src) {
        loader.load(spec.src, (tex) => {
          if (!alive) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = anisotropy;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          const clip = spec.artClip;
          if (clip && spec.geoBounds) {
            const rw = (100 - clip.l - clip.r) / 100;
            const rh = (100 - clip.t - clip.b) / 100;
            if (rw > 0.05 && rh > 0.05) {
              tex.repeat.set(rw, rh);
              tex.offset.set(clip.l / 100, clip.b / 100);
            }
          }
          tex.needsUpdate = true;
          mat.map = tex;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
          tile.image = tex.image;
        });
      }

      const label = makeLabel(tile.name);
      label.position.set(art.x, 16, art.z);
      label.userData.layer = tileLayer;
      label.visible = false;
      scene.add(label);
      labels.push(label);
    }

    const player = new THREE.Group();
    const visuals = new THREE.Group();
    const cloak = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2.05, 3.1, 8),
      new THREE.MeshBasicMaterial({ color: classTint(heroRef.current?.classId) })
    );
    cloak.position.y = 1.8;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xf0d7a2 })
    );
    head.position.y = 3.7;
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.45, 1.5),
      new THREE.MeshBasicMaterial({ color: 0xfff6e4 })
    );
    nose.position.set(0, 3.7, -1.7);
    visuals.add(cloak, head, nose);
    visuals.scale.setScalar(0.55);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.45, 1.95, 28),
      new THREE.MeshBasicMaterial({ color: 0xf0c14b, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.7;
    player.add(visuals, ring);
    scene.add(player);

    const dest = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 4.8, 28),
      new THREE.MeshBasicMaterial({ color: 0xc45c26, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
    );
    dest.rotation.x = -Math.PI / 2;
    dest.position.y = 0.75;
    dest.visible = false;
    scene.add(dest);

    const pathGeo = new THREE.BufferGeometry();
    pathGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const path = new THREE.Line(
      pathGeo,
      new THREE.LineBasicMaterial({ color: 0xf0c14b, transparent: true, opacity: 0.9 })
    );
    path.frustumCulled = false;
    path.visible = false;
    scene.add(path);

    const outlineArr = new Float32Array(12);
    const outlineGeo = new THREE.BufferGeometry();
    outlineGeo.setAttribute("position", new THREE.BufferAttribute(outlineArr, 3));
    const outline = new THREE.LineLoop(outlineGeo, new THREE.LineBasicMaterial({ color: 0xf0c14b }));
    outline.frustumCulled = false;
    outline.visible = false;
    scene.add(outline);

    const poiGroup = new THREE.Group();
    scene.add(poiGroup);

    const north = makeLabel("N");
    north.scale.multiplyScalar(0.55);
    scene.add(north);

    function publish(partial) {
      if (!alive) return;
      const prev = hudRef.current;
      const next = { ...prev, ...partial };
      if (
        prev.zoneId === next.zoneId &&
        prev.zoneName === next.zoneName &&
        prev.kind === next.kind &&
        prev.levels === next.levels &&
        prev.travel === next.travel &&
        prev.nearId === next.nearId &&
        prev.nearName === next.nearName
      ) {
        return;
      }
      hudRef.current = next;
      setHud(next);
    }

    function zoneInfo(id) {
      return (zonesRef.current || []).find((z) => z.id === id) || null;
    }

    function describe(id) {
      const info = id ? zoneInfo(id) : null;
      const tile = id ? tileById.get(id) : null;
      return {
        zoneId: id || "",
        zoneName: info?.name || tile?.name || (id ? id : "Between maps"),
        kind: info?.kind || "",
        levels: info ? `levels ${info.levelMin}–${info.levelMax}` : "",
      };
    }

    function zoneAt(x, z) {
      let best = null;
      let area = Infinity;
      for (const tile of tiles) {
        if (tile.layer !== layerNow) continue;
        const r = tile.full;
        if (x < r.west || x > r.east || z < r.zNorth || z > r.zSouth) continue;
        const a = r.w * r.h;
        if (a < area) {
          area = a;
          best = tile;
        }
      }
      return best;
    }

    function clampPos(x, z) {
      return {
        x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
        z: Math.min(bounds.maxZ, Math.max(bounds.minZ, z)),
      };
    }

    function showOutline(tile) {
      if (!tile) {
        outline.visible = false;
        return;
      }
      const r = tile.art;
      const y = 0.95;
      outlineArr.set([
        r.west, y, r.zNorth,
        r.east, y, r.zNorth,
        r.east, y, r.zSouth,
        r.west, y, r.zSouth,
      ]);
      outlineGeo.attributes.position.needsUpdate = true;
      outline.visible = true;
    }

    function recomputeBounds() {
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (const tile of tiles) {
        if (tile.layer !== layerNow) continue;
        minX = Math.min(minX, tile.art.west);
        maxX = Math.max(maxX, tile.art.east);
        minZ = Math.min(minZ, tile.art.zNorth);
        maxZ = Math.max(maxZ, tile.art.zSouth);
      }
      if (!Number.isFinite(minX)) return;
      const pad = 80;
      bounds.minX = minX - pad;
      bounds.maxX = maxX + pad;
      bounds.minZ = minZ - pad;
      bounds.maxZ = maxZ + pad;
      const spanX = bounds.maxX - bounds.minX;
      const spanZ = Math.max(1, bounds.maxZ - bounds.minZ);
      voidMesh.scale.set(spanX, 1, spanZ);
      voidMesh.position.set((bounds.minX + bounds.maxX) / 2, -0.8, (bounds.minZ + bounds.maxZ) / 2);
      north.position.set((bounds.minX + bounds.maxX) / 2, 22, bounds.minZ + 28);
      const aspect = spanX / spanZ;
      if (Math.abs(aspect - aspectNow) > 0.02) {
        aspectNow = aspect;
        if (alive) setMiniAspect(Number(aspect.toFixed(3)));
      }
    }

    function applyLayer() {
      for (const tile of tiles) tile.mesh.visible = tile.layer === layerNow;
      for (const sprite of poiSprites) {
        const tile = tileById.get(sprite.userData.poi.zoneId);
        sprite.visible = !!tile && tile.layer === layerNow;
      }
      renderer.setClearColor(layerNow === "deep" ? 0x140c16 : 0x0d1c24, 1);
      voidMat.color.set(layerNow === "deep" ? 0x140c16 : 0x0d1c24);
      recomputeBounds();
      showOutline(zoneAt(player.position.x, player.position.z));
    }

    function placeCamera(force) {
      const horiz = Math.cos(cam.pitch) * cam.dist;
      desired.set(
        player.position.x + Math.sin(cam.yaw) * horiz,
        7 + Math.sin(cam.pitch) * cam.dist,
        player.position.z + Math.cos(cam.yaw) * horiz
      );
      if (force) {
        camera.position.copy(desired);
        camera.lookAt(player.position.x, 1.2, player.position.z);
      }
    }

    function clearTravel() {
      target = null;
      dest.visible = false;
      path.visible = false;
      publish({ travel: "" });
    }

    function travelTo(pos, label) {
      const c = clampPos(pos.x, pos.z);
      target = { x: c.x, z: c.z };
      dest.visible = true;
      dest.position.set(c.x, 0.75, c.z);
      path.visible = true;
      const dx = c.x - player.position.x;
      const dz = c.z - player.position.z;
      if (dx || dz) player.rotation.y = Math.atan2(-dx, -dz);
      publish({ travel: label ? `Running to ${label}` : "Running" });
    }

    function snapTo(pos) {
      const c = clampPos(pos.x, pos.z);
      player.position.x = c.x;
      player.position.z = c.z;
      clearTravel();
      snapCam = true;
      const tile = zoneAt(c.x, c.z);
      standing = tile?.id || "";
      if (tile && tile.id !== reported) {
        reported = tile.id;
        if (apiRef.current) apiRef.current.echo = tile.id;
        onEnterRef.current?.(tile.id);
      }
      publish(describe(tile?.id));
      showOutline(tile);
    }

    function wake(zoneId) {
      const tile = tileById.get(zoneId);
      if (!tile) return;
      if (tile.layer !== layerNow) setLayer(tile.layer, false);
      snapTo({ x: tile.art.x, z: tile.art.z });
      reported = zoneId;
      if (apiRef.current) apiRef.current.echo = zoneId;
      onBindRef.current?.(zoneId);
    }

    function bindHero(next) {
      session = next ? createSession(structuredClone(next), localStorage) : null;
      cloak.material.color.set(classTint(next?.classId));
      combatKey = "";
      if (session) publishCombat(session.hud());
      else onCombatRef.current(null);
    }

    function resume(saved) {
      if (!saved) return;
      const tile = tileById.get(saved.zoneId || saved.originId);
      if (tile?.layer && tile.layer !== layerNow) setLayer(tile.layer, false);
      if (Number.isFinite(saved.x) && Number.isFinite(saved.z)) snapTo({ x: saved.x, z: saved.z });
      else if (tile) snapTo({ x: tile.art.x, z: tile.art.z });
    }

    function goToZone(id) {
      const tile = tileById.get(id);
      if (!tile || tile.layer !== layerNow) return;
      const pos = { x: tile.art.x, z: tile.art.z };
      const dist = Math.hypot(pos.x - player.position.x, pos.z - player.position.z);
      if (dist < 10) return;
      travelTo(pos, tile.name);
    }

    function goToPoi(id) {
      const poi = (poisRef.current || []).find((p) => p.id === id);
      const tile = poi && tileById.get(poi.zoneId);
      if (!poi || !tile || tile.layer !== layerNow) return;
      const pos = poiPosition(poi, tile) || { x: tile.art.x, z: tile.art.z };
      travelTo(pos, poi.name);
    }

    function setLayer(next, teleport = true) {
      layerNow = next || layerNow;
      applyLayer();
      if (!teleport) return;
      if (zoneAt(player.position.x, player.position.z)) return;
      const prefer = tileById.get(selectedRef.current);
      const destTile = prefer && prefer.layer === layerNow ? prefer : tiles.find((t) => t.layer === layerNow);
      if (!destTile) return;
      snapTo({ x: destTile.art.x, z: destTile.art.z });
      reported = destTile.id;
    }

    function setPois(list) {
      for (const sprite of poiSprites) {
        poiGroup.remove(sprite);
        sprite.material.dispose();
      }
      poiSprites.length = 0;
      for (const poi of list || []) {
        const tile = tileById.get(poi.zoneId);
        const pos = poiPosition(poi, tile);
        if (!pos) continue;
        const color = KIND_COLOR[poi.kind] || "#c45c26";
        const mat = new THREE.SpriteMaterial({
          map: dotTexture(dotCache, color),
          transparent: true,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(pos.x, 7, pos.z);
        sprite.scale.set(12, 12, 1);
        sprite.userData.poi = poi;
        sprite.visible = tile.layer === layerNow;
        sprite.renderOrder = 4;
        poiGroup.add(sprite);
        poiSprites.push(sprite);
      }
    }

    function eventToWorld(e) {
      const canvas = miniRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const u = (e.clientX - rect.left) / rect.width;
      const v = (e.clientY - rect.top) / rect.height;
      if (u < 0 || v < 0 || u > 1 || v > 1) return null;
      return {
        x: bounds.minX + u * (bounds.maxX - bounds.minX),
        z: bounds.minZ + v * (bounds.maxZ - bounds.minZ),
      };
    }

    function spawnPoint() {
      const saved = heroRef.current;
      if (saved?.originId) {
        const origin = tileById.get(saved.zoneId || saved.originId);
        if (origin && (!saved.layer || origin.layer === saved.layer || origin.layer === layerNow)) {
          if (Number.isFinite(saved.x) && Number.isFinite(saved.z) && (!saved.layer || saved.layer === layerNow)) {
            return { pos: { x: saved.x, z: saved.z }, zoneId: saved.zoneId || origin.id };
          }
          if (!Number.isFinite(saved.x)) return { pos: { x: origin.art.x, z: origin.art.z }, zoneId: origin.id };
        }
      }
      const poi = focusRef.current
        ? (poisRef.current || []).find((p) => p.id === focusRef.current)
        : null;
      let tile = tileById.get(selectedRef.current);
      if (!tile || tile.layer !== layerNow) tile = tiles.find((t) => t.layer === layerNow);
      if (poi) {
        const poiTile = tileById.get(poi.zoneId);
        if (poiTile && poiTile.layer === layerNow) tile = poiTile;
      }
      if (!tile) return null;
      const pos = (poi && poi.zoneId === tile.id && poiPosition(poi, tile)) || { x: tile.art.x, z: tile.art.z };
      return { pos, zoneId: tile.id };
    }

    function posOf(poi) {
      const tile = tileById.get(poi.zoneId);
      const p = poiPosition(poi, tile);
      if (!p || !tile) return null;
      return { x: p.x, z: p.z, layer: tile.layer };
    }

    const fieldView = createFieldView(scene);
    let session = heroRef.current ? createSession(structuredClone(heroRef.current), localStorage) : null;
    let pullId = null;

    function pullMob(id) {
      if (!session || !id) return;
      const mob = session.mobs.get(id);
      if (!mob || !mob.alive) return;
      publishCombat(session.engage(id));
      if (Math.hypot(mob.x - player.position.x, mob.z - player.position.z) <= REACH) {
        pullId = null;
        clearTravel();
        return;
      }
      pullId = id;
      travelTo({ x: mob.x, z: mob.z }, mob.name);
    }
    let combatKey = "";
    function publishCombat(snap) {
      if (!snap) return;
      const mark = snap.target;
      const key = `${snap.hp}|${snap.xp}|${snap.level}|${snap.kills}|${snap.line}|${mark?.id || ""}|${mark?.hp ?? ""}|${snap.attacking ? 1 : 0}`;
      if (key === combatKey) return;
      combatKey = key;
      onCombatRef.current(snap);
    }

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    function pick(clientX, clientY) {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const mobId = fieldView.pick(raycaster);
      if (mobId) {
        const mob = session?.mobs.get(mobId);
        if (mob?.alive) return { type: "mob", id: mobId, name: mob.name, level: mob.level, x: mob.x, z: mob.z };
      }
      const poiHits = raycaster.intersectObjects(poiSprites, false);
      if (poiHits.length && poiHits[0].object.visible) {
        const poi = poiHits[0].object.userData.poi;
        return { type: "poi", poi, x: poiHits[0].object.position.x, z: poiHits[0].object.position.z };
      }
      const groundHits = raycaster.intersectObjects(pickMeshes, false);
      if (groundHits.length) {
        return { type: "ground", x: groundHits[0].point.x, z: groundHits[0].point.z };
      }
      return null;
    }

    let lastClick = 0;
    function handleClick(e) {
      const hit = pick(e.clientX, e.clientY);
      if (!hit || !heroRef.current) return;
      if (hit.type === "mob" && session) {
        pullMob(hit.id);
        return;
      }
      const now = performance.now();
      const dbl = now - lastClick < 280;
      lastClick = dbl ? 0 : now;
      if (hit.type === "poi") {
        onSelectRef.current?.(hit.poi);
        if (dbl) snapTo(hit);
        else travelTo(hit, hit.poi.name);
        return;
      }
      const tile = zoneAt(hit.x, hit.z);
      if (dbl) snapTo(hit);
      else travelTo(hit, tile?.name || "");
    }

    function hoverAt(e) {
      const hit = pick(e.clientX, e.clientY);
      if (hit?.type === "mob") {
        const id = hit.id;
        const tip = tipRef.current;
        const stage = stageRef.current;
        if (tip && stage) {
          const box = stage.getBoundingClientRect();
          tip.style.transform = `translate(${e.clientX - box.left + 14}px, ${e.clientY - box.top + 16}px)`;
        }
        if (id === hoverId) return;
        hoverId = id;
        if (!alive) return;
        setHover({ id, name: hit.name, kind: `Level ${hit.level}`, zone: "", notes: "" });
        return;
      }
      const poi = hit?.type === "poi" ? hit.poi : null;
      const id = poi?.id || "";
      const tip = tipRef.current;
      const stage = stageRef.current;
      if (tip && stage) {
        const box = stage.getBoundingClientRect();
        tip.style.transform = `translate(${e.clientX - box.left + 14}px, ${e.clientY - box.top + 16}px)`;
      }
      if (id === hoverId) return;
      hoverId = id;
      onHoverRef.current?.(poi);
      if (!alive) return;
      setHover(
        poi
          ? {
              id,
              name: poi.name,
              kind: KIND_NAME[poi.kind] || poi.kind,
              zone: zoneInfo(poi.zoneId)?.name || "",
              notes: poi.notes || "",
            }
          : null
      );
    }

    let lx = 0;
    let ly = 0;
    let moved = 0;
    function onPointerDown(e) {
      if (e.button !== 0 && e.button !== 2) return;
      dragging = true;
      moved = 0;
      lx = e.clientX;
      ly = e.clientY;
      renderer.domElement.setPointerCapture?.(e.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    }
    function onPointerMove(e) {
      if (!dragging) {
        hoverAt(e);
        return;
      }
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      cam.yaw -= dx * 0.005;
      cam.pitch = Math.min(1.4, Math.max(0.9, cam.pitch + dy * 0.0035));
    }
    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      renderer.domElement.style.cursor = "crosshair";
      if (moved < 6) handleClick(e);
    }
    function onPointerLeave() {
      if (!hoverId) return;
      hoverId = null;
      onHoverRef.current?.(null);
      if (alive) setHover(null);
    }
    function onWheel(e) {
      e.preventDefault();
      cam.dist = Math.min(210, Math.max(62, cam.dist * (e.deltaY > 0 ? 1.08 : 0.92)));
    }
    function onContext(e) {
      e.preventDefault();
    }
    function onKeyDown(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
      if (!heroRef.current) return;
      const k = e.key.toLowerCase();
      if (k === " " || k === "spacebar") {
        e.preventDefault();
        if (!session) return;
        pullMob(session.targetId || session.nearestId(player.position.x, player.position.z, 220));
        return;
      }
      if (k === "tab") {
        e.preventDefault();
        if (!session) return;
        publishCombat(session.cycleTarget(player.position.x, player.position.z));
        pullMob(session.targetId);
        return;
      }
      if (k === "escape") {
        pullId = null;
        clearTravel();
        if (session) publishCombat(session.clearTarget());
        return;
      }
      if (MOVE_KEYS.has(k) || k === "shift") {
        keys.add(k);
        if (MOVE_KEYS.has(k)) e.preventDefault();
      }
    }
    function onKeyUp(e) {
      keys.delete(e.key.toLowerCase());
    }
    function onBlur() {
      keys.clear();
    }

    const el = renderer.domElement;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointerleave", onPointerLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    function resize() {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w < 2 || h < 2) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    setLayer(layerNow, false);
    const spot = spawnPoint();
    if (spot) {
      player.position.set(spot.pos.x, 0, spot.pos.z);
      reported = spot.zoneId;
      standing = spot.zoneId;
      publish(describe(spot.zoneId));
      showOutline(tileById.get(spot.zoneId));
      if (spot.zoneId !== selectedRef.current) {
        if (apiRef.current) apiRef.current.echo = spot.zoneId;
        onEnterRef.current?.(spot.zoneId);
      }
    }
    snapCam = true;

    function miniPoint(x, z, cw, ch) {
      const spanX = bounds.maxX - bounds.minX || 1;
      const spanZ = bounds.maxZ - bounds.minZ || 1;
      return [((x - bounds.minX) / spanX) * cw, ((z - bounds.minZ) / spanZ) * ch];
    }

    function drawTile(ctx, tile, cw, ch) {
      const spanX = bounds.maxX - bounds.minX || 1;
      const spanZ = bounds.maxZ - bounds.minZ || 1;
      const r = tile.art;
      const dx = ((r.west - bounds.minX) / spanX) * cw;
      const dy = ((r.zNorth - bounds.minZ) / spanZ) * ch;
      const dw = (r.w / spanX) * cw;
      const dh = (r.h / spanZ) * ch;
      const img = tile.image;
      if (img && img.width) {
        const clip = tile.artClip;
        const sx = clip ? (clip.l / 100) * img.width : 0;
        const sy = clip ? (clip.t / 100) * img.height : 0;
        const sw = clip ? ((100 - clip.l - clip.r) / 100) * img.width : img.width;
        const sh = clip ? ((100 - clip.t - clip.b) / 100) * img.height : img.height;
        if (sw > 1 && sh > 1) ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      } else {
        ctx.fillStyle = tile.layer === "deep" ? "#24182c" : "#3a2e22";
        ctx.fillRect(dx, dy, dw, dh);
      }
      ctx.strokeStyle = "rgba(243, 230, 200, 0.28)";
      ctx.lineWidth = 1;
      ctx.strokeRect(dx, dy, dw, dh);
      return { dx, dy, dw, dh };
    }

    function drawMini() {
      const canvas = miniRef.current;
      if (!canvas) return;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW < 2 || cssH < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.round(cssW * dpr);
      const bh = Math.round(cssH * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = layerNow === "deep" ? "#140c16" : "#0d1c24";
      ctx.fillRect(0, 0, cssW, cssH);
      let hereBox = null;
      for (const tile of tiles) {
        if (tile.layer !== layerNow) continue;
        const box = drawTile(ctx, tile, cssW, cssH);
        if (tile.id === standing) hereBox = box;
      }
      if (hereBox) {
        ctx.strokeStyle = "#f0c14b";
        ctx.lineWidth = 2;
        ctx.strokeRect(hereBox.dx, hereBox.dy, hereBox.dw, hereBox.dh);
      }
      for (const sprite of poiSprites) {
        if (!sprite.visible) continue;
        const [px, py] = miniPoint(sprite.position.x, sprite.position.z, cssW, cssH);
        const focus = sprite.userData.poi.id === focusRef.current;
        ctx.beginPath();
        ctx.arc(px, py, focus ? 4.2 : 2.15, 0, Math.PI * 2);
        ctx.fillStyle = KIND_COLOR[sprite.userData.poi.kind] || "#c45c26";
        ctx.fill();
        if (focus) {
          ctx.strokeStyle = "#fff6e4";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      if (session) {
        for (const mob of session.mobs.values()) {
          if (!mob.alive || mob.layer !== layerNow) continue;
          const [mx, my] = miniPoint(mob.x, mob.z, cssW, cssH);
          ctx.beginPath();
          ctx.arc(mx, my, mob.aggro ? 3.4 : 2.4, 0, Math.PI * 2);
          ctx.fillStyle = mob.aggro ? "#d4544a" : "#c45c26";
          ctx.fill();
        }
      }
      const [px, py] = miniPoint(player.position.x, player.position.z, cssW, cssH);
      if (target) {
        const [tx, ty] = miniPoint(target.x, target.z, cssW, cssH);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = "rgba(240, 193, 75, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#c45c26";
        ctx.fill();
      }
      const fx = -Math.sin(cam.yaw);
      const fz = -Math.cos(cam.yaw);
      const reach = cam.dist * 0.72;
      const left = rot2(fx, fz, 0.48);
      const right = rot2(fx, fz, -0.48);
      const nose = miniPoint(player.position.x + fx * reach, player.position.z + fz * reach, cssW, cssH);
      const a = miniPoint(player.position.x + left.x * reach, player.position.z + left.z * reach, cssW, cssH);
      const b = miniPoint(player.position.x + right.x * reach, player.position.z + right.z * reach, cssW, cssH);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.closePath();
      ctx.fillStyle = "rgba(240, 193, 75, 0.18)";
      ctx.fill();
      const ang = Math.atan2(nose[0] - px, -(nose[1] - py));
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5.5, 6);
      ctx.lineTo(-5.5, 6);
      ctx.closePath();
      ctx.fillStyle = "#f0c14b";
      ctx.strokeStyle = "#1a120c";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    let last = performance.now();
    function tick(now) {
      if (!alive) return;
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const fx = -Math.sin(cam.yaw);
      const fz = -Math.cos(cam.yaw);
      const sprint = keys.has("shift");
      const speed = (16 + cam.dist * 0.05) * (sprint ? 1.65 : 1) * (session?.speed() || 1);
      if (!heroRef.current) keys.clear();
      const keyMove =
        keys.has("w") ||
        keys.has("a") ||
        keys.has("s") ||
        keys.has("d") ||
        keys.has("arrowup") ||
        keys.has("arrowdown") ||
        keys.has("arrowleft") ||
        keys.has("arrowright");

      let mx = 0;
      let mz = 0;
      if (keyMove) {
        pullId = null;
        if (target) clearTravel();
        if (keys.has("w") || keys.has("arrowup")) {
          mx += fx;
          mz += fz;
        }
        if (keys.has("s") || keys.has("arrowdown")) {
          mx -= fx;
          mz -= fz;
        }
        if (keys.has("d") || keys.has("arrowright")) {
          mx += -fz;
          mz += fx;
        }
        if (keys.has("a") || keys.has("arrowleft")) {
          mx -= -fz;
          mz -= fx;
        }
      } else if (pullId && session) {
        const mob = session.mobs.get(pullId);
        if (!mob || !mob.alive) pullId = null;
        else if (Math.hypot(mob.x - player.position.x, mob.z - player.position.z) <= REACH) {
          pullId = null;
          clearTravel();
        } else {
          target = { x: mob.x, z: mob.z };
          dest.visible = true;
          dest.position.set(mob.x, 0.75, mob.z);
          path.visible = true;
        }
      }
      if (!keyMove && target) {
        mx = target.x - player.position.x;
        mz = target.z - player.position.z;
        const len = Math.hypot(mx, mz);
        if (len < 2.8) {
          player.position.x = target.x;
          player.position.z = target.z;
          clearTravel();
          mx = 0;
          mz = 0;
        } else {
          mx /= len;
          mz /= len;
        }
      }

      const mag = Math.hypot(mx, mz);
      if (mag > 0) {
        mx /= mag;
        mz /= mag;
        const step = speed * dt;
        const next = clampPos(player.position.x + mx * step, player.position.z + mz * step);
        player.position.x = next.x;
        player.position.z = next.z;
        const face = Math.atan2(-mx, -mz);
        let diff = face - player.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        player.rotation.y += diff * Math.min(1, dt * 12);
        bob += dt * (sprint ? 16 : 11);
        visuals.position.y = Math.abs(Math.sin(bob)) * 0.55;
      } else {
        visuals.position.y += (0 - visuals.position.y) * Math.min(1, dt * 8);
      }

      if (target) {
        dest.position.set(target.x, 0.75, target.z);
        const s = 1 + Math.sin(now * 0.008) * 0.12;
        dest.scale.set(s, s, 1);
        const arr = pathGeo.attributes.position.array;
        arr[0] = player.position.x;
        arr[1] = 1.15;
        arr[2] = player.position.z;
        arr[3] = target.x;
        arr[4] = 1.15;
        arr[5] = target.z;
        pathGeo.attributes.position.needsUpdate = true;
        const focusScale = focusRef.current ? 18 : 12;
        for (const sprite of poiSprites) {
          const on = sprite.userData.poi.id === focusRef.current;
          const sc = on ? focusScale : 12;
          sprite.scale.set(sc, sc, 1);
        }
      } else {
        for (const sprite of poiSprites) {
          const on = sprite.userData.poi.id === focusRef.current;
          if ((on && sprite.scale.x < 17) || (!on && sprite.scale.x > 13)) {
            const sc = on ? 18 : 12;
            sprite.scale.set(sc, sc, 1);
          }
        }
      }

      const under = zoneAt(player.position.x, player.position.z);
      const zid = under?.id || "";
      if (zid !== standing) {
        standing = zid;
        publish(describe(zid));
        showOutline(under);
        if (zid && zid !== reported) {
          reported = zid;
          if (apiRef.current) apiRef.current.echo = zid;
          onEnterRef.current?.(zid);
        }
      }

      let near = null;
      let nearD = 24;
      for (const sprite of poiSprites) {
        if (!sprite.visible) continue;
        const d = Math.hypot(sprite.position.x - player.position.x, sprite.position.z - player.position.z);
        if (d < nearD) {
          nearD = d;
          near = sprite.userData.poi;
        }
      }
      const nearId = near?.id || "";
      if (nearId !== hudRef.current.nearId) {
        publish({ nearId, nearName: near?.name || "" });
      }

      for (const label of labels) {
        label.visible = label.userData.layer === layerNow && cam.dist > 168;
      }

      if (session && heroRef.current) {
        const step = session.update(
          dt,
          player.position.x,
          player.position.z,
          layerNow,
          standing,
          Date.now(),
          poisRef.current,
          posOf
        );
        fieldView.sync(session.mobs, session.targetId, step.hud.level, player.position.x, player.position.z);
        const prey = session.targetId ? session.mobs.get(session.targetId) : null;
        const swinging = prey && prey.alive && Math.hypot(prey.x - player.position.x, prey.z - player.position.z) <= REACH;
        ring.material.color.set(swinging ? 0xc45c26 : 0xf0c14b);
        publishCombat(step.hud);
        if (step.died) wake(step.originId);
      } else {
        fieldView.sync(new Map(), null, 1);
      }

      placeCamera(false);
      if (snapCam || dragging) {
        camera.position.copy(desired);
        snapCam = false;
      } else {
        camera.position.lerp(desired, 1 - Math.exp(-10 * dt));
      }
      camera.lookAt(player.position.x, 1.2, player.position.z);
      renderer.render(scene, camera);
      drawMini();
    }
    frame = requestAnimationFrame(tick);

    apiRef.current = {
      skips: 2,
      echo: spot && spot.zoneId !== selectedRef.current ? spot.zoneId : null,
      eventToWorld,
      zoneAt,
      travelTo,
      snapTo,
      goToZone,
      goToPoi,
      setLayer,
      setPois,
      wake,
      bindHero,
      resume,
      flush() {
        session?.flush();
      },
    };
    if (session) publishCombat(session.hud());

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointerleave", onPointerLeave);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      session?.flush?.();
      fieldView.dispose();
      const textures = new Set();
      const sharedDots = new Set(dotCache.values());
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
        const mats = obj.material ? [].concat(obj.material) : [];
        for (const m of mats) {
          if (m.map && !sharedDots.has(m.map)) textures.add(m.map);
          m.dispose?.();
        }
      });
      for (const tex of sharedDots) tex.dispose();
      for (const tex of textures) tex.dispose();
      renderer.dispose();
      if (el.parentNode === host) host.removeChild(el);
      apiRef.current = null;
    };
    // Scene rebuilds only when the stitched atlas changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atlasKey]);

  useEffect(() => {
    apiRef.current?.setLayer(layer);
  }, [layer, atlasKey]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api || !selectedId) return;
    if (api.skips > 0) {
      api.skips -= 1;
      return;
    }
    if (api.echo === selectedId) {
      api.echo = null;
      return;
    }
    api.goToZone(selectedId);
  }, [selectedId, atlasKey]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    if (api.skips > 0) {
      api.skips -= 1;
      return;
    }
    if (focusPoiId) api.goToPoi(focusPoiId);
  }, [focusPoiId, atlasKey]);

  useEffect(() => {
    apiRef.current?.setPois(pois);
  }, [pois, atlasKey]);

  function refreshRoster() {
    setRoster(loadRoster().heroes);
  }

  function play(saved) {
    saveHero(saved, localStorage);
    setHero(saved);
    refreshRoster();
    apiRef.current?.bindHero(saved);
    apiRef.current?.resume(saved);
  }

  function conjure(draft) {
    const next = createHero(draft);
    saveHero(next, localStorage);
    setHero(next);
    refreshRoster();
    apiRef.current?.bindHero(next);
    apiRef.current?.wake(next.originId);
  }

  function bench() {
    apiRef.current?.flush();
    setHero(null);
    setCombat(null);
    refreshRoster();
    apiRef.current?.bindHero(null);
  }

  function release(id) {
    removeHero(id, localStorage);
    refreshRoster();
  }

  function onMini(e) {
    if (!hero) return;
    const api = apiRef.current;
    if (!api) return;
    const pt = api.eventToWorld(e);
    if (!pt) return;
    const now = performance.now();
    if (now - miniStamp.current < 280) {
      miniStamp.current = 0;
      api.snapTo(pt);
      return;
    }
    miniStamp.current = now;
    const tile = api.zoneAt(pt.x, pt.z);
    api.travelTo(pt, tile?.name || "");
  }

  if (failed) {
    return <div className="walk-boot">This browser could not start the walk view.</div>;
  }

  if (!atlas?.overlays?.length) {
    return <div className="walk-boot">No atlas to walk.</div>;
  }

  return (
    <div ref={stageRef} className={`walk-stage layer-${layer}`}>
      <div ref={hostRef} className="walk-gl" />
      {combat && hero && (
        <div className="field-hud">
          <header>
            <strong>{combat.name}</strong>
            <span>
              {combat.className} · {combat.passive}
            </span>
          </header>
          <div className="field-bar hp">
            <i style={{ width: `${Math.max(0, Math.min(100, (combat.hp / combat.maxHp) * 100))}%` }} />
          </div>
          <dl className="field-stats">
            <div>
              <dt>Health</dt>
              <dd>
                {combat.hp} / {combat.maxHp}
              </dd>
            </div>
            <div>
              <dt>Attack</dt>
              <dd>
                {combat.attack}
                {combat.attacking ? " · swinging" : ""}
              </dd>
            </div>
          </dl>
          <div className="field-bar xp">
            <i style={{ width: `${Math.max(0, Math.min(100, (combat.xp / combat.xpNext) * 100))}%` }} />
          </div>
          <p className="field-nums">
            Level {combat.level}
            {combat.level < 60 ? ` · ${combat.xp} / ${combat.xpNext} xp` : " · the road levels off"}
            {combat.kills ? ` · ${combat.kills} fallen` : ""}
          </p>
          {combat.target && (
            <div className="field-target">
              <strong style={{ color: combat.target.con }}>{combat.target.name}</strong>
              <span>
                Level {combat.target.level}
                {combat.target.named ? " · named" : ""} · {combat.target.hp} / {combat.target.maxHp}
              </span>
              <div className="field-bar mob">
                <i
                  style={{
                    width: `${Math.max(0, Math.min(100, (combat.target.hp / combat.target.maxHp) * 100))}%`,
                    background: combat.target.con,
                  }}
                />
              </div>
            </div>
          )}
          <ul className="field-log">
            {(combat.log || [combat.line]).filter(Boolean).map((row, i) => (
              <li key={`${i}-${row}`}>{row}</li>
            ))}
          </ul>
          {hud.zoneName ? <p className="field-where">{hud.zoneName}</p> : null}
          <button type="button" className="field-retire" onClick={bench}>
            Characters
          </button>
        </div>
      )}
      <aside className="walk-minimap">
        <header>
          <span>{hud.zoneName || "Where you are"}</span>
          <span className="compass-n">N</span>
        </header>
        <canvas
          ref={miniRef}
          style={{
            width: `min(100%, calc(34vh * ${miniAspect}))`,
            aspectRatio: String(miniAspect),
            maxHeight: "34vh",
          }}
          onPointerUp={onMini}
        />
        <p className="walk-go">{hud.travel || "Click the map to run"}</p>
        <p className="walk-keys">Click a creature to pull · Space · Tab · WASD</p>
      </aside>
      {!hero && <CharacterCreate roster={roster} onPlay={play} onConjure={conjure} onRelease={release} />}
      <div ref={tipRef} className={`map-hover-card${hover ? " show" : ""}`}>
        {hover && (
          <>
            <strong>{hover.name}</strong>
            <div className="poi-kind">
              {hover.kind}
              {hover.zone ? ` · ${hover.zone}` : ""}
            </div>
            {hover.notes ? <p>{hover.notes}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
