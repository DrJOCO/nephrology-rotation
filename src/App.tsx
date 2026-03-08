import { useState, Component, ErrorInfo, ReactNode } from "react";
import { T } from "./data/constants";
import StudentApp from "./components/StudentApp";
import AdminPanel from "./components/AdminPanel";

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
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: T.sans }}>
          <div style={{ background: T.card, borderRadius: 20, padding: 36, maxWidth: 400, width: "100%", textAlign: "center", border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: T.navy, fontFamily: T.serif, fontSize: 20, margin: "0 0 8px", fontWeight: 700 }}>Something went wrong</h2>
            <p style={{ color: T.sub, fontSize: 13, margin: "0 0 8px", lineHeight: 1.5 }}>
              The app encountered an unexpected error. Your data is safe.
            </p>
            <p style={{ color: T.muted, fontSize: 11, margin: "0 0 20px", wordBreak: "break-word" }}>
              {this.state.error?.message || "Unknown error"}
            </p>
            <button onClick={() => this.setState({ hasError: false, error: null })}
              style={{ padding: "12px 32px", background: T.med, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
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
  if (mode === "admin") return <AdminPanel onExit={() => setMode("student")} />;
  return <StudentApp onAdminToggle={() => setMode("admin")} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
