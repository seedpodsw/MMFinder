import { useState } from "react";

function shown(value) {
  if (value == null || value === "") return "";
  return String(value);
}

function stat(item, key) {
  const raw = item?.[key];
  if (raw == null || raw === "") return "";
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? String(n) : "";
}

function columnFields(item) {
  const effect = [item.effect, item.effect1, item.effect2, item.effect3].filter(Boolean).join(" · ");
  return {
    skill: shown(item.skill),
    size: shown(item.size),
    classReq: shown(item.class),
    race: shown(item.race),
    magic: shown(item.magic),
    unique: shown(item.unique),
    ac: stat(item, "ac"),
    dmg: stat(item, "dmg"),
    delay: stat(item, "delay"),
    weight: stat(item, "weight"),
    str: stat(item, "str"),
    sta: stat(item, "sta"),
    agi: stat(item, "agi"),
    dex: stat(item, "dex"),
    int: stat(item, "int"),
    wis: stat(item, "wis"),
    cha: stat(item, "cha"),
    hp: stat(item, "hp"),
    mana: stat(item, "mana"),
    hp_regen: stat(item, "hp_regen"),
    mana_regen: stat(item, "mana_regen"),
    haste: stat(item, "haste"),
    spell_haste: stat(item, "spell_haste"),
    ranged_haste: stat(item, "ranged_haste"),
    mr: stat(item, "mr"),
    fr: stat(item, "fr"),
    cr: stat(item, "cr"),
    dr: stat(item, "dr"),
    pr: stat(item, "pr"),
    er: stat(item, "er"),
    hr: stat(item, "hr"),
    cor: stat(item, "cor"),
    effect,
  };
}

