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
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow" id="cookie-notice-title">
          Cookies
        </p>
        <p>This site does not use cookies. We do not collect any.</p>
        <button ref={okRef} type="button" className="cookie-ok" onClick={dismiss}>
          OK
        </button>
      </div>
    </div>
  );
}
