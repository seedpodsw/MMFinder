import { useEffect, useMemo, useState } from "react";

const KIND_LABEL = {
  class: "Class path",
  armor: "Armor turn-in",
  hunt: "Hunt / named",
};

const ROLE_LABEL = {
  tank: "Tank",
  healer: "Healer",
  dps: "DPS",
  caster: "Caster",
  support: "Support",
};

export function appliesToClass(quest, classId) {
  if (!classId) return true;
  if (!quest.classIds || quest.classIds.includes("all")) return true;
  return quest.classIds.includes(classId);
}

export function questTouchesZone(quest, zoneId) {
  if (!zoneId) return false;
  if (quest.zoneId === zoneId) return true;
  return (quest.steps || []).some((s) => s.zoneId === zoneId);
}

export function nextOpenStep(quest, completed, level) {
  const done = new Set(completed);
  return (quest.steps || []).find((s) => !done.has(s.id) && (s.level || 1) <= level) || null;
}

export function questHay(quest, classes = []) {
  const classNames = (quest.classIds || [])
    .map((id) => classes.find((c) => c.id === id)?.name || id)
    .join(" ");
  return [
    quest.title,
    quest.npc,
    quest.where,
    quest.city,
    quest.kind,
    classNames,
    ...(quest.rewards || []),
    ...(quest.steps || []).flatMap((s) => [s.action, s.turnIn, s.npc, s.reward]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function searchQuests(quests, classes, query) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  return quests.filter((quest) => {
    const hay = questHay(quest, classes);
    return hay.includes(q) || tokens.every((t) => hay.includes(t));
  });
}

function progress(quest, completed) {
  const steps = quest.steps || [];
  const done = steps.filter((s) => completed.includes(s.id)).length;
  return { done, total: steps.length };
}

export default function Enhance({
  classes,
  quests,
  zones,
  klass,
  onClass,
  level,
  completed,
  onToggleStep,
  onShowZone,
  onShowVendor,
  focusQuestId,
  searchQuery,
}) {
  const [kind, setKind] = useState("all");
  const [pickedId, setPickedId] = useState(focusQuestId || null);
  const [query, setQuery] = useState(searchQuery || "");

  useEffect(() => {
    if (focusQuestId) setPickedId(focusQuestId);
  }, [focusQuestId]);

  useEffect(() => {
    if (searchQuery != null) setQuery(searchQuery);
  }, [searchQuery]);

  const cls = classes.find((c) => c.id === klass);
  const mine = useMemo(
    () =>
      quests
        .filter((q) => appliesToClass(q, klass))
        .filter((q) => kind === "all" || q.kind === kind)
        .filter((q) => {
          const qtext = query.trim().toLowerCase();
          if (!qtext) return true;
          const hay = questHay(q, classes);
          return hay.includes(qtext) || qtext.split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
        })
        .sort((a, b) => (a.levelMin || 1) - (b.levelMin || 1) || a.title.localeCompare(b.title)),
    [quests, klass, kind, query, classes]
  );

  const picked = mine.find((q) => q.id === pickedId) || mine[0];
  const nextClass = mine.find((q) => q.kind === "class" && nextOpenStep(q, completed, level));
  const nextAny = mine.find((q) => nextOpenStep(q, completed, level));
  const spotlight = nextClass || nextAny;
  const spotlightStep = spotlight ? nextOpenStep(spotlight, completed, level) : null;

  return (
    <div className="layout enhance-layout">
      <aside className="rail">
        <p className="rail-label">Pick a class</p>
        <ul className="zone-list class-list">
          {classes.map((c) => (
            <li key={c.id}>
              <button className={c.id === klass ? "active" : ""} onClick={() => onClass(c.id)}>
                <span className={`tag role-${c.role}`}>{ROLE_LABEL[c.role]}</span>
                <span className="zn">{c.name}</span>
                <span className="lv">{c.armor}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="enhance-board">
        {!klass ? (
          <p className="empty enhance-empty">Pick a class to see guild turn-ins, armor hunts, and what to do at your level.</p>
        ) : (
          <>
            {spotlightStep && (
              <article className="next-card">
                <p className="region">Do this next · {cls?.name} · lvl {level}</p>
                <h2>{spotlight.title}</h2>
                <p className="meta">
                  {KIND_LABEL[spotlight.kind]} · {spotlight.city} ·{" "}
                  <NpcLink
                    npc={spotlightStep.npc || spotlight.npc}
                    npcLinks={spotlightStep.npcLinks || spotlight.npcLinks}
                    poiId={spotlightStep.poiId || spotlight.poiId}
                    onShowVendor={onShowVendor}
                    label=""
                  />
                </p>
                <p className="desc">{spotlightStep.action}</p>
                {spotlightStep.turnIn && <p className="hint">Turn in: {spotlightStep.turnIn}</p>}
                <div className="row">
                  <button className="tiny" onClick={() => setPickedId(spotlight.id)}>
                    Open walkthrough
                  </button>
                  <TurnInGo
                    poiId={spotlightStep.poiId || spotlight.poiId}
                    zoneId={spotlightStep.zoneId}
                    questZoneId={spotlight.zoneId}
                    zones={zones}
                    onShowVendor={onShowVendor}
                    onShowZone={onShowZone}
                  />
                </div>
              </article>
            )}

            <div className="enhance-toolbar">
              <div className="tabs">
                <button className={kind === "all" ? "on" : ""} onClick={() => setKind("all")}>
                  All
                </button>
                <button className={kind === "class" ? "on" : ""} onClick={() => setKind("class")}>
                  Class path
                </button>
                <button className={kind === "armor" ? "on" : ""} onClick={() => setKind("armor")}>
                  Armor
                </button>
                <button className={kind === "hunt" ? "on" : ""} onClick={() => setKind("hunt")}>
                  Hunts
                </button>
              </div>
              <input
                className="search enhance-search"
                placeholder="Search turn-ins, NPCs, rewards…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="quest-grid">
              {mine.map((quest) => {
                const { done, total } = progress(quest, completed);
                const ready = nextOpenStep(quest, completed, level);
                const locked = (quest.levelMin || 1) > level;
                return (
                  <article
                    key={quest.id}
                    className={`quest-card ${picked?.id === quest.id ? "focus" : ""} ${ready ? "fits" : ""} ${
                      locked ? "locked" : ""
                    }`}
                    onClick={() => setPickedId(quest.id)}
                  >
                    <header>
                      <h3>{quest.title}</h3>
                      <span className="range">
                        {KIND_LABEL[quest.kind]} · {quest.levelMin}+
                      </span>
                    </header>
                    <p className="hint">
                      <NpcLink
                        npc={quest.npc}
                        npcLinks={quest.npcLinks}
                        poiId={quest.poiId}
                        onShowVendor={onShowVendor}
                        label=""
                      />
                      {quest.city ? ` · ${quest.city}` : ""}
                    </p>
                    {quest.rewards?.length > 0 && <p className="mobs">{quest.rewards.join(" · ")}</p>}
                    <p className="meta">
                      {done}/{total} turn-ins
                      {ready ? " · ready now" : locked ? " · above your level" : done === total ? " · done" : ""}
                    </p>
                  </article>
                );
              })}
              {mine.length === 0 && <p className="empty">Nothing in this filter for {cls.name}.</p>}
            </div>
          </>
        )}
      </main>

      <aside className="panel enhance-detail">
        {picked && klass ? (
          <QuestDetail
            quest={picked}
            zones={zones}
            level={level}
            completed={completed}
            onToggleStep={onToggleStep}
            onShowZone={onShowZone}
            onShowVendor={onShowVendor}
          />
        ) : (
          <p className="empty">Walkthroughs land here once you pick a class.</p>
        )}
      </aside>
    </div>
  );
}

export function ZoneQuestTab({
  className,
  classLabel,
  quests,
  zoneId,
  zones,
  level,
  completed,
  onToggleStep,
  onShowZone,
  onShowVendor,
  onOpenEnhance,
}) {
  const here = quests.filter((q) => appliesToClass(q, className) && questTouchesZone(q, zoneId));
  const classPath = quests.filter((q) => q.kind === "class" && appliesToClass(q, className));
  const next = classPath.map((q) => ({ q, step: nextOpenStep(q, completed, level) })).find((x) => x.step);

  if (!className) {
    return (
      <div className="stack">
        <p className="empty">Pick a class in the header to see guild turn-ins and armor hunts.</p>
        <button className="add" onClick={onOpenEnhance}>
          Open Quests
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      {next && (
        <article className="camp-card fits">
          <header>
            <h3>Next for {classLabel}</h3>
            <span className="range">lvl {next.step.level}+</span>
          </header>
          <p className="mobs">{next.q.title}</p>
          <p className="hint">{next.step.action}</p>
          {next.step.turnIn && <p className="meta">Turn in: {next.step.turnIn}</p>}
          <p className="hint">
            <NpcLink
              npc={next.step.npc || next.q.npc}
              npcLinks={next.step.npcLinks || next.q.npcLinks}
              poiId={next.step.poiId || next.q.poiId}
              onShowVendor={onShowVendor}
            />
          </p>
          <div className="row">
            <button className="tiny" onClick={() => onToggleStep(next.step.id)}>
              {completed.includes(next.step.id) ? "Undo" : "Mark done"}
            </button>
            <TurnInGo
              poiId={next.step.poiId || next.q.poiId}
              zoneId={next.step.zoneId}
              questZoneId={next.q.zoneId}
              zones={zones}
              onShowVendor={onShowVendor}
              onShowZone={onShowZone}
            />
            <button className="tiny" onClick={onOpenEnhance}>
              Full path
            </button>
          </div>
        </article>
      )}

      <p className="rail-label">In this zone</p>
      {here.length === 0 && <p className="empty">No listed turn-ins start here. Open Quests for the full {classLabel} path.</p>}
      {here.map((quest) => (
        <QuestSummary
          key={quest.id}
          quest={quest}
          zones={zones}
          level={level}
          completed={completed}
          onToggleStep={onToggleStep}
          onShowZone={onShowZone}
          onShowVendor={onShowVendor}
        />
      ))}
      <button className="add" onClick={onOpenEnhance}>
        Open Quests for all classes
      </button>
    </div>
  );
}

function QuestSummary({ quest, zones, level, completed, onToggleStep, onShowZone, onShowVendor }) {
  const { done, total } = progress(quest, completed);
  const ready = nextOpenStep(quest, completed, level);
  return (
    <article className={`camp-card ${ready ? "fits" : ""}`}>
      <header>
        <h3>{quest.title}</h3>
        <span className="range">
          {KIND_LABEL[quest.kind]} · {done}/{total}
        </span>
      </header>
      <p className="hint">
        <NpcLink npc={quest.npc} npcLinks={quest.npcLinks} poiId={quest.poiId} onShowVendor={onShowVendor} />
        {quest.where ? ` · ${quest.where}` : ""}
      </p>
      {ready && <p className="mobs">{ready.action}</p>}
      <div className="row">
        {ready && (
          <button className="tiny" onClick={() => onToggleStep(ready.id)}>
            Mark done
          </button>
        )}
        <TurnInGo
          poiId={ready?.poiId || quest.poiId}
          zoneId={ready?.zoneId || quest.zoneId}
          questZoneId={quest.zoneId}
          zones={zones}
          onShowVendor={onShowVendor}
          onShowZone={onShowZone}
        />
        <a className="tiny" href={quest.wikiUrl} target="_blank" rel="noreferrer">
          Wiki
        </a>
      </div>
    </article>
  );
}

function QuestDetail({ quest, zones, level, completed, onToggleStep, onShowZone, onShowVendor }) {
  const { done, total } = progress(quest, completed);
  return (
    <>
      <p className="region">{KIND_LABEL[quest.kind]}</p>
      <h2>{quest.title}</h2>
      <p className="meta">
        {quest.city} · lvl {quest.levelMin}+ · {done}/{total} done
      </p>
      <p className="desc">{quest.where}</p>
      <p className="adj">
        <NpcLink npc={quest.npc} npcLinks={quest.npcLinks} poiId={quest.poiId} onShowVendor={onShowVendor} />
        {quest.poiId && onShowVendor && (
          <>
            {" · "}
            <button type="button" className="linkish npc-go" onClick={() => onShowVendor(quest.poiId)}>
              Turn in here
            </button>
          </>
        )}
      </p>
      {quest.rewards?.length > 0 && <p className="mobs">Rewards: {quest.rewards.join(" · ")}</p>}
      <p className="adj">
        <a className="linkish" href={quest.wikiUrl} target="_blank" rel="noreferrer">
          Open wiki walkthrough
        </a>
      </p>

      <ol className="step-list">
        {(quest.steps || []).map((step, i) => {
          const checked = completed.includes(step.id);
          const gated = (step.level || 1) > level;
          return (
            <li key={step.id} className={`step-card ${checked ? "done" : ""} ${gated ? "gated" : ""}`}>
              <label>
                <input type="checkbox" checked={checked} onChange={() => onToggleStep(step.id)} />
                <span className="step-n">
                  {i + 1}. lvl {step.level}
                  {gated ? " · not yet" : ""}
                </span>
                <span className="step-body">{step.action}</span>
              </label>
              {(step.npc || step.npcLinks?.length > 0) && (
                <p className="hint">
                  <NpcLink
                    npc={step.npc}
                    npcLinks={step.npcLinks}
                    poiId={step.poiId || quest.poiId}
                    onShowVendor={onShowVendor}
                  />
                </p>
              )}
              {step.turnIn && <p className="hint">Turn in: {step.turnIn}</p>}
              {step.reward && <p className="mobs">{step.reward}</p>}
              <div className="row">
                <TurnInGo
                  poiId={step.poiId || quest.poiId}
                  zoneId={step.zoneId}
                  questZoneId={quest.zoneId}
                  zones={zones}
                  onShowVendor={onShowVendor}
                  onShowZone={onShowZone}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function NpcLink({ npc, npcLinks, poiId, onShowVendor, label = "NPC" }) {
  const links =
    npcLinks?.length > 0
      ? npcLinks
      : String(npc || "")
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({ name, poiId: poiId || null }));
  if (!links.length) return null;
  return (
    <span className="npc-line">
      {label ? `${label}: ` : null}
      {links.map((n, i) => (
        <span key={`${n.name}-${i}`}>
          {i > 0 ? ", " : ""}
          {n.poiId && onShowVendor ? (
            <button
              type="button"
              className="linkish npc-go"
              title={`Show ${n.name} on the atlas`}
              onClick={(e) => {
                e.stopPropagation();
                onShowVendor(n.poiId);
              }}
            >
              {n.name}
            </button>
          ) : (
            n.name
          )}
        </span>
      ))}
    </span>
  );
}

function TurnInGo({ poiId, zoneId, questZoneId, zones, onShowVendor, onShowZone }) {
  const farm = zoneId && zoneId !== questZoneId;
  return (
    <>
      {poiId && onShowVendor && (
        <button
          type="button"
          className="tiny turn-in-go"
          onClick={(e) => {
            e.stopPropagation();
            onShowVendor(poiId);
          }}
        >
          Turn in here
        </button>
      )}
      {farm && onShowZone && (
        <button
          type="button"
          className="tiny"
          onClick={(e) => {
            e.stopPropagation();
            onShowZone(zoneId);
          }}
        >
          Farm {zones.find((z) => z.id === zoneId)?.name || "zone"}
        </button>
      )}
      {!poiId && zoneId && onShowZone && (
        <button
          type="button"
          className="tiny"
          onClick={(e) => {
            e.stopPropagation();
            onShowZone(zoneId);
          }}
        >
          Show {zones.find((z) => z.id === zoneId)?.name || "zone"}
        </button>
      )}
    </>
  );
}
