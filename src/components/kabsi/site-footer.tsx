import { Mail } from "lucide-react";
import { siFacebook, siInstagram } from "simple-icons";
import { cn } from "@/lib/utils";
import {
  BRAND_LINE,
  CONTACT_EMAIL,
  MERCHANT_LINE,
  NOT_AFFILIATED,
  OPERATOR_LINE,
  SOCIAL_LINKS,
  WHATSAPP_ON,
  WHATSAPP_URL,
} from "@/lib/site";
import { Logo, WhatsAppGlyph } from "./ui";
import { SiteLink } from "./site-link";
import { openPrivacyChoices } from "@/lib/consent";

/**
 * The short footer (Site 2, master plan 30.34 item 4): the logo, the brand line and the SOCIAL_LINKS icons; three short
 * groups (Product, Explore, Company) with no industry links; then the legal row (Privacy, Terms, Partner terms, Your
 * privacy choices) and the small print: the independence line and the year, then the operator and Creem lines (Site 3b,
 * audit E1: DESIGN.md lists them for the footer; they are also at the top of /terms and /privacy). Google's third-party
 * guidance link is in the FAQ answer on adding Kabsi as a Manager.
 * WhatsApp shows only while WHATSAPP_ON, with its glyph; hello@kabsi.co is always there.
 */
type FootLink = { label: string; to: string; kind?: "mail" | "whatsapp" };
const GROUPS: { title: string; links: FootLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", to: "/how-it-works" },
      { label: "Pricing", to: "/pricing" },
      { label: "Free check", to: "/scan" },
      { label: "Review link and QR code", to: "/google-review-link" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Businesses", to: "/for" },
      { label: "Guides", to: "/guides" },
      { label: "FAQ", to: "/faq" },
      { label: "Partners", to: "/partners" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Security", to: "/security" },
      { label: "Contact", to: `mailto:${CONTACT_EMAIL}`, kind: "mail" },
      ...(WHATSAPP_ON ? [{ label: "WhatsApp", to: WHATSAPP_URL, kind: "whatsapp" as const }] : []),
      // SEO 1: /setup-call is in the sitemap and was linked from nowhere on the site. Last in the group, so no
      // baseline picture of the first screens of a page moves.
      { label: "Help setting up", to: "/setup-call" },
    ],
  },
];

const footLink =
  "inline-flex min-h-11 min-w-11 items-center gap-2 text-small text-text-2 underline-offset-4 transition-colors duration-150 hover:text-text-1 hover:underline";
const quietLink =
  "inline-flex min-h-11 items-center text-label text-text-2 underline underline-offset-4 hover:text-text-1";

function SocialIcon({ name }: { name: string }) {
  const icon = name === "Facebook" ? siFacebook : siInstagram;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
      <path d={icon.path} />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-band pb-24 sm:pb-20">
      <div className="container-kb grid gap-8 pt-12 pb-8 lg:grid-cols-[1fr_2fr] lg:gap-10 lg:pt-20 lg:pb-12">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 lg:block">
          <div>
            <Logo className="-ms-1 ps-1" />
            <p className="mt-3 max-w-[18ch] font-display text-title font-bold text-text-1 lg:text-h3">
              {BRAND_LINE}
            </p>
          </div>
          {/* Go live 1 (B-035): Nora's button steps aside when it would cover these, and the footer's bottom padding from
              640 px keeps the last row clear of her wide button (80 px from the bottom). */}
          <ul className="flex gap-1 lg:mt-6" aria-label="Kabsi on social media" data-nora-avoid>
            {SOCIAL_LINKS.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="press grid size-11 place-items-center rounded-full border border-line-strong text-text-2 hover:text-text-1"
                >
                  <SocialIcon name={s.name} />
                  <span className="sr-only">Kabsi on {s.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
          {GROUPS.map((g) => (
            <nav
              key={g.title}
              aria-label={g.title}
              className={cn(g.title === "Company" && "col-span-2 sm:col-span-1")}
            >
              <h2 className="font-sans text-label font-bold text-text-3">{g.title}</h2>
              <ul
                className={cn(
                  "mt-1",
                  g.title === "Company" && "max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-6",
                )}
              >
                {g.links.map((l) => (
                  <li key={l.label}>
                    {l.kind === "mail" ? (
                      <a href={l.to} className={footLink}>
                        <Mail className="size-4" aria-hidden />
                        {l.label}
                      </a>
                    ) : l.kind === "whatsapp" ? (
                      /* The glyph labels the channel beside the word, on a link that opens Kabsi's WhatsApp. */
                      <a href={l.to} target="_blank" rel="noreferrer" className={footLink}>
                        <WhatsAppGlyph className="size-4" />
                        {l.label}
                      </a>
                    ) : (
                      <SiteLink to={l.to} className={footLink}>
                        {l.label}
                      </SiteLink>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      {/* data-nora-avoid: Nora's lone button steps aside rather than cover the legal row (Polish 4). */}
      <div className="border-t border-line" data-nora-avoid>
        <div className="container-kb space-y-2 py-5 text-label text-text-3 lg:py-6">
          <ul className="flex flex-wrap items-center gap-x-5">
            <li>
              <SiteLink to="/privacy" className={quietLink}>
                Privacy
              </SiteLink>
            </li>
            <li>
              <SiteLink to="/terms" className={quietLink}>
                Terms
              </SiteLink>
            </li>
            <li>
              <SiteLink to="/partners/terms" className={quietLink}>
                Partner terms
              </SiteLink>
            </li>
            <li>
              <button type="button" onClick={openPrivacyChoices} className={quietLink}>
                Your privacy choices
              </button>
            </li>
          </ul>
          <p className="max-w-[80ch]">{NOT_AFFILIATED} © 2026 Kabsi.</p>
          <p className="max-w-[80ch]">
            {OPERATOR_LINE} {MERCHANT_LINE}
          </p>
        </div>
      </div>
    </footer>
  );
}
