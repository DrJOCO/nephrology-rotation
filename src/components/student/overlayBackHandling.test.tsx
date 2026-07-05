import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useEffect, useRef, useState } from "react";

// This test exercises the exact history/popstate choreography used in
// StudentApp.tsx to make hardware/browser Back close a full-screen overlay
// (e.g. GlobalSearchOverlay) instead of silently navigating the view
// underneath. It's a faithful extraction of the mechanism — not a full
// StudentApp render, which would require mocking Firebase auth/sync — so it
// can verify the popstate choreography in isolation.
//
// Mechanism under test (see src/components/StudentApp.tsx ~L264-330):
//   - a ref (`overlayCloseRef`) holds the "close this overlay" callback
//     while any overlay is open
//   - opening an overlay pushes a history entry so Back has something to pop
//   - the shared popstate handler closes the overlay (instead of changing
//     the view) whenever the ref is set
//   - closing via in-app UI calls history.back() if the pushed entry is
//     still there, so the two paths (hardware Back vs. in-app close) always
//     leave history in the same state
function TestHarness() {
  const [tab, setTab] = useState("today");
  const [overlayOpen, setOverlayOpen] = useState(false);
  const overlayCloseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    window.history.replaceState({ navView: { tab: "today" } }, "");
    const onPop = (e: PopStateEvent) => {
      if (overlayCloseRef.current) {
        const close = overlayCloseRef.current;
        overlayCloseRef.current = null;
        close();
        return;
      }
      const view = (e.state && e.state.navView) || null;
      setTab(view?.tab ?? "today");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const useBackClosesOverlay = (isOpen: boolean, close: () => void) => {
    useEffect(() => {
      if (!isOpen) return;
      window.history.pushState({ overlay: true }, "");
      overlayCloseRef.current = close;
      return () => {
        overlayCloseRef.current = null;
      };
       
    }, [isOpen]);
  };

  useBackClosesOverlay(overlayOpen, () => setOverlayOpen(false));
  const closeOverlay = () => {
    if (overlayCloseRef.current) {
      window.history.back();
    } else {
      setOverlayOpen(false);
    }
  };

  const navigate = (t: string) => {
    window.history.pushState({ navView: { tab: t } }, "");
    setTab(t);
  };

  return (
    <div>
      <div data-testid="tab">{tab}</div>
      <div data-testid="overlay">{overlayOpen ? "open" : "closed"}</div>
      <button onClick={() => navigate("library")}>Go to library</button>
      <button onClick={() => setOverlayOpen(true)}>Open search</button>
      <button onClick={closeOverlay}>Close search (X button)</button>
    </div>
  );
}

describe("overlay + hardware Back choreography (StudentApp.tsx mechanism)", () => {
  it("hardware Back closes the overlay and leaves the underlying view untouched", async () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByText("Go to library"));
    expect(screen.getByTestId("tab")).toHaveTextContent("library");

    fireEvent.click(screen.getByText("Open search"));
    expect(screen.getByTestId("overlay")).toHaveTextContent("open");

    // Hardware/browser Back. jsdom dispatches popstate asynchronously, like a
    // real browser, so give it a tick.
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByTestId("overlay")).toHaveTextContent("closed");
    // The view underneath must be unchanged by the Back that closed the overlay.
    expect(screen.getByTestId("tab")).toHaveTextContent("library");
  });

  it("closing via in-app UI pops the pushed history entry so a later Back doesn't land on a dead entry", async () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByText("Go to library"));
    fireEvent.click(screen.getByText("Open search"));
    expect(screen.getByTestId("overlay")).toHaveTextContent("open");

    // Close via the overlay's own X button instead of hardware Back.
    fireEvent.click(screen.getByText("Close search (X button)"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByTestId("overlay")).toHaveTextContent("closed");
    expect(screen.getByTestId("tab")).toHaveTextContent("library");

    // Now Back should retrace real navigation (library -> today), not be a
    // no-op / land on the stale overlay entry.
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByTestId("tab")).toHaveTextContent("today");
  });
});
