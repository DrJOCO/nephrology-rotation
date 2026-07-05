import { useState, lazy, Suspense, Component, ErrorInfo, ReactNode } from "react";
import { T } from "./data/constants";
import StudentApp from "./components/StudentApp";
import UpdateToast from "./components/UpdateToast";
const AdminPanel = lazy(() => import("./components/AdminPanel"));

// One-reload-per-session guard. After a mid-rotation deploy, a stale open tab
// may try to lazy-load a chunk whose hashed file no longer exists; the deleted
// path is rewritten to index.html (text/html) and the dynamic import rejects.
// React.lazy caches that rejection and re-throws it forever, so the
// ErrorBoundary's "Try Again" (which only clears state) can never recover.
// A single full reload pulls the fresh index.html + chunk manifest. The
// sessionStorage flag prevents a reload loop if the reload doesn't fix it.
const CHUNK_RELOAD_FLAG = "neph_chunkReloaded";

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const name = error instanceof Error ? error.name : "";
  return (
    name === "ChunkLoadError" ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
}

function reloadOncePerSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(CHUNK_RELOAD_FLAG)) return false;
    window.sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
  } catch {
    // sessionStorage unavailable (private mode quota, etc.) — fall through and
    // reload anyway; the worst case is one extra reload, not a loop, because a
    // truly persistent failure will keep hitting the ErrorBoundary UI instead.
  }
  window.location.reload();
  return true;
}

// Vite dispatches this on the window when a dynamic import (preloaded chunk)
// fails to load — the canonical stale-deploy signal. Reload once to recover.
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadOncePerSession();
  });
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Nephrology App Error:", error, errorInfo);
    // A lazy-loaded view failed to import after a deploy — students in
    // installed-PWA mode have no URL bar to reload, so auto-recover once.
    if (isChunkLoadError(error)) {
      reloadOncePerSession();
    }
  }
  handleRetry = () => {
    // For chunk-load failures, React.lazy has cached the rejected import, so
    // clearing state and re-rendering just re-throws it. A full reload fetches
    // the fresh manifest. reloadOncePerSession no-ops if we already reloaded
    // this session (avoids a loop when the reload didn't help), in which case
    // fall through to the state reset so the button still does something.
    if (isChunkLoadError(this.state.error) && reloadOncePerSession()) return;
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
          <div style={{ background: T.card, borderRadius: 20, padding: 36, maxWidth: 400, width: "100%", textAlign: "center", border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: T.ink, fontFamily: T.serif, fontSize: 20, margin: "0 0 8px", fontWeight: 700 }}>Something went wrong</h2>
            <p style={{ color: T.sub, fontSize: 13, margin: "0 0 8px", lineHeight: 1.5 }}>
              The app encountered an unexpected error. Your data is safe.
            </p>
            <p style={{ color: T.muted, fontSize: 11, margin: "0 0 20px", wordBreak: "break-word" }}>
              {this.state.error?.message || "Unknown error"}
            </p>
            <button onClick={this.handleRetry}
              style={{ padding: "12px 32px", background: T.brand, color: T.brandInk, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [mode, setMode] = useState("student");
  if (mode === "admin") return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: T.sub, fontFamily: T.serif, fontSize: 16 }}>Loading Admin...</div></div>}>
      <AdminPanel onExit={() => setMode("student")} />
    </Suspense>
  );
  return <StudentApp onAdminToggle={() => { setMode("admin"); }} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
      {/* App-level so the SW update toast shows in both student and admin shells. */}
      <UpdateToast />
    </ErrorBoundary>
  );
}
