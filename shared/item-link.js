/** In-game chat link. The wiki copies this same anchor; pasting it into chat opens the item. */

const LINK_ID = /^[0-9a-f]{24}$/;

export function cleanLinkId(value) {
  const id = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^item\|/, "");
  return LINK_ID.test(id) ? id : "";
}

function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** `<a href="item|hash">[Name]</a>`, or "" when the hash is missing or malformed. */
export function gameItemLink(name, linkId) {
  const id = cleanLinkId(linkId);
  const label = String(name || "").trim();
  if (!id || !label) return "";
  return `<a href="item|${id}">[${escapeText(label)}]</a>`;
}
