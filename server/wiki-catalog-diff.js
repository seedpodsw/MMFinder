/**
 * Compare wiki catalog rows and write JSON only after a successful fetch.
 * A row is changed when any stored field differs. Key order and file-level
 * timestamps are ignored.
 */

const fs = require("fs");
const path = require("path");

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = stableValue(value[key]);
    return out;
  }
  return value;
}

function rowSignature(row) {
  return JSON.stringify(stableValue(row));
}

function nameOf(row, nameFn) {
  if (typeof nameFn === "function") return nameFn(row);
  return String(row?.name || row?.wiki || "").trim() || "(unnamed)";
}

function keyOf(row, keyFn) {
  if (typeof keyFn === "function") return keyFn(row);
  return String(row?.wiki || row?.name || "").trim();
}

/** Diff previous and next row lists. Returns { added, changed, removed } name lists. */
function diffCatalog(previous, next, { keyFn, nameFn } = {}) {
  const prevByKey = new Map();
  for (const row of previous || []) {
    const key = keyOf(row, keyFn);
    if (!key) continue;
    prevByKey.set(key, row);
  }
  const nextByKey = new Map();
  for (const row of next || []) {
    const key = keyOf(row, keyFn);
    if (!key) continue;
    nextByKey.set(key, row);
  }

  const added = [];
  const changed = [];
  const removed = [];

  for (const [key, row] of nextByKey) {
    const name = nameOf(row, nameFn);
    if (!prevByKey.has(key)) {
      added.push(name);
      continue;
    }
    if (rowSignature(prevByKey.get(key)) !== rowSignature(row)) changed.push(name);
  }
  for (const [key, row] of prevByKey) {
    if (!nextByKey.has(key)) removed.push(nameOf(row, nameFn));
  }

  added.sort((a, b) => a.localeCompare(b));
  changed.sort((a, b) => a.localeCompare(b));
  removed.sort((a, b) => a.localeCompare(b));
  return { added, changed, removed };
}

function printCatalogDiff(label, { added, changed, removed }) {
  console.log(
    `${label}: added ${added.length}, changed ${changed.length}, removed ${removed.length}`
  );
  if (added.length) console.log(`Added: ${added.join(", ")}`);
  if (changed.length) console.log(`Changed: ${changed.join(", ")}`);
  if (removed.length) console.log(`Removed: ${removed.join(", ")}`);
}

function atomicWriteJson(filePath, payload) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
  fs.renameSync(tmp, filePath);
}

function readJsonRows(filePath, listKey) {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const list = Array.isArray(raw?.[listKey]) ? raw[listKey] : Array.isArray(raw) ? raw : [];
    return list;
  } catch {
    return [];
  }
}

module.exports = {
  stableValue,
  rowSignature,
  diffCatalog,
  printCatalogDiff,
  atomicWriteJson,
  readJsonRows,
};
