import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/marketing/legal";
import { RETENTION_ROWS } from "@/lib/retention";
import { openPrivacyChoices } from "@/lib/consent";
import {
  CONTACT_EMAIL,
  KABSI_GROUP_ID,
  KABSI_GROUP_NAME,
  LEGAL_SELLER,
  OPERATOR_LINE,
  WHATSAPP_NUMBER,
  pageHead,
} from "@/lib/site";

// Privacy policy, written to match the system as built (P0.2-07). Every retention period, processor and
// control named here exists today; nothing is announced ahead of time. The retention table comes from
// src/lib/retention.ts, which tests/retention-page.test.ts holds equal to `retention_policies`. No em dashes.
export const Route = createFileRoute("/privacy")({
  head: () =>
    pageHead({
      title: "Privacy policy | Kabsi",
      description:
        "What Kabsi collects, why, who processes it, how long it's kept, how Google data is used, and how to delete it.",
      path: "/privacy",
      crumbs: [{ name: "Privacy policy", path: "/privacy" }],
    }),
  component: Page,
});

const UPDATED = "21 October 2026";

// K-113.6, word for word. Set as raw HTML so the apostrophe stays a plain ' in the page source.
const LIMITED_USE =
  "Kabsi's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.";

function Page() {
  return (
    <LegalPage kind="privacy" title="Privacy" updated={UPDATED}>
      <section>
        <p>
          This policy explains what Kabsi collects, why, who helps us process it, how long we keep
          it and what you can ask us to do. It covers the website, the Kabsi app, emails from Kabsi,
          the free review link tool, and Kabsi review links, QR codes and cards.
        </p>
      </section>

      <section>
        <h2>Who is responsible</h2>
        <p>
          {OPERATOR_LINE}. The operator is also the data controller for the personal data described
          here.
        </p>
      </section>

      <section>
        <h2>1. Who we are</h2>
        <p>
          Kabsi is run by {LEGAL_SELLER}, who is responsible for the personal data described here.
          Contact: {CONTACT_EMAIL}, or WhatsApp on {WHATSAPP_NUMBER}.
        </p>
        <p>
          Kabsi is independent. It is not affiliated with, endorsed by or sponsored by Google, and
          Google does not partner with Kabsi. Google and Google Business Profile are trademarks of
          Google LLC.
        </p>
      </section>

      <section>
        <h2>2. What we collect</h2>
        <p>
          <b>If you chat with Nora</b> (the AI assistant on our pages): your messages, the page you
          asked from, the country your connection comes from, your browser's time zone and language,
          the kind of device and the site that sent you (never your IP address), and any contact
          details you choose to give (name, email, business name, phone, city). We use them to
          answer, to send the Kabsi team a short report of each chat, to follow up and, only if you
          say yes, to send you occasional Kabsi news. Nora is an AI model run by Anthropic on our
          behalf; if she passes your question to a person, we reply from hello@kabsi.co.
        </p>
        <p>
          <b>If you use Kabsi for your business:</b>
        </p>
        <ul>
          <li>
            Your email address (to sign in with a code and to receive Kabsi emails), and any extra
            alert addresses you add.
          </li>
          <li>
            Your business name, address, country, time zone and Google identifiers (Place ID and
            Business Profile location). Kabsi first reads the name and address from Google and keeps
            them for as long as your account exists, because they say which business is yours.
          </li>
          <li>
            The facts you give Kabsi for drafting and for watching your listing: sign-off, tone,
            phone number, hours, what to mention, staff names and answers to customer questions.
            Earlier versions of a fact are kept as a history.
          </li>
          <li>
            Your Google reviews (reviewer's public name, rating, text and dates), the replies we
            draft and the replies you post; posts, photos and special hours you prepare; your
            listing's name, phone, address, hours, website and category, to detect changes.
          </li>
          <li>Your plan and payments: the plan, the amount and the date.</li>
          <li>The date and wording of the authorisation you gave Kabsi.</li>
          <li>A log of the emails we send you (address, subject, time and delivery status).</li>
          <li>
            A record of what you approve and change: who did what and when, from the app or an email
            link, with the country of the connection and the browser, never your IP address and
            never review text.
          </li>
        </ul>
        <p>
          <b>If you tap or scan a Kabsi card or open a Kabsi review link:</b> the card code, the
          time, the country the request came from, whether the phone was Android or iPhone, whether
          it came from the chip or the QR code, and whether it looked like an automated crawler. We
          don't know who you are and we never store your IP address. You're sent to Google's own
          review page, which Google's privacy policy covers.
        </p>
        <p>
          <b>If you use the free review link tool:</b> your search text is sent to Google's Places
          API to find the business. To stop abuse we keep a one-way, salted hash of your IP address
          for one hour, never the address itself. Nothing else is stored.
        </p>
        <p>
          <b>If you use the free Google Profile Check:</b> your search text is sent to Google's
          Places API, and what Google shows publicly about the business you pick (rating, review
          count, opening hours, phone, website, category and whether it has photos) is kept for up
          to 24 hours so a second check does not ask Google again. We keep the same one-way, salted
          hash of your IP address for one day to enforce the limit of 3 checks a day. If you ask for
          the check by email, we keep your address, the Google Place ID of the business, whether you
          ticked "Send me tips on managing my Google profile", those words, the page and the time,
          as proof of your choice. The check uses public information only and never your Business
          Profile.
        </p>
        <p>
          <b>If you write to us through a form:</b> what you enter (for example name, email,
          Instagram handle, country and message).
        </p>
        <p>
          <b>If you write to us on WhatsApp:</b> your phone number and WhatsApp name as WhatsApp
          shows them to us, the messages, photos or files you send, and the time. Kabsi does not
          copy the chat into its own database. See section 14.
        </p>
        <p>
          <b>When you visit the website or app:</b> anonymous usage statistics and error reports
          (see section 7).
        </p>
      </section>

      <section>
        <h2>3. Why we use it</h2>
        <ul>
          <li>
            To provide Kabsi: draft replies and posts, send your emails, watch your listing, publish
            what you approve, and run your plan. We rely on our contract with you.
          </li>
          <li>
            To process reviews written by your customers so you can answer them. This is in your
            legitimate interest and theirs: the reviews are public and replies go on the same public
            page.
          </li>
          <li>
            To keep Kabsi secure, prevent abuse and fix errors. This is our legitimate interest.
          </li>
          <li>To keep payment records, because tax and accounting law requires it.</li>
          <li>To answer messages you send us.</li>
        </ul>
        <p>
          We don't sell or rent personal data, we don't use it for advertising, and we don't send
          marketing emails without asking you first.
        </p>
      </section>

      <section>
        <h2>4. Google data</h2>
        <ul>
          <li>
            You give Kabsi access by inviting the Kabsi business group ({KABSI_GROUP_NAME}, ID{" "}
            {KABSI_GROUP_ID}) as a Manager on your Business Profile. Kabsi uses Google's official
            Business Profile APIs to read your reviews and profile information and to publish only
            what you approve. We also use the Places API for public details such as your category,
            area and public rating. When Kabsi accepts the invitation we email you within 48 hours
            to say what changed and how to remove Kabsi.
          </li>
          <li>
            We use Google data only to provide and improve the Kabsi features you use. We never
            sell, rent or transfer it, never use it for advertising or retargeting, and never use it
            to train AI models. People at Kabsi read it only with your consent, to keep Kabsi
            secure, or when the law requires it. The only others who receive it are the service
            providers in section 6 that help us run Kabsi.
          </li>
          <li>
            <span dangerouslySetInnerHTML={{ __html: LIMITED_USE }} /> Read the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            .
          </li>
          <li>
            Kabsi's access to Google is held on our servers only. It never reaches your browser or
            anyone else's, and Kabsi does not store a Google token of yours. We never ask for your
            Google password or a verification code.
          </li>
          <li>
            To disconnect Kabsi from Google, open <b>Settings</b> in Kabsi and choose{" "}
            <b>Disconnect Kabsi from Google</b>; only the signed-in owner can do it. Kabsi stops at
            once: no new drafts, no review emails and nothing more sent to Google. Approvals still
            waiting are cancelled, open review tasks are closed and email links stop working. Kabsi
            then removes its own Manager access and emails you a confirmation with how to check it
            under People and access. If Google does not let Kabsi remove itself, our team removes it
            within 7 business days of your request and we tell you the date.
          </li>
          <li>
            You can also remove Kabsi yourself, without asking us. On your Business Profile open{" "}
            <b>Menu</b> (or <b>More</b>), then <b>Business Profile settings</b>, then{" "}
            <b>People and access</b>, select <b>{KABSI_GROUP_NAME}</b> and choose{" "}
            <b>Remove person</b>. Kabsi stops reading and posting at once.
          </li>
          <li>
            Disconnecting does not change your ownership of the profile or your reviews on Google.
            Google data Kabsi kept is deleted 30 days after access ends, unless access comes back.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. How drafts are written</h2>
        <ul>
          <li>
            Review text and your business facts are sent to Anthropic's API to draft replies and
            posts, and photos to check they suit Google. Anthropic does not use this data to train
            its models.
          </li>
          <li>
            For posts, Kabsi may also use your category and area, phrases from your reviews and,
            once connected, the search terms Google reports for your profile.
          </li>
          <li>
            A person, you, approves every reply, post, photo and listing change before it's
            published. Kabsi makes no automated decisions that have legal or similarly significant
            effects on anyone.
          </li>
          <li>We never put a reviewer's personal details into a reply.</li>
        </ul>
      </section>

      <section>
        <h2>6. Who helps us (processors)</h2>
        <ul>
          <li>Supabase: database, sign-in and file storage, in Frankfurt, Germany.</li>
          <li>Cloudflare: card and review links (go.kabsi.co) and the bot check on our forms.</li>
          <li>Vercel: hosting the website and app.</li>
          <li>Resend: sending email, through Amazon's EU (Ireland) region.</li>
          <li>
            Anthropic: drafting replies and posts and checking photos. Review text and your business
            facts reach Anthropic only for this.
          </li>
          <li>Google: the Business Profile and Places APIs.</li>
          <li>
            Sentry: error reports, EU region, without IP addresses, review content or Google data.
          </li>
          <li>PostHog: anonymous usage statistics, in the United States.</li>
          <li>Zoho: the mailbox for {CONTACT_EMAIL}, which holds the messages you send us.</li>
          <li>
            Kapso: the messaging service that holds the chat for {WHATSAPP_NUMBER}, where our team
            reads and answers your WhatsApp messages (section 14).
          </li>
          <li>
            Meta: runs WhatsApp, which carries the messages between you and the Kabsi WhatsApp
            number (section 14).
          </li>
        </ul>
        <p>
          Some of these providers are outside the United Arab Emirates and the European Union, for
          example in the United States. They process data only on our instructions and under their
          data protection terms, including standard contractual clauses where the law requires them.
        </p>
      </section>

      <section>
        <h2>7. Cookies and similar storage</h2>
        <ul>
          <li>
            Sign-in: your browser stores your session so you stay logged in. This is essential.
          </li>
          <li>
            Preferences: the app remembers which business you last opened, in your browser only.
          </li>
          <li>
            Your privacy choices: your browser remembers the choice you made in the privacy banner,
            so we don't ask again. We keep a record of each choice (an anonymous id, the country and
            rule applied, the exact wording, the page and the time) as proof. It holds no IP
            address, email or name.
          </li>
          <li>
            Statistics: until you choose, PostHog counts visits without cookies and without any
            identifier. If you say yes, it also stores an anonymous identifier to see which pages
            are used, and may record screens on public pages, never inside the app and never with
            review text, names or email addresses. If you say no, it stops. IP addresses are
            anonymised.
          </li>
          <li>
            Where you came from: your browser keeps the campaign details in the link you arrived by
            (the utm fields), the first page you saw and the site that sent you, and we save them
            with your account when you sign up, so we know which campaigns work. A click id from a
            Meta ad is kept only where your privacy choice allows advertising.
          </li>
          <li>
            Referrals: a Kabsi link with a referral code (via=CODE) sets a first-party cookie,
            kabsi_via, for 60 days. If you follow another referral link, the newest one counts. When
            you sign up we save the code with your account and your business. It is not used for
            ads.
          </li>
          <li>
            Usage events: PostHog receives events such as "reply approved" or "post published" with
            ids, counts and channels only, never review text, names or email addresses. They pass
            through kabsi.co, and events about access, publishing and payment are sent from our
            servers. Nothing is sent for the demo workspace.
          </li>
          <li>
            Advertising: we use no advertising cookies today and don't track you on other sites. If
            we add Meta&apos;s ad measurement later, it loads only where your choice allows it:
            after a yes in the UK, the EU and EEA, the UAE and Saudi Arabia, and with notice and an
            opt-out elsewhere.
          </li>
          <li>
            You can change your choice any time with{" "}
            <button type="button" className="font-bold underline" onClick={openPrivacyChoices}>
              Privacy choices
            </button>
            , also at the foot of every page.
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Agencies and partners</h2>
        <p>
          No agency or partner sees your business in Kabsi unless you invite them to your team in
          Settings, Team. They then see and do only what their role allows. Kabsi has no partner
          workspaces and no partner who can see your reviews, drafts, replies, photos or reports.
        </p>
      </section>

      <section>
        <h2>9. How long we keep it</h2>
        <p>
          One table sets these limits, and a job that runs every day applies it. Google's own
          content is never kept for more than 30 days.
        </p>
        <dl className="my-4 divide-y divide-kb-hairline border-y border-kb-hairline">
          {RETENTION_ROWS.map((row) => (
            <div key={row.dataClass} className="py-3">
              <dt className="font-bold">{row.data}</dt>
              <dd className="mt-1">{row.kept}</dd>
              <dd className="mt-1 text-sm text-kb-stone">Why: {row.why}</dd>
            </div>
          ))}
        </dl>
        <p>Also:</p>
        <ul>
          <li>
            Your business data: while you use Kabsi. If you ask us to delete a business (Settings,
            or by email), everything is deleted 7 days later, and you can cancel before then.
          </li>
          <li>
            Quotes in weekly reports sent before 4 October 2026 are removed after 30 days. Newer
            reports carry no review quotes. Your business category and area, read from Google, are
            refreshed at least every 30 days. Your business name and address are kept while your
            account exists (section 2).
          </li>
          <li>
            Contact details you gave Nora: until you ask us to remove them. News emails stop the
            moment you unsubscribe.
          </li>
          <li>
            WhatsApp chats with the Kabsi number: no automatic deletion date is set today. They stay
            in the Kapso inbox until you ask us to delete them (section 14).
          </li>
          <li>Internal job logs: 90 days.</li>
          <li>
            Email action links: they work once, expire after 72 hours and are removed 30 days after
            that.
          </li>
          <li>
            Payment records: as long as tax and accounting law requires, with the business link
            removed when the business is deleted.
          </li>
          <li>Card and link taps: kept without personal data, for counts.</li>
          <li>
            Free tool abuse limits: 1 hour. The free Profile Check keeps its daily limit for 1 day.
          </li>
          <li>
            Google's public details for a business you checked: 24 hours. Your email request for the
            check, with your choice about tips: until you ask us to remove it.
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Your rights</h2>
        <p>
          You can ask to see the personal data we hold about you, correct it, delete it, receive a
          copy in a common format, or object to how we use it. You can do most of this in the app.
          For anything else, email {CONTACT_EMAIL} from the address on your account and we reply
          within 30 days. If you think we got something wrong, you can also complain to the data
          protection authority where you live.
        </p>
        <p>
          If you left a review for a business that uses Kabsi and have a question about it, contact
          us and we'll help, together with that business.
        </p>
      </section>

      <section>
        <h2>11. Deleting your data</h2>
        <p>
          In Settings, choose <b>Delete this business</b> (you have 7 days to change your mind), or
          email {CONTACT_EMAIL} from your account email. We delete the business's reviews, drafts,
          posts, photos, reports and settings, and confirm by email. To stop Kabsi reaching your
          Google profile, disconnect Kabsi as described in section 4. To delete your login as well,
          say so in your email.
        </p>
      </section>

      <section>
        <h2>12. Security</h2>
        <p>
          Data is encrypted in transit. Each business's data is separated at the database level so
          only its members, and Kabsi staff when helping you, can read it. Email action links work
          once, expire after 72 hours, belong to the person they were sent to and are stored only as
          a hash. Profile changes and reviews that need care also need that person signed in. More
          detail is on the <Link to="/security">security page</Link>. Access to Google and to our
          providers is held on our servers and limited to what Kabsi needs.
        </p>
      </section>

      <section>
        <h2>13. Children</h2>
        <p>Kabsi is for businesses and is not meant for anyone under 18.</p>
      </section>

      <section>
        <h2>14. WhatsApp</h2>
        <p>
          <b>How it works today.</b> The Kabsi WhatsApp number, {WHATSAPP_NUMBER}, is for questions,
          sales and support. You start the chat. A person at Kabsi reads it and answers, and it is
          not an automatic bot. Nothing is approved, published or changed over WhatsApp: you approve
          only on kabsi.co. We never ask for your Google password or a code Google sends you, on
          WhatsApp or anywhere else.
        </p>
        <p>
          <b>What is sent.</b> The links on our site open WhatsApp with a short fixed message and
          nothing about you. Once you send a message, we receive your phone number and WhatsApp name
          as WhatsApp shows them, what you write, any photo or file you attach, and the time. Please
          do not send review text, passwords or codes. Kabsi puts no Google data and no review text
          into WhatsApp, and the assistant (Nora) does not read your WhatsApp messages.
        </p>
        <p>
          <b>Who handles it.</b> Kapso provides the inbox where our team reads and replies. Meta
          runs WhatsApp and carries the messages. Both process the messages to deliver them, and
          Kapso also holds the chat for us. We use the chat only to answer you, and we do not use it
          for advertising, sell it, or use it to train AI models. Your use of WhatsApp is also
          covered by WhatsApp's own terms and privacy policy.
        </p>
        <p>
          <b>How long it is kept.</b> No automatic deletion date is set for WhatsApp chats today.
          They stay in the Kapso inbox until you ask us to delete them: email {CONTACT_EMAIL} from
          the address on your account, or say so in the chat, and we delete the chat on our side and
          tell you when it is done. Kapso and Meta may keep messages under their own terms, and the
          chat stays on your own phone until you delete it there.
        </p>
        <p>
          <b>Not available yet: alerts and the assistant on WhatsApp.</b> Kabsi sends no alerts on
          WhatsApp and Nora is not on WhatsApp. If we add them, the rules will be these. We send an
          alert only after you opt in, and we record the time, your phone number and the wording you
          saw. We use only message templates that Meta has approved, and each carries one button
          that opens kabsi.co, where you approve. A message names your business and says what is
          waiting, and may show a star rating, but never carries review text, a reviewer's name or
          your business facts. Reply STOP at any time (or a similar word such as UNSUBSCRIBE) and we
          stop at once and record it. We will update this page and email account holders before any
          of this is switched on.
        </p>
      </section>

      <section>
        <h2>15. Changes</h2>
        <p>
          If we change this policy in a way that matters, we email account holders before the change
          applies. The date at the top shows the latest version.
        </p>
      </section>
    </LegalPage>
  );
}
