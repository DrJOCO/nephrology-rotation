// Calendar-day keys (YYYY-MM-DD) in LOCAL time.
//
// We deliberately use local date components instead of Date#toISOString(), which
// returns a UTC calendar date. For a user behind UTC, an action taken in the
// evening (e.g. 8pm Pacific) already falls on "tomorrow" in UTC — so a UTC key
// files streak / spaced-repetition / competency / clinic-guide activity under
// the wrong day and breaks every day-boundary comparison. Every day key in the
// app must come from here so the keys compare consistently against each other.

/** Format a Date as a local-time YYYY-MM-DD key. */
export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Today's local calendar-day key. Call this per-use (never cache at module
 * load) so a long-lived PWA session re-evaluates "today" after midnight.
 */
export function todayKey(): string {
  return dateKey();
}
