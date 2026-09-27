import { useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  MapPin,
  MessageCircle,
  Printer,
  Receipt,
  Search,
  Store,
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CtaBand,
  Eyebrow,
  FaqList,
  IconBadge,
  H2,
  PageHero,
  Photo,
  Section,
} from "@/components/marketing/parts";
import { ReviewLinkVisual } from "@/components/marketing/visuals";
import { supabaseUrl } from "@/lib/supabase";
import { qrSvg } from "@/lib/qr";
import { track } from "@/lib/telemetry";
import { faqJsonLd } from "@/lib/faq";
import { SITE_URL, pageHead } from "@/lib/site";

// Free tool (D252): search a business, get Google's own review link and a QR code. No sign-in; the search
// runs through the review-link Edge Function so the Places key stays on the server.
const TOOL_FAQ = [
  {
    q: "Is this an official Google link?",
    a: "Yes. It is Google's own review form address for your business, built from your Google Place ID. Anyone who opens it can leave a review on your Google profile.",
  },
  {
    q: "Is it free?",
    a: "Yes. No sign-up, no email. Search, copy the link, download the QR code.",
  },
  {
    q: "Can I send the link only to happy customers?",
    a: "No. Google's policies don't allow asking only satisfied customers or offering rewards for reviews. Share the same link with everyone.",
  },
  {
    q: "The link doesn't find my business. Why?",
    a: "Your business needs a Google Business Profile that shows on Google Maps. Try the exact name as it appears on Maps plus your city.",
  },
];

export const Route = createFileRoute("/google-review-link")({
  head: () =>
    pageHead({
      title: "Free Google review link and QR code generator | Kabsi",
      description:
        "Find your business, copy your Google review link and download a QR code to print. Free, no sign-up, works for any business on Google Maps.",
      path: "/google-review-link",
      crumbs: [{ name: "Free review link and QR code", path: "/google-review-link" }],
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Google review link and QR code generator",
          url: `${SITE_URL}/google-review-link`,
          applicationCategory: "BusinessApplication",
          offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
        },
        faqJsonLd(TOOL_FAQ),
      ],
    }),
  component: Page,
});

type Place = { place_id: string; name: string; address: string; review_url: string };

function Page() {
  const [picked, setPicked] = useState<Place | null>(null);
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Free tool"
        title="Get your Google review link and QR code."
        sub="Search your business, copy the link that opens your Google review form, and download a QR code to print. Free, no sign-up."
        visual={<ReviewLinkVisual />}
        photo="heroTool"
        visualClassName="hidden md:flex"
      >
        <div className="mt-9 max-w-2xl">
          <Finder onPick={setPicked} />
        </div>
      </PageHero>

      {picked ? <Result place={picked} /> : null}

      <Section
        tone={picked ? "sand" : "white"}
        className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
      >
        <div className="grid grid-cols-2 gap-3">
          <Photo id="guideLink" sizes="(min-width: 1024px) 25vw, 50vw" className="aspect-[3/4]" />
          <Photo id="cafe" sizes="(min-width: 1024px) 25vw, 50vw" className="mt-10 aspect-[3/4]" />
        </div>
        <div>
          <Eyebrow>Where to use it</Eyebrow>
          <H2>Ask every customer, the same way.</H2>
          <div data-stagger="" className="mt-8 grid gap-3">
            <Tip icon={<Store />} title="On the counter and tables">
              Print the QR code on a small card. Customers scan it with their phone camera.
            </Tip>
            <Tip icon={<MessageCircle />} title="In WhatsApp and Instagram">
              Paste the link in your thank-you message or your bio. It opens the review form
              directly.
            </Tip>
            <Tip icon={<Receipt />} title="On receipts and menus">
              A QR code at the bottom of a receipt or menu reaches people when the visit is fresh.
            </Tip>
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-6 text-kb-stone">
            Share it with everyone. Google's policies don't allow asking only happy customers or
            giving rewards for reviews, and neither do we.
          </p>
        </div>
      </Section>

      <Section>
        <Eyebrow>Questions</Eyebrow>
        <H2>About the review link.</H2>
        <div className="mt-10">
          <FaqList items={TOOL_FAQ} />
        </div>
      </Section>

      <CtaBand
        title="More reviews means more replies to write."
        sub="Kabsi drafts a reply to every new Google review in your customer's language. You approve it with one tap."
      />
    </PublicLayout>
  );
}

