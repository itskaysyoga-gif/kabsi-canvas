// R-126 (EMAIL-01): the weekly report email's subject and first line. Counts come from the receipt's chips, which are
// built only from published and read-back items.
import { describe, expect, it } from "vitest";
import { sentLine, weekSubject } from "../supabase/functions/_shared/email/report-body.ts";

const chip = (key: string, count: number) => ({ key, label: key, count });

describe("weekly report subject", () => {
  it("lists the parts that are not zero, with the right singular", () => {
    expect(weekSubject([chip("replies", 3), chip("posts", 1), chip("hours", 1), chip("details", 1)], 0)).toBe(
      "Your Kabsi week: 3 replies, 1 post, 2 profile changes",
    );
    expect(weekSubject([chip("replies", 1)], 2)).toBe("Your Kabsi week: 1 reply");
    expect(weekSubject([chip("posts", 2), chip("photos", 1)], 0)).toBe("Your Kabsi week: 2 posts, 1 profile change");
  });
  it("does not count a reply that was only prepared", () => {
    expect(weekSubject([chip("drafts", 4)], 0)).toBe("Your Kabsi week: your profile was checked, nothing needed you");
  });
  it("a week with nothing sent says the profile was checked", () => {
    expect(weekSubject([], 0)).toBe("Your Kabsi week: your profile was checked, nothing needed you");
  });
  it("never says nothing needed the owner when something waits for a yes", () => {
    expect(weekSubject([], 2)).toBe("Your Kabsi week: your profile was checked, 2 things are waiting for your yes");
    expect(weekSubject([], 1)).toBe("Your Kabsi week: your profile was checked, 1 thing is waiting for your yes");
  });
  it("has no dash and no exclamation mark", () => {
    for (const s of [weekSubject([chip("replies", 3)], 1), weekSubject([], 0)]) expect(s).not.toMatch(/[!–—]/);
  });
});

describe("weekly report first line", () => {
  it("says what went to Google after the yes, then what is waiting", () => {
    expect(sentLine([chip("replies", 3), chip("posts", 1), chip("hours", 2)], 2)).toBe(
      "After your yes, Kabsi sent 3 replies, 1 post and 2 profile changes to Google. 2 things are waiting for your yes.",
    );
    expect(sentLine([chip("replies", 1)], 0)).toBe("After your yes, Kabsi sent 1 reply to Google. Nothing is waiting for your yes.");
    expect(sentLine([], 1)).toBe("Kabsi sent nothing to Google this week. 1 thing is waiting for your yes.");
  });
});
