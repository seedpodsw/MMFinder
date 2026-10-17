import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pinForMob } from "./mob-find";
import { findLootItem, indexItems, isNamedMob, itemGlance, levelNote, namedsByLevel, nearestNamedLevel } from "./named-list";
import { conOf } from "../../shared/field.js";

function placeLine(mob) {
  return [mob.zoneName || "Zone unknown", mob.race, mob.location].filter(Boolean).join(" · ");
}

function tipStyle(rect) {
  const width = 300;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  if (window.innerHeight - rect.bottom < 180) return { left, width, bottom: window.innerHeight - rect.top + 8 };
  return { left, width, top: rect.bottom + 8 };
}

function LootTip({ tip }) {
  const glance = itemGlance(tip.item);
  const name = glance?.name || tip.drop.name;
  return createPortal(
    <div className="named-loot-tip" style={tipStyle(tip.rect)} role="tooltip">
      <strong>{name}</strong>
      {glance?.line ? <p>{glance.line}</p> : null}
      {tip.drop.note ? <p className="named-loot-note">{tip.drop.note}</p> : null}
      {glance?.stats?.length ? <p>{glance.stats.join(" · ")}</p> : null}
      {glance?.effect ? <p className="named-loot-effect">{glance.effect}</p> : null}
      {glance?.classReq ? <p>Class {glance.classReq}</p> : null}
      {glance?.race ? <p>Race {glance.race}</p> : null}
      {!tip.item ? <p className="named-loot-note">No item page for this drop yet.</p> : null}
    </div>,
    document.body
  );
}

