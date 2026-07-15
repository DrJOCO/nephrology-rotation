// Sends the admin-invite email by writing a doc to the top-level `mail`
// collection in the Firebase "Trigger Email" extension's contract
// ({ to, message: { subject, html } }). The extension watches that collection
// and delivers the mail, then stamps a `delivery` field back onto the doc.
//
// The extension is NOT installed yet. Until it is, these docs accumulate
// harmlessly in `mail` and nothing sends — see functions/README.md for how to
// install and configure it. Once installed it will pick up the backlog.
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db } from "./admin.js";

// The public app URL admins sign in at. Kept as a constant (not env-derived) to
// avoid a config dependency on first deploy; update here if the domain changes.
const APP_URL = "https://nephrology-rotation.web.app";

export function buildInviteEmail(inviteEmail: string, invitedByEmail: string): {
  subject: string;
  html: string;
} {
  const from = invitedByEmail
    ? `${escapeHtml(invitedByEmail)} has invited you`
    : "You've been invited";
  const subject = "You're invited to co-administer a nephrology rotation";
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin:0 0 12px;">${from} as a rotation admin</h2>
      <p style="margin:0 0 12px;line-height:1.5;">
        You can now help manage a nephrology teaching rotation. Sign in with
        <strong>${escapeHtml(inviteEmail)}</strong> to accept the invitation and
        get access to the admin panel.
      </p>
      <p style="margin:0 0 20px;">
        <a href="${APP_URL}"
           style="display:inline-block;padding:10px 18px;background:#0b5cad;color:#fff;
                  border-radius:6px;text-decoration:none;">Open the admin panel</a>
      </p>
      <p style="margin:0;color:#666;font-size:13px;line-height:1.5;">
        If you weren't expecting this, you can ignore this email &mdash; nothing
        changes until you sign in with the invited address.
      </p>
    </div>
  `.trim();
  return { subject, html };
}

// Minimal HTML-escape for the two interpolated values (email addresses). Guards
// against a malformed invite email injecting markup into the message body.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The "Trigger Email" extension's document contract. Building it here (rather
// than inline in the trigger) lets tests assert the exact { to, message } shape
// the extension consumes.
export function buildMailDoc(
  data: { email?: unknown; createdByEmail?: unknown },
  emailKey: string,
): { to: string; message: { subject: string; html: string } } {
  // The doc id IS the normalized email; fall back to the stored email field.
  const inviteEmail = typeof data.email === "string" && data.email ? data.email : emailKey;
  const invitedByEmail = typeof data.createdByEmail === "string" ? data.createdByEmail : "";
  const { subject, html } = buildInviteEmail(inviteEmail, invitedByEmail);
  return { to: inviteEmail, message: { subject, html } };
}

export const onAdminInviteCreated = onDocumentCreated(
  "adminInvites/{emailKey}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const mailDoc = buildMailDoc(snap.data(), event.params.emailKey);
    try {
      await db.collection("mail").add(mailDoc);
      logger.info("onAdminInviteCreated queued invite email", { inviteEmail: mailDoc.to });
    } catch (err) {
      logger.error("onAdminInviteCreated failed to queue invite email", { inviteEmail: mailDoc.to, err });
    }
  },
);
