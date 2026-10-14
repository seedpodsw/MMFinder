import { useMemo, useState } from "react";
import { GATHERING, TRAINER_HINTS, parseRecipeChunk, rowStatus, skillCeil, skillFloor } from "./gathering";

const GATHER_ORDER = ["Mining", "Herbalism", "Lumberjacking", "Foraging"];

function statusLabel(status, req) {
  if (status === "locked") return `Need ${skillFloor(req)}`;
  if (status === "skillup") return "Skill-up";
  if (status === "trivial") return "Trivial";
  if (status === "open") return "Can use";
  return "";
}

function recipesFrom(items) {
  const rows = [];
  for (const item of items || []) {
    if (!item.recipe || item.recipe === "no known recipe") continue;
    const chunks = item.recipe.split("|").map((part) => part.trim()).filter(Boolean);
    const mats =
      item.materials && item.materials !== "no known recipe"
        ? item.materials.split("|").map((part) => part.trim())
        : [];
    chunks.forEach((chunk, index) => {
      const parsed = parseRecipeChunk(chunk);
      if (!parsed) return;
      rows.push({
        id: item.id,
        name: item.name,
        ...parsed,
        materials: mats[index] || (chunks.length === 1 ? mats[0] : "") || "",
      });
    });
  }
  return rows;
}

function skillCatalog(recipes) {
  const counts = new Map();
  for (const row of recipes) counts.set(row.skill, (counts.get(row.skill) || 0) + 1);
  const names = new Set([...counts.keys()].filter((name) => counts.get(name) >= 2));
  for (const name of GATHER_ORDER) names.add(name);
  const ordered = [
    ...GATHER_ORDER,
    ...[...names].filter((name) => !GATHER_ORDER.includes(name)).sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b)),
  ];
  return ordered.map((name) => ({
    name,
    recipes: counts.get(name) || 0,
    nodes: GATHERING[name]?.nodes.length || 0,
  }));
}

function matchesQuery(parts, query) {
  if (!query) return true;
  const hay = parts.filter(Boolean).join(" ").toLowerCase();
  return hay.includes(query);
}

