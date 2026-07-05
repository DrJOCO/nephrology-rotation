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

// ─── Patient-entry merge helpers ────────────────────────────────────
// Patient entries carry a per-entry `updatedAt` (stamped by the sync hook on
// create/edit/discharge) and deletions are recorded in the doc's
// removedPatients map (patientId → removedAt ISO). A removal beats an entry
// iff it is strictly newer than the entry's stamp; an entry with no stamp
// (legacy data, old-client writes) always loses to a removal.

export function patientEntryStamp(entry: unknown): string {
  return isPlainObject(entry) && typeof entry.updatedAt === "string" ? entry.updatedAt : "";
}

export function patientRemovalWins(removedAt: unknown, entry: unknown): boolean {
  return typeof removedAt === "string" && removedAt !== "" && removedAt > patientEntryStamp(entry);
}

// Union two removedPatients maps, keeping the newest removal stamp per id.
export function mergeRemovedPatientMaps(a: unknown, b: unknown): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const source of [a, b]) {
    if (!isPlainObject(source)) continue;
    for (const [id, stamp] of Object.entries(source)) {
      if (typeof stamp !== "string" || !stamp) continue;
      if (!(id in merged) || stamp > merged[id]) merged[id] = stamp;
    }
  }
  return merged;
}

const REMOVED_PATIENT_RETENTION_MS = 60 * 24 * 60 * 60 * 1000;

// Removal records only need to outlive every device's offline window; 60 days
// comfortably exceeds a rotation, and pruning on write bounds the map's growth.
export function pruneRemovedPatients(map: Record<string, string>, nowIso: string): Record<string, string> {
  const cutoff = new Date(new Date(nowIso).getTime() - REMOVED_PATIENT_RETENTION_MS).toISOString();
  return Object.fromEntries(Object.entries(map).filter(([, stamp]) => stamp >= cutoff));
}

// Flush merge for patients: per-entry union where the newer-stamped copy wins
// an id conflict (missing stamps sort older; a tie keeps the remote copy, the
// newest doc — the same rule unionRecordsById used). Unlike that union, a
// deletion recorded in removedPatients on either side is honored instead of
// resurrected, per the patientRemovalWins rule above.
export function mergePatientsWithRemovals(
  remote: unknown,
  queued: unknown,
  removedPatients: Record<string, string>,
): unknown[] {
  const remoteList = Array.isArray(remote) ? remote : [];
  const queuedList = Array.isArray(queued) ? queued : [];
  const queuedById = new Map<unknown, unknown>();
  for (const entry of queuedList) {
    if (isPlainObject(entry) && entry.id !== undefined) queuedById.set(entry.id, entry);
  }
  const merged: unknown[] = [];
  const seen = new Set<unknown>();
  for (const remoteEntry of remoteList) {
    if (!isPlainObject(remoteEntry) || remoteEntry.id === undefined) {
      merged.push(remoteEntry);
      continue;
    }
    seen.add(remoteEntry.id);
    const queuedEntry = queuedById.get(remoteEntry.id);
    const winner = queuedEntry !== undefined && patientEntryStamp(queuedEntry) > patientEntryStamp(remoteEntry)
      ? queuedEntry
      : remoteEntry;
    if (!patientRemovalWins(removedPatients[String(remoteEntry.id)], winner)) merged.push(winner);
  }
  for (const queuedEntry of queuedList) {
    if (isPlainObject(queuedEntry) && queuedEntry.id !== undefined) {
      if (seen.has(queuedEntry.id)) continue;
      if (patientRemovalWins(removedPatients[String(queuedEntry.id)], queuedEntry)) continue;
    }
    merged.push(queuedEntry);
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
