import { useState } from "react";
import { gameItemLink } from "../../shared/item-link.js";

export default function CopyGameLink({ item, className = "items-farm-link", empty = null }) {
  const [copied, setCopied] = useState(false);
  const text = gameItemLink(item?.name, item?.linkId);
  if (!text) return empty;

  async function copy(event) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      type="button"
      className={`${className}${copied ? " is-copied" : ""}`}
      title="Copy the in-game chat link. Paste it into Monsters & Memories."
      onClick={copy}
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
