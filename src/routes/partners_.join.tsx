import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { Marked } from "@/components/kabsi/highlight";
import { Banner, Button, Field } from "@/components/kabsi/ui";
import { inAppBrowserNow } from "@/lib/in-app-browser";
import {
  countryName,
  joinPartner,
  type JoinForm,
  PARTNER_COPY as C,
  PARTNER_COUNTRIES,
  PARTNER_KIND_OPTIONS,
  PartnerError,
  partnerHome,
  PARTNER_TERMS_VERSION,
} from "@/lib/partner";

// Partners 2 (master plan 30.50 item 4): kabsi.co/partners/join. Sign in with the one panel (WhatsApp, Google or the
// email code), then one short form; the account is made at once with its code, link and QR, and opens kabsi.co/partner.
// There is no application step. noindex: a page for people who already chose to join.

export const Route = createFileRoute("/partners_/join")({
  head: () => ({
    meta: [
      { title: "Join Kabsi Partners | Kabsi" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Join Kabsi Partners: sign in, answer five short questions, and get your link at once.",
      },
    ],
  }),
  component: JoinPage,
});

const selectClass =
  "h-13 w-full rounded-input border border-stroke bg-surface-2 px-4 text-body text-text-1";
const isPlaceholder = (email: string | null | undefined) =>
  !email || /@wa\.kabsi\.co$/i.test(email);

function JoinPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setInApp(inAppBrowserNow());
    setReady(true);
  }, []);
  // A partner already: straight to the partner home.
  useEffect(() => {
    if (!user) return;
    let live = true;
    void partnerHome()
      .then((h) => {
        if (!live) return;
        if (h.result === "ok") router.history.replace("/partner");
        else setChecked(true);
      })
      .catch(() => live && setChecked(true));
    return () => {
      live = false;
    };
  }, [user, router]);

  return (
    <PublicLayout>
      <section className="container-kb pt-8 pb-16 md:pt-12">
        <div className="mx-auto w-full max-w-lg">
          <div className="rounded-card border border-line bg-surface-1 p-5 shadow-rest sm:p-8">
            <h1 className="font-display text-h2 font-bold text-text-1">
              <Marked text={C.joinTitle} mark={C.joinMark} />
            </h1>
            <p className="mt-3 mb-7 text-body text-text-2">{C.joinLead}</p>
            {!ready || loading || (user && !checked) ? (
              <p role="status" className="min-h-40 text-body text-text-2" />
            ) : !user ? (
              <>
                <p className="mb-4 text-small font-bold text-text-1">{C.signInFirst}</p>
                <SignInPanel
                  next="/partners/join"
                  onDone={() => void router.invalidate()}
                  inApp={inApp}
                />
              </>
            ) : (
              <JoinFormView
                email={isPlaceholder(user.email) ? "" : (user.email ?? "")}
                onJoined={() => router.history.replace("/partner")}
              />
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function JoinFormView({ email, onJoined }: { email: string; onJoined: () => void }) {
  const [f, setF] = useState<JoinForm>({
    name: "",
    email,
    kind: "",
    country: "",
    reach: "",
    uae_permit: "",
    uae_private: false,
    terms: false,
  });
  const [err, setErr] = useState<{ field?: string | undefined; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof JoinForm>(k: K, v: JoinForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const fieldErr = (k: string) => (err?.field === k ? err.message : undefined);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await joinPartner(f);
      onJoined();
    } catch (x) {
      const p =
        x instanceof PartnerError
          ? x
          : new PartnerError("failed", "Something went wrong. Please try again in a minute.");
      setErr({ field: p.field, message: p.message });
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5" noValidate>
      <Field
        label={C.name}
        value={f.name}
        onChange={(e) => set("name", e.target.value)}
        autoComplete="name"
        error={fieldErr("name")}
      />
      <Field
        label={C.email}
        type="email"
        value={f.email}
        onChange={(e) => set("email", e.target.value)}
        autoComplete="email"
        error={fieldErr("email")}
      />
      <div>
        <label htmlFor="kind" className="mb-2 block text-small font-bold text-text-1">
          {C.kind}
        </label>
        <select
          id="kind"
          value={f.kind}
          onChange={(e) => set("kind", e.target.value as JoinForm["kind"])}
          className={selectClass}
        >
          <option value="">Choose one</option>
          {PARTNER_KIND_OPTIONS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        {fieldErr("kind") ? (
          <p className="mt-2 text-small font-semibold text-bad">{fieldErr("kind")}</p>
        ) : null}
      </div>
      <div>
        <label htmlFor="country" className="mb-2 block text-small font-bold text-text-1">
          {C.country}
        </label>
        <select
          id="country"
          value={f.country}
          onChange={(e) => set("country", e.target.value)}
          className={selectClass}
        >
          <option value="">Choose one</option>
          {PARTNER_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {countryName(c)}
            </option>
          ))}
        </select>
        {fieldErr("country") ? (
          <p className="mt-2 text-small font-semibold text-bad">{fieldErr("country")}</p>
        ) : null}
      </div>
      {f.country === "AE" ? (
        <div className="space-y-3 rounded-inner bg-surface-2 p-4">
          <Field
            label={C.uaePermit}
            hint={C.uaeHint}
            value={f.uae_permit}
            disabled={f.uae_private}
            onChange={(e) => set("uae_permit", e.target.value)}
            error={fieldErr("uae_permit")}
          />
          <label className="flex min-h-11 items-center gap-3 text-body text-text-1">
            <input
              type="checkbox"
              className="size-5 accent-kb-green"
              checked={f.uae_private}
              onChange={(e) => set("uae_private", e.target.checked)}
            />
            {C.uaePrivate}
          </label>
        </div>
      ) : null}
      <Field
        label={C.reach}
        hint={C.reachHint}
        value={f.reach}
        maxLength={300}
        onChange={(e) => set("reach", e.target.value)}
        error={fieldErr("reach")}
      />
      <div>
        <label className="flex min-h-11 items-start gap-3 text-body text-text-1">
          <input
            type="checkbox"
            className="mt-1 size-5 accent-kb-green"
            checked={f.terms}
            onChange={(e) => set("terms", e.target.checked)}
          />
          <span>
            {C.terms}{" "}
            <Link to="/partners/terms" className="font-bold underline underline-offset-4">
              (read them)
            </Link>
            <span className="block text-small text-text-2">
              {C.termsVersion(PARTNER_TERMS_VERSION)}
            </span>
          </span>
        </label>
        {fieldErr("terms") ? (
          <p className="mt-2 text-small font-semibold text-bad">{fieldErr("terms")}</p>
        ) : null}
      </div>
      {err && !err.field ? <Banner tone="bad" title={err.message} /> : null}
      <Button type="submit" full disabled={busy}>
        {C.join}
      </Button>
    </form>
  );
}
