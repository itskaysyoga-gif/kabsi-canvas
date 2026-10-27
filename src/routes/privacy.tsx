import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "@/components/marketing/legal";
import { RETENTION_ROWS } from "@/lib/retention";
import { openPrivacyChoices } from "@/lib/consent";
import {
  CONTACT_EMAIL,
  KABSI_GROUP_ID,
  KABSI_GROUP_NAME,
  OPERATOR_NAME,
  OPERATOR_LINE,
  WHATSAPP_NUMBER,
  WHATSAPP_ON,
  pageHead,
} from "@/lib/site";

// Privacy policy, written to match the system as built (P0.2-07). Every retention period, processor and
// control named here exists today; nothing is announced ahead of time. The retention table comes from
// src/lib/retention.ts, which tests/retention-page.test.ts holds equal to `retention_policies`. No em dashes.
export const Route = createFileRoute("/privacy")({
  head: () =>
    pageHead({
      image: "about",
      title: "Privacy policy | Kabsi",
      description:
        "What Kabsi collects, why, who processes it, how long it's kept, how Google data is used, and how to delete it.",
      path: "/privacy",
      crumbs: [{ name: "Privacy policy", path: "/privacy" }],
    }),
  component: Page,
});

const UPDATED = "24 October 2026";

// K-113.6, word for word. Set as raw HTML so the apostrophe stays a plain ' in the page source.
const LIMITED_USE =
  "Kabsi's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.";

