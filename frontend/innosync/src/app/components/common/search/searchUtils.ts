/** Matching helpers shared by the Find Talent and Find Project search. */

export type SuggestionKind = "skill" | "role" | "person" | "project" | "type";

export type Suggestion = {
  label: string;
  kind: SuggestionKind;
  /** How many results carry this value (shown next to the suggestion). */
  count?: number;
};

/** What one searchable result exposes to the search. */
export type Searchable = {
  /** Exact values a picked suggestion must equal (skills, roles, name/title, type...). */
  tokens: string[];
  /** Free text searched by substring (description, bio...). */
  text: string;
};

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Does an item pass the search?
 * - `query` (what's being typed) matches any token or the free text by substring.
 * - Every chip must match. Chips that are known values (picked from suggestions) must equal a token,
 *   so "Java" doesn't also match "JavaScript"; anything else typed freely matches by substring.
 */
export function matchesSearch(item: Searchable, query: string, chips: string[], known: Set<string>): boolean {
  const tokens = item.tokens.map(norm);
  const haystack = `${tokens.join(" ")} ${norm(item.text)}`;
  const q = norm(query);
  if (q && !haystack.includes(q)) return false;
  return chips.every((chip) => {
    const c = norm(chip);
    return known.has(c) ? tokens.includes(c) : haystack.includes(c);
  });
}

/** Counted, de-duplicated suggestions of one kind from a list of values. */
export function countValues(values: string[], kind: SuggestionKind): Suggestion[] {
  const counts = new Map<string, { label: string; count: number }>();
  values.filter(Boolean).forEach((v) => {
    const key = norm(v);
    const entry = counts.get(key);
    if (entry) entry.count++;
    else counts.set(key, { label: v.trim(), count: 1 });
  });
  return [...counts.values()].map(({ label, count }) => ({ label, kind, count }));
}

/** Suggestions for what's typed: prefix matches first, then by popularity. */
export function rankSuggestions(all: Suggestion[], query: string, exclude: string[], limit = 7): Suggestion[] {
  const q = norm(query);
  if (!q) return [];
  const taken = new Set(exclude.map(norm));
  return all
    .filter((s) => !taken.has(norm(s.label)) && norm(s.label).includes(q))
    .sort((a, b) => {
      const ap = norm(a.label).startsWith(q) ? 0 : 1;
      const bp = norm(b.label).startsWith(q) ? 0 : 1;
      return ap - bp || (b.count ?? 0) - (a.count ?? 0) || a.label.localeCompare(b.label);
    })
    .slice(0, limit);
}

/** Splits a label around the typed text so the match can be highlighted. */
export function splitMatch(label: string, query: string): [string, string, string] {
  const i = label.toLowerCase().indexOf(query.trim().toLowerCase());
  if (!query.trim() || i < 0) return [label, "", ""];
  const end = i + query.trim().length;
  return [label.slice(0, i), label.slice(i, end), label.slice(end)];
}
