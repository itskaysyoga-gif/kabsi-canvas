import { Mail } from "lucide-react";
import { siFacebook, siInstagram } from "simple-icons";
import { cn } from "@/lib/utils";
import {
  BRAND_LINE,
  CONTACT_EMAIL,
  GOOGLE_THIRD_PARTY_URL,
  NOT_AFFILIATED,
  SOCIAL_LINKS,
  WHATSAPP_ON,
  WHATSAPP_URL,
} from "@/lib/site";
import { Logo, WhatsAppGlyph } from "./ui";
import { SiteLink } from "./site-link";
import { openPrivacyChoices } from "@/lib/consent";

/**
 * Design 9 footer (Web 5 part A, master plan 30.24): the logo, the brand line and the SOCIAL_LINKS icons; three short
 * groups (Product, Explore, Company) with no industry links; then the quiet row with every legal item: Privacy, Terms,
 * Partner terms, Your privacy choices, the independence line with Google's guidance link, the operator, contact and
 * Creem line. "Review link and QR code" stays in Product (lane R decision 4 of 1 Nov). WhatsApp shows only while
 * WHATSAPP_ON; hello@kabsi.co is always there.
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
      { label: "Security", to: "/security" },
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
      { label: "Founding 25", to: "/founding" },
      { label: "Contact", to: `mailto:${CONTACT_EMAIL}`, kind: "mail" },
      ...(WHATSAPP_ON ? [{ label: "WhatsApp", to: WHATSAPP_URL, kind: "whatsapp" as const }] : []),
    ],
  },
];

const footLink =
  "inline-flex min-h-11 min-w-11 items-center gap-2 text-small text-text-2 underline-offset-4 transition-colors duration-150 hover:text-text-1 hover:underline";
const quietLink =
  "inline-flex min-h-11 min-w-11 items-center text-label text-text-2 underline underline-offset-4 hover:text-text-1";

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
    <footer className="bg-band pb-24 sm:pb-0">
      <div className="container-kb grid gap-8 pt-12 pb-8 lg:grid-cols-[1fr_2fr] lg:gap-10 lg:pt-20 lg:pb-12">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 lg:block">
          <div>
            <Logo className="-ms-1 ps-1" />
            <p className="mt-3 max-w-[18ch] font-display text-title font-bold text-text-1 lg:text-h3">
              {BRAND_LINE}
            </p>
          </div>
          <ul className="flex gap-1 lg:mt-6" aria-label="Kabsi on social media">
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
      <div className="border-t border-line">
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
          <p className="max-w-[80ch]">
            {NOT_AFFILIATED} Google Business Profile is free from Google. Kabsi is an independent
            paid service.{" "}
            <a
              href={GOOGLE_THIRD_PARTY_URL}
              target="_blank"
              rel="noreferrer"
              className="text-text-2 underline underline-offset-4 hover:text-text-1"
            >
              Google's guidance on working with a third party
            </a>
          </p>
          <p className="max-w-[80ch]">
            Kabsi is operated by Rashid Abou Hamzy. Contact:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-text-2 underline underline-offset-4 hover:text-text-1"
            >
              {CONTACT_EMAIL}
            </a>
            . Payments are processed by Creem, our merchant of record. © 2026 Kabsi
          </p>
        </div>
      </div>
    </footer>
  );
}
