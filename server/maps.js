/**
 * Wiki map catalog. Files live in client/public/maps/
 * Source: https://monstersandmemories.miraheze.org
 *
 * Overlay math is done in continent pixels. Percent boxes on the parchment
 * are converted first — fitting in mixed % units stretches maps because
 * 1% width ≠ 1% height on a non-square atlas.
 */
const WIKI = "https://monstersandmemories.miraheze.org/wiki/File:";
const THUMB = "https://monstersandmemories.miraheze.org/w/thumb.php";
const STATIC = "https://static.wikitide.net/monstersandmemorieswiki";

const worldMaps = [
  {
    id: "discovered",
    name: "Discovered Lands",
    subtitle: "Calafrey & Szuur — wiki Zone Connection Map",
    file: "calafrey-szuur.png",
    wikiFile: "Calafrey-szurr-combined.png",
    wikiPage: "Zone_Connection_Map",
    fetch: { kind: "static", path: "/3/36/Calafrey-szurr-combined.png" },
  },
  {
    id: "aethoril",
    name: "Aêthoril",
    subtitle: "Full continent map from the wiki",
    file: "aethoril.png",
    wikiFile: "AêthorilMap.png",
    fetch: { kind: "static", path: "/e/ec/A%C3%AAthorilMap.png" },
  },
  {
    id: "connections",
    name: "Zone connections",
    subtitle: "How zones link — wiki schematic",
    file: "zone-connections.png",
    wikiFile: "Zone Connection Map.png",
    wikiPage: "Zone_Connection_Map",
    fetch: { kind: "static", path: "/b/bc/Zone_Connection_Map.png" },
  },
];

/** Percent positions on Calafrey-szurr-combined.png (parchment atlas). */
const discoveredHotspots = [
  { id: "faelindral", x: 42, y: 16 },
  { id: "evershade-weald", x: 44, y: 16 },
  { id: "blacktide-bay", x: 56, y: 16 },
  { id: "scarwood", x: 64, y: 25 },
  { id: "keepers-bight", x: 42, y: 32 },
  { id: "shallow-shoals", x: 16, y: 42 },
  { id: "vale-of-zintar", x: 38, y: 46 },
  { id: "glass-flats", x: 62, y: 40 },
  { id: "sungreet-strand", x: 76, y: 56 },
  { id: "tel-ekir", x: 52, y: 54 },
  { id: "fallen-pass", x: 30, y: 56 },
  { id: "shaded-dunes", x: 62, y: 81 },
  { id: "night-harbor", x: 70, y: 76 },
  { id: "tomb-wyrmsbane", x: 58, y: 84 },
];

const connectionHotspots = [
  { id: "faelindral", x: 32, y: 6 },
  { id: "evershade-weald", x: 32, y: 13 },
  { id: "keepers-bight", x: 32, y: 22 },
  { id: "scarwood", x: 46, y: 22 },
  { id: "shallow-shoals", x: 22, y: 36 },
  { id: "vale-of-zintar", x: 34, y: 36 },
  { id: "glass-flats", x: 46, y: 36 },
  { id: "sungreet-strand", x: 64, y: 38 },
  { id: "tel-ekir", x: 32, y: 52 },
  { id: "caves-of-irem", x: 45, y: 52 },
  { id: "ancient-crypt", x: 55, y: 52 },
  { id: "tomb-wyrmsbane", x: 66, y: 52 },
  { id: "fallen-pass", x: 26, y: 70 },
  { id: "shaded-dunes", x: 45, y: 70 },
  { id: "night-harbor", x: 66, y: 70 },
  { id: "fallen-watch", x: 26, y: 84 },
  { id: "infested-crypt", x: 40, y: 84 },
  { id: "underdocks", x: 52, y: 84 },
  { id: "night-harbor-sewers", x: 64, y: 84 },
  { id: "ail-vorith", x: 82, y: 18 },
  { id: "great-cavern-sea", x: 93, y: 18 },
  { id: "rothold", x: 88, y: 36 },
];

