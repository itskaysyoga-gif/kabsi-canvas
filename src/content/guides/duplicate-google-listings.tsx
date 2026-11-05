import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { scheduledAt } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 19. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "duplicate-google-listings",
  title: "Duplicate Google listings: how to find and fix them",
  description:
    "How to find a second Google profile for your business, ask Google to merge it, and what to do when Google marks yours as a duplicate by mistake.",
  publishAt: scheduledAt(18),
  updated: READ,
  checked: READ,
  topic: "Duplicate profiles",
  answer:
    "Do not delete a profile you think is a duplicate: deleting it can lose its reviews. Find the second profile on Google Maps and ask Google to merge it by marking it a duplicate, or appeal to Google if your own profile was marked a duplicate by mistake.",
  inShort: [
    "Google allows only one Business Profile for each business, and a profile it treats as a duplicate does not show on Search or Maps.",
    "To ask for a merge, mark the extra profile on Google Maps as a duplicate of another place; Google reviews every request.",
    "When Google merges two profiles, their reviews are combined, but replies to reviews may be lost.",
    "Two different businesses at one address can each have a profile if they have different names and clearly different signs.",
  ],
  sections: [
    {
      id: "what-counts",
      heading: "What does Google count as a duplicate profile?",
      answer:
        "Google says you can have only one Business Profile for each business, and that more than one profile for the same business may mislead customers and is against its policies. A profile Google considers a duplicate does not show on Google Search or Maps, so a duplicate can quietly hide one of your two profiles.",
      body: (
        <>
          <p>Google's help page gives three reasons a profile may be treated as a duplicate:</p>
          <ul>
            <li>
              <b>Existing verified profile:</b> a verified profile already exists for the same
              business.
            </li>
            <li>
              <b>Same address:</b> more than one profile has the same address.
            </li>
            <li>
              <b>Different services:</b> the same business has several profiles that offer different
              services.
            </li>
          </ul>
          <p>
            Google's guidelines say the same thing from the other side: do not create more than one
            profile for each location of your business, in one Google Account or several, and a
            business that travels to its customers should have one profile for its central office or
            location, with a service area.
          </p>
        </>
      ),
    },
    {
      id: "find",
      heading: "How do I find a duplicate of my business?",
      answer:
        "Search for your business on Google Maps the way a customer would, signed out, and look for a second result that is the same business. One reason Google names for a duplicate is a second profile for the same business that offers different services.",
      body: (
        <Steps
          items={[
            "Open Google Maps in a private window so your own account does not change what you see.",
            "Search your business name and town, then your old name if you ever changed it, then your street address on its own.",
            "Open each result that could be yours and compare the name, address, phone number and photos with your real profile.",
            "Note which one you manage (signed in, it is the one that opens your profile) and which one is the extra.",
          ]}
        />
      ),
    },
    {
      id: "merge",
      heading: "How do I ask Google to merge two profiles?",
      answer:
        "Mark the extra profile on Google Maps as a duplicate of another place. Google says every merge request is reviewed, that the profiles must represent the same business and should have the same information, and that when two profiles are merged their reviews are combined but replies to reviews may be lost.",
      body: (
        <>
          <Callout kind="warn" title="Do not delete it">
            Do not delete a profile you think is a duplicate: deleting it can lose its reviews.
            Google's own page says that when a profile is removed, all its content and linked
            managers are removed too. Ask Google to merge instead, and let Google decide.
          </Callout>
          <p>These are the steps on Google's Maps help page, signed in to your Google Account:</p>
          <Steps
            items={[
              "Open Google Maps and search for the extra profile, or select it on the map.",
              <>
                Select <b>Suggest an edit</b>, then <b>Place closed or not here</b>.
              </>,
              <>
                Select <b>Duplicate of another place</b>, then <b>Submit</b>.
              </>,
            ]}
          />
          <p>
            Google says it reviews these edits, so it can take some time for a change to show on the
            map, and it gives no fixed time. Before you send the request, make sure your real
            profile shows the same name, address and phone number you see on your sign, so the two
            clearly describe one business.
          </p>
        </>
      ),
    },
    {
      id: "someone-else",
      heading: "What if someone else owns the other profile?",
      answer:
        "If a verified profile for your business is owned by someone else, Google lets you request access from the current owner. Google says the owner has 3 days to respond: if they approve, you can manage the profile; if they deny, you can appeal; and if they do not answer, you may get the option to claim it, though that option is not always available.",
      body: (
        <>
          <Steps
            items={[
              <>
                Go to <b>business.google.com/add</b> and enter your business name and address.
              </>,
              <>
                Choose your business from the list. Google shows "Someone else may manage this
                Business Profile."
              </>,
              <>
                Select <b>Request Access</b>, fill out the form and select <b>Submit</b>.
              </>,
            ]}
          />
          <p>
            Google sends you an email confirmation and emails the current owner. For a business that
            serves customers at their location with no shop or office, Google's page asks you to
            contact Google support instead and choose the transfer of ownership issue. The full
            process is in{" "}
            <GuideLink slug="transfer-google-business-profile-ownership">
              how to transfer ownership of a Google Business Profile
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "wrongly-marked",
      heading: "What if Google wrongly marked my profile as a duplicate?",
      answer:
        "Contact Google support to appeal the duplicate status. Google says both businesses must be eligible and distinct from one another, and if both serve customers at the same location you will be asked for evidence of permanent signage that clearly shows both businesses.",
      body: (
        <>
          <p>
            Google's page says businesses at the same address can each have a profile if they are
            distinct, with different names and clearly visible differences in signage, and eligible
            for a profile. Its examples include locations with several brands, rebranded businesses,
            departments within other businesses, and individual practitioners at a shared location.
          </p>
          <p>
            Before you appeal, take clear photos of each business's permanent sign at the entrance.
            A salon and a nail bar sharing one shopfront under one sign are hard to show as two
            businesses; two shops with their own names over their own doors are easier.
          </p>
        </>
      ),
    },
    {
      id: "moved-or-services",
      heading: "I moved, or I offer several services. Should I make a new profile?",
      answer:
        "No. Google says that if your business relocates you should update the existing profile with the new address instead of creating a new one, and that if you offer different services you should list them on your one profile instead of making a profile for each service.",
      body: (
        <DoDont
          yesTitle="Do"
          noTitle="Do not"
          yes={[
            "Edit the address on your existing profile when you move.",
            "Add each service to the services on your one profile.",
            "Keep one Google Account in charge, and add helpers as managers.",
          ]}
          no={[
            "Create a new profile for a new address.",
            "Create a profile for each service, such as one for cuts and one for colour.",
            "Start a fresh profile to get away from old reviews.",
          ]}
        />
      ),
    },
    {
      id: "uk-uae",
      heading: "Is anything different in the UK or the UAE?",
      answer:
        "Google's pages here name no separate rule for the UK or the UAE. One thing to know: Google's Maps help says some editing options are only available in some countries and regions, so if you do not see an option, use Google's help from your profile.",
      body: (
        <p>
          In the UAE, where many addresses use a building and an area, two results for one business
          can differ only in how the address is written, for example one with the building name and
          one with the street. In the UK the postcode is usually the quickest way to see that two
          results are the same place. Either way, compare the map marker: two markers on the same
          entrance with the same name are the same business.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does and does not do here",
    body: (
      <>
        <p>
          Kabsi does not delete, merge or claim profiles, and it cannot appeal to Google for you.
          Kabsi is a Manager on your profile, so it cannot delete a profile either, and it never
          tells you to. If Google sees someone else claiming your profile, Kabsi notices when it
          reads Google's state for your profile once a day, stops sending anything to Google, and
          tells you what Google is asking. Only you, as the owner, can act with Google.
        </p>
        <p>
          If you are not sure which result is yours, write to hello@kabsi.co or ask for the free
          20-minute setup call. The free check needs no Google access and shows what Google shows
          about your business today. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can a clinic have a profile for each doctor?",
      a: "Google's guidelines say an individual practitioner who works in a public-facing role and can be contacted at the location during stated hours can have their own profile, and when the practitioner is one of several public-facing practitioners at the location, the clinic should have its own profile, separate from the practitioner's. A solo practitioner who represents a branded organisation should share the organisation's profile. A practitioner should not have several profiles for different specialisations, and support staff should not create their own.",
    },
    {
      q: "Will a merge keep my star rating?",
      a: "Google says the reviews of two merged profiles are combined, so the rating then comes from the combined reviews. Replies to reviews may be lost, so keep a copy of any reply you want to post again.",
    },
    {
      q: "I created the duplicate myself by mistake. What now?",
      a: "Do not delete a profile you think is a duplicate: deleting it can lose its reviews. Google's page says that if you created a duplicate by mistake you can remove it without affecting your verified profile, and that removing a profile removes all its content and linked managers, so make sure it is the right one. Check which one has your reviews first.",
    },
  ],
  sources: [
    {
      title: "Google: Resolve duplicate profiles & ownership issues",
      url: "https://support.google.com/business/answer/12756178?hl=en",
      read: READ,
    },
    {
      title: "Google Maps: Mark a place reopened or closed on Google Maps",
      url: "https://support.google.com/maps/answer/10552932?hl=en",
      read: READ,
    },
    {
      title: "Google: Request ownership of a Business Profile",
      url: "https://support.google.com/business/answer/4566671?hl=en",
      read: READ,
    },
    {
      title: "Google: Guidelines for representing your business on Google",
      url: "https://support.google.com/business/answer/3038177?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "medical-and-aesthetic-clinic", "restaurant", "auto-repair"],
  related: [
    "transfer-google-business-profile-ownership",
    "why-is-my-business-not-on-google-maps",
    "google-business-profile-suspended",
  ],
  summary:
    "Duplicate Google profiles: never delete one, ask Google to merge from Google Maps, request access when someone else owns it, and appeal a wrong duplicate status.",
};
