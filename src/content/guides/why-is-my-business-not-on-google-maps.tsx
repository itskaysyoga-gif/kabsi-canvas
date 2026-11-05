import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { scheduledAt } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 1. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "why-is-my-business-not-on-google-maps",
  title: "Why is my business not showing on Google Maps?",
  description:
    "The usual reasons a business does not show on Google Maps, how to tell which one is yours, and the steps to fix it in the UK and the UAE.",
  publishAt: scheduledAt(0),
  updated: READ,
  checked: READ,
  topic: "Google Maps",
  answer:
    "Most often the profile is not verified yet, was suspended for breaking Google's guidelines, or is new or recently edited and still waiting to appear. Search your exact business name and town on Google Maps first: if it shows, you are not missing, you are just not coming up for the wider search you tried.",
  inShort: [
    "Search your exact business name and town on Google Maps, signed out, to see what customers see.",
    "Google says only verified businesses can show their details on Maps and Search.",
    "A profile that breaks Google's guidelines can be suspended and stops showing until it is fixed.",
    "Changes can take up to 3 days to appear, and a new business can take up to a month to rank.",
  ],
  sections: [
    {
      id: "missing-or-lower",
      heading: "Is my business missing, or just not coming up?",
      answer:
        "Start with a search for your exact business name and your town on Google Maps. If your business appears, Google has your profile and shows it; the problem is that it does not come up for broader searches such as 'barber near me', which is a different question with different answers. If it does not appear even for its own name, work through the checks below in order.",
      body: (
        <>
          <Steps
            items={[
              "Open Google Maps on a phone or a computer, ideally in a private window so your own account does not change what you see.",
              "Type your business name exactly as it is on your sign, then your town, for example 'Juniper Hair Studio Bristol' or 'Juniper Hair Studio Dubai Marina'.",
              "If your profile appears, note what it shows: the name, the address or service area, the hours and the photos. That is what customers see.",
              "If nothing appears, sign in to the Google Account you use for the profile and search 'my business' on Google Search, which opens the profile you manage.",
            ]}
          />
          <p>
            Google's own help page says that to find your profile you must sign in to the Google
            Account associated with it, and that on Google Search you can search your business's
            name and city or "my business". In the Google Maps app, the Business tab at the bottom
            right opens the profile you manage.
          </p>
        </>
      ),
    },
    {
      id: "not-verified",
      heading: "Does my profile need to be verified to show on Maps?",
      answer:
        "Yes. Google's help says only verified businesses can show their business info on Maps and Search, so an unverified profile is the first thing to rule out. When you sign in and open your profile, Google shows whether verification is still needed and offers the ways available to you.",
      body: (
        <>
          <p>
            Google lists the ways it may offer: phone or text, email, a live video call or a
            postcard by mail. You do not choose freely: Google decides which methods your business
            can use. Google says verification reviews take up to 5 business days, sometimes longer,
            and that most postcard codes arrive within 14 days. While a postcard is on its way,
            Google asks you not to edit your business name, address or category, because the code
            would stop working.
          </p>
          <p>
            The steps are the same for a business in the UK and in the UAE. The full walk-through is
            in{" "}
            <GuideLink slug="how-to-verify-google-business-profile">
              how to verify your Google Business Profile
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "suspended",
      heading: "Could my profile have been suspended?",
      answer:
        "Yes, if Google decided the profile does not follow its guidelines. Google's help says a profile that violates the guidelines becomes disabled or suspended and does not show to other people on Google until the issue is resolved, and that you get a notification in the Google Account you use to manage it.",
      body: (
        <>
          <p>
            Check the email address of that Google Account, including its spam folder, and open the
            profile while signed in. If Google has suspended it, Google's appeals tool shows the
            decision, the date, the policy and whether it can be appealed. Google says an appeal can
            be submitted only once, and that you should not create a new Business Profile for the
            same business.
          </p>
          <Callout kind="warn" title="Do not make a second profile">
            A new profile for the same business does not fix a suspension, and Google says not to
            create one. Fix what the guidelines ask for, then appeal from the original profile.
          </Callout>
          <p>
            What a suspension means and how to appeal step by step is in{" "}
            <GuideLink slug="google-business-profile-suspended">
              Google Business Profile suspended
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "eligible",
      heading: "Is my kind of business allowed a profile?",
      answer:
        "Google's guidelines give a Business Profile to businesses that meet customers in person, either at a place customers can visit or by travelling to them. A business whose only address is a virtual office or a remote mailbox does not qualify, and that can explain a profile that never appears or is taken down.",
      body: (
        <ul>
          <li>
            A shop, salon, cafe, clinic or garage that customers visit during stated hours can have
            a profile at that address.
          </li>
          <li>
            A business that goes to its customers, such as a mobile barber or a cleaner, can have a
            profile with a service area, and Google says it should hide its address from customers.
          </li>
          <li>
            Google says a virtual office is not an eligible location, and P.O. boxes or mailboxes at
            remote locations are not acceptable addresses. A co-working space qualifies only with
            clear signage and customers received there during business hours.
          </li>
          <li>
            Your business name should be your real-world name. Google does not allow unnecessary
            information in the name, such as marketing taglines or opening hours.
          </li>
        </ul>
      ),
    },
    {
      id: "new-or-edited",
      heading: "I only just set it up or changed it. How long does it take?",
      answer:
        "Google says that when you edit your business info, changes can take up to 3 days to appear, and that rankings for new businesses can take up to a month to appear in search results. If you verified recently or changed your address, wait that long before you change anything else.",
      body: (
        <p>
          Changing the name or address again while you wait can start the review over, so make one
          correct change and leave it. If more than a month has passed and a search for your exact
          name still finds nothing, go back to the verification and suspension checks above, then
          ask Google for help from your profile.
        </p>
      ),
    },
    {
      id: "not-coming-up",
      heading: "It shows for my name but not for 'salon near me'. Why?",
      answer:
        "That is not a missing profile: it is how Google picks local results. Google says local results are mainly based on relevance, distance and popularity, and that there is no way to request or pay for a better local ranking, so the honest work is to make your profile complete and correct.",
      body: (
        <>
          <p>
            Relevance is how well your profile matches the search, distance is how far you are from
            the person searching, and popularity is how well known the business is, in Google's
            words. Google says complete and accurate business information helps it match your
            profile to the right searches, and that it keeps the details of its ranking private.
            Nobody outside Google can promise a position.
          </p>
          <p>
            What you control: the right main category, true opening hours, your address or service
            area, photos, and replies to reviews. The full explanation is in{" "}
            <GuideLink slug="how-google-chooses-local-results">
              how Google chooses which businesses to show nearby
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "uk-uae",
      heading: "Is anything different in the UK or the UAE?",
      answer:
        "No. Google's verification, guidelines and suspension rules on these pages are the same in both countries. What differs is the detail you type: write your address the way your local post and customers use it, and check that the town Google shows is the one customers search for.",
      body: (
        <p>
          In the UK that usually means the street, the town and the postcode. In the UAE, where many
          addresses use a building, a street and an area, use the area name customers know, such as
          Dubai Marina or Al Barsha, and place the map marker on your real entrance. If your town or
          area looks wrong on the profile, correct it once from your profile and wait up to 3 days
          for the change to appear.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          The free check shows what Google shows about your business today, without any Google
          access: the details on your profile, and where you come up for one search at your address
          and at places around it, like a customer standing there. It is a quick way to tell a
          missing profile from one that is simply not coming up.
        </p>
        <p>
          Kabsi itself works with a verified profile that you own or manage, and it cannot verify a
          profile or appeal a suspension for you: only the owner can act with Google. Once
          connected, Kabsi reads Google's state for your profile once a day. If Google suspends it
          or asks you to verify it, Kabsi stops sending anything to Google, tells you what Google is
          asking, and starts again when Google clears it.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Why can I see my business on Google but customers cannot?",
      a: "You may be signed in to the account that manages the profile, which shows you the profile even when it is not public. Search your name and town in a private window, signed out. If it does not appear there, check verification and suspension first.",
    },
    {
      q: "Can I pay Google to show my business higher on Maps?",
      a: "No. Google's help says there is no way to request or pay for a better local ranking. Ads are a separate, paid product and are marked as ads.",
    },
    {
      q: "Should I delete my profile and start again?",
      a: "No. For a suspended profile Google says not to create a new Business Profile for the same business. Fix the cause and appeal from the original profile.",
    },
  ],
  sources: [
    {
      title: "Google: Find your business on Google",
      url: "https://support.google.com/business/answer/145585?hl=en",
      read: READ,
    },
    {
      title: "Google: Verify your business on Google",
      url: "https://support.google.com/business/answer/7107242?hl=en",
      read: READ,
    },
    {
      title: "Google: Fix suspended or disabled profiles",
      url: "https://support.google.com/business/answer/4569145?hl=en",
      read: READ,
    },
    {
      title: "Google: Guidelines for representing your business on Google",
      url: "https://support.google.com/business/answer/3038177?hl=en",
      read: READ,
    },
    {
      title: "Google: Tips to improve your local ranking on Google",
      url: "https://support.google.com/business/answer/7091?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "barbershop", "restaurant", "cafe"],
  related: [
    "how-to-verify-google-business-profile",
    "google-business-profile-suspended",
    "how-google-chooses-local-results",
  ],
  summary:
    "Why a business does not show on Google Maps: not verified, suspended, ineligible, or still waiting after a change; and how it differs from not coming up for a wider search.",
};
