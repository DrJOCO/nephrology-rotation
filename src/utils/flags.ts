// Feature flags / remote config (WS-3). Precedence, low → high:
//   hardcoded FLAG_DEFAULTS  <  localStorage cache (neph_flags)  <  one-shot
//   fetch of appConfig/flags at boot.
//
// Stale-while-revalidate: getFlag() is synchronous and always answers from
// whatever is already in memory (defaults, then cache once loaded, then the
// fetched doc once it lands) — callers never block on network. refreshFlags()
// does the one-shot background fetch and updates both the in-memory state and
// the localStorage cache; call it once at boot. No realtime listener (per
// spec) — a flag flip needs a fresh load to propagate, which is an accepted
// tradeoff for a config surface flipped rarely, by hand, by one admin.
//
// A missing appConfig/flags doc, a rules-denied read, or being offline must
// all fall back silently to cache→defaults — this doc doesn't exist yet in
// production Firestore, and today's behavior (the herd of flags below, all
// "on"/"off" matching current UI) must be exactly what every client sees
// until the doc is created.
import { getFirebase } from "./firebase";
import store from "./store";

// Source of truth for flag names + today's-behavior defaults. Adding a new
// flag: add the key here first (this is what makes it "known"); unknown keys
// present in a fetched/cached doc are ignored (forward-compat with older
// clients if a future flag doc grows a key this build doesn't understand yet).
export const FLAG_DEFAULTS = {
  feedbackEnabled: true,
  previewEnabled: true,
  // No behavior wired to this yet (a later workstream consumes it) — present
  // here only so the admin panel and clients agree on the name in advance.
  workboxToastForced: false,
} as const satisfies Record<string, boolean>;

export type FlagName = keyof typeof FLAG_DEFAULTS;

const FLAGS_CACHE_KEY = "neph_flags";

// In-memory resolved values, seeded from defaults and overlaid by the cache
// synchronously at module load so getFlag() never has to wait on I/O.
let currentFlags: Record<FlagName, boolean> = { ...FLAG_DEFAULTS };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Keeps only known flag keys with boolean values — never trusts stored/remote shape blindly. */
function sanitizeFlagsPatch(raw: unknown): Partial<Record<FlagName, boolean>> {
  if (!isPlainObject(raw)) return {};
  const patch: Partial<Record<FlagName, boolean>> = {};
  for (const key of Object.keys(FLAG_DEFAULTS) as FlagName[]) {
    if (typeof raw[key] === "boolean") patch[key] = raw[key] as boolean;
  }
  return patch;
}

function readCachedFlags(): Partial<Record<FlagName, boolean>> {
  try {
    const raw = localStorage.getItem(FLAGS_CACHE_KEY);
    if (!raw) return {};
    return sanitizeFlagsPatch(JSON.parse(raw));
  } catch {
    return {};
  }
}

function writeCachedFlags(flags: Record<FlagName, boolean>): void {
  try {
    localStorage.setItem(FLAGS_CACHE_KEY, JSON.stringify(flags));
  } catch {
    // Storage full/unavailable — the in-memory value for this session is
    // still correct, just won't survive a reload. Nothing more to do here.
  }
}

// Seed in-memory flags from the cache immediately at module load (runs once
// per page load, before any component reads a flag).
currentFlags = { ...FLAG_DEFAULTS, ...readCachedFlags() };

/** Synchronous flag read — always answers instantly from defaults/cache/last fetch. */
export function getFlag(name: FlagName): boolean {
  return currentFlags[name];
}

const FLAGS_CHANGED_EVENT = "neph:flags-changed";

function notifyFlagsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FLAGS_CHANGED_EVENT));
}

/**
 * One-shot fetch of appConfig/flags, applied on top of defaults+cache. Meant
 * to be called once at boot (and, for the admin flags editor, right after a
 * save). Any failure — offline, rules deny, no doc yet — is swallowed and
 * leaves the existing cache/defaults in effect; this function never throws.
 */
export async function refreshFlags(): Promise<void> {
  let patch: Partial<Record<FlagName, boolean>> = {};
  try {
    const { db, fs } = await getFirebase();
    const snap = await fs.getDoc(fs.doc(db, "appConfig", "flags"));
    if (snap.exists()) patch = sanitizeFlagsPatch(snap.data());
  } catch (error) {
    console.warn("Flag refresh failed; keeping cached/default values:", error);
    return;
  }

  if (Object.keys(patch).length === 0) return;

  const next = { ...currentFlags, ...patch };
  const changed = (Object.keys(FLAG_DEFAULTS) as FlagName[]).some((key) => next[key] !== currentFlags[key]);
  currentFlags = next;

  // "View as student" preview: reads should reflect the fetched values (so an
  // admin previewing sees what a real student would), but this one-shot
  // fetch must not persist into the real device's localStorage cache — the
  // preview banner promises "nothing is saved" the same way feedback.ts's
  // submit/flush guards do for student feedback.
  if (!store.isPreview()) writeCachedFlags(currentFlags);

  if (changed) notifyFlagsChanged();
}

// ─── Admin: write the full flags map ───────────────────────────────────
// Bootstrap-admin-only per firestore.rules; SettingsTab is responsible for
// not rendering the card to anyone else. Writes the complete known-flags map
// (not a partial patch) so appConfig/flags always holds every defined flag —
// simpler for `refreshFlags`/rules to reason about than partial merges.

/** Writes the full flags map to appConfig/flags (setDoc merge) and updates local state to match. */
export async function setRemoteFlags(flags: Record<FlagName, boolean>): Promise<void> {
  const { db, fs } = await getFirebase();
  await fs.setDoc(fs.doc(db, "appConfig", "flags"), flags, { merge: true });
  currentFlags = { ...flags };
  if (!store.isPreview()) writeCachedFlags(currentFlags);
  notifyFlagsChanged();
}

// ─── React hook ─────────────────────────────────────────────────────────
import { useEffect, useState } from "react";

/** Re-renders the component when a background refreshFlags() changes this flag's value. */
export function useFlag(name: FlagName): boolean {
  const [value, setValue] = useState(() => getFlag(name));

  useEffect(() => {
    // Pick up any refresh that resolved between initial render and this
    // effect running (e.g. refreshFlags() kicked off during app boot).
    setValue(getFlag(name));
    if (typeof window === "undefined") return undefined;
    const handler = () => setValue(getFlag(name));
    window.addEventListener(FLAGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(FLAGS_CHANGED_EVENT, handler);
  }, [name]);

  return value;
}

/** Test-only reset so specs don't leak in-memory state across cases. */
export function __resetFlagsForTest(): void {
  currentFlags = { ...FLAG_DEFAULTS, ...readCachedFlags() };
}
