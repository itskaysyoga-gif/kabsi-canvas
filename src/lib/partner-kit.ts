// Partners 3 (master plan 30.50 items 5 to 7; docs/COPY.md section 83): the kit in the partner home. Three ready posts for
// each kind of partner, each starting with the paid partnership label, and the lists of what a partner can and cannot say.
// Every claim comes from the allowed list (K-53, K-144, the approved lines of master plan 30.15): no rankings, no review
// counts, no statistic, no Google partnership. A partner may edit a post; the label stays. Plain words, no dashes.
import type { PartnerKind } from "@/lib/partner";

/** The first line of every post. Said in plain words so it works on every platform, beside the platform's own label. */
export const PAID_LABEL = "Paid partnership with Kabsi.";

/** The partner's own words for the label, said once above the posts. */
export const LABEL_NOTE =
  "Every post starts with the paid partnership label. Where the app has its own paid partnership switch, turn it on too.";

type Three = readonly [string, string, string];

/** Three ready posts for each kind (the kinds are the six of Partners 2). The partner's link goes under each one. */
export const KIT_POSTS: Record<PartnerKind, Three> = {
  card_seller: [
    "Your review card makes it easy for customers to leave a genuine review. Kabsi answers what comes in: it reads every new Google review and prepares a reply, and nothing goes on Google until you say yes. Every card I sell comes with 30 days of Kabsi free, no card needed.",
    "A review card is half of the job. The other half is the reply. Kabsi has a reply ready for every new review, so you only read it and say yes. Try it free for 30 days with my link.",
    "The card gets the reviews. Kabsi answers them. Set up in a few steps, no passwords, and 30 days free with my link.",
  ],
  agency: [
    "A client's Google profile needs the same small jobs every week: replies, hours, details, posts. Kabsi prepares them, and the owner approves each one. Try it free for 30 days with my link.",
    "Clients ask what happened on their Google profile this month. Kabsi shows the owner the work it did, every Monday, in a weekly report.",
    "Keep your clients' Google information accurate. Kabsi watches the profile, tells the owner when something important changes, and puts nothing on Google without a yes. 30 days free with my link.",
  ],
  creator: [
    "Most small business owners have no time to reply to every Google review. Kabsi prepares the reply, the owner reads it and says yes. Nothing goes on Google without that yes. 30 days free with my link.",
    "What Kabsi does for a local business each week: a reply ready for every new review, hours and details kept right, a post prepared, and a report every Monday. 30 days free with my link.",
    "A question for business owners: when did you last reply to a Google review? Kabsi prepares the reply and you approve it. Try it free for 30 days, no card.",
  ],
  accountant: [
    "A tip for my clients: your Google profile is part of how customers find you. Kabsi keeps your hours and details right and has a reply ready for every new review, with your yes each time. 30 days free with my link.",
    "One less thing on a busy owner's list: Kabsi takes care of the Google routine. It prepares, you approve. Try it free for 30 days, no card needed.",
    "If you ask me what to do about reviews: reply to every one. Kabsi prepares each reply and you say yes before it goes on Google. 30 days free with my link.",
  ],
  reseller: [
    "Your system takes the bookings and the payments. Kabsi looks after the other side: a reply ready for every new Google review, and your profile details kept right. 30 days free with my link.",
    "Your opening hours should match everywhere. Kabsi checks your Google profile and tells you when something important changes. Nothing changes without your yes. Try it free for 30 days.",
    "New in our welcome pack: Kabsi, which prepares a reply for every new Google review. 30 days free, no card, with my link.",
  ],
  customer: [
    "I use Kabsi for my Google profile. A reply is ready for every new review and nothing goes on Google until I say yes. If you want to try it, here is my link: 30 days free.",
    "Every Monday Kabsi shows me the work it did on my Google profile, and it saves me time. Try it free for 30 days with my link.",
    "Know a business owner who never has time for reviews? Kabsi prepares the replies and they approve each one. 30 days free with my link.",
  ],
};

/** The text a partner copies: the label, the post, the partner's own link. */
export const postText = (body: string, link: string) => `${PAID_LABEL}\n\n${body}\n\n${link}`;

/** What a partner can say: the allowed claims (K-53) and the approved lines, in the words Kabsi uses. */
export const CAN_SAY = [
  "Kabsi prepares a reply for every new review, and nothing goes live without the owner's yes.",
  "Respond to reviews faster.",
  "Keep your Google information accurate.",
  "Know when important Google information changes.",
  "Keep your profile fresh.",
  "Save time on your Google presence.",
  "Make it easy for customers to leave genuine reviews.",
  "30 days free, no card.",
] as const;

/** The do-not-say list (29.5, K-53, K-112, K-128, K-144). Every line starts with Never. */
export const DO_NOT_SAY = [
  "Never say Kabsi works with Google, is a Google partner, or is approved by Google.",
  "Never say Kabsi gets a business ranked higher or into the top results on a map.",
  "Never promise more reviews, a higher star rating, more calls or more customers.",
  "Never quote a review count, a rating or a statistic as a result of using Kabsi.",
  "Never promise that a review will be removed.",
  "Never ask only happy customers for a review, and never offer a reward or a discount for one.",
  "Never say Kabsi changes a Google profile by itself. Nothing goes live without the owner's yes.",
  "Never say Kabsi prevents a suspension.",
  "Never use Google's name or logo in a name, a handle or a picture for Kabsi.",
  "Never offer a discount code or cash. The 30 days free is the whole offer.",
  "Never send bulk or unsolicited messages.",
  "Never say how much a partner earns, and never promise a payout date.",
] as const;

/** Kept in the kit so the partner sees it beside the posts (K-112). */
export const KIT_NOTICE = "Kabsi is independent and not affiliated with Google.";

export const KIT = {
  title: "Your kit",
  lead: "Ready posts, a printable insert for card packaging, and what to say and not say. Everything in it uses claims Kabsi allows.",
  postsTitle: "Ready posts",
  kindLabel: "Posts for",
  copy: "Copy post",
  copied: "Post copied",
  insertTitle: "Insert for card packaging",
  insertLine:
    "An A6 sheet, 105 by 148 mm, with your QR code and 30 days free. Print it and put it in each box.",
  insertPreview: "Preview of the A6 insert with your QR code",
  insertDownload: "Download the A6 insert (PDF)",
  insertFailed: "This device could not make the insert. Try again, or use a computer.",
  canSayTitle: "You can say",
  doNotSayTitle: "Do not say",
} as const;
