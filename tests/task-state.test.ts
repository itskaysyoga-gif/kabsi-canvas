import { describe, expect, it } from "vitest";
import * as web from "../src/lib/task-state";
import * as wa from "../supabase/functions/_shared/task-close";

// UX 1: the website and WhatsApp say the same thing about every task (master plan 30.15 section 3.1).
const STATES = [
  "approved",
  "publishing",
  "published",
  "checking",
  "verifying",
  "verified",
  "rejected",
  "failed",
  "cancelled",
] as const;
const KINDS = [
  "review_reply",
  "local_post",
  "local_post_removal",
  "photo",
  "special_hours",
  "listing_revert",
  "listing_edit",
] as const;

describe("task states on the website match task-close.ts", () => {
  it("gives the same owner state and label for every publication state", () => {
    for (const s of STATES) {
      expect(web.ownerState(s), s).toBe(wa.ownerState(s));
      expect(web.OWNER_LABEL[web.ownerState(s)]).toBe(wa.OWNER_LABEL[wa.ownerState(s)]);
    }
  });

  it("says what failed and what happens next with the same words", () => {
    for (const k of KINDS)
      for (const s of STATES) expect(web.failedNext(k, s)).toBe(wa.failedNext(k, s));
  });

  it("links to the same place on Google, and only to Google", () => {
    const place = "ChIJ1234567890abcdef";
    for (const k of KINDS)
      expect(web.googleLink({ target_type: k, place_id: place })).toBe(
        wa.googleLink({ target_type: k, place_id: place }),
      );
    const post = {
      target_type: "local_post",
      place_id: place,
      response: { searchUrl: "https://local.google.com/place?id=1" },
    };
    expect(web.googleLink(post)).toBe(wa.googleLink(post as never));
    const bad = {
      target_type: "local_post",
      place_id: null,
      response: { searchUrl: "https://evil.example/x" },
    };
    expect(web.googleLink(bad)).toBeNull();
    expect(web.googleLink({ target_type: "review_reply", place_id: "bad id" })).toBeNull();
  });

  it("calls a task On Google only after Kabsi saw it there", () => {
    expect(STATES.filter((s) => web.ownerState(s) === "confirmed")).toEqual(["verified"]);
  });
});
