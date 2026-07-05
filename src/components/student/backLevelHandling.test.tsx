import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackLevelProvider, useBackClosesLevel, type BackLevelContextValue } from "../../hooks/backLevelContext";

// Companion to overlayBackHandling.test.tsx. That file covers a *full-screen
// overlay* (global search); this one covers a *local detail level* held in a
// deep leaf view's component state (TopicBrowseView's selectedTopic,
// CasesView's activeCase). Those levels have only an on-screen Back button, so
// hardware/browser Back used to skip the level and navigate the tab underneath.
//
// The fix threads StudentApp's single overlayCloseRef/popstate mechanism down
// to those leaf views via BackLevelProvider + useBackClosesLevel (see
// src/hooks/backLevelContext.tsx and StudentApp.tsx). This harness wires the
// provider to the SAME overlayCloseRef choreography StudentApp uses, so it
// verifies the real hook against a faithful copy of the host mechanism without
// needing to mock Firebase auth/sync.
//
// A `LeafView` stands in for TopicBrowseView/CasesView: it owns a local
// `detailOpen` level and routes its on-screen Back through the hook's returned
// close (which pops the pushed entry when it's still live).

function LeafView() {
  const [detailOpen, setDetailOpen] = useState(false);
  const closeDetail = useBackClosesLevel(detailOpen, () => setDetailOpen(false));
  return (
    <div>
      <div data-testid="detail">{detailOpen ? "open" : "closed"}</div>
      {detailOpen ? (
        <button onClick={closeDetail}>Back to list (on-screen)</button>
      ) : (
        <button onClick={() => setDetailOpen(true)}>Open detail</button>
      )}
    </div>
  );
}

function TestHarness() {
  const [tab, setTab] = useState("today");
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

  // Faithful copy of StudentApp's registerBackHandler + BackLevel context value.
  const backLevelValue = useMemo<BackLevelContextValue>(() => {
    const hasLiveLevelRef = { current: false };
    const registerBackHandler = (close: () => void) => {
      window.history.pushState({ overlay: true }, "");
      overlayCloseRef.current = close;
      return () => {
        if (overlayCloseRef.current === close) overlayCloseRef.current = null;
      };
    };
    return {
      hasLiveLevelRef,
      registerLevel: (close: () => void) => {
        hasLiveLevelRef.current = true;
        const cleanup = registerBackHandler(() => {
          hasLiveLevelRef.current = false;
          close();
        });
        return () => {
          hasLiveLevelRef.current = false;
          cleanup();
        };
      },
    };
  }, []);

  const navigate = (t: string) => {
    window.history.pushState({ navView: { tab: t } }, "");
    setTab(t);
  };

  return (
    <div>
      <div data-testid="tab">{tab}</div>
      <button onClick={() => navigate("library")}>Go to library</button>
      <BackLevelProvider value={backLevelValue}>
        <LeafView />
      </BackLevelProvider>
    </div>
  );
}

describe("local detail level + hardware Back choreography (backLevelContext)", () => {
  it("hardware Back closes the local detail level and leaves the underlying tab untouched", async () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByText("Go to library"));
    expect(screen.getByTestId("tab")).toHaveTextContent("library");

    fireEvent.click(screen.getByText("Open detail"));
    expect(screen.getByTestId("detail")).toHaveTextContent("open");

    // Hardware/browser Back. jsdom dispatches popstate asynchronously.
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByTestId("detail")).toHaveTextContent("closed");
    // The tab underneath must be unchanged by the Back that closed the level.
    expect(screen.getByTestId("tab")).toHaveTextContent("library");
  });

  it("the on-screen Back pops the pushed entry so a later Back retraces real navigation", async () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByText("Go to library"));
    fireEvent.click(screen.getByText("Open detail"));
    expect(screen.getByTestId("detail")).toHaveTextContent("open");

    // Close via the view's own on-screen Back button instead of hardware Back.
    fireEvent.click(screen.getByText("Back to list (on-screen)"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByTestId("detail")).toHaveTextContent("closed");
    expect(screen.getByTestId("tab")).toHaveTextContent("library");

    // A later Back must retrace real navigation (library -> today), not be a
    // no-op or land on the stale detail-level entry.
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByTestId("tab")).toHaveTextContent("today");
  });

  it("hardware Back does not fall through to the tab while the detail level is open", async () => {
    render(<TestHarness />);
    fireEvent.click(screen.getByText("Go to library"));
    fireEvent.click(screen.getByText("Open detail"));

    // One Back closes the level; the tab stays put (does not navigate).
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByTestId("detail")).toHaveTextContent("closed");
    expect(screen.getByTestId("tab")).toHaveTextContent("library");

    // The NEXT Back is the one that retraces navigation off the tab.
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByTestId("tab")).toHaveTextContent("today");
  });
});
