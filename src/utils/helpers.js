// Inject Google Fonts once into document.head (avoids re-inserting on every render)
let _fontsLoaded = false;
export function ensureGoogleFonts() {
  if (_fontsLoaded) return;
  _fontsLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
  document.head.appendChild(link);
}

// Inject CSS keyframes for shake animation (admin PIN error)
let _shakeInjected = false;
export function ensureShakeAnimation() {
  if (_shakeInjected) return;
  _shakeInjected = true;
  const style = document.createElement("style");
  style.textContent = `@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }`;
  document.head.appendChild(style);
}

// Inject layout CSS: keyframes for transitions, fadeIn, and utility classes
let _layoutInjected = false;
export function ensureLayoutStyles() {
  if (_layoutInjected) return;
  _layoutInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .tab-content-enter { animation: slideUp 0.2s ease-out; }
  `;
  document.head.appendChild(style);
}

export const SHARED_KEYS = {
  curriculum: "neph_shared_curriculum",
  articles: "neph_shared_articles",
  announcements: "neph_shared_announcements",
  settings: "neph_shared_settings",
  studentPrefix: "neph_shared_student_",
};

export const createStudentId = () => `stu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createRotationCode = (location = "", dates = "") => {
  // Build a meaningful code from location + date
  // e.g. "City Medical Center" + "Mar 1-28, 2026" → "CMC-MAR26"

  // Extract initials from location (up to 4 chars)
  const words = location.trim().split(/\s+/).filter(Boolean);
  let locPart = words.length > 0
    ? words.map(w => w[0]).join("").toUpperCase().slice(0, 4)
    : "";

  // Try to extract month + year from dates string
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  let datePart = "";
  if (dates.trim()) {
    // Look for month name
    const monthMatch = dates.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/i);
    // Look for 4-digit year or 2-digit year
    const yearMatch = dates.match(/\b(20\d{2})\b/) || dates.match(/\b(\d{2})\b/);
    if (monthMatch) {
      datePart += monthMatch[1].toUpperCase().slice(0, 3);
    }
    if (yearMatch) {
      datePart += yearMatch[1].slice(-2); // last 2 digits
    }
  }

  // If no date info extracted, use current month/year
  if (!datePart) {
    const now = new Date();
    datePart = months[now.getMonth()] + String(now.getFullYear()).slice(-2);
  }

  // Combine: LOC-MONYY (e.g. CMC-MAR26)
  if (locPart && datePart) {
    return `${locPart}-${datePart}`;
  }
  if (datePart) {
    return `NEPH-${datePart}`;
  }

  // Fallback: random 6-char code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};
