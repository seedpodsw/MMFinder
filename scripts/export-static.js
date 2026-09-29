/**
 * Bake a fresh seed database into static JSON.
 * Uses a throwaway sqlite file so a local mmfinder.sqlite cannot leak into the site.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const dbPath = path.join(os.tmpdir(), "mmfinder-seed-export.sqlite");
fs.rmSync(dbPath, { force: true });
process.env.MMFINDER_DB = dbPath;

const db = require("../server/db");
const { buildWorld } = require("../server/payload");

const outDir = path.join(__dirname, "..", "client", "public", "data");

(async () => {
  await db.ready;
  const world = buildWorld();
  const notes = db.all("SELECT * FROM notes ORDER BY updated_at DESC").map(db.rowNote);
  fs.mkdirSync(outDir, { recursive: true });
  const worldPath = path.join(outDir, "world.json");
  const notesPath = path.join(outDir, "notes.json");
  fs.writeFileSync(worldPath, JSON.stringify(world));
  fs.writeFileSync(notesPath, JSON.stringify(notes));
  const worldKb = Math.round(fs.statSync(worldPath).size / 1024);
  const notesKb = Math.round(fs.statSync(notesPath).size / 1024);
  console.log(`static seed → data/world.json ${worldKb}kb, data/notes.json ${notesKb}kb (${notes.length} notes)`);
  fs.rmSync(dbPath, { force: true });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
