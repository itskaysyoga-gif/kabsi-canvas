import { assertEquals } from "jsr:@std/assert@1";
import { probeSummary, redact } from "./capture.ts";

Deno.test("redact removes names, review text, phones and emails, keeps ids and times", () => {
  const out = redact({
    name: "accounts/113746201522792609010/locations/4825254240697973899/reviews/AbC1",
    reviewer: { displayName: "A Person", profilePhotoUrl: "https://x/y.jpg" },
    comment: "Great, call me",
    reviewReply: { comment: "Thanks", updateTime: "2026-10-08T12:00:00Z" },
    summary: "Call +1 555 010 4477 or 555 010 4477, mail a@b.co",
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

Deno.test("probeSummary keeps only the status and Google's reason for a refusal", () => {
  const out = probeSummary({
    url: "https://mybusiness.googleapis.com/v4/accounts/1/locations/2/reviews", status: 403,
    body: { error: { code: 403, status: "PERMISSION_DENIED", message: "has not been used in project 856347937978", details: [{ reason: "SERVICE_DISABLED", metadata: { service: "mybusiness.googleapis.com", consumer: "projects/856347937978" } }] } },
  });
  assertEquals(out, { status: 403, url: "https://mybusiness.googleapis.com/v4/accounts/1/locations/2/reviews", code: "PERMISSION_DENIED", reason: "SERVICE_DISABLED", service: "mybusiness.googleapis.com", consumer: "projects/856347937978" });
});

Deno.test("probeSummary redacts a list that did open: no review text, no reviewer name", () => {
  const out = probeSummary({
    url: "https://mybusiness.googleapis.com/v4/accounts/1/locations/2/reviews", status: 200,
    body: { reviews: [{ name: "accounts/1/locations/2/reviews/r", starRating: "FIVE", comment: "Lovely", reviewer: { displayName: "A Person" } }], totalReviewCount: 7 },
  }) as { list: string; count: number; totalSize: number; body: { reviews: { comment: string; reviewer: { displayName: string }; starRating: string }[] } };
  assertEquals(out.list, "reviews");
  assertEquals(out.count, 1);
  assertEquals(out.totalSize, 7);
  assertEquals(out.body.reviews[0].comment, "[removed]");
  assertEquals(out.body.reviews[0].reviewer.displayName, "[removed]");
  assertEquals(out.body.reviews[0].starRating, "FIVE");
});

Deno.test("posts op: GET only, no post text, and a name outside the profile is refused", async () => {
  const { io } = await import("./client.ts");
  const { postsList } = await import("./capture.ts");
  const was = { fetch: globalThis.fetch, writesPaused: io.writesPaused, token: io.token, gate: io.gate };
  const calls: string[] = [];
  io.writesPaused = () => Promise.resolve(false);
  io.token = () => Promise.resolve("t");
  io.gate = () => Promise.resolve({});
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? "GET"} ${url}`);
    const body = url.endsWith("/accounts") ? { accounts: [{ name: "accounts/1" }] }
      : url.includes("/locations?readMask") ? { locations: [{ name: "locations/2", title: "Yawmiyati" }] }
      : url.includes("/localPosts?") ? { localPosts: [{ name: "accounts/1/locations/2/localPosts/9", state: "LIVE", summary: "secret text" }] }
      : { error: { code: 404, status: "NOT_FOUND" } };
    return Promise.resolve(new Response(JSON.stringify(body), { status: "error" in body ? 404 : 200 }));
  }) as typeof fetch;
  try {
    const r = await postsList("yawmiyati", "accounts/1/locations/2/localPosts/9") as Record<string, unknown>;
    if (JSON.stringify(r).includes("secret text")) throw new Error("post text leaked");
    if ((r.post as { status: number }).status !== 404) throw new Error("the post read is not reported");
    const bad = await postsList("yawmiyati", "accounts/9/locations/9/localPosts/1") as Record<string, unknown>;
    if (bad.error !== "post not under this profile") throw new Error("a post outside the profile was read");
    if (!calls.every((c) => c.startsWith("GET "))) throw new Error("a write was sent");
  } finally {
    Object.assign(globalThis, { fetch: was.fetch });
    Object.assign(io, { writesPaused: was.writesPaused, token: was.token, gate: was.gate });
  }
});
