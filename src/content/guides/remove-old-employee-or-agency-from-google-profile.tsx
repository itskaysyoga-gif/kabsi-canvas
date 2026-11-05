import { Callout, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, Out, SiteRef } from "@/components/marketing/guide-links";
import { scheduledAt } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 18. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "remove-old-employee-or-agency-from-google-profile",
  title: "How do I remove an old employee or agency from my profile?",
  description:
    "How to remove a former employee or agency from your Google Business Profile, why Google makes new owners wait 7 days, and what to do if they own it.",
  publishAt: scheduledAt(17),
  updated: READ,
  checked: READ,
  topic: "Owners and managers",
  answer:
    "If you are an owner, open People and access in your Business Profile settings, select the person and choose Remove person. If they are the primary owner, or you are only a manager, you cannot remove them yourself: ask them to make you primary owner, or request ownership from Google.",
  inShort: [
    "Only owners can remove other owners and managers; a manager cannot remove anyone but themselves.",
    "A new owner or manager waits 7 days before they can remove other users.",
    "The primary owner must hand over primary ownership before anyone can take it from them.",
    "If they will not, request ownership at business.google.com/add; they have 3 days to answer.",
  ],
  sections: [
    {
      id: "who-can-remove",
      heading: "Who is allowed to remove someone from my Google profile?",
      answer:
        "Only an owner. Google's help says managers have mostly the same access as owners, except that they cannot add or remove users or remove the profile, so if you were added as a manager you need an owner to do it for you.",
      body: (
        <>
          <p>
            A profile can have several owners but only one primary owner. To see who has access, go
            to your Business Profile, select More, then Business Profile settings, then People and
            access. Everyone with access and every pending invitation is listed there, with their
            role.
          </p>
          <p>
            Google says that if you cannot select a user on that page, it might mean you only have
            manager access. Check your own role first: it decides which of the sections below
            applies to you.
          </p>
        </>
      ),
    },
    {
      id: "remove-steps",
      heading: "How do I remove an old employee or agency?",
      answer:
        "As an owner, open People and access, select the person or agency, and choose Remove person. Google says the person gets an email, can no longer change business info or do admin tasks, and that their past replies to reviews, posts and other actions stay on the profile.",
      body: (
        <>
          <Steps
            items={[
              "Sign in to the Google Account that owns the profile and open your Business Profile on Google Search.",
              "Select More, then Business Profile settings, then People and access.",
              "Select the user you want to remove.",
              "Select Remove person.",
            ]}
          />
          <p>
            Before you remove an agency, ask for anything of yours they hold, such as photos they
            took or reports they sent. If the agency added a
            website or booking link you no longer use, change it on the profile after they are gone.
          </p>
          <Callout kind="tip" title="Check the pending list too">
            An invitation that was never accepted sits under Pending on the same page. Select the
            user there and choose Cancel invitation so it cannot be accepted later.
          </Callout>
        </>
      ),
    },
    {
      id: "seven-days",
      heading: "Why does Google say I have to wait 7 days?",
      answer:
        "Google makes every new owner or manager wait 7 days before using some features. During that time you get an error if you try to remove other owners or managers, delete or undelete the profile, or transfer primary ownership, so if you were just made an owner, wait the 7 days and try again.",
      body: (
        <p>
          Google adds that if a new owner or manager deletes their Google Account within the first 7
          days, they are removed from the profile and need to be added again.
        </p>
      ),
    },
    {
      id: "primary-owner",
      heading: "The old employee or agency is the primary owner. What now?",
      answer:
        "Ask them to transfer primary ownership to you. Google says only the primary owner can do this, from People and access, by selecting you, choosing Edit next to Access, then Primary owner and Save, and that you must already be an owner or manager on the profile.",
      body: (
        <>
          <p>
            If you are not on the profile at all, they first add you as an owner. Google also says a
            primary owner cannot remove themselves until they have transferred primary ownership to
            someone else, so the order is always: add you, make you primary owner, then they leave
            or you remove them.
          </p>
          <p>
            The person who transfers must be past their own first 7 days, or Google shows an error.
            When the business itself is being sold, see{" "}
            <GuideLink slug="transfer-google-business-profile-ownership">
              how to transfer ownership of a Google Business Profile
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "will-not-hand-over",
      heading: "What if they will not hand it over or do not answer?",
      answer:
        "Request ownership from Google. Go to business.google.com/add, enter your business name and address, choose your business, and when Google says someone else may manage the profile, select Request Access and fill in the form; Google emails the current owner, who has 3 days to respond.",
      body: (
        <>
          <ul>
            <li>
              <b>Approved:</b> you get an email and can manage the profile, after the 7 day wait for
              some features.
            </li>
            <li>
              <b>Denied:</b> you get a rejection email, and Google says you can appeal the decision
              or suggest an edit to the profile.
            </li>
            <li>
              <b>No answer after 3 days:</b> Google says you may be able to claim the profile: open
              the confirmation email, select View request, then Verify, and follow the steps. Google
              says this option is not always available.
            </li>
          </ul>
          <p>
            For a business with no shop or office that serves customers at their location, Google's
            page says to contact Google instead and choose the transfer of ownership option as the
            issue. You can check the status of a request by signing in or from the
            link in your confirmation email.
          </p>
          <Callout kind="warn" title="Do not make a second profile">
            Google says you can have only one Business Profile for each business, and that a
            profile treated as a duplicate does not show on Google Search or Maps. Request ownership
            of the existing one instead.
          </Callout>
        </>
      ),
    },
    {
      id: "agency-pressure",
      heading: "The agency says it can take my business off Google. Can it?",
      answer:
        "No. Google's advice on working with third parties says they cannot remove your business from Google or access your profile without your permission, and that only profile owners control who has access. Google lists threats like this as a warning sign of a deceptive third party.",
      body: (
        <>
          <p>
            Google also says that if someone claims to work for Google, you should ask for their
            name and an email from their @google.com address, and that if they cannot give one they
            likely do not. If a third party breaks Google's third-party policies, report them through
            Google's{" "}
            <Out href="https://support.google.com/business/answer/7163406?hl=en">
              third-party guidance page
            </Out>
            , which links to the complaint form.
          </p>
          <p>
            If the problem is that you lost the login of the Google Account that owns the profile,
            Google points to its Accounts troubleshooter to recover the username or password.
          </p>
        </>
      ),
    },
    {
      id: "uk-uae",
      heading: "Is any of this different in the UK or the UAE?",
      answer:
        "No. Google's pages on owners, managers, the 7 day wait and requesting ownership give the same steps for every country, so a salon in Manchester and a cafe in Dubai follow them exactly as written here.",
      body: (
        <p>
          Google's pages do not say what evidence an appeal of a denied request needs. Before you
          start, keep anything that ties you to the business and its address close to hand, so you
          can answer quickly if Google asks.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does and does not do here",
    body: (
      <>
        <p>
          Kabsi cannot remove anyone from your profile, transfer ownership or request it for you.
          Kabsi is a Manager on your profile (group ID 5481006796), and on Google only owners can
          add or remove people. It never asks for your Google password or a verification code.
        </p>
        <p>
          What Kabsi does is check your details every day, such as your name, phone, website,
          address and hours, and tell you when something on Google changes, so an edit by someone who
          still has access does not go unnoticed. You can remove Kabsi the same way as anyone else:
          People and access, Kabsi Clients, Remove person. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Will removing the old agency delete the replies they wrote?",
      a: "No. Google says that when you remove a user, their replies to reviews, posts, comments and other actions stay on the Business Profile. You can edit or delete a reply yourself afterwards.",
    },
    {
      q: "Can a manager remove themselves?",
      a: "Yes. Google says managers can remove themselves: in People and access they select themselves, then Stop managing and Confirm. That is the quickest route when a former employee is willing.",
    },
  ],
  sources: [
    {
      title: "Google: Manage your Business Profile owners & managers",
      url: "https://support.google.com/business/answer/3403100?hl=en",
      read: READ,
    },
    {
      title: "Google: Transfer primary ownership of a Business Profile",
      url: "https://support.google.com/business/answer/3415281?hl=en",
      read: READ,
    },
    {
      title: "Google: Request ownership of a Business Profile",
      url: "https://support.google.com/business/answer/4566671?hl=en",
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
    {
      title: "Google: Manage customer reviews",
      url: "https://support.google.com/business/answer/3474050?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "restaurant", "cafe"],
  related: [
    "transfer-google-business-profile-ownership",
    "add-manager-google-business-profile",
    "duplicate-google-listings",
  ],
  summary:
    "How to remove a former employee or agency from a Google Business Profile: only owners can, new owners wait 7 days, and how to request ownership when the old primary owner will not hand it over.",
};
