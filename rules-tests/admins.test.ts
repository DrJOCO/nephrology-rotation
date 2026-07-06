// Invariants for admins/{uid} — see firestore.rules match /admins/{uid}.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { BOOTSTRAP_ADMIN_EMAIL, makeTestEnv } from "./helpers";

const UID_A = "admin-a-uid";
const UID_B = "admin-b-uid";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await makeTestEnv();
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("admins: self get only", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "admins", UID_A), { email: "a@example.com" });
    });
  });

  it("a user can get their own admin doc", async () => {
    const a = testEnv.authenticatedContext(UID_A);
    await assertSucceeds(getDoc(doc(a.firestore(), "admins", UID_A)));
  });

  it("a user cannot get another user's admin doc", async () => {
    const b = testEnv.authenticatedContext(UID_B);
    await assertFails(getDoc(doc(b.firestore(), "admins", UID_A)));
  });
});

describe("admins: create requires invite or bootstrap email", () => {
  it("the bootstrap admin can self-create without an invite", async () => {
    const bootstrap = testEnv.authenticatedContext("bootstrap-uid", { email: BOOTSTRAP_ADMIN_EMAIL });
    await assertSucceeds(
      setDoc(doc(bootstrap.firestore(), "admins", "bootstrap-uid"), { email: BOOTSTRAP_ADMIN_EMAIL })
    );
  });

  it("a user with a matching invite can self-create as admin", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "adminInvites", "invitee@example.com"), {
        email: "invitee@example.com",
        createdByUid: "bootstrap-uid",
      });
    });
    const invitee = testEnv.authenticatedContext("invitee-uid", { email: "invitee@example.com" });
    await assertSucceeds(
      setDoc(doc(invitee.firestore(), "admins", "invitee-uid"), { email: "invitee@example.com" })
    );
  });

  it("a user with no invite and non-bootstrap email cannot self-create as admin", async () => {
    const uninvited = testEnv.authenticatedContext("uninvited-uid", { email: "uninvited@example.com" });
    await assertFails(
      setDoc(doc(uninvited.firestore(), "admins", "uninvited-uid"), { email: "uninvited@example.com" })
    );
  });

  it("rejects create for a different uid than the caller, even with an invite", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "adminInvites", "invitee@example.com"), {
        email: "invitee@example.com",
        createdByUid: "bootstrap-uid",
      });
    });
    const invitee = testEnv.authenticatedContext("invitee-uid", { email: "invitee@example.com" });
    await assertFails(
      setDoc(doc(invitee.firestore(), "admins", "someone-else-uid"), { email: "invitee@example.com" })
    );
  });

  it("rejects create where the email doesn't match the signed-in email", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "adminInvites", "invitee@example.com"), {
        email: "invitee@example.com",
        createdByUid: "bootstrap-uid",
      });
    });
    const invitee = testEnv.authenticatedContext("invitee-uid", { email: "invitee@example.com" });
    await assertFails(
      setDoc(doc(invitee.firestore(), "admins", "invitee-uid"), { email: "someone-else@example.com" })
    );
  });
});

describe("admins: update/delete always denied", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "admins", UID_A), { email: "a@example.com" });
    });
  });

  it("denies update even by the doc's own owner", async () => {
    const a = testEnv.authenticatedContext(UID_A);
    await assertFails(updateDoc(doc(a.firestore(), "admins", UID_A), { email: "changed@example.com" }));
  });

  it("denies delete even by the doc's own owner", async () => {
    const a = testEnv.authenticatedContext(UID_A);
    await assertFails(deleteDoc(doc(a.firestore(), "admins", UID_A)));
  });

  it("denies delete by the bootstrap admin too (no bypass in rule)", async () => {
    const bootstrap = testEnv.authenticatedContext("bootstrap-uid", { email: BOOTSTRAP_ADMIN_EMAIL });
    await assertFails(deleteDoc(doc(bootstrap.firestore(), "admins", UID_A)));
  });
});
