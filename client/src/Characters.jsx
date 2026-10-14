import { useEffect, useMemo, useState } from "react";
import { basicStatRows, canUseByClass, EQUIP_SLOTS, matchesSlot } from "./gear.js";
import {
  clampLevel,
  createCharacter,
  deleteCharacter,
  equipItem,
  patchCharacter,
  selectCharacter,
  unequipItem,
} from "./characters-store.js";

const GROUPS = [
  { title: "Weapons", keys: ["PRIMARY", "SECONDARY", "RANGE", "AMMO"] },
  {
    title: "Armor",
    keys: [
      "HEAD",
      "FACE",
      "EAR",
      "EAR2",
      "NECK",
      "SHOULDERS",
      "BACK",
      "CHEST",
      "SHIRT",
      "WRIST",
      "WRIST2",
      "HANDS",
      "FINGER",
      "FINGER2",
      "WAIST",
      "LEGS",
      "FEET",
    ],
  },
];

function className(classes, classId) {
  return classes.find((c) => c.id === classId)?.name || "No class";
}

function LevelField({ level, onCommit }) {
  const [draft, setDraft] = useState(null);
  const shown = draft == null ? level : draft;
  return (
    <label className="char-field">
      <span>Level</span>
      <input
        type="number"
        min="1"
        max="60"
        value={shown}
        onFocus={() => setDraft(String(level))}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number(draft);
          if (draft !== "" && Number.isFinite(n)) onCommit(n);
          setDraft(null);
        }}
      />
    </label>
  );
}

