const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { zones } = require("./world");
const db = require("./db");
const quests = require("./quests");
const items = require("./items");
const { buildWorld } = require("./payload");

const app = express();
const PORT = process.env.PORT || 3001;
const CUSTOM_DIR = path.join(__dirname, "..", "client", "public", "maps", "custom");
const DATA_MAPS = path.join(__dirname, "..", "data", "maps");

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/maps/custom", express.static(CUSTOM_DIR));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(jpeg|png|webp|gif)/.test(file.mimetype);
    cb(ok ? null : new Error("Drop a jpg or png map."), ok);
  },
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/world", (_req, res) => {
  res.json(buildWorld());
});

app.put("/api/settings", (req, res) => {
  const level = Number(req.body.characterLevel);
  if (Number.isFinite(level)) {
    db.upsertSetting("characterLevel", String(Math.min(60, Math.max(1, Math.round(level)))));
  }
  if (req.body.characterClass !== undefined) {
    const id = String(req.body.characterClass || "");
    const ok = !id || quests.CLASSES.some((c) => c.id === id);
    if (ok) db.upsertSetting("characterClass", id);
  }
  if (Array.isArray(req.body.completedSteps)) {
    const steps = req.body.completedSteps.map(String).slice(0, 2000);
    db.upsertSetting("completedSteps", JSON.stringify(steps));
  }
  res.json(db.readSettings());
});

app.get("/api/pois", (req, res) => {
  const { zoneId, kind } = req.query;
  let sql = "SELECT * FROM pois WHERE 1=1";
  const params = [];
  if (zoneId) {
    sql += " AND zone_id = ?";
    params.push(zoneId);
  }
  if (kind) {
    sql += " AND kind = ?";
    params.push(kind);
  }
  sql += " ORDER BY name";
  res.json(db.all(sql, params).map(db.rowPoi));
});

app.post("/api/pois", (req, res) => {
  const b = req.body || {};
  if (!b.zoneId || !zones.some((z) => z.id === b.zoneId)) {
    return res.status(400).json({ error: "Pick a zone." });
  }
  if (!b.name || !String(b.name).trim()) {
    return res.status(400).json({ error: "POI needs a name." });
  }
  const poi = {
    id: db.id(),
    zoneId: b.zoneId,
    name: String(b.name).trim().slice(0, 120),
    kind: String(b.kind || "custom").slice(0, 32),
    mx: numOrNull(b.mx),
    my: numOrNull(b.my),
    lng: numOrNull(b.lng),
    lat: numOrNull(b.lat),
    soloMin: numOrNull(b.soloMin),
    soloMax: numOrNull(b.soloMax),
    groupMin: numOrNull(b.groupMin),
    groupMax: numOrNull(b.groupMax),
    monsters: String(b.monsters || "").slice(0, 400),
    notes: String(b.notes || "").slice(0, 2000),
    source: "user",
    createdAt: db.now(),
    updatedAt: db.now(),
  };
  db.run(
    `INSERT INTO pois (id, zone_id, name, kind, mx, my, lng, lat, solo_min, solo_max, group_min, group_max, monsters, notes, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, ?)`,
    [
      poi.id,
      poi.zoneId,
      poi.name,
      poi.kind,
      poi.mx,
      poi.my,
      poi.lng,
      poi.lat,
      poi.soloMin,
      poi.soloMax,
      poi.groupMin,
      poi.groupMax,
      poi.monsters,
      poi.notes,
      poi.createdAt,
      poi.updatedAt,
    ]
  );
  res.status(201).json({ ...poi, custom: true });
});

