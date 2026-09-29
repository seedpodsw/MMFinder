const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const empty = () => ({
  notes: [],
  camps: [],
  settings: { characterLevel: 1, characterClass: "", completedSteps: [] },
});

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(empty(), null, 2));
  }
}

function read() {
  ensure();
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    return {
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      camps: Array.isArray(parsed.camps) ? parsed.camps : [],
      settings: {
        characterLevel: parsed.settings?.characterLevel ?? 1,
        characterClass: parsed.settings?.characterClass || "",
        completedSteps: Array.isArray(parsed.settings?.completedSteps)
          ? parsed.settings.completedSteps
          : [],
      },
    };
  } catch {
    const fallback = empty();
    write(fallback);
    return fallback;
  }
}

function write(store) {
  ensure();
  const tmp = STORE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE_PATH);
}

function id() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

module.exports = {
  read,
  write,
  id,
  now,
};