const aethorilHotspots = [
  { id: "evershade-weald", x: 33, y: 48, label: "Calafrey" },
  { id: "shaded-dunes", x: 35, y: 72, label: "Szuur / Dunes" },
  { id: "night-harbor", x: 39, y: 78, label: "Night Harbor" },
  { id: "shallow-shoals", x: 24, y: 62, label: "Shallow Shoals" },
];

const MAP_VER = "20260928webp";
/** Long edge sent to the wiki thumb service, then re-encoded as WebP for Pages. */
const ART_LONG = 2048;

/** Served filename. Wiki art and local maps are stored as WebP. */
function assetName(file) {
  if (!file) return file;
  return file.replace(/\.(png|jpe?g)$/i, ".webp");
}
const { zones } = require("./world");
const { seedPois } = require("./poi-seed");

const zoneMaps = {
  "night-harbor": {
    file: "night-harbor.jpg",
    wikiFile: "Night harbor V5.jpg",
    width: 2800,
    aspect: 2800 / 2380,
    fit: "contain",
    inset: { l: 0.035, t: 0.11, r: 0.04, b: 0.19 },
  },
  "shaded-dunes": {
    file: "shaded-dunes.jpg",
    wikiFile: "Shaded Dunes Map.jpg",
    width: 2800,
    aspect: 2800 / 1715,
    fit: "contain",
    inset: { l: 0.03, t: 0.13, r: 0.03, b: 0.08 },
  },
  "sungreet-strand": {
    file: "sungreet-strand.jpg",
    wikiFile: "Sungreet Strand v4.jpg",
    width: 2800,
    aspect: 2800 / 1808,
    fit: "contain",
    inset: { l: 0.03, t: 0.11, r: 0.03, b: 0.06 },
  },
  "fallen-pass": {
    file: "fallen-pass.jpg",
    wikiFile: "Fallen pass v1.jpg",
    width: 2800,
    aspect: 2800 / 2696,
    fit: "contain",
    inset: { l: 0.04, t: 0.06, r: 0.04, b: 0.16 },
  },
  "glass-flats": {
    file: "glass-flats.jpg",
    wikiFile: "Glass Flats Map.png",
    width: 2400,
    aspect: 2400 / 1440,
    fit: "contain",
    inset: { l: 0.03, t: 0.08, r: 0.02, b: 0.05 },
  },
  "vale-of-zintar": {
    file: "vale-of-zintar.png",
    wikiFile: "Vale of Zintar Map.png",
    width: 3680,
    aspect: 3680 / 4762,
    fit: "contain",
    inset: { l: 0.05, t: 0.04, r: 0.04, b: 0.08 },
  },
  "shallow-shoals": {
    file: "shallow-shoals.png",
    wikiFile: "BadShallowShoalMap.png",
    width: 1100,
    aspect: 1100 / 1268,
    fit: "contain",
    inset: { l: 0.04, t: 0.04, r: 0.04, b: 0.04 },
  },
  "evershade-weald": {
    file: "evershade-weald.jpg",
    wikiFile: "Evershade Weald june 26.jpg",
    width: 2200,
    aspect: 2200 / 1470,
    fit: "contain",
    inset: { l: 0.02, t: 0.07, r: 0.02, b: 0.06 },
  },
  scarwood: {
    file: "scarwood.jpg",
    wikiFile: "Scarwood.png",
    width: 2200,
    aspect: 2200 / 1361,
    fit: "contain",
    inset: { l: 0.03, t: 0.07, r: 0.03, b: 0.03 },
  },
  "tel-ekir": {
    file: "tel-ekir.jpg",
    wikiFile: "Tel-ekir-isometric.jpg",
    width: 1800,
    aspect: 1800 / 1350,
    fit: "contain",
  },
  "tomb-wyrmsbane": {
    file: "tomb-wyrmsbane.png",
    wikiFile: "WyrmsbaneCombined v0.91.png",
    width: 2000,
    aspect: 2000 / 1239,
    fit: "contain",
    inset: { l: 0.02, t: 0.12, r: 0.02, b: 0.08 },
  },
  "ancient-crypt": {
    file: "ancient-crypt.jpg",
    wikiFile: "Ancient Crypt Map.png",
    width: 3200,
    aspect: 8400 / 9300,
    fit: "contain",
  },
  underdocks: {
    file: "underdocks.png",
    wikiFile: "Underdocks map.png",
    width: 900,
    aspect: 900 / 1125,
    fit: "contain",
  },
  "grimtide-sanctum": {
    file: "grimtide.png",
    wikiFile: "MAP GrimtideSanctum.png",
    width: 1500,
    aspect: 1500 / 922,
    fit: "contain",
  },
  "caves-of-irem": {
    file: "caves-of-irem.png",
    wikiFile: "Caves of Irem By Naawa.png",
    width: 1600,
    aspect: 1600 / 1251,
    fit: "contain",
  },
  faelindral: {
    file: "faelindral.jpg",
    wikiFile: "Faelindral V2.jpg",
    width: 2200,
    aspect: 2200 / 2155,
    fit: "contain",
    inset: { l: 0.26, t: 0.10, r: 0.03, b: 0.20 },
  },
  "infested-crypt": {
    file: "infested-crypt.png",
    wikiFile: "Infested Crypt Map.png",
    width: 3900,
    aspect: 3900 / 3600,
    fit: "contain",
  },
  "grain-cellar": {
    file: "grain-cellar.jpg",
    wikiFile: "Grain Cellar Isometric.jpg",
    width: 1800,
    aspect: 1800 / 1350,
    fit: "contain",
  },
  "blacktide-bay": {
    file: "blacktide-bay.jpg",
    wikiFile: "Blacktide Bay.jpg",
    width: 1800,
    aspect: 1800 / 2400,
    fit: "contain",
    inset: { l: 0.03, t: 0.08, r: 0.03, b: 0.04 },
  },
  "keepers-bight": {
    file: "keepers-bight.jpg",
    wikiFile: "Keepersbighteg.png",
    width: 1800,
    aspect: 1800 / 2385,
    fit: "contain",
    inset: { l: 0.03, t: 0.05, r: 0.03, b: 0.03 },
  },
  "fallen-watch": {
    file: "fallen-watch.png",
    wikiFile: "Fallen Watch.png",
    width: 2000,
    aspect: 2000 / 1247,
    fit: "contain",
  },
  "ail-vorith": {
    file: "ail-vorith.png",
    width: 2000,
    aspect: 2000 / 1592,
    fit: "contain",
  },
};

