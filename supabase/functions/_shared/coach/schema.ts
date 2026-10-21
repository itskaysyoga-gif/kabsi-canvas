// The LocalBusiness snippet (P0.8-09, K-136.8): JSON-LD built from the profile the owner approved, for the owner to paste
// into their own website, with a copy button. Pure: it only arranges what is passed in, and adds nothing Kabsi was not told.
export type SnippetProfile = {
  name: string;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  address?: { display: string; raw?: unknown };
  /** Google's own regular hours shape ({ periods: [{ openDay, openTime, closeDay, closeTime }] }) when Kabsi has it. */
  hours?: unknown;
};

type Time = { hours?: number; minutes?: number };
type Period = { openDay?: string; openTime?: Time; closeDay?: string; closeTime?: Time };
const DAY: Record<string, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};
const two = (n: number) => String(n).padStart(2, "0");
const clock = (t: Time | undefined) => `${two(Math.min(t?.hours ?? 0, 23))}:${two(t?.minutes ?? 0)}`;

function address(a: SnippetProfile["address"]): Record<string, string> | undefined {
  if (!a || !a.display) return undefined;
  const raw = a.raw as { addressLines?: string[]; locality?: string; administrativeArea?: string; postalCode?: string; regionCode?: string } | null;
  if (raw && typeof raw === "object" && (raw.addressLines?.length || raw.locality)) {
    const out: Record<string, string> = { "@type": "PostalAddress" };
    if (raw.addressLines?.length) out.streetAddress = raw.addressLines.join(", ");
    if (raw.locality) out.addressLocality = raw.locality;
    if (raw.administrativeArea) out.addressRegion = raw.administrativeArea;
    if (raw.postalCode) out.postalCode = raw.postalCode;
    if (raw.regionCode) out.addressCountry = raw.regionCode;
    return out;
  }
  return { "@type": "PostalAddress", streetAddress: a.display };
}

function hours(h: unknown): Record<string, string>[] | undefined {
  const periods = (h as { periods?: Period[] } | null)?.periods;
  if (!Array.isArray(periods)) return undefined;
  const out = periods.flatMap((p) => {
    const day = DAY[String(p.openDay ?? "")];
    // A period that closes after midnight is still the day it opened; 24:00 is Google's end of the day.
    if (!day || !p.openTime || !p.closeTime) return [];
    return [{ "@type": "OpeningHoursSpecification", dayOfWeek: day, opens: clock(p.openTime), closes: (p.closeTime.hours ?? 0) >= 24 ? "23:59" : clock(p.closeTime) }];
  });
  return out.length ? out : undefined;
}

/** The snippet, ready to paste: a script tag. "<" is escaped so no business text can close the tag early. */
export function schemaSnippet(p: SnippetProfile): string {
  const data: Record<string, unknown> = { "@context": "https://schema.org", "@type": "LocalBusiness", name: p.name };
  if (p.phone) data.telephone = p.phone;
  if (p.website) data.url = p.website;
  const addr = address(p.address);
  if (addr) data.address = addr;
  const open = hours(p.hours);
  if (open) data.openingHoursSpecification = open;
  const json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">\n${json}\n</script>`;
}
