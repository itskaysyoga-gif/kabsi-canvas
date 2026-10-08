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
    description: "Call us or whatsapp on 70123456",
  });
  assertEquals(out.name, "accounts/113746201522792609010/locations/4825254240697973899/reviews/AbC1");
  assertEquals(out.reviewer.displayName, "[removed]");
  assertEquals(out.reviewer.profilePhotoUrl, "[removed]");
  assertEquals(out.comment, "[removed]");
  assertEquals(out.reviewReply.comment, "[removed]");
  assertEquals(out.reviewReply.updateTime, "2026-10-08T12:00:00Z");
  assertEquals(out.summary, "Call [phone removed] or [phone removed], mail [email removed]");
  assertEquals(out.message, "has not been used in project 856347937978 before");
  assertEquals(out.description, "Call us or whatsapp on [phone removed]");
});

Deno.test("redact removes a personal account's name and an admin's name, keeps a group's name", () => {
  const out = redact({
    accounts: [{ name: "accounts/1", type: "PERSONAL", accountName: "A Person" }, { name: "accounts/2", type: "LOCATION_GROUP", accountName: "Kabsi Clients" }],
    admins: [{ name: "locations/9/admins/3", admin: "someone@example.com", role: "MANAGER" }],
  });
  assertEquals(out.accounts[0].accountName, "[removed]");
  assertEquals(out.accounts[1].accountName, "Kabsi Clients");
  assertEquals(out.admins[0].admin, "[removed]");
  assertEquals(out.admins[0].role, "MANAGER");
});

Deno.test("redact keeps Google's own labels, removes an organisation's address", () => {
  const out = redact({
    categories: { primaryCategory: { name: "categories/gcid:media_company", displayName: "Media company" } },
    organizationInfo: { address: { locality: "Somewhere" }, phoneNumber: "+961 1 234 567", registeredDomain: "kabsi.co" },
  });
  assertEquals(out.categories.primaryCategory.displayName, "Media company");
  assertEquals(out.organizationInfo.address, "[removed]");
  assertEquals(out.organizationInfo.phoneNumber, "[removed]");
  assertEquals(out.organizationInfo.registeredDomain, "kabsi.co");
});
