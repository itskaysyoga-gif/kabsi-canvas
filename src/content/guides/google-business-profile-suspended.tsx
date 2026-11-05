import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { scheduledAt } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 3. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "google-business-profile-suspended",
  title: "My Google Business Profile is suspended. What do I do?",
  description:
    "What a suspended or disabled Google Business Profile means, the usual causes, the evidence to gather, and how to appeal once with Google's appeals tool.",
  publishAt: scheduledAt(2),
  updated: READ,
  checked: READ,
  topic: "Suspension",
  answer:
    "Google suspends or disables profiles it decides do not follow its guidelines, and a removed profile cannot be seen by the public or changed by its owner and managers. Fix what breaks the guidelines, gather documents that show your business name and address, and submit one appeal from Google's appeals tool.",
  inShort: [
    "Do not create a new profile for the same business: Google says not to.",
    "The appeals tool shows the date, the reason, the policy, and whether you can appeal.",
    "You can appeal only once, so fix the cause and attach your evidence before you submit.",
    "If your whole Google Account is restricted, appeal the account first, then the profile.",
  ],
  sections: [
    {
      id: "what-it-means",
      heading: "What does a suspended profile mean?",
      answer:
        "Google says it may suspend or disable Business Profiles that do not follow its guidelines. When Google removes a profile, the public cannot go to it and the owner and managers cannot act on it, but they can ask Google to reinstate it, and a reinstated profile comes back with its owners and managers.",
      body: (
        <>
          <p>Google's help describes three cases, and they work differently:</p>
          <ul>
            <li>
              <b>The profile is removed:</b> only that profile is affected. You appeal it from the
              appeals tool.
            </li>
            <li>
              <b>The owner's Google Account is removed:</b> Google removes all the locations that
              user owns, and reinstates them if the account is reinstated.
            </li>
            <li>
              <b>A manager's Google Account is removed:</b> the manager is suspended on the profiles
              they manage, and the profiles themselves are not affected.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "why",
      heading: "Why was my profile suspended?",
      answer:
        "The appeals tool tells you: it shows the reason for the decision and a link to the policy Google says was broken. Read that first, because the fix depends on it, and do not guess or change several things at random.",
      body: (
        <>
          <p>Google's own pages name these causes, among others:</p>
          <ul>
            <li>
              <b>Extra words in the business name:</b> Google says unnecessary information in the
              name, such as a marketing tagline, services, a location or opening hours, is not
              permitted and could result in suspension. Use your real-world name as it appears on
              your sign.
            </li>
            <li>
              <b>The address:</b> Google says a profile with a P.O. Box address will be suspended, a
              virtual office is not eligible, and a co-working space only qualifies with clear
              signage, staff and customers received there during business hours.
            </li>
            <li>
              <b>The business does not exist at that place:</b> Google says it will disable the
              profile if it decides the business is not at the location claimed.
            </li>
            <li>
              <b>A pattern of breaking the rules:</b> Google may restrict the Google Account itself,
              which suspends every profile it manages.
            </li>
          </ul>
          <p>
            The full rules are in Google's guidelines for representing your business, linked below.
          </p>
        </>
      ),
    },
    {
      id: "evidence",
      heading: "What evidence should I gather before I appeal?",
      answer:
        "Evidence is optional, but Google lists documents that can strengthen an appeal: an official business registration, a business licence, tax certificates, and utility bills for the business such as electricity, phone, water or internet. Google says to check that the business name and address on each document match the profile you are appealing.",
      body: (
        <>
          <p>
            Before you add anything, make the profile itself follow the guidelines: Google says to
            do this before you submit. If the name on your profile has extra words, correct it to
            the name on your sign. If your address is a P.O. Box or a virtual office, the profile
            cannot stay at that address.
          </p>
          <p>
            Google's pages here name no separate rule for the UK or the UAE and do not name
            documents for either country, so choose official papers that clearly show the same
            business name and address as the profile.
          </p>
        </>
      ),
    },
    {
      id: "appeal",
      heading: "How do I appeal a suspension?",
      answer:
        "Open Google's Business Profile appeals tool signed in to the account that manages the profile, choose the profile and the decision, add your evidence and an explanation, and submit. Google says appeals can only be submitted once, and that it emails you the decision.",
      body: (
        <>
          <Steps
            items={[
              <>
                Open the Google Business Profile appeals tool. If you are signed in to the right
                account, select <b>Confirm</b>; otherwise select <b>Switch account</b>.
              </>,
              <>
                Select the profile you want to appeal, then <b>Continue</b>. Select the decision you
                want to appeal, then <b>Continue</b>.
              </>,
              "Read the details: the date of the decision, the reason, the link to the policy, whether it can be appealed, and its status.",
              <>
                To add documents, select <b>Choose file</b>; you can attach several. In the text
                box, explain in plain words why the profile should be reinstated and what you fixed.
              </>,
              <>
                Tick the box confirming you are ready and that your evidence is attached, then
                select <b>Submit appeal</b>.
              </>,
            ]}
          />
          <Callout kind="warn" title="Do not make a second profile">
            Google says not to create a new Business Profile for the same business. A second profile
            is also a duplicate, which Google says is against its policies and will not show on
            Search or Maps.
          </Callout>
        </>
      ),
    },
    {
      id: "after",
      heading: "How long does an appeal take, and what if it is refused?",
      answer:
        "Google says appeal reviews and decisions can take up to 5 business days, and asks you not to submit more than one appeal for the same issue while you wait. If your appeal is denied, Google says it may be able to do one additional review, where you can add evidence you did not include the first time.",
      body: (
        <>
          <p>
            To check progress, open the appeals tool, select the profile, and read the status on the
            right: <b>Submitted</b>, <b>Approved</b>, <b>Not Approved</b>, <b>Can't be appealed</b>{" "}
            or <b>Eligible for appeal</b>.
          </p>
          <p>
            If the profile comes back but something is still wrong with it, Google says to contact
            Google Business Profile Help.
          </p>
        </>
      ),
    },
    {
      id: "account-restricted",
      heading: "What if my whole Google Account is restricted?",
      answer:
        "Google says that when an account is restricted, every Business Profile it manages is suspended and you cannot create or claim other profiles. You appeal the account first, from your My accounts page, and once the restriction is lifted you appeal each profile in the appeals tool.",
      body: (
        <p>
          Google also says a profile can be suspended because the account that created it was
          restricted in another Google product, and that account must be reinstated before the
          profile. If you manage more than 10 suspended profiles, the appeals tool asks whether you
          want bulk reinstatement and lets you attach a spreadsheet of the Business Profile IDs.
        </p>
      ),
    },
    {
      id: "uk-uae",
      heading: "Is the appeal different in the UK and the UAE?",
      answer:
        "Not for a suspended or disabled profile: Google says businesses in the UK and in the rest of the world, which includes the UAE, both use the appeals tool. The difference is for smaller decisions: in the UK a rejected edit or a restricted photo or post is also appealed in the tool, while in the UAE you use Google's contact form.",
      body: (
        <p>
          Google says a profile must be reinstated before you can appeal any content decision on it,
          so deal with the suspension first. Google also mentions extra out-of-court options, but
          only for businesses in the European Economic Area, which Google describes as the 27
          European Union members and the 3 members of the European Free Trade Association.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does and does not do here",
    body: (
      <>
        <p>
          Kabsi cannot appeal for you and never promises that Google will reinstate a profile: only
          the owner can act with Google. If your profile is suspended during setup, Kabsi shows the
          common causes, the evidence to gather and Google's reinstatement help.
        </p>
        <p>
          Once connected, Kabsi reads Google's state for your profile once a day. If Google suspends
          it, Kabsi stops sending anything to Google for that business, shows an urgent task saying
          what Google is asking, and tells the Kabsi team. Approved replies and changes wait, and
          Kabsi starts sending again by itself when Google clears the profile. Kabsi never asks for
          your password; it is added as a Manager. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Will I lose my reviews if my profile is suspended?",
      a: "Google's page does not mention reviews specifically. It says that when it reinstates a removed profile, it reinstates both the profile and its owners and managers, and that you should not create a new profile for the same business.",
    },
    {
      q: "Can I pay someone to get my profile back faster?",
      a: "Google reviews appeals itself, in its own appeals tool. Google warns about third parties who claim to work for Google or promise a place on Google Search or Maps.",
    },
  ],
  sources: [
    {
      title: "Google: Fix suspended or disabled profiles",
      url: "https://support.google.com/business/answer/4569145?hl=en",
      read: READ,
    },
    {
      title: "Google: Appeal Business Profile content & profile restrictions",
      url: "https://support.google.com/business/answer/13597551?hl=en",
      read: READ,
    },
    {
      title: "Google: Overview of Google Business Profile policies",
      url: "https://support.google.com/business/answer/13762416?hl=en",
      read: READ,
    },
    {
      title: "Google: Guidelines for representing your business on Google",
      url: "https://support.google.com/business/answer/3038177?hl=en",
      read: READ,
    },
    {
      title: "Google: Resolve duplicate profiles & ownership issues",
      url: "https://support.google.com/business/answer/12756178?hl=en",
      read: READ,
    },
    {
      title: "Google: Tips for working with third parties to manage your Business Profile",
      url: "https://support.google.com/business/answer/7163406?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "spa-and-massage", "medical-and-aesthetic-clinic", "auto-repair"],
  related: [
    "why-is-my-business-not-on-google-maps",
    "how-to-verify-google-business-profile",
    "duplicate-google-listings",
  ],
  summary:
    "What a suspended Google Business Profile means, the usual causes, the evidence that helps, and how to appeal once in Google's appeals tool, with the UK and UAE differences.",
};
