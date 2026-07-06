import { describe, it, expect } from "vitest";
import { deleteCollection } from "../src/lib/deleteCollection.js";
import { FakeFirestore } from "./fakeFirestore.js";
// The fake implements the same call surface the Admin SDK Firestore exposes for
// this helper; the cast keeps the test focused without pulling real SDK types.
import type { Firestore } from "firebase-admin/firestore";

function asDb(fake: FakeFirestore): Firestore {
  return fake as unknown as Firestore;
}

describe("deleteCollection", () => {
  it("deletes every document in a collection and returns the count", async () => {
    const fake = new FakeFirestore();
    for (let i = 0; i < 5; i++) {
      fake.store.set(`rotations/GS/students/s${i}`, { name: `S${i}` });
    }
    const removed = await deleteCollection(asDb(fake), fake.collection("rotations/GS/students") as never);
    expect(removed).toBe(5);
    expect([...fake.store.keys()].filter((k) => k.startsWith("rotations/GS/students/"))).toHaveLength(0);
  });

  it("returns 0 and no-ops on an empty collection", async () => {
    const fake = new FakeFirestore();
    const removed = await deleteCollection(asDb(fake), fake.collection("rotations/GS/feedback") as never);
    expect(removed).toBe(0);
  });

  it("pages through more docs than one batch (>300)", async () => {
    const fake = new FakeFirestore();
    for (let i = 0; i < 701; i++) {
      fake.store.set(`rotations/GS/students/s${i}`, { i });
    }
    const removed = await deleteCollection(asDb(fake), fake.collection("rotations/GS/students") as never);
    expect(removed).toBe(701);
    expect([...fake.store.keys()].filter((k) => k.startsWith("rotations/GS/students/"))).toHaveLength(0);
  });

  it("only touches direct children, not sibling collections", async () => {
    const fake = new FakeFirestore();
    fake.store.set("rotations/GS/students/s1", { name: "A" });
    fake.store.set("rotations/GS/team/s1", { name: "A" });
    fake.store.set("rotations/OTHER/students/s1", { name: "B" });
    await deleteCollection(asDb(fake), fake.collection("rotations/GS/students") as never);
    expect(fake.store.has("rotations/GS/team/s1")).toBe(true);
    expect(fake.store.has("rotations/OTHER/students/s1")).toBe(true);
  });
});
