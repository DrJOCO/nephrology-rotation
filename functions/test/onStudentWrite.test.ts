import { describe, it, expect } from "vitest";
import { applyStudentAggregate, studentCountDelta } from "../src/onStudentWrite.js";
import { FakeFirestore } from "./fakeFirestore.js";
import type { Firestore } from "firebase-admin/firestore";

function asDb(fake: FakeFirestore): Firestore {
  return fake as unknown as Firestore;
}

const NOW = "2026-07-06T12:00:00.000Z";

describe("studentCountDelta", () => {
  it("is +1 on create (absent -> present)", () => {
    expect(studentCountDelta(false, true)).toBe(1);
  });
  it("is -1 on delete (present -> absent)", () => {
    expect(studentCountDelta(true, false)).toBe(-1);
  });
  it("is 0 on update (present -> present)", () => {
    expect(studentCountDelta(true, true)).toBe(0);
  });
  it("is 0 on a no-op (absent -> absent)", () => {
    expect(studentCountDelta(false, false)).toBe(0);
  });
});

describe("applyStudentAggregate", () => {
  // Seeding: when the field is missing, the count comes from the students
  // collection's actual size (post-write truth), NOT base 0 + delta — a
  // rotation that predates the function's deploy already has students, and a
  // delta-from-zero would persist a wrong count the client fallback can no
  // longer correct once the field exists.
  it("seeds from the students collection size when the field is missing (pre-deploy rotation)", async () => {
    const fake = new FakeFirestore();
    fake.store.set("rotations/GS", { name: "GS" });
    // Three students already enrolled, the third being the just-written doc
    // that fired the trigger.
    fake.store.set("rotations/GS/students/a", { name: "A" });
    fake.store.set("rotations/GS/students/b", { name: "B" });
    fake.store.set("rotations/GS/students/c", { name: "C" });
    await applyStudentAggregate(asDb(fake), "GS", 1, NOW);
    const doc = fake.store.get("rotations/GS");
    expect(doc?.studentCount).toBe(3); // collection size, delta not applied on top
    expect(doc?.lastStudentActivityAt).toBe(NOW);
  });

  it("seeds to 1 on the first-ever create for a brand-new rotation", async () => {
    const fake = new FakeFirestore();
    fake.store.set("rotations/GS", { name: "GS" });
    fake.store.set("rotations/GS/students/a", { name: "A" });
    await applyStudentAggregate(asDb(fake), "GS", 1, NOW);
    expect(fake.store.get("rotations/GS")?.studentCount).toBe(1);
  });

  it("seeds from collection size on a delete when the field is missing", async () => {
    const fake = new FakeFirestore();
    fake.store.set("rotations/GS", { name: "GS" });
    // Two students remain after the delete that fired the trigger.
    fake.store.set("rotations/GS/students/a", { name: "A" });
    fake.store.set("rotations/GS/students/b", { name: "B" });
    await applyStudentAggregate(asDb(fake), "GS", -1, NOW);
    expect(fake.store.get("rotations/GS")?.studentCount).toBe(2);
  });

  it("increments an existing count", async () => {
    const fake = new FakeFirestore();
    fake.store.set("rotations/GS", { name: "GS", studentCount: 3 });
    await applyStudentAggregate(asDb(fake), "GS", 1, NOW);
    expect(fake.store.get("rotations/GS")?.studentCount).toBe(4);
  });

  it("decrements on delete", async () => {
    const fake = new FakeFirestore();
    fake.store.set("rotations/GS", { name: "GS", studentCount: 3 });
    await applyStudentAggregate(asDb(fake), "GS", -1, NOW);
    expect(fake.store.get("rotations/GS")?.studentCount).toBe(2);
  });

  it("clamps at 0 — never goes negative even if the stored count drifted low", async () => {
    const fake = new FakeFirestore();
    fake.store.set("rotations/GS", { name: "GS", studentCount: 0 });
    await applyStudentAggregate(asDb(fake), "GS", -1, NOW);
    expect(fake.store.get("rotations/GS")?.studentCount).toBe(0);
  });

  it("re-seeds from collection size when the stored count is non-numeric", async () => {
    const fake = new FakeFirestore();
    fake.store.set("rotations/GS", { name: "GS", studentCount: "oops" });
    fake.store.set("rotations/GS/students/a", { name: "A" });
    fake.store.set("rotations/GS/students/b", { name: "B" });
    await applyStudentAggregate(asDb(fake), "GS", 1, NOW);
    expect(fake.store.get("rotations/GS")?.studentCount).toBe(2);
  });

  it("no-ops (writes nothing) when the rotation doc is gone", async () => {
    const fake = new FakeFirestore();
    // Rotation deleted concurrently — no doc at rotations/GS.
    await applyStudentAggregate(asDb(fake), "GS", -1, NOW);
    expect(fake.store.has("rotations/GS")).toBe(false);
  });

  it("bumps lastStudentActivityAt on an update (delta 0) without changing count", async () => {
    const fake = new FakeFirestore();
    fake.store.set("rotations/GS", { name: "GS", studentCount: 2, lastStudentActivityAt: "old" });
    await applyStudentAggregate(asDb(fake), "GS", 0, NOW);
    const doc = fake.store.get("rotations/GS");
    expect(doc?.studentCount).toBe(2);
    expect(doc?.lastStudentActivityAt).toBe(NOW);
  });
});
