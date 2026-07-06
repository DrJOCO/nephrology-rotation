// Invariants for the two Wave-1 additions written by parallel workstreams:
// appConfig/{docId} (WS-3 feature flags: any signed-in read, bootstrap-admin
// write) and mail/{docId} (WS-4 Trigger Email outbox: no client access at all
// — only the Admin SDK, which bypasses rules, may write it).
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
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

describe("appConfig/flags (feature flags)", () => {
  it("any signed-in user can get the flags doc", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "appConfig", "flags"), { feedbackEnabled: true });
    });
    const student = testEnv.authenticatedContext("student-uid");
    await assertSucceeds(getDoc(doc(student.firestore(), "appConfig", "flags")));
  });

  it("an unauthenticated client is denied get", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "appConfig", "flags"), { feedbackEnabled: true });
    });
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "appConfig", "flags")));
  });

  it("the bootstrap admin can write flags", async () => {
    const bootstrap = testEnv.authenticatedContext("bootstrap-uid", { email: "joncheng5@gmail.com" });
    await assertSucceeds(setDoc(doc(bootstrap.firestore(), "appConfig", "flags"), { feedbackEnabled: false }));
  });

  it("a signed-in non-bootstrap user cannot write flags", async () => {
    const student = testEnv.authenticatedContext("student-uid", { email: "someone@example.com" });
    await assertFails(setDoc(doc(student.firestore(), "appConfig", "flags"), { feedbackEnabled: false }));
  });
});

describe("mail (Trigger Email outbox)", () => {
  it("no client can read a mail doc — not even the bootstrap admin", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "mail", "m1"), { to: "x@example.com", message: { subject: "s", html: "h" } });
    });
    const bootstrap = testEnv.authenticatedContext("bootstrap-uid", { email: "joncheng5@gmail.com" });
    await assertFails(getDoc(doc(bootstrap.firestore(), "mail", "m1")));
  });

  it("no client can enqueue outbound email", async () => {
    const bootstrap = testEnv.authenticatedContext("bootstrap-uid", { email: "joncheng5@gmail.com" });
    await assertFails(setDoc(doc(bootstrap.firestore(), "mail", "m1"), { to: "victim@example.com", message: { subject: "spam", html: "spam" } }));
  });
});
