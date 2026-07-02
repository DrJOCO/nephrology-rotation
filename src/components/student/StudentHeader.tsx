import { Search, User as UserIcon, Flame } from "lucide-react";
import { T } from "../../data/constants";
import type { Gamification } from "../../types";

// ─────────────────────────────────────────────────────────────────────────
// StudentHeader — Phase 2 (spec §01): collapsed 48px light title bar.
// Name, rotation code, theme, end-session moved to ProfileSheet.
// Kept inline: title, streak chip (or offline chip), search, profile button.
// Pure move of the header block that previously lived inline in StudentApp.
// ─────────────────────────────────────────────────────────────────────────
function StudentHeader({
  isMobile, online, gamification, onTitleActivate, onOpenSearch, onOpenProfile,
}: {
  isMobile: boolean;
  online: boolean;
  gamification: Gamification;
  onTitleActivate: () => void;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
}) {
  return (
    <div style={{
      background: T.surface,
      borderBottom: `1px solid ${T.line}`,
      padding: `env(safe-area-inset-top, 0px) 16px 0`,
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 48 }}>
        <button
          type="button"
          onClick={onTitleActivate}
          aria-label="Nephrology Rotation — go to Today"
          title="Go to Today"
          style={{
            color: T.ink, fontFamily: T.serif, background: "none", border: "none",
            fontSize: isMobile ? 16 : 18, fontWeight: 600, letterSpacing: -0.3,
            cursor: "pointer", WebkitUserSelect: "none", userSelect: "none",
            minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            padding: 0, display: "inline-flex", alignItems: "center",
          }}
        >
          {/* Logomark on narrow widths so the wordmark doesn't truncate as "Nephrolog…". */}
          {isMobile ? <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">🫘</span> : "Nephrology Rotation"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {online && (gamification.streaks?.currentDays ?? 0) > 0 && (
            <span
              title={`${gamification.streaks?.currentDays}-day streak`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 13, fontWeight: 600, color: T.sub,
                background: "transparent",
                border: `1px solid ${T.line}`,
                padding: "4px 10px", borderRadius: 999, minHeight: 28,
                fontFamily: T.mono,
              }}
            >
              <Flame size={14} strokeWidth={2} aria-hidden="true" />
              {gamification.streaks?.currentDays}
            </span>
          )}
          <button
            onClick={onOpenSearch}
            aria-label="Search"
            title="Search"
            style={{
              background: "transparent", border: "none", padding: 8,
              minHeight: 44, minWidth: 44,
              borderRadius: 8, cursor: "pointer",
              color: T.ink, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button
            onClick={onOpenProfile}
            aria-label="Open profile"
            title="Profile"
            style={{
              background: T.surface2, border: `1px solid ${T.line}`, padding: 0,
              minHeight: 44, minWidth: 44, borderRadius: 999, cursor: "pointer",
              color: T.ink, display: "flex", alignItems: "center", justifyContent: "center",
              marginLeft: 4,
            }}
          >
            <UserIcon size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudentHeader;
