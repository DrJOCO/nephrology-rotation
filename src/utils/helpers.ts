// Inject Google Fonts once into document.head (avoids re-inserting on every render)
let _fontsLoaded = false;
export function ensureGoogleFonts(): void {
  if (_fontsLoaded) return;
  _fontsLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
  document.head.appendChild(link);
}

// Theme CSS custom properties — dark mode support
let _themeInjected = false;
export function ensureThemeStyles(): void {
  if (_themeInjected) return;
  _themeInjected = true;
  const s = document.createElement("style");
  s.id = "neph-theme-vars";
  s.textContent = `
    :root {
      --c-navy:#0F2B3C;--c-deep:#163B50;--c-med:#2980B9;--c-sky:#5DADE2;
      --c-ice:#EAF2F8;--c-pale:#D4E6F1;--c-accent:#E74C3C;--c-green:#1ABC9C;
      --c-greenDk:#16A085;--c-gold:#F1C40F;--c-orange:#E67E22;--c-dark:#1C2833;
      --c-purple:#8E44AD;--c-text:#2C3E50;--c-sub:#5D6D7E;--c-muted:#ABB2B9;
      --c-line:#D5DBDB;--c-bg:#F4F6F7;--c-card:#FFFFFF;
      --c-navy-bg:#0F2B3C;--c-deep-bg:#163B50;
      --c-yellow-bg:#FEF9E7;--c-red-bg:#FDEDEC;--c-purple-bg:#F5EEF8;
      --c-green-bg:#E8F8F5;--c-blue-bg:#EBF5FB;--c-gray-bg:#ECF0F1;--c-warm-bg:#FFFCF0;
      --c-gold-alpha:rgba(241,196,15,0.13);--c-gold-alpha-md:rgba(241,196,15,0.25);
      --c-green-alpha:rgba(26,188,156,0.25);--c-red-alpha:rgba(231,76,60,0.06);
      --c-gold-text:#B7950B;--c-purple-accent:#7D3C98;--c-purple-soft:#BB8FCE;
      --c-red-deep:#C0392B;--c-overlay:rgba(0,0,0,0.65);
    }
    @media screen {
      [data-theme="dark"] {
        --c-navy:#C9D1D9;--c-deep:#B0BAC5;--c-med:#539BD4;--c-sky:#6EB0DC;
        --c-ice:#181F2A;--c-pale:#1C2D3E;--c-accent:#E06B63;--c-green:#3AAF85;
        --c-greenDk:#2EA77A;--c-gold:#D4A83A;--c-orange:#CC8450;--c-dark:#010409;
        --c-purple:#B08ACF;--c-text:#D5DAE0;--c-sub:#8B949E;--c-muted:#6E7681;
        --c-line:#2A3140;--c-bg:#0F1419;--c-card:#171D26;
        --c-navy-bg:#0F1419;--c-deep-bg:#171D26;
        --c-yellow-bg:#231F10;--c-red-bg:#221A1C;--c-purple-bg:#211A28;
        --c-green-bg:#122420;--c-blue-bg:#122230;--c-gray-bg:#1C2129;--c-warm-bg:#231F10;
        --c-gold-alpha:rgba(212,168,58,0.18);--c-gold-alpha-md:rgba(212,168,58,0.28);
        --c-green-alpha:rgba(58,175,133,0.25);--c-red-alpha:rgba(224,107,99,0.1);
        --c-gold-text:#D4A83A;--c-purple-accent:#B08ACF;--c-purple-soft:#C4A8DE;
        --c-red-deep:#E06B63;--c-overlay:rgba(0,0,0,0.8);
      }
    }
  `;
  document.head.appendChild(s);
}

// Inject CSS keyframes for shake animation (admin PIN error)
let _shakeInjected = false;
export function ensureShakeAnimation(): void {
  if (_shakeInjected) return;
  _shakeInjected = true;
  const style = document.createElement("style");
  style.textContent = `@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }`;
  document.head.appendChild(style);
}

// Inject layout CSS: keyframes for transitions, fadeIn, and utility classes
let _layoutInjected = false;
export function ensureLayoutStyles(): void {
  if (_layoutInjected) return;
  _layoutInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .tab-content-enter { animation: slideUp 0.2s ease-out; }

    @media print {
      body > * { display: none !important; }
      body > #root > * { display: none !important; }
      .printable-report { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 99999; background: white; }
      .printable-report * { color: #2C3E50 !important; }
      .print-no-break { break-inside: avoid; }
      @page { margin: 0.6in; size: letter; }
    }
  `;
  document.head.appendChild(style);
}

export const SHARED_KEYS: Record<string, string> = {
  curriculum: "neph_shared_curriculum",
  articles: "neph_shared_articles",
  announcements: "neph_shared_announcements",
  settings: "neph_shared_settings",
  studentPrefix: "neph_shared_student_",
};

export const createStudentId = (): string => `stu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createRotationCode = (location: string = "", dates: string = ""): string => {
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
