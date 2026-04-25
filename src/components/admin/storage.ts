export function adminScopedKey(uid: string, suffix: string): string {
  return `admin_${uid}_${suffix}`;
}

export function getStoredAdminRotationCode(uid: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(adminScopedKey(uid, "rotationCode")) || "";
}

export function setStoredAdminRotationCode(uid: string, code: string | null): void {
  if (typeof window === "undefined") return;
  const key = adminScopedKey(uid, "rotationCode");
  if (code) window.localStorage.setItem(key, code);
  else window.localStorage.removeItem(key);
}
