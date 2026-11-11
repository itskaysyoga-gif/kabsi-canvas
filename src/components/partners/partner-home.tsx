import { Link, useRouter } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { Marked } from "@/components/kabsi/highlight";
import { Badge, Banner, Button, ButtonLink, buttonClass, Card, Field } from "@/components/kabsi/ui";
import { inAppBrowserNow } from "@/lib/in-app-browser";
import { qrSvg } from "@/lib/qr";
import {
  askPayoutChange,
  confirmPayoutCode,
  longDate,
  PARTNER_COPY as C,
  PartnerError,
  partnerHome,
  type PartnerHome,
  partnerLink,
  PAYOUT_OPTIONS,
  type PayoutMethod,
  payoutLabel,
  usd,
} from "@/lib/partner";

// Cards 2: the card links section loads on its own, after the rest of the home (the review link search comes with it).
const PartnerCards = lazy(() => import("./partner-cards"));

// Partners 2 (master plan 30.50 item 6): kabsi.co/partner, the partner home. Signed in: the link and its QR code, the
// numbers from the one ledger, the payout method (asked once 50 US dollars has cleared, shown as the last 4 characters,
// changed only after a fresh confirm on WhatsApp or an email code), and the rules. A referred business shows as its
// trade and area only (29.2). noindex.

