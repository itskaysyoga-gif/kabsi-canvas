// The "Pick your business" row on Home (brief section 16, item 1). Each choice swaps the example in the hero story
// and the tappable demo, and links to that trade's page or hub. Every business and person is invented (Example).
// Replies use only what the review said: no promised fix, no invented fact (brief section 14.4). Clinic and dental
// replies never confirm the writer is a patient, so they carry no name.
import { PHOTOS, type Photo } from "@/components/kabsi/photos";
import { industry, type Industry } from "./industries";

export type HomeExample = {
  id: string;
  /** The chip. */
  label: string;
  /** Where "See Kabsi for ..." goes. */
  to: string;
  /** "Kabsi for restaurants" */
  linkLabel: string;
  business: string;
  photo: Photo;
  /** The hero story: a 5-star review and its reply. */
  hero: { name: string; quote: string; draft: string };
  /** The tappable demo: a 4-star review with one complaint. */
  demo: { name: string; quote: string; draft: string };
  /** The nearby card under "The Google work, done for you". */
  nearby: { example: Industry["example"]; keyword: string };
};

const fromIndustry = (slug: string) => {
  const i = industry(slug)!;
  return { business: i.example.business, nearby: { example: i.example, keyword: i.keyword } };
};

export const HOME_EXAMPLES: HomeExample[] = [
  {
    id: "salon",
    label: "Salon",
    to: "/for/hair-salon",
    linkLabel: "Kabsi for hair salons",
    ...fromIndustry("hair-salon"),
    photo: PHOTOS.salonWash,
    hero: {
      name: "Layla K.",
      quote: "Hana did my colour and it is exactly what I asked for.",
      draft: "Thank you, Layla. We will pass this on to Hana. See you at your next visit.",
    },
    demo: {
      name: "Maya",
      quote: "Lovely blow dry, but I waited 15 minutes past my time.",
      draft:
        "Thank you, Maya. Glad you loved the blow dry, and sorry about the wait. See you next time.",
    },
  },
  {
    id: "barber",
    label: "Barber",
    to: "/for/barbershop",
    linkLabel: "Kabsi for barbershops",
    ...fromIndustry("barbershop"),
    photo: PHOTOS.barberCut,
    hero: {
      name: "Omar S.",
      quote: "Sami took his time on the fade and the beard line is perfect.",
      draft: "Thank you, Omar. We will tell Sami. See you for the next one.",
    },
    demo: {
      name: "Dan",
      quote: "Great cut, but nobody said hello when I walked in.",
      draft: "Thank you, Dan. Glad you liked the cut, and sorry nobody greeted you at the door.",
    },
  },
  {
    id: "restaurant",
    label: "Restaurant",
    to: "/for/restaurant",
    linkLabel: "Kabsi for restaurants",
    ...fromIndustry("restaurant"),
    photo: PHOTOS.restaurantDining,
    hero: {
      name: "Nadia R.",
      quote: "The grilled sea bass was perfect, and they found us a table at 9 on a Friday.",
      draft: "Thank you, Nadia. We will tell the kitchen about the sea bass. See you again soon.",
    },
    demo: {
      name: "Karim",
      quote: "Lovely food, but the mains took 40 minutes on Friday night.",
      draft:
        "Thank you, Karim. Glad you enjoyed the food, and sorry the mains took so long on Friday.",
    },
  },
  {
    id: "cafe",
    label: "Cafe",
    to: "/for/cafe",
    linkLabel: "Kabsi for cafes",
    ...fromIndustry("cafe"),
    photo: PHOTOS.cafeBarista,
    hero: {
      name: "Priya D.",
      quote: "The best flat white on this street, and the cardamom buns are still warm at 8.",
      draft: "Thank you, Priya. We will save you a cardamom bun. See you tomorrow morning.",
    },
    demo: {
      name: "Tom",
      quote: "Good coffee, but the queue at 8 was out of the door.",
      draft: "Thank you, Tom. Glad you liked the coffee, and sorry about the long queue at 8.",
    },
  },
  {
    id: "clinic",
    label: "Clinic",
    to: "/for/medical-and-aesthetic-clinic",
    linkLabel: "Kabsi for clinics",
    ...fromIndustry("medical-and-aesthetic-clinic"),
    photo: PHOTOS.aestheticTreatment,
    hero: {
      name: "S. M.",
      quote: "Friendly front desk, and they called me back the same afternoon.",
      draft: "Thank you for your kind words about our front desk team. We will pass them on.",
    },
    demo: {
      name: "J. K.",
      quote: "Very clean and modern, but parking nearby is hard to find.",
      draft: "Thank you for your review, and sorry that parking was hard to find.",
    },
  },
  {
    id: "dentist",
    label: "Dentist",
    to: "/for/dental-clinic",
    linkLabel: "Kabsi for dental clinics",
    ...fromIndustry("dental-clinic"),
    photo: PHOTOS.dentistPatient,
    hero: {
      name: "H. A.",
      quote: "Booked a Saturday morning online in two minutes, and reception was lovely.",
      draft:
        "Thank you for taking the time to write. We will pass your words on to our reception team.",
    },
    demo: {
      name: "R. P.",
      quote: "Calm and on time, but the phone line was busy all morning.",
      draft: "Thank you for your review, and sorry the phone line was hard to get through.",
    },
  },
  {
    id: "auto",
    label: "Auto repair",
    to: "/for/auto-repair",
    linkLabel: "Kabsi for garages",
    ...fromIndustry("auto-repair"),
    photo: PHOTOS.autoGarage,
    hero: {
      name: "Tom W.",
      quote: "They showed me the worn brake pads before they changed them. Fair price.",
      draft: "Thank you, Tom. Glad it helped to see the pads first. Drive safe.",
    },
    demo: {
      name: "Ali",
      quote: "Good service, but the car was ready an hour later than they said.",
      draft:
        "Thank you, Ali. Glad the service went well, and sorry it took an hour longer than we said.",
    },
  },
  {
    id: "gym",
    label: "Gym",
    to: "/for/gym-and-fitness",
    linkLabel: "Kabsi for gyms",
    ...fromIndustry("gym-and-fitness"),
    photo: PHOTOS.gymTraining,
    hero: {
      name: "Reem A.",
      quote: "The coaches remember my name and fix my form every single session.",
      draft: "Thank you, Reem. Our coaches will be glad to read this. See you on the floor.",
    },
    demo: {
      name: "Chris",
      quote: "Great classes, but the showers were cold twice this week.",
      draft: "Thank you, Chris. Glad you enjoy the classes, and sorry about the cold showers.",
    },
  },
  {
    id: "hotel",
    label: "Hotel",
    to: "/for/hospitality",
    linkLabel: "Kabsi for hotels",
    business: "Linden House Hotel",
    photo: PHOTOS.phoneReading,
    hero: {
      name: "Marco B.",
      quote: "A quiet room, and breakfast on the terrace was the best part of the stay.",
      draft: "Thank you, Marco. We are glad you enjoyed the terrace. We hope to welcome you back.",
    },
    demo: {
      name: "Elena",
      quote: "Lovely staff, but the wifi was slow on the top floor.",
      draft: "Thank you, Elena. Glad you liked the team, and sorry the wifi was slow upstairs.",
    },
    nearby: {
      keyword: "hotel",
      example: {
        business: "Linden House Hotel",
        city: "London",
        kind: "hotel",
        rival: "The Harbour Inn",
        rival2: "Old Town Rooms",
        near: ["By the harbour", "Near the old town"],
      },
    },
  },
  {
    id: "home",
    label: "Home services",
    to: "/for/home-services",
    linkLabel: "Kabsi for home services",
    business: "Brightline Plumbing",
    photo: PHOTOS.phoneTyping,
    hero: {
      name: "Grace L.",
      quote: "Came the same afternoon and fixed the leak under the sink in 20 minutes.",
      draft: "Thank you, Grace. Glad the leak is fixed. Keep our number for next time.",
    },
    demo: {
      name: "Sam",
      quote: "Good job on the boiler, but nobody called to say he was running late.",
      draft: "Thank you, Sam. Glad the boiler is working, and sorry nobody called about the delay.",
    },
    nearby: {
      keyword: "plumber",
      example: {
        business: "Brightline Plumbing",
        city: "Manchester",
        kind: "office",
        rival: "Rapid Flow Plumbers",
        rival2: "Hometown Heating",
        near: ["Across the river", "By the ring road"],
      },
    },
  },
  {
    id: "shop",
    label: "Shop",
    to: "/for/retail",
    linkLabel: "Kabsi for shops",
    business: "Paper Fern Gifts",
    photo: PHOTOS.phoneShop,
    hero: {
      name: "Hannah J.",
      quote: "Found the perfect birthday present, and they wrapped it while I waited.",
      draft: "Thank you, Hannah. We hope the birthday was a happy one.",
    },
    demo: {
      name: "Joe",
      quote: "Lovely shop, but it was closed when I came at 5.",
      draft: "Thank you, Joe, and sorry the door was closed. We are glad you like the shop.",
    },
    nearby: {
      keyword: "gift shop",
      example: {
        business: "Paper Fern Gifts",
        city: "London",
        kind: "shop",
        rival: "The Gift Box",
        rival2: "Wrap and Ribbon",
        near: ["On the high street", "By the station"],
      },
    },
  },
];

export const HOME_EXAMPLE_IDS = HOME_EXAMPLES.map((e) => e.id);
export const homeExample = (id: string) =>
  HOME_EXAMPLES.find((e) => e.id === id) ?? HOME_EXAMPLES[0]!;
