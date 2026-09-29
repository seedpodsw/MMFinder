import { Fragment, useEffect, useMemo, useState } from "react";
import spellIndex from "../../data/spells/index.json";
import spellMeta from "../../data/spells/meta.json";
import {
  QUICK_TAG_GROUPS,
  SORT_OPTIONS,
  classFileId,
  entryKey,
  filterEntries,
  getAvailableTags,
  getTagColor,
  isQuickGroupActive,
  quickGroupTitle,
  sortAvailableTags,
  sortDisplayTags,
  sortEntries,
  tagLabel,
  toggleQuickGroup,
} from "../../shared/spells.js";

const classModules = import.meta.glob("../../data/spells/classes/*.json");
const classes = [...spellIndex.classes].sort((a, b) => a.name.localeCompare(b.name));

function loadClass(id) {
  const key = Object.keys(classModules).find((path) => path.endsWith(`/${id}.json`));
  if (!key) return Promise.reject(new Error(`No spell list for ${id}`));
  return classModules[key]().then((mod) => mod.default || mod);
}

function SpellRow({ entry, expanded, onToggle }) {
  const tags = sortDisplayTags(entry.tags || [], entry.primaryTag);
  return (
    <>
      <tr className={expanded ? "open" : ""} onClick={() => onToggle(entryKey(entry))}>
        <td className="lvl">{entry.level}</td>
        <td>
          <span className="spell-name">{entry.name}</span>
          {entry.wikiUrl && (
            <a
              className="spell-wiki"
              href={entry.wikiUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              wiki
            </a>
          )}
        </td>
        <td className="spell-values">{entry.valuesSummary || "—"}</td>
        <td>{entry.category || "—"}</td>
        <td>{entry.location || "—"}</td>
        <td>{entry.mana === "" || entry.mana == null ? "—" : entry.mana}</td>
        <td>{entry.castTime || "—"}</td>
        <td>
          <span className="spell-tags">
            {tags.length
              ? tags.map((tag) => (
                  <span key={tag} className="spell-tag" style={{ "--tag": getTagColor(tag) }}>
                    {tagLabel(tag)}
                  </span>
                ))
              : "—"}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="spell-detail">
          <td colSpan={8}>{entry.description || "No description."}</td>
        </tr>
      )}
    </>
  );
}

