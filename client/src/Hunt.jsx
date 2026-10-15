import { useMemo, useState } from "react";
import { fitsGroup, fitsSolo, hasHuntLevel, huntSide } from "./finder";
import { pinForMob, searchMobs } from "./mob-find";
import { KIND_LABEL, monsterList, rangeLabel } from "./WorldMap";

const MODES = [
  { id: "all", label: "All camps" },
  { id: "me", label: "For my level" },
  { id: "solo", label: "Solo camps" },
  { id: "group", label: "Group camps" },
];

function parseMob(raw) {
  const text = String(raw || "").trim();
  const ranged = text.match(/^(.*\S)\s+(\d+\s*[–-]\s*\d+|\d+\+)$/);
  if (ranged) return { name: ranged[1], level: ranged[2].replace(/\s+/g, "") };
  const single = text.match(/^(.*\S)\s+(\d+)$/);
  if (single) return { name: single[1], level: single[2] };
  return { name: text, level: "" };
}

function campLo(poi) {
  return poi.soloMin ?? poi.groupMin ?? 999;
}

function isHunt(poi) {
  return poi.kind === "camp" || poi.kind === "named";
}

function hasSolo(poi) {
  return poi.soloMin != null || poi.soloMax != null;
}

function hasGroup(poi) {
  return poi.groupMin != null || poi.groupMax != null;
}

