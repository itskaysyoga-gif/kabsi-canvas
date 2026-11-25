// SITE-5 (lane R decision 2, 25 Nov 2026; widens blueprint 3.1 section 5): each industry page has a block "What Kabsi
// does for a <trade>" with three examples true for that trade, and three questions of that trade in its FAQ. Every line
// stays within what Kabsi does today (knowledge/facts 04 and 09): replies written for the owner's yes, hours and holiday
// hours changed after a message, posts from the owner's photos (up to 2 a month), the website, booking and menu links
// on the profile checked every day, the phone and hours watched, and the review link and QR code. Health and safety
// reviews get no draft. Nothing promises reviews, rankings or customers. Every business and person is an Example.

export type TradeWork = {
  /** The Example post under "Send a photo. Get a Google post." for this trade. */
  post: string;
  /** Three short examples: a title and one or two sentences. */
  does: readonly { title: string; text: string }[];
  /** Three questions an owner of this trade asks. */
  faq: readonly { q: string; a: string }[];
};

const HEALTH =
  "A review about an illness, an injury or a safety problem gets no ready reply. Kabsi flags it for you to answer in your own words.";

export const TRADE_WORK: Record<string, TradeWork> = {
  "hair-salon": {
    post: "Fresh balayage from this week at the salon. Book your colour appointment online.",
    does: [
      {
        title: "A colour review answered.",
        text: "A client thanks her stylist by name. The reply thanks the right person, because you told Kabsi who works with you.",
      },
      {
        title: "Late night Thursday.",
        text: "Message Kabsi that you stay open until 8 on Thursday. It shows the new hours and sends them to Google after your yes.",
      },
      {
        title: "A balayage photo posted.",
        text: "Send a photo of this week's colour. Kabsi writes a short post and it goes live after your yes.",
      },
    ],
    faq: [
      {
        q: "Will replies name the wrong stylist?",
        a: "No. Add your team's names in About your business. Kabsi only uses names on that list.",
      },
      {
        q: "Does my booking link get checked?",
        a: "Yes. The booking link on your Google profile is checked every day, and Kabsi tells you if it stops working.",
      },
      {
        q: "Can I post photos of clients?",
        a: "Post the work, and only with your client's permission. Kabsi writes the post and nothing goes live without your yes.",
      },
    ],
  },
  barbershop: {
    post: "A clean skin fade from the chair today. Walk in or book your next cut.",
    does: [
      {
        title: "Walk-in hours changed.",
        text: "Taking walk-ins until 7 this Friday? Tell Kabsi. It shows Friday's new hours and sends them to Google after your yes.",
      },
      {
        title: "A new fade photo posted.",
        text: "Send a photo of a fresh fade from the chair. Kabsi writes the post and it goes live after your yes.",
      },
      {
        title: "A wait complaint answered calmly.",
        text: "Someone waited longer than they hoped. The reply thanks them, says sorry for the wait and stays short.",
      },
    ],
    faq: [
      {
        q: "We take walk-ins and bookings. Can the hours say that?",
        a: "Kabsi changes your opening hours and holiday hours after your yes. Say the walk-in times in a post or your description on Google.",
      },
      {
        q: "Can replies thank the barber by name?",
        a: "Yes, when you add your barbers' names in About your business. Kabsi never uses a name that is not on your list.",
      },
      {
        q: "Where do I put the QR code?",
        a: "By the mirror at each chair or at the till. It opens your Google review page, and you choose who gets it.",
      },
    ],
  },
  "nail-salon": {
    post: "This week's set: soft pink with a gloss finish. Book your next appointment with us.",
    does: [
      {
        title: "A nail art photo posted.",
        text: "Send a photo of a set you are proud of. Kabsi writes the post and it goes live after your yes.",
      },
      {
        title: "A chipped polish review answered.",
        text: "A client says her polish chipped early. The reply is calm, says sorry and asks her to get in touch.",
      },
      {
        title: "Holiday hours before the rush.",
        text: "Open later before Christmas? Tell Kabsi the days. It shows the holiday hours and sends them after your yes.",
      },
    ],
    faq: [
      {
        q: "What if a review mentions an allergic reaction?",
        a: HEALTH,
      },
      {
        q: "Can I post photos of clients' hands?",
        a: "Yes, with your client's permission. Kabsi writes the post and waits for your yes.",
      },
      {
        q: "Where do I put the QR code?",
        a: "At each station or at the till. It opens your Google review page, and you choose when to offer it.",
      },
    ],
  },
  "beauty-salon": {
    post: "Our treatment room is ready for the week. Book a facial online.",
    does: [
      {
        title: "A facial review answered.",
        text: "A client loved her treatment. The reply thanks her warmly and mentions only what she said.",
      },
      {
        title: "A training day closure set.",
        text: "Closing early for a training day? Tell Kabsi. It shows the new hours and sends them after your yes.",
      },
      {
        title: "Treatment bookings kept open.",
        text: "The booking link on your Google profile is checked every day. If it breaks, Kabsi tells you.",
      },
    ],
    faq: [
      {
        q: "What if a review mentions a skin reaction?",
        a: HEALTH,
      },
      {
        q: "Will replies promise results?",
        a: "No. Replies thank the client and never promise results, prices or discounts you did not give Kabsi.",
      },
      {
        q: "Can I post before and after photos?",
        a: "Only with your client's permission. Kabsi writes the post from your photo and waits for your yes.",
      },
    ],
  },
  "spa-and-massage": {
    post: "A quiet room, warm towels, an hour for you. Book your massage online.",
    does: [
      {
        title: "A calm reply to a calm review.",
        text: "A guest writes about a quiet, unhurried massage. The reply matches the tone and thanks the therapist you named.",
      },
      {
        title: "Holiday hours set in time.",
        text: "Open the day after Christmas? Tell Kabsi. It shows the holiday hours and sends them to Google after your yes.",
      },
      {
        title: "A treatment room photo posted.",
        text: "Send a photo of the room before the first guest. Kabsi writes the post and waits for your yes.",
      },
    ],
    faq: [
      {
        q: "Does Kabsi write about a guest's body or health?",
        a: "No. Replies stay general and never mention a guest's health. " + HEALTH,
      },
      {
        q: "Is my booking link checked?",
        a: "Yes, every day. If the booking link on your Google profile stops working, Kabsi tells you.",
      },
      {
        q: "Can I change hours for one day only?",
        a: "Yes. Message Kabsi the day and the hours. It sets them as special hours after your yes.",
      },
    ],
  },
  "dental-clinic": {
    post: "Our team is back for the new week. Call us to book a check-up.",
    does: [
      {
        title: "A reply that keeps privacy.",
        text: "A patient thanks you for a calm visit. The reply thanks them and never confirms they are a patient or names a treatment.",
      },
      {
        title: "Emergency hours over the holidays.",
        text: "Open two mornings between Christmas and New Year? Tell Kabsi. It sets the holiday hours after your yes.",
      },
      {
        title: "The practice phone number watched.",
        text: "If your phone number changes on Google, Kabsi shows you what changed and the fix waits for your yes.",
      },
    ],
    faq: [
      {
        q: "Will a reply mention a patient's treatment?",
        a: "No. Add a rule like 'never confirm the reviewer is a patient' and replies follow it. They stay general and ask the person to get in touch.",
      },
      {
        q: "What if a review describes pain or an injury?",
        a: HEALTH,
      },
      {
        q: "Is Kabsi legal advice on privacy?",
        a: "No. Kabsi keeps replies general. Privacy law questions go to a person.",
      },
    ],
  },
  "medical-and-aesthetic-clinic": {
    post: "Our clinic is open for consultations this week. Call us to book a time.",
    does: [
      {
        title: "A private, general reply.",
        text: "A client thanks the team. The reply thanks them and never names a treatment or confirms they visited.",
      },
      {
        title: "A clinic photo posted.",
        text: "Send a photo of your reception or a treatment room. Kabsi writes the post and waits for your yes.",
      },
      {
        title: "Your website link checked daily.",
        text: "If the website on your Google profile goes down or sends people elsewhere, Kabsi tells you.",
      },
    ],
    faq: [
      {
        q: "Will replies promise results?",
        a: "No. Replies never promise results, mention treatments or offer discounts.",
      },
      {
        q: "What if a review describes a side effect?",
        a: HEALTH,
      },
      {
        q: "Can I post before and after photos?",
        a: "Only with your client's permission, and only what your local rules allow. Every post waits for your yes.",
      },
    ],
  },
  physiotherapy: {
    post: "Evening appointments are now open on Tuesdays. Book online or call us.",
    does: [
      {
        title: "A thank you that stays private.",
        text: "A patient thanks their physio after a long recovery. The reply is warm and says nothing about their care.",
      },
      {
        title: "Evening hours added.",
        text: "Seeing patients until 8 on Tuesdays now? Tell Kabsi. It shows the new hours and sends them after your yes.",
      },
      {
        title: "Your appointment link checked.",
        text: "The booking link on your Google profile is checked every day. If it breaks, Kabsi tells you.",
      },
    ],
    faq: [
      {
        q: "Will a reply mention a patient's injury?",
        a: "No. Replies stay general and never confirm someone is a patient or mention their care.",
      },
      {
        q: "What if a review says a treatment hurt?",
        a: HEALTH,
      },
      {
        q: "Can Kabsi post exercise tips?",
        a: "Kabsi writes posts only from facts you confirmed or a photo you sent. It does not invent tips.",
      },
    ],
  },
  restaurant: {
    post: "Tonight's special is on the pass. Book a table or call us.",
    does: [
      {
        title: "Holiday hours before the holiday.",
        text: "Closed on Christmas Day and open late on New Year's Eve? Tell Kabsi once. It sets both after your yes.",
      },
      {
        title: "Your menu link checked.",
        text: "The menu link on your Google profile is checked every day. If it stops working, Kabsi tells you.",
      },
      {
        title: "A dish photo posted.",
        text: "Send a photo of tonight's special. Kabsi writes the post with what you told it and waits for your yes.",
      },
    ],
    faq: [
      {
        q: "What about a review that says someone got ill?",
        a: HEALTH,
      },
      {
        q: "Will a reply invent dishes or offers?",
        a: "No. Replies mention your menu, delivery or bookings only if you gave Kabsi those facts and the guest raised them.",
      },
      {
        q: "Reviews arrive during service. When do I deal with them?",
        a: "Whenever you have a minute. The reply waits, ready, until you tap yes.",
      },
    ],
  },
  cafe: {
    post: "The autumn bake is out of the oven. Come by for a coffee.",
    does: [
      {
        title: "Early hours kept exact.",
        text: "Opening at 6:30 instead of 7? Tell Kabsi. It shows the new hours and sends them to Google after your yes.",
      },
      {
        title: "A new pastry posted.",
        text: "Send a photo of the seasonal bake. Kabsi writes a short post and it goes live after your yes.",
      },
      {
        title: "A slow service review answered.",
        text: "Someone waited too long at the morning rush. The reply says sorry, thanks them and stays short.",
      },
    ],
    faq: [
      {
        q: "We are busiest in the morning. When do I approve?",
        a: "Whenever suits you. Replies and posts wait, ready, until you tap yes.",
      },
      {
        q: "Can I change hours for a holiday week?",
        a: "Yes. Message Kabsi the days and hours. It sets them as holiday hours after your yes.",
      },
      {
        q: "Where do I put the QR code?",
        a: "By the till or on the counter. It opens your Google review page, and you choose when to offer it.",
      },
    ],
  },
  bakery: {
    post: "First tray of the morning, still warm. Come early while it lasts.",
    does: [
      {
        title: "Today's bake posted.",
        text: "Send a photo of the first tray out of the oven. Kabsi writes the post and waits for your yes.",
      },
      {
        title: "Closed early when you sell out.",
        text: "Closing at 2 this Saturday? Tell Kabsi. It shows the hours for that day and sends them after your yes.",
      },
      {
        title: "A sold out complaint answered.",
        text: "Someone came for sourdough and it was gone. The reply thanks them and keeps it friendly.",
      },
    ],
    faq: [
      {
        q: "Will a post promise a product every day?",
        a: "No. Posts say only what you confirmed. Kabsi never invents products, prices or offers.",
      },
      {
        q: "Can I set holiday opening hours?",
        a: "Yes. Message Kabsi the days and hours. It sets them as holiday hours after your yes.",
      },
      {
        q: "What if a review mentions an allergy?",
        a: HEALTH,
      },
    ],
  },
  "auto-repair": {
    post: "Saturday mornings are now open for service. Call us to book your car in.",
    does: [
      {
        title: "A 1-star review handled carefully.",
        text: "A customer disputes a bill. The reply is calm, does not argue or admit fault, and asks them to get in touch.",
      },
      {
        title: "The number customers call, watched.",
        text: "Customers call before they come. If your number changes on Google, Kabsi shows you and the fix waits for your yes.",
      },
      {
        title: "Saturday mornings added.",
        text: "Open Saturday mornings now? Tell Kabsi. It shows the new hours and sends them after your yes.",
      },
    ],
    faq: [
      {
        q: "Will a reply promise a refund or a discount?",
        a: "No. Replies never argue, admit fault or promise refunds or discounts. For a price dispute you see the reply before anything goes to Google.",
      },
      {
        q: "Can Kabsi post a photo from the workshop?",
        a: "Yes. Send a photo with a few words. Kabsi writes the post and waits for your yes.",
      },
      {
        q: "Where do I put the QR code?",
        a: "Where customers pay and collect their keys. You choose who gets it.",
      },
    ],
  },
  "gym-and-fitness": {
    post: "Our new spin class starts this week. Join us on the bike.",
    does: [
      {
        title: "Holiday class hours set.",
        text: "Shorter hours between Christmas and New Year? Tell Kabsi the days. It sets them after your yes.",
      },
      {
        title: "A new spin class posted.",
        text: "Send a photo from the first session. Kabsi writes the post from what you told it and waits for your yes.",
      },
      {
        title: "A crowded gym review answered.",
        text: "A member says the evenings are busy. The reply thanks them and stays honest, with no promises you did not make.",
      },
    ],
    faq: [
      {
        q: "Can Kabsi post our class timetable?",
        a: "Kabsi writes posts from facts you confirm. It does not invent classes, prices or offers.",
      },
      {
        q: "Will replies mention a member's health?",
        a: "No. Replies stay general. " + HEALTH,
      },
      {
        q: "Is my joining link checked?",
        a: "The website and booking links on your Google profile are checked every day. If one breaks, Kabsi tells you.",
      },
    ],
  },
  "lash-and-brow-studio": {
    post: "A soft natural set from today. Book your next lash fill online.",
    does: [
      {
        title: "A fresh set posted.",
        text: "Send a close photo of today's lashes. Kabsi writes the post and it goes live after your yes.",
      },
      {
        title: "A retention review answered.",
        text: "A client says her lashes fell early. The reply is calm, says sorry and asks her to get in touch.",
      },
      {
        title: "Your booking page checked daily.",
        text: "The booking link on your Google profile is checked every day. If it breaks, Kabsi tells you.",
      },
    ],
    faq: [
      {
        q: "What if a review mentions irritation or a reaction?",
        a: HEALTH,
      },
      {
        q: "Can I post close-up photos of clients?",
        a: "Only with your client's permission. Every post waits for your yes.",
      },
      {
        q: "Can replies thank the artist by name?",
        a: "Yes, when you add your team's names in About your business. Kabsi uses only those names.",
      },
    ],
  },
  "tattoo-studio": {
    post: "A fully healed piece from our studio. Book a consultation with us.",
    does: [
      {
        title: "Healed work posted.",
        text: "Send a photo of a healed piece. Kabsi writes the post and waits for your yes.",
      },
      {
        title: "Guest artist hours added.",
        text: "Open on Sunday for a guest spot? Tell Kabsi. It shows that day's hours and sends them after your yes.",
      },
      {
        title: "A pricing complaint answered.",
        text: "Someone thought the quote was high. The reply thanks them and never argues or names a price.",
      },
    ],
    faq: [
      {
        q: "What if a review mentions an infection?",
        a: HEALTH,
      },
      {
        q: "Can I post photos of clients' tattoos?",
        a: "With your client's permission. Kabsi writes the post and nothing goes live without your yes.",
      },
      {
        q: "Will replies thank the right artist?",
        a: "Yes, when you add your artists' names in About your business. Kabsi uses only those names.",
      },
    ],
  },
  "pet-grooming": {
    post: "Fresh from the tub and trimmed. Book your dog's next groom online.",
    does: [
      {
        title: "A fresh groom posted.",
        text: "Send a photo of a happy dog after the trim. Kabsi writes the post and waits for your yes.",
      },
      {
        title: "A nervous dog review answered.",
        text: "An owner thanks you for patience with a nervous dog. The reply is warm and mentions only what they said.",
      },
      {
        title: "A closed week set in advance.",
        text: "Closed for the week after Christmas? Tell Kabsi. It sets the holiday hours after your yes.",
      },
    ],
    faq: [
      {
        q: "What if a review says a pet was hurt?",
        a: "A review about an injury gets no ready reply. Kabsi flags it for you to answer in your own words.",
      },
      {
        q: "Can I post photos of customers' pets?",
        a: "Yes, with the owner's permission. Every post waits for your yes.",
      },
      {
        q: "Is my booking link checked?",
        a: "Yes, every day. If the booking link on your Google profile breaks, Kabsi tells you.",
      },
    ],
  },
  "veterinary-clinic": {
    post: "Our team is here for your pets this week. Call us to book a visit.",
    does: [
      {
        title: "A grateful owner answered.",
        text: "A pet owner thanks the team after a hard visit. The reply is kind, short and says nothing about the case.",
      },
      {
        title: "The clinic number kept right.",
        text: "Owners call in a hurry. If your number changes on Google, Kabsi shows you and the fix waits for your yes.",
      },
      {
        title: "Holiday hours set early.",
        text: "Different hours over the holidays? Tell Kabsi the days. It sets them after your yes.",
      },
    ],
    faq: [
      {
        q: "Will a reply talk about a pet's treatment?",
        a: "No. Replies stay general and never discuss a case. They ask the owner to get in touch.",
      },
      {
        q: "What about a review after a pet died?",
        a: "The reply is short and kind, and you can change every word. Nothing goes to Google without your yes.",
      },
      {
        q: "Does Kabsi answer emergency calls or messages?",
        a: "No. Kabsi works on your Google profile only and never talks to your clients.",
      },
    ],
  },
  "car-wash": {
    post: "A full interior detail, finished today. Drop by or book a detail.",
    does: [
      {
        title: "A detailing photo posted.",
        text: "Send a photo of a finished interior. Kabsi writes the post and waits for your yes.",
      },
      {
        title: "Weather closure hours set.",
        text: "Closed for a storm on Thursday? Tell Kabsi. It shows that day's hours and sends them after your yes.",
      },
      {
        title: "A missed spot review answered.",
        text: "A driver says the wash missed a spot. The reply says sorry and asks them to come back and get in touch.",
      },
    ],
    faq: [
      {
        q: "Will a reply promise a free wash?",
        a: "No. Replies never offer discounts, free items or refunds.",
      },
      {
        q: "Can I change hours for one day?",
        a: "Yes. Message Kabsi the day and the hours. It sets them as special hours after your yes.",
      },
      {
        q: "Where do I put the QR code?",
        a: "Where drivers pay or wait. You choose who gets it.",
      },
    ],
  },
  florist: {
    post: "This week's arrangement, fresh from the workbench. Call us to order.",
    does: [
      {
        title: "Valentine's hours set.",
        text: "Opening early for Valentine's week? Tell Kabsi the days. It sets the holiday hours after your yes.",
      },
      {
        title: "A bouquet photo posted.",
        text: "Send a photo of this week's arrangement. Kabsi writes the post and waits for your yes.",
      },
      {
        title: "A gentle reply for a sympathy order.",
        text: "A customer thanks you for funeral flowers. The reply is gentle and adds nothing they did not share.",
      },
    ],
    faq: [
      {
        q: "Orders come by phone. Is my number watched?",
        a: "Yes. If your phone number changes on Google, Kabsi shows you and the fix waits for your yes.",
      },
      {
        q: "Will a post promise same-day delivery?",
        a: "Only if you told Kabsi you offer it. Posts never invent prices, offers or dates.",
      },
      {
        q: "Where do I put the QR code?",
        a: "On a small card in each bouquet or at the counter. You choose who gets it.",
      },
    ],
  },
  optician: {
    post: "New frames are in on the shelf. Book an eye test or come by to try them on.",
    does: [
      {
        title: "New frames posted.",
        text: "Send a photo of the new frames on the shelf. Kabsi writes the post and waits for your yes.",
      },
      {
        title: "A wait for glasses answered.",
        text: "A customer waited longer than promised for lenses. The reply says sorry and asks them to get in touch.",
      },
      {
        title: "Eye test bookings kept open.",
        text: "The booking link on your Google profile is checked every day. If it breaks, Kabsi tells you.",
      },
    ],
    faq: [
      {
        q: "Will a reply mention someone's eye test?",
        a: "No. Replies stay general and never mention a customer's eyes or prescription.",
      },
      {
        q: "Can Kabsi post brand names of frames?",
        a: "Kabsi writes what you confirm. Posts never invent prices, offers or brands you do not stock.",
      },
      {
        q: "Can I set hours for a public holiday?",
        a: "Yes. Message Kabsi the day and hours. It sets them as holiday hours after your yes.",
      },
    ],
  },
  "yoga-and-pilates-studio": {
    post: "A new Sunday morning flow starts this week. Book your mat online.",
    does: [
      {
        title: "A Sunday flow posted.",
        text: "Starting a Sunday morning flow? Send a photo of the studio. Kabsi writes the post from what you told it.",
      },
      {
        title: "Fewer classes over the holidays.",
        text: "Fewer classes over the holidays? Tell Kabsi the days. It sets the holiday hours after your yes.",
      },
      {
        title: "A warm reply to a first class.",
        text: "A new student says they felt welcome. The reply thanks them and names the teacher you listed.",
      },
    ],
    faq: [
      {
        q: "Will replies mention a student's injury?",
        a: "No. Replies stay general. " + HEALTH,
      },
      {
        q: "Is my booking link checked?",
        a: "Yes, every day. If the booking link on your Google profile breaks, Kabsi tells you.",
      },
      {
        q: "Can Kabsi post our timetable?",
        a: "Kabsi writes posts from facts you confirm. It never invents classes, prices or offers.",
      },
    ],
  },
  cleaner: {
    post: "Another home ready for the weekend. Call us for a quote.",
    does: [
      {
        title: "A reply after a home clean.",
        text: "A customer thanks the team for a spotless apartment. The reply thanks them and mentions only what they said.",
      },
      {
        title: "The number for quotes, watched.",
        text: "Most jobs start with a call. If your number changes on Google, Kabsi shows you and the fix waits for your yes.",
      },
      {
        title: "A before and after posted.",
        text: "Send a photo from today's job, with the customer's permission. Kabsi writes the post and waits for your yes.",
      },
    ],
    faq: [
      {
        q: "We go to customers. Does Kabsi work without a shop?",
        a: "Yes. Kabsi works for a business that travels to its customers with a service area on Google.",
      },
      {
        q: "What if a review says something was damaged?",
        a: "The reply is calm, does not argue or admit fault, and asks the customer to get in touch. You see it before anything goes to Google.",
      },
      {
        q: "Will posts show my customers' homes?",
        a: "Only photos you send, with your customer's permission. Every post waits for your yes.",
      },
    ],
  },
};
