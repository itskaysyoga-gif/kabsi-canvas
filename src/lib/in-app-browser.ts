// In-app browsers (App 4, master plan 30.31 item 3): Instagram's, Facebook's and Messenger's own browsers, and those of
// TikTok, LinkedIn and Snapchat, are blocked by Google sign-in ("disallowed_useragent"), and Meta's ads open in them. On
// these the log in page puts the email code first and says how to open kabsi.co in the phone's own browser.
const IN_APP = [
  /Instagram/i,
  /FBAN|FBAV|FB_IAB|FBIOS|FB4A/i,
  /Messenger|MessengerForiOS|MessengerLite|Orca-Android/i,
  /musical_ly|TikTok|BytedanceWebview|trill_/i,
  /LinkedInApp/i,
  /Snapchat/i,
];

export function isInAppBrowser(userAgent: string): boolean {
  return IN_APP.some((re) => re.test(userAgent));
}

/** Read in the browser only; the server render assumes a normal browser. */
export function inAppBrowserNow(): boolean {
  return typeof navigator !== "undefined" && isInAppBrowser(navigator.userAgent ?? "");
}
