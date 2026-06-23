/**
 * RECENTLY VIEWED (feature 9) — localStorage utility.
 *
 * A plain, framework-free, client-safe TS module (NO React, NO "use server" /
 * "server-only" directive — it is imported by client components on both the
 * writer side (PDP) and the reader side (homepage rail)). All access is
 * guarded for SSR/no-window so importing it on the server is a no-op.
 *
 * Storage shape: a JSON array of listing ids, most-recently-viewed first,
 * capped at {@link RECENTLY_VIEWED_CAP}. Writing pushes the id to the front and
 * dedupes (so re-viewing a piece bumps it to the front rather than duplicating).
 */

export const RECENTLY_VIEWED_KEY = "dnd:recentlyViewed";
export const RECENTLY_VIEWED_CAP = 8;

/** True only in a browser with a usable localStorage (private-mode safe). */
function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

/**
 * The stored ids, most-recent-first. Returns [] off the client, on parse error,
 * or when nothing has been viewed. Defensively filters to non-empty strings and
 * re-caps in case the stored value was tampered with.
 */
export function getRecentlyViewed(): string[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .slice(0, RECENTLY_VIEWED_CAP);
  } catch {
    return [];
  }
}

/**
 * Push a listing id to the front of the recently-viewed list (dedupe + cap).
 * Best-effort: a quota/serialise failure is swallowed so a view never throws in
 * the UI. Call once on PDP mount.
 */
export function pushRecentlyViewed(id: string): void {
  if (!hasStorage() || !id) return;
  try {
    const current = getRecentlyViewed().filter((existing) => existing !== id);
    const next = [id, ...current].slice(0, RECENTLY_VIEWED_CAP);
    window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  } catch {
    // ignore (quota / disabled storage) — recently-viewed is non-essential
  }
}
