import { useEffect, useRef, useState } from "react";
import { createNote, deleteNote, loadNotes, patchNote, saveNotes, selectNote } from "./notes-store.js";

function noteTitle(note) {
  return note.title.trim() || "Untitled";
}

function notePreview(note) {
  return note.body.trim().split("\n").find(Boolean) || "Empty note";
}

function savedLabel(note) {
  const when = new Date(note.updatedAt);
  if (Number.isNaN(when.getTime())) return "Saved in this browser";
  return `Saved ${when.toLocaleString()}`;
}

export default function Notes() {
  const [pad, setPad] = useState(() => loadNotes(localStorage));
  const [saveError, setSaveError] = useState("");
  const titleRef = useRef(null);
  const pendingFocus = useRef(false);
  const selected = pad.notes.find((note) => note.id === pad.selectedId) || null;

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    titleRef.current?.focus();
  }, [pad.selectedId]);

  function commit(next) {
    setPad(next);
    try {
      saveNotes(localStorage, next);
      setSaveError("");
    } catch {
      setSaveError("Couldn't save these notes in this browser.");
    }
  }

  function addNote() {
    pendingFocus.current = true;
    commit(createNote(pad));
  }

  return (
    <div className="notes-screen">
      <aside className="notes-list">
        <button type="button" className="add" onClick={addNote}>
          New note
        </button>
        {pad.notes.length === 0 ? (
          <p className="empty">No notes yet. They stay in this browser.</p>
        ) : (
          <ul>
            {pad.notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  className={note.id === selected?.id ? "on" : ""}
                  onClick={() => commit(selectNote(pad, note.id))}
                >
                  <strong>{noteTitle(note)}</strong>
                  <span>{notePreview(note)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      {selected ? (
        <section className="notes-editor">
          <input
            ref={titleRef}
            value={selected.title}
            placeholder="Title"
            aria-label="Note title"
            onChange={(event) => commit(patchNote(pad, selected.id, { title: event.target.value }))}
          />
          <textarea
            value={selected.body}
            placeholder="Write a note…"
            aria-label="Note body"
            onChange={(event) => commit(patchNote(pad, selected.id, { body: event.target.value }))}
          />
          <div className="notes-meta">
            <span>{saveError || savedLabel(selected)}</span>
            <button type="button" className="tiny danger" onClick={() => commit(deleteNote(pad, selected.id))}>
              Delete
            </button>
          </div>
        </section>
      ) : (
        <section className="notes-editor notes-empty">
          <p className="empty">Make a note and it saves here automatically.</p>
          <button type="button" className="add" onClick={addNote}>
            New note
          </button>
        </section>
      )}
    </div>
  );
}
