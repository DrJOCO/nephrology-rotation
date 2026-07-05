// validateRotationCode must distinguish "the rotationCodes doc is genuinely
// missing" from "we couldn't reach auth/Firestore". The old bare `catch { return
// false }` collapsed both into false, so a student on hospital wifi that blocks
// googleapis.com was wrongly told the code was wrong. These tests lock in the
// three-way result: { ok: true, exists: true } / { ok: true, exists: false } /
// { ok: false }.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const rotationCodeDocs = new Set<string>();
  const state = {
    // Toggle to simulate each layer failing (blocked googleapis.com, auth error).
    getFirebaseThrows: false,
    signInThrows: false,
    getDocThrows: false,
    // Whether waitForAuthUser reports an already-signed-in user.
    existingUser: null as null | { isAnonymous: boolean },
    currentUser: null as null | { isAnonymous: boolean },
    signInCalls: 0,
    signOutCalls: 0,
  };
  const fs = {
    doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join("/") }),
    getDoc: async (ref: { path: string }) => {
      if (state.getDocThrows) throw new Error("network: googleapis.com blocked");
      const code = ref.path.split("/").pop() as string;
      const exists = rotationCodeDocs.has(code);
      return { exists: () => exists };
    },
  };
  const authMod = {
    signInAnonymously: async () => {
      state.signInCalls += 1;
      if (state.signInThrows) throw new Error("auth/network-request-failed");
      state.currentUser = { isAnonymous: true };
      return { user: state.currentUser };
    },
    signOut: async () => {
      state.signOutCalls += 1;
      state.currentUser = null;
    },
  };
  const auth = {
    get currentUser() {
      return state.currentUser;
    },
  };
  return { rotationCodeDocs, state, fs, authMod, auth };
});

vi.mock("./firebase", () => ({
  getFirebase: async () => {
    if (mocks.state.getFirebaseThrows) throw new Error("network: googleapis.com blocked");
    return { db: {}, fs: mocks.fs, auth: mocks.auth, authMod: mocks.authMod };
  },
  waitForAuthUser: async () => mocks.state.existingUser,
  getBootstrapAdminLegacyUids: () => [],
  getCurrentAdminUser: async () => null,
  isBootstrapAdminEmail: () => false,
}));

import store from "./store";

beforeEach(() => {
  mocks.rotationCodeDocs.clear();
  mocks.state.getFirebaseThrows = false;
  mocks.state.signInThrows = false;
  mocks.state.getDocThrows = false;
  mocks.state.existingUser = null;
  mocks.state.currentUser = null;
  mocks.state.signInCalls = 0;
  mocks.state.signOutCalls = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("validateRotationCode", () => {
  it("returns ok:true, exists:true when the rotation code doc is present", async () => {
    mocks.rotationCodeDocs.add("GS-APR26");
    const result = await store.validateRotationCode("GS-APR26");
    expect(result).toEqual({ ok: true, exists: true });
  });

  it("returns ok:true, exists:false when the code doc is genuinely missing", async () => {
    // No doc seeded → the getDoc succeeds but reports the doc is absent. This
    // is the ONLY case that should surface a "Rotation not found" message.
    const result = await store.validateRotationCode("TYPO-CODE");
    expect(result).toEqual({ ok: true, exists: false });
  });

  it("returns ok:false when Firestore getDoc fails (blocked googleapis.com)", async () => {
    mocks.rotationCodeDocs.add("GS-APR26");
    mocks.state.getDocThrows = true;
    const result = await store.validateRotationCode("GS-APR26");
    // Network failure must NOT masquerade as a missing code.
    expect(result).toEqual({ ok: false });
  });

  it("returns ok:false when anonymous sign-in fails", async () => {
    mocks.state.signInThrows = true;
    const result = await store.validateRotationCode("GS-APR26");
    expect(result).toEqual({ ok: false });
  });

  it("returns ok:false when Firebase itself can't be reached", async () => {
    mocks.state.getFirebaseThrows = true;
    const result = await store.validateRotationCode("GS-APR26");
    expect(result).toEqual({ ok: false });
  });

  it("clears the temporary anonymous session it created after a successful check", async () => {
    mocks.rotationCodeDocs.add("GS-APR26");
    await store.validateRotationCode("GS-APR26");
    expect(mocks.state.signInCalls).toBe(1);
    expect(mocks.state.signOutCalls).toBe(1);
  });

  it("does not sign out a pre-existing (non-anonymous) session", async () => {
    mocks.state.existingUser = { isAnonymous: false };
    mocks.state.currentUser = { isAnonymous: false };
    mocks.rotationCodeDocs.add("GS-APR26");
    await store.validateRotationCode("GS-APR26");
    expect(mocks.state.signInCalls).toBe(0);
    expect(mocks.state.signOutCalls).toBe(0);
  });
});
