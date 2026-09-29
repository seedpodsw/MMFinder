import { useState } from "react";
import { CLASSES, ORIGINS, classById } from "../../shared/field.js";

export default function CharacterCreate({ onConjure }) {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("fighter");
  const [originId, setOriginId] = useState("night-harbor");
  const picked = classById(classId);

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
        <p className="conjure-lead">
          A name, a calling, and a city to wake in. They stay in this browser.
        </p>
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
      </div>
    </form>
  );
}