export default function Trades({ items, pois, zones, onShowPoi, onSelectItem }) {
  const [skillName, setSkillName] = useState("Mining");
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState(1);
  const [mode, setMode] = useState("all");
  const zoneName = useMemo(() => {
    const map = new Map();
    for (const zone of zones || []) map.set(zone.id, zone.name);
    return (id) => map.get(id) || id;
  }, [zones]);

  const allRecipes = useMemo(() => recipesFrom(items), [items]);
  const catalog = useMemo(() => skillCatalog(allRecipes), [allRecipes]);
  const selected = catalog.some((row) => row.name === skillName) ? skillName : catalog[0]?.name || "Mining";
  const q = query.trim().toLowerCase();

  const nodes = (GATHERING[selected]?.nodes || [])
    .map((node) => ({ ...node, status: rowStatus(node.req, node.trivial, skill) }))
    .filter((node) => matchesQuery([node.name, node.where, node.yields, node.notes, node.req, node.trivial], q))
    .filter((node) => mode === "all" || (mode === "skillup" ? node.status === "skillup" : node.status && node.status !== "locked"))
    .sort((a, b) => (skillFloor(a.req) ?? 9999) - (skillFloor(b.req) ?? 9999) || a.name.localeCompare(b.name));

  const recipes = allRecipes
    .filter((row) => row.skill === selected)
    .map((row) => ({ ...row, status: rowStatus("", row.trivial, skill) }))
    .filter((row) => matchesQuery([row.name, row.materials, row.station, row.trivial], q))
    .filter((row) => mode === "all" || (mode === "skillup" ? row.status === "skillup" : row.status !== "locked"))
    .sort((a, b) => (skillCeil(a.trivial) ?? 9999) - (skillCeil(b.trivial) ?? 9999) || a.name.localeCompare(b.name));

  const hint = TRAINER_HINTS[selected];
  const trainers = (pois || [])
    .filter((poi) => poi.kind === "tradeskill" && hint && hint.test(`${poi.name} ${poi.notes || ""}`))
    .filter((poi) => matchesQuery([poi.name, poi.notes, zoneName(poi.zoneId)], q))
    .sort((a, b) => a.name.localeCompare(b.name));

  const gather = GATHERING[selected];

  return (
    <div className="hunt-screen trade-screen">
      <div className="hunt-bar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Node, recipe, material, place…"
          aria-label="Search tradeskills"
        />
        <label className="trade-skill-level">
          Your skill
          <input
            type="number"
            min="0"
            max="300"
            value={skill}
            onChange={(e) => setSkill(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <div className="hunt-modes">
          {[
            ["all", "All"],
            ["skillup", "Skill-ups"],
            ["open", "Can attempt"],
          ].map(([id, label]) => (
            <button key={id} type="button" className={mode === id ? "on" : ""} onClick={() => setMode(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="trade-layout">
        <nav className="trade-skills" aria-label="Tradeskills">
          {catalog.map((row) => (
            <button
              key={row.name}
              type="button"
              className={row.name === selected ? "on" : ""}
              onClick={() => setSkillName(row.name)}
            >
              <strong>{row.name}</strong>
              <span>
                {row.nodes ? `${row.nodes} nodes` : ""}
                {row.nodes && row.recipes ? " · " : ""}
                {row.recipes ? `${row.recipes} recipes` : ""}
              </span>
            </button>
          ))}
        </nav>
        <div className="hunt-body">
          {gather?.tool ? <p className="trade-tool">Tool: {gather.tool}</p> : null}
          {trainers.length ? (
            <section className="hunt-block">
              <h3>Trainers and vendors</h3>
              {trainers.map((poi) => (
                <article key={poi.id} className="hunt-camp">
                  <header>
                    <div>
                      <strong>{poi.name}</strong>
                      <p className="hunt-kind">{zoneName(poi.zoneId)}</p>
                    </div>
                    <button type="button" className="tiny" onClick={() => onShowPoi?.(poi)}>
                      Show on map
                    </button>
                  </header>
                  {poi.notes ? <p className="trade-notes">{poi.notes}</p> : null}
                </article>
              ))}
            </section>
          ) : null}
          {nodes.length ? (
            <section className="hunt-block">
              <h3>Nodes</h3>
              {nodes.map((node) => (
                <article key={node.name} className={`hunt-camp${node.status === "skillup" ? " fits" : ""}`}>
                  <header>
                    <div>
                      <strong>{node.name}</strong>
                      {node.where ? <p className="hunt-kind">{node.where}</p> : null}
                    </div>
                    <div className="hunt-ranges">
                      <span className="solo">Req {node.req || "?"}</span>
                      {node.trivial ? <span className="group">Trivial {node.trivial}</span> : null}
                      {statusLabel(node.status, node.req) ? (
                        <span className={node.status === "skillup" ? "fit" : ""}>{statusLabel(node.status, node.req)}</span>
                      ) : null}
                    </div>
                  </header>
                  {node.yields ? <p className="trade-notes">Yields {node.yields}</p> : null}
                  {node.notes ? <p className="trade-notes">{node.notes}</p> : null}
                </article>
              ))}
            </section>
          ) : null}
          {recipes.length ? (
            <section className="hunt-block">
              <h3>Recipes</h3>
              {recipes.map((row, index) => (
                <article key={`${row.id}-${index}`} className={`hunt-camp${row.status === "skillup" ? " fits" : ""}`}>
                  <header>
                    <div>
                      <button type="button" className="trade-item" onClick={() => onSelectItem?.((items || []).find((item) => item.id === row.id))}>
                        {row.name}
                        {row.qty && row.qty !== "1" ? ` ×${row.qty}` : ""}
                      </button>
                      {row.station ? <p className="hunt-kind">{row.station}</p> : null}
                    </div>
                    <div className="hunt-ranges">
                      {row.trivial ? <span className="group">Trivial {row.trivial}</span> : <span>Trivial unknown</span>}
                      {statusLabel(row.status, "") ? (
                        <span className={row.status === "skillup" ? "fit" : ""}>{statusLabel(row.status, "")}</span>
                      ) : null}
                    </div>
                  </header>
                  {row.materials ? <p className="trade-notes">{row.materials}</p> : null}
                </article>
              ))}
            </section>
          ) : null}
          {!trainers.length && !nodes.length && !recipes.length ? (
            <p className="hint">Nothing in {selected} matches this search or skill filter.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
