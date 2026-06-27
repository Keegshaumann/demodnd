// Shared Women/Men shopping context (Vestiaire-style). Plain module — no
// "use server"/"server-only" — so BOTH the client gate and server pages can
// import the cookie name, options, and parser without crossing an RSC boundary.

export const GENDER_COOKIE = "dnd_gender";

export type Gender = "women" | "men";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
];

/** Narrow an arbitrary cookie / query-param value to a Gender, else null. */
export function parseGender(value: string | undefined | null): Gender | null {
  return value === "women" || value === "men" ? value : null;
}
