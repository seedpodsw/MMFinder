import { useEffect, useMemo, useState } from "react";
import { bestUpgrades, scoreItem, statSummary, CLASS_PRIMARY, EQUIP_SLOTS } from "./gear";

const ROLE_LABEL = {
  tank: "Tank",
  healer: "Healer",
  dps: "DPS",
  caster: "Caster",
  support: "Support",
};

const STORE_LOADOUT = "mmfinder.gear.loadout.v1";

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function DeltaBadge({ delta }) {
  if (delta == null) return null;
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return <span className="gear-delta even">±0</span>;
  const up = rounded > 0;
  return (
    <span className={`gear-delta ${up ? "up" : "down"}`}>
      {up ? "+" : "−"}
      {Math.abs(rounded)}
    </span>
  );
}

export default function GearFinder({ items, classes = [], level = 1, klass = "", onFarm, onSelectItem }) {
  const [classId, setClassId] = useState(klass || "");
  const [lvl, setLvl] = useState(level || 1);
  const [onlyFarmable, setOnlyFarmable] = useState(true);
  const [onlyUpgrades, setOnlyUpgrades] = useState(false);
  const [slotKey, setSlotKey] = useState("");
  const [loadout, setLoadout] = useState(() => loadJSON(STORE_LOADOUT, {}));

  useEffect(() => {
    saveJSON(STORE_LOADOUT, loadout);
  }, [loadout]);

  const cls = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const role = cls?.role || "dps";
  const primaryStat = CLASS_PRIMARY[classId] || "str";

  const itemsById = useMemo(() => {
    const map = new Map();
    for (const it of items || []) map.set(it.id, it);
    return map;
  }, [items]);

  const perSlot = slotKey ? (onlyUpgrades ? 40 : 20) : onlyUpgrades ? 8 : 4;
  const results = useMemo(
    () =>
      classId
        ? bestUpgrades(items || [], { classId, role, level: lvl, onlyFarmable, slotKey, perSlot })
        : [],
    [items, classId, role, lvl, onlyFarmable, slotKey, perSlot]
  );

  function equip(slot, itemId) {
    setLoadout((prev) => ({ ...prev, [slot]: itemId }));
  }
  function unequip(slot) {
    setLoadout((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }

  const equippedCount = Object.keys(loadout).length;
  const totalFound = results.reduce((s, r) => s + r.items.length, 0);

  return (
    <div className="gear-view">
      <div className="gear-toolbar">
        <div className="items-title">
          <p className="eyebrow">Upgrade Finder</p>
          <h2>Best gear you can farm</h2>
        </div>

        <label className="gear-ctl">
          <span>Class</span>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Pick a class…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="gear-ctl">
          <span>Level</span>
          <input type="number" min="1" max="60" value={lvl} onChange={(e) => setLvl(Number(e.target.value) || 1)} />
        </label>

        <label className="gear-ctl">
          <span>Slot</span>
          <select value={slotKey} onChange={(e) => setSlotKey(e.target.value)}>
            <option value="">All slots</option>
            {EQUIP_SLOTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="gear-farmable">
          <input type="checkbox" checked={onlyFarmable} onChange={(e) => setOnlyFarmable(e.target.checked)} />
          <span>Farmable at my level</span>
        </label>

        <label className="gear-farmable">
          <input type="checkbox" checked={onlyUpgrades} onChange={(e) => setOnlyUpgrades(e.target.checked)} />
          <span>Only upgrades vs my gear</span>
        </label>

        {classId && (
          <p className="gear-meta">
            {ROLE_LABEL[role] || role} · weights {primaryStat.toUpperCase()} · {totalFound} matches
            {equippedCount > 0 && ` · ${equippedCount} equipped`}
          </p>
        )}
      </div>

      {!classId ? (
        <div className="gear-empty">
          <p>
            Pick a class to see the best farmable upgrades for every slot, ranked by stats. Mark what you already have
            with <strong>Equip</strong> to see only real upgrades.
          </p>
        </div>
      ) : (
        <div className={`gear-grid ${slotKey ? "single" : ""}`}>
          {results.map((group) => {
            const equippedId = loadout[group.slot];
            const equippedItem = equippedId ? itemsById.get(equippedId) : null;
            const equippedScore = equippedItem
              ? scoreItem(equippedItem, role, primaryStat, group.weapon)
              : null;

            const suggestions = group.items.filter((x) => {
              if (x.item.id === equippedId) return false;
              if (onlyUpgrades && equippedScore != null && x.score <= equippedScore) return false;
              return true;
            });

            return (
              <article key={group.slot} className="gear-card">
                <header>
                  <h3>{group.label}</h3>
                  <span className="gear-count">{suggestions.length}</span>
                </header>

                {equippedItem && (
                  <div className="gear-equipped">
                    <span className="gear-eq-tag">Equipped</span>
                    <button className="gear-name" onClick={() => onSelectItem?.(equippedItem)}>
                      {equippedItem.name}
                    </button>
                    <span className="gear-score">{equippedScore}</span>
                    <button className="gear-x" title="Clear" onClick={() => unequip(group.slot)}>
                      ×
                    </button>
                  </div>
                )}

                {suggestions.length === 0 ? (
                  <p className="gear-none">
                    {equippedItem ? "Nothing beats what you have." : "No matches at this level."}
                  </p>
                ) : (
                  <ol className="gear-list">
                    {suggestions.map(({ item, score, summary }, i) => {
                      const canJump = Boolean(item.primaryPoiId || item.primaryZoneId || item.zoneName);
                      const delta = equippedScore != null ? score - equippedScore : null;
                      const isUpgrade = delta != null && delta > 0;
                      return (
                        <li key={item.id} className={isUpgrade ? "is-upgrade" : ""}>
                          <div className="gear-row-top">
                            <button className="gear-name" onClick={() => onSelectItem?.(item)} title="Open item">
                              {i === 0 && !equippedItem && <span className="gear-best">★</span>}
                              {item.name}
                            </button>
                            <span className="gear-scores">
                              <DeltaBadge delta={delta} />
                              <span className="gear-score" title="Upgrade score">
                                {score}
                              </span>
                            </span>
                          </div>
                          {summary && <p className="gear-stats">{summary}</p>}
                          <p className="gear-where">
                            {canJump ? (
                              <button className="items-farm-link" onClick={() => onFarm?.(item)} title="Show on map">
                                {item.farmAt || item.how || "Show on map"}
                              </button>
                            ) : (
                              <span className="items-muted">{item.farmAt || item.how || "Source unknown"}</span>
                            )}
                            {item.wikiUrl && (
                              <a className="items-farm-link gear-wiki" href={item.wikiUrl} target="_blank" rel="noreferrer">
                                Wiki
                              </a>
                            )}
                            <button className="gear-equip" title="Mark as equipped" onClick={() => equip(group.slot, item.id)}>
                              Equip
                            </button>
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