export default function Hunt({ zones, pois, mobs = [], level, onShowPoi, onShowMob }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("me");
  const zoneById = useMemo(() => Object.fromEntries((zones || []).map((z) => [z.id, z])), [zones]);

  const q = query.trim().toLowerCase();
  const named = useMemo(() => (q.length >= 2 ? searchMobs(mobs, q, 24) : []), [mobs, q]);

  const camps = useMemo(() => {
    return (pois || []).filter((poi) => {
      if (!isHunt(poi)) return false;
      if (q && String(poi.id).startsWith("wiki-lv-")) return false;
      if (mode === "solo" && !fitsSolo(poi, level)) return false;
      if (mode === "group" && !fitsGroup(poi, level)) return false;
      if (mode === "me" && !huntSide(poi, level)) return false;
      if (!q) return true;
      const zone = zoneById[poi.zoneId];
      const hay = [poi.name, poi.monsters, poi.notes, zone?.name, KIND_LABEL[poi.kind]].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [pois, q, mode, level, zoneById]);

  const soloMine = mode === "me" ? camps.filter((poi) => huntSide(poi, level) === "solo") : [];
  const groupMine = mode === "me" ? camps.filter((poi) => huntSide(poi, level) === "group") : [];

  return (
    <div className="hunt-screen">
      <div className="hunt-bar">
        <input
          value={query}
          placeholder="Search a camp, monster, or zone…"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="hunt-modes">
          {MODES.map((item) => (
            <button key={item.id} type="button" className={mode === item.id ? "on" : ""} onClick={() => setMode(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <p className="hunt-count">
          {named.length > 0 ? `${named.length} named · ` : ""}
          {camps.length} camp{camps.length === 1 ? "" : "s"}
          {mode === "all" ? "" : ` for level ${level}`}
        </p>
      </div>
      <div className="hunt-body">
        {named.length > 0 && (
          <section className="hunt-block">
            <h2>Named</h2>
            {named.map((mob) => {
              const pin = pinForMob(mob, pois);
              return (
                <article key={mob.id} className="hunt-camp fits">
                  <header>
                    <div>
                      <h4>{mob.name}</h4>
                      <p className="hunt-kind">
                        {mob.zoneName || "Zone unknown"}
                        {mob.level ? ` · lvl ${mob.level}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="tiny"
                      onClick={() => onShowMob?.({ ...mob, poiId: pin?.id || null, zoneId: pin?.zoneId || mob.zoneId })}
                    >
                      {pin ? "Show on map" : mob.zoneId ? "Open zone" : "No map spot"}
                    </button>
                  </header>
                  <p className="hint">{mob.location || "The wiki names the zone, not a spot inside it."}</p>
                </article>
              );
            })}
          </section>
        )}
        {camps.length === 0 && named.length === 0 ? (
          <p className="empty">No camps match. Camps without a level only show under All camps.</p>
        ) : camps.length === 0 ? null : mode === "me" ? (
          <>
            <HuntBlock title={`Solo · level ${level}`} camps={soloMine} zoneById={zoneById} level={level} onShowPoi={onShowPoi} />
            <HuntBlock title={`Group · level ${level}`} camps={groupMine} zoneById={zoneById} level={level} onShowPoi={onShowPoi} />
          </>
        ) : (
          <ZoneList camps={camps} zoneById={zoneById} level={level} onShowPoi={onShowPoi} />
        )}
      </div>
    </div>
  );
}

function HuntBlock({ title, camps, zoneById, level, onShowPoi }) {
  return (
    <section className="hunt-block">
      <h2>{title}</h2>
      {camps.length === 0 ? (
        <p className="empty">Nothing in this range.</p>
      ) : (
        <ZoneList camps={camps} zoneById={zoneById} level={level} onShowPoi={onShowPoi} />
      )}
    </section>
  );
}

function ZoneList({ camps, zoneById, level, onShowPoi }) {
  const groups = new Map();
  for (const poi of camps) {
    const list = groups.get(poi.zoneId) || [];
    list.push(poi);
    groups.set(poi.zoneId, list);
  }
  const zones = [...groups.entries()].sort((a, b) => {
    const za = zoneById[a[0]];
    const zb = zoneById[b[0]];
    return (za?.levelMin ?? 99) - (zb?.levelMin ?? 99) || (za?.name || "").localeCompare(zb?.name || "");
  });
  return zones.map(([zoneId, list]) => {
    const zone = zoneById[zoneId];
    const sorted = [...list].sort((a, b) => campLo(a) - campLo(b) || a.name.localeCompare(b.name));
    return (
      <section key={zoneId} className="hunt-zone">
        <header>
          <h3>{zone?.name || zoneId}</h3>
          <span>
            {zone ? `zone ${zone.levelMin}–${zone.levelMax}` : ""}
            {` · ${sorted.length} camp${sorted.length === 1 ? "" : "s"}`}
          </span>
        </header>
        {sorted.map((poi) => (
          <CampRow key={poi.id} poi={poi} level={level} onShowPoi={onShowPoi} />
        ))}
      </section>
    );
  });
}

function CampRow({ poi, level, onShowPoi }) {
  const mobs = monsterList(poi.monsters).map(parseMob);
  const side = huntSide(poi, level);
  const known = hasHuntLevel(poi);
  return (
    <article className={`hunt-camp${side ? " fits" : ""}`}>
      <header>
        <div>
          <h4>{poi.name}</h4>
          <p className="hunt-kind">{KIND_LABEL[poi.kind] || poi.kind}</p>
        </div>
        <div className="hunt-ranges">
          {hasSolo(poi) ? <span className="solo">solo {rangeLabel({ soloMin: poi.soloMin, soloMax: poi.soloMax }).replace(/^solo /, "")}</span> : null}
          {hasGroup(poi) ? <span className="group">group {rangeLabel({ groupMin: poi.groupMin, groupMax: poi.groupMax }).replace(/^group /, "")}</span> : null}
          {!known ? <span className="unknown">levels unknown</span> : null}
          {side ? <span className="fit">{side} for you</span> : null}
        </div>
        <button type="button" className="tiny" onClick={() => onShowPoi(poi)}>
          Show on map
        </button>
      </header>
      {mobs.length > 0 ? (
        <ul className="hunt-mobs">
          {mobs.map((mob) => (
            <li key={`${poi.id}-${mob.name}-${mob.level}`}>
              <span>{mob.name}</span>
              {mob.level ? <em>{mob.level}</em> : <em className="unknown">no level</em>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">No monster list on this pin.</p>
      )}
      {poi.notes ? <p className="hint">{poi.notes}</p> : null}
    </article>
  );
}
