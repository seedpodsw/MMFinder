import { CREDIT_SECTIONS } from "./credit-sources.js";

export default function Credits() {
  return (
    <div className="credits-screen">
      <h2>Credits</h2>
      {CREDIT_SECTIONS.map((section) => (
        <section key={section.id} className="credits-block" aria-labelledby={`credits-${section.id}`}>
          <h3 id={`credits-${section.id}`}>{section.title}</h3>
          <ul className="credits-list">
            {section.people.map((person) => (
              <li key={person.name}>
                <strong>{person.name}</strong>
                <span>{person.about}</span>
                <span className="credits-links">
                  {person.links.map((link) => (
                    <a key={link.href + link.label} href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