function StatRows({ item, weapon }) {
  const rows = basicStatRows(item, weapon);
  if (!rows.length) return null;
  return (
    <dl className="char-stat-rows">
      {rows.map((row) => (
        <div key={row.label} className="char-stat-row">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SlotRow({ slot, item, equippedId, query, matches, onQuery, onEquip, onClear, onOpen }) {
  const open = query.slot === slot.key;
  return (
    <div className="char-slot">
      <div className="char-slot-head">
        <span className="char-slot-label">{slot.label}</span>
        {(item || equippedId) && (
          <button type="button" className="gear-x" aria-label={`Clear ${slot.label}`} onClick={onClear}>
            ×
          </button>
        )}
      </div>
      <input
        value={open ? query.text : ""}
        placeholder={`Find ${slot.label.toLowerCase()}`}
        aria-label={`Find ${slot.label}`}
        onChange={(e) => onQuery(slot.key, e.target.value)}
      />
      {open && query.text.trim() && (
        <ul className="char-results">
          {matches.length === 0 ? (
            <li className="char-none">Nothing in this slot matches.</li>
          ) : (
            matches.map((match) => (
              <li key={match.id}>
                <button type="button" onClick={() => onEquip(match.id)}>
                  <strong>{match.name}</strong>
                  <StatRows item={match} weapon={slot.weapon} />
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {item ? (
        <div className="char-slot-body">
          <button type="button" className="gear-name char-slot-item" onClick={() => onOpen(item)}>
            {item.name}
          </button>
          <StatRows item={item} weapon={slot.weapon} />
        </div>
      ) : (
        <p className="char-empty">{equippedId ? "Missing item" : "Empty"}</p>
      )}
    </div>
  );
}

export default function Characters({ book, classes = [], items = [], onChange, onOpenItem }) {
  const active = book.characters.find((character) => character.id === book.activeId) || null;
  const [draft, setDraft] = useState({
    name: "",
    classId: active?.classId || "",
    level: active?.level || 1,
  });
  const [name, setName] = useState(active?.name || "");
  const [query, setQuery] = useState({ slot: "", text: "" });
  const [confirmId, setConfirmId] = useState("");

  useEffect(() => {
    if (!draft.classId && classes[0]) setDraft((prev) => (prev.classId ? prev : { ...prev, classId: classes[0].id }));
  }, [classes, draft.classId]);

  useEffect(() => {
    setName(active?.name || "");
    setQuery({ slot: "", text: "" });
    setConfirmId("");
  }, [active?.id]);

  const itemsById = useMemo(() => {
    const map = new Map();
    for (const item of items) if (item?.id) map.set(item.id, item);
    return map;
  }, [items]);

  const matches = useMemo(() => {
    const slot = EQUIP_SLOTS.find((row) => row.key === query.slot);
    const text = query.text.trim().toLowerCase();
    if (!slot || !text || !active) return [];
    const found = [];
    for (const item of items) {
      if (!item?.id || !item.name) continue;
      if (!item.name.toLowerCase().includes(text)) continue;
      if (!matchesSlot(item, slot)) continue;
      if (!canUseByClass(item, active.classId)) continue;
      found.push(item);
    }
    found.sort((a, b) => {
      const as = a.name.toLowerCase().startsWith(text) ? 0 : 1;
      const bs = b.name.toLowerCase().startsWith(text) ? 0 : 1;
      return as - bs || a.name.localeCompare(b.name);
    });
    return found.slice(0, 8);
  }, [items, query, active]);

  function commitName() {
    if (!active) return;
    const next = name.trim();
    if (!next) {
      setName(active.name);
      return;
    }
    setName(next);
    onChange(patchCharacter(book, active.id, { name: next }));
  }

  function addCharacter(event) {
    event.preventDefault();
    const next = createCharacter(book, draft);
    if (next === book) return;
    onChange(next);
    setDraft({ name: "", classId: draft.classId, level: draft.level });
  }

  return (
    <div className="chars-screen">
      <aside className="chars-list">
        <p className="eyebrow">My characters</p>
        <h2>Who you are</h2>
        <p className="chars-lead">The one you select is the level and class up top, and the gear Upgrades ranks against.</p>
        <ul>
          {book.characters.map((character) => {
            const equipped = Object.keys(character.gear).length;
            return (
              <li key={character.id}>
                <button
                  type="button"
                  className={character.id === book.activeId ? "on" : ""}
                  aria-current={character.id === book.activeId ? "true" : undefined}
                  onClick={() => onChange(selectCharacter(book, character.id))}
                >
                  <strong>{character.name}</strong>
                  <span>
                    {className(classes, character.classId)} · level {character.level}
                    {equipped ? ` · ${equipped} equipped` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {book.characters.length >= 12 ? (
          <p className="chars-lead">Twelve is the bench.</p>
        ) : (
          <form className="char-create" onSubmit={addCharacter}>
            <p className="char-slot-label">New character</p>
            <input
              value={draft.name}
              maxLength={24}
              placeholder="Name"
              aria-label="New character name"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <label className="char-field">
              <span>Class</span>
              <select
                value={draft.classId}
                aria-label="New character class"
                onChange={(e) => setDraft({ ...draft, classId: e.target.value })}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="char-field">
              <span>Level</span>
              <input
                type="number"
                min="1"
                max="60"
                aria-label="New character level"
                value={draft.level}
                onChange={(e) => setDraft({ ...draft, level: clampLevel(e.target.value) })}
              />
            </label>
            <button className="add" type="submit" disabled={!draft.name.trim()}>
              Add character
            </button>
          </form>
        )}
      </aside>

      {active ? (
        <section className="chars-sheet">
          <input
            className="char-name"
            maxLength={24}
            aria-label="Character name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
          />
          <div className="char-identity">
            <label className="char-field">
              <span>Class</span>
              <select
                value={active.classId}
                aria-label="Character class"
                onChange={(e) => onChange(patchCharacter(book, active.id, { classId: e.target.value }))}
              >
                <option value="">Pick a class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <LevelField
              key={active.id}
              level={active.level}
              onCommit={(nextLevel) => onChange(patchCharacter(book, active.id, { level: nextLevel }))}
            />
            <button
              type="button"
              className="char-delete"
              onClick={() => {
                if (confirmId === active.id) onChange(deleteCharacter(book, active.id));
                else setConfirmId(active.id);
              }}
            >
              {confirmId === active.id ? `Delete ${active.name}` : "Delete"}
            </button>
          </div>
          {GROUPS.map((group) => (
            <section key={group.title} className="char-group">
              <h3>{group.title}</h3>
              <div className="char-slots">
                {EQUIP_SLOTS.filter((slot) => group.keys.includes(slot.key)).map((slot) => (
                  <SlotRow
                    key={slot.key}
                    slot={slot}
                    item={itemsById.get(active.gear[slot.key]) || null}
                    equippedId={active.gear[slot.key] || ""}
                    query={query}
                    matches={query.slot === slot.key ? matches : []}
                    onQuery={(slotKey, text) => setQuery({ slot: slotKey, text })}
                    onEquip={(itemId) => {
                      onChange(equipItem(book, active.id, slot.key, itemId));
                      setQuery({ slot: "", text: "" });
                    }}
                    onClear={() => onChange(unequipItem(book, active.id, slot.key))}
                    onOpen={onOpenItem}
                  />
                ))}
              </div>
            </section>
          ))}
        </section>
      ) : (
        <div className="chars-sheet chars-empty">
          <p>Add a character. Their level, class, and gear stay in this browser.</p>
        </div>
      )}
    </div>
  );
}
