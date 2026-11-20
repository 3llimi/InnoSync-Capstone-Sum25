"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import styles from "./search.module.css";
import { rankSuggestions, splitMatch, Suggestion, SuggestionKind } from "./searchUtils";

const KIND_LABEL: Record<SuggestionKind, string> = {
  skill: "Skill",
  role: "Role",
  person: "Person",
  project: "Project",
  type: "Type",
};

/**
 * Search bar for Find Talent / Find Project.
 * Filters live while typing; suggests matching skills, roles and names; picked suggestions
 * (or Enter on free text) become chips that narrow the results further.
 * Keyboard: "/" focuses, ↑ ↓ choose, Enter picks, Esc closes or clears, Backspace removes the last chip.
 */
export default function SmartSearch({
  query,
  onQueryChange,
  chips,
  onAddChip,
  onRemoveChip,
  onClearAll,
  suggestions,
  resultCount,
  totalCount,
  noun,
  placeholder,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  chips: string[];
  onAddChip: (chip: string) => void;
  onRemoveChip: (chip: string) => void;
  onClearAll: () => void;
  suggestions: Suggestion[];
  resultCount: number;
  totalCount: number;
  /** e.g. "talents" / "projects" */
  noun: string;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = rankSuggestions(suggestions, query, chips);
  const showMenu = open && matches.length > 0;

  useEffect(() => setActive(0), [query]);

  // "/" anywhere focuses the search (unless already typing somewhere).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close the menu on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (label: string) => {
    onAddChip(label);
    onQueryChange("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && matches.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp" && matches.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showMenu) pick(matches[active].label);
      else if (query.trim()) pick(query.trim());
    } else if (e.key === "Escape") {
      if (showMenu) setOpen(false);
      else onQueryChange("");
    } else if (e.key === "Backspace" && !query && chips.length) {
      onRemoveChip(chips[chips.length - 1]);
    }
  };

  const filtering = query.trim() !== "" || chips.length > 0;

  return (
    <div className={styles.searchArea}>
      <div className={styles.searchWrap} ref={wrapRef}>
        <div className={`${styles.searchBox} ${showMenu ? styles.searchBoxOpen : ""}`} onClick={() => inputRef.current?.focus()}>
          <svg className={styles.searchGlyph} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>

          {chips.map((chip) => (
            <span key={chip} className={styles.chip}>
              {chip}
              <button
                type="button"
                className={styles.chipX}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveChip(chip);
                }}
                aria-label={`Remove ${chip}`}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </span>
          ))}

          <input
            ref={inputRef}
            className={styles.searchInput}
            value={query}
            placeholder={chips.length ? "Add another filter…" : placeholder}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={showMenu}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showMenu ? `${listId}-${active}` : undefined}
            aria-label={`Search ${noun}`}
          />

          {filtering ? (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          ) : (
            <kbd className={styles.kbd} aria-hidden="true">/</kbd>
          )}
        </div>

        {showMenu && (
          <ul className={styles.menu} id={listId} role="listbox" aria-label="Suggestions">
            {matches.map((s, i) => {
              const [before, hit, after] = splitMatch(s.label, query);
              return (
                <li
                  key={`${s.kind}-${s.label}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`${styles.option} ${i === active ? styles.optionActive : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep focus in the input
                    pick(s.label);
                  }}
                  style={{ ["--i" as string]: i }}
                >
                  <span className={`${styles.kind} ${styles[`kind_${s.kind}`]}`}>{KIND_LABEL[s.kind]}</span>
                  <span className={styles.optionLabel}>
                    {before}<mark>{hit}</mark>{after}
                  </span>
                  {s.count != null && <span className={styles.optionCount}>{s.count}</span>}
                </li>
              );
            })}
            <li className={styles.menuHint} aria-hidden="true">
              <kbd>↑</kbd><kbd>↓</kbd> to choose · <kbd>Enter</kbd> to add · <kbd>Esc</kbd> to close
            </li>
          </ul>
        )}
      </div>

      <div className={styles.resultLine} aria-live="polite">
        {/* Sidebar filters narrow the list too, so compare counts rather than only checking the search. */}
        {filtering || resultCount !== totalCount ? (
          <>
            <span>
              Showing <b>{resultCount}</b> of {totalCount} {noun}
            </span>
            {filtering && <button type="button" className={styles.linkBtn} onClick={onClearAll}>Clear search</button>}
          </>
        ) : (
          <span>
            <b>{totalCount}</b> {noun}. Search by name, role, skill or keyword.
          </span>
        )}
      </div>
    </div>
  );
}
