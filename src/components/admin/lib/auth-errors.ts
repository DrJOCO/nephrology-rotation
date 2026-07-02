export function getAdminAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
  const message = error instanceof Error ? error.message : "";
  if (message === "admin/unauthorized") {
    return "This account is not authorized for the admin panel.";
  }
  if (message === "admin/invite-required") {
    return "This email has not been invited yet. Ask an existing admin to add it first.";
  }
  if (message === "admin/already-claimed" || message === "admin/already-admin") {
    return "This email already has an admin account. Sign in instead.";
  }
  if (message === "admin/master-only") {
    return "Only the master admin (joncheng5@gmail.com) can invite new admins.";
  }
  if (code === "auth/invalid-email") return "Enter a valid admin email address.";
  if (code === "auth/email-already-in-use") return "This email already has an account. Sign in instead.";
  if (code === "auth/weak-password") return "Choose a stronger password with at least 6 characters.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Email or password incorrect.";
  }
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Google sign-in was cancelled before it finished.";
  }
  if (code === "auth/popup-blocked") {
    return "Your browser blocked the Google sign-in popup. Allow popups and try again.";
  }
  if (code === "auth/too-many-requests") return "Too many sign-in attempts. Try again later.";
  if (code === "auth/operation-not-allowed") return "That admin sign-in method is not enabled in Firebase Authentication yet.";
  return "Admin sign-in failed. Check your email, password, or admin access.";
}
