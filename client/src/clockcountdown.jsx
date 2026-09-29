import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { EARLY_ACCESS_NOTE, formatEastern, partsUntil, releaseInstant } from "../../shared/release.js";
import "./clock.css";

const release = releaseInstant();
const overlayMode = new URLSearchParams(window.location.search).has("overlay");

if (overlayMode) {
  document.documentElement.classList.add("is-overlay");
  document.body.classList.add("is-overlay");
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function overlayUrl() {
  const url = new URL(window.location.href);
  url.search = "?overlay";
  url.hash = "";
  return url.toString();
}

function useHitCount() {
  const [hits, setHits] = useState("00084721");
  useEffect(() => {
    const key = "mmfinder.clock.hits";
    const prev = Number(localStorage.getItem(key) || 84721);
    const next = prev + 1;
    localStorage.setItem(key, String(next));
    setHits(String(next).padStart(8, "0"));
  }, []);
  return hits;
}

function ClockPage() {
  const [now, setNow] = useState(() => new Date());
  const [copied, setCopied] = useState(false);
  const hits = useHitCount();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("is-overlay", overlayMode);
    document.title = overlayMode
      ? "!!! OVERLAY !!!"
      : "~~*~ WELCOME TO MY COUNTDOWN ~*~~";
    return () => document.body.classList.remove("is-overlay");
  }, []);

  const left = partsUntil(now, release);
  const local = release.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const spoken = left.done
    ? "Early Access is open."
    : `${left.days} days, ${left.hours} hours, ${left.minutes} minutes until Early Access.`;

  if (overlayMode) return <StreamOverlay left={left} />;

  return (
    <main className="geo">
      <div className="geo-marquee">
        <marquee scrollamount="8">
          ★ WELCOME TO MY HOMEPAGE ★ EARLY ACCESS ★ 2:00 A.M. EASTERN ★ OCTOBER 1 2026 ★ SIGN MY
          GUESTBOOK ★ BEST VIEWED IN NETSCAPE ★ YOU ARE VISITOR NUMBER {hits} ★ NO WIPES ★ THIS PAGE
          IS UNDER CONSTRUCTION ★ PLEASE WAIT... GRAPHICS LOADING ★
        </marquee>
      </div>

      <div className="geo-banner">
        <div className="geo-stripes" />
        <div className="geo-clip" aria-hidden="true">
          <ClipStar />
          <ClipWizard />
          <ClipStar />
        </div>
        <h1 className="geo-rainbow">MMFinder COUNTDOWN!!!</h1>
        <p className="geo-blink">*** UNDER CONSTRUCTION ***</p>
        <div className="geo-stripes" />
      </div>

      <p className="geo-live" aria-live="polite">
        {spoken}
      </p>

      {left.done ? (
        <p className="geo-open">THE GATES ARE OPEN!!!!!!</p>
      ) : (
        <table className="geo-table">
          <tbody>
            <tr>
              <Unit value={String(left.days)} label="DAYS" />
              <Unit value={pad(left.hours)} label="HOURS" />
              <Unit value={pad(left.minutes)} label="MINUTES" />
              <Unit value={pad(left.seconds)} label="SECONDS" />
            </tr>
          </tbody>
        </table>
      )}

      <p className="geo-when">{EARLY_ACCESS_NOTE.eastern}</p>
      <p className="geo-eastern">{formatEastern(release)}</p>
      <p className="geo-local">
        same moment as {EARLY_ACCESS_NOTE.bahrain}. {EARLY_ACCESS_NOTE.pacific}.
      </p>
      <p className="geo-local">your computer says: {local}</p>

      <div className="geo-counter">
        YOU ARE VISITOR NUMBER
        <div>
          <b>{hits}</b>
        </div>
        since you opened this page on this computer lol
      </div>

      <p className="geo-note">~~~ best viewed at 800x600 with Netscape Navigator 4.0 ~~~</p>
      <p className="geo-note">*** animated gifs made in MS Paint ***</p>

      <section className="overlay-card">
        <h2>COOL STREAMER OVERLAY!!!</h2>
        <p>paste into OBS browser source. background is see-thru. about 520x130. radical.</p>
        <div className="overlay-stage">
          <StreamOverlay left={left} preview />
        </div>
        <p className="overlay-actions">
          <a href="?overlay">OPEN THE OVERLAY</a>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard
                .writeText(overlayUrl())
                .then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                })
                .catch(() => {});
            }}
          >
            {copied ? "COPIED!!!" : "COPY OVERLAY LINK"}
          </button>
        </p>
      </section>

      <p className="geo-webring">
        <a href="../">« BACK TO MMFinder</a>
        <a href={EARLY_ACCESS_NOTE.source}>STUDIO NEWS</a>
        <a href="https://monstersandmemories.com/">OFFICIAL SITE</a>
      </p>

      <div className="geo-marquee">
        <marquee scrollamount="6" direction="right">
          ♪ midi would be playing right now if this was really 1997 ♪ email me @ aol.com ♪ thanks for
          visiting my site ♪ don't forget to sign the guestbook ♪
        </marquee>
      </div>
    </main>
  );
}

function ClipStar() {
  return (
    <svg className="geo-spin" width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
      <polygon
        fill="#ffff00"
        stroke="#ff00ff"
        strokeWidth="2"
        points="27,2 33,20 52,20 36,32 42,51 27,39 12,51 18,32 2,20 21,20"
      />
    </svg>
  );
}

function ClipWizard() {
  return (
    <svg width="72" height="64" viewBox="0 0 72 64" aria-hidden="true">
      <polygon fill="#c0c0ff" stroke="#000" points="36,2 48,28 24,28" />
      <circle cx="36" cy="36" r="10" fill="#ffcc99" stroke="#000" />
      <rect x="22" y="46" width="28" height="16" fill="#000080" stroke="#ffff00" />
      <polygon fill="#ff0000" points="50,40 68,34 52,48" />
      <text x="30" y="40" fontSize="10" fill="#000">
        : )
      </text>
    </svg>
  );
}

function StreamOverlay({ left, preview = false }) {
  return (
    <div className={preview ? "stream-overlay" : "stream-overlay stream-live"} aria-hidden={preview}>
      <div className="stream-digits">
        <Digit value={String(left.days)} label="d" />
        <Digit value={pad(left.hours)} label="h" />
        <Digit value={pad(left.minutes)} label="m" />
        <Digit value={pad(left.seconds)} label="s" />
      </div>
    </div>
  );
}

function Digit({ value, label }) {
  return (
    <span className="stream-digit">
      <strong>{value}</strong>
      <em>{label}</em>
    </span>
  );
}

function Unit({ value, label }) {
  return (
    <td>
      <strong>{value}</strong>
      <span>{label}</span>
    </td>
  );
}

createRoot(document.getElementById("root")).render(<ClockPage />);
