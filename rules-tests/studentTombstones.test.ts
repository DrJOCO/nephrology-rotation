// Invariants for rotations/{code}/studentTombstones/{studentId} — see
// firestore.rules match /studentTombstones/{studentId}.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";
import { makeTestEnv, minimalRotation } from "./helpers";

const ROTATION = "GS-26";
const STUDENT_A = "student-a-uid";
const ADMIN = "owner-uid-1";
const TOMBSTONE = { removedAt: "2026-07-05T12:00:00.000Z" };

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
    const db = ctx.firestore();
    // isAdmin() requires an /admins/{uid} doc, independent of rotation ownership.
    await setDoc(doc(db, "admins", ADMIN), { email: "owner@example.com" });
    await setDoc(doc(db, "rotations", ROTATION), minimalRotation({ ownerUid: ADMIN, adminUids: [ADMIN] }));
  });
});

describe("studentTombstones: admin create/delete only", () => {
  it("a rotation admin can create a tombstone", async () => {
    const admin = testEnv.authenticatedContext(ADMIN);
    await assertSucceeds(
      setDoc(doc(admin.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A), TOMBSTONE)
    );
  });

  it("a student cannot create a tombstone for themselves", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A), TOMBSTONE)
    );
  });

  it("a rotation admin can delete a tombstone", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A), TOMBSTONE);
    });
    const admin = testEnv.authenticatedContext(ADMIN);
    await assertSucceeds(deleteDoc(doc(admin.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A)));
  });

  it("a student cannot delete their own tombstone (cannot un-remove themselves)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A), TOMBSTONE);
    });
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(deleteDoc(doc(alice.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A)));
  });
});

describe("studentTombstones: student can get own", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A), TOMBSTONE);
    });
  });

  it("a student can get their own tombstone", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertSucceeds(getDoc(doc(alice.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A)));
  });

  it("a student cannot get another student's tombstone", async () => {
    const bob = testEnv.authenticatedContext("student-b-uid");
    await assertFails(getDoc(doc(bob.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A)));
  });
});

describe("studentTombstones: update denied", () => {
  it("denies update even for the admin", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A), TOMBSTONE);
    });
    const admin = testEnv.authenticatedContext(ADMIN);
    await assertFails(
      setDoc(doc(admin.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A), {
        removedAt: "2026-07-06T12:00:00.000Z",
      })
    );
  });
});

describe("studentTombstones: list admin-only", () => {
  it("a rotation admin can list tombstones", async () => {
    const admin = testEnv.authenticatedContext(ADMIN);
    await assertSucceeds(getDocs(collection(admin.firestore(), "rotations", ROTATION, "studentTombstones")));
  });

  it("a student cannot list tombstones", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(getDocs(collection(alice.firestore(), "rotations", ROTATION, "studentTombstones")));
  });
});
