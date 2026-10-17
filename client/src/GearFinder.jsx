import { useEffect, useMemo, useRef, useState } from "react";
import {
  bestUpgrades,
  scoreItem,
  STATS,
  EQUIP_SLOTS,
  defaultStatWeights,
  normalizeStatWeights,
  weightsDiffer,
  priorityLabel,
} from "./gear";
import { characterLabel } from "./characters-store.js";

const ROLE_LABEL = {
  tank: "Tank",
  healer: "Healer",
  dps: "DPS",
  caster: "Caster",
  support: "Support",
};

const STORE_WEIGHTS = "mmfinder.gear.weights.v1";

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

function WeightField({ stat, value, leading, onChange }) {
  const [draft, setDraft] = useState(null);
  const shown = draft == null ? value : draft;
  return (
    <label className={`gear-weight${leading ? " is-top" : ""}`}>
      <span className="gear-weight-label">
        <strong>{stat.toUpperCase()}</strong>
        <input
          type="number"
          min="0"
          max="3"
          step="0.1"
          value={shown}
          aria-label={`${stat.toUpperCase()} weight`}
          onFocus={() => setDraft(String(value))}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value === "") return;
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          onBlur={() => setDraft(null)}
        />
      </span>
      <input
        type="range"
        min="0"
        max="3"
        step="0.1"
        value={value}
        aria-label={`${stat.toUpperCase()} priority`}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function UpgradeList({ token, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [token]);
  return (
    <ol ref={ref} className="gear-list">
      {children}
    </ol>
  );
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

export default function GearFinder({
  items,
  classes = [],
  characters = [],
  activeId = "",
  level = 1,
  klass = "",
  loadout = {},
  onSelectCharacter,
  onEquip,
  onUnequip,
  onOpenCharacters,
  onFarm,
  onSelectItem,
}) {
  const [onlyFarmable, setOnlyFarmable] = useState(true);
  const [onlyUpgrades, setOnlyUpgrades] = useState(false);
  const [slotKey, setSlotKey] = useState("");
  const [weightStore, setWeightStore] = useState(() => loadJSON(STORE_WEIGHTS, {}));
  const classId = klass || "";
  const lvl = level || 1;

  useEffect(() => {
    saveJSON(STORE_WEIGHTS, weightStore);
  }, [weightStore]);

  const cls = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const role = cls?.role || "dps";
  const defaults = useMemo(() => (classId ? defaultStatWeights(classId, role) : null), [classId, role]);
  const weights = useMemo(
    () => (defaults ? normalizeStatWeights(weightStore[classId], defaults) : null),
    [defaults, weightStore, classId]
  );
  const customWeights = Boolean(weights && defaults && weightsDiffer(weights, defaults));
  const topWeight = weights ? Math.max(...STATS.map((stat) => weights[stat])) : 0;

  const itemsById = useMemo(() => {
    const map = new Map();
    for (const it of items || []) map.set(it.id, it);
    return map;
  }, [items]);

  const results = useMemo(
    () =>
      classId
        ? bestUpgrades(items || [], {
            classId,
            role,
            level: lvl,
            onlyFarmable: false,
            nearLevel: onlyFarmable,
            order: "asc",
            perSlot: 0,
            slotKey,
            statWeights: weights,
          })
        : [],
    [items, classId, role, lvl, onlyFarmable, slotKey, weights]
  );

  function setStatWeight(stat, raw) {
    if (!classId || !defaults || !weights) return;
    if (raw === "" || raw == null) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const clamped = Math.max(0, Math.min(3, Math.round(n * 10) / 10));
    setWeightStore((prev) => {
      const nextWeights = { ...weights, [stat]: clamped };
      if (!weightsDiffer(nextWeights, defaults)) {
        const next = { ...prev };
        delete next[classId];
        return next;
      }
      return { ...prev, [classId]: nextWeights };
    });
  }

  function resetWeights() {
    if (!classId) return;
    setWeightStore((prev) => {
      const next = { ...prev };
      delete next[classId];
      return next;
    });
  }

  function equip(slot, itemId) {
    onEquip?.(slot, itemId);
  }
  function unequip(slot) {
    onUnequip?.(slot);
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

        {characters.length > 0 && (
          <label className="gear-ctl">
            <span>Character</span>
            <select value={activeId || ""} onChange={(e) => onSelectCharacter?.(e.target.value)}>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {characterLabel(character, classes)}
                </option>
              ))}
            </select>
          </label>
        )}

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
          <span>Around my level</span>
        </label>

        <label className="gear-farmable">
          <input type="checkbox" checked={onlyUpgrades} onChange={(e) => setOnlyUpgrades(e.target.checked)} />
          <span>Only upgrades vs my gear</span>
        </label>

        {classId && weights && (
          <p className="gear-meta">
            {cls?.name} · level {lvl} · {ROLE_LABEL[role] || role} · {priorityLabel(weights)} · {totalFound} matches
            {equippedCount > 0 && ` · ${equippedCount} equipped`}
          </p>
        )}
      </div>

      {classId && weights && (
        <section className="gear-weights" aria-label="Stat priority">
          <div className="gear-weights-head">
            <span>Stat priority</span>
            <button type="button" className="gear-reset" onClick={resetWeights} disabled={!customWeights}>
              Reset {cls?.name || "class"}
            </button>
          </div>
          <div className="gear-weight-grid">
            {STATS.map((stat) => (
              <WeightField
                key={stat}
                stat={stat}
                value={weights[stat]}
                leading={weights[stat] > 0 && weights[stat] === topWeight}
                onChange={(next) => setStatWeight(stat, next)}
              />
            ))}
          </div>
        </section>
      )}

      {!characters.length ? (
        <div className="gear-empty">
          <p>Add a character.</p>
          <button type="button" className="add char-go" onClick={onOpenCharacters}>
            Add a character
          </button>
        </div>
      ) : !classId ? (
        <div className="gear-empty">
          <p>Pick a class.</p>
          <button type="button" className="add char-go" onClick={onOpenCharacters}>
            Edit character
          </button>
        </div>
      ) : (
        <div className={`gear-grid ${slotKey ? "single" : ""}`}>
          {results.map((group) => {
            const equippedId = loadout[group.slot];
            const equippedItem = equippedId ? itemsById.get(equippedId) : null;
            const equippedScore = equippedItem
              ? scoreItem(equippedItem, role, null, group.weapon, weights)
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

                {equippedId && (
                  <div className="gear-equipped">
                    <span className="gear-eq-tag">Equipped</span>
                    {equippedItem ? (
                      <button className="gear-name" onClick={() => onSelectItem?.(equippedItem)}>
                        {equippedItem.name}
                      </button>
                    ) : (
                      <span className="gear-name">Missing item</span>
                    )}
                    {equippedScore != null && <span className="gear-score">{equippedScore}</span>}
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
                  <UpgradeList token={suggestions.map((row) => row.item.id).join("|")}>
                    {suggestions.map(({ item, score, summary }, i) => {
                      const canJump = Boolean(item.primaryPoiId || item.primaryZoneId || item.zoneName);
                      const delta = equippedScore != null ? score - equippedScore : null;
                      const isUpgrade = delta != null && delta > 0;
                      const isBest = i === suggestions.length - 1 && (equippedScore == null || score > equippedScore);
                      return (
                        <li key={item.id} className={[isUpgrade ? "is-upgrade" : "", isBest ? "is-best" : ""].filter(Boolean).join(" ")}>
                          <div className="gear-row-top">
                            <button className="gear-name" onClick={() => onSelectItem?.(item)} title="Open item">
                              {isBest && <span className="gear-best">★</span>}
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
                            {item.level && <span className="gear-lvl">{item.level}</span>}
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
                  </UpgradeList>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
