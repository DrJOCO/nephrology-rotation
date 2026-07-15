// Invariants for studentAssignments/{studentId} — see firestore.rules match
// /studentAssignments/{studentId}.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";
import { makeTestEnv, minimalRotation } from "./helpers";

const ROTATION = "GS-26";
const STUDENT_A = "student-a-uid";
const RA_ADMIN = "rotation-admin-uid";
const OTHER_ADMIN = "other-admin-uid";

function minimalAssignment(studentId: string, overrides: Record<string, unknown> = {}) {
  return {
    studentId,
    activeRotationCode: ROTATION,
    rotationCodes: [ROTATION],
    updatedAt: "2026-07-05T12:00:00.000Z",
    ...overrides,
  };
}

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
    for (const uid of [RA_ADMIN, OTHER_ADMIN]) {
      await setDoc(doc(db, "admins", uid), { email: `${uid}@example.com` });
    }
    await setDoc(doc(db, "rotations", ROTATION), minimalRotation({ ownerUid: RA_ADMIN, adminUids: [RA_ADMIN] }));
  });
});

describe("studentAssignments: owner get/create/update with shape", () => {
  it("the student can create their own assignment doc", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertSucceeds(
      setDoc(doc(alice.firestore(), "studentAssignments", STUDENT_A), minimalAssignment(STUDENT_A))
    );
  });

  it("the student can get their own assignment doc", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "studentAssignments", STUDENT_A), minimalAssignment(STUDENT_A));
    });
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertSucceeds(getDoc(doc(alice.firestore(), "studentAssignments", STUDENT_A)));
  });

  it("the student can update their own assignment doc", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "studentAssignments", STUDENT_A), minimalAssignment(STUDENT_A));
    });
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertSucceeds(
      setDoc(
        doc(alice.firestore(), "studentAssignments", STUDENT_A),
        minimalAssignment(STUDENT_A, { activeRotationCode: "GS-27", rotationCodes: [ROTATION, "GS-27"] })
      )
    );
  });

  it("rejects create for another student's uid", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "studentAssignments", "someone-else"), minimalAssignment("someone-else"))
    );
  });

  it("rejects a too-short activeRotationCode", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(
        doc(alice.firestore(), "studentAssignments", STUDENT_A),
        minimalAssignment(STUDENT_A, { activeRotationCode: "abc" })
      )
    );
  });

  it("rejects rotationCodes as an empty list", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "studentAssignments", STUDENT_A), minimalAssignment(STUDENT_A, { rotationCodes: [] }))
    );
  });
});

describe("studentAssignments: list denied", () => {
  it("denies list even for an admin", async () => {
    const admin = testEnv.authenticatedContext(RA_ADMIN);
    await assertFails(getDocs(collection(admin.firestore(), "studentAssignments")));
  });
});

describe("studentAssignments: rotation-admin get", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "studentAssignments", STUDENT_A), minimalAssignment(STUDENT_A));
    });
  });

  it("an admin of the student's active rotation can get the assignment doc", async () => {
    const admin = testEnv.authenticatedContext(RA_ADMIN);
    await assertSucceeds(getDoc(doc(admin.firestore(), "studentAssignments", STUDENT_A)));
  });

  it("an admin of a DIFFERENT rotation cannot get the assignment doc", async () => {
    const other = testEnv.authenticatedContext(OTHER_ADMIN);
    await assertFails(getDoc(doc(other.firestore(), "studentAssignments", STUDENT_A)));
  });
});
