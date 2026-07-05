import type { RotationInfo } from "../../../utils/store";
import type { AdminConfirmOptions } from "../shared";

export interface RotationAdminIdentity {
  uid: string;
  email: string;
}

function normalizeEmail(email: string | undefined | null): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

// Whether the signed-in admin owns (and may therefore delete or destructively
// edit) this rotation. Master admins can *see* other attendings' rotations —
// those must stay read-only, matching the "Read-only" banner. A rotation with
// no owner recorded (legacy) is treated as manageable by whoever can see it,
// since listRotations only surfaces legacy rotations the admin is entitled to.
export function canManageRotation(rotation: RotationInfo, admin: RotationAdminIdentity): boolean {
  const ownerUid = typeof rotation.ownerUid === "string" ? rotation.ownerUid : "";
  const ownerEmail = normalizeEmail(rotation.ownerEmail);
  const adminEmail = normalizeEmail(admin.email);

  // No owner recorded → legacy rotation the admin was allowed to load.
  if (!ownerUid && !ownerEmail) return true;

  if (ownerUid && ownerUid === admin.uid) return true;
  if (ownerEmail && adminEmail && ownerEmail === adminEmail) return true;

  return false;
}

// Builds the confirm-dialog options for deleting a rotation. Rotations that
// hold student data require the admin to type the rotation code, so a stray
// click can never wipe a live cohort.
export function buildRotationDeleteConfirm(rotation: RotationInfo): AdminConfirmOptions {
  const hasStudents = rotation.studentCount > 0;
  const base: AdminConfirmOptions = {
    title: `Delete ${rotation.code}?`,
    message: "This permanently deletes the rotation, its join code, and every student and team record inside it. This cannot be undone.",
    confirmLabel: "Delete Rotation",
    tone: "danger",
  };
  if (!hasStudents) return base;
  return {
    ...base,
    message: `${rotation.code} has ${rotation.studentCount} student${rotation.studentCount === 1 ? "" : "s"} with saved data. Deleting permanently removes the rotation, its join code, and every student and team record inside it. This cannot be undone.`,
    requireText: rotation.code,
    requireTextLabel: `Type ${rotation.code} to confirm deletion`,
  };
}