function wikiFileUrl(name) {
  return WIKI + encodeURIComponent(name);
}

function thumbUrl(wikiFile, width) {
  return `${THUMB}?f=${encodeURIComponent(wikiFile.replace(/ /g, "_"))}&width=${width}`;
}

function downloads() {
  const jobs = [];
  for (const m of worldMaps) {
    jobs.push({
      file: assetName(m.file),
      url: thumbUrl(m.wikiFile, ART_LONG),
    });
  }
  for (const z of Object.values(zoneMaps)) {
    if (!z.wikiFile) continue;
    jobs.push({ file: assetName(z.file), url: thumbUrl(z.wikiFile, ART_LONG) });
  }
  return jobs;
}

function hotspotFor(worldMapId) {
  if (worldMapId === "connections") return connectionHotspots;
  if (worldMapId === "aethoril") return aethorilHotspots;
  return discoveredHotspots;
}

/** Aêthoril image pixels. Leaflet CRS.Simple uses [[south, west], [north, east]]. */
let WORLD = { w: 2400, h: 1600 };

/** Outdoor maps stay on the stitch; nested dungeons hang off zoneline gates. */
const ZONE_ROLE = {
  "shallow-shoals": "outdoor",
  "evershade-weald": "outdoor",
  faelindral: "outdoor",
  "blacktide-bay": "nested",
  "glinting-hollow": "nested",
  scarwood: "outdoor",
  "sunken-resort": "nested",
  "keepers-bight": "outdoor",
  "vale-of-zintar": "outdoor",
  "glass-flats": "outdoor",
  "fallen-pass": "outdoor",
  "fallen-watch": "nested",
  "shaded-dunes": "outdoor",
  "sungreet-strand": "outdoor",
  "tel-ekir": "outdoor",
  "night-harbor": "outdoor",
  "tomb-wyrmsbane": "nested",
  "ancient-crypt": "nested",
  "infested-crypt": "nested",
  "grain-cellar": "nested",
  "grimtide-sanctum": "nested",
  "night-harbor-sewers": "nested",
  underdocks: "outdoor",
  "caves-of-irem": "outdoor",
  "great-cavern-sea": "outdoor",
  rothold: "nested",
  "ail-vorith": "outdoor",
  "blind-midden": "nested",
};

