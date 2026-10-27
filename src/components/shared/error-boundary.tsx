import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/telemetry";

export class GlobalErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
    reportError(error, { boundary: "global", componentStack: info.componentStack });
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="grid min-h-screen place-items-center bg-surface-2 px-5">
        <div className="w-full max-w-md rounded-panel bg-surface-1 p-7 text-center shadow-rest sm:p-10">
          <h1 className="font-display text-h2 text-text-1">Something went wrong.</h1>
          <p className="mt-3 text-text-2">Reload the page.</p>
          <Button className="mt-7 w-full" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </main>
    );
  }
}
