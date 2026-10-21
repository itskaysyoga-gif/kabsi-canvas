import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useFeatureAccess } from "@/lib/feature-access";
import {
  advanceReport,
  APPEAL_STEPS,
  CATEGORY_GROUPS,
  EVIDENCE,
  GOOGLE_CHECKED,
  GOOGLE_POLICY_URL,
  GOOGLE_REPORT_HELP_URL,
  loadReports,
  nextSteps,
  REPORT_STEPS,
  REVIEWS_TOOL_URL,
  startReport,
  STATE_LABEL,
  type ReportState,
  type ReviewReport,
} from "@/lib/review-report";
import { cn } from "@/lib/utils";

const STEP_BUTTON: Record<ReportState, string> = {
  reported: "",
  answered: "Google answered",
  still_showing: "It is still showing",
  removed: "It was removed",
  appealed: "I sent the appeal",
};

/** The reports of one business, shared by every review's sheet and the reminder card. */
export function useReports(locationId: string | undefined) {
  return useQuery({
    queryKey: ["review-reports", locationId],
    queryFn: () => loadReports(locationId!),
    enabled: !!locationId,
    staleTime: 30_000,
  });
}

/**
 * "Report this review" (P0.8-11, K-139). Pro. A guide for the owner: Google's categories in plain words, what to gather,
 * where to report it on Google, and a place to record what happened. Google decides; Kabsi cannot remove a review and
 * never says one will be removed.
 */
export function ReportReview({ review }: { review: { id: string; location_id: string } }) {
  const [open, setOpen] = useState(false);
  const reports = useReports(open ? review.location_id : undefined);
  const access = useFeatureAccess(open ? review.location_id : undefined);
  const mine = reports.data?.find((r) => r.review_id === review.id);
  const proOnly = !!access.data && !access.data.pro && !mine;
  return (
    <>
      <Button variant="tertiary" className="min-h-11 text-sm" onClick={() => setOpen(true)}>
        <Flag aria-hidden="true" /> Report this review
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-large">
          <SheetHeader className="text-left">
            <SheetTitle>Report this review</SheetTitle>
            <SheetDescription>
              Google decides what stays. Kabsi cannot remove a review and cannot promise that Google
              will. This guide helps you report one that breaks Google's rules, and keeps track of
              what happens.
            </SheetDescription>
          </SheetHeader>
          {reports.isLoading || access.isLoading ? (
            <p className="mt-4 text-sm text-kb-stone" role="status">
              Loading
            </p>
          ) : proOnly ? (
            <div className="mt-4 rounded-card bg-kb-sand p-4 text-sm leading-6" role="status">
              <p className="font-bold">The reporting guide is part of Pro.</p>
              <Link
                to="/app/plan"
                className="mt-1 inline-block font-bold underline underline-offset-4"
              >
                See your plan
              </Link>
            </div>
          ) : mine ? (
            <Tracker report={mine} locationId={review.location_id} />
          ) : (
            <Guide reviewId={review.id} locationId={review.location_id} />
          )}
          <p className="mt-6 text-xs leading-5 text-kb-stone">
            Categories and steps read on Google's own help pages on {GOOGLE_CHECKED}:{" "}
            <ExtLink href={GOOGLE_POLICY_URL}>the content policy</ExtLink> and{" "}
            <ExtLink href={GOOGLE_REPORT_HELP_URL}>how to report a review</ExtLink>. Google can
            change them.
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-4"
    >
      {children}
    </a>
  );
}