const GATE_ALIASES = {
  "wyrmsbane tomb": "tomb-wyrmsbane",
  "tomb of the last wyrmsbane": "tomb-wyrmsbane",
  wyrmsbane: "tomb-wyrmsbane",
  "keepers bight": "keepers-bight",
  "keeper's bight": "keepers-bight",
  "to city": "faelindral",
  "fields of the lost": null,
  sewers: "night-harbor-sewers",
  "grain cellar wall": "grain-cellar",
  "grain cellar": "grain-cellar",
  "sunken resort": "sunken-resort",
  "fallen watch fort": "fallen-watch",
  "into fallen watch": "fallen-watch",
  "blacktide bay dungeon": "blacktide-bay",
  "great cavern sea": "great-cavern-sea",
  "glinting hollow": "glinting-hollow",
  "caves of irem": "caves-of-irem",
  "ancient crypt": "ancient-crypt",
  "infested crypt": "infested-crypt",
  "vale of zintar": "vale-of-zintar",
  "glass flats": "glass-flats",
  "sungreet strand": "sungreet-strand",
  "night harbor": "night-harbor",
  "shaded dunes": "shaded-dunes",
  "fallen pass": "fallen-pass",
  "evershade weald": "evershade-weald",
  "shallow shoals": "shallow-shoals",
  "tel ekir": "tel-ekir",
  faelindral: "faelindral",
};

function gateNameIndex() {
  const idx = { ...GATE_ALIASES };
  for (const z of zones) {
    idx[z.name.toLowerCase()] = z.id;
    idx[z.id.replace(/-/g, " ")] = z.id;
  }
  return idx;
}

function targetZoneId(poi, fromId, nameIdx) {
  const n = String(poi.name || "")
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!n) return null;
  let rest = n
    .replace(/^zoneline:\s*/, "")
    .replace(/^(to|into|lift to|elevator to|teleporter to)\s+/, "")
    .replace(/\s*\(.*\)$/, "")
    .trim();
  if (Object.prototype.hasOwnProperty.call(nameIdx, rest) && nameIdx[rest] && nameIdx[rest] !== fromId) {
    return nameIdx[rest];
  }
  for (const z of zones) {
    if (z.id === fromId) continue;
    const nm = z.name.toLowerCase();
    if (nm.length > 4 && (rest.includes(nm) || n.includes(nm))) return z.id;
  }
  return null;
}

function looksLikeGate(poi) {
  if (poi.mx == null || poi.my == null) return false;
  if (poi.kind === "zoneline" || poi.kind === "dungeon") return true;
  return /^(to |into |lift to |elevator to |zoneline:)/i.test(poi.name || "");
}

