import { createContext, useContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";

// Shared "hardware/browser Back closes a local detail level" mechanism.
//
// StudentApp already routes hardware/browser Back through a single
// `overlayCloseRef` + popstate handler so that Back closes a full-screen
// overlay (e.g. global search) instead of navigating the tab underneath (see
// StudentApp.tsx and overlayBackHandling.test.tsx). Some leaf views
// (TopicBrowseView, CasesView) hold an extra *local* detail level in component
// state with only an on-screen Back button — hardware Back would skip that
// level and navigate the tab underneath.
//
// This context lets those deep leaf views register their open local level with
// the exact same choreography, without prop-drilling a callback through the
// (conflict-fenced) router. It is a faithful generalization of StudentApp's
// `useBackClosesOverlay` — the provider wires `register` to the same
// overlayCloseRef/history push, and `useBackClosesLevel` reuses it.

export interface BackLevelContextValue {
  // Registers `close` to run on the next hardware/browser Back, pushing a
  // history entry so Back has something to pop. Returns a cleanup that clears
  // the registration (and is a no-op if Back already consumed it).
  registerLevel: (close: () => void) => () => void;
  // True while a registration is still live (its pushed entry is still on the
  // history stack). The on-screen Back button uses this to decide whether to
  // pop the entry (history.back) or just close directly — mirroring
  // StudentApp's closeSearchOverlay.
  hasLiveLevelRef: React.MutableRefObject<boolean>;
}

const BackLevelContext = createContext<BackLevelContextValue | null>(null);

export function BackLevelProvider({
  value,
  children,
}: {
  value: BackLevelContextValue;
  children: ReactNode;
}) {
  return <BackLevelContext.Provider value={value}>{children}</BackLevelContext.Provider>;
}

// Hook for a leaf view holding one local detail level. While `isOpen` is true,
// hardware/browser Back closes the level (via `onClose`) instead of navigating
// the tab underneath. Returns a `close` for the on-screen Back button that pops
// the pushed history entry when it is still live, so the two close paths leave
// history in the same state (no dead entries) — exactly like the search
// overlay's two paths.
export function useBackClosesLevel(isOpen: boolean, onClose: () => void): () => void {
  const ctx = useContext(BackLevelContext);
  // Keep the latest onClose without re-registering on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || !ctx) return;
    const cleanup = ctx.registerLevel(() => onCloseRef.current());
    return cleanup;

  }, [isOpen, ctx]);

  return () => {
    if (ctx && ctx.hasLiveLevelRef.current) {
      window.history.back();
    } else {
      onCloseRef.current();
    }
  };
}
