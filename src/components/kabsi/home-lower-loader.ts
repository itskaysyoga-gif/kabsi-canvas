// The lower Home code (d9-home-lower.tsx), loaded once. Its own tiny module so the hero (home2-hero.tsx) and the lower
// sections (d9-home.tsx) share one load without importing each other. Polish 4 part D; Home 2 (R-158 item 4) also
// keeps the hero's WhatsApp picture in this code, out of the code every page loads (Speed gate).
type Lower = typeof import("./d9-home-lower");
let lower: Lower | null = null;
let loading: Promise<Lower> | null = null;

/** Load the lower sections' code once. The route's loader awaits it on the server, so the server render has it. */
export function loadHomeLower(): Promise<Lower> {
  if (lower) return Promise.resolve(lower);
  loading ??= import("./d9-home-lower").then((m) => (lower = m));
  return loading;
}

/** The lower code if it is already here (on the server, and on a later visit to Home inside the site), else null. */
export function lowerNow(): Lower | null {
  return lower;
}
