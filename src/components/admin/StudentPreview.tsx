import { useEffect } from "react";
import { T } from "../../data/constants";
import store from "../../utils/store";
import StudentApp from "../StudentApp";
import { buildStudentPreviewSeed } from "./lib/preview-seed";

// "View as student" sandbox. Enters store preview mode (all persistence inert —
// see store.enterPreview) seeded with a fresh demo student, then renders the
// real StudentApp full-screen under a slim always-visible banner. Exit tears
// StudentApp down and restores normal store behavior. StudentApp is remounted
// fresh per preview session (keyed by mount), so no preview state persists
// across sessions.
export function StudentPreview({ rotationCode, onExit }: { rotationCode: string | null; onExit: () => void }) {
  // Enter on mount, exit on unmount — pairing them here guarantees preview mode
  // is torn down even if the parent unmounts this without calling onExit.
  // rotationCode is captured once at mount; a fresh preview session remounts.
  useEffect(() => {
    store.enterPreview(buildStudentPreviewSeed(rotationCode));
    return () => store.exitPreview();
  }, [rotationCode]);

  return (
    <div style={{ minHeight: "100vh", background: T.bg }}>
      <div
        role="status"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "8px 14px",
          background: T.warningBg,
          borderBottom: `1.5px solid ${T.warning}`,
        }}
      >
        <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.warning, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Previewing as student — nothing is saved
        </span>
        <button
          onClick={onExit}
          style={{
            flexShrink: 0,
            padding: "6px 14px",
            background: T.warning,
            color: T.warningInk,
            border: "none",
            borderRadius: 0,
            fontFamily: T.sans,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Exit preview
        </button>
      </div>
      {/* In preview, StudentApp's admin gesture (5-tap title) exits the sandbox
          rather than opening a nested admin panel. */}
      <StudentApp onAdminToggle={onExit} />
    </div>
  );
}
