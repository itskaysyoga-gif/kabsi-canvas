import { PHOTOS } from "@/components/kabsi/photos";
import type { Industry } from "./types";

// Content 1: finished from docs/claims/barbershop.md, approved by lane R on 27 Oct 2026 (brief section 18). Northside Barbers is
// invented (Example). Every fact on this page has a row in the claim sheet; advice and wording are marked there.
export const barbershop: Industry = {
  slug: "barbershop",
  hub: "beauty-and-wellness",
  name: "barbershop",
  plural: "Barbershops",
  finished: true,
  lead: "Kabsi keeps your hours true on bank holiday Mondays, replies to reviews that name the barber who cut, and posts when a chair is free. You approve each one on WhatsApp.",
  keyword: "barber",
  example: {
    business: "Northside Barbers",
    city: "London",
    kind: "shop",
    rival: "Sharp and Co",
    rival2: "Fade Street Barbers",
    near: ["By the bus station", "Near the market"],
  },
  photos: [PHOTOS.barberCut, PHOTOS.barberShave],
  focus: "50% 40%",
  searches: [
    "barber",
    "barber shop near me",
    "men's haircut",
    "skin fade",
    "beard trim",
    "walk in barber",
    "kids haircut",
    "hot towel shave",
  ],
  tasks: [
    {
      title: "Keep the door hours and the holiday hours true",
      text: "Google keeps weekly hours apart from special hours, so a bank holiday Monday or the day after Eid can differ without touching the normal week. Kabsi asks, then sets them once you say Yes.",
    },
    {
      title: "Thank the barber who earned it",
      text: "A review that says 'ask for Sami' gets a reply that passes the thanks to Sami. Kabsi uses only the names on the team list you gave it, so a barber who left is never named by mistake.",
    },
    {
      title: "Price every cut and shave",
      text: "Google can show each service with a price and a short description: skin fade, beard line up, hot towel shave, the under 12 cut. Google rejects a service name that has a price in it.",
    },
    {
      title: "Post the free chair",
      text: "Two chairs open until 5 is a post, with a button to your website or booking page. Google archives posts after six months unless dates are set, so last year's chair offer does not linger.",
    },
    {
      title: "Show this week's work",
      text: "A fade from the side, a beard line from the front, in daylight. Photos go up as JPG or PNG, in focus and well lit. Kabsi flags a photo where a customer's face fills the frame.",
    },
  ],
  categories: {
    primary: "Barber shop",
    more: [],
    note: "Barber shop is a category of its own in Google's list, apart from the one for hair salons. Choose the most specific category that fits, and add a second only for work you really do in the shop. Google can show one category under different names in different countries, so read the name in the box on your own profile.",
  },
  reviewThemes: [
    {
      theme: "The barber, by name",
      text: "'Ask for Sami.' The reply thanks the writer and passes it on to Sami, so the next regular hears the name again.",
    },
    {
      theme: "The queue on a Saturday",
      text: "Walk-in shops make people wait. The reply says sorry for the wait once and gives no reason it cannot back up.",
    },
    {
      theme: "A cut that was not what they asked for",
      text: "The reply stays short, offers to put it right and points to the contact details on the profile. A phone number or link written into a reply can make Google reject it.",
    },
    {
      theme: "The price at the till",
      text: "A surprise at the end of the cut. The reply points to the price list on the profile once and does not argue about the amount.",
    },
  ],
  story: {
    title: "A new barber and new prices, in one reply.",
    lead: "Once a month Kabsi asks what has changed. You answer in a line and the prices and the post are ready for your yes.",
    lines: [
      {
        from: "kabsi",
        text: "Northside Barbers: any new services, prices, products or opening times this month?",
      },
      {
        from: "owner",
        text: "Skin fade is now 22 pounds. Under 12s 14. Dan joins on Saturdays.",
      },
      {
        from: "kabsi",
        text: "Ready: skin fade at 22 pounds and under 12 cut at 14 pounds on your price list, and a post: 'Dan joins the team on Saturdays. Walk in or book on our page.' Reply Yes for both.",
        buttons: ["Yes", "Edit", "Skip"],
      },
      { from: "owner", text: "Yes" },
      {
        from: "kabsi",
        text: "Sent to Google. I check that the prices and the post show on your profile, then tell you.",
      },
    ],
  },
  posts: [
    "Two chairs free until 5 today, no booking needed.",
    "A new barber joins on Saturdays: their name and the cuts they love.",
    "Hours for the bank holiday weekend, with the last walk in time.",
    "Back to school cuts for under 12s, with the price.",
  ],
  photoTips: [
    {
      title: "A finished cut, from two sides",
      text: "The side and the back, in daylight, close enough to see the line. Kabsi flags a photo where a customer's face fills the frame, so the page shows the work, not the person.",
    },
    {
      title: "The chairs and the mirror row",
      text: "A first visit starts with where to sit. Show how many chairs there are and how the shop looks at ten in the morning.",
    },
    {
      title: "The front of the shop",
      text: "Google says an outside photo helps customers recognise your business when they come. Take it from across the street, with the sign and the door.",
    },
  ],
  holidays: [
    {
      when: "Eid al-Fitr and Eid al-Adha, UAE",
      text: "Eid al-Fitr is 1 to 3 Shawwal and Eid al-Adha 10 to 12 Dhu al-Hijjah, with Arafah Day the day before. The moon sets the dates, so Kabsi asks five days ahead and you tell it the days the shop opens.",
    },
    {
      when: "Ramadan, UAE",
      text: "Private sector working hours in the UAE are cut by two hours a day for the month. Decide the shop's hours for the whole month once, so the profile never shows the old closing time.",
    },
    {
      when: "UK: the Easter weekend",
      text: "In 2027 Good Friday is 26 March and Easter Monday is 29 March in England and Wales. Hours for both days go on Google, with the last walk in time in a post.",
    },
    {
      when: "UAE National Day, 2 and 3 December",
      text: "Two public holidays. Special hours go on a few days before, and a post says if the shop opens late.",
    },
  ],
  faqs: [
    {
      q: "Will a reply know which barber did the cut?",
      a: "Only when the review says so and the name is on the team list you gave Kabsi. A name that is not on the list is never used.",
    },
    {
      q: "Can Kabsi run my walk-in queue or take bookings?",
      a: "No. Kabsi looks after your Google profile: hours, prices, replies, posts and photos. It keeps your booking link right but it is not a booking system.",
    },
    {
      q: "A customer says the cut was bad. What does the reply say?",
      a: "It thanks them for telling you, names the problem in one sentence and asks them to get in touch through the details on your profile. It never argues and never offers a free cut to change a review.",
    },
    {
      q: "Can I give a free trim to anyone who leaves a review?",
      a: "No. Google does not allow free or discounted services in exchange for a review. Kabsi gives your barbers a ready message with your review link to forward after a real visit, and never receives a customer's number.",
    },
  ],
  guides: ["how-to-get-more-google-reviews", "how-to-set-holiday-hours-on-google"],
};
