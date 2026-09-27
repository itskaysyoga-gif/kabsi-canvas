import { useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeDollarSign, Eye, LayoutGrid, Nfc, Send, Wallet } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { WorkspaceVisual } from "@/components/marketing/visuals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eyebrow, H2, PageHero, Section } from "@/components/marketing/parts";
import { BusinessGrid } from "@/components/marketing/business-grid";
import { supabaseUrl } from "@/lib/supabase";
import { track } from "@/lib/telemetry";
import { PRICES, pageHead } from "@/lib/site";

export const Route = createFileRoute("/partners")({
  head: () =>
    pageHead({
      title: "Kabsi for partners | Google profile care for your clients",
      description: `Offer Kabsi to the businesses you already help. $${PRICES.partnerRate} per active business per month, billed monthly in USDT. You set the price and keep the margin.`,
      path: "/partners",
      crumbs: [{ name: "Partners", path: "/partners" }],
    }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Partners and agencies"
        title="Your clients already need Google. Now you can take care of it."
        sub="Offer the businesses you already help review replies they approve, a fresh profile and change alerts, with NFC cards if you sell them. You set the retail price and keep everything above a small wholesale rate per live business."
        visual={<WorkspaceVisual />}
        photo="heroPartners"
      />

      <Section>
        <Eyebrow>What you get</Eyebrow>
        <H2>One workspace for all your clients.</H2>
        <div data-stagger="" className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Point icon={<BadgeDollarSign />} title="Wholesale seats">
            Pay only for businesses that are live. Setting up, waiting for access or paused costs
            you nothing.
          </Point>
          <Point icon={<LayoutGrid />} title="Every location in one place">
            Each client's status and card taps for the last 7 and 30 days, side by side.
          </Point>
          <Point icon={<Send />} title="Invite in a minute">
            Send an invite from your workspace, or share your own signup link. Clients who join
            through you are linked to you.
          </Point>
          <Point icon={<Wallet />} title="Settle in USDT">
            One invoice on the 1st for the month before. Pay in USDT and paste the transaction ID.
          </Point>
          <Point icon={<Eye />} title="Client data stays with the client">
            You never see review text, drafts or replies, and you can't post for them. Owners
            approve everything themselves, which keeps you and them safe.
          </Point>
          <Point icon={<Nfc />} title="Supply the cards">
            Kabsi issues card codes for your stock, so the NFC cards you sell open each client's
            Google review page. Kabsi only ships cards inside Lebanon, so in your area the cards
            come from you.
          </Point>
        </div>
      </Section>

      <Section tone="sand">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>Your clients</Eyebrow>
            <H2>Every business with a Google profile, in any country.</H2>
          </div>
          <p className="max-w-sm leading-7 text-kb-stone md:text-right">
            Replies are drafted in each reviewer's language: English, Spanish, Arabic, French and
            many more.
          </p>
        </div>
        <BusinessGrid className="mt-10" />
      </Section>

      <Section className="grid items-center gap-12 md:grid-cols-2">
        <img
          src="/images/nfc-card-closeup.webp"
          alt="An acrylic NFC review card with a tap area and a QR code"
          width={640}
          height={640}
          loading="lazy"
          decoding="async"
          className="w-full max-w-md rounded-large shadow-kb"
        />
        <div>
          <Eyebrow>Cards plus software</Eyebrow>
          <H2>Sell more than a card.</H2>
          <p className="mt-5 text-lg leading-8 text-kb-stone">
            A card gets a customer to the review page. Kabsi makes sure every review gets a
            thoughtful reply, the profile gets a fresh post each week, and the owner hears about
            listing changes. Clients can also use Kabsi fully digitally, with a review link and QR
            code instead of a card.
          </p>
          <p className="mt-3 text-xs text-kb-stone">Current card design shown.</p>
        </div>
      </Section>

      <Section tone="sand">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Partner pricing</Eyebrow>
            <H2>${PRICES.partnerRate} per active business, per month.</H2>
            <p className="mt-5 text-lg leading-8 text-kb-stone">
              A business counts once it's connected to Google and live on Kabsi. Setting up, waiting
              for access or paused businesses cost you nothing. You charge your clients whatever you
              like and keep the difference.
            </p>
          </div>
          <div className="rounded-large bg-kb-carbon p-7 text-kb-white">
            <p className="text-sm font-bold uppercase tracking-wider text-kb-yellow">
              First 10 partners
            </p>
            <p className="mt-3 font-display text-5xl leading-none">
              ${PRICES.foundingRate} a month
            </p>
            <p className="mt-4 leading-7 text-kb-stone-on-dark">
              Founding partners pay ${PRICES.foundingRate} per active business, locked for 12
              months, and their first business is free for its first 30 days.
            </p>
          </div>
        </div>
      </Section>

      <Section className="grid gap-12 md:grid-cols-[1fr_1.1fr]">
        <div>
          <Eyebrow>Apply</Eyebrow>
          <H2>Tell us about you.</H2>
          <p className="mt-5 text-lg leading-8 text-kb-stone">
            We read every message and reply by email. If it's a fit, we set up your workspace and
            you sign in with the email you give here.
          </p>
        </div>
        <LeadForm />
      </Section>
    </PublicLayout>
  );
}

function Point({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="kb-lift h-full rounded-large border-2 border-kb-hairline bg-kb-white p-6">
      <span className="grid size-11 place-items-center rounded-full bg-kb-yellow text-kb-black [&_svg]:size-5">
        {icon}
      </span>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-2 leading-7 text-kb-stone">{children}</p>
    </div>
  );
}

const VOLUMES = ["Just starting", "1–10 businesses", "10–50 businesses", "50+ businesses"];

function LeadForm() {
  const [f, setF] = useState({
    name: "",
    email: "",
    instagram: "",
    country: "",
    volume: VOLUMES[0]!,
    message: "",
    website: "",
  });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/lead`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "partner", ...f }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok)
        throw new Error(json.message || "Something went wrong. Email hello@kabsi.co instead.");
      track("lead_submitted", { source: "partners_page" });
      setState("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-large bg-kb-sand p-8" role="status">
        <p className="text-2xl font-bold">Thanks, we got it.</p>
        <p className="mt-2 leading-7 text-kb-stone">We'll reply to {f.email} by email.</p>
      </div>
    );
  }
  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-large bg-kb-sand p-6 sm:grid-cols-2 sm:p-8"
    >
      <Field label="Your name" id="l-name">
        <Input
          className="bg-kb-white"
          id="l-name"
          required
          maxLength={120}
          value={f.name}
          onChange={set("name")}
        />
      </Field>
      <Field label="Email" id="l-email">
        <Input
          className="bg-kb-white"
          id="l-email"
          type="email"
          required
          value={f.email}
          onChange={set("email")}
        />
      </Field>
      <Field label="Instagram (optional)" id="l-ig">
        <Input
          className="bg-kb-white"
          id="l-ig"
          placeholder="@yourshop"
          maxLength={80}
          value={f.instagram}
          onChange={set("instagram")}
        />
      </Field>
      <Field label="Country" id="l-country">
        <Input
          className="bg-kb-white"
          id="l-country"
          maxLength={60}
          value={f.country}
          onChange={set("country")}
        />
      </Field>
      <Field label="How many businesses do you work with?" id="l-volume" wide>
        <select
          id="l-volume"
          value={f.volume}
          onChange={set("volume")}
          className="h-12 w-full rounded-card border border-kb-hairline bg-kb-white px-3"
        >
          {VOLUMES.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </Field>
      <Field label="Anything else? (optional)" id="l-msg" wide>
        <Textarea
          className="bg-kb-white"
          id="l-msg"
          rows={4}
          maxLength={2000}
          value={f.message}
          onChange={set("message")}
        />
      </Field>
      {/* honeypot: hidden from people, bots fill it */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={f.website}
        onChange={set("website")}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />
      {error ? <p className="text-sm text-kb-red sm:col-span-2">{error}</p> : null}
      <Button type="submit" className="w-full sm:col-span-2" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}

function Field({
  label,
  id,
  wide = false,
  children,
}: {
  label: string;
  id: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