function Guide({ reviewId, locationId }: { reviewId: string; locationId: string }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("");
  const [ticked, setTicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reported() {
    setBusy(true);
    setError("");
    try {
      await startReport(reviewId, category, ticked);
      await queryClient.invalidateQueries({ queryKey: ["review-reports", locationId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-5 space-y-7">
      <section aria-labelledby="rr-1">
        <h3 id="rr-1" className="font-bold">
          1. Pick what fits
        </h3>
        <p className="mt-0.5 text-sm text-kb-stone">
          Choose the reason closest to what is wrong with this review. Reviews you simply disagree
          with are not a reason: Google does not step into disputes between a business and a
          customer.
        </p>
        <div className="mt-3 space-y-4">
          {CATEGORY_GROUPS.map((g) => (
            <fieldset key={g.title}>
              <legend className="text-xs font-bold uppercase tracking-wider text-kb-stone">
                {g.title}
              </legend>
              <div className="mt-1.5 space-y-2">
                {g.items.map((c) => (
                  <label
                    key={c.key}
                    className={cn(
                      "flex min-h-11 cursor-pointer gap-3 rounded-card border-2 p-3",
                      category === c.key ? "border-kb-black bg-kb-sand" : "border-kb-hairline",
                    )}
                  >
                    <input
                      type="radio"
                      name="rr-category"
                      className="mt-1 size-4 shrink-0 accent-black"
                      checked={category === c.key}
                      onChange={() => setCategory(c.key)}
                    />
                    <span>
                      <span className="block text-sm font-bold">{c.name}</span>
                      <span className="block text-sm leading-5 text-kb-stone">{c.plain}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section aria-labelledby="rr-2">
        <h3 id="rr-2" className="font-bold">
          2. Gather what helps
        </h3>
        <p className="mt-0.5 text-sm text-kb-stone">
          Tick what you have. Keep it yourself: Kabsi remembers only which boxes you ticked.
        </p>
        <div className="mt-2 space-y-2">
          {EVIDENCE.map((e) => (
            <label key={e.key} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-black"
                checked={ticked.includes(e.key)}
                onChange={(ev) =>
                  setTicked((t) =>
                    ev.target.checked ? [...t, e.key] : t.filter((k) => k !== e.key),
                  )
                }
              />
              <span className="text-sm leading-6">{e.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="rr-3">
        <h3 id="rr-3" className="font-bold">
          3. Report it on Google
        </h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6">
          {REPORT_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <Button asChild variant="secondary" className="mt-3 w-full sm:w-auto">
          <a href={REVIEWS_TOOL_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" /> Open Google's Reviews Management Tool
          </a>
        </Button>
        <p className="mt-2 text-sm text-kb-stone">
          Google says a report typically takes several days to look at.
        </p>
      </section>

      <section aria-labelledby="rr-4">
        <h3 id="rr-4" className="font-bold">
          4. Tell Kabsi you reported it
        </h3>
        <p className="mt-0.5 text-sm text-kb-stone">
          Kabsi then keeps track, and reminds you after a week to check what Google said.
        </p>
        {error ? (
          <p className="mt-2 text-sm text-kb-red" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          className="mt-3 w-full"
          disabled={!category || busy}
          onClick={() => void reported()}
        >
          {busy ? "Saving" : "I reported it"}
        </Button>
      </section>
    </div>
  );
}

function Tracker({ report, locationId }: { report: ReviewReport; locationId: string }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const next = nextSteps(report);
  const category = CATEGORY_GROUPS.flatMap((g) => g.items).find((c) => c.key === report.category);
  const closed =
    report.state === "removed" || (report.state === "still_showing" && !!report.appeal_started_at);

  async function go(to: ReportState) {
    setBusy(true);
    setError("");
    try {
      await advanceReport(report.id, to);
      await queryClient.invalidateQueries({ queryKey: ["review-reports", locationId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-card bg-kb-sand p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-kb-stone">Where it stands</p>
        <p className="mt-1 text-lg font-bold">{STATE_LABEL[report.state]}</p>
        {category ? (
          <p className="mt-1 text-sm text-kb-stone">Reason you chose: {category.name}</p>
        ) : null}
      </div>
      {report.reminder_due ? (
        <p
          className="rounded-card border border-kb-amber/30 bg-kb-amber-soft p-4 text-sm leading-6"
          role="status"
        >
          It has been a week since your last update. Check Google's Reviews Management Tool and tell
          Kabsi what happened.
        </p>
      ) : null}
      {report.state === "still_showing" && !report.appeal_started_at ? (
        <div>
          <p className="font-bold">You can appeal once</p>
          <p className="mt-0.5 text-sm text-kb-stone">
            If Google did not remove it, the tool lets you send one appeal.
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6">
            {APPEAL_STEPS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <Button asChild variant="secondary" className="mt-3 w-full sm:w-auto">
            <a href={REVIEWS_TOOL_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" /> Open Google's Reviews Management Tool
            </a>
          </Button>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-kb-red" role="alert">
          {error}
        </p>
      ) : null}
      {next.length ? (
        <div>
          <p className="font-bold">What happened next?</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {next.map((to) => (
              <Button key={to} variant="secondary" disabled={busy} onClick={() => void go(to)}>
                {STEP_BUTTON[to]}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {closed ? (
        <p className="text-sm leading-6 text-kb-stone">
          {report.state === "removed"
            ? "Google removed this review."
            : "Google kept this review after the appeal. There are no more steps to take here."}
        </p>
      ) : null}
    </div>
  );
}

/** A card on the Reviews screen for each report that has waited a week without an update. */
export function ReportReminders({
  locationId,
  onOpen,
}: {
  locationId: string | undefined;
  onOpen: (reviewId: string) => void;
}) {
  const reports = useReports(locationId);
  const due = (reports.data ?? []).filter((r) => r.reminder_due);
  if (!due.length) return null;
  return (
    <div className="mt-6 space-y-2">
      {due.map((r) => (
        <div
          key={r.id}
          className="flex flex-col gap-2 rounded-card border border-kb-amber/30 bg-kb-amber-soft p-4 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-sm leading-6">
            You reported a review a week ago or more. How did it go with Google?
          </p>
          <Button variant="secondary" size="compact" onClick={() => onOpen(r.review_id)}>
            Update it
          </Button>
        </div>
      ))}
    </div>
  );
}
