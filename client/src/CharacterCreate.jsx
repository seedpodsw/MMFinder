import { useState } from "react";
import { CLASSES, ORIGINS, classById, damageFor, maxHpFor, originById } from "../../shared/field.js";

export default function CharacterCreate({ roster = [], onPlay, onConjure, onRelease }) {
  const [making, setMaking] = useState(roster.length === 0);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("fighter");
  const [originId, setOriginId] = useState("night-harbor");
  const [releasing, setReleasing] = useState("");
  const picked = classById(classId);

  if (!making) {
    return (
      <div className="conjure">
        <div className="conjure-card">
          <p className="eyebrow">Characters</p>
          <h2>Who walks</h2>
          <p className="conjure-lead">They stay in this browser, with the level and health they earned.</p>
          <ul className="conjure-roster">
            {roster.map((hero) => {
              const klass = classById(hero.classId);
              const origin = originById(hero.originId);
              const maxHp = maxHpFor(hero.level, klass);
              return (
                <li key={hero.id}>
                  <button type="button" className="conjure-pick" onClick={() => onPlay(hero)}>
                    <strong>{hero.name}</strong>
                    <span>
                      {klass?.name} · level {hero.level}
                    </span>
                    <span>
                      {hero.hp} / {maxHp} health · attack {damageFor(hero.level, klass)}
                    </span>
                    <span>
                      {origin?.name}
                      {hero.kills ? ` · ${hero.kills} fallen` : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="field-retire"
                    onClick={() => {
                      if (releasing === hero.id) onRelease(hero.id);
                      else setReleasing(hero.id);
                    }}
                  >
                    {releasing === hero.id ? "Yes, release them" : "Release"}
                  </button>
                </li>
              );
            })}
          </ul>
          {roster.length < 8 ? (
            <button type="button" className="conjure-go" onClick={() => setMaking(true)}>
              Conjure another
            </button>
          ) : (
            <p className="conjure-lead">Eight walkers is the bench.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      className="conjure"
      onSubmit={(e) => {
        e.preventDefault();
        onConjure({ name, classId, originId });
      }}
    >
      <div className="conjure-card">
        <p className="eyebrow">Conjure</p>
        <h2>Who walks</h2>
        <p className="conjure-lead">A name, a calling, and a city to wake in. They stay in this browser.</p>
        <input
          className="conjure-name"
          maxLength={24}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="conjure-label">Calling</p>
        <div className="conjure-classes">
          {CLASSES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={c.id === classId ? "on" : ""}
              onClick={() => setClassId(c.id)}
            >
              <strong>{c.name}</strong>
              <span>{c.passive}</span>
            </button>
          ))}
        </div>
        {picked && <p className="conjure-blurb">{picked.blurb}</p>}
        <p className="conjure-label">Wake in</p>
        <div className="conjure-origins">
          {ORIGINS.map((o) => (
            <button
              key={o.id}
              type="button"
              className={o.id === originId ? "on" : ""}
              onClick={() => setOriginId(o.id)}
            >
              <strong>{o.name}</strong>
              <span>{o.note}</span>
            </button>
          ))}
        </div>
        <button className="conjure-go" type="submit">
          Conjure
        </button>
        {roster.length > 0 && (
          <button type="button" className="conjure-back" onClick={() => setMaking(false)}>
            Back to the bench
          </button>
        )}
      </div>
    </form>
  );
}