function SheetGroup({ title, fields }) {
  return (
    <section className="item-sheet-group">
      <h4>{title}</h4>
      <dl className="item-sheet">
        {fields.map((field) => (
          <div key={field.label} className={field.wide ? "wide" : ""}>
            <dt>{field.label}</dt>
            <dd className={field.node || field.value ? "" : "empty"}>{field.node || field.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ItemColumns({ item }) {
  const values = columnFields(item);
  const field = (label, key, wide = false) => ({ label, value: values[key], wide });
  return (
    <div className="item-columns">
      <SheetGroup
        title="Requirements"
        fields={[
          field("Skill", "skill"),
          field("Size", "size"),
          field("Class", "classReq", true),
          field("Race", "race"),
          field("Magic", "magic"),
          field("Unique", "unique"),
        ]}
      />
      <SheetGroup title="Combat" fields={[field("AC", "ac"), field("DMG", "dmg"), field("Delay", "delay"), field("Wt", "weight")]} />
      <SheetGroup
        title="Attributes"
        fields={[
          field("STR", "str"),
          field("STA", "sta"),
          field("AGI", "agi"),
          field("DEX", "dex"),
          field("INT", "int"),
          field("WIS", "wis"),
          field("CHA", "cha"),
        ]}
      />
      <SheetGroup
        title="Pools"
        fields={[
          field("HP", "hp"),
          field("Mana", "mana"),
          field("HP Reg", "hp_regen"),
          field("Mana Reg", "mana_regen"),
          field("Haste", "haste"),
          field("SpHaste", "spell_haste"),
          field("RngHaste", "ranged_haste"),
        ]}
      />
      <SheetGroup
        title="Resists"
        fields={[
          field("MR", "mr"),
          field("FR", "fr"),
          field("CR", "cr"),
          field("DR", "dr"),
          field("PR", "pr"),
          field("ER", "er"),
          field("HR", "hr"),
          field("CoR", "cor"),
        ]}
      />
      <SheetGroup title="Effect" fields={[field("Effect", "effect", true)]} />
    </div>
  );
}

export default function ItemCard({ item, onSellStop, onShowPoi, onShowZone, onOpenQuest, goLabel = "", titleId, columns = false }) {
  const [tab, setTab] = useState("details");
  if (!item) return null;
  const sources = item.sources || [];
  const drops = sources.filter((src) => src.method === "drop");
  const other = sources.filter((src) => src.method !== "quest" && src.method !== "drop");
  const quests = sources.filter((src) => src.method === "quest" && src.questId);

  function placeButton(src) {
    if (goLabel && (src.poiId || src.zoneId)) {
      return (
        <button
          type="button"
          className="go-loc"
          onClick={() => (src.poiId ? onShowPoi?.(src.poiId) : onShowZone?.(src.zoneId))}
        >
          {goLabel}
        </button>
      );
    }
    return (
      <>
        {src.poiId && (
          <>
            {" "}
            <button type="button" className="linkish" onClick={() => onShowPoi?.(src.poiId)}>
              Show on map
            </button>
          </>
        )}
        {!src.poiId && src.zoneId && (
          <>
            {" "}
            <button type="button" className="linkish" onClick={() => onShowZone?.(src.zoneId)}>
              Open zone
            </button>
          </>
        )}
      </>
    );
  }

  function sourceList(list) {
    return (
      <ul className="item-sources">
        {list.map((src, i) => (
          <li key={`${src.method}-${src.npc || src.label}-${i}`}>
            <strong>{src.method}</strong>: {src.label}
            {src.level && <span className="src-lvl"> ({src.level})</span>}
            {src.monsters && <span className="src-mobs"> · {src.monsters}</span>}
            {src.location && <span className="src-loc"> · {src.location}</span>}
            {placeButton(src)}
            {src.questId && (
              <button type="button" className="linkish" onClick={() => onOpenQuest?.(src)}>
                Quest steps
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  const details = (
    <>
      <p className="hint">{item.how || "How to get unknown"}</p>
      <p className="rail-label">Sell to</p>
      {(item.sellTos || []).length > 0 ? (
        <ul className="item-sources">
          {item.sellTos.map((stop, i) => (
            <li key={`${stop.name}-${stop.zone}-${i}`}>
              {goLabel ? (
                <span>
                  {stop.type}
                  {stop.zone ? ` · ${stop.zone}` : ""}
                </span>
              ) : (
                <button type="button" className="linkish" onClick={() => onSellStop?.(stop)}>
                  {stop.type}
                  {stop.zone ? ` · ${stop.zone}` : ""}
                </button>
              )}
              {stop.place ? <span className="src-loc"> · {stop.place}</span> : null}
              {stop.pin ? <span className="src-loc"> · {stop.pin}</span> : null}
              {stop.buys ? <span className="src-mobs"> · buys {stop.buys}</span> : null}
              {goLabel && (stop.poiId || stop.zoneId) && (
                <button type="button" className="go-loc" onClick={() => onSellStop?.(stop)}>
                  {goLabel}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">{item.sellTo || "no known vendor"}</p>
      )}
      {item.recipe ? (
        <>
          <p className="rail-label">Recipe</p>
          <p className="hint">{item.recipe}</p>
        </>
      ) : null}
      {item.materials ? (
        <>
          <p className="rail-label">Materials</p>
          <p className="hint">{item.materials}</p>
        </>
      ) : null}
      {item.usedIn ? (
        <>
          <p className="rail-label">Used in</p>
          <p className="hint">{item.usedIn}</p>
        </>
      ) : null}
      {quests.length > 0 && (
        <>
          <p className="rail-label">Quests</p>
          <ul className="item-sources">
            {quests.map((src, i) => (
              <li key={`${src.questId}-${src.role || ""}-${i}`}>
                <button type="button" className="linkish" onClick={() => onOpenQuest?.(src)}>
                  {src.label}
                </button>
                {src.role === "turn-in" ? " · turn in" : src.role === "reward" ? " · reward" : ""}
                {src.notes && src.notes !== "Turn in" && src.notes !== "Reward" ? ` · ${src.notes}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
      {drops.length > 0 && (
        <>
          <p className="rail-label">Drops</p>
          {sourceList(drops)}
        </>
      )}
      {other.length > 0 && sourceList(other)}
      {item.wikiUrl && (
        <p className="adj">
          <a className="linkish" href={item.wikiUrl} target="_blank" rel="noreferrer">
            Wiki page
          </a>
        </p>
      )}
    </>
  );

  return (
    <article className="camp-card focus">
      <header>
        <h3 id={titleId}>{item.name}</h3>
        <span className="range">{item.kind || "item"}</span>
      </header>
      {item.slot && <p className="kind-pill">{item.slot}</p>}
      {columns ? (
        <>
          <div className="tabs item-modal-tabs" role="tablist">
            <button type="button" className={tab === "details" ? "on" : ""} onClick={() => setTab("details")}>
              Details
            </button>
            <button type="button" className={tab === "columns" ? "on" : ""} onClick={() => setTab("columns")}>
              Stats
            </button>
          </div>
          {tab === "columns" ? <ItemColumns item={item} /> : details}
        </>
      ) : (
        details
      )}
    </article>
  );
}
