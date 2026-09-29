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

function ClockPage() {
  const [now, setNow] = useState(() => new Date());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("is-overlay", overlayMode);
    if (overlayMode) document.title = "Early Access overlay — MMFinder";
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
    <main className="clock-page">
      <p className="clock-kicker">Monsters & Memories</p>
      <h1>Early Access</h1>
      <p className="clock-live" aria-live="polite">
        {spoken}
      </p>
      {left.done ? (
        <p className="clock-open">The gates are open.</p>
      ) : (
        <div className="clock-face" aria-hidden="true">
          <Unit value={String(left.days)} label="Days" />
          <Unit value={pad(left.hours)} label="Hours" />
          <Unit value={pad(left.minutes)} label="Minutes" />
          <Unit value={pad(left.seconds)} label="Seconds" />
        </div>
      )}
      <p className="clock-when">{EARLY_ACCESS_NOTE.eastern}</p>
      <p className="clock-eastern">{formatEastern(release)}</p>
      <p className="clock-local">
        Same moment as {EARLY_ACCESS_NOTE.bahrain}. {EARLY_ACCESS_NOTE.pacific}.
      </p>
      <p className="clock-local">Where you are: {local}</p>
      <section className="overlay-card">
        <h2>Streamer overlay</h2>
        <p>Paste this into an OBS Browser Source. The page background is already transparent. About 520×130 is enough.</p>
        <div className="overlay-stage">
          <StreamOverlay left={left} preview />
        </div>
        <p className="overlay-actions">
          <a href="?overlay">Open overlay</a>
          <button
            type="button"
            onClick={() => {
              const link = overlayUrl();
              navigator.clipboard.writeText(link).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }).catch(() => {});
            }}
          >
            {copied ? "Copied" : "Copy overlay link"}
          </button>
        </p>
      </section>
      <p className="clock-links">
        <a href="../">Back to MMFinder</a>
        <a href={EARLY_ACCESS_NOTE.source}>Studio announcement</a>
        <a href="https://monstersandmemories.com/">monstersandmemories.com</a>
      </p>
    </main>
  );
}

function StreamOverlay({ left, preview = false }) {
  return (
    <div className={preview ? "stream-overlay" : "stream-overlay stream-live"} aria-hidden={preview}>
      <span className="stream-moon" aria-hidden="true" />
      <div className="stream-copy">
        <p className="stream-title">{left.done ? "Gates are open" : "Early Access"}</p>
        <p className="stream-sub">2:00 a.m. Eastern</p>
      </div>
      {left.done ? (
        <p className="stream-open">Now</p>
      ) : (
        <div className="stream-digits">
          <Digit value={String(left.days)} label="d" />
          <Digit value={pad(left.hours)} label="h" />
          <Digit value={pad(left.minutes)} label="m" />
          <Digit value={pad(left.seconds)} label="s" />
        </div>
      )}
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
    <div className="clock-unit">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<ClockPage />);
