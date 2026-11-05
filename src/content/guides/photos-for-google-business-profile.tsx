import { Callout, DoDont, Steps } from "@/components/marketing/guide-kit";
import { GuideLink, SiteRef } from "@/components/marketing/guide-links";
import { scheduledAt } from "./schedule";
import type { GuideDoc } from "./types";

// Guides 3, guide 9. Every claim about Google is from the sources below, read on 5 Nov 2026.
const READ = "2026-11-05";

export const guide: GuideDoc = {
  slug: "photos-for-google-business-profile",
  title: "Which photos should I add to my Google Business Profile?",
  description:
    "The photos Google asks a business for, the size and format it wants, how to set a cover photo and logo, and what Google does not accept.",
  publishAt: scheduledAt(8),
  updated: READ,
  checked: READ,
  topic: "Photos",
  answer:
    "Start with a logo, a cover photo, and at least three photos each of the outside, the inside, your work and what you sell, which is what Google's own tips ask for. Take them yourself at the business, in focus and well lit, as JPG or PNG files between 10 KB and 5 MB.",
  inShort: [
    "Google recommends 720 by 720 pixels and accepts photos from 250 by 250.",
    "Photos show on Google only after your profile is verified, and can take 24 to 48 hours to appear.",
    "Google decides which photo shows first: choosing a cover photo does not promise it leads.",
    "Avoid screenshots, stock photos, collages, borders, added text and heavy filters.",
  ],
  sections: [
    {
      id: "which-first",
      heading: "Which photos should I add first?",
      answer:
        "Add a logo and a cover photo, then the kinds of photo Google lists for businesses: exterior, interior, product, at work, food and drink, and team. For most of these Google's tips say to add at least three, because customers use them when they decide whether to come.",
      body: (
        <ul>
          <li>
            <b>Exterior:</b> at least three, taken from each direction customers approach, and at
            different times of day, so people recognise the door when they arrive.
          </li>
          <li>
            <b>Interior:</b> at least three that truthfully show what it is like to stand inside as a
            customer.
          </li>
          <li>
            <b>Product:</b> at least three of your most popular items, evenly lit.
          </li>
          <li>
            <b>At work:</b> at least three of your team doing the services you offer, including any
            speciality.
          </li>
          <li>
            <b>Food and drink:</b> at least three of your most popular dishes or drinks.
          </li>
          <li>
            <b>Team:</b> at least three of you and your staff. Google suggests something a little
            less formal.
          </li>
        </ul>
      ),
    },
    {
      id: "size-format",
      heading: "What size and format does Google want?",
      answer:
        "Google says photos look best as JPG or PNG files between 10 KB and 5 MB, with a recommended resolution of 720 pixels tall and 720 pixels wide and a minimum of 250 by 250. They should be in focus, well lit and represent reality, with no significant alterations or excessive filters or AI.",
      body: (
        <>
          <p>
            A photo straight from a recent phone is usually far above the minimum size. If the file
            is larger than 5 MB, share or export a smaller copy from your phone before you upload it.
          </p>
          <p>
            For videos Google asks for up to 30 seconds, up to 75 MB, and a resolution of 720p or
            higher. If your business has 10 or more locations, Google lets you upload photos in bulk
            through a spreadsheet.
          </p>
        </>
      ),
    },
    {
      id: "cover-logo",
      heading: "How do I set a cover photo and a logo?",
      answer:
        "On a computer, search your business name and city on Google Search or Maps while signed in, select Photos, then Add a cover photo or Add a logo; Change cover and Change logo replace them later. Google says the cover photo is not always the first image shown, and the logo is highlighted for businesses that have their basic information filled in.",
      body: (
        <>
          <p>
            Choose a cover photo that best represents the business, usually the outside or the
            inside at its best. Google says that if the cover photo is low quality, or other sources
            suggest it is not the best photo of the business, a photo from a customer may be shown
            instead.
          </p>
          <Callout kind="tip" title="Logo not showing?">
            Google says to check that your profile has its name, a valid location with a street
            address, categories, a phone number and opening hours. With those in place, the logo can
            show.
          </Callout>
        </>
      ),
    },
    {
      id: "how-to-add",
      heading: "How do I add photos to my profile?",
      answer:
        "Sign in to the account that manages your profile, search your business name and city on Google Search or Maps, select Photos and then Add photos, and choose one or several files. Google reviews each one, so it shows as Pending, then Live or Not approved.",
      body: (
        <>
          <Steps
            items={[
              "Open Google Search or Maps on a computer, signed in to the account that manages the profile.",
              "Search your business name and city.",
              "Select Photos, then Add photos.",
              "Choose your photos or videos. You can pick several at once.",
              "Check back after a day or two: Google says it can take 24 to 48 hours before photos and videos show.",
            ]}
          />
          <p>
            Pending means the photo is still uploading or processing, or that the profile is not
            verified. Not approved means it was flagged under Google's photo and video policies.
            Your newest photos appear first. If a photo does not appear, Google suggests checking
            that it is not a duplicate and uploading it again.
          </p>
        </>
      ),
    },
    {
      id: "what-not",
      heading: "What kind of photos does Google not want?",
      answer:
        "Google's tips for photos on Maps ask for media you captured yourself at the place, with the place as the main subject. They say to avoid screenshots, stock photos, GIFs, collages, heavily edited photos, images made by others, borders and added text, and that low quality photos may be removed without appeal.",
      body: (
        <DoDont
          yesTitle="Photos that work"
          noTitle="Photos to leave out"
          yes={[
            "Your own photo of the shop front from the street customers use.",
            "The inside during opening hours, lit the way customers see it.",
            "A finished haircut, a plated dish or a repaired car, taken in your place.",
            "Light fixes only, such as turning the photo upright or brightening it.",
          ]}
          no={[
            "Screenshots, stock photos and pictures from other websites.",
            "Collages, frames, or prices and slogans written on the photo.",
            "Dark, blurry or sideways photos.",
            "Selfies where a person, not the business, is the subject.",
          ]}
        />
      ),
    },
    {
      id: "by-trade",
      heading: "Which photos matter most for my kind of business?",
      answer:
        "Lead with the kinds of photo your customers decide on. Google's own descriptions point the way: food and drink photos help people plan where to eat, photos at work show the type of work you do, and exterior photos help people find you.",
      body: (
        <ul>
          <li>
            <b>Restaurants and cafes:</b> food and drink, the inside, and the front. Menu photos sit
            in the Menu tab; how to keep the menu itself right is in{" "}
            <GuideLink slug="add-services-and-prices-to-google">
              how to add services and prices to your Google Business Profile
            </GuideLink>
            .
          </li>
          <li>
            <b>Hair salons, barbers and nail salons:</b> at work and finished results, the team, and
            the inside. Ask before a customer's face appears in any photo.
          </li>
          <li>
            <b>Garages:</b> the outside and the entrance to the workshop, the team at work, and the
            reception area.
          </li>
          <li>
            <b>Clinics and spas:</b> the inside, treatment rooms and the team. Leave patients and
            clients out.
          </li>
        </ul>
      ),
    },
    {
      id: "remove",
      heading: "How do I remove a photo, including one a customer added?",
      answer:
        "To remove your own photo, open Photos on your profile, select the photo, select Delete and confirm. For a photo a customer added, Google says you can request its removal, and for menus it says to flag an out of date customer menu photo and upload an accurate one yourself.",
      body: (
        <p>
          Google's rules on these pages are the same for a business in the UK and in the UAE: the
          same formats, sizes and content policy. Google also says you are responsible for making
          sure your photos comply with all applicable laws, so ask staff and customers before you
          show them.
        </p>
      ),
    },
  ],
  kabsi: {
    heading: "What Kabsi does here",
    body: (
      <>
        <p>
          On Photos you, a manager or your staff add up to 20 photos at a time from the phone's
          camera or gallery, as JPG, PNG, WebP or HEIC, up to 20 MB each. Kabsi turns each one
          upright, resizes it to Google's limits and saves a clean copy, so the location, the phone
          model and the date taken never reach Google. It never draws on, generates or edits a
          photo beyond that. The photo check then flags five things as notes, not blocks: a photo
          that is dark, blurry, smaller than 720 by 720 pixels, looks like one you already added,
          or looks like a phone screenshot. It does not look for faces, and you choose what each
          photo shows (Outside, Inside, Team, At work, Product, Food and drink, Menu or Other).
        </p>
        <p>
          You can mark a photo as Preferred cover photo or Logo; Kabsi says "preferred" because
          Google decides which photo shows first. Each photo goes to Google only after your yes, a
          photo Kabsi put on Google can be taken off again with Remove from Google, and you can send
          photos on WhatsApp too. Sending videos to Google comes later.{" "}
          <SiteRef to="/scan">Run the free check</SiteRef>.
        </p>
      </>
    ),
  },
  faqs: [
    {
      q: "Can customers add photos to my profile?",
      a: "Yes. Google says both you and your customers can upload photos to your profile. You cannot delete a customer's photo the way you delete your own, but Google says you can request its removal.",
    },
    {
      q: "Can I use photos from my website or Instagram?",
      a: "Only if you took them yourself at your business. Google's tips ask for media you captured at the place and say to avoid imagery created by other parties, stock photos and heavily edited photos.",
    },
  ],
  sources: [
    {
      title: "Google: Manage your Business Profile photos & videos",
      url: "https://support.google.com/business/answer/6103862?hl=en",
      read: READ,
    },
    {
      title: "Google: Tips for business-specific photos on your Business Profile",
      url: "https://support.google.com/business/answer/6123536?hl=en",
      read: READ,
    },
    {
      title: "Google: Business Profile photos, videos & posts content policy",
      url: "https://support.google.com/business/answer/7213077?hl=en",
      read: READ,
    },
    {
      title: "Google Maps: Tips for posting media to Maps",
      url: "https://support.google.com/contributionpolicy/answer/7411351?hl=en",
      read: READ,
    },
    {
      title: "Google: Complete your Business Profile on Google",
      url: "https://support.google.com/business/answer/10515606?hl=en",
      read: READ,
    },
  ],
  industries: ["restaurant", "hair-salon", "nail-salon", "auto-repair"],
  related: [
    "google-posts-for-local-businesses",
    "google-profile-checklist-restaurants-cafes",
    "google-profile-checklist-hair-salons-barbers",
  ],
  summary:
    "Which photos to add to a Google Business Profile (logo, cover, exterior, interior, product, at work, food and drink, team), Google's size and format rules, and what Google does not accept.",
};