app.put("/api/pois/:id", (req, res) => {
  const row = db.get("SELECT * FROM pois WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "POI not found." });
  const b = req.body || {};
  const next = {
    name: b.name !== undefined ? String(b.name).slice(0, 120) : row.name,
    kind: b.kind !== undefined ? String(b.kind).slice(0, 32) : row.kind,
    mx: b.mx !== undefined ? numOrNull(b.mx) : row.mx,
    my: b.my !== undefined ? numOrNull(b.my) : row.my,
    lng: b.lng !== undefined ? numOrNull(b.lng) : row.lng,
    lat: b.lat !== undefined ? numOrNull(b.lat) : row.lat,
    solo_min: b.soloMin !== undefined ? numOrNull(b.soloMin) : row.solo_min,
    solo_max: b.soloMax !== undefined ? numOrNull(b.soloMax) : row.solo_max,
    group_min: b.groupMin !== undefined ? numOrNull(b.groupMin) : row.group_min,
    group_max: b.groupMax !== undefined ? numOrNull(b.groupMax) : row.group_max,
    monsters: b.monsters !== undefined ? String(b.monsters).slice(0, 400) : row.monsters,
    notes: b.notes !== undefined ? String(b.notes).slice(0, 2000) : row.notes,
    updated_at: db.now(),
  };
  db.run(
    `UPDATE pois SET name=?, kind=?, mx=?, my=?, lng=?, lat=?, solo_min=?, solo_max=?, group_min=?, group_max=?, monsters=?, notes=?, updated_at=? WHERE id=?`,
    [
      next.name,
      next.kind,
      next.mx,
      next.my,
      next.lng,
      next.lat,
      next.solo_min,
      next.solo_max,
      next.group_min,
      next.group_max,
      next.monsters,
      next.notes,
      next.updated_at,
      req.params.id,
    ]
  );
  res.json(db.rowPoi(db.get("SELECT * FROM pois WHERE id = ?", [req.params.id])));
});

app.delete("/api/pois/:id", (req, res) => {
  const row = db.get("SELECT * FROM pois WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "POI not found." });
  db.run("DELETE FROM pois WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

app.get("/api/notes", (req, res) => {
  const { targetType, targetId } = req.query;
  let sql = "SELECT * FROM notes WHERE 1=1";
  const params = [];
  if (targetType) {
    sql += " AND target_type = ?";
    params.push(targetType);
  }
  if (targetId) {
    sql += " AND target_id = ?";
    params.push(targetId);
  }
  sql += " ORDER BY updated_at DESC";
  res.json(db.all(sql, params).map(db.rowNote));
});

app.post("/api/notes", (req, res) => {
  const { title, body, targetType, targetId, x, y } = req.body || {};
  if (!body && !title) return res.status(400).json({ error: "Write something first." });
  const allowed = ["zone", "camp", "pin", "journal", "poi"];
  const note = {
    id: db.id(),
    title: String(title || "").slice(0, 200),
    body: String(body || "").slice(0, 8000),
    targetType: allowed.includes(targetType) ? targetType : "journal",
    targetId: targetId ? String(targetId) : null,
    x: Number.isFinite(x) ? x : null,
    y: Number.isFinite(y) ? y : null,
    createdAt: db.now(),
    updatedAt: db.now(),
  };
  db.run(
    `INSERT INTO notes (id, title, body, target_type, target_id, x, y, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [note.id, note.title, note.body, note.targetType, note.targetId, note.x, note.y, note.createdAt, note.updatedAt]
  );
  res.status(201).json(note);
});

app.put("/api/notes/:id", (req, res) => {
  const row = db.get("SELECT * FROM notes WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Note not found." });
  const title = req.body.title !== undefined ? String(req.body.title).slice(0, 200) : row.title;
  const body = req.body.body !== undefined ? String(req.body.body).slice(0, 8000) : row.body;
  const updatedAt = db.now();
  db.run("UPDATE notes SET title=?, body=?, updated_at=? WHERE id=?", [title, body, updatedAt, req.params.id]);
  res.json(db.rowNote(db.get("SELECT * FROM notes WHERE id = ?", [req.params.id])));
});

app.delete("/api/notes/:id", (req, res) => {
  const row = db.get("SELECT * FROM notes WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Note not found." });
  db.run("DELETE FROM notes WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

app.get("/api/items", (req, res) => {
  const world = buildWorld();
  const catalog = world.items;
  const q = String(req.query.q || "").trim();
  if (q) return res.json(items.searchItems(catalog, q, Number(req.query.limit) || 40));
  res.json(catalog);
});

app.post("/api/items", (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim().slice(0, 160);
  if (!name) return res.status(400).json({ error: "Item needs a name." });
  const id = String(b.id || items.slugify(name)).slice(0, 120);
  if (!id) return res.status(400).json({ error: "Bad item id." });
  const existing = db.get("SELECT id FROM items WHERE id = ?", [id]);
  if (existing) return res.status(409).json({ error: "Item already exists — edit it instead." });
  const ts = db.now();
  db.run(
    `INSERT INTO items (id, name, kind, slot, wiki, notes, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'user', ?, ?)`,
    [
      id,
      name,
      String(b.kind || "item").slice(0, 32),
      String(b.slot || "").slice(0, 80),
      String(b.wiki || name.replace(/ /g, "_")).slice(0, 200),
      String(b.notes || "").slice(0, 2000),
      ts,
      ts,
    ]
  );
  const sources = Array.isArray(b.sources) ? b.sources : b.how ? [{ method: "unknown", label: b.how }] : [];
  for (const s of sources.slice(0, 20)) {
    db.run(
      `INSERT INTO item_sources (id, item_id, method, label, quest_id, poi_id, zone_id, npc, notes, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, ?)`,
      [
        db.id(),
        id,
        String(s.method || "unknown").slice(0, 32),
        String(s.label || "").slice(0, 400),
        s.questId ? String(s.questId) : null,
        s.poiId ? String(s.poiId) : null,
        s.zoneId ? String(s.zoneId) : null,
        String(s.npc || "").slice(0, 120),
        String(s.notes || "").slice(0, 800),
        ts,
        ts,
      ]
    );
  }
  const catalog = buildWorld().items;
  res.status(201).json(catalog.find((x) => x.id === id));
});

app.put("/api/items/:id", (req, res) => {
  const row = db.get("SELECT * FROM items WHERE id = ?", [req.params.id]);
  const b = req.body || {};
  const ts = db.now();
  if (!row) {
    const name = String(b.name || req.params.id).trim().slice(0, 160);
    if (!name) return res.status(400).json({ error: "Item needs a name." });
    db.run(
      `INSERT INTO items (id, name, kind, slot, wiki, notes, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'user', ?, ?)`,
      [
        req.params.id,
        name,
        String(b.kind || "item").slice(0, 32),
        String(b.slot || "").slice(0, 80),
        String(b.wiki || name.replace(/ /g, "_")).slice(0, 200),
        String(b.notes || "").slice(0, 2000),
        ts,
        ts,
      ]
    );
  } else {
    db.run(
      `UPDATE items SET name=?, kind=?, slot=?, wiki=?, notes=?, source='user', updated_at=? WHERE id=?`,
      [
        b.name !== undefined ? String(b.name).slice(0, 160) : row.name,
        b.kind !== undefined ? String(b.kind).slice(0, 32) : row.kind,
        b.slot !== undefined ? String(b.slot).slice(0, 80) : row.slot,
        b.wiki !== undefined ? String(b.wiki).slice(0, 200) : row.wiki,
        b.notes !== undefined ? String(b.notes).slice(0, 2000) : row.notes,
        ts,
        req.params.id,
      ]
    );
  }
  if (Array.isArray(b.sources)) {
    db.run("DELETE FROM item_sources WHERE item_id = ? AND source = 'user'", [req.params.id]);
    for (const s of b.sources.slice(0, 20)) {
      db.run(
        `INSERT INTO item_sources (id, item_id, method, label, quest_id, poi_id, zone_id, npc, notes, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, ?)`,
        [
          db.id(),
          req.params.id,
          String(s.method || "unknown").slice(0, 32),
          String(s.label || "").slice(0, 400),
          s.questId ? String(s.questId) : null,
          s.poiId ? String(s.poiId) : null,
          s.zoneId ? String(s.zoneId) : null,
          String(s.npc || "").slice(0, 120),
          String(s.notes || "").slice(0, 800),
          ts,
          ts,
        ]
      );
    }
  }
  const catalog = buildWorld().items;
  res.json(catalog.find((x) => x.id === req.params.id) || { id: req.params.id });
});

app.delete("/api/items/:id", (req, res) => {
  const row = db.get("SELECT * FROM items WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Curated item not found (wiki/quest items cannot be deleted here)." });
  db.run("DELETE FROM item_sources WHERE item_id = ?", [req.params.id]);
  db.run("DELETE FROM items WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

app.post("/api/maps/:zoneId", upload.single("map"), (req, res) => {
  const zoneId = req.params.zoneId;
  if (!zones.some((z) => z.id === zoneId)) return res.status(400).json({ error: "Unknown zone." });
  if (!req.file) return res.status(400).json({ error: "Drop a map image." });
  const ext = req.file.mimetype === "image/png" ? ".png" : req.file.mimetype === "image/webp" ? ".webp" : ".jpg";
  const filename = `${zoneId}${ext}`;
  fs.mkdirSync(CUSTOM_DIR, { recursive: true });
  fs.mkdirSync(DATA_MAPS, { recursive: true });
  fs.writeFileSync(path.join(CUSTOM_DIR, filename), req.file.buffer);
  fs.writeFileSync(path.join(DATA_MAPS, filename), req.file.buffer);
  const updatedAt = db.now();
  db.run(
    `INSERT INTO custom_maps (zone_id, filename, original_name, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(zone_id) DO UPDATE SET filename=excluded.filename, original_name=excluded.original_name, updated_at=excluded.updated_at`,
    [zoneId, filename, req.file.originalname, updatedAt]
  );
  res.json({ ok: true, filename, src: `/maps/custom/${filename}?v=${encodeURIComponent(updatedAt)}` });
});

function numOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(dist, "index.html"));
  });
}

db.ready
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MMFinder API on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB failed", err);
    process.exit(1);
  });
