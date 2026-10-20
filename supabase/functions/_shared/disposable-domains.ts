// Throwaway email domains refused at sign-up (G-16). A short list of the services that make up nearly all throwaway
// sign-ups; subdomains match too (x.mailinator.com). Add a domain here when one shows up in sign-ups.
export const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com", "anonaddy.me", "burnermail.io",
  "byom.de", "discard.email", "dispostable.com", "dropmail.me", "emailondeck.com", "emailfake.com", "fakeinbox.com",
  "fakemail.net", "getairmail.com", "getnada.com", "guerrillamail.biz", "guerrillamail.com", "guerrillamail.de",
  "guerrillamail.info", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com", "harakirimail.com",
  "inboxbear.com", "inboxkitten.com", "incognitomail.org", "jetable.org", "mail.tm", "mail-temp.com", "mailcatch.com",
  "maildrop.cc", "mailinator.com", "mailinator.net", "mailinator2.com", "mailnesia.com", "mailpoof.com", "mailsac.com",
  "mailtemp.net", "mintemail.com", "moakt.com", "mohmal.com", "mytemp.email", "nada.email", "sharklasers.com",
  "spam4.me", "spambox.us", "spamgourmet.com", "temp-mail.io", "temp-mail.org", "tempail.com", "tempinbox.com",
  "tempmail.com", "tempmail.dev", "tempmail.net", "tempmail.plus", "tempmailo.com", "tempr.email", "throwawaymail.com",
  "trashmail.com", "trashmail.de", "trashmail.net", "tmail.ws", "tmpmail.net", "tmpmail.org", "wegwerfmail.de",
  "yopmail.com", "yopmail.fr", "yopmail.net", "zetmail.com", "emltmp.com", "fexpost.com", "fextemp.com", "mailbox.in.ua",
  "minuteinbox.com", "tempmailaddress.com", "luxusmail.org", "1secmail.com", "1secmail.net", "1secmail.org",
  "grr.la", "pokemail.net", "spamdecoy.net", "mvrht.com", "deadaddress.com", "mailforspam.com", "trbvm.com",
]);

export function isDisposable(email: string): boolean {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    if (DISPOSABLE_DOMAINS.has(parts.slice(i).join("."))) return true;
  }
  return false;
}
