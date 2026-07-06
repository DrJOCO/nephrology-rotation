// Invariant for the deny-all fallthrough — see firestore.rules
// match /{document=**}. Anything not covered by an explicit match block
// (including brand-new top-level collections nobody has written rules for
// yet) must be fully denied.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { makeTestEnv } from "./helpers";

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

describe("deny-all fallthrough", () => {
  it("denies read of an unlisted top-level collection", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "somethingNew", "doc1"), { anything: true });
    });
    const someone = testEnv.authenticatedContext("some-uid");
    await assertFails(getDoc(doc(someone.firestore(), "somethingNew", "doc1")));
  });

  it("denies write of an unlisted top-level collection", async () => {
    const someone = testEnv.authenticatedContext("some-uid");
    await assertFails(setDoc(doc(someone.firestore(), "somethingNew", "doc1"), { anything: true }));
  });

  it("denies even the bootstrap admin on an unlisted collection", async () => {
    const bootstrap = testEnv.authenticatedContext("bootstrap-uid", { email: "joncheng5@gmail.com" });
    await assertFails(setDoc(doc(bootstrap.firestore(), "somethingNew", "doc1"), { anything: true }));
  });
});
