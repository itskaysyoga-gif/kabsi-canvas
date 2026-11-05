import { Callout, Compare, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { PUBLISH_ALL_AT } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 17. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "transfer-google-business-profile-ownership",
  title: "How do I transfer ownership of my Google Business Profile?",
  description:
    "How to make someone else the primary owner of a Google Business Profile, the 7-day wait, selling a business, and what to do when the owner will not reply.",
  publishAt: PUBLISH_ALL_AT,
  updated: READ,
  checked: READ,
  topic: "Ownership",
  answer:
    "Add the new person to your Business Profile as an owner or manager first, then in People and access select them, choose Edit next to Access, pick Primary owner and Save. Only the primary owner can do this, and Google says people in their first 7 days as an owner or manager can get an error when primary ownership changes.",
  inShort: [
    "A profile can have several owners but only one primary owner.",
    "If you sell the business, Google says to transfer primary ownership so its information, like reviews, is kept.",
    "Nobody needs your password: each person uses their own Google Account.",
    "If an old employee or agency holds the profile and will not answer, you can request ownership from Google.",
  ],
  sections: [
    {
      id: "roles",
      heading: "What is the difference between an owner, a primary owner and a manager?",
      answer:
        "Google says an owner has full control: they can add or remove people, manage the profile's information and even delete the profile. A profile can have several owners but only one primary owner, and managers can do most of what owners can, except add or remove people or remove the profile.",
      body: (
        <>
          <Compare
            cols={["Owner", "Manager"]}
            rows={[
              { label: "Add and remove people", a: true, b: false },
              { label: "Remove the Business Profile", a: true, b: false },
              { label: "Edit hours, address, phone and services", a: true, b: true },
              { label: "Reply to reviews and publish posts", a: true, b: true },
              { label: "Add and edit photos", a: true, b: true },
            ]}
          />
          <p>
            Google says that to transfer primary ownership, the profile must already have at least
            one other owner or manager to transfer it to. So the transfer is always two steps: add
            the person, then change their role.
          </p>
        </>
      ),
    },
    {
      id: "add-first",
      heading: "How do I add the new owner to the profile?",
      answer:
        "Open your Business Profile, go to Business Profile settings, then People and access, select Add, enter their email address, choose Owner or Manager under Access, and select Invite. Google says the person can accept the invitation and become a user right away, and you get an email when they do.",
      body: (
        <>
          <Steps
            items={[
              "Sign in to the Google Account that is the profile's primary owner and open your Business Profile.",
              <>
                Select <b>More</b>, then <b>Business Profile settings</b>, then{" "}
                <b>People and access</b>.
              </>,
              <>
                At the top left, select <b>Add</b> and enter the new owner's email address.
              </>,
              <>
                Under Access, select <b>Owner</b> or <b>Manager</b>, then <b>Invite</b>.
              </>,
            ]}
          />
          <p>
            Google says each person needs their own Google Account, so nobody has to share a
            password. Pending invitations are listed on the People and access page, where you can
            cancel one with <b>Cancel invitation</b>. More detail is in{" "}
            <GuideLink slug="add-manager-google-business-profile">
              how to add a manager to your Google Business Profile
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "make-primary",
      heading: "How do I make them the primary owner?",
      answer:
        "Once they have accepted, go to People and access, select the person, select Edit next to Access, choose Primary owner and select Save. Google says only the primary owner can transfer primary ownership.",
      body: (
        <Callout kind="warn" title="The 7-day wait">
          Google says a new owner or manager must wait 7 days before they can use all features.
          During those 7 days they may get an error if they try to delete or undelete the profile,
          remove other owners or managers, or make themselves or someone else the primary owner. If
          they leave within the first 7 days they are removed from the profile and need to be added
          again.
        </Callout>
      ),
    },
    {
      id: "selling",
      heading: "I am selling my business. What should I do with the profile?",
      answer:
        "Transfer primary ownership of the existing profile to the buyer. Google says this ensures your business information, like reviews, is kept, and Google allows only one profile per business, so the buyer should not start a new one.",
      body: (
        <>
          <Steps
            items={[
              "Add the buyer as an owner, using the email of their own Google Account.",
              "Wait until they have accepted. If Google shows an error at the next step, wait until 7 days have passed since they joined.",
              "Make the buyer the primary owner.",
              <>
                Remove yourself: in People and access, select yourself, then <b>Stop managing</b>{" "}
                and <b>Confirm</b>. Google says the primary owner cannot leave until they have
                handed over primary ownership.
              </>,
            ]}
          />
          <p>
            Google says your past replies to reviews and your posts stay on the profile after you
            leave. Check who else is listed in People and access, such as former staff or an agency,
            and let the new owner decide who stays.
          </p>
          <p>
            One exception: if the business is not continuing, and a different business now uses the
            premises, Google says the old profile should be marked permanently closed rather than
            renamed.
          </p>
        </>
      ),
    },
    {
      id: "owner-unavailable",
      heading: "An old employee or agency owns the profile. How do I get it back?",
      answer:
        "Ask them first to make you an owner and then primary owner, using the steps above. If they will not or cannot, request ownership from Google: Google sends the request to the current owner, who has 3 days to respond.",
      body: (
        <>
          <Steps
            items={[
              "Go to business.google.com/add and enter your business name and address.",
              <>
                Choose your business from the list. When you see "Someone else may manage this
                Business Profile", select <b>Request Access</b>.
              </>,
              <>
                Fill out the form and select <b>Submit</b>. You get a confirmation email, and the
                current owner is notified by email.
              </>,
              "If they approve, you can manage the profile. If they deny it, you get an email and can appeal, or suggest an edit to the profile.",
              <>
                If there is no answer after 3 days, Google says you may be able to claim the
                profile: open the confirmation email, select <b>View request</b>, then <b>Verify</b>
                . Google notes this option is not always available.
              </>,
            ]}
          />
          <p>
            For a business that travels to customers and has no shop or office customers visit,
            Google says to use its contact form instead and choose the issue about transferring
            ownership. If the problem is that you lost the login to your own account, Google points
            to its Accounts troubleshooter instead. Removing people afterwards is covered in{" "}
            <GuideLink slug="remove-old-employee-or-agency-from-google-profile">
              how to remove an old employee or agency from your Google profile
            </GuideLink>
            .
          </p>
        </>
      ),
    },
    {
      id: "agency-rules",
      heading: "Is an agency allowed to keep ownership of my profile?",
      answer:
        "An agency can be a co-owner only if you choose that: Google's third-party policies say the business decides whether a partner gets Co-Owner, Manager or no access, and that customers must retain ownership or co-ownership of their Business Profile at all times. When you end the service, Google says the agency must let you regain exclusive control within 7 business days.",
      body: (
        <p>
          Google lists keeping a profile hostage in exchange for money as a prohibited practice, and
          says third parties cannot remove your business from Google or access your profile without
          your permission. If an agency breaks these rules, Google says to report it through its
          Business Profile third-party violation complaint form.
        </p>
      ),
    },
    {
      id: "uk-uae",
      heading: "Is any of this different in the UK or the UAE?",
      answer:
        "Google's pages here name no separate rule for the UK or the UAE: its pages on owners, primary ownership and ownership requests give one set of steps and the same 3-day and 7-day rules, so a salon in Manchester and a cafe in Dubai follow the same process.",
      body: (
        <p>
          What may differ is what your sale agreement says. If you are buying a business, ask for
          the profile handover to be part of it, with the seller adding you as owner before
          completion so the 7 days have passed by the time you take over.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does and does not do here",
    body: (
      <>
        <p>
          Kabsi is added to your profile as a Manager, not an owner, so it cannot add or remove
          people, transfer ownership or delete a profile: only owners can. It never asks for your
          password. If someone else holds your profile when you set up, Kabsi shows what to do in
          each case, with a ready message asking an old employee or agency to make you an owner, and
          reminds you on day 3 and day 7 when you have asked Google for ownership.
        </p>
        <p>
          If Google sees someone else claiming your profile, Kabsi stops sending anything to Google
          and tells you what Google is asking. When a business changes hands, write to the Kabsi
          team at hello@kabsi.co about the Kabsi account, and the new owner can remove Kabsi at any
          time from People and access. <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Will the reviews stay when I transfer ownership?",
      a: "Yes, if you transfer primary ownership of the existing profile. Google says this ensures your business information, like reviews, is maintained.",
    },
    {
      q: "Why do I get an error when I try to make someone primary owner?",
      a: "Most likely one of you was added less than 7 days ago. Google says new owners and managers, and existing owners in their first 7 days, get an error if they try to transfer primary ownership.",
    },
  ],
  sources: [
    {
      title: "Google: Transfer primary ownership of a Business Profile",
      url: "https://support.google.com/business/answer/3415281?hl=en",
      read: READ,
    },
    {
      title: "Google: Manage your Business Profile owners & managers",
      url: "https://support.google.com/business/answer/3403100?hl=en",
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
      title: "Google: Business Profile third-party policies",
      url: "https://support.google.com/business/answer/7353941?hl=en",
      read: READ,
    },
    {
      title: "Google: Tips for working with third parties to manage your Business Profile",
      url: "https://support.google.com/business/answer/7163406?hl=en",
      read: READ,
    },
    {
      title: "Google: Overview of Google Business Profile policies",
      url: "https://support.google.com/business/answer/13762416?hl=en",
      read: READ,
    },
  ],
  industries: ["hair-salon", "restaurant", "cafe", "gym-and-fitness"],
  related: [
    "remove-old-employee-or-agency-from-google-profile",
    "add-manager-google-business-profile",
    "duplicate-google-listings",
  ],
  summary:
    "How to transfer primary ownership of a Google Business Profile: add the person, make them primary owner, the 7-day wait, selling a business, and requesting ownership back.",
};