export default function PartnerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [home, setHome] = useState<PartnerHome | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setInApp(inAppBrowserNow());
    setReady(true);
  }, []);
  const load = () => {
    setFailed(false);
    partnerHome()
      .then(setHome)
      .catch(() => setFailed(true));
  };
  useEffect(() => {
    if (user) load();
  }, [user]);

  return (
    <PublicLayout>
      <section className="container-kb pt-8 pb-16 md:pt-12">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <h1 className="font-display text-h2 font-bold text-text-1">
            <Marked text={C.homeTitle} mark={C.homeMark} />
          </h1>
          {!ready || loading ? (
            <p role="status" className="min-h-40" />
          ) : !user ? (
            <Card>
              <p className="mb-4 text-small font-bold text-text-1">{C.signInFirst}</p>
              <SignInPanel next="/partner" onDone={() => void router.invalidate()} inApp={inApp} />
            </Card>
          ) : failed ? (
            <Banner
              tone="bad"
              title="Something went wrong. Please try again in a minute."
              action={
                <Button variant="secondary" size="md" onClick={load}>
                  Try again
                </Button>
              }
            />
          ) : !home ? (
            <p role="status" className="min-h-40 text-body text-text-2">
              Loading your partner home.
            </p>
          ) : home.result !== "ok" || !home.partner || !home.numbers ? (
            <Card>
              <p className="text-body text-text-1">{C.notPartner}</p>
              <ButtonLink to="/partners/join" className="mt-4">
                {C.joinLink}
              </ButtonLink>
            </Card>
          ) : (
            <Home home={home} reload={load} />
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

function Home({ home, reload }: { home: PartnerHome; reload: () => void }) {
  const p = home.partner!;
  const n = home.numbers!;
  const link = partnerLink(p.code);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      /* the link is on screen to copy by hand */
    }
  };
  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-h3 font-bold text-text-1">{C.linkLabel}</h2>
          {p.founding_partner ? <Badge>{C.founding}</Badge> : null}
        </div>
        <p className="mt-3 break-all rounded-inner bg-surface-2 px-4 py-3 font-mono text-small text-text-1">
          {link}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          className={buttonClass("secondary", "md") + " mt-3"}
        >
          {copied ? C.copied : C.copy}
        </button>
        <span className="sr-only" role="status">
          {copied ? C.copied : ""}
        </span>
        <div className="mt-5 flex items-center gap-4">
          <div
            className="size-36 shrink-0 rounded-inner bg-surface-2 p-2"
            role="img"
            aria-label={`${C.qrLabel}: ${link}`}
            dangerouslySetInnerHTML={{ __html: qrSvg(link, 128) }}
          />
          <p className="text-small text-text-2">{C.qrLabel}. Print it or show it on your phone.</p>
        </div>
      </Card>

      <Card>
        <h2 className="text-h3 font-bold text-text-1">{C.numbersTitle}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Num label={C.visits} value={String(n.visits)} />
          <Num label={C.trials} value={String(n.trials)} />
          <Num label={C.paying} value={String(n.paying)} />
          <Num label={C.earned} value={usd(n.earned_cents)} />
          <Num label={C.pending} value={usd(n.pending_cents)} />
          <Num label={C.nextPayout} value={longDate(n.next_payout_on)} />
        </dl>
        <p className="mt-4 text-small text-text-2">{C.numbersNote}</p>
        {n.test_cents ? (
          <p className="mt-1 text-small text-text-2">{C.testLine(usd(n.test_cents))}</p>
        ) : null}
        {!p.reviewed ? <p className="mt-1 text-small text-text-2">{C.review}</p> : null}
      </Card>

      <Card>
        <h2 className="text-h3 font-bold text-text-1">{C.businessesTitle}</h2>
        <p className="mt-1 text-small text-text-2">{C.businessesNote}</p>
        {home.businesses?.length ? (
          <ul className="mt-4 divide-y divide-line">
            {home.businesses.map((b, i) => (
              <li
                key={i}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-body text-text-1"
              >
                <span>{[b.trade, b.area].filter(Boolean).join(", ") || "A business"}</span>
                <span className="text-small text-text-2">{C.state[b.state] ?? b.state}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-body text-text-2">{C.noBusinesses}</p>
        )}
      </Card>

      <Suspense fallback={null}>
        <PartnerCards />
      </Suspense>

      <Payout home={home} reload={reload} />

      <Card>
        <h2 className="text-h3 font-bold text-text-1">{C.rulesTitle}</h2>
        <ul className="mt-3 list-disc space-y-2 ps-5 text-body text-text-1">
          {C.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <Link
          to="/partners/terms"
          className="mt-4 inline-flex min-h-11 items-center font-bold text-text-1 underline underline-offset-4"
        >
          {C.rulesLink}
        </Link>
      </Card>
    </>
  );
}

function Num({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-small text-text-2">{label}</dt>
      <dd className="mt-1 text-h3 font-bold text-text-1">{value}</dd>
    </div>
  );
}

function Payout({ home, reload }: { home: PartnerHome; reload: () => void }) {
  const p = home.partner!;
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PayoutMethod>("paypal");
  const [detail, setDetail] = useState("");
  const [wait, setWait] = useState<{ id: string; channel: "whatsapp" | "email" } | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<{ field?: string | undefined; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const current = p.payout_method
    ? `${payoutLabel(p.payout_method)} ending in ${p.payout_last4 ?? ""}`
    : null;

  const fail = (x: unknown) => {
    const e =
      x instanceof PartnerError
        ? x
        : new PartnerError("failed", "Something went wrong. Please try again in a minute.");
    setErr({ field: e.field, message: e.message });
    setBusy(false);
  };
  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      setWait(await askPayoutChange(method, detail));
      setBusy(false);
    } catch (x) {
      fail(x);
    }
  };
  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wait) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await confirmPayoutCode(wait.id, code);
      setSaved(C.saved(`${payoutLabel(r.method)} ending in ${r.last4}`));
      setWait(null);
      setOpen(false);
      setBusy(false);
      reload();
    } catch (x) {
      fail(x);
    }
  };

  return (
    <Card>
      <h2 className="text-h3 font-bold text-text-1">{C.payoutTitle}</h2>
      {saved ? <p className="mt-2 text-body font-semibold text-ok">{saved}</p> : null}
      {!home.payout_ask ? (
        <p className="mt-2 text-body text-text-2">{C.payoutNotYet}</p>
      ) : (
        <>
          {current ? <p className="mt-2 text-body text-text-1">{C.payoutNow(current)}</p> : null}
          {!open && !wait ? (
            <Button variant="secondary" size="md" className="mt-4" onClick={() => setOpen(true)}>
              {current ? C.payoutChange : C.payoutAsk}
            </Button>
          ) : null}
          {open && !wait ? (
            <form onSubmit={(e) => void ask(e)} className="mt-4 space-y-4" noValidate>
              <fieldset>
                <legend className="mb-2 text-small font-bold text-text-1">{C.payoutMethod}</legend>
                <div className="flex flex-wrap gap-2">
                  {PAYOUT_OPTIONS.map(([k, label]) => (
                    <label
                      key={k}
                      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-input border px-4 text-body ${method === k ? "border-text-1 bg-surface-2 font-bold" : "border-stroke"}`}
                    >
                      <input
                        type="radio"
                        name="method"
                        value={k}
                        checked={method === k}
                        onChange={() => setMethod(k)}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field
                label={method === "paypal" ? C.paypalDetail : C.walletDetail}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                autoComplete="off"
                error={err?.field === "detail" ? err.message : undefined}
              />
              {err && err.field !== "detail" ? <Banner tone="bad" title={err.message} /> : null}
              <Button type="submit" disabled={busy}>
                {C.payoutSend}
              </Button>
            </form>
          ) : null}
          {wait?.channel === "whatsapp" ? (
            <Banner
              tone="info"
              title={C.waitWhatsApp}
              className="mt-4"
              action={
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setWait(null);
                    setOpen(false);
                    reload();
                  }}
                >
                  {C.tapped}
                </Button>
              }
            />
          ) : null}
          {wait?.channel === "email" ? (
            <form onSubmit={(e) => void confirm(e)} className="mt-4 space-y-4" noValidate>
              <Banner tone="info" title={C.waitEmail} />
              <Field
                label={C.code}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                error={err?.message}
              />
              <Button type="submit" disabled={busy || code.length !== 6}>
                {C.codeSend}
              </Button>
            </form>
          ) : null}
        </>
      )}
    </Card>
  );
}
