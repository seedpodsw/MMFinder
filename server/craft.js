/** Tradeskill recipe type, materials, and what an item is used to make. */

const NONE = "no known recipe";

function linkParts(line) {
  const found = [];
  const re = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;
  let m;
  while ((m = re.exec(line))) found.push((m[2] || m[1]).trim());
  return found;
}

function cleanName(raw) {
  return String(raw || "")
    .replace(/'''/g, "")
    .replace(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g, (_, title, label) => label || title)
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCraftBlocks(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("|"));
  const blocks = [];
  let skill = "";
  let trivial = "";
  let block = null;
  let altNext = false;

  function open() {
    if (!block) block = { skill, trivial, yieldName: "", yieldQty: "", container: "", materials: [] };
    block.skill = block.skill || skill;
    block.trivial = block.trivial || trivial;
    return block;
  }

  function finish() {
    if (!block) return;
    if (block.skill || block.yieldName || block.materials.length || block.container) blocks.push(block);
    block = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^or$/i.test(line)) {
      altNext = true;
      continue;
    }

    const yieldMatch = line.match(
      /Yield:\s*(?:'''\s*)?(?:\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]|(.+?))(?:\s*''')?\s*(?:x\s*(\d+(?:\s*-\s*x?\s*\d+)?))?\s*$/i
    );
    if (yieldMatch && /yield:/i.test(line)) {
      const current = open();
      current.yieldName = cleanName(yieldMatch[2] || yieldMatch[1] || yieldMatch[3] || "");
      current.yieldQty = (yieldMatch[4] || "").replace(/\s+/g, "");
      continue;
    }

    if (/\bIn\s+\[\[/i.test(line)) {
      const names = linkParts(line);
      if (names.length) {
        open().container = names.join(" or ");
        continue;
      }
    }

    const mat = line.match(/^:*\s*(?:or\s+)?x\s*(\d+)\s+(.+)$/i);
    if (mat) {
      const name = cleanName(mat[2]);
      if (name) {
        open().materials.push({ qty: mat[1], name, alt: altNext || /^:*\s*or\s+/i.test(line) });
      }
      altNext = false;
      continue;
    }

    const head = line.match(/^(?:\*+\s*)?\[\[([^\]|#]+)(?:\|([^\]]+))?\]\](?:\s*\(Trivial:\s*([^)]+)\))?/i);
    if (!head) {
      altNext = false;
      continue;
    }
    const name = (head[2] || head[1]).trim();
    const triv = head[3] && !/^[?~]+$/.test(head[3].trim()) ? head[3].trim() : "";
    const upcoming = lines.slice(i + 1, i + 5).join("\n");
    const followedByYield = /yield:/i.test(upcoming);
    const bareSkill = !line.includes("*") && !triv;
    if (skill && triv && line.startsWith("*") && !followedByYield) {
      finish();
      blocks.push({
        skill,
        trivial: triv,
        yieldName: name,
        yieldQty: "",
        container: "",
        materials: [],
      });
      altNext = false;
      continue;
    }
    if (!skill || followedByYield || bareSkill) {
      finish();
      skill = name;
      trivial = triv;
      altNext = false;
      continue;
    }
    altNext = false;
  }
  finish();
  return blocks;
}

function formatMaterials(materials) {
  if (!materials?.length) return "";
  return materials
    .map((mat) => `${mat.alt ? "or " : ""}${mat.qty}× ${mat.name}`)
    .join(", ")
    .replace(/, or /g, " or ");
}

function formatMade(block) {
  const bits = [block.skill];
  if (block.trivial) bits.push(`trivial ${block.trivial}`);
  let text = bits.filter(Boolean).join(", ");
  if (block.container) text += ` in ${block.container}`;
  const qty = String(block.yieldQty || "").replace(/x/gi, "");
  if (qty && qty !== "1") text += ` → ${qty}`;
  return text;
}

function formatUsed(entry) {
  const bits = [entry.skill];
  if (entry.trivial) bits.push(`trivial ${entry.trivial}`);
  let detail = bits.filter(Boolean).join(", ");
  if (entry.container) detail = detail ? `${detail} in ${entry.container}` : `in ${entry.container}`;
  let text = detail ? `${entry.product} (${detail})` : entry.product;
  const mats = formatMaterials(entry.materials);
  if (mats) text += `: ${mats}`;
  return text;
}

function sameUse(row, entry) {
  return `${row.product.toLowerCase()}|${(row.skill || "").toLowerCase()}` === `${entry.product.toLowerCase()}|${(entry.skill || "").toLowerCase()}`;
}

function attachCraftInfo(items) {
  const usedByMaterial = new Map();
  const madeById = new Map();
  const madeByName = new Map();

  function addUse(materialName, entry) {
    const key = String(materialName || "").trim().toLowerCase();
    if (!key || !entry.product) return;
    if (!usedByMaterial.has(key)) usedByMaterial.set(key, []);
    const list = usedByMaterial.get(key);
    const existing = list.find((row) => sameUse(row, entry));
    if (!existing) {
      list.push(entry);
      return;
    }
    if (!existing.materials?.length && entry.materials?.length) existing.materials = entry.materials;
    if (!existing.container && entry.container) existing.container = entry.container;
    if (!existing.trivial && entry.trivial) existing.trivial = entry.trivial;
  }

  function recipeFor(entry) {
    if (entry.materials?.length) return entry;
    const blocks = madeByName.get(String(entry.product || "").trim().toLowerCase()) || [];
    const block = blocks.find((row) => row.materials.length && (!entry.skill || !row.skill || row.skill.toLowerCase() === entry.skill.toLowerCase()))
      || blocks.find((row) => row.materials.length);
    if (!block) return entry;
    return {
      ...entry,
      skill: entry.skill || block.skill,
      trivial: entry.trivial || block.trivial,
      container: entry.container || block.container,
      materials: block.materials,
    };
  }

  function useEntry(product, block) {
    return {
      product,
      skill: block.skill,
      trivial: block.trivial,
      container: block.container,
      materials: block.materials,
    };
  }

  for (const item of items || []) {
    const ownName = String(item.name || "").trim().toLowerCase();
    const made = parseCraftBlocks(item.playercrafted).filter((block) => block.materials.length || block.container || block.yieldQty);
    const listed = parseCraftBlocks(item.recipes);
    for (const block of listed) {
      if (!block.yieldName) continue;
      const product = block.yieldName;
      const isOwn = product.trim().toLowerCase() === ownName;
      if (isOwn && (block.materials.length || block.container)) {
        made.push(block);
        continue;
      }
      const entry = useEntry(product, block);
      if (block.materials.length) {
        for (const mat of block.materials) addUse(mat.name, entry);
      } else {
        addUse(item.name, entry);
      }
    }
    madeById.set(item.id, made);
    if (item.name && made.length) madeByName.set(ownName, made);
    for (const block of made) {
      const product = block.yieldName || item.name;
      const entry = useEntry(product, block);
      for (const mat of block.materials) addUse(mat.name, entry);
    }
  }

  return (items || []).map((item) => {
    const made = madeById.get(item.id) || [];
    const recipe = made.length
      ? made.map(formatMade).filter(Boolean).join(" | ")
      : "";
    const materials = made.map((block) => formatMaterials(block.materials)).filter(Boolean).join(" | ");
    const used = (usedByMaterial.get(String(item.name || "").trim().toLowerCase()) || []).map(recipeFor);
    const usedIn = used.map(formatUsed).join("; ");
    const skills = [...new Set([
      ...made.map((block) => block.skill),
      ...used.map((entry) => entry.skill),
    ].filter(Boolean))];
    const next = {
      ...item,
      recipe: recipe || (skills.length && !made.length ? skills.join(", ") : "") || NONE,
      materials: materials || NONE,
      usedIn: usedIn || NONE,
    };
    delete next.playercrafted;
    delete next.recipes;
    return next;
  });
}

module.exports = {
  NONE,
  parseCraftBlocks,
  formatMaterials,
  attachCraftInfo,
};
