import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/marketing/legal";
import { CONTACT_EMAIL, CONTACT_PHONE, pageHead } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () =>
    pageHead({
      title: "Privacy — Kabsi",
      description:
        "What Kabsi records, why, where it's kept, and how to delete it. No IP addresses, no advertising cookies, no selling data.",
      path: "/privacy",
    }),
  component: Page,
});

function Page() {
  return (
    <LegalPage title="Privacy" updated="26 September 2026">
      <section>
        <h2>Who we are</h2>
        <p>
          Kabsi is an independent business in Beirut, Lebanon. Contact: {CONTACT_EMAIL}, or{" "}
          {CONTACT_PHONE} (phone or WhatsApp) for a person.
        </p>
      </section>

      <section>
        <h2>If you tapped or scanned a Kabsi card</h2>
        <ul>
          <li>We don't know who you are, and you don't give us anything.</li>
          <li>
            We record the card's code, the time, the country the request came from, whether the
            phone was Android or iPhone, whether it came from the chip or the QR code, and whether
            it looked like an automated crawler.
          </li>
          <li>
            We never store IP addresses. We set no advertising cookies and don't track you on other
            sites.
          </li>
          <li>
            You're sent to Google's own review page. What happens there is covered by Google's
            privacy policy.
          </li>
        </ul>
      </section>

      <section>
        <h2>If you use Kabsi for your business</h2>
        <p>To provide the service we hold:</p>
        <ul>
          <li>your email address and any alert emails you add;</li>
          <li>
            your business name, address, country, time zone and Google Business Profile identifier;
          </li>
          <li>
            the facts you give us for drafting (sign-off, tone, phone, hours note, what to mention,
            staff names);
          </li>
          <li>your reviews, the drafts we write and the replies you post;</li>
          <li>photos you upload, posts and special hours you prepare;</li>
          <li>your plan and payment records, including USDT transaction IDs you send us;</li>
          <li>the date and wording of your authorisation;</li>
          <li>if a partner introduced you, which partner.</li>
        </ul>
      </section>

      <section>
        <h2>Google data</h2>
        <ul>
          <li>
            You give Kabsi access by adding hello@kabsi.co as a Manager on your Business Profile.
            This lets us read your reviews and profile information and publish only what you
            approve.
          </li>
          <li>We use Google's official Business Profile APIs and the Places API.</li>
          <li>
            We use Google data only to provide the features you see in Kabsi. We don't sell it,
            don't use it for advertising, and don't use it to train AI models.
          </li>
          <li>
            You can remove our access at any time from your Google profile, without asking us.
          </li>
        </ul>
      </section>

      <section>
        <h2>How drafts are written</h2>
        <ul>
          <li>Review text and your business facts are sent to Anthropic's API to draft a reply.</li>
          <li>
            Photos you upload are sent to Anthropic's API to check they're suitable for Google.
          </li>
          <li>Drafts reach you by email (sent through Resend) and in your dashboard.</li>
          <li>Nothing is published to Google unless you approve that exact content.</li>
          <li>We never put a reviewer's personal details into a reply.</li>
        </ul>
      </section>

      <section>
        <h2>Partners</h2>
        <p>
          If a partner introduced you, they can see your business name, country, whether your
          service is live, and how many times your card was tapped. They cannot see your reviews,
          drafts, replies, photos or reports, and they can't approve anything for you.
        </p>
      </section>

      <section>
        <h2>Where data is kept and who helps us</h2>
        <ul>
          <li>Supabase (database, sign-in and file storage), Frankfurt, Germany.</li>
          <li>Cloudflare (card links) and Lovable (hosting the website and app).</li>
          <li>Resend (sending email) and Anthropic (writing drafts and checking photos).</li>
          <li>Sentry (error reports, no review content).</li>
          <li>
            PostHog (visit statistics). Screen recordings are only made on our public pages, never
            inside your dashboard, and events never contain review text, names or email addresses.
          </li>
        </ul>
      </section>

      <section>
        <h2>What we never do</h2>
        <p>We don't sell your data, and we don't send you marketing emails without asking.</p>
      </section>

      <section>
        <h2>Deleting</h2>
        <p>
          Email {CONTACT_EMAIL} and we delete your business data, including reviews, drafts and
          photos. Payment records are kept where the law requires. Tap records hold no personal
          information.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>If we change this in a way that matters, we email you before it applies.</p>
      </section>
    </LegalPage>
  );
}
