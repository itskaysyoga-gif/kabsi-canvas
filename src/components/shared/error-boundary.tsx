import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/telemetry";

export class GlobalErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info); reportError(error, { boundary: "global", componentStack: info.componentStack }); }
  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="grid min-h-screen place-items-center bg-kb-sand px-5">
        <div className="w-full max-w-md rounded-large bg-kb-white p-7 text-center shadow-kb sm:p-10">
          <h1 className="font-display text-4xl text-kb-ink">Something went wrong.</h1>
          <p className="mt-3 text-kb-stone">Reload the page.</p>
          <Button className="mt-7 w-full" onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </main>
    );
  }
}