function Page() {
  return (
    <LegalPage
      title="Privacy"
      updated={UPDATED}
      summary={[
        "Kabsi collects your email, your WhatsApp number and the details of your business.",
        "Your public Google profile is shown live in the free tools. Kabsi does not store it.",
        "Ask a question or ask to see your data: hello@kabsi.co.",
      ]}
    >
      <section>
        <p>
          This policy explains what Kabsi collects, why, who helps us process it, how long we keep
          it and what you can ask us to do. It covers the website, the Kabsi app, emails from Kabsi,
          the free review link tool, Kabsi review links, QR codes and cards, WhatsApp messages with
          Kabsi, and the Kabsi Partners program.
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
          Kabsi is operated by {OPERATOR_NAME}, who is responsible for the personal data described
          here. Contact: {CONTACT_EMAIL}
          {WHATSAPP_ON ? `, or WhatsApp on ${WHATSAPP_NUMBER}` : ""}.
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
            The facts you give Kabsi for drafting and for watching your Google profile: sign-off,
            tone, phone number, hours, what to mention, staff names and answers to customer
            questions. Earlier versions of a fact are kept as a history.
          </li>
          <li>
            Your Google reviews (reviewer's public name, rating, text and dates), the replies we
            draft and the replies you post; posts, photos and special hours you prepare; your Google
            profile's name, phone, address, hours, website and category, to detect changes.
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
          count, opening hours, phone, website, category and whether it has photos) is shown to you
          and not kept; only the business's Google Place ID is kept. We keep the same one-way,
          salted hash of your IP address for one day to enforce the limit of 3 checks a day. If you
          ask for the check by email, we keep your address, the Google Place ID of the business,
          whether you ticked "Send me tips on managing my Google profile", those words, the page and
          the time, as proof of your choice.{" "}
          {WHATSAPP_ON
            ? "If you ask for the check on WhatsApp, we use your number once to send one message and keep only a one-way hash of it, the Google Place ID, the words next to the tick, the page, the time and whether the message was sent, as proof of your choice. We do not message you again unless you ask. "
            : ""}
          The check uses public information only and never your Business Profile.
        </p>
        <p>
          <b>From launch, if Kabsi checks where your business shows:</b> your business name,
          category, address and the keywords you confirm are sent to DataForSEO, which looks up
          Google Maps results around your business and what ChatGPT and Perplexity answer. Geoapify
          receives map points (coordinates) to draw the map image. We keep the results: your rank at
          each point on the map, the AI answers (shown as samples, because they change from run to
          run) and the public details of the competitors you pick: name, rating, number of reviews,
          category and new reviews a month. No review text and no personal details of your customers
          are sent for this. These results are kept apart from the numbers Google gives us about
          your own profile.
        </p>
        <p>
          <b>From launch, if you apply to Kabsi Partners:</b> your name and email, country and city,
          what you do, where you will share Kabsi and roughly how many local owners that reaches,
          one line on how you will recommend it, your advertiser permit number if you give one, your
          WhatsApp number, and the time you accepted the partner terms. When you choose how to be
          paid, your payout details are kept encrypted in our database vault and shown only as the
          last 4 characters. We also keep the visits, scans, trials and payments that came through
          your partner link or code, so we can pay you correctly.
        </p>
        <p>
          <b>If you write to us through a form:</b> what you enter (for example name, email,
          Instagram handle, country and message).
        </p>
        {WHATSAPP_ON ? (
          <p>
            <b>If you write to us on WhatsApp:</b> your phone number and WhatsApp name as WhatsApp
            shows them to us, the messages, photos or files you send, and the time. Kabsi does not
            copy the chat into its own database. See section 14.
          </p>
        ) : null}
        <p>
          <b>When you visit the website or app:</b> anonymous usage statistics and error reports
          (see section 7).
        </p>
      </section>

      <section>
        <h2>3. Why we use it</h2>
        <ul>
          <li>
            To provide Kabsi: draft replies and posts, send your emails, watch your Google profile,
            publish what you approve, and run your plan. We rely on our contract with you.
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
            posts. Anthropic does not use this data to train its models. Photos are checked by
            Kabsi's own code and are not sent to an AI model.
          </li>
          <li>
            From launch, to see what AI assistants say about your business, Kabsi sends questions in
            your customers' words that name your category and area (for example "best dentist in
            Jumeirah") to DataForSEO, which asks ChatGPT and Perplexity for them. The answers change
            from run to run, so Kabsi shows them as a sample and never as a promise.
          </li>
          <li>
            For posts, Kabsi may also use your category and area, phrases from your reviews and,
            once connected, the search terms Google reports for your profile.
          </li>
          <li>
            A person, you, approves every reply, post, photo and Google profile change before it's
            published. Kabsi makes no automated decisions that have legal or similarly significant
            effects on anyone.
          </li>
          <li>We never put a reviewer's personal details into a reply.</li>
        </ul>
      </section>

      <section>
        <h2>6. Who helps us (processors)</h2>
        <p>
          "From launch" marks a company that starts handling data when the feature that uses it is
          switched on. We list it now so this page is complete before that day.
        </p>
        <ul>
          <li>Supabase: database, sign-in and file storage, in Frankfurt, Germany.</li>
          <li>
            Cloudflare: card and review links (go.kabsi.co), the bot check on our forms, and R2,
            where our encrypted backups are kept.
          </li>
          <li>
            GitHub: keeps our code and runs the weekly backup. The backup is encrypted before it
            leaves that job, with a passphrase only Kabsi holds.
          </li>
          <li>
            Vercel: hosting the website and app, and Speed Insights, which measures how fast pages
            load for visitors without cookies or any identifier.
          </li>
          <li>
            Creem: card payments. Creem is our merchant of record and receives what it needs to take
            a payment.
          </li>
          <li>Resend: sending email, through Amazon's EU (Ireland) region.</li>
          <li>
            Anthropic: drafting replies and posts. Review text and your business facts reach
            Anthropic only for this.
          </li>
          <li>Google: the Business Profile and Places APIs.</li>
          <li>
            From launch, DataForSEO: Google Maps results and AI answers for the keywords you confirm
            (sections 2 and 5).
          </li>
          <li>From launch, Geoapify: the map pictures, from map points only.</li>
          <li>
            From launch, Meta, for the Meta Pixel and the Conversions API: measuring which of our
            ads bring owners (section 7).
          </li>
          <li>
            PayPal: only if you are a Kabsi Partner and choose it to be paid. Partners paid in USDT
            or USDC are paid from Kabsi's own wallet and no company receives your data.
          </li>
          <li>
            Sentry: error reports, EU region, without IP addresses, review content or Google data.
          </li>
          <li>PostHog: anonymous usage statistics, in the United States.</li>
          <li>Zoho: the mailbox for {CONTACT_EMAIL}, which holds the messages you send us.</li>
          {WHATSAPP_ON ? (
            <>
              <li>
                Kapso: the messaging service that holds the chat for {WHATSAPP_NUMBER}, where our
                team reads and answers your WhatsApp messages (section 14).
              </li>
              <li>
                From launch, a speech to text provider (ElevenLabs or OpenAI; this page names the
                one in use) that turns a WhatsApp voice note into text (section 14).
              </li>
              <li>
                Meta: runs WhatsApp, which carries the messages between you and the Kabsi WhatsApp
                number (section 14).
              </li>
            </>
          ) : null}
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
            Your privacy choices: your browser remembers the choice you made, for 12 months, so we
            don't ask again. We keep a record of each choice (an anonymous id, the country and rule
            applied, the exact wording, the page and the time) as proof. It holds no IP address,
            email or name.
          </li>
          <li>
            Statistics: PostHog counts visits without cookies and without any identifier until you
            say yes. If you say yes, it also stores an anonymous identifier to see which pages are
            used, and may record screens on public pages, never inside the app and never with review
            text, names, email addresses or phone numbers. If you say no, it stops. IP addresses are
            anonymised.
          </li>
          <li>
            Where you came from: for the length of your visit, your browser keeps the campaign
            details in the link you arrived by (the utm fields), the first page you saw, the site
            that sent you and an ad click id (gclid or fbclid), with no cookie, and we save them
            with your account when you sign up, so we know which campaigns work. A Meta click id is
            kept only where your privacy choice allows advertising. If you came from a Click to
            WhatsApp ad, the click id of that chat is kept with the conversation.
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
            Advertising: we use no advertising cookies today and don't track you on other sites.
            From launch, the Meta Pixel runs on our public pages only, never inside the app, the
            sign-up screens, the staff pages or the links in our emails. It sees page views and a
            few steps: the pricing page, a finished free check, a sign-up, a trial and a plan
            bought. For a trial or a plan, Kabsi also tells Meta from its own servers (the
            Conversions API), with your email and phone number scrambled by a one-way hash as Meta
            requires. If you came from a Click to WhatsApp ad, Kabsi sends Meta the click id of that
            chat, so the ads learn which ones bring paying owners. In the EU, the UK, Switzerland,
            the United Arab Emirates and Saudi Arabia a small bar at the bottom asks once, Accept or
            Only necessary, and nothing for ads loads before you accept. Elsewhere there is no
            pop-up, and Your privacy choices has one switch, "Let Kabsi measure its ads", on or off.
            Your answer is remembered for 12 months. Kabsi does not sell your data to Meta or anyone
            else.
          </li>
          <li>
            You can change your choice any time with{" "}
            <button type="button" className="font-bold underline" onClick={openPrivacyChoices}>
              Your privacy choices
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
        <p>
          Kabsi Partners are different: they recommend Kabsi and are paid a share of what the
          businesses they bring pay. A partner sees the trade and area of a business that joined
          through their link, and counts of visits, scans, trials and payments, never its name, its
          reviews or its data. The one exception is a business that says yes, once, to "Can we tell
          Sara you joined?". A cancelled trial shows to the partner only as a count. The rules
          partners agree to are on the <Link to="/partners/terms">partner terms</Link>.
        </p>
      </section>

      <section>
        <h2>9. How long we keep it</h2>
        <p>
          One table sets these limits, and a job that runs every day applies it. Google's own
          content is never kept for more than 30 days.
        </p>
        <dl className="my-4 divide-y divide-line border-y border-line">
          {RETENTION_ROWS.map((row) => (
            <div key={row.dataClass} className="py-3">
              <dt className="font-bold">{row.data}</dt>
              <dd className="mt-1">{row.kept}</dd>
              <dd className="mt-1 text-sm text-text-2">Why: {row.why}</dd>
            </div>
          ))}
        </dl>
        <p>Also:</p>
        <ul>
          <li>
            The free check&apos;s waiting list (&quot;Save my place&quot;, while the free check is
            closed): the email or WhatsApp number you leave, the business name, its country and
            Google place id, the search, the words you agreed to and whether you asked for tips. We
            use it only to tell you once that the free check is open, and to send tips by email if
            you ticked that box. It is deleted after 365 days.
          </li>
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
          {WHATSAPP_ON ? (
            <li>
              WhatsApp chats with the Kabsi number: no automatic deletion date is set today. They
              stay in the Kapso inbox until you ask us to delete them (section 14).
            </li>
          ) : null}
          <li>
            Visibility and AI answer results, and the competitors you pick (from launch): while you
            use Kabsi, and deleted with the business.
          </li>
          <li>
            WhatsApp voice notes (from launch): the audio is deleted as soon as it has been turned
            into text. We keep only the text, like any other message. Notes over 10 MB or 3 minutes
            are refused and never stored.
          </li>
          <li>
            Backups: encrypted copies of the database, the photos and our code are kept for 21 days
            in Cloudflare R2, then deleted. Supabase also keeps its own short-lived backups. A
            business you delete stays in older backups until they expire, at most 21 days, and is
            never restored into the live service afterwards.
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
            Google's public details for a business you checked: not kept, read from Google each
            time. Your email request for the check, with your choice about tips: until you ask us to
            remove it.
            {WHATSAPP_ON
              ? " Your WhatsApp request for the check, without your number: the same."
              : ""}
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Your rights</h2>
        <p>
          You can ask to see the personal data we hold about you, correct it, delete it, receive a
          copy in a common format, or object to how we use it. You can do most of this in the app.
          For anything else, email {CONTACT_EMAIL} from the address on your account and we reply
          within 30 days. To get a copy of your data, ask by email: we send you a file you can open
          in a spreadsheet or a browser within 30 days, covering your business, your reviews and
          replies, your posts, your settings and your messages with us. If you think we got
          something wrong, you can also complain to the data protection authority where you live.
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
          posts, photos, reports and settings, and confirm by email. Older backups hold a copy until
          they expire, at most 21 days later (section 9). To stop Kabsi reaching your Google
          profile, disconnect Kabsi as described in section 4. To delete your login as well, say so
          in your email.
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
        {WHATSAPP_ON ? (
          <>
            <p>
              <b>How it works.</b> The Kabsi WhatsApp number, {WHATSAPP_NUMBER}, is for questions,
              sales and support, answered by a person and not an automatic bot. If you connect it in
              Settings, it also brings you review alerts. We never ask for your Google password or a
              code Google sends you, on WhatsApp or anywhere else.
            </p>
            <p>
              <b>Alerts and approvals, only if you opt in.</b> You opt in by sending a one-time code
              from your phone after pressing Connect WhatsApp; we record the time, your phone number
              and the wording you saw. An alert carries your business name, the star rating, the
              reviewer&apos;s first name, the review text up to 300 characters and the draft reply.
              You can approve low and medium risk replies and posts there, with 10 seconds to undo.
              High-risk reviews and changes to your business name, address, categories, map pin,
              phone or opening status are approved only on kabsi.co. Outside 24 hours from your last
              message we send only message templates Meta has approved. Reply STOP at any time (or a
              similar word such as UNSUBSCRIBE) and we stop at once and record it.
            </p>
            <p>
              <b>What is sent.</b> The links on our site open WhatsApp with a short fixed message
              and nothing about you. Once you send a message, we receive your phone number and
              WhatsApp name as WhatsApp shows them, what you write, any photo or file you attach,
              and the time. A photo you send after connecting goes into Photos in Kabsi for you to
              approve. Please do not send passwords or codes. Kabsi puts no Google data into
              WhatsApp beyond your own alerts, and the assistant (Nora) does not read your WhatsApp
              messages; Nora on WhatsApp is not available yet.
            </p>
            <p>
              <b>Voice notes.</b> You can send Kabsi a voice note instead of typing. From launch,
              the audio goes to a speech to text provider (section 6) only to be turned into text.
              We delete the audio as soon as the text is ready and keep only the text, which Kabsi
              then treats like any message you typed. Please keep a voice note under 3 minutes and
              10 MB; longer ones are refused. Kabsi never uses a voice note to train AI models or to
              copy your voice.
            </p>
            <p>
              <b>Who handles it.</b> Kapso provides the messaging service and the inbox where our
              team reads and replies. Meta runs WhatsApp and carries the messages. Both process the
              messages to deliver them, and Kapso also holds the chat for us. Kabsi keeps a record
              of each message&apos;s type and delivery, not its words. We use the chat only for you,
              and we do not use it for advertising, sell it, or use it to train AI models. Your use
              of WhatsApp is also covered by WhatsApp&apos;s own terms and privacy policy.
            </p>
            <p>
              <b>How long it is kept.</b> No automatic deletion date is set for WhatsApp chats
              today. They stay in the Kapso inbox until you ask us to delete them: email{" "}
              {CONTACT_EMAIL} from the address on your account, or say so in the chat, and we delete
              the chat on our side and tell you when it is done. Kapso and Meta may keep messages
              under their own terms, and the chat stays on your own phone until you delete it there.
              Review text in an alert is not kept by Kabsi.
            </p>
          </>
        ) : (
          <p>
            Kabsi has no WhatsApp number at the moment. Write to {CONTACT_EMAIL} and a person at
            Kabsi answers. We never ask for your Google password or a code Google sends you, by
            email or anywhere else. If you wrote to Kabsi&apos;s earlier WhatsApp number before 22
            October 2026 and want that chat deleted, email {CONTACT_EMAIL} from the address on your
            account and we tell you when it is done.
          </p>
        )}
        <p>
          When Kabsi has a WhatsApp number, you can also send a voice note. The audio is turned into
          text by a speech to text provider, deleted as soon as the text is ready, and only the text
          is kept.
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
