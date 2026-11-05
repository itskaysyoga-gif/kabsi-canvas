import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { PUBLISH_ALL_AT } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 2. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "how-to-verify-google-business-profile",
  title: "How do I verify my Google Business Profile?",
  description:
    "The verification methods Google may offer, step by step, how long each takes, and what to do when verification fails or Google asks you to verify again.",
  publishAt: PUBLISH_ALL_AT,
  updated: READ,
  checked: READ,
  topic: "Verification",
  answer:
    "Sign in to the Google Account for your profile, select Get verified, and use one of the methods Google offers you: phone or text, email, a live video call, a video recording or a postcard. Google decides which methods you see, reviews what you send for up to 5 business days, and emails you when you are verified.",
  inShort: [
    "Google says you need to verify your business to edit its details and gain ownership of the profile.",
    "Google picks the methods for you; if video verification is offered, Google recommends it.",
    "Never share your verification code: Google says it will never ask for it.",
    "If Get verified appears again, Google could not finish: try again or try another method shown.",
  ],
  sections: [
    {
      id: "why-verify",
      heading: "Why do I have to verify my business?",
      answer:
        "Google's help says that to edit your business details, such as the name or hours, and to interact with customers, you need to verify your business. Verifying is also how you gain ownership of the profile, so it is the step that gives you control of what Google shows.",
      body: (
        <>
          <p>
            You need a Google Account first. Google says it can be a new account with a Gmail
            address or with your own email address, or an existing account. If you have a company
            email address, you can link it to your Google Account, which makes the profile easier to
            manage as a business.
          </p>
          <p>
            Your business must also be eligible. Google says an online-only business with no
            in-person service is not eligible for a Business Profile and cannot be verified. The
            rules on who qualifies are in{" "}
            <GuideLink slug="why-is-my-business-not-on-google-maps">
              why is my business not showing on Google Maps
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "start",
      heading: "Where do I start?",
      answer:
        "Find your profile while signed in to the right Google Account, then select Get verified. If your business is not on Google yet, add it at business.google.com/add; if it is on Google Maps but nobody has claimed it, claim it first.",
      body: (
        <Steps
          items={[
            "Sign in to the Google Account you want to own the profile with.",
            <>
              On Google Search, search for your business name and city, or search <b>my business</b>
              .
            </>,
            <>
              If your business is on Google Maps but not claimed, select <b>Claim this business</b>,
              then <b>Manage now</b>. If it is not on Google at all, go to business.google.com/add
              and select <b>Add your business to Google</b>.
            </>,
            <>
              On your profile, select <b>Get verified</b> and look at the methods Google shows you.
            </>,
          ]}
        />
      ),
    },
    {
      id: "which-method",
      heading: "Which verification method should I choose?",
      answer:
        "You can only use the methods Google offers for your profile: Google says they are set automatically and cannot be changed. They depend on your business type, public information, region and business hours, and sometimes Google asks for more than one method.",
      body: (
        <>
          <p>
            Google lists phone or text, email, a live video call, a video recording and a postcard
            by mail. Google says that if your business is eligible for video verification, it
            recommends that option. Live video calls and postcards are not available for every
            business, and Google suggests trying the options you are shown before you contact its
            support.
          </p>
          <ul>
            <li>
              <b>Phone or text:</b> select <b>Get verified</b>, then <b>Phone or SMS</b>, and enter
              the code from the call or text. Google warns that an automated phone menu will not get
              the code, so use a line a person answers or a phone that receives texts.
            </li>
            <li>
              <b>Email:</b> select <b>Get verified</b>, then <b>Email</b>, and follow the steps in
              the email. You must be able to open the address shown on the screen.
            </li>
            <li>
              <b>Live video call:</b> select <b>Get verified</b>, <b>Live video call</b>,{" "}
              <b>Next</b>, choose your language, then <b>Start call</b>. Google says these calls are
              only available during your business hours, and you must be at the business.
            </li>
          </ul>
          <p>
            Google's pages set no separate steps for the UK or the UAE, but Google says the methods
            depend partly on region, so the list you see may differ from a business in another
            country.
          </p>
        </>
      ),
    },
    {
      id: "video",
      heading: "What do I need to show in a verification video?",
      answer:
        "Google wants a single live recording of at least 30 seconds, made on a mobile device from your Business Profile, that shows where the business is, that it exists, and that you manage it. It cannot be edited, have breaks, or be recorded earlier and uploaded later.",
      body: (
        <>
          <DoDont
            yesTitle="Show"
            noTitle="Leave out"
            yes={[
              "Street signs, the building number, or the businesses next door.",
              "Your sign with the business name on a permanent fixture, matching the name on your profile.",
              "Something only staff can open: the till, the kitchen, a storeroom or your point of sale system.",
              "For a business that travels to customers: landmarks near your address, your tools, a branded van you unlock.",
            ]}
            no={[
              "Bank account, tax or ID numbers.",
              "Private information about you or anyone else.",
              "Other people's faces.",
              "Clips filmed earlier, or a video with cuts.",
            ]}
          />
          <p>
            On your phone, open your Business Profile, tap <b>Get verified</b>, then{" "}
            <b>Business video</b> and <b>Next</b>. Read the requirements, allow the camera,
            microphone and location if asked, tap <b>Start recording</b>, review the video and tap{" "}
            <b>Upload video</b>. Google says the review can take up to 5 business days.
          </p>
        </>
      ),
    },
    {
      id: "postcard",
      heading: "How does postcard verification work?",
      answer:
        "Select Get verified, then Postcard, check your mailing address and request the code. Google says most codes arrive within 14 days and expire after 30 days, and that you enter the 5-digit code on your profile in the Code field, then select Submit.",
      body: (
        <Callout kind="warn" title="While the postcard is on its way">
          Do not edit your business name, address or category: Google says the code it sent will
          then not work. Do not request a new code either, because that cancels the one in the post
          and makes the process longer. When it arrives, keep the code to yourself. Google says it
          will never ask for your code, and not to share it with anyone, even people who manage your
          profile.
        </Callout>
      ),
    },
    {
      id: "how-long",
      heading: "How long does verification take?",
      answer:
        "Google says that after you finish the steps, it reviews what you sent for up to 5 business days, and on rare occasions longer. When you are verified, you get a confirmation email.",
      body: (
        <p>
          Google says some profiles are verified at once, for example when you have verified your
          website with Google Search Console, or use bulk verification for many locations. Once
          verified, you can add other people to help, as owners or managers, each with their own
          Google Account so nobody shares your password: see{" "}
          <GuideLink slug="add-manager-google-business-profile">
            how to add a manager to your Google Business Profile
          </GuideLink>
          .
        </p>
      ),
    },
    {
      id: "failed",
      heading: "Verification failed or Google wants me to verify again. What now?",
      answer:
        "If the Get verified button appears on your profile again, Google says it could not completely verify your business, so try again, or try another method if several are shown. If a video was not accepted, select Review issues and record a new one that includes everything from the first video plus what was missing.",
      body: (
        <>
          <ul>
            <li>
              <b>Review issues:</b> Google shares why the video was not accepted, for example the
              business name not visible on the storefront, no nearby area shown, or missing proof
              that you run the business.
            </li>
            <li>
              <b>Asked for more information:</b> Google says this is likely because some business
              details were recently updated. Select <b>Get verified</b> and verify again.
            </li>
            <li>
              <b>Video will not upload:</b> Google says videos sometimes fail on the first try, so
              upload it again.
            </li>
            <li>
              <b>Still stuck:</b> try every method shown first, then use Google's contact option on
              the help page. Google says trying the available methods first makes it easier for its
              team to help.
            </li>
          </ul>
          <p>
            If someone else already verified a profile for your business, Google's route is to
            request ownership from that owner; if they do not reply within 3 days, Google may give
            you the option to claim the profile. The steps are in{" "}
            <GuideLink slug="transfer-google-business-profile-ownership">
              how to transfer ownership of a Google Business Profile
            </GuideLink>
            .
          </p>
        </>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does and does not do here",
    body: (
      <>
        <p>
          Kabsi cannot verify a profile for you, and it never asks for your verification code or
          your password: only you can verify, on Google, for free. Kabsi works with a verified
          profile that you own or manage, so setup asks you first. If yours is not verified yet,
          setup shows what Google may ask, including what to film for a video, and waits; the free
          trial starts only once Kabsi has working access, so waiting costs no trial days.
        </p>
        <p>
          Once connected, Kabsi reads Google's state for your profile once a day. If Google asks you
          to verify again, Kabsi stops sending anything to Google, tells you what Google is asking,
          and starts again when Google clears it. Before you change your name, address, main
          category, open status or map marker, Kabsi warns that this can make Google ask you to
          verify again. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Does it cost anything to verify my business?",
      a: "No. Google says you can add or claim your business at no charge, and verification is part of that.",
    },
    {
      q: "Can I pick postcard instead of video?",
      a: "Only if Google offers it. Google says the methods are set automatically and cannot be changed, so use one of the options shown on your profile.",
    },
    {
      q: "Someone called saying they are from Google and asked for my code. Is that real?",
      a: "No. Google says it will never ask for your verification code. Do not share it with anyone, even people who manage your profile.",
    },
  ],
  sources: [
    {
      title: "Google: Verify your business on Google",
      url: "https://support.google.com/business/answer/7107242?hl=en",
      read: READ,
    },
    {
      title: "Google: Verify your business with a video recording",
      url: "https://support.google.com/business/answer/14271705?hl=en",
      read: READ,
    },
    {
      title: "Google: Add or claim your Business Profile",
      url: "https://support.google.com/business/answer/2911778?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage your Business Profile owners & managers",
      url: "https://support.google.com/business/answer/3403100?hl=en",
      read: READ,
    },
    {
      title: "Google: Resolve duplicate profiles & ownership issues",
      url: "https://support.google.com/business/answer/12756178?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "barbershop", "cafe", "auto-repair"],
  related: [
    "why-is-my-business-not-on-google-maps",
    "google-business-profile-suspended",
    "transfer-google-business-profile-ownership",
  ],
  summary:
    "How to verify a Google Business Profile: the methods Google may offer, what to film for a video, postcard rules, how long the review takes, and what to do when it fails.",
};
