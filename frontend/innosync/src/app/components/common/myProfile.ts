"use client";

/**
 * One shared request for GET /api/profile/me.
 *
 * The navbar, dashboard header, profile panel and overview all need the signed-in profile.
 * Before, each fetched it on its own (4-5 identical requests per dashboard load). Now concurrent
 * callers share a single in-flight request, and the result is reused for a short while.
 * Call with `{ fresh: true }` after the profile changes (e.g. on the "profileUpdated" event).
 */

export type MyProfileResult = {
  ok: boolean;
  status: number;
  /** Parsed JSON body when ok, otherwise null. */
  data: Record<string, unknown> | null;
};

const TTL_MS = 30_000;

let cached: { token: string; at: number; promise: Promise<MyProfileResult> } | null = null;

export function getMyProfile(opts: { fresh?: boolean } = {}): Promise<MyProfileResult> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return Promise.resolve({ ok: false, status: 401, data: null });

  const reusable = cached && cached.token === token && Date.now() - cached.at < TTL_MS;
  if (reusable && !opts.fresh) return cached!.promise;

  const promise = fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/me`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  })
    .then(async (res) => ({ ok: res.ok, status: res.status, data: res.ok ? await res.json() : null }))
    .catch(() => ({ ok: false, status: 0, data: null }));

  const entry = { token, at: Date.now(), promise };
  cached = entry;
  // Don't keep failures around: the next caller should try again.
  promise.then((r) => {
    if (!r.ok && cached === entry) cached = null;
  });
  return promise;
}

/** Forget the cached profile (after saving changes, logging out, ...). */
export function clearMyProfile() {
  cached = null;
}
