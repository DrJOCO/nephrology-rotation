import { describe, expect, it } from "vitest";
import type { RotationInfo } from "../../../utils/store";
import { buildRotationDeleteConfirm, canManageRotation } from "./rotation-access";

function rotation(overrides: Partial<RotationInfo> = {}): RotationInfo {
  return {
    code: "GS-APR26",
    name: "Nephrology Rotation",
    createdAt: "2026-04-01T00:00:00.000Z",
    location: "Good Samaritan",
    dates: "Apr 1-14, 2026",
    studentCount: 0,
    ownerEmail: "owner@example.com",
    ownerUid: "owner-uid",
    ...overrides,
  };
}

describe("canManageRotation", () => {
  it("allows the owner by uid", () => {
    expect(canManageRotation(rotation(), { uid: "owner-uid", email: "someone@example.com" })).toBe(true);
  });

  it("allows the owner by email when uid does not match (legacy re-key)", () => {
    expect(canManageRotation(rotation({ ownerUid: "old-uid" }), { uid: "new-uid", email: "OWNER@example.com" })).toBe(true);
  });

  it("denies a different attending even when they can see the rotation (master admin)", () => {
    expect(canManageRotation(rotation(), { uid: "master-uid", email: "master@example.com" })).toBe(false);
  });

  it("treats a legacy rotation with no owner recorded as manageable", () => {
    expect(canManageRotation(rotation({ ownerUid: "", ownerEmail: "" }), { uid: "anyone", email: "anyone@example.com" })).toBe(true);
  });

  it("does not match on empty email against an empty owner email", () => {
    // ownerUid present but not matching, ownerEmail empty, admin email empty → deny.
    expect(canManageRotation(rotation({ ownerEmail: "" }), { uid: "other", email: "" })).toBe(false);
  });
});

describe("buildRotationDeleteConfirm", () => {
  it("does not require typed confirmation for an empty rotation", () => {
    const options = buildRotationDeleteConfirm(rotation({ studentCount: 0 }));
    expect(options.requireText).toBeUndefined();
    expect(options.tone).toBe("danger");
    expect(options.message).toContain("cannot be undone");
  });

  it("requires typing the rotation code when the rotation has students", () => {
    const options = buildRotationDeleteConfirm(rotation({ code: "CMC-MAR26", studentCount: 3 }));
    expect(options.requireText).toBe("CMC-MAR26");
    expect(options.message).toContain("3 students");
    expect(options.requireTextLabel).toContain("CMC-MAR26");
  });

  it("uses singular phrasing for a single student", () => {
    const options = buildRotationDeleteConfirm(rotation({ studentCount: 1 }));
    expect(options.message).toContain("1 student with saved data");
    expect(options.message).not.toContain("1 students");
  });
});
