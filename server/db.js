const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { seedPois } = require("./poi-seed");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = process.env.MMFINDER_DB
  ? path.resolve(process.env.MMFINDER_DB)
  : path.join(DATA_DIR, "mmfinder.sqlite");
const WASM_DIR = path.join(__dirname, "..", "node_modules", "sql.js", "dist");

let db;

function id() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function save() {
  if (!db) return;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function exec(sql) {
  db.run(sql);
}

function run(sql, params = []) {
  db.run(sql, params);
  save();
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

function migrate() {
  exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      body TEXT,
      target_type TEXT,
      target_id TEXT,
      x REAL,
      y REAL,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS pois (
      id TEXT PRIMARY KEY,
      zone_id TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      mx REAL,
      my REAL,
      lng REAL,
      lat REAL,
      solo_min INTEGER,
      solo_max INTEGER,
      group_min INTEGER,
      group_max INTEGER,
      monsters TEXT,
      notes TEXT,
      source TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS custom_maps (
      zone_id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT,
      slot TEXT,
      wiki TEXT,
      notes TEXT,
      source TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS item_sources (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      method TEXT NOT NULL,
      label TEXT,
      quest_id TEXT,
      poi_id TEXT,
      zone_id TEXT,
      npc TEXT,
      notes TEXT,
      source TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);
  const level = get("SELECT value FROM settings WHERE key = 'characterLevel'");
  if (!level) run("INSERT INTO settings (key, value) VALUES ('characterLevel', '1')");
  if (!get("SELECT value FROM settings WHERE key = 'characterClass'")) {
    run("INSERT INTO settings (key, value) VALUES ('characterClass', '')");
  }
  if (!get("SELECT value FROM settings WHERE key = 'completedSteps'")) {
    run("INSERT INTO settings (key, value) VALUES ('completedSteps', '[]')");
  }

  const existing = Object.fromEntries(all("SELECT id, source FROM pois").map((r) => [r.id, r.source]));
  const seedIds = new Set(seedPois.map((p) => p.id));
  for (const [id, source] of Object.entries(existing)) {
    if (source === "seed" && !seedIds.has(id)) run("DELETE FROM pois WHERE id = ? AND source = 'seed'", [id]);
  }

  const ts = now();
  for (const poi of seedPois) {
    const vals = [
      poi.zoneId,
      poi.name,
      poi.kind,
      poi.mx ?? null,
      poi.my ?? null,
      poi.soloMin ?? null,
      poi.soloMax ?? null,
      poi.groupMin ?? null,
      poi.groupMax ?? null,
      poi.monsters || "",
      poi.notes || "",
      ts,
      poi.id,
    ];
    if (existing[poi.id] === "seed") {
      run(
        `UPDATE pois SET zone_id=?, name=?, kind=?, mx=?, my=?, lng=NULL, lat=NULL,
         solo_min=?, solo_max=?, group_min=?, group_max=?, monsters=?, notes=?, updated_at=?
         WHERE id=? AND source='seed'`,
        vals
      );
    } else if (!existing[poi.id]) {
      run(
        `INSERT INTO pois (id, zone_id, name, kind, mx, my, lng, lat, solo_min, solo_max, group_min, group_max, monsters, notes, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', ?, ?)`,
        [
          poi.id,
          poi.zoneId,
          poi.name,
          poi.kind,
          poi.mx ?? null,
          poi.my ?? null,
          null,
          null,
          poi.soloMin ?? null,
          poi.soloMax ?? null,
          poi.groupMin ?? null,
          poi.groupMax ?? null,
          poi.monsters || "",
          poi.notes || "",
          ts,
          ts,
        ]
      );
    }
  }
}

const ready = (async () => {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(WASM_DIR, file),
  });
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (fs.existsSync(DB_PATH)) db = new SQL.Database(fs.readFileSync(DB_PATH));
  else db = new SQL.Database();
  migrate();
  save();
  return true;
})();

function rowPoi(r) {
  return {
    id: r.id,
    zoneId: r.zone_id,
    name: r.name,
    kind: r.kind,
    mx: r.mx,
    my: r.my,
    lng: r.lng,
    lat: r.lat,
    soloMin: r.solo_min,
    soloMax: r.solo_max,
    groupMin: r.group_min,
    groupMax: r.group_max,
    monsters: r.monsters,
    notes: r.notes,
    source: r.source,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    custom: r.source === "user",
  };
}

function upsertSetting(key, value) {
  run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, String(value)]
  );
}

function readSettings() {
  const rows = all("SELECT key, value FROM settings");
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  let completed = [];
  try {
    completed = JSON.parse(map.completedSteps || "[]");
  } catch {
    completed = [];
  }
  return {
    characterLevel: Number(map.characterLevel || 1),
    characterClass: map.characterClass || "",
    completedSteps: Array.isArray(completed) ? completed : [],
  };
}

function rowNote(r) {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    targetType: r.target_type,
    targetId: r.target_id,
    x: r.x,
    y: r.y,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

module.exports = {
  ready,
  id,
  now,
  all,
  get,
  run,
  save,
  rowPoi,
  rowNote,
  upsertSetting,
  readSettings,
};
