"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import styles from "./search.module.css";
import { rankSuggestions, splitMatch, Suggestion } from "./searchUtils";

/**
 * "Required skills" filter: autocompletes from the skills that actually exist in the results
 * (with how many have each), offers popular skills as one-click chips, and lists the chosen ones.
 */
export default function SkillPicker({
  selected,
  options,
  onAdd,
  onRemove,
  noun,
}: {
  selected: string[];
  /** Skills present in the data, with counts. */
  options: Suggestion[];
  onAdd: (skill: string) => void;
  onRemove: (skill: string) => void;
  /** e.g. "talents" */
  noun: string;
}) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const matches = rankSuggestions(options, input, selected, 6);
  const popular = options
    .filter((o) => !selected.some((s) => s.toLowerCase() === o.label.toLowerCase()))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 8);

  useEffect(() => setActive(0), [input]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const add = (skill: string) => {
    onAdd(skill);
    setInput("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && matches.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp" && matches.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches.length) add(matches[active].label);
    } else if (e.key === "Escape") {
      setInput("");
      setOpen(false);
    } else if (e.key === "Backspace" && !input && selected.length) {
      onRemove(selected[selected.length - 1]);
    }
  };

  const showMenu = open && input.trim() !== "";

  return (
    <div className={styles.picker} ref={wrapRef}>
      <div className={styles.pickerBox}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          className={styles.pickerInput}
          value={input}
          placeholder="Type a skill, e.g. React"
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showMenu}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showMenu && matches.length ? `${listId}-${active}` : undefined}
          aria-label="Add a required skill"
        />
      </div>

      {showMenu && (
        <ul className={`${styles.menu} ${styles.pickerMenu}`} id={listId} role="listbox" aria-label="Matching skills">
          {matches.length ? (
            matches.map((s, i) => {
              const [before, hit, after] = splitMatch(s.label, input);
              return (
                <li
                  key={s.label}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`${styles.option} ${i === active ? styles.optionActive : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(s.label);
                  }}
                  style={{ ["--i" as string]: i }}
                >
                  <span className={styles.optionLabel}>{before}<mark>{hit}</mark>{after}</span>
                  <span className={styles.optionCount} title={`${s.count} ${noun}`}>{s.count}</span>
                </li>
              );
            })
          ) : (
            <li className={styles.menuEmpty}>No {noun} list “{input.trim()}”</li>
          )}
        </ul>
      )}

      {selected.length > 0 && (
        <div className={styles.pickerChosen}>
          {selected.map((skill) => (
            <span key={skill} className={styles.chip}>
              {skill}
              <button type="button" className={styles.chipX} onClick={() => onRemove(skill)} aria-label={`Remove ${skill}`}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {popular.length > 0 && (
        <div className={styles.popular}>
          <small>Popular</small>
          <div className={styles.popularList}>
            {popular.map((s) => (
              <button key={s.label} type="button" className={styles.popularChip} onClick={() => onAdd(s.label)}>
                <span aria-hidden="true">+</span> {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
