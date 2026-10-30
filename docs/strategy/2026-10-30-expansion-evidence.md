# Expansion evidence (lane R, 30 Oct 2026)

The evidence behind master plan 30.19. Public sources only, each opened on 30 Oct 2026; "n.d." means the page shows no date. UNVERIFIED marks what an official page did not confirm. Lane R re-checks a row before any work depends on it.

## 1. WhatsApp: what the rules say

- Business Solution Terms (https://www.whatsapp.com/legal/business-solution-terms, last modified 6 Mar 2026): "AI Providers" (providers and developers of AI or machine learning technologies, "including but not limited to large language models, generative artificial intelligence platforms, general-purpose artificial intelligence assistants") are "strictly prohibited from accessing or using the WhatsApp Business Solution, whether directly or indirectly" where such technologies are "the primary (rather than incidental or ancillary) functionality being made available for use, as determined by Meta in its sole discretion". There is no named exception for customer support. A business may use an AI provider as a Third Party Service Provider, but the data may not train or improve models except a model fine-tuned for that business's exclusive use. The business is "solely and fully liable" for its providers.
- Business Messaging Policy (https://whatsappbusiness.com/policy/, last updated 23 Sep 2026): contact only people who gave their number and opted in; "You may use automation when responding during the 24-hour window"; businesses "must also have available prompt, clear, and direct escalation paths", such as an in-chat human agent.

| Workflow | Operating model that fits | Residual risk | Needed before it runs |
| --- | --- | --- | --- |
| Owner approves Google work on Kabsi's number (live) | Kabsi's own account; AI drafts are part of a Google service | Low | Nothing new |
| Nora answers questions about Kabsi on Kabsi's number (live) | Answers only from Kabsi's facts; hands off to a person | Low | Nothing new; never an open "ask me anything" |
| A general assistant for any business task on Kabsi's number | None proven | Medium to high: closest to "primary functionality" | Not advised |
| Receptionist answering a business's customers | The business's own number through Kapso; Kabsi as the business's provider; opt-in, automation inside 24 hours, a human escalation path | Medium: Meta's discretion, answers given to customers | Kapso's written answer, a written agreement with each business, Rashid's yes |
| Review requests to a business's customers | The owner forwards Kabsi's ready message (built); Kabsi never messages customers | Low | Nothing new |
| Cold WhatsApp to prospects | None | Prohibited | Never |

The question for Kapso, in writing: does a business-specific AI receptionist on a business's own number, run by Kabsi through Kapso, fall inside the AI Provider clause?

## 2. Integration classes

Five classes: verified direct integration (built and working), authorised partner integration (built under a partner programme), owner-assisted workflow (the owner moves the content; no access to the platform), hypothetical integration (access exists, nothing built), unsupported (no legitimate access). Today Kabsi has one verified direct integration: Google Business Profile. Everything else is hypothetical, owner-assisted or unsupported, and nothing public may claim more.

| Platform | Access found | Class today | Source |
| --- | --- | --- | --- |
| Google Business Profile | Approved API (Gate A) | Verified direct integration | repo |
| Square Appointments and POS | Self-serve OAuth; UK yes, UAE no | Hypothetical | https://developer.squareup.com/docs/bookings-api/what-it-is (n.d.) |
| SimplyBook.me | Owner's API key | Hypothetical | https://simplybook.me/en/api/developer-api (n.d.) |
| Cal.com, Calendly, Google Calendar, Microsoft Graph | Self-serve; Calendly webhooks need a paid plan | Hypothetical | https://cal.com/docs/developing/guides/automation/webhooks (n.d.), https://developers.google.com/workspace/calendar/api/guides/push (11 Sep 2026) |
| Vagaro | Webhooks documented; access route UNVERIFIED | Hypothetical | https://docs.vagaro.com/public/docs/webhook-events (n.d.) |
| Fresha | No public API; paid one-way data export | Owner-assisted | https://www.fresha.com/help-center/knowledge-base/reports/432-data-connector-overview (n.d.) |
| Booksy, Treatwell, Timely | No public API found (UNVERIFIED) | Owner-assisted | none found |
| Phorest, Mindbody | Partner programmes | Unsupported until approved | https://support.phorest.com/hc/en-us/articles/360018509380 (12 Aug 2025), https://developers.mindbodyonline.com/WebhooksDocumentation (n.d.) |
| Booking.com connectivity | Partner programme paused for new providers | Owner-assisted | https://connect.booking.com/ (n.d.) |
| Tripadvisor (Terra) | Paid read access; responses only in an enterprise add-on | Owner-assisted | https://docs.terra.tripadvisor.com/docs/reptuation-management-kit (29 Oct 2026) |
| Airbnb | Closed to new companies (UNVERIFIED) | Owner-assisted | none official |
| Expedia lodging | Partner programme, PCI and a licence | Owner-assisted | https://developers.expediagroup.com/supply/lodging (n.d.) |
| Hostaway, Guesty | The owner's own key; review replies on Airbnb, Booking.com and Vrbo | Hypothetical (holiday rentals only) | https://api.hostaway.com/documentation (27 Oct 2026), https://open-api-docs.guesty.com/docs/authentication (11 Oct 2026) |
| Cloudbeds, Mews, SiteMinder | Partner certification | Unsupported until approved | https://docs.mews.com/connector-api/your-journey/certification (n.d.) |
| OpenTable, SevenRooms, Toast, Lightspeed K, Deliveroo, Talabat | Partner programmes; no review APIs | Unsupported until approved | https://doc.toasttab.com/doc/devguide/apiOverview.html (n.d.), https://api-docs.deliveroo.com/v2.0/docs (17 Mar 2026) |
| Shopmonkey | Self-serve signed webhooks | Hypothetical | https://shopmonkey.dev/webhooks (n.d.) |
| Shopify, WooCommerce | Custom app per store; store's own keys | Hypothetical | https://shopify.dev/docs/apps/launch/distribution (n.d.) |
| Jobber, ServiceTitan, Housecall Pro | Partner approval, certification or top plan | Unsupported until approved | https://help.servicetitan.com/ (16 Oct 2026) |
| Facebook Page recommendations | Read only; the API cannot reply | Owner-assisted for replies | https://developers.facebook.com/docs/graph-api/reference/page/ratings (v26.0) |
| Yelp | Replies through a partner-only API | Owner-assisted | https://docs.developer.yelp.com/docs/respond-to-reviews-api-v2 |
| Trustpilot | Paid API module | Hypothetical | https://developers.trustpilot.com/api-module-overview (n.d.) |

Owner-assisted reply drafting means the owner gives Kabsi the review (pasted or forwarded) and posts the approved reply himself. It is not automatic retrieval, not publishing, and not a permission from any of these platforms. No platform found sends a true "appointment completed" event; the closest are Cal.com's meeting ended event, checkout or payment events, and a check at the booking's end time.

## 3. Data flow for a booking-triggered review message (if this candidate is chosen)

1. The owner connects the booking tool with that tool's own consent screen (OAuth or the owner's key), from the Kabsi website. Kabsi never holds a password.
2. Kabsi asks only for the narrowest scope that gives booking times and status. Where a tool's scope also returns customer details, Kabsi may receive them but discards them on arrival and never stores them.
3. When a booking ends or is paid, Kabsi sends the owner (on WhatsApp, inside the rules of section 1) "Your 15:00 booking is done. Forward this to your customer?" with the ready review message and the business's review link.
4. The owner forwards it from his own phone. Kabsi never messages the customer, never stores the customer's number, and counts link opens apart from new reviews (30.15 section 3.5).
5. Stored: the booking id, its end time and whether the owner forwarded, with the same retention and deletion as other business data; listed on /privacy before the first connection.
Anything that would let Kabsi message a business's customers directly is a different workflow (section 1, the receptionist row) and needs its own decision.
