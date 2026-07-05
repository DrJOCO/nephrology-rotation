import { describe, expect, it } from "vitest";
import { fingerprintRemoteSharedDoc } from "./publish";

describe("fingerprintRemoteSharedDoc", () => {
  it("returns an empty string for a missing remote doc", () => {
    expect(fingerprintRemoteSharedDoc(null)).toBe("");
    expect(fingerprintRemoteSharedDoc(undefined)).toBe("");
  });

  it("produces the same fingerprint for identical shared content", () => {
    const a = { curriculum: { 1: { title: "AKI" } }, announcements: [{ id: 1 }], name: "ignored" };
    const b = { announcements: [{ id: 1 }], curriculum: { 1: { title: "AKI" } }, ownerUid: "different" };
    // Field order and non-shared fields (name, ownerUid) must not affect it.
    expect(fingerprintRemoteSharedDoc(a)).toBe(fingerprintRemoteSharedDoc(b));
  });

  it("changes when a shared field changes (co-admin published)", () => {
    const before = { announcements: [{ id: 1, title: "Welcome" }] };
    const after = { announcements: [{ id: 1, title: "Welcome" }, { id: 2, title: "New" }] };
    expect(fingerprintRemoteSharedDoc(before)).not.toBe(fingerprintRemoteSharedDoc(after));
  });

  it("ignores changes to non-published fields", () => {
    const before = { curriculum: { 1: {} }, updatedAt: "2026-06-01T00:00:00Z", ownerEmail: "a@x.com" };
    const after = { curriculum: { 1: {} }, updatedAt: "2026-06-09T00:00:00Z", ownerEmail: "b@x.com" };
    expect(fingerprintRemoteSharedDoc(before)).toBe(fingerprintRemoteSharedDoc(after));
  });

  it("treats a missing shared field as null so absent vs empty differ predictably", () => {
    const withField = { studySheets: {} };
    const withoutField = {};
    expect(fingerprintRemoteSharedDoc(withField)).not.toBe(fingerprintRemoteSharedDoc(withoutField));
  });
});
