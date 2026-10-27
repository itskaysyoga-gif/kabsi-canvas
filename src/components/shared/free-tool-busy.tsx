import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CTA_TRIAL, FREE_TOOL_BUSY } from "@/lib/site";

/**
 * The calm state of a free tool when the day's Places cap is 0 or used up (lane R, 22 Oct 2026): one sentence and the
 * free trial as the button. No error colour, no dead end, and never "Join early access" here. The server limits are
 * unchanged; this is only what the visitor reads.
 */
export function FreeToolBusy() {
  return (
    <div
      role="status"
      data-testid="free-tool-busy"
      className="rounded-panel bg-surface-2 p-6 text-text-1 sm:p-8"
    >
      <p className="max-w-xl text-title leading-8">{FREE_TOOL_BUSY}</p>
      <Button asChild className="mt-5 w-full sm:w-auto">
        <Link to="/start">{CTA_TRIAL}</Link>
      </Button>
    </div>
  );
}
