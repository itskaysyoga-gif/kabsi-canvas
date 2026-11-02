import {
  ALL_BUSINESSES,
  BRAND_LINE,
  BUSINESS_MENU,
  CONTACT_EMAIL,
  GOOGLE_THIRD_PARTY_URL,
  NOT_AFFILIATED,
  SOCIAL_LINKS,
} from "@/lib/site";
import { Logo, WhatsAppLink } from "./ui";
import { SiteLink } from "./site-link";
import { openPrivacyChoices } from "@/lib/consent";

/**
 * Design 8 footer (Web 4, lane R 1 Nov 2026): three short groups, then one quiet row with the legal links, Your privacy
 * choices and SOCIAL_LINKS, the independence line, the operator and Creem line. "Review link and QR code" stays in
 * the Kabsi group (lane R decision 4). Nothing legally needed is dropped.
 */
const GROUPS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Kabsi",
    links: [
      { label: "How it works", to: "/how-it-works" },
      { label: "Pricing", to: "/pricing" },
      { label: "Free check", to: "/scan" },
      { label: "Review link and QR code", to: "/google-review-link" },
      { label: "Security", to: "/security" },
      { label: "FAQ", to: "/faq" },
    ],
  },
  {
    title: "Businesses",
    links: [
      { label: ALL_BUSINESSES.label, to: ALL_BUSINESSES.to },
      ...BUSINESS_MENU.map((b) => ({ label: b.label, to: b.to })),
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Founding 25", to: "/founding" },
      { label: "Partners", to: "/partners" },
      { label: "Guides", to: "/guides" },
    ],
  },
];

const footLink =
  "inline-flex min-h-11 min-w-11 items-center text-small text-text-2 underline-offset-4 transition-colors duration-150 hover:text-text-1 hover:underline";
const quietLink =
  "inline-flex min-h-11 min-w-11 items-center text-label text-text-2 underline underline-offset-4 hover:text-text-1";

export function SiteFooter() {
  return (
    <footer className="bg-band pb-24 sm:pb-0">
      <div className="container-kb grid gap-10 pt-14 pb-10 lg:grid-cols-[1fr_2fr] lg:pt-20">
        <div>
          <Logo className="-ms-1 ps-1" />
          <p className="mt-4 max-w-[16ch] font-display text-h3 font-bold text-text-1">
            {BRAND_LINE}
          </p>
          <WhatsAppLink className="mt-6" size="md" />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
          {GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="font-sans text-label font-bold text-text-3">{g.title}</h2>
              <ul className="mt-2">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <SiteLink to={l.to} className={footLink}>
                      {l.label}
                    </SiteLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-kb space-y-2 py-6 text-label text-text-3">
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
            {SOCIAL_LINKS.map((s) => (
              <li key={s.name}>
                <a href={s.href} target="_blank" rel="noreferrer" className={quietLink}>
                  {s.name}
                </a>
              </li>
            ))}
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
