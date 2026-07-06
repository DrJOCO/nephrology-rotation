// Invariants for rotations/{code}/feedback/{entryId} — see firestore.rules
// match /feedback/{entryId} plus hasValidStudentFeedback.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { addDoc, deleteDoc, doc, getDoc, getDocs, setDoc, collection } from "firebase/firestore";
import { makeTestEnv, minimalFeedback, minimalRotation } from "./helpers";

const ROTATION = "GS-26";
const STUDENT_A = "student-a-uid";
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
    // isAdmin() requires an /admins/{uid} doc, independent of rotation ownership.
    await setDoc(doc(db, "admins", ADMIN), { email: "owner@example.com" });
    await setDoc(doc(db, "rotations", ROTATION), minimalRotation({ ownerUid: ADMIN, adminUids: [ADMIN] }));
    await setDoc(doc(db, "rotations", ROTATION, "students", STUDENT_A), { name: "Ana" });
  });
});

describe("feedback: student create with exact shape", () => {
  it("a rotation student can create their own feedback entry", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertSucceeds(
      addDoc(collection(alice.firestore(), "rotations", ROTATION, "feedback"), minimalFeedback(STUDENT_A))
    );
  });

  it("rejects create for another studentId (spoofing)", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      addDoc(
        collection(alice.firestore(), "rotations", ROTATION, "feedback"),
        minimalFeedback("someone-else-uid")
      )
    );
  });

  it("rejects a tag outside the whitelist", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      addDoc(
        collection(alice.firestore(), "rotations", ROTATION, "feedback"),
        minimalFeedback(STUDENT_A, { tag: "Spam" })
      )
    );
  });

  it("rejects a note over 500 chars", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      addDoc(
        collection(alice.firestore(), "rotations", ROTATION, "feedback"),
        minimalFeedback(STUDENT_A, { note: "x".repeat(501) })
      )
    );
  });

  it("accepts a note at exactly 500 chars", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertSucceeds(
      addDoc(
        collection(alice.firestore(), "rotations", ROTATION, "feedback"),
        minimalFeedback(STUDENT_A, { note: "x".repeat(500) })
      )
    );
  });

  it("rejects an entry with an extra, unlisted key (hasOnly)", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      addDoc(collection(alice.firestore(), "rotations", ROTATION, "feedback"), {
        ...minimalFeedback(STUDENT_A),
        extraField: "not allowed",
      })
    );
  });

  it("a non-rotation-member cannot create feedback", async () => {
    const outsider = testEnv.authenticatedContext("outsider-uid");
    await assertFails(
      addDoc(collection(outsider.firestore(), "rotations", ROTATION, "feedback"), minimalFeedback("outsider-uid"))
    );
  });
});

describe("feedback: students cannot get/list, including their own", () => {
  it("a student cannot get an entry they created", async () => {
    let entryId = "";
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(
        collection(ctx.firestore(), "rotations", ROTATION, "feedback"),
        minimalFeedback(STUDENT_A)
      );
      entryId = ref.id;
    });
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(getDoc(doc(alice.firestore(), "rotations", ROTATION, "feedback", entryId)));
  });

  it("a student cannot list the feedback collection", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(getDocs(collection(alice.firestore(), "rotations", ROTATION, "feedback")));
  });
});

describe("feedback: admin get/list/delete", () => {
  it("a rotation admin can get an entry", async () => {
    let entryId = "";
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(
        collection(ctx.firestore(), "rotations", ROTATION, "feedback"),
        minimalFeedback(STUDENT_A)
      );
      entryId = ref.id;
    });
    const admin = testEnv.authenticatedContext(ADMIN);
    await assertSucceeds(getDoc(doc(admin.firestore(), "rotations", ROTATION, "feedback", entryId)));
  });

  it("a rotation admin can list the feedback collection", async () => {
    const admin = testEnv.authenticatedContext(ADMIN);
    await assertSucceeds(getDocs(collection(admin.firestore(), "rotations", ROTATION, "feedback")));
  });

  it("a rotation admin can delete an entry", async () => {
    let entryId = "";
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(
        collection(ctx.firestore(), "rotations", ROTATION, "feedback"),
        minimalFeedback(STUDENT_A)
      );
      entryId = ref.id;
    });
    const admin = testEnv.authenticatedContext(ADMIN);
    await assertSucceeds(deleteDoc(doc(admin.firestore(), "rotations", ROTATION, "feedback", entryId)));
  });
});

describe("feedback: update always denied", () => {
  it("denies update even for the admin", async () => {
    let entryId = "";
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(
        collection(ctx.firestore(), "rotations", ROTATION, "feedback"),
        minimalFeedback(STUDENT_A)
      );
      entryId = ref.id;
    });
    const admin = testEnv.authenticatedContext(ADMIN);
    await assertFails(
      setDoc(doc(admin.firestore(), "rotations", ROTATION, "feedback", entryId), minimalFeedback(STUDENT_A, { tag: "Idea" }))
    );
  });

  it("denies update for the creating student", async () => {
    let entryId = "";
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const ref = await addDoc(
        collection(ctx.firestore(), "rotations", ROTATION, "feedback"),
        minimalFeedback(STUDENT_A)
      );
      entryId = ref.id;
    });
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "feedback", entryId), minimalFeedback(STUDENT_A, { tag: "Idea" }))
    );
  });
});
