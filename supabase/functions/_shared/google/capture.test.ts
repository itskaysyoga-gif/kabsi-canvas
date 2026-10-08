import { assertEquals } from "jsr:@std/assert@1";
import { redact } from "./capture.ts";

Deno.test("redact removes names, review text, phones and emails, keeps ids and times", () => {
  const out = redact({
    name: "accounts/113746201522792609010/locations/4825254240697973899/reviews/AbC1",
    reviewer: { displayName: "A Person", profilePhotoUrl: "https://x/y.jpg" },
    comment: "Great, call me",
    reviewReply: { comment: "Thanks", updateTime: "2026-10-08T12:00:00Z" },
    summary: "Call +961 3 956 917 or 03 956 917, mail a@b.co",
    message: "has not been used in project 856347937978 before",
  });
  assertEquals(out.name, "accounts/113746201522792609010/locations/4825254240697973899/reviews/AbC1");
  assertEquals(out.reviewer.displayName, "[removed]");
  assertEquals(out.reviewer.profilePhotoUrl, "[removed]");
  assertEquals(out.comment, "[removed]");
  assertEquals(out.reviewReply.comment, "[removed]");
  assertEquals(out.reviewReply.updateTime, "2026-10-08T12:00:00Z");
  assertEquals(out.summary, "Call [phone removed] or [phone removed], mail [email removed]");
  assertEquals(out.message, "has not been used in project 856347937978 before");
});
