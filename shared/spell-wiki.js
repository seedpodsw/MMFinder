/**
 * Parse Monsters & Memories class-page wikitext into spell/ability rows.
 * Handles {{SpellRow}} templates and MediaWiki tables; skips Removed levels.
 */

const WIKI_BASE = "https://monstersandmemories.miraheze.org";

export function plainWikitext(value) {
  return String(value || "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function spellSlug(name) {
  return String(name || "").trim().replace(/ /g, "_");
}

export function spellWikiUrl(name) {
  const slug = spellSlug(name);
  if (!slug) return null;
  return `${WIKI_BASE}/wiki/${slug}`;
}

/**
 * Parse a school/skill cell like `[[Skill Evocation|Evo]]`.
 * @returns {{ text: string|null, slug: string|null, url: string|null }}
 */
export function parseSchool(raw) {
  const text = String(raw || "").trim();
  if (!text) return { text: null, slug: null, url: null };

  const link = text.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  if (link) {
    const page = link[1].trim();
    const label = (link[2] || page).trim();
    const slug = page.replace(/ /g, "_");
    return {
      text: plainWikitext(label) || label,
      slug,
      url: `${WIKI_BASE}/wiki/${slug}`,
    };
  }

  const plain = plainWikitext(text);
  return { text: plain || null, slug: null, url: null };
}

export function parseMana(raw) {
  const text = plainWikitext(raw);
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number(text);
  return text;
}

/**
 * @param {string} wikitext
 * @returns {{ sectionTitle: string|null, type: 'spell'|'ability', rows: object[] }}
 */
export function parseClassWikitext(wikitext) {
  const text = String(wikitext || "");
  const sectionMatch = text.match(
    /^=+\s*((?:[^=\n]+?)(?:Spells|Abilities|Songs)(?:\s*&\s*Abilities)?)\s*=+/im
  );
  const sectionTitle = sectionMatch ? sectionMatch[1].trim() : null;
  const type = sectionTitle && /abilities|songs/i.test(sectionTitle) ? "ability" : "spell";

  const rows = [];
  const marks = [];
  const headingRe = /^(=+)([^=]+)\1\s*$/gm;
  let match;
  while ((match = headingRe.exec(text))) {
    const title = match[2].trim();
    const levelMatch = title.match(/^Level\s+(\d+)/i);
    marks.push({
      idx: match.index,
      level: levelMatch ? Number(levelMatch[1]) : null,
      removed: /removed/i.test(title),
      depth: match[1].length,
    });
  }

  function contextAt(idx) {
    let level = null;
    let removed = false;
    for (const mark of marks) {
      if (mark.idx > idx) break;
      if (mark.level != null) {
        level = mark.level;
        removed = mark.removed;
      } else if (mark.depth === 1) {
        level = null;
        removed = mark.removed;
      }
    }
    return { level, removed };
  }

  const lines = text.split("\n");
  let level = null;
  let removed = false;
  let inTable = false;
  let offset = 0;

  for (const line of lines) {
    const heading = line.match(/^(=+)([^=]+)\1\s*$/);
    if (heading) {
      const title = heading[2].trim();
      const levelMatch = title.match(/^Level\s+(\d+)/i);
      if (levelMatch) {
        level = Number(levelMatch[1]);
        removed = /removed/i.test(title);
        inTable = false;
      } else if (heading[1].length === 1) {
        level = null;
        removed = /removed/i.test(title);
        inTable = false;
      }
      offset += line.length + 1;
      continue;
    }

    if (line.startsWith("{|")) {
      inTable = true;
      offset += line.length + 1;
      continue;
    }
    if (line.startsWith("|}")) {
      inTable = false;
      offset += line.length + 1;
      continue;
    }

    if (inTable && level != null && !removed) {
      if (line.startsWith("|-") || line.startsWith("!") || line.includes("!!")) {
        offset += line.length + 1;
        continue;
      }
      if (line.startsWith("|")) {
        const parts = line.replace(/^\|\s*/, "").split(/\s*\|\|\s*/);
        if (parts.length >= 2) {
          const name = plainWikitext(parts[0]);
          if (name && !/spell name/i.test(name)) {
            const school = parseSchool(parts[2] || "");
            rows.push({
              name,
              description: plainWikitext(parts[1] || ""),
              category: school.text,
              categorySlug: school.slug,
              categoryUrl: school.url,
              location: plainWikitext(parts[3] || "") || null,
              mana: parseMana(parts[4] || ""),
              level,
              source: "table",
            });
          }
        }
      }
    }

    offset += line.length + 1;
  }

  const chunks = text.split("{{SpellRow");
  let searchFrom = 0;
  for (let i = 1; i < chunks.length; i++) {
    const token = `{{SpellRow${chunks[i]}`;
    const abs = text.indexOf(token, searchFrom);
    searchFrom = abs + 10;
    const body = chunks[i];
    const end = body.indexOf("}}");
    const block = end >= 0 ? body.slice(0, end) : body;
    const fields = {};
    for (const part of (`\n${block}`).split(/\n\|/)) {
      const eq = part.indexOf("=");
      if (eq < 0) continue;
      const key = part.slice(0, eq).trim();
      const value = part.slice(eq + 1);
      if (!fields[key]) fields[key] = value;
    }
    const ctx = contextAt(abs);
    if (ctx.level == null || ctx.removed) continue;
    const name = plainWikitext(fields.name || "");
    if (!name) continue;
    const school = parseSchool(fields.school || "");
    rows.push({
      name,
      description: plainWikitext(fields.description || ""),
      category: school.text,
      categorySlug: school.slug,
      categoryUrl: school.url,
      location: plainWikitext(fields.location || "") || null,
      mana: parseMana(fields.mana || ""),
      level: ctx.level,
      source: "spellrow",
    });
  }

  return { sectionTitle, type, rows };
}
