// Shared bootstrap for firestore.rules tests. One RulesTestEnvironment is
// created per test file (see beforeAll/afterAll in each *.test.ts) against
// the `firebase emulators:exec` Firestore emulator — see package.json
// "test:rules" and README "Firestore rules tests" for how this is invoked.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

// A fixed demo project id (never a real one) is the documented convention for
// rules-unit-testing so nothing can accidentally hit production.
export const PROJECT_ID = "demo-nephrology-rotation-rules-test";

export function loadRules(): string {
  return readFileSync(resolve(__dirname, "../firestore.rules"), "utf8");
}

export async function makeTestEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: loadRules(),
      host: "127.0.0.1",
      port: 8080,
    },
  });
}

// Bootstrap admin email hardcoded in firestore.rules (isBootstrapAdminEmail).
// Rules text is not edited by this suite; tests exercise this literal as-is.
export const BOOTSTRAP_ADMIN_EMAIL = "joncheng5@gmail.com";
export const BOOTSTRAP_ADMIN_UID = "bootstrap-admin-uid";

// Legacy owner uid hardcoded in firestore.rules (isBootstrapLegacyOwnerUid).
export const LEGACY_OWNER_UID = "aXjhgOzT0mPQt97bGMqR4CHI1jp1";

export function minimalStudentDoc(name = "Ana Student") {
  return { name };
}

export function minimalTeamSnapshot(studentId: string, overrides: Record<string, unknown> = {}) {
  return {
    studentId,
    name: "Ana Student",
    points: 10,
    patientCount: 2,
    activePatientCount: 1,
    dischargedPatientCount: 1,
    levelName: "Intern",
    levelIcon: "star",
    topicCounts: {},
    updatedAt: "2026-07-05T12:00:00.000Z",
    ...overrides,
  };
}

export function minimalFeedback(studentId: string, overrides: Record<string, unknown> = {}) {
  return {
    studentId,
    name: "Ana Student",
    page: "today",
    tag: "Confusing",
    createdAt: "2026-07-05T12:00:00.000Z",
    ...overrides,
  };
}

export function minimalRotation(overrides: Record<string, unknown> = {}) {
  return {
    name: "Good Samaritan April 2026",
    createdAt: "2026-04-01T00:00:00.000Z",
    ownerUid: "owner-uid-1",
    ownerEmail: "owner@example.com",
    adminUids: ["owner-uid-1"],
    ...overrides,
  };
}
