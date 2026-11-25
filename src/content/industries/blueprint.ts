// SITE-2 (blueprint 3.1 section 5): every industry page is one template. Each page changes only three things, all here:
// the headline noun (the industry's own `name`), one example review with Kabsi's reply, and one sourced fact. The
// reviewers, businesses and reviews are invented and labelled Example on the page. Each fact is one sentence of a Google
// help page, read on READ (checked by an independent agent against the page, 24 Nov 2026). No Arabic, no statistics.
export const READ = "2026-11-24";

export type Source = { title: string; url: string };
export type TradeBlueprint = {
  review: { stars: 1 | 2 | 3 | 4 | 5; name: string; text: string };
  /** Kabsi's reply, in the owner's voice, waiting for the owner's yes. */
  reply: string;
  fact: { text: string; source: Source };
};

const g = (n: number | string) => `https://support.google.com/business/answer/${n}`;
const S = {
  services: { title: "Google: Manage your services on your Business Profile", url: g(9455399) },
  special: { title: "Google: How to set Special hours", url: g(6303076) },
  hours: { title: "Google: Edit your Business Profile", url: g(3039617) },
  posts: { title: "Google: Create and manage posts on your Business Profile", url: g(7342169) },
  photos: { title: "Google: Manage your Business Profile photos and videos", url: g(6103862) },
  link: { title: "Google: Set up bookings through a provider", url: g(7475773) },
  area: {
    title: "Google: Manage your service areas for service-area and hybrid businesses",
    url: g(9157481),
  },
  menu: {
    title: "Google Business Profile: Restaurant solutions",
    url: "https://business.google.com/en-all/business-profile/restaurants/",
  },
} as const;

const F = {
  services: {
    text: "Google lets each service carry info such as a price and a description.",
    source: S.services,
  },
  priceName: {
    text: "Google says to avoid prices in custom service names. Put the price in the price field.",
    source: S.services,
  },
  special: {
    text: "Google lets you schedule special hours for holidays, special events and other exceptional circumstances.",
    source: S.special,
  },
  moreHours: {
    text: "Google says that if you have different hours for different features you offer, you can set more hours.",
    source: S.hours,
  },
  posts: {
    text: "Google archives posts older than 6 months unless a date range is set.",
    source: S.posts,
  },
  photos: {
    text: "Google says a photo should be in focus and well lit, with no significant alterations or excessive use of filters.",
    source: S.photos,
  },
  link: {
    text: "Google says you can add your own booking link to your Business Profile.",
    source: S.link,
  },
  area: {
    text: "Google lets you set up to 20 service areas, based on the cities, postal codes or other areas you serve.",
    source: S.area,
  },
  menu: {
    text: "Google says you can help customers discover what you serve by adding photos of your menu and best dishes.",
    source: S.menu,
  },
} as const;

