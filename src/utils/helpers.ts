import { useEffect, useState, type RefObject } from "react";

// Phase 2.5 (§12): focus-trap + focus-return for modal sheets.
// - Captures `document.activeElement` when the modal opens, restores it on unmount.
// - Intercepts Tab/Shift+Tab so focus cycles within `containerRef` only.
// - Focuses the first focusable element (or `initialFocusRef` if provided) on open.
// The hook runs when a sheet MOUNTS (isOpen=true is the default for mount-time use),
// so in practice the dialogs just call it unconditionally — unmount = cleanup = focus restore.
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const returnTo = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] => {
      const sel = [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        '[tabindex]:not([tabindex="-1"])',
      ].join(",");
      return Array.from(container.querySelectorAll<HTMLElement>(sel))
        .filter(el => !el.hasAttribute("disabled") && el.offsetParent !== null);
    };

    // Initial focus: caller's requested element, else first focusable, else the container.
    const initial = initialFocusRef?.current ?? getFocusable()[0] ?? container;
    initial.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusable();
      if (focusables.length === 0) { e.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (active === last || !container.contains(active))) {
        e.preventDefault(); first.focus();
      }
    };
    container.addEventListener("keydown", onKey);

    return () => {
      container.removeEventListener("keydown", onKey);
      // Restore focus only if the original element is still in the DOM and focusable.
      if (returnTo && document.body.contains(returnTo) && typeof returnTo.focus === "function") {
        returnTo.focus();
      }
    };
  }, [containerRef, initialFocusRef]);
}

