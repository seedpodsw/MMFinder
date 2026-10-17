import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { pinForMob } from "./mob-find";
import { isNamedMob, levelNote, namedsByLevel, nearestNamedLevel } from "./named-list";
import { conOf } from "../../shared/field.js";

function placeLine(mob) {
  return [mob.zoneName || "Zone unknown", mob.race, mob.location].filter(Boolean).join(" · ");
}

function NamedRow({ mob, note, pin, onShowMob }) {
  const place = placeLine(mob);
  return (
    <article className="named-row">
      <div className="named-copy">
        <h4>
          {mob.name}
          {note ? <em>{note}</em> : null}
        </h4>
        <p title={place}>{place}</p>
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

export default function Nameds({ pois = [], mobs = [], level, onShowMob }) {
  const [query, setQuery] = useState("");
  const [showUnknown, setShowUnknown] = useState(true);
  const bodyRef = useRef(null);
  const didJump = useRef(false);

  const q = query.trim().toLowerCase();
  const roster = useMemo(() => (mobs || []).filter(isNamedMob), [mobs]);
  const filtered = useMemo(() => {
    if (!q) return roster;
    const tokens = q.split(/\s+/).filter(Boolean);
    return roster.filter((mob) => {
      const hay = [mob.name, mob.zoneName, mob.location, mob.race, mob.level].join(" ").toLowerCase();
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
          placeholder="Search a named, zone, or race…"
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
                <NamedRow key={mob.id} mob={mob} note={mob.level || ""} pin={pins.get(mob.id) || null} onShowMob={onShowMob} />
              ))}
          </section>
        )}
      </div>
    </div>
  );
}
