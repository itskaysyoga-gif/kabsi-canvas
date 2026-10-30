import { cn } from "@/lib/utils";
import {
  BRAND_LINE,
  CONTACT_EMAIL,
  GOOGLE_THIRD_PARTY_URL,
  NOT_AFFILIATED,
  SOCIAL_LINKS,
} from "@/lib/site";
import { Logo, WhatsAppLink } from "./ui";
import { SiteLink } from "./site-link";
import { openPrivacyChoices } from "@/lib/consent";

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", to: "/how-it-works" },
      { label: "Pricing", to: "/pricing" },
      { label: "Security", to: "/security" },
      { label: "FAQ", to: "/faq" },
    ],
  },
  {
    title: "Free tools",
    links: [
      { label: "Free check", to: "/scan" },
      { label: "Google profile check", to: "/google-profile-check" },
      { label: "Review link and QR code", to: "/google-review-link" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Every kind of business", to: "/for" },
      { label: "Hair salons", to: "/for/hair-salon" },
      { label: "Barbershops", to: "/for/barbershop" },
      { label: "Restaurants", to: "/for/restaurant" },
      { label: "Dental clinics", to: "/for/dental-clinic" },
      { label: "Guides", to: "/guides" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Founding 25", to: "/founding" },
      { label: "Partners", to: "/partners" },
      { label: "Partner terms", to: "/partners/terms" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
];

const linkCls =
  "inline-flex min-h-11 items-center text-small text-text-2 underline-offset-4 transition-colors duration-150 hover:text-text-1 hover:underline";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-band pb-28 md:pb-0">
      <div className="container-kb pt-14 pb-10 lg:pt-20">
        <div className="flex flex-col gap-8 border-b border-line pb-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Logo className="-ms-1 ps-1" />
            <p className="mt-5 max-w-[18ch] font-display text-h2 font-bold text-text-1">
              {BRAND_LINE}
            </p>
          </div>
          <WhatsAppLink className="self-start lg:self-auto" />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 pt-10 md:grid-cols-3 lg:grid-cols-5">
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="font-sans text-label font-bold text-text-3">{c.title}</h2>
              <ul className="mt-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <SiteLink to={l.to} className={linkCls}>
                      {l.label}
                    </SiteLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <nav aria-label="Follow">
            <h2 className="font-sans text-label font-bold text-text-3">Follow</h2>
            <ul className="mt-3">
              {SOCIAL_LINKS.map((s) => (
                <li key={s.name}>
                  <a href={s.href} target="_blank" rel="noreferrer" className={linkCls}>
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-kb space-y-3 py-8 text-small text-text-3">
          <p className="max-w-[70ch]">
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
          <p className="max-w-[70ch]">
            Kabsi is operated by Rashid Abou Hamzy. Contact:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-text-2 underline underline-offset-4 hover:text-text-1"
            >
              {CONTACT_EMAIL}
            </a>
            . Payments are processed by Creem, our merchant of record.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pt-2">
            <button
              type="button"
              onClick={openPrivacyChoices}
              className={cn(linkCls, "text-text-2 underline")}
            >
              Your privacy choices
            </button>
            <span>© 2026 Kabsi</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
