// Invariants for adminInvites/{emailKey} — see firestore.rules match
// /adminInvites/{emailKey}.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, collection } from "firebase/firestore";
import { BOOTSTRAP_ADMIN_EMAIL, makeTestEnv } from "./helpers";

const INVITEE_EMAIL = "new.attending@example.com";
const INVITEE_UID = "invitee-uid";

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

describe("adminInvites: bootstrap admin manages invites", () => {
  it("the bootstrap admin can create an invite", async () => {
    const bootstrap = testEnv.authenticatedContext("bootstrap-uid", { email: BOOTSTRAP_ADMIN_EMAIL });
    await assertSucceeds(
      setDoc(doc(bootstrap.firestore(), "adminInvites", INVITEE_EMAIL), {
        email: INVITEE_EMAIL,
        createdByUid: "bootstrap-uid",
      })
    );
  });

  it("a non-bootstrap admin cannot create an invite", async () => {
    const someoneElse = testEnv.authenticatedContext("some-admin-uid", { email: "someone@example.com" });
    await assertFails(
      setDoc(doc(someoneElse.firestore(), "adminInvites", INVITEE_EMAIL), {
        email: INVITEE_EMAIL,
        createdByUid: "some-admin-uid",
      })
    );
  });

  it("the bootstrap admin can list invites", async () => {
    const bootstrap = testEnv.authenticatedContext("bootstrap-uid", { email: BOOTSTRAP_ADMIN_EMAIL });
    await assertSucceeds(getDocs(collection(bootstrap.firestore(), "adminInvites")));
  });

  it("a non-bootstrap admin cannot list invites", async () => {
    const someoneElse = testEnv.authenticatedContext("some-admin-uid", { email: "someone@example.com" });
    await assertFails(getDocs(collection(someoneElse.firestore(), "adminInvites")));
  });

  it("the bootstrap admin can delete an invite", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "adminInvites", INVITEE_EMAIL), {
        email: INVITEE_EMAIL,
        createdByUid: "bootstrap-uid",
      });
    });
    const bootstrap = testEnv.authenticatedContext("bootstrap-uid", { email: BOOTSTRAP_ADMIN_EMAIL });
    await assertSucceeds(deleteDoc(doc(bootstrap.firestore(), "adminInvites", INVITEE_EMAIL)));
  });
});

describe("adminInvites: invitee claim flow", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "adminInvites", INVITEE_EMAIL), {
        email: INVITEE_EMAIL,
        createdByUid: "bootstrap-uid",
        status: "pending",
      });
    });
  });

  it("the invitee can get their own invite", async () => {
    const invitee = testEnv.authenticatedContext(INVITEE_UID, { email: INVITEE_EMAIL });
    await assertSucceeds(getDoc(doc(invitee.firestore(), "adminInvites", INVITEE_EMAIL)));
  });

  it("someone else cannot get another person's invite", async () => {
    const outsider = testEnv.authenticatedContext("outsider-uid", { email: "outsider@example.com" });
    await assertFails(getDoc(doc(outsider.firestore(), "adminInvites", INVITEE_EMAIL)));
  });

  it("the invitee can claim by updating only the allowed keys", async () => {
    const invitee = testEnv.authenticatedContext(INVITEE_UID, { email: INVITEE_EMAIL });
    await assertSucceeds(
      updateDoc(doc(invitee.firestore(), "adminInvites", INVITEE_EMAIL), {
        claimedAt: "2026-07-05T12:00:00.000Z",
        claimedByUid: INVITEE_UID,
        claimedByEmail: INVITEE_EMAIL,
        status: "claimed",
      })
    );
  });

  it("rejects a claim update touching a disallowed key (e.g. email)", async () => {
    const invitee = testEnv.authenticatedContext(INVITEE_UID, { email: INVITEE_EMAIL });
    await assertFails(
      updateDoc(doc(invitee.firestore(), "adminInvites", INVITEE_EMAIL), {
        claimedAt: "2026-07-05T12:00:00.000Z",
        claimedByUid: INVITEE_UID,
        claimedByEmail: INVITEE_EMAIL,
        status: "claimed",
        email: "hijacked@example.com",
      })
    );
  });

  it("rejects a claim naming a different uid than the caller", async () => {
    const invitee = testEnv.authenticatedContext(INVITEE_UID, { email: INVITEE_EMAIL });
    await assertFails(
      updateDoc(doc(invitee.firestore(), "adminInvites", INVITEE_EMAIL), {
        claimedAt: "2026-07-05T12:00:00.000Z",
        claimedByUid: "someone-else-uid",
        claimedByEmail: INVITEE_EMAIL,
        status: "claimed",
      })
    );
  });

  it("someone else cannot claim another person's invite", async () => {
    const outsider = testEnv.authenticatedContext("outsider-uid", { email: "outsider@example.com" });
    await assertFails(
      updateDoc(doc(outsider.firestore(), "adminInvites", INVITEE_EMAIL), {
        claimedAt: "2026-07-05T12:00:00.000Z",
        claimedByUid: "outsider-uid",
        claimedByEmail: "outsider@example.com",
        status: "claimed",
      })
    );
  });
});
