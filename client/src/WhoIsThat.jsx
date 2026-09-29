import { useEffect, useRef, useState } from "react";
import { whiteOutline } from "../../shared/who-outline.js";

const STALL_MS = 6000;

function asset(file) {
  const base = import.meta.env.BASE_URL || "/";
  const root = base.endsWith("/") ? base : `${base}/`;
  return `${root}who/${file}`;
}

function shuffle(list) {
  const next = list.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function paintOutline(img, canvas) {
  const max = 440;
  const scale = Math.min(max / img.naturalWidth, max / img.naturalHeight);
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const off = document.createElement("canvas");
  off.width = width;
  off.height = height;
  const src = off.getContext("2d", { willReadFrequently: true });
  src.drawImage(img, 0, 0, width, height);
  const pixels = src.getImageData(0, 0, width, height);
  const stroke = whiteOutline(pixels.data, width, height);
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").putImageData(new ImageData(stroke, width, height), 0, 0);
}

export default function WhoIsThat() {
  const [deck, setDeck] = useState(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("stall");
  const [left, setLeft] = useState(6);
  const [error, setError] = useState("");
  const canvasRef = useRef(null);
  const creature = deck?.[index] || null;

  useEffect(() => {
    let cancel = false;
    fetch(asset("manifest.json"))
      .then((res) => {
        if (!res.ok) throw new Error("The creature deck is not here yet.");
        return res.json();
      })
      .then((data) => {
        if (cancel) return;
        const creatures = Array.isArray(data.creatures) ? data.creatures : [];
        if (!creatures.length) throw new Error("The creature deck is empty.");
        setDeck(shuffle(creatures));
      })
      .catch((err) => {
        if (!cancel) setError(err.message);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!creature || phase !== "stall") return undefined;
    const started = Date.now();
    setLeft(6);
    const img = new Image();
    let dead = false;
    img.onload = () => {
      if (!dead && canvasRef.current) paintOutline(img, canvasRef.current);
    };
    img.src = asset(creature.file);
    const tick = setInterval(() => {
      const remain = STALL_MS - (Date.now() - started);
      setLeft(Math.max(0, Math.ceil(remain / 1000)));
      if (remain <= 0) {
        clearInterval(tick);
        if (!dead) setPhase("reveal");
      }
    }, 200);
    return () => {
      dead = true;
      clearInterval(tick);
    };
  }, [creature, phase, index]);

  function show() {
    setPhase("reveal");
  }

  function another() {
    if (!deck?.length) return;
    setPhase("stall");
    setLeft(6);
    setIndex((i) => (i + 1) % deck.length);
  }

  if (error) {
    return (
      <div className="who-screen">
        <p className="who-error">{error}</p>
      </div>
    );
  }

  if (!creature) {
    return (
      <div className="who-screen">
        <p className="who-wait">Shuffling the bestiary…</p>
      </div>
    );
  }

  const facts = [creature.level && `Level ${creature.level}`, creature.race, creature.zone].filter(Boolean);
  const wikiHref = creature.wiki
    ? `https://monstersandmemories.miraheze.org/wiki/${creature.wiki}`
    : "";

  return (
    <div className="who-screen">
      <article className="who-card">
        {phase === "stall" ? (
          <>
            <p className="who-ask">Who is that</p>
            <p className="who-game">Monsters and Memories</p>
            <canvas ref={canvasRef} className="who-outline" />
            <p className="who-count">{left}</p>
          </>
        ) : (
          <>
            <h2 className="who-name">{creature.name}</h2>
            <img className="who-photo" src={asset(creature.file)} alt={creature.name} />
            {facts.length > 0 && <p className="who-facts">{facts.join(" · ")}</p>}
            {wikiHref && (
              <a className="who-wiki" href={wikiHref} target="_blank" rel="noreferrer">
                Wiki page
              </a>
            )}
          </>
        )}
        <div className="who-actions">
          {phase === "stall" ? (
            <button type="button" onClick={show}>
              Show it
            </button>
          ) : (
            <button type="button" onClick={another}>
              Another
            </button>
          )}
          <span className="who-progress">
            {index + 1} / {deck.length}
          </span>
        </div>
      </article>
    </div>
  );
}