// Inject Google Fonts once into document.head (avoids re-inserting on every render)
let _fontsLoaded = false;
export function ensureGoogleFonts(): void {
  if (_fontsLoaded) return;
  _fontsLoaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  // Phase 1 (Clinical Paper spec v1): Inter Tight + Source Serif 4 + JetBrains Mono.
  // Crimson Pro retained as serif fallback until Phase 2 sweep.
  link.href = "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Source+Serif+4:wght@400;500;600;700&family=Crimson+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
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
    /* Phase 1 (Clinical Paper spec v1): CSS var names preserved; values remapped to new palette.
       Old names (navy/sky/gold/purple/etc.) are aliased to the closest Clinical Paper token so
       every existing component picks up the new look without code changes. Full sweep to semantic
       names (ink/accent/warn/ok) happens in Phase 2. */
    :root {
      /* Inks: navy/deep/text/sub/dark all collapse to the Clinical Paper ink ramp */
      --c-navy:#1E1B16;--c-deep:#3D372E;--c-text:#1E1B16;--c-sub:#3D372E;--c-dark:#1E1B16;
      --c-muted:#7C7260;
      /* Accent (was blue #2980B9 / red #E74C3C / purple #8E44AD) → Clinical Paper deep red */
      --c-med:#8B2E2E;--c-sky:#8B2E2E;--c-accent:#8B2E2E;--c-purple:#8B2E2E;
      /* Surface tints (ice/pale were cool blue tints) → warm surface2 */
      --c-ice:#EFE8D6;--c-pale:#EFE8D6;
      /* Ok (green) is intentionally muted toward olive so completion states stay on-brand */
      --c-green:#6F7753;--c-greenDk:#5A6242;--c-gold:#B8732C;--c-orange:#B8732C;
      /* Lines and surfaces */
      --c-line:#D9D1BF;--c-bg:#F7F2E7;--c-card:#FBF8F0;
      /* Header backgrounds — kept dark (warm ink) so existing white-on-dark header still reads.
         Full header redesign (light title bar) is Phase 2 / §01. */
      --c-navy-bg:#1E1B16;--c-deep-bg:#26231D;
      /* Semantic tint backgrounds — warmed to match paper aesthetic */
      --c-yellow-bg:#F7EED8;--c-red-bg:#F4E4DD;--c-purple-bg:#F4E4DD;
      --c-green-bg:#ECE9DD;--c-blue-bg:#EFE8D6;--c-gray-bg:#EFE8D6;--c-warm-bg:#FBF8F0;
      /* Alphas remapped to new warn (#B8732C) and ok (#6F7753) / accent (#8B2E2E) */
      --c-gold-alpha:rgba(184,115,44,0.10);--c-gold-alpha-md:rgba(184,115,44,0.20);
      --c-green-alpha:rgba(111,119,83,0.18);--c-red-alpha:rgba(139,46,46,0.08);
      --c-gold-text:#8F5A23;--c-purple-accent:#8B2E2E;--c-purple-soft:#C09494;
      --c-red-deep:#7A2828;--c-overlay:rgba(30,27,22,0.65);
    }
    html, body {
      background: var(--c-bg);
      margin: 0;
    }
    @media screen {
      /* Dark mode: Clinical Paper paired palette (spec §10) */
      [data-theme="dark"] {
        --c-navy:#F0EADB;--c-deep:#C9C2AF;--c-text:#F0EADB;--c-sub:#C9C2AF;--c-dark:#F0EADB;
        --c-muted:#9A907F;
        --c-med:#C07A7A;--c-sky:#C07A7A;--c-accent:#C07A7A;--c-purple:#C07A7A;
        --c-ice:#201C17;--c-pale:#201C17;
        --c-green:#9DA77A;--c-greenDk:#C4CCA7;--c-gold:#D19A6B;--c-orange:#D19A6B;
        --c-line:#3A342D;--c-bg:#12100D;--c-card:#181510;
        --c-navy-bg:#12100D;--c-deep-bg:#181510;
        --c-yellow-bg:#221B14;--c-red-bg:#211615;--c-purple-bg:#221818;
        --c-green-bg:#1A1C15;--c-blue-bg:#201C17;--c-gray-bg:#181510;--c-warm-bg:#181510;
        --c-gold-alpha:rgba(209,154,107,0.18);--c-gold-alpha-md:rgba(209,154,107,0.28);
        --c-green-alpha:rgba(157,167,122,0.22);--c-red-alpha:rgba(192,122,122,0.13);
        --c-gold-text:#E0B080;--c-purple-accent:#D59A9A;--c-purple-soft:#D7A8A8;
        --c-red-deep:#9E5050;--c-overlay:rgba(0,0,0,0.8);
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

    /* A11y (spec §12): visible keyboard focus ring on all interactive elements.
       Uses the brand accent so it reads as intentional, not a browser default. */
    :focus-visible { outline: 2px solid var(--c-accent); outline-offset: 2px; border-radius: 4px; }
    button:focus:not(:focus-visible), [role="button"]:focus:not(:focus-visible) { outline: none; }

    /* Skip-to-content link (Phase 2.5): visually hidden until keyboard-focused,
       then anchors top-left so the user sees it immediately. !important on :focus
       because the reduced-motion global rule elsewhere affects transition-duration
       via *, and some browsers treat it as a cascade tie-breaker with unexpected results. */
    .skip-to-content {
      position: fixed; left: 8px; top: -48px;
      background: var(--c-accent); color: white;
      padding: 10px 16px; border-radius: 8px;
      font-size: 14px; font-weight: 600; text-decoration: none;
      z-index: 10000; transition: top 0.15s ease;
    }
    .skip-to-content:focus { top: 8px !important; outline: 2px solid white; outline-offset: 2px; }

    /* A11y (spec §12): honor prefers-reduced-motion globally. */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

    @media print {
      body > * { display: none !important; }
      body > #root > * { display: none !important; }
      .printable-report { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 99999; background: white; }
      .printable-report * { color: #3D372E !important; }
      .print-no-break { break-inside: avoid; }
      @page { margin: 0.6in; size: letter; }
    }
  `;
  document.head.appendChild(style);
}

// Phase 2 (spec §11): reactive `navigator.onLine` for offline banner.
export function useOnline(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function useIsMobile(maxWidth = 480): boolean {
  const getMatches = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  };

  const [isMobile, setIsMobile] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [maxWidth]);

  return isMobile;
}

export const SHARED_KEYS: Record<string, string> = {
  curriculum: "neph_shared_curriculum",
  articles: "neph_shared_articles",
  announcements: "neph_shared_announcements",
  settings: "neph_shared_settings",
  clinicGuides: "neph_shared_clinicGuides",
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