function findGate(poisByZone, fromId, toId, nameIdx) {
  const list = poisByZone.get(fromId) || [];
  return list.find((p) => looksLikeGate(p) && targetZoneId(p, fromId, nameIdx) === toId) || null;
}

function oppositeGate(mx, my) {
  if (mx <= 18) return { mx: 92, my };
  if (mx >= 82) return { mx: 8, my };
  if (my <= 18) return { mx, my: 92 };
  if (my >= 82) return { mx, my: 8 };
  return { mx: 100 - mx, my: 100 - my };
}

function tileSize(meta, role) {
  const aspect = meta?.aspect || 1.2;
  const long = role === "nested" ? 260 : 440;
  if (aspect >= 1) return { w: long, h: long / aspect };
  return { w: long * aspect, h: long };
}

function insetOf(id) {
  return zoneMaps[id]?.inset || { l: 0, t: 0, r: 0, b: 0 };
}

function artInner(box, inset) {
  const i = inset || { l: 0, t: 0, r: 0, b: 0 };
  const aw = 1 - i.l - i.r;
  const ah = 1 - i.t - i.b;
  if (aw <= 0 || ah <= 0) return box;
  return {
    x: box.x + i.l * box.w,
    y: box.y + i.t * box.h,
    w: box.w * aw,
    h: box.h * ah,
  };
}

function artBox(id, overlay) {
  return artInner(overlay, insetOf(id));
}

const STITCH_GAP = 0;

function pct(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function poiAt(box, mx, my) {
  return {
    x: box.x + (pct(mx, 50) / 100) * box.w,
    y: box.y + (pct(my, 50) / 100) * box.h,
  };
}

function edgeDist(mx, my) {
  const x = pct(mx, 50);
  const y = pct(my, 50);
  return { w: x, e: 100 - x, n: y, s: 100 - y };
}

/** East-west vs north-south from which edges the two zonelines sit on. */
function connectionAxis(gateA, gateB) {
  const a = edgeDist(gateA.mx, gateA.my);
  const b = edgeDist(gateB.mx, gateB.my);
  const ew = Math.min(a.w, a.e) + Math.min(b.w, b.e);
  const ns = Math.min(a.n, a.s) + Math.min(b.n, b.s);
  return ew <= ns ? "ew" : "ns";
}

/**
 * ART boxes share an edge. Zoneline pins share Y (east-west) or X (north-south).
 * Pins stay on opposite sides of the seam so the maps do not stack.
 */
function placeEdgeToEdge(host, gateA, sizeB, gateB, hostId, newId) {
  const artA = artBox(hostId, host);
  const iB = insetOf(newId);
  const pA = poiAt(host, gateA.mx, gateA.my);
  const box = { w: sizeB.w, h: sizeB.h, x: 0, y: 0 };
  const axis = connectionAxis(gateA, gateB);
  if (axis === "ew") {
    if (pct(gateA.mx, 50) <= 50) box.x = artA.x - (1 - iB.r) * sizeB.w;
    else box.x = artA.x + artA.w - iB.l * sizeB.w;
    box.y = pA.y - (pct(gateB.my, 50) / 100) * sizeB.h;
  } else {
    if (pct(gateA.my, 50) <= 50) box.y = artA.y - (1 - iB.b) * sizeB.h;
    else box.y = artA.y + artA.h - iB.t * sizeB.h;
    box.x = pA.x - (pct(gateB.mx, 50) / 100) * sizeB.w;
  }
  return box;
}

function overlapXY(a, b) {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return { ox, oy };
}

function padded(box, gap) {
  const g = gap / 2;
  return { x: box.x - g, y: box.y - g, w: box.w + gap, h: box.h + gap };
}

function overlapArea(a, b) {
  const { ox, oy } = overlapXY(a, b);
  if (ox <= 0 || oy <= 0) return 0;
  return ox * oy;
}

function pushOut(moverId, mover, otherId, other, gap) {
  const { ox, oy } = overlapXY(padded(artBox(moverId, mover), gap), padded(artBox(otherId, other), gap));
  if (ox <= 0 || oy <= 0) return false;
  const mcx = mover.x + mover.w / 2;
  const ocx = other.x + other.w / 2;
  const mcy = mover.y + mover.h / 2;
  const ocy = other.y + other.h / 2;
  if (ox <= oy) mover.x += (mcx >= ocx ? 1 : -1) * ox;
  else mover.y += (mcy >= ocy ? 1 : -1) * oy;
  return true;
}

function clearAgainst(id, box, placed, gap = STITCH_GAP) {
  for (let i = 0; i < 40; i++) {
    let hit = false;
    for (const [oid, other] of Object.entries(placed)) {
      if (other === box) continue;
      if (pushOut(id, box, oid, other, gap)) hit = true;
    }
    if (!hit) break;
  }
  return box;
}

function separateAll(placed, frozenId = "night-harbor", gap = STITCH_GAP) {
  const ids = Object.keys(placed);
  for (let n = 0; n < 60; n++) {
    let moved = false;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = placed[ids[i]];
        const b = placed[ids[j]];
        const { ox, oy } = overlapXY(padded(artBox(ids[i], a), gap), padded(artBox(ids[j], b), gap));
        if (ox <= 0 || oy <= 0) continue;
        const freezeA = ids[i] === frozenId;
        const freezeB = ids[j] === frozenId;
        const share = freezeA || freezeB ? 1 : 0.5;
        if (ox <= oy) {
          const dir = a.x + a.w / 2 < b.x + b.w / 2 ? -1 : 1;
          if (!freezeA) {
            a.x += dir * ox * share;
            moved = true;
          }
          if (!freezeB) {
            b.x -= dir * ox * share;
            moved = true;
          }
        } else {
          const dir = a.y + a.h / 2 < b.y + b.h / 2 ? -1 : 1;
          if (!freezeA) {
            a.y += dir * oy * share;
            moved = true;
          }
          if (!freezeB) {
            b.y -= dir * oy * share;
            moved = true;
          }
        }
      }
    }
    if (!moved) break;
  }
}

