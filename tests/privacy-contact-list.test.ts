import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readText } from "./helpers/facts";

// Launch 3 part B (30.37 item 6): the privacy notice for the businesses on Kabsi's contact list (UK GDPR article 14).
// The section on /privacy, the facts and the public llms file say the same thing, in under 200 words, and name neither
// the collection tool nor how many countries or businesses it holds.
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
  it("is on /privacy, under 200 words, and has no dashes or exclamation marks", () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(section.split(" ").length).toBeLessThan(200);
    expect(section).not.toMatch(/[–—!]/);
    expect(section).not.toMatch(/[؀-ۿ]/);
  });

  it("answers who, what, why, basis, source, retention, rights and objection", () => {
    expect(section).toMatch(/Rashid Abou Hamzy runs Kabsi/); // who
    expect(section).toMatch(/name, kind of business, address, phone number, website and an email address the business publishes/); // what
    expect(section).toMatch(/tell suitable ones about its service later/); // why
    expect(section).toMatch(/lawful basis is legitimate interests: telling businesses about a service that may help them/); // basis
    expect(section).toMatch(/OpenStreetMap and from the business's own website/); // source
    expect(section).toMatch(/at least every six months and marks one that has closed/); // retention
    expect(section).toMatch(/never sold or shared/);
    expect(section).toMatch(/No message has been sent, and none is sent without a further check of the law in the country where the business is/);
    expect(section).toMatch(/no names of owners or staff/);
    expect(section).toMatch(/ask to be removed or never to be contacted/); // objection
    expect(section).toMatch(/hello@kabsi\.co and Kabsi acts within 30 days/);
    expect(section).toMatch(/ask what Kabsi holds about your business, object to Kabsi holding it, or complain to the data protection authority/); // rights
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
      expect(text).toContain("legitimate interests");
      expect(text).toContain("at least every six months");
      expect(text).toContain("never sold or shared");
      expect(text).not.toMatch(/harvey/i);
    }
  });
});
