import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/telemetry";
import { isChunkLoadError, reloadOnceForChunk } from "@/lib/chunk-reload";
import { ErrorView } from "@/components/kabsi/status-pages";

export class GlobalErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; chunk: boolean }
> {
  override state = { failed: false, chunk: false };
  static getDerivedStateFromError(error: unknown) {
    return { failed: true, chunk: isChunkLoadError(error) };
  }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Fix 3 part B: a route file that failed to load after a deploy reloads the page once (src/lib/chunk-reload.ts).
    if (isChunkLoadError(error) && reloadOnceForChunk()) return;
    console.error(error, info);
    reportError(error, { boundary: "global", componentStack: info.componentStack });
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    // Fix 3 part B: a route file that still fails after the one reload shows the site's error page; Try again reloads.
    if (this.state.chunk) return <ErrorView />;
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