function zoneLayer(id) {
  return zones.find((z) => z.id === id)?.layer || "surface";
}

function escapeXml(value) {
  return String(value || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[ch]));
}

/** Plate for a deep zone the wiki has not mapped yet. */
function placeholderSrc(zone) {
  const name = escapeXml(zone?.name || "Unknown zone");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="640" viewBox="0 0 880 640">
    <rect width="880" height="640" fill="#1b1422"/>
    <rect x="16" y="16" width="848" height="608" fill="none" stroke="#c4a0d4" stroke-width="3" stroke-dasharray="12 8"/>
    <text x="440" y="286" text-anchor="middle" fill="#e6d0f2" font-family="Georgia, serif" font-size="40">${name}</text>
    <text x="440" y="334" text-anchor="middle" fill="#c4a0d4" font-family="Georgia, serif" font-size="20">The Deep</text>
    <text x="440" y="386" text-anchor="middle" fill="#c4a882" font-family="Georgia, serif" font-size="16">No wiki map for this zone yet</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function layoutStitch(pois, layer, seedId) {
  const inLayer = (id) => zoneLayer(id) === layer;
  const nameIdx = gateNameIndex();
  const poisByZone = new Map();
  for (const p of pois || []) {
    if (!poisByZone.has(p.zoneId)) poisByZone.set(p.zoneId, []);
    poisByZone.get(p.zoneId).push(p);
  }

  const sizes = {};
  for (const [id, role] of Object.entries(ZONE_ROLE)) {
    if (!inLayer(id)) continue;
    sizes[id] = tileSize(zoneMaps[id], role);
  }

  const edges = [];
  const seen = new Set();
  const addEdge = (a, b) => {
    if (!a || !b || a === b || !sizes[a] || !sizes[b]) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push([a, b]);
  };
  for (const p of pois || []) {
    const to = looksLikeGate(p) ? targetZoneId(p, p.zoneId, nameIdx) : null;
    if (to) addEdge(p.zoneId, to);
  }
  for (const z of zones) {
    for (const adj of z.adjacent || []) addEdge(z.id, adj);
  }

  const placed = {};
  const queue = [];
  const seed = (id, box) => {
    if (!id || placed[id] || !sizes[id]) return;
    placed[id] = { ...box };
    queue.push(id);
  };
  const seedBox = sizes[seedId] ? seedId : Object.keys(sizes).find((id) => ZONE_ROLE[id] !== "nested");
  seed(seedBox, seedBox ? { ...sizes[seedBox], x: 0, y: 0 } : null);

  while (queue.length) {
    const a = queue.shift();
    const next = [];
    for (const [u, v] of edges) {
      const b = u === a ? v : v === a ? u : null;
      if (!b || placed[b]) continue;
      next.push(b);
    }
    next.sort((p, q) => Number(ZONE_ROLE[p] === "nested") - Number(ZONE_ROLE[q] === "nested"));
    for (const b of next) {
      const gateA = findGate(poisByZone, a, b, nameIdx);
      const gateB = findGate(poisByZone, b, a, nameIdx);
      if (!gateA && !gateB) continue;
      const ga = gateA || oppositeGate(pct(gateB.mx, 50), pct(gateB.my, 50));
      const gb = gateB || oppositeGate(pct(ga.mx, 50), pct(ga.my, 50));
      placed[b] = placeEdgeToEdge(placed[a], ga, sizes[b], gb, a, b);
      queue.push(b);
    }
  }

  let pending = true;
  while (pending) {
    pending = false;
    for (const id of Object.keys(sizes)) {
      if (placed[id]) continue;
      const z = zones.find((x) => x.id === id);
      const host = (z?.adjacent || []).find((adj) => placed[adj]);
      if (!host) continue;
      const gateA = findGate(poisByZone, host, id, nameIdx);
      const gateB = findGate(poisByZone, id, host, nameIdx);
      let box;
      if (gateA || gateB) {
        const ga = gateA || oppositeGate(pct(gateB.mx, 50), pct(gateB.my, 50));
        const gb = gateB || oppositeGate(pct(ga.mx, 50), pct(ga.my, 50));
        box = placeEdgeToEdge(placed[host], ga, sizes[id], gb, host, id);
      } else {
        box = {
          ...sizes[id],
          x: artBox(host, placed[host]).x + artBox(host, placed[host]).w + STITCH_GAP - insetOf(id).l * sizes[id].w,
          y: placed[host].y,
        };
      }
      clearAgainst(id, box, placed);
      placed[id] = box;
      pending = true;
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of Object.values(placed)) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  const pad = 90;
  if (!Number.isFinite(minX)) {
    return { WORLD: { w: 0, h: 0 }, placed: {} };
  }
  for (const b of Object.values(placed)) {
    b.x -= minX - pad;
    b.y -= minY - pad;
  }
  return { WORLD: { w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }, placed };
}

/** Surface and The Deep are separate atlases, parked side by side. */
function stitchBoxes(pois) {
  const surface = layoutStitch(pois, "surface", "night-harbor");
  const deep = layoutStitch(pois, "deep", "underdocks");
  const hasDeep = Object.keys(deep.placed).length > 0;
  const gap = hasDeep ? 280 : 0;
  const shift = surface.WORLD.w + gap;
  for (const box of Object.values(deep.placed)) box.x += shift;
  return {
    WORLD: {
      w: shift + (hasDeep ? deep.WORLD.w : 0),
      h: Math.max(surface.WORLD.h, hasDeep ? deep.WORLD.h : 0),
    },
    placed: { ...surface.placed, ...deep.placed },
  };
}

function contain(box, aspect) {
  if (!aspect) return box;
  const ba = box.w / box.h;
  if (aspect > ba) {
    const height = box.w / aspect;
    return { x: box.x, y: box.y + (box.h - height) / 2, w: box.w, h: height };
  }
  const width = box.h * aspect;
  return { x: box.x + (box.w - width) / 2, y: box.y, w: width, h: box.h };
}

function cover(box, aspect, anchor = "c") {
  if (!aspect) return box;
  const ba = box.w / box.h;
  if (aspect > ba) {
    const width = box.h * aspect;
    let x = box.x + (box.w - width) / 2;
    if (anchor.includes("e")) x = box.x + box.w - width;
    else if (anchor.includes("w")) x = box.x;
    return { x, y: box.y, w: width, h: box.h };
  }
  const height = box.w / aspect;
  let y = box.y + (box.h - height) / 2;
  if (anchor.includes("s")) y = box.y + box.h - height;
  else if (anchor.includes("n")) y = box.y;
  return { x: box.x, y, w: box.w, h: height };
}

function artClip(meta) {
  const i = meta?.inset;
  if (!i) return null;
  const pad = (n) => Math.max(0, +(n * 100).toFixed(2));
  const c = { t: pad(i.t), r: pad(i.r), b: pad(i.b), l: pad(i.l) };
  if (c.t + c.r + c.b + c.l < 0.4) return null;
  return c;
}

function imageBounds(rect) {
  const west = rect.x;
  const east = rect.x + rect.w;
  const north = WORLD.h - rect.y;
  const south = WORLD.h - (rect.y + rect.h);
  return [
    [south, west],
    [north, east],
  ];
}

function overlayAspect(bounds) {
  const south = bounds[0][0];
  const west = bounds[0][1];
  const north = bounds[1][0];
  const east = bounds[1][1];
  return (east - west) / (north - south);
}

function buildAtlas(customMaps = {}, pois = seedPois) {
  const stitched = stitchBoxes(pois);
  WORLD = stitched.WORLD;
  const overlays = Object.entries(stitched.placed)
    .map(([id, box]) => {
      const meta = zoneMaps[id];
      const custom = customMaps[id];
      const role = ZONE_ROLE[id] || "nested";
      const layer = zoneLayer(id);
      let src = null;
      let placeholder = false;
      if (custom?.filename) {
        src = `/maps/custom/${custom.filename}?v=${encodeURIComponent(custom.updated_at || "")}`;
      } else if (meta) {
        src = `/maps/${assetName(meta.file)}?v=${MAP_VER}`;
      } else if (layer === "deep") {
        src = placeholderSrc(zones.find((z) => z.id === id));
        placeholder = true;
      }
      if (!src) return null;
      const art = artInner(box, custom || placeholder ? null : meta?.inset);
      return {
        id,
        src,
        layer,
        placeholder,
        bounds: imageBounds(box),
        geoBounds: imageBounds(art),
        role,
        clip: null,
        artClip: custom || placeholder ? null : artClip(meta),
        inset: placeholder ? null : meta?.inset || null,
        minZoom: role === "nested" ? 0.4 : -2,
        center: [WORLD.h - (art.y + art.h / 2), art.x + art.w / 2],
      };
    })
    .filter(Boolean);

  const worldBounds = [
    [0, 0],
    [WORLD.h, WORLD.w],
  ];

  return {
    world: WORLD,
    stitch: true,
    continent: {
      src: null,
      bounds: worldBounds,
      land: worldBounds,
    },
    discovered: {
      src: null,
      bounds: worldBounds,
    },
    overlays,
  };
}

module.exports = {
  WIKI,
  worldMaps,
  zoneMaps,
  discoveredHotspots,
  connectionHotspots,
  aethorilHotspots,
  hotspotFor,
  wikiFileUrl,
  thumbUrl,
  downloads,
  buildAtlas,
  overlayAspect,
  assetName,
  MAP_VER,
  ART_LONG,
};
