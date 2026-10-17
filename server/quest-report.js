/**
 * Compare hand-authored quest steps to wiki page plain text.
 * Match turn-in, npc, and reward tokens — not the hand-written action sentence.
 */

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/['’]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensForStep(step) {
  const out = [];
  for (const key of ["turnIn", "npc", "reward"]) {
    const raw = step?.[key];
    if (raw == null || String(raw).trim() === "") continue;
    out.push({ key, value: String(raw).trim(), norm: normalizeText(raw) });
  }
  return out;
}

/**
 * Returns { diverged, missingTokens } for one catalog quest vs page plain text.
 * A step with no turn-in/npc/reward is never a divergence.
 */
function compareQuestToPage(quest, pageText) {
  const hay = normalizeText(pageText);
  const missingTokens = [];
  for (const step of quest.steps || []) {
    for (const token of tokensForStep(step)) {
      if (!token.norm) continue;
      if (!hay.includes(token.norm)) {
        missingTokens.push({ stepId: step.id, key: token.key, value: token.value });
      }
    }
  }
  return { diverged: missingTokens.length > 0, missingTokens };
}

/**
 * @param {object[]} catalogQuests - from QUESTS
 * @param {Map<string, string>} pagesBySlug - wiki slug -> plain text (or wikitext)
 * @param {string[]} wikiQuestTitles - titles from a wiki listing
 */
function buildQuestReport(catalogQuests, pagesBySlug, wikiQuestTitles = []) {
  const catalogSlugs = new Set(
    (catalogQuests || []).map((q) => String(q.wiki || "").replace(/ /g, "_")).filter(Boolean)
  );
  const diverged = [];
  const fetchErrors = [];

  for (const quest of catalogQuests || []) {
    const slug = String(quest.wiki || "").replace(/ /g, "_");
    if (!slug) continue;
    if (!pagesBySlug.has(slug)) {
      fetchErrors.push({ title: quest.title, slug, error: "page not fetched" });
      continue;
    }
    const pageText = pagesBySlug.get(slug);
    if (pageText == null) {
      fetchErrors.push({ title: quest.title, slug, error: "fetch failed" });
      continue;
    }
    const result = compareQuestToPage(quest, pageText);
    if (result.diverged) {
      diverged.push({
        title: quest.title,
        slug,
        missing: result.missingTokens.map((t) => t.value),
      });
    }
  }

  const missingFromAtlas = [];
  for (const title of wikiQuestTitles || []) {
    const slug = String(title || "").replace(/ /g, "_");
    if (!slug) continue;
    if (!catalogSlugs.has(slug)) missingFromAtlas.push(title);
  }
  missingFromAtlas.sort((a, b) => a.localeCompare(b));

  return { diverged, missingFromAtlas, fetchErrors };
}

function formatQuestReport(report) {
  const lines = [];
  if (report.diverged.length) {
    lines.push(`Diverged catalog quests (${report.diverged.length}):`);
    for (const row of report.diverged) {
      lines.push(`  ${row.title}: missing ${row.missing.join("; ")}`);
    }
  } else {
    lines.push("Diverged catalog quests: none");
  }
  if (report.missingFromAtlas.length) {
    lines.push(`Wiki quests not in the atlas (${report.missingFromAtlas.length}):`);
    lines.push(`  ${report.missingFromAtlas.join(", ")}`);
  } else {
    lines.push("Wiki quests not in the atlas: none");
  }
  if (report.fetchErrors.length) {
    lines.push(`Fetch errors (${report.fetchErrors.length}):`);
    for (const row of report.fetchErrors) {
      lines.push(`  ${row.title || row.slug}: ${row.error}`);
    }
  }
  return lines.join("\n");
}

module.exports = {
  normalizeText,
  tokensForStep,
  compareQuestToPage,
  buildQuestReport,
  formatQuestReport,
};
