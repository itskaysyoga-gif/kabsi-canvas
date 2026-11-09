import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readText } from "./helpers/facts";

// Launch 3 part B (30.37 item 6): the privacy notice for the businesses on Kabsi's contact list (UK GDPR article 14).
// The section on /privacy, the facts and the public llms file say the same thing, and name neither the collection tool
// nor how many countries or businesses it holds. Launch 4 part B (30.38 item 2, R-118): the retention periods, and the
// section stays under 220 words (it was under 200 before lane R added them). Sync 2b (R-142 decision 4d, 30.45 item 5):
// lane R added UK registered companies only, Companies House as a source, where the list is held, the UAE and every
// other country off, the 90-day deletion and the never-contact list of 30.39 item 2, so the cap is 320 words.
// Tidy 1 (R-143 item 4, master plan 30.47): lane R approved the cap of 320 words (it was raised from 220 in Sync 2b).
const privacy = readFileSync("src/routes/privacy.tsx", "utf8");
const start = privacy.indexOf("<h2>15. Businesses on Kabsi's contact list</h2>");
const end = privacy.indexOf("<h2>16. Changes</h2>");
const section = privacy
  .slice(start, end)
  .replace(/<h2>.*?<\/h2>/, "")
  .replace(/\{OPERATOR_NAME\}/g, "Rashid Abou Hamzy")
  .replace(/\{CONTACT_EMAIL\}/g, "hello@kabsi.co")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();
const facts = readText("knowledge/kabsi-facts.md");
const llms = readText("public/llms-full.txt");

describe("the contact list notice (30.37 item 6)", () => {
  it("section 3's marketing line covers users and visitors, with the Outbound exception (R-142 4d)", () => {
    const flat = privacy.replace(/\s+/g, " ");
    expect(flat).toContain(
      "we don't send marketing emails to Kabsi users or visitors without asking first. Kabsi may send one plain email, and one follow-up, to a UK registered company at the address it publishes, as section 15 explains.",
    );
    expect(flat).not.toMatch(/marketing emails without asking you first/);
    for (const text of [facts, llms]) {
      expect(text).toContain(
        "Kabsi may send one plain email, and one follow-up, to a UK registered company at the address it publishes",
      );
    }
  });

  it("is on /privacy, under 320 words (the cap lane R approved, R-143), and has no dashes or exclamation marks", () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(section.split(" ").length).toBeLessThan(320);
    expect(section).not.toMatch(/[–—!]/);
    expect(section).not.toMatch(/[؀-ۿ]/);
  });

  it("answers who, what, why, basis, source, retention, rights and objection", () => {
    expect(section).toMatch(/Rashid Abou Hamzy runs Kabsi/); // who
    expect(section).toMatch(
      /name, kind of business, address, phone number, website, an email address the business publishes/,
    ); // what
    expect(section).toMatch(/tell suitable ones about its service later/); // why
    expect(section).toMatch(
      /lawful basis is legitimate interests: telling businesses about a service that may help them/,
    ); // basis
    expect(section).toMatch(/OpenStreetMap, the business's own website and Companies House/); // sources (R-142)
    expect(section).toMatch(/for a UK company, its company number and status/); // Companies House data
    expect(section).toMatch(/held in Kabsi's database and a private GitHub repository/); // where it is held
    expect(section).toMatch(/at least every six months and marks one that has closed/); // retention
    expect(section).toMatch(/never sold or shared/);
    expect(section).toMatch(
      /Kabsi writes only to UK registered companies that are active on Companies House: one plain email, and one follow-up, to the address the business publishes\./,
    ); // 30.45 item 5
    expect(section).toMatch(/The United Arab Emirates and every other country are off\./);
    expect(section).toMatch(
      /Nothing is sent before Rashid Abou Hamzy decides to start, and no message has been sent yet\./,
    );
    expect(section).toMatch(
      /A business Kabsi wrote to that does not reply is deleted 90 days after the last email, and only a coded form of its domain is kept/,
    ); // 30.39 item 2
    expect(section).toMatch(/A request from the business's own domain covers the whole business\./);
    expect(section).toMatch(/no names of owners or staff/);
    expect(section).toMatch(
      /We delete an entry 24 months after we add it, or 90 days after the business closes, whichever is sooner\./,
    ); // retention (30.38 item 2)
    expect(section).toMatch(
      /If you ask us to remove your business or never contact it, we do so within 30 days and keep only a coded form of the address, so we never write to it\./,
    ); // objection
    expect(section).toMatch(/Write to hello@kabsi\.co\./);
    expect(section).toMatch(
      /ask what Kabsi holds about your business, object to Kabsi holding it, or complain to the data protection authority/,
    ); // rights
  });

  it("does not name the tool, the countries' count or any number of businesses", () => {
    expect(section).not.toMatch(/harvey/i);
    expect(section).not.toMatch(/\b\d[\d,]*\s+(businesses|countries|emails)\b/i);
    expect(section).not.toMatch(/\b(thirteen|13)\b/i);
  });

  it("is in the facts and the public llms file with the same facts", () => {
    for (const text of [facts, llms]) {
      expect(text).toContain("Businesses on Kabsi's contact list");
      expect(text).toContain("OpenStreetMap");
      expect(text).toContain("Companies House");
      expect(text).toContain("UK registered companies");
      expect(text).toContain("90 days after the last email");
      expect(text).toContain("legitimate interests");
      expect(text).toContain("at least every six months");
      expect(text).toContain("never sold or shared");
      expect(text).toContain("24 months after we add it, or 90 days after the business closes");
      expect(text).toContain("keep only a coded form of the address");
      expect(text).not.toMatch(/harvey/i);
    }
  });
});
