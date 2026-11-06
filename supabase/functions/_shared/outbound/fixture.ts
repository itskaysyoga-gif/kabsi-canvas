// Test mode's fictional businesses (Harvey 4A part B): example.com rows only, with the page each one "publishes", so a
// test run fills drafts end to end without reading any real business. Their drafts go to OUTBOUND_TEST_RECIPIENTS.
export type FixtureRow = Record<string, string> & { html: string };

const page = (email: string, extra: string) =>
  `<html><body><h1>Welcome</h1><p>Email us at <a href="mailto:${email}">${email}</a>.</p>${extra}<footer>&copy; 2019</footer></body></html>`;

export function fixtureRows(stamp: string): FixtureRow[] {
  // The register's Companies House columns (30.39 item 12): Active, on a file dated the run's own day.
  const fileDate = /^\d{8}$/.test(stamp) ? `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6)}` : "";
  const row = (slug: string, name: string, industry: string, extra: string): FixtureRow => {
    const email = `hello.${stamp}@${slug}.example.com`;
    return {
      company_id: `fixture-${slug}-${stamp}`, business_name: name, industry, country: "GB", city: "Exampleton",
      website: `https://${slug}.example.com`, email, email_page_url: `https://${slug}.example.com/contact`,
      company_type: "registered company", company_number: "00000000", company_status: "Active",
      company_status_date: fileDate, quality_score: "1", html: page(email, extra),
    };
  };
  return [
    row("roselanesalon", "Rose Lane Salon", "hair salon", `<a href="https://www.fresha.com/book-now/rose-lane">Book now</a>`),
    row("harborbarbers", "Harbor Barbers", "barbershop", "<p>Monday to Friday 9:00 to 18:00, Saturday 9am to 4pm</p>"),
    row("maplenails", "Maple Nails", "nail salon", `<a href="https://www.instagram.com/maplenails.example">Instagram</a>`),
  ];
}