function Finder({ onPick }: { onPick: (p: Place) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  async function search(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/review-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const j = (await res.json().catch(() => ({}))) as { places?: Place[]; message?: string };
      if (!res.ok) throw new Error(j.message || "Search didn't work. Try again.");
      setResults(j.places ?? []);
      track("free_tool_used", { source: "review_link_search" });
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Search didn't work. Try again.");
    }
    setBusy(false);
  }
  return (
    <div>
      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="biz" className="sr-only">
          Business name and city
        </label>
        <Input
          id="biz"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Your business name and city"
          maxLength={120}
          className="h-[52px] bg-kb-white text-base text-kb-ink"
        />
        <Button type="submit" className="h-[52px] shrink-0" disabled={busy || q.trim().length < 2}>
          <Search /> {busy ? "Searching…" : "Find my business"}
        </Button>
      </form>
      {err ? (
        <p className="mt-3 text-sm text-kb-yellow" role="alert">
          {err}
        </p>
      ) : null}
      {results ? (
        <ul className="mt-4 space-y-2">
          {results.length === 0 ? (
            <li className="text-sm text-kb-stone-on-dark">
              Nothing found. Try the exact name as it appears on Google Maps plus your city.
            </li>
          ) : null}
          {results.map((p) => (
            <li key={p.place_id}>
              <button
                type="button"
                onClick={() => {
                  onPick(p);
                  track("free_tool_used", { source: "review_link_pick" });
                  setTimeout(
                    () => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }),
                    50,
                  );
                }}
                className="flex w-full items-start gap-3 rounded-card bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
              >
                <MapPin className="mt-0.5 size-5 shrink-0 text-kb-yellow" aria-hidden="true" />
                <span>
                  <span className="block font-bold">{p.name}</span>
                  <span className="block text-sm text-kb-stone-on-dark">{p.address}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Result({ place }: { place: Place }) {
  const [copied, setCopied] = useState(false);
  const svg = qrSvg(place.review_url, 220);
  const file =
    place.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "business";
  function copy() {
    void navigator.clipboard?.writeText(place.review_url).then(() => {
      setCopied(true);
      track("free_tool_used", { source: "review_link_copy" });
      setTimeout(() => setCopied(false), 2000);
    });
  }
  function downloadPng() {
    const img = new Image();
    const url = URL.createObjectURL(
      new Blob([qrSvg(place.review_url, 1024)], { type: "image/svg+xml" }),
    );
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 1024;
      c.getContext("2d")!.drawImage(img, 0, 0, 1024, 1024);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = c.toDataURL("image/png");
      a.download = `google-review-qr-${file}.png`;
      a.click();
      track("free_tool_used", { source: "review_link_png" });
    };
    img.src = url;
  }
  function printCard() {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    const esc = (s: string) =>
      s.replace(
        /[&<>"]/g,
        (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!,
      );
    w.document.write(
      `<!doctype html><title>Google review card</title><body style="font-family:sans-serif;text-align:center;padding:40px">` +
        `<p style="font-size:30px;font-weight:700;margin:0 0 8px">Leave us a Google review</p>` +
        `<p style="font-size:18px;margin:0 0 20px">${esc(place.name)}</p>${qrSvg(place.review_url, 340)}` +
        `<p style="font-size:16px;margin:16px 0 0">Scan with your phone camera</p></body>`,
    );
    w.document.close();
    w.focus();
    w.print();
    track("free_tool_used", { source: "review_link_print" });
  }
  return (
    <Section className="grid items-center gap-10 md:grid-cols-[auto_1fr]" id="result">
      <div
        className="mx-auto size-56 overflow-hidden rounded-large border border-kb-hairline"
        role="img"
        aria-label={`QR code for ${place.name}'s Google review link`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="min-w-0">
        <Eyebrow>Your review link</Eyebrow>
        <h2 className="mt-4 font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-tight">
          {place.name}
        </h2>
        <p className="mt-1 text-kb-stone">{place.address}</p>
        <div className="mt-5 flex items-center gap-2 rounded-card bg-kb-sand px-4 py-3 text-sm">
          <span className="min-w-0 flex-1 truncate font-mono">{place.review_url}</span>
          <button type="button" onClick={copy} className="shrink-0" aria-label="Copy review link">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={copy}>{copied ? "Copied" : "Copy link"}</Button>
          <Button variant="outline" onClick={downloadPng}>
            <Download /> Download QR (PNG)
          </Button>
          <Button variant="ghost" onClick={printCard}>
            <Printer /> Print a counter card
          </Button>
        </div>
        <p className="mt-5 text-sm leading-6 text-kb-stone">
          Want customers to tap instead of scan? An{" "}
          <Link to="/pricing" className="font-bold text-kb-ink underline underline-offset-4">
            NFC card
          </Link>{" "}
          opens the same page with one tap.{" "}
          <Link
            to="/"
            className="inline-flex items-center gap-1 font-bold text-kb-ink underline underline-offset-4"
          >
            See what Kabsi does <ArrowRight className="size-4" />
          </Link>
        </p>
      </div>
    </Section>
  );
}

function Tip({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="kb-lift flex gap-4 rounded-large border-2 border-kb-hairline bg-kb-white p-5">
      <IconBadge icon={icon} />
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="mt-1 leading-7 text-kb-stone">{children}</p>
      </div>
    </div>
  );
}
