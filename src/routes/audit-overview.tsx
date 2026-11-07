import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KabsiMark, Button } from "@/components/kabsi/ui";
import { useAuth } from "@/components/auth/auth-provider";
import { supabase } from "@/lib/supabase";

const AUDIT_ENDED_MARKER = "kabsi_audit_ended";
const AUDIT_EXPIRES_AT = Date.parse("2026-11-14T23:59:00Z");

type Group = { category?: string; status?: string; count: number };
type AuditOverview = {
  locations: number;
  active_locations: number;
  demo_locations: number;
  categories: Group[];
  status: Group[];
};

export const Route = createFileRoute("/audit-overview")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Audit overview | Kabsi" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AuditOverviewPage,
});

function AuditOverviewPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [result, setResult] = useState<AuditOverview | null>(null);
  const [problem, setProblem] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.history.replace("/audit-login");
      return;
    }
    let alive = true;
    const check = async () => {
      const { data: allowed, error: accessError } = await supabase.rpc(
        "audit_login_allowed" as never,
      );
      if (!alive) return;
      if (Date.now() >= AUDIT_EXPIRES_AT || accessError || allowed !== true) {
        setResult(null);
        setProblem("This access has ended.");
        setChecking(false);
        window.sessionStorage.setItem(AUDIT_ENDED_MARKER, "1");
        await signOut({ quiet: true });
        router.history.replace("/audit-login");
        return;
      }
      const { data, error } = await supabase.rpc("audit_staff_overview" as never);
      if (!alive) return;
      if (error || !data || typeof data !== "object") {
        setResult(null);
        setProblem("The safe audit summary could not load.");
        setChecking(false);
        return;
      }
      setResult(data as AuditOverview);
      setProblem("");
      setChecking(false);
    };
    void check();
    // Recheck frequently. All data comes from the masked server function,
    // which checks the expiry on every request.
    const timer = window.setInterval(() => void check(), 30_000);
    const expiryTimer = window.setTimeout(
      () => void check(),
      Math.max(0, AUDIT_EXPIRES_AT - Date.now() + 50),
    );
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.clearTimeout(expiryTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loading, user, router, signOut]);

  return (
    <main className="theme-light min-h-screen bg-surface-0 text-text-1">
      <div className="container-kb py-9 md:py-14">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KabsiMark className="size-9" />
            <span className="font-display text-title font-bold">Kabsi</span>
          </div>
          <Button variant="secondary" size="md" onClick={() => void signOut()}>
            Sign out
          </Button>
        </header>
        <section className="mt-12 max-w-3xl">
          <h1 className="font-display text-h2 font-bold">Read-only audit overview</h1>
          <p className="mt-4 text-lead text-text-2">
            Actual aggregate figures with personal details hidden. No messages, posts, approvals,
            bills or settings can be changed here.
          </p>
        </section>
        {checking ? (
          <p role="status" className="mt-8 text-body text-text-2">
            Checking your temporary access.
          </p>
        ) : null}
        {problem ? (
          <p role="alert" className="mt-8 text-body font-semibold text-bad">
            {problem}
          </p>
        ) : null}
        {result ? (
          <>
            <section aria-label="Business totals" className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["Businesses", result.locations],
                ["Active businesses", result.active_locations],
                ["Example businesses", result.demo_locations],
              ].map(([label, value]) => (
                <div key={label} className="rounded-card border border-line bg-surface-1 p-6">
                  <p className="text-small text-text-2">{label}</p>
                  <p className="mt-2 font-display text-h2 font-bold tabular-nums">{value}</p>
                </div>
              ))}
            </section>
            <section className="mt-9 grid gap-5 lg:grid-cols-2">
              <div className="rounded-card border border-line bg-surface-1 p-6">
                <h2 className="font-display text-h3 font-bold">Business categories</h2>
                <ul className="mt-4 divide-y divide-line">
                  {result.categories.map((group, index) => (
                    <li
                      key={group.category ?? index}
                      className="flex justify-between gap-3 py-3 text-body"
                    >
                      <span>{group.category ?? "Other"}</span>
                      <span className="font-bold tabular-nums">{group.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-card border border-line bg-surface-1 p-6">
                <h2 className="font-display text-h3 font-bold">Current statuses</h2>
                <ul className="mt-4 divide-y divide-line">
                  {result.status.map((group, index) => (
                    <li
                      key={group.status ?? index}
                      className="flex justify-between gap-3 py-3 text-body"
                    >
                      <span>{group.status ?? "Unknown"}</span>
                      <span className="font-bold tabular-nums">{group.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
            <p className="mt-8 max-w-3xl text-small text-text-2">
              The full staff workspace is not available to this audit identity. Its detailed screens
              stay protected until server-side masking and write restrictions have been
              independently verified.
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
