// Invariants for rotations/{code}/team/{studentId} — see firestore.rules
// match /team/{studentId} plus hasValidTeamSnapshot bounds.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDocs, setDoc, collection } from "firebase/firestore";
import { makeTestEnv, minimalRotation, minimalTeamSnapshot } from "./helpers";

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
    await setDoc(doc(db, "rotations", ROTATION), minimalRotation({ ownerUid: ADMIN, adminUids: [ADMIN] }));
    await setDoc(doc(db, "rotationCodes", ROTATION), { rotationCode: ROTATION, ownerUid: ADMIN });
  });
});

describe("team: shape validation", () => {
  it("accepts a minimal valid snapshot", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertSucceeds(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "team", STUDENT_A), minimalTeamSnapshot(STUDENT_A))
    );
  });

  it("rejects points over the 10000 ceiling", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(
        doc(alice.firestore(), "rotations", ROTATION, "team", STUDENT_A),
        minimalTeamSnapshot(STUDENT_A, { points: 999999 })
      )
    );
  });

  it("rejects negative points", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(
        doc(alice.firestore(), "rotations", ROTATION, "team", STUDENT_A),
        minimalTeamSnapshot(STUDENT_A, { points: -1 })
      )
    );
  });

  it("rejects patientCount over the 500 ceiling", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(
        doc(alice.firestore(), "rotations", ROTATION, "team", STUDENT_A),
        minimalTeamSnapshot(STUDENT_A, { patientCount: 501 })
      )
    );
  });

  it("rejects a missing levelName", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    const snapshot = minimalTeamSnapshot(STUDENT_A) as Record<string, unknown>;
    delete snapshot.levelName;
    await assertFails(setDoc(doc(alice.firestore(), "rotations", ROTATION, "team", STUDENT_A), snapshot));
  });

  it("rejects topicCounts that is not a map", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(
        doc(alice.firestore(), "rotations", ROTATION, "team", STUDENT_A),
        minimalTeamSnapshot(STUDENT_A, { topicCounts: "not-a-map" })
      )
    );
  });
});

describe("team: student can write own only", () => {
  it("a student can write their own snapshot", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertSucceeds(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "team", STUDENT_A), minimalTeamSnapshot(STUDENT_A))
    );
  });

  it("a student cannot write another student's snapshot", async () => {
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "team", STUDENT_B), minimalTeamSnapshot(STUDENT_B))
    );
  });

  it("a rotation student can read the whole team collection (leaderboard)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "students", STUDENT_A), { name: "Ana" });
    });
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertSucceeds(getDocs(collection(alice.firestore(), "rotations", ROTATION, "team")));
  });

  it("a non-rotation-member cannot read the team collection", async () => {
    const outsider = testEnv.authenticatedContext("some-other-uid");
    await assertFails(getDocs(collection(outsider.firestore(), "rotations", ROTATION, "team")));
  });
});

describe("team: tombstone blocks writes", () => {
  it("denies a tombstoned student's team write", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "rotations", ROTATION, "studentTombstones", STUDENT_A), {
        removedAt: "2026-07-05T12:00:00.000Z",
      });
    });
    const alice = testEnv.authenticatedContext(STUDENT_A);
    await assertFails(
      setDoc(doc(alice.firestore(), "rotations", ROTATION, "team", STUDENT_A), minimalTeamSnapshot(STUDENT_A))
    );
  });
});
