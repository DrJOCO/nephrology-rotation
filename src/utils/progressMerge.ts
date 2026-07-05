// Monotonic merge rules for progress-shaped student data, shared by the
// store's flush clobber guard (offline queue + guarded direct writes) and the
// student-app listener: completed work never un-completes and quiz attempts
// never vanish, no matter which side's snapshot is older. Kept dependency-free
// (no Firebase, no store) so the listener hook can import it even when tests
// mock the store module.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unionCompletionRecord(remote: unknown, local: unknown): unknown {
  if (!isPlainObject(remote)) return local;
  if (!isPlainObject(local)) return remote;
  const merged: Record<string, unknown> = { ...local };
  for (const [key, remoteValue] of Object.entries(remote)) {
    // Union of keys; on a per-key conflict the newer remote copy wins, except
    // a `true` completion flag is never downgraded (completed stays completed).
    merged[key] = merged[key] === true && remoteValue === false ? true : remoteValue;
  }
  return merged;
}

// Union remote and local completion maps section-wise. Remote wins per-key
// conflicts, but a completion present on only one side always survives —
// e.g. a consult-topic Done mark made in the 2s debounce window outlives a
// remote snapshot that predates it.
export function mergeCompletedItems(remote: unknown, local: unknown): unknown {
  if (!isPlainObject(remote)) return local;
  if (!isPlainObject(local)) return remote;
  const merged: Record<string, unknown> = { ...remote, ...local };
  for (const section of Object.keys(merged)) {
    merged[section] = unionCompletionRecord(remote[section], local[section]);
  }
  return merged;
}

// Weekly quiz attempts are append-only (no admin or student flow deletes an
// attempt): union per week by attempt date so neither side's quizzes vanish.
export function mergeWeeklyScores(remote: unknown, local: unknown): unknown {
  if (!isPlainObject(remote)) return local;
  if (!isPlainObject(local)) return remote;
  const merged: Record<string, unknown> = { ...local };
  for (const [week, remoteAttempts] of Object.entries(remote)) {
    const localAttempts = merged[week];
    if (!Array.isArray(remoteAttempts) || !Array.isArray(localAttempts)) {
      merged[week] = remoteAttempts;
      continue;
    }
    const seenDates = new Set(
      remoteAttempts.map((attempt) => (isPlainObject(attempt) && typeof attempt.date === "string" ? attempt.date : "")),
    );
    merged[week] = [
      ...remoteAttempts,
      ...localAttempts.filter((attempt) =>
        !(isPlainObject(attempt) && typeof attempt.date === "string" && seenDates.has(attempt.date))),
    ];
  }
  return merged;
}
