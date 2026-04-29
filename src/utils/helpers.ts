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
  link.href = "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700&family=Source+Serif+4:wght@400;500;600;700&family=Crimson+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
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
      /* Phase 2 semantic palette (light) — 4 roles + bgs.
         brand picks up the existing deep-red identity (Path A — keep red as primary). */
      --c-brand:#8B2E2E;--c-brand-bg:#f5e8e6;
      --c-success:#1f7a5a;--c-success-bg:#e8f3ee;
      --c-warning:#a86b1f;--c-warning-bg:#faf0dd;
      --c-danger:#c0392b;--c-danger-bg:#fbeae5;
      /* PR 5: ink = foreground for text/icons on a SOLID state background. White in
         light mode (state hues are deep enough to clear AA); near-black in dark mode
         (state hues lift to ~70% L and white fails AA). NOT for tinted -bg surfaces. */
      --c-brand-ink:#ffffff;--c-success-ink:#ffffff;--c-warning-ink:#ffffff;--c-danger-ink:#ffffff;
      /* Phase 3 (PR 3.1) info channel + focus ring.
         info = non-alarming slate blue for FYI/lab values/secondary links.
         focus-ring is its own var so we can keep it distinct from brand/danger. */
      --c-info:#3a6ea8;--c-info-dk:#1f4570;--c-info-bg:#eaf1f9;--c-info-alpha:rgba(58,110,168,0.18);--c-info-ink:#ffffff;
      --c-focus-ring:#2563aa;
    }
    html, body {
      background: var(--c-bg);
      margin: 0;
    }
    /* Halation fix: bump body weight on dark backgrounds. Inter Tight at 400
       blooms against dark bg; 425 keeps the airy feel but reads sharper. */
    [data-theme="dark"] body {
      font-weight: 425;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    /* Browser autofill override — Chrome/Safari paint a yellow/white background on
       autofilled inputs that ignores our theme. Pin the inner box-shadow to the
       current input bg and force text color to match. */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px var(--c-card) inset !important;
      -webkit-text-fill-color: var(--c-text) !important;
      caret-color: var(--c-text);
      transition: background-color 9999s ease-in-out 0s;
    }
    @media screen {
      /* Dark mode: Clinical Paper paired palette (spec §10) */
      [data-theme="dark"] {
        /* Halation-tuned: text dropped from #F0EADB → #E1D8C3 (88% L), bg lifted from
           #12100D → #16130E so contrast ratio sits ~12:1 instead of ~17:1. */
        --c-navy:#E1D8C3;--c-deep:#BDB29E;--c-text:#E1D8C3;--c-sub:#BDB29E;--c-dark:#E1D8C3;
        --c-muted:#8E8573;
        --c-med:#C07A7A;--c-sky:#C07A7A;--c-accent:#C07A7A;--c-purple:#C07A7A;
        --c-ice:#221E18;--c-pale:#221E18;
        --c-green:#9DA77A;--c-greenDk:#C4CCA7;--c-gold:#D19A6B;--c-orange:#D19A6B;
        --c-line:#3A342D;--c-bg:#16130E;--c-card:#1C1812;
        --c-navy-bg:#16130E;--c-deep-bg:#1C1812;
        --c-yellow-bg:#221B14;--c-red-bg:#211615;--c-purple-bg:#221818;
        --c-green-bg:#1A1C15;--c-blue-bg:#201C17;--c-gray-bg:#181510;--c-warm-bg:#181510;
        --c-gold-alpha:rgba(209,154,107,0.18);--c-gold-alpha-md:rgba(209,154,107,0.28);
        --c-green-alpha:rgba(157,167,122,0.22);--c-red-alpha:rgba(192,122,122,0.13);
        --c-gold-text:#E0B080;--c-purple-accent:#D59A9A;--c-purple-soft:#D7A8A8;
        --c-red-deep:#9E5050;--c-overlay:rgba(0,0,0,0.8);
        /* Phase 2 semantic palette (dark) — inks lift to ~70% L; bgs are low-alpha overlays. */
        --c-brand:#d97a7a;--c-brand-bg:rgba(217,122,122,0.12);
        --c-success:#6dd1a5;--c-success-bg:rgba(109,209,165,0.12);
        --c-warning:#e3b261;--c-warning-bg:rgba(227,178,97,0.14);
        --c-danger:#ef6c5e;--c-danger-bg:rgba(239,108,94,0.14);
        /* PR 5: ink flips to near-black in dark mode (state hues are too light for white). */
        --c-brand-ink:#1a0f0f;--c-success-ink:#0a1a14;--c-warning-ink:#1a1208;--c-danger-ink:#1a0a0a;
        /* Phase 3 (PR 3.1) info channel + focus ring (dark). */
        --c-info:#7fa8d4;--c-info-dk:#a9c4e4;--c-info-bg:rgba(127,168,212,0.14);--c-info-alpha:rgba(127,168,212,0.32);--c-info-ink:#0a1420;
        --c-focus-ring:#7fa8d4;
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
    :focus-visible { outline: 3px solid var(--c-focus-ring); outline-offset: 2px; border-radius: 4px; }
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
