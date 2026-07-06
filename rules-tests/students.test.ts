// Invariants for rotations/{code}/students/{studentId} — see firestore.rules
// match /students/{studentId} plus hasValidStudentName / hasNoLegacyStudentLoginPin.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";
import { makeTestEnv, minimalRotation, minimalStudentDoc } from "./helpers";

const ROTATION = "GS-26";
const STUDENT_A = "student-a-uid";
const STUDENT_B = "student-b-uid";
const ADMIN = "owner-uid-1";

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
    // isAdmin() requires an /admins/{uid} doc — every "rotation admin" actor
    // in this file needs one, independent of rotation ownerUid/adminUids.
    await setDoc(doc(db, "admins", ADMIN), { email: "owner@example.com" });
    await setDoc(doc(db, "rotations", ROTATION), minimalRotation({ ownerUid: ADMIN, adminUids: [ADMIN] }));
    await setDoc(doc(db, "rotationCodes", ROTATION), { rotationCode: ROTATION, ownerUid: ADMIN });
  });
});

describe("students: get/update own doc only", () => {
  it("a student can create their own doc", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertSucceeds(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "students", STUDENT_A), minimalStudentDoc())
    );
  });

  it("a student can get their own doc", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "students", STUDENT_A), minimalStudentDoc());
    });
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertSucceeds(getDoc(doc(alice.firestore(), "rotations", ROTATION, "students", STUDENT_A)));
  });

  it("a student cannot get another student's doc", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "students", STUDENT_B), minimalStudentDoc());
    });
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(getDoc(doc(alice.firestore(), "rotations", ROTATION, "students", STUDENT_B)));
  });

  it("a student cannot write another student's doc", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "students", STUDENT_B), minimalStudentDoc())
    );
  });

  it("a student cannot list the students collection", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "students", STUDENT_A), minimalStudentDoc());
    });
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(getDocs(collection(alice.firestore(), "rotations", ROTATION, "students")));
  });

  it("a rotation admin can list the students collection", async () => {
    const admin = testEnv.authenticatedContext(ADMIN);
    await assertSucceeds(getDocs(collection(admin.firestore(), "rotations", ROTATION, "students")));
  });

  it("an unauthenticated user cannot create a student doc", async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(
      setDoc(doc(anon.firestore(), "rotations", ROTATION, "students", STUDENT_A), minimalStudentDoc())
    );
  });
});

describe("students: create/update validation", () => {
  it("rejects create with an empty name", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "students", STUDENT_A), minimalStudentDoc(""))
    );
  });

  it("rejects create with a name over 50 chars", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(
        doc(alice.firestore(), "rotations", ROTATION, "students", STUDENT_A),
        minimalStudentDoc("x".repeat(51))
      )
    );
  });

  it("rejects create carrying a loginPin key", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "students", STUDENT_A), {
        ...minimalStudentDoc(),
        loginPin: "1234",
      })
    );
  });

  it("rejects update carrying a loginPin key", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "students", STUDENT_A), minimalStudentDoc());
    });
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "students", STUDENT_A), {
        ...minimalStudentDoc(),
        loginPin: "1234",
      })
    );
  });

  it("rejects create when no rotationCodes doc exists for the code", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "rotations", "NO-SUCH-CODE", "students", STUDENT_A), minimalStudentDoc())
    );
  });

  it("a rotation admin can create a student doc on the student's behalf", async () => {
    const admin = testEnv.authenticatedContext(ADMIN);
    await assertSucceeds(
      setDoc(doc(admin.firestore(), "rotations", ROTATION, "students", STUDENT_A), minimalStudentDoc())
    );
  });
});

describe("students: tombstoned student create/update denied", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "students", STUDENT_A), minimalStudentDoc());
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A), {
        removedAt: "2026-07-05T12:00:00.000Z",
      });
    });
  });

  it("denies student create once tombstoned", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "students", STUDENT_A), minimalStudentDoc())
    );
  });

  it("denies student update once tombstoned", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "students", STUDENT_A), minimalStudentDoc("New Name"))
    );
  });

  it("denies admin create/update of a tombstoned student too (rule has no admin bypass)", async () => {
    const admin = testEnv.authenticatedContext(ADMIN);
    await assertFails(
      setDoc(doc(admin.firestore(), "rotations", ROTATION, "students", STUDENT_A), minimalStudentDoc())
    );
  });
});

describe("students: delete is admin-only", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "students", STUDENT_A), minimalStudentDoc());
    });
  });

  it("a student cannot delete their own doc", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(deleteDoc(doc(alice.firestore(), "rotations", ROTATION, "students", STUDENT_A)));
  });

  it("a rotation admin can delete a student doc", async () => {
    const admin = testEnv.authenticatedContext(ADMIN);
    await assertSucceeds(deleteDoc(doc(admin.firestore(), "rotations", ROTATION, "students", STUDENT_A)));
  });
});
