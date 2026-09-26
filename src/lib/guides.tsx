import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

// Guides (D253): short, practical how-tos for business owners. Every step is checked against Google's own
// help pages (listed as sources at the end of each guide). Facts only (§3): no promises of reviews, ratings
// or rankings. No em dashes.

export type Guide = {
  slug: string;
  title: string;
  description: string;
  updated: string; // ISO date
  minutes: number;
  body: ReactNode;
  sources: { label: string; href: string }[];
};

const G = {
  reply: {
    label: "Google: Read and reply to reviews",
    href: "https://support.google.com/business/answer/3474050?hl=en",
  },
  tips: {
    label: "Google: Tips to get more reviews",
    href: "https://support.google.com/business/answer/3474122?hl=en",
  },
  report: {
    label: "Google: Report inappropriate reviews",
    href: "https://support.google.com/business/answer/4596773?hl=en",
  },
  users: {
    label: "Google: Manage owners and managers",
    href: "https://support.google.com/business/answer/3403100?hl=en",
  },
  link: {
    label: "Google: Create a link or QR code to request reviews",
    href: "https://support.google.com/business/answer/16816815?hl=en",
  },
};

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-6">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  );
}

function Example({
  label,
  review,
  reply,
  dir = "ltr",
}: {
  label: string;
  review: string;
  reply: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <figure className="rounded-large bg-kb-sand p-5">
      <figcaption className="text-xs font-bold uppercase tracking-wider text-kb-stone">
        {label}
      </figcaption>
      <p className="mt-3 text-sm font-bold text-kb-stone">Review</p>
      <p dir={dir} className="text-kb-stone">
        {review}
      </p>
      <p className="mt-3 text-sm font-bold text-kb-stone">Reply</p>
      <p dir={dir} className="text-kb-ink">
        {reply}
      </p>
    </figure>
  );
}

const Tool = () => (
  <Link to="/google-review-link" className="font-bold text-kb-ink underline underline-offset-4">
    free review link and QR tool
  </Link>
);

