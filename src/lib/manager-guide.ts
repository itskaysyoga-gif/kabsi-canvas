// The "add Kabsi as a Manager" guide (K-93, design review "The add Kabsi as manager guide"): five cards, one step each,
// for a computer and for a phone. The computer cards carry the real screenshots in public/help/manager-steps/desktop
// (input I2); the phone cards are text until phone screenshots exist. Pure data, so a test can read every word.

export type Device = "computer" | "phone";

export type GuideCard = {
  title: string;
  /** One sentence per instruction. */
  text: string;
  /** Screenshots under /help/manager-steps/desktop, with what they show. */
  images?: { src: string; alt: string }[];
  /** Card 1 carries the button that opens the owner's own listing. */
  opensListing?: boolean;
  /** The last card carries the group ID and Copy. */
  showsId?: boolean;
};

const D = "/help/manager-steps/desktop";

export const COMPUTER_CARDS: GuideCard[] = [
  {
    title: "Open your Business Profile",
    text: "Search for your business name on Google while you are signed in to the account that manages it.",
    images: [
      {
        src: `${D}/step-1-open-profile.png`,
        alt: "Your business on Google, with the menu next to its name circled",
      },
    ],
    opensListing: true,
  },
  {
    title: "Open Business Profile settings",
    text: "Open the menu next to your business name and choose Business Profile settings.",
    images: [
      {
        src: `${D}/step-2-settings.png`,
        alt: "The menu open, with Business Profile settings circled",
      },
    ],
  },
  {
    title: "Choose People and access",
    text: "In the settings, choose People and access.",
    images: [
      {
        src: `${D}/step-3-people-and-access.png`,
        alt: "The settings list, with People and access circled",
      },
    ],
  },
  {
    title: "Add a person",
    text: "Click Add.",
    images: [
      {
        src: `${D}/step-4-add-person.png`,
        alt: "The People and access page, with the Add button circled",
      },
    ],
  },
  {
    title: "Paste Kabsi's ID, choose Manager, invite",
    text: "Paste the Kabsi group ID, choose Manager, then click Invite.",
    images: [
      {
        src: `${D}/step-5-paste-group-id.png`,
        alt: "The Add person box, with the field for the group ID circled",
      },
      {
        src: `${D}/step-6-choose-manager.png`,
        alt: "The access level set to Manager, with Invite circled",
      },
    ],
    showsId: true,
  },
];

export const PHONE_CARDS: GuideCard[] = [
  {
    title: "Open your Business Profile",
    text: "Open Google Maps, tap your profile picture, then Your business profiles, and choose the business.",
    opensListing: true,
  },
  {
    title: "Open Business Profile settings",
    text: "Tap the three dots, or Profile settings, then Business Profile settings.",
  },
  { title: "Choose People and access", text: "Tap People and access." },
  { title: "Add a person", text: "Tap Add." },
  {
    title: "Paste Kabsi's ID, choose Manager, invite",
    text: "Paste the Kabsi group ID, choose Manager, then tap Invite.",
    showsId: true,
  },
];

export const guideCards = (device: Device) => (device === "phone" ? PHONE_CARDS : COMPUTER_CARDS);

/** The date the desktop screenshots were taken (input I2). They are re-checked every month (design review). */
export const SCREENSHOT_DATE = "4 October 2026";

/** Where card 1 sends the owner, in a new tab: their own listing when we know the name, else the Business Profile manager. */
export function listingUrl(device: Device, businessName?: string): string {
  if (device === "computer" && businessName)
    return `https://www.google.com/search?q=${encodeURIComponent(businessName)}`;
  return "https://business.google.com/";
}

/** The page the steps live on, optionally opened on one card (the one-tap link in the email and the shared message). */
export function stepsUrl(origin: string, businessName?: string, step?: number): string {
  const q: string[] = [];
  if (businessName) q.push(`b=${encodeURIComponent(businessName.slice(0, 80))}`);
  if (step && step >= 1 && step <= 5) q.push(`s=${Math.round(step)}`);
  return `${origin}/manager-steps${q.length ? `?${q.join("&")}` : ""}`;
}

/**
 * The ready message for whoever manages the listing ("Someone else manages my Google listing", K-93). Plain text, no
 * password or code asked for, and the link to the steps. It never contains the group ID: the steps page shows it.
 */
export function readyMessage(businessName: string, url: string): string {
  return (
    `Hello, I would like Kabsi (kabsi.co) to look after the reviews for ${businessName} on Google. ` +
    `Could you add Kabsi as a Manager on our Google Business Profile? The steps take about two minutes: ${url} ` +
    `Kabsi never asks for a Google password or a verification code, and nothing is published without my approval.`
  );
}

export const whatsappShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
export const mailtoUrl = (subject: string, body: string) =>
  `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
