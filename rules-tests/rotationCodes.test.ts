// Invariants for rotationCodes/{rotationCode} — see firestore.rules match
// /rotationCodes/{rotationCode}.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";
import { makeTestEnv } from "./helpers";

const ROTATION = "GS-26";
const OWNER = "owner-uid-1";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await makeTestEnv();
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "admins", OWNER), { email: "owner@example.com" });
  });
});

describe("rotationCodes: signed-in get", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotationCodes", ROTATION), { rotationCode: ROTATION, ownerUid: OWNER });
    });
  });

  it("any signed-in user can get a rotation code doc", async () => {
    const student = testEnv.authenticatedContext("some-student-uid");
    await assertSucceeds(getDoc(doc(student.firestore(), "rotationCodes", ROTATION)));
  });

  it("an unauthenticated user cannot get a rotation code doc", async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "rotationCodes", ROTATION)));
  });
});

describe("rotationCodes: create requires ownerUid == auth.uid", () => {
  it("an admin can create a code naming themself owner", async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    await assertSucceeds(
      setDoc(doc(owner.firestore(), "rotationCodes", ROTATION), { rotationCode: ROTATION, ownerUid: OWNER })
    );
  });

  it("rejects create naming someone else as owner", async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    await assertFails(
      setDoc(doc(owner.firestore(), "rotationCodes", ROTATION), {
        rotationCode: ROTATION,
        ownerUid: "someone-else",
      })
    );
  });

  it("a non-admin cannot create a rotation code", async () => {
    const notAdmin = testEnv.authenticatedContext("not-an-admin-uid");
    await assertFails(
      setDoc(doc(notAdmin.firestore(), "rotationCodes", ROTATION), {
        rotationCode: ROTATION,
        ownerUid: "not-an-admin-uid",
      })
    );
  });
});

describe("rotationCodes: list denied", () => {
  it("denies list even for an admin", async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    await assertFails(getDocs(collection(owner.firestore(), "rotationCodes")));
  });
});