export const GUIDES: Guide[] = [
  {
    slug: "how-to-reply-to-google-reviews",
    title: "How to reply to Google reviews (with examples)",
    description:
      "The exact steps to reply to a Google review, what a good reply looks like, and short examples in English, Arabic and French.",
    updated: "2026-09-26",
    minutes: 4,
    sources: [G.reply, G.tips],
    body: (
      <>
        <p>
          Replying shows people reading your profile that you listen. Google itself says helpful
          replies show you're responsive to your customers. Here is how to do it, and what to write.
        </p>
        <h2>Steps</h2>
        <Steps
          items={[
            "Open your Business Profile (search your business name on Google while signed in, or go to business.google.com).",
            <>
              Select <b>Read reviews</b>.
            </>,
            <>
              Next to the review, select the <b>Reply</b> icon.
            </>,
            "Write your reply.",
            <>
              Select <b>Reply</b>.
            </>,
          ]}
        />
        <p>
          Google checks every reply against its content policies before it appears. This usually
          takes up to 10 minutes, and sometimes longer. The reply shows under the review with your
          business name, not your personal name, and the customer is notified. You can edit or
          delete it later.
        </p>
        <h2>What a good reply looks like</h2>
        <ul>
          <li>Short: two to four sentences.</li>
          <li>Polite and professional, in the language the customer wrote in.</li>
          <li>Specific: mention one thing they said, so it doesn't read like a template.</li>
          <li>No advertising, no discount codes, no asking them to change the review.</li>
          <li>Signed as the business, the same way every time.</li>
        </ul>
        <h2>Examples</h2>
        <div className="not-prose grid gap-4">
          <Example
            label="5 stars, English"
            review="Lovely spot, great coffee, and they remembered my order."
            reply="Thank you, Nadine! We're glad you enjoyed the coffee, and the team will be happy to hear it. See you again soon. Rami, Café Hamra"
          />
          <Example
            label="4 stars, Arabic"
            dir="rtl"
            review="الأكل كتير طيب بس الخدمة كانت بطيئة شوي."
            reply="شكراً كتير على تقييمك! مبسوطين إنو عجبك الأكل، ومنعتذر عن التأخير بالخدمة. منتمنى نشوفك قريباً."
          />
          <Example
            label="2 stars, French"
            review="Commande arrivée froide et en retard."
            reply="Merci pour votre retour. Nous sommes désolés que votre commande soit arrivée froide et en retard. Appelez-nous au 01 234 567 pour qu'on en parle directement."
          />
        </div>
        <h2>How fast should you reply?</h2>
        <p>
          Google's advice for negative reviews is to respond in a timely manner. In practice,
          replying within a day or two is easy to keep up if new reviews reach you by email with a
          reply ready. That's what <Link to="/">Kabsi</Link> does: every new review arrives with a
          draft in the reviewer's language, and nothing is posted until you tap Post.
        </p>
      </>
    ),
  },
  {
    slug: "how-to-respond-to-negative-google-reviews",
    title: "How to respond to a negative Google review",
    description:
      "A calm, five-step way to answer a bad Google review, what never to write, and example replies you can adapt.",
    updated: "2026-09-26",
    minutes: 4,
    sources: [G.tips, G.reply, G.report],
    body: (
      <>
        <p>
          A bad review stings, and the first reply you want to write is rarely the one to post.
          People reading your profile look at how you answer as much as at the complaint itself.
        </p>
        <h2>Five steps</h2>
        <Steps
          items={[
            "Wait until you're calm. A reply can be edited later, but screenshots last.",
            "Thank them for telling you, even if you disagree.",
            "Acknowledge the specific problem in one sentence, without arguing about the details in public.",
            "Offer a direct way to talk: a phone number or email.",
            "Keep it short and sign it as the business.",
          ]}
        />
        <h2>Never write</h2>
        <ul>
          <li>Arguments about who is right, or the customer's personal details.</li>
          <li>
            Offers of discounts or refunds in exchange for changing or removing the review. Google
            treats that as fake engagement.
          </li>
          <li>
            Accusations that the reviewer is lying. If a review breaks Google's rules, report it
            instead (see below).
          </li>
        </ul>
        <h2>Examples</h2>
        <div className="not-prose grid gap-4">
          <Example
            label="Slow service"
            review="Waited 40 minutes for two sandwiches. Never again."
            reply="Thank you for telling us, and we're sorry about the wait. That's not the service we want to give. Please call us on 01 234 567 so we can hear what happened. Rami, Café Hamra"
          />
          <Example
            label="Complaint you can't identify"
            review="Rude staff and dirty tables."
            reply="We're sorry to read this, and we take it seriously. We'd like to understand what happened. Please email us at hello@cafehamra.com with the day of your visit. Rami, Café Hamra"
          />
        </div>
        <h2>When a review breaks the rules</h2>
        <p>
          Google removes reviews that break its content policies (for example spam, profanity or
          fake engagement), not reviews that are simply negative. See{" "}
          <Link to="/guides/$slug" params={{ slug: "can-you-remove-a-google-review" }}>
            can you remove a Google review?
          </Link>{" "}
          for the exact steps.
        </p>
        <p>
          Kabsi flags hard reviews (1 or 2 stars, or anything about health, safety, staff or legal
          matters) and prepares a calm draft with no quick Post button, so you read it first.
        </p>
      </>
    ),
  },
  {
    slug: "can-you-remove-a-google-review",
    title: "Can you remove a Google review?",
    description:
      "What Google removes and what it doesn't, how to report a review that breaks the rules, and how to appeal.",
    updated: "2026-09-26",
    minutes: 3,
    sources: [G.report],
    body: (
      <>
        <p>
          Short answer: you can't remove a genuine review, even a negative one. You can report a
          review that breaks Google's content policies, and Google decides. Google's own help says
          not to report a review just because you disagree with it or dislike it.
        </p>
        <h2>Report a review from your profile</h2>
        <Steps
          items={[
            "Open your Business Profile.",
            <>
              Select <b>Read reviews</b>.
            </>,
            <>
              Next to the review, select the <b>Report</b> icon.
            </>,
            "Choose the reason, for example spam or profanity.",
            <>
              Select <b>Send report</b>.
            </>,
          ]}
        />
        <h2>Or use the Reviews Management Tool</h2>
        <Steps
          items={[
            "Open Google's Reviews Management Tool (linked from the help page below) and sign in with the account that manages the profile.",
            <>
              Choose your business and select <b>Continue</b>.
            </>,
            <>
              Select <b>Report a new review for removal</b>, choose the reason, and <b>Submit</b>.
            </>,
          ]}
        />
        <p>
          A decision usually takes several days. The tool shows the status: <b>Decision pending</b>,{" "}
          <b>Report reviewed - no policy violation</b>, or{" "}
          <b>Escalated - check your email for updates</b>. If the review stays up, you can appeal
          once from the same tool.
        </p>
        <h2>While you wait</h2>
        <p>
          Reply calmly. A polite, factual reply often helps readers more than the review hurts.
          Here's{" "}
          <Link to="/guides/$slug" params={{ slug: "how-to-respond-to-negative-google-reviews" }}>
            how to respond to a negative review
          </Link>
          .
        </p>
        <p>
          Anyone offering to remove reviews for a fee can't do anything you can't. Nobody outside
          Google can remove a review.
        </p>
      </>
    ),
  },
  {
    slug: "add-manager-google-business-profile",
    title: "How to add a manager to your Google Business Profile",
    description:
      "Give a staff member or a service access to your Google Business Profile without sharing your password, and remove it any time.",
    updated: "2026-09-26",
    minutes: 3,
    sources: [G.users],
    body: (
      <>
        <p>
          Never share your Google password. Add people as managers instead: they get their own
          access, and you can remove it with one click.
        </p>
        <h2>Steps (computer)</h2>
        <Steps
          items={[
            "Open your Business Profile.",
            <>
              Select <b>More</b>, then <b>Business Profile settings</b>, then{" "}
              <b>People and access</b>.
            </>,
            <>
              At the top left, select <b>Add</b>.
            </>,
            "Enter their email address.",
            <>
              Under Access, choose <b>Manager</b>.
            </>,
            <>
              Select <b>Invite</b>.
            </>,
          ]}
        />
        <p>
          They get an email and accept the invitation. After that, the profile appears in their
          account.
        </p>
        <h2>Owner or manager?</h2>
        <p>
          Managers have mostly the same access as owners: they can edit business information, reply
          to reviews, add posts and photos. They can't add or remove users, and they can't remove
          the profile. Give owner access only to people who should control the profile itself.
        </p>
        <p>
          New owners and managers wait 7 days before they can use some features, such as removing
          other users.
        </p>
        <h2>Remove someone</h2>
        <Steps
          items={[
            <>
              Open <b>Business Profile settings</b>, then <b>People and access</b>.
            </>,
            <>
              Select the person, then <b>Remove person</b>.
            </>,
          ]}
        />
        <p>Only owners can remove users.</p>
        <p>
          Using Kabsi? You add <b>hello@kabsi.co</b> as a Manager in exactly this way. You can
          remove it the same way any time, without asking us.
        </p>
      </>
    ),
  },
  {
    slug: "google-review-link-and-qr-code",
    title: "How to get your Google review link and QR code",
    description:
      "Two ways to get the link that opens your Google review form, a QR code to print, and where to use them without breaking Google's rules.",
    updated: "2026-09-26",
    minutes: 3,
    sources: [G.link, G.tips],
    body: (
      <>
        <p>
          The easiest way to get more reviews is to make leaving one easy: a link people can tap, or
          a QR code they can scan.
        </p>
        <h2>Option 1: from your Business Profile</h2>
        <Steps
          items={[
            "Go to business.google.com and open your profile.",
            <>
              Select <b>Read reviews</b>, then <b>Get more reviews</b>.
            </>,
            <>
              Select <b>Copy</b> to copy the link. On a computer you can also save the QR code
              image.
            </>,
          ]}
        />
        <p>Google notes that the QR code is only available on a computer browser.</p>
        <h2>Option 2: without signing in</h2>
        <p>
          Use our <Tool />: search your business, copy the link, and download the QR code as an
          image or a printable counter card. It works from any phone.
        </p>
        <h2>Where to put it</h2>
        <ul>
          <li>A small card on the counter or tables, with the QR code.</li>
          <li>Your WhatsApp thank-you message and Instagram bio.</li>
          <li>The bottom of receipts and menus.</li>
        </ul>
        <h2>The rules</h2>
        <p>
          Ask everyone the same way. Google prohibits offering incentives, like free or discounted
          goods or services, in exchange for reviews, and asking only customers you expect to be
          happy isn't allowed either. An honest mix of reviews is also more convincing to readers.
        </p>
      </>
    ),
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
