import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { CtaBand, Eyebrow, FaqList, H2, PageHero, Section } from "@/components/marketing/parts";
import { BusinessFinder } from "@/components/profile-check/business-finder";
import { SnapshotResult } from "@/components/profile-check/snapshot-result";
import { useProfileCheck } from "@/components/profile-check/use-profile-check";
import { faqJsonLd } from "@/lib/faq";
import { SITE_URL, WHATSAPP_ON, pageHead } from "@/lib/site";

// Free tool (P0.4-01; K-91, K-62, K-82, G-27): search a business and see what customers see on Google, from public data
// only. The check runs through the profile-snapshot Edge Function, so the Places key, the limits and the 24 hour cache
// stay on the server. No sign-up, no score, no comparison with other businesses.
const TOOL_FAQ = [
  {
    q: "What does the check look at?",
    a: "Only what anyone can see about your business on Google Maps: rating, number of reviews, opening hours, whether you are open now, phone, website, category and whether the profile has photos.",
  },
  {
    q: "Is it free?",
    a: `Yes. No sign-up. You can run 3 checks a day. If you want the result in your inbox, add your email${WHATSAPP_ON ? ", or send it to WhatsApp as one message" : ""}.`,
  },
  {
    q: "Does it give my business a score?",
    a: "No. It lists what Google shows, marks what needs fixing in red or amber, and says what Kabsi would do about each one. It does not rank you or compare you with other businesses.",
  },
  {
    q: "Why can't it see my replies, holiday hours, photo dates or posts?",
    a: "Google's public information does not include them, so the check says so instead of guessing. Once you connect your profile, Kabsi can see them and take care of them, and you approve each change.",
  },
  {
    q: "Does Kabsi get access to my Google profile from this check?",
    a: "No. The check uses public information only. Nothing about your profile is changed.",
  },
];

export const Route = createFileRoute("/google-profile-check")({
  head: () =>
    pageHead({
      title: "Free Google Profile Check | Kabsi",
      description:
        "Search your business and see what customers see on Google, and what needs fixing. Free, no sign-up, public information only.",
      path: "/google-profile-check",
      crumbs: [{ name: "Free Google Profile Check", path: "/google-profile-check" }],
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Google Profile Check",
          url: `${SITE_URL}/google-profile-check`,
          applicationCategory: "BusinessApplication",
          offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
        },
        faqJsonLd(TOOL_FAQ),
      ],
    }),
  component: Page,
});

function Page() {
  const check = useProfileCheck("tool");
  const showing = check.phase === "result" && check.snapshot;
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Free tool"
        title="See what customers see on Google, and what needs fixing."
        sub="Search your business and see what Google shows, and what Kabsi would do about each thing that needs fixing. Free, no sign-up, public information only."
      >
        <div className="mt-9 max-w-2xl">
          {showing ? null : <BusinessFinder state={check} tone="dark" />}
        </div>
      </PageHero>

      {showing ? (
        <Section id="result">
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Your check</Eyebrow>
            <div className="mt-4">
              <SnapshotResult
                snapshot={check.snapshot!}
                page="/google-profile-check"
                onAnother={check.again}
              />
            </div>
          </div>
        </Section>
      ) : null}

      <Section tone={showing ? "sand" : "white"}>
        <Eyebrow>Questions</Eyebrow>
        <H2>About the Google Profile Check.</H2>
        <div className="mt-10">
          <FaqList items={TOOL_FAQ} />
        </div>
      </Section>

      <CtaBand />
    </PublicLayout>
  );
}