export default function Spells({ klass, onClass, level }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [tags, setTags] = useState(() => new Set());
  const [levelMin, setLevelMin] = useState("");
  const [sort, setSort] = useState("level-asc");
  const [primaryTagOnly, setPrimaryTagOnly] = useState(false);
  const [groupByLevel, setGroupByLevel] = useState(false);
  const [capToLevel, setCapToLevel] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());

  const selected = classes.find((item) => classFileId(item) === klass) || null;

  useEffect(() => {
    if (!klass) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setEntries([]);
    setTags(new Set());
    setExpanded(new Set());
    setLevelMin("");
    loadClass(klass)
      .then((data) => {
        if (!cancelled) setEntries(data.entries || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setEntries([]);
          setLoadError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [klass]);

  const filters = useMemo(
    () => ({
      search,
      tags,
      levelMin: levelMin === "" ? null : Number(levelMin),
      levelMax: capToLevel ? level : null,
      primaryTagOnly,
    }),
    [search, tags, levelMin, capToLevel, level, primaryTagOnly]
  );

  const availableTags = useMemo(() => getAvailableTags(entries), [entries]);
  const shown = useMemo(() => sortEntries(filterEntries(entries, filters), sort), [entries, filters, sort]);
  const typeLabel = selected?.type === "spell" ? "spells" : "abilities";
  const categoryHeader = selected?.type === "spell" ? "School" : "Skill";
  const fetched = spellMeta.fetchedAt || spellMeta.taggedAt;

  function toggleRow(key) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleTag(tag) {
    setTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  const groups = useMemo(() => {
    if (!groupByLevel) return null;
    const map = new Map();
    for (const entry of shown) {
      if (!map.has(entry.level)) map.set(entry.level, []);
      map.get(entry.level).push(entry);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [groupByLevel, shown]);

  return (
    <div className="spells-view">
      <div className="items-toolbar">
        <div className="items-title">
          <h2>Spells</h2>
          <p className="spells-credit">
            Lists, tags, and values from{" "}
            <a href="https://fustv1337.github.io/MnMWebsite" target="_blank" rel="noreferrer">
              FuStv1337’s spell site
            </a>{" "}
            ·{" "}
            <a href="https://github.com/FuStv1337/MnMWebsite" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </p>
        </div>
        <label className="items-search">
          Class
          <select value={klass} onChange={(event) => onClass(event.target.value)}>
            <option value="">Pick a class</option>
            {classes.map((item) => (
              <option key={classFileId(item)} value={classFileId(item)}>
                {item.name} ({item.entryCount} {item.type === "spell" ? "spells" : "abilities"})
              </option>
            ))}
          </select>
        </label>
        <label className="items-search">
          Search
          <input
            value={search}
            placeholder="Name, school, or description"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="items-search">
          Min level
          <input
            type="number"
            min="1"
            max="99"
            value={levelMin}
            onChange={(event) => setLevelMin(event.target.value)}
          />
        </label>
        <label className="items-search">
          Sort
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="spell-check">
          <input type="checkbox" checked={capToLevel} onChange={(event) => setCapToLevel(event.target.checked)} />
          Up to level {level}
        </label>
        <label className="spell-check">
          <input
            type="checkbox"
            checked={groupByLevel}
            onChange={(event) => setGroupByLevel(event.target.checked)}
          />
          Group by level
        </label>
        <button
          type="button"
          className="items-btn ghost"
          onClick={() => {
            setSearch("");
            setTags(new Set());
            setLevelMin("");
            setSort("level-asc");
            setPrimaryTagOnly(false);
            setGroupByLevel(false);
            setCapToLevel(true);
            setExpanded(new Set());
          }}
        >
          Reset
        </button>
      </div>

      {selected && (
        <div className="spell-filters">
          <div className="spell-quick">
            <span>Quick</span>
            {QUICK_TAG_GROUPS.map((group) => {
              const members = group.tags.filter((tag) => availableTags.some((item) => item.tag === tag));
              if (!members.length) return null;
              const active = isQuickGroupActive(group, availableTags, tags);
              return (
                <button
                  key={group.id}
                  type="button"
                  className={active ? "on" : ""}
                  title={quickGroupTitle(group, availableTags)}
                  style={{ "--tag": group.color }}
                  onClick={() => setTags((current) => toggleQuickGroup(group, availableTags, current))}
                >
                  {group.label}
                </button>
              );
            })}
          </div>
          <div className="spell-tag-row">
            <label className="spell-check">
              <input
                type="checkbox"
                checked={primaryTagOnly}
                onChange={(event) => setPrimaryTagOnly(event.target.checked)}
              />
              Primary tag only
            </label>
            {tags.size > 0 && (
              <button type="button" className="items-btn small ghost" onClick={() => setTags(new Set())}>
                Clear tags
              </button>
            )}
            {sortAvailableTags(availableTags).map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                className={`spell-chip ${tags.has(tag) ? "on" : ""}`}
                style={{ "--tag": getTagColor(tag) }}
                onClick={() => toggleTag(tag)}
              >
                {tagLabel(tag)}
                <em>{count}</em>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="spell-count">
        {!selected
          ? "Pick a class to open its spell or ability list."
          : loading
            ? `Loading ${selected.name}…`
            : loadError
              ? loadError
              : `${shown.length} of ${entries.length} ${typeLabel} for ${selected.name}`}
        {selected?.wikiUrl && (
          <>
            {" "}
            ·{" "}
            <a href={selected.wikiUrl} target="_blank" rel="noreferrer">
              class wiki
            </a>
          </>
        )}
      </p>

      <div className="spell-table-wrap">
        {selected && !loading && !shown.length ? (
          <p className="spell-empty">Nothing matches these filters.</p>
        ) : (
          selected &&
          !loading && (
            <table className="spell-table">
              <thead>
                <tr>
                  <th>Lvl</th>
                  <th>Name</th>
                  <th>Values</th>
                  <th>{categoryHeader}</th>
                  <th>Location</th>
                  <th>Mana</th>
                  <th>Cast</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {groups
                  ? groups.map(([groupLevel, groupEntries]) => (
                      <Fragment key={`level-${groupLevel}`}>
                        <tr className="spell-group">
                          <td colSpan={8}>
                            Level {groupLevel} ({groupEntries.length})
                          </td>
                        </tr>
                        {groupEntries.map((entry) => (
                          <SpellRow
                            key={entryKey(entry)}
                            entry={entry}
                            expanded={expanded.has(entryKey(entry))}
                            onToggle={toggleRow}
                          />
                        ))}
                      </Fragment>
                    ))
                  : shown.map((entry) => (
                      <SpellRow
                        key={entryKey(entry)}
                        entry={entry}
                        expanded={expanded.has(entryKey(entry))}
                        onToggle={toggleRow}
                      />
                    ))}
              </tbody>
            </table>
          )
        )}
      </div>

      <p className="spells-foot">
        {spellMeta.totalEntries} entries · {spellMeta.uniqueEntries} unique · pulled{" "}
        {fetched ? new Date(fetched).toLocaleDateString() : "from the wiki"} from{" "}
        <a href={spellMeta.source} target="_blank" rel="noreferrer">
          Spells by Class
        </a>
        . Tagging and the browser this view follows are{" "}
        <a href="https://github.com/FuStv1337/MnMWebsite" target="_blank" rel="noreferrer">
          FuStv1337/MnMWebsite
        </a>
        .
      </p>
    </div>
  );
}
