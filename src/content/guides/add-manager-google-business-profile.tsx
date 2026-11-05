import { Callout, Compare, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import type { GuideDoc } from "./types";

// Guides 3, earlier guide rewritten on the template. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "add-manager-google-business-profile",
  title: "How to add a manager to your Google Business Profile",
  description:
    "Give a staff member, an agency or a service access to your Google Business Profile without sharing your password, and remove it any time.",
  publishAt: "2026-09-26T00:00:00Z",
  updated: READ,
  checked: READ,
  topic: "Profile access",
  answer:
    "Open your Business Profile, select More, then Business Profile settings, then People and access, select Add, enter their email address, choose Manager under Access and select Invite. They get their own access with their own Google Account, so you never share your password, and you can remove them from the same screen.",
  inShort: [
    "Never share your Google password: invite people as managers instead.",
    "More, then Business Profile settings, then People and access, then Add.",
    "Managers can edit info, reply to reviews and post; only owners add or remove people.",
    "New owners and managers wait 7 days before some features work.",
  ],
  sections: [
    {
      id: "why-a-manager",
      heading: "Why add a manager instead of sharing my login?",
      answer:
        "Google's help says each user needs their own Google Account so they can manage the profile without you sharing your password. A manager can do the daily work, and you can take their access away at any time without changing your password or losing your profile.",
      body: (
        <p>
          With their own account, each person signs in as themselves and no password is shared.
          Their name sits in the People and access list you control, and Google says users in the
          account can see the names and email addresses of the other owners and managers.
        </p>
      ),
    },
    {
      id: "steps",
      heading: "How do I add a manager?",
      answer:
        "Sign in as an owner, open your Business Profile, select More, then Business Profile settings, then People and access. Select Add at the top left, enter the person's email address, choose Manager under Access and select Invite.",
      body: (
        <>
          <Steps
            items={[
              "Sign in to the Google Account that owns the profile and open your Business Profile.",
              <>
                Select <b>More</b>, then <b>Business Profile settings</b>, then{" "}
                <b>People and access</b>.
              </>,
              <>
                At the top left, select <b>Add</b>.
              </>,
              "Enter the email address of their Google Account.",
              <>
                Under "Access", select <b>Manager</b>.
              </>,
              <>
                Select <b>Invite</b>.
              </>,
            ]}
          />
          <p>
            Google says invited users can accept and become users right away, and you get an email
            when they accept. Until then they are listed under <b>PENDING</b> on the People and
            access page, where you can select <b>Cancel invitation</b>. Google's pages here name no
            separate rule for the UK or the UAE.
          </p>
        </>
      ),
    },
    {
      id: "owner-or-manager",
      heading: "Should I make them an owner or a manager?",
      answer:
        "Choose Manager unless the person should control the profile itself. Google says managers have mostly the same access as owners, except that they cannot add or remove users or remove the profile.",
      body: (
        <>
          <Compare
            cols={["Owner", "Manager"]}
            rows={[
              { label: "Edit main info, like hours and address", a: true, b: true },
              { label: "Respond to reviews", a: true, b: true },
              { label: "Create and publish posts", a: true, b: true },
              { label: "Add and edit photos", a: true, b: true },
              { label: "Add and remove users", a: true, b: false },
              { label: "Remove the Business Profile", a: true, b: false },
            ]}
          />
          <p>
            A profile can have several owners but only one primary owner. If you ever need to hand
            the whole profile to someone else, see{" "}
            <GuideLink slug="transfer-google-business-profile-ownership">
              how to transfer ownership of a Google Business Profile
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "seven-days",
      heading: "Why can a new manager not do everything at once?",
      answer:
        "Google says that when you become an owner or manager you have to wait 7 days before you can manage some features. During that time you get an error if you try to delete or undelete the profile, remove other owners or managers, or transfer primary ownership.",
      body: (
        <p>
          Replying to reviews and editing details are not on that list. Google also says that if
          someone deletes their Google Account within the first 7 days, they are removed from the
          profile and must be added again.
        </p>
      ),
    },
    {
      id: "change-role",
      heading: "How do I change someone's access later?",
      answer:
        "Go to People and access, select the person, select Edit next to Access, choose the new role and select Save. Google says only owners can change the access roles of other owners and managers.",
    },
    {
      id: "remove",
      heading: "How do I remove a manager?",
      answer:
        "Open your Business Profile, select More, then Business Profile settings, then People and access, select the person and choose Remove person. Only owners can remove other owners and managers, and the person gets an email.",
      body: (
        <>
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
          <p>
            Google says a removed user can no longer change business info or do admin tasks, but
            their past replies to reviews, posts and other actions stay on the profile. If you
            cannot select someone, you may only have manager access yourself.
          </p>
          <Callout kind="tip" title="Check the list once in a while">
            Look at People and access every few months. An old employee or a past agency you no
            longer work with should not still be there. The clean-up is in{" "}
            <GuideLink slug="remove-old-employee-or-agency-from-google-profile">
              how to remove an old employee or agency
            </GuideLink>
            .
          </Callout>
        </>
      ),
    },
    {
      id: "agency-asks",
      heading: "An agency asked for my password or a code. Is that normal?",
      answer:
        "No. Google's own way to give someone access is an invitation from People and access, and each user uses their own Google Account. Nobody who helps with your profile needs your password.",
      body: (
        <p>
          If someone insists, invite them as a manager instead, or do not work with them. Keep
          yourself as the owner, so you can always remove anyone you added.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          Kabsi uses Manager access too, with its group ID instead of an email address: in People
          and access select Add, paste 5481006796, choose Manager, then Add (on some screens,
          Invite). You stay the owner. Kabsi never asks for your Google password or a code Google
          sends you. It accepts only an invitation for the Manager role that matches a business you
          set up in Kabsi, and nothing goes on Google until you approve it.
        </p>
        <p>
          You can remove Kabsi any time without asking: in People and access select Kabsi Clients
          (group ID 5481006796) and choose Remove person, or in Kabsi choose Settings, then
          Disconnect Kabsi from Google. Kabsi stops reading and posting at once.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Does the person need a Gmail address?",
      a: "They need a Google Account. Google's help for leaving reviews notes that a Google Account can be set up with a non-Gmail email address.",
    },
    {
      q: "Can a manager remove me from my own profile?",
      a: "No. Google says managers cannot add or remove users. Only owners can.",
    },
  ],
  sources: [
    {
      title: "Google: Manage your Business Profile owners and managers",
      url: "https://support.google.com/business/answer/3403100?hl=en",
      read: READ,
    },
    {
      title: "Google: Tips to get more reviews",
      url: "https://support.google.com/business/answer/3474122?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "barbershop", "restaurant", "medical-and-aesthetic-clinic"],
  related: [
    "remove-old-employee-or-agency-from-google-profile",
    "transfer-google-business-profile-ownership",
    "how-to-reply-to-google-reviews",
  ],
  summary:
    "How to add a manager to a Google Business Profile from People and access, owner versus manager rights, the 7 day wait, and how to remove someone, without sharing a password.",
};