export const BLUEPRINT: Record<string, TradeBlueprint> = {
  "hair-salon": {
    review: {
      stars: 5,
      name: "Dana",
      text: "Amber did my colour and it is exactly what I asked for. The salon was calm and she explained every step.",
    },
    reply:
      "Thank you, Dana. I will tell Amber, she will be glad it came out the way you hoped. We look forward to seeing you again.",
    fact: F.services,
  },
  barbershop: {
    review: {
      stars: 5,
      name: "Marcus",
      text: "Best fade I have had in years. Quick, tidy and no waiting past my slot.",
    },
    reply:
      "Thank you, Marcus. Glad the fade was just right and the wait was short. See you for the next one.",
    fact: F.photos,
  },
  "nail-salon": {
    review: {
      stars: 4,
      name: "Priya",
      text: "Lovely gel set and a relaxed room. I waited about 15 minutes past my booking.",
    },
    reply:
      "Thank you, Priya, and sorry about the wait past your booking. We will keep a closer eye on timings. Glad you liked the set.",
    fact: F.link,
  },
  "beauty-salon": {
    review: {
      stars: 5,
      name: "Hannah",
      text: "Facial and brow shaping were both perfect. Friendly staff and everything was clean.",
    },
    reply:
      "Thank you, Hannah. We are pleased the facial and brows were what you wanted. You are welcome back any time.",
    fact: F.priceName,
  },
  "spa-and-massage": {
    review: {
      stars: 5,
      name: "Ellis",
      text: "The deep tissue massage helped my shoulders a lot. Quiet room, and I never felt rushed.",
    },
    reply:
      "Thank you, Ellis. We are glad the massage helped and that the room felt calm. Take care of those shoulders.",
    fact: F.posts,
  },
  "dental-clinic": {
    review: {
      stars: 5,
      name: "Tom",
      text: "Nervous about my check up, but the team put me at ease and explained everything.",
    },
    reply:
      "Thank you, Tom. We are glad you felt at ease. If you have any questions about your visit, please get in touch through the details on our profile.",
    fact: F.link,
  },
  "medical-and-aesthetic-clinic": {
    review: {
      stars: 4,
      name: "Sofia",
      text: "Clear consultation and a comfortable room. The reception line was busy when I rang to book.",
    },
    reply:
      "Thank you, Sofia. We are glad the consultation was clear. Sorry the line was busy, and we will look at how we answer calls.",
    fact: F.photos,
  },
  physiotherapy: {
    review: {
      stars: 5,
      name: "Greg",
      text: "My knee is much better after six sessions. The exercises were explained well and easy to follow.",
    },
    reply:
      "Thank you, Greg. It is good to hear your knee is better. Keep up the exercises, and get in touch if you have questions.",
    fact: F.moreHours,
  },
  restaurant: {
    review: {
      stars: 5,
      name: "Claire",
      text: "Sunday lunch was superb. The lamb was perfect and the staff looked after our table of six.",
    },
    reply:
      "Thank you, Claire. We are so glad the lamb and the service were just right for your table of six. We hope to see you for another Sunday lunch.",
    fact: F.menu,
  },
  cafe: {
    review: {
      stars: 4,
      name: "Jamal",
      text: "Great flat white and a warm room. It was very busy at 8 so I waited a while.",
    },
    reply:
      "Thank you, Jamal. Glad you enjoyed the flat white. Mornings around 8 are our busiest, and we are sorry about the wait.",
    fact: F.special,
  },
  bakery: {
    review: {
      stars: 5,
      name: "Ruth",
      text: "The sourdough was still warm and the birthday cake was beautiful. Thank you.",
    },
    reply:
      "Thank you, Ruth. We are delighted the sourdough and the birthday cake made your day. Come back soon.",
    fact: F.photos,
  },
  "auto-repair": {
    review: {
      stars: 5,
      name: "Neil",
      text: "They found the brake fault quickly, told me the price first and had the car ready on time.",
    },
    reply:
      "Thank you, Neil. We like to agree the price before we start, and we are glad the car was ready when promised. Drive safe.",
    fact: F.services,
  },
  "gym-and-fitness": {
    review: {
      stars: 5,
      name: "Alicia",
      text: "Friendly coaches and the morning classes are well run. I feel stronger every month.",
    },
    reply:
      "Thank you, Alicia. We will pass this on to the coaches. It is great to hear you are feeling stronger.",
    fact: F.posts,
  },
  "lash-and-brow-studio": {
    review: {
      stars: 5,
      name: "Maya",
      text: "My lashes look natural and the appointment was relaxing. Booked my next fill already.",
    },
    reply:
      "Thank you, Maya. We are happy you like the natural look. We will see you for your next fill.",
    fact: F.photos,
  },
  "tattoo-studio": {
    review: {
      stars: 5,
      name: "Owen",
      text: "Careful, clean work and a clear talk about aftercare. The design is just what I pictured.",
    },
    reply:
      "Thank you, Owen. We are glad the design matches what you pictured. Follow the aftercare sheet, and get in touch with any questions.",
    fact: F.photos,
  },
  "pet-grooming": {
    review: {
      stars: 5,
      name: "Beth",
      text: "My terrier came back calm and smelling great. They sent a photo halfway through.",
    },
    reply:
      "Thank you, Beth. We are pleased your terrier was calm and that the photo was welcome. See you both next time.",
    fact: F.area,
  },
  "veterinary-clinic": {
    review: {
      stars: 5,
      name: "Sam",
      text: "Kind with my nervous dog and clear about the treatment plan. Thank you for fitting us in.",
    },
    reply:
      "Thank you, Sam. We are glad we could fit you in and that your dog was looked after kindly. Please get in touch if you have any questions.",
    fact: F.moreHours,
  },
  "car-wash": {
    review: {
      stars: 4,
      name: "Ravi",
      text: "The interior clean was excellent. There was a queue on Saturday but the team kept it moving.",
    },
    reply:
      "Thank you, Ravi. We are glad the interior came out well, and sorry about the Saturday queue. We will keep it moving.",
    fact: F.area,
  },
  florist: {
    review: {
      stars: 5,
      name: "Isla",
      text: "The bouquet for my mum was stunning and arrived fresh. Thank you for the lovely note.",
    },
    reply:
      "Thank you, Isla. We are so glad the bouquet arrived fresh and that your mum liked it. We enjoyed making it.",
    fact: F.posts,
  },
  optician: {
    review: {
      stars: 5,
      name: "Kate",
      text: "Thorough eye test and no pressure when I chose frames. They adjusted the fit on the spot.",
    },
    reply:
      "Thank you, Kate. We are glad you could take your time over the frames and that the fit feels right. Please come back if anything needs adjusting.",
    fact: F.link,
  },
  "yoga-and-pilates-studio": {
    review: {
      stars: 5,
      name: "Lena",
      text: "A calm studio and clear teaching. The beginner class made me feel welcome.",
    },
    reply:
      "Thank you, Lena. We are happy the beginner class felt welcoming. We hope to see you on the mat again soon.",
    fact: F.moreHours,
  },
  cleaner: {
    review: {
      stars: 5,
      name: "Paul",
      text: "They turned up on time, the whole house was spotless and they were careful with our things.",
    },
    reply:
      "Thank you, Paul. We are glad the team arrived on time and took care of your home. We will see you at the next visit.",
    fact: F.area,
  },
};
