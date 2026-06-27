// Shared seasonal context (Southern-Hemisphere — D&D is SA-based). Plain module
// so the client wizard and server pages can both import without an RSC split.

export type Season = "spring" | "summer" | "autumn" | "winter";

export const SEASONS: { value: Season; label: string }[] = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "autumn", label: "Autumn" },
  { value: "winter", label: "Winter" },
];

/** Label a stored season value; 'all' / unknown → "All seasons". */
export function seasonLabel(value: string): string {
  return SEASONS.find((s) => s.value === value)?.label ?? "All seasons";
}

/** Narrow an arbitrary value to a real Season, else null. */
export function parseSeason(value: string | undefined | null): Season | null {
  return value === "spring" ||
    value === "summer" ||
    value === "autumn" ||
    value === "winter"
    ? value
    : null;
}

/** Current Southern-Hemisphere season from the calendar month. */
export function currentSeason(): Season {
  const m = new Date().getMonth(); // 0 = Jan
  if (m === 11 || m <= 1) return "summer"; // Dec–Feb
  if (m <= 4) return "autumn"; // Mar–May
  if (m <= 7) return "winter"; // Jun–Aug
  return "spring"; // Sep–Nov
}
