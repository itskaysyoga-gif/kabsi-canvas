// Staff "Send review link" (P0.8-06, K-133): a WhatsApp click-to-chat that the staff member sends from their own
// WhatsApp, the same plain message for every customer. Places, not people (K-25): the link is the business's place
// link, nothing records who sent what, and nothing counts sends. No reward words, no "if you enjoyed", no star talk.

/** The one message. It offers the link to every customer and asks for nothing else. */
export function reviewLinkMessage(businessName: string, link: string): string {
  return `Thanks for visiting ${businessName}. If you would like to leave a review, here is our link: ${link}`;
}

/** wa.me with no number: WhatsApp lets the staff member pick the customer, with the message already written. */
export function sendReviewLinkHref(businessName: string, link: string): string {
  return `https://wa.me/?text=${encodeURIComponent(reviewLinkMessage(businessName, link))}`;
}
