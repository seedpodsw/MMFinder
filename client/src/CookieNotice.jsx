import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "mmfinder.cookie-notice";

function alreadySeen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export default function CookieNotice() {
  const [open, setOpen] = useState(() => !alreadySeen());
  const okRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    okRef.current?.focus();
    function onKey(event) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode can block storage; hiding for this visit is enough */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="cookie-back" onClick={dismiss}>
      <div
        className="cookie-notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-notice-title"
        aria-describedby="cookie-notice-about cookie-notice-privacy"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Monsters & Memories</p>
        <h2 id="cookie-notice-title">MMFinder</h2>
        <p id="cookie-notice-about">
          A personal atlas for the game. Find zones, hunts, items, spells, and add your own characters.
        </p>
        <p id="cookie-notice-privacy" className="cookie-quiet">
          This site does not use cookies and does not collect information.
        </p>
        <button ref={okRef} type="button" className="cookie-ok" onClick={dismiss}>
          OK
        </button>
      </div>
    </div>
  );
}