function NamedRow({ mob, note, pin, onShowMob, itemFor, onTip }) {
  const place = placeLine(mob);
  const drops = (mob.loot || []).filter((row) => row?.name);
  return (
    <article className="named-row">
      <div className="named-copy">
        <h4>
          {mob.name}
          {note ? <em>{note}</em> : null}
        </h4>
        <p title={place}>{place}</p>
        {drops.length > 0 && (
          <div className="named-loot">
            <span className="named-loot-label">Loot</span>
            {drops.map((drop) => (
              <span
                key={drop.name}
                className="named-loot-chip"
                tabIndex={0}
                onMouseEnter={(e) => onTip({ drop, item: itemFor(drop.name), rect: e.currentTarget.getBoundingClientRect() })}
                onMouseLeave={() => onTip(null)}
                onFocus={(e) => onTip({ drop, item: itemFor(drop.name), rect: e.currentTarget.getBoundingClientRect() })}
                onBlur={() => onTip(null)}
              >
                {drop.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        className="tiny"
        onClick={() =>
          onShowMob?.({
            ...mob,
            poiId: pin?.id || null,
            zoneId: pin?.zoneId || mob.zoneId,
          })
        }
      >
        {pin ? "Show on map" : mob.zoneId ? "Open zone" : "No map spot"}
      </button>
    </article>
  );
}

export default function Nameds({ pois = [], mobs = [], items = [], level, onShowMob }) {
  const [query, setQuery] = useState("");
  const [showUnknown, setShowUnknown] = useState(true);
  const [tip, setTip] = useState(null);
  const bodyRef = useRef(null);
  const didJump = useRef(false);

  const q = query.trim().toLowerCase();
  const roster = useMemo(() => (mobs || []).filter(isNamedMob), [mobs]);
  const filtered = useMemo(() => {
    if (!q) return roster;
    const tokens = q.split(/\s+/).filter(Boolean);
    return roster.filter((mob) => {
      const hay = [mob.name, mob.zoneName, mob.location, mob.race, mob.level, ...(mob.loot || []).map((drop) => drop.name)]
        .join(" ")
        .toLowerCase();
      return tokens.every((token) => hay.includes(token));
    });
  }, [roster, q]);

  const { groups, unknown } = useMemo(() => namedsByLevel(filtered), [filtered]);
  const pins = useMemo(() => {
    const map = new Map();
    for (const mob of roster) {
      if (mob?.id && !map.has(mob.id)) map.set(mob.id, pinForMob(mob, pois));
    }
    return map;
  }, [roster, pois]);
  const itemIndex = useMemo(() => indexItems(items), [items]);
  const itemFor = useMemo(() => {
    const cache = new Map();
    return (name) => {
      if (cache.has(name)) return cache.get(name);
      const item = findLootItem(itemIndex, name);
      cache.set(name, item);
      return item;
    };
  }, [itemIndex]);
  const searching = q.length > 0;
  const withLevel = filtered.length - unknown.length;
  const mine = nearestNamedLevel(groups, level);

  function scrollToLevel(n) {
    const root = bodyRef.current;
    if (!root || n == null) return;
    const el = root.querySelector(`[data-level="${n}"]`);
    if (!el) return;
    const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
    root.scrollTo({ top: Math.max(0, top - 4) });
  }

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return undefined;
    const clear = () => setTip(null);
    root.addEventListener("scroll", clear, { passive: true });
    return () => root.removeEventListener("scroll", clear);
  }, []);

  useLayoutEffect(() => {
    if (didJump.current) return;
    if (mine == null) return;
    didJump.current = true;
    scrollToLevel(mine);
  }, [groups, level, mine]);

  return (
    <div className="hunt-screen">
      <div className="hunt-bar">
        <input
          value={query}
          placeholder="Search a named, zone, race, or drop…"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="hunt-modes">
          <button type="button" onClick={() => scrollToLevel(mine)} disabled={mine == null}>
            My level ({level})
          </button>
        </div>
        <p className="hunt-count">
          {withLevel} named with a level
          {unknown.length ? ` · ${unknown.length} with no level` : ""}
        </p>
      </div>
      {groups.length > 0 && (
        <nav className="named-jump" aria-label="Levels">
          {groups.map((group) => (
            <button
              key={group.level}
              type="button"
              className={group.level === level ? "on" : ""}
              style={group.level === level ? undefined : { color: conOf(group.level, level) }}
              title={`Level ${group.level}, ${group.mobs.length} named`}
              onClick={() => scrollToLevel(group.level)}
            >
              {group.level}
            </button>
          ))}
        </nav>
      )}
      <div className="hunt-body named-body" ref={bodyRef}>
        {groups.length === 0 && unknown.length === 0 ? (
          <p className="empty">No named mobs match.</p>
        ) : (
          groups.map((group) => (
            <section
              key={group.level}
              className={group.level === level ? "named-level mine" : "named-level"}
              data-level={group.level}
            >
              <header>
                <h2 style={{ color: conOf(group.level, level) }}>
                  Level {group.level}
                  {group.level === level ? <span className="named-you"> · you</span> : null}
                </h2>
                <span>{group.mobs.length} named</span>
              </header>
              {group.mobs.map((row) => (
                <NamedRow
                  key={`${group.level}-${row.mob.id}`}
                  mob={row.mob}
                  note={levelNote(group.level, row.levelLabel)}
                  pin={pins.get(row.mob.id) || null}
                  onShowMob={onShowMob}
                  itemFor={itemFor}
                  onTip={setTip}
                />
              ))}
            </section>
          ))
        )}
        {unknown.length > 0 && (
          <section className="named-level" data-level="unknown">
            <header>
              <h2>No level</h2>
              <span>{unknown.length} named</span>
              {!searching && (
                <button type="button" className="tiny" onClick={() => setShowUnknown((open) => !open)}>
                  {showUnknown ? "Hide" : "Show"}
                </button>
              )}
            </header>
            {(showUnknown || searching) &&
              unknown.map((mob) => (
                <NamedRow
                  key={mob.id}
                  mob={mob}
                  note={mob.level || ""}
                  pin={pins.get(mob.id) || null}
                  onShowMob={onShowMob}
                  itemFor={itemFor}
                  onTip={setTip}
                />
              ))}
          </section>
        )}
      </div>
      {tip ? <LootTip tip={tip} /> : null}
    </div>
  );
}
