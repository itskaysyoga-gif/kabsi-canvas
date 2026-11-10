import { useQuery } from "@tanstack/react-query";
import { fmtDate } from "@/lib/format";
import {
  CHOICE_LABEL,
  TRACKING_CHOICES,
  gate3Line,
  loadStaffRequestAnswers,
} from "@/lib/request-answers";
import { STAFF_CARD, STAFF_H2, STAFF_ITEM } from "./staff-ui";

// Staff, Businesses: the two optional onboarding questions as counts only (Onboarding 1, master plan 30.48, R-145). Gate
// 3's evidence: of the first 10 businesses that answered, how many keep requests in chats, a notebook or memory and said
// yes, and which, in order. No email, phone or app name; demo and test businesses are left out by the database function.
// Staff only (public.staff_request_answers refuses everyone else). Words: docs/COPY.md section 73.

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 text-small">
      <dt className="text-text-2">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

export function RequestAnswersPanel() {
  const q = useQuery({
    queryKey: ["staff-request-answers"],
    queryFn: loadStaffRequestAnswers,
    refetchInterval: 300_000,
  });
  const d = q.data;
  return (
    <section id="early-answers" className={STAFF_CARD} data-testid="staff-request-answers">
      <h2 className={STAFF_H2}>Early answers</h2>
      <p className="mt-1 text-small text-text-2">
        Two optional questions in onboarding. Counts only, for real businesses.
      </p>
      {q.isLoading ? <p className="mt-3 text-small text-text-2">Loading</p> : null}
      {q.isError ? (
        <p className="mt-3 text-small text-bad">
          The counts did not load.{" "}
          <button type="button" className="underline" onClick={() => void q.refetch()}>
            Try again
          </button>
        </p>
      ) : null}
      {d ? (
        <div className="mt-4 space-y-4">
          <p className="text-small font-semibold" data-testid="gate3-line">
            {gate3Line(d.gate3)}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={STAFF_ITEM}>
              <p className="font-bold">How businesses keep track of requests today</p>
              <dl className="mt-2 divide-y divide-line">
                {TRACKING_CHOICES.map(([v, label]) => (
                  <Line key={v} label={label} value={d.tracking[v]} />
                ))}
                <Line label="Answered" value={d.tracking.answered} />
              </dl>
            </div>
            <div className={STAFF_ITEM}>
              <p className="font-bold">Early access to new WhatsApp tools</p>
              <dl className="mt-2 divide-y divide-line">
                <Line label="Yes" value={d.early_access.yes} />
                <Line label="No" value={d.early_access.no} />
                <Line label="Answered" value={d.early_access.answered} />
              </dl>
            </div>
          </div>
          <div className={STAFF_ITEM}>
            <p className="font-bold">In order</p>
            <p className="text-small text-text-2">
              Businesses that keep requests in chats, a notebook or memory and said yes, by the day
              they first answered. The first is the pilot.
            </p>
            {d.qualifying.length === 0 ? (
              <p className="mt-2 text-small text-text-2">None yet.</p>
            ) : (
              <ol className="mt-2 divide-y divide-line">
                {d.qualifying.map((r) => (
                  <li
                    key={r.position}
                    className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 text-small"
                  >
                    <span>
                      <span className="font-semibold">{r.business}</span>{" "}
                      <span className="text-text-2">
                        (answer number {r.position}
                        {r.in_first_ten ? ", in the first 10" : ""})
                      </span>
                    </span>
                    <span className="text-text-2">
                      {CHOICE_LABEL[r.keeps_requests] ?? r.keeps_requests}, {fmtDate(r.answered_on)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
