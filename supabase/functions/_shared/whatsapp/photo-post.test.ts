// Photo Post 1 (master plan 30.23 item 2, lane R's decisions of 4 Nov 2026): a photo sent on WhatsApp with words becomes a
// Google post with that photo, for the owner's yes. Replayed on the fake world (no database, no Kapso, no model call): AI on,
// AI off, a draft that fails, words that fail the post checks, no words (unchanged), staff, a used-up Essentials allowance,
// two businesses, Approve with the undo, Approve before the photo is checked, and Skip.
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import type { Media } from "./channel.ts";
import { BIZ, msg, PHONES, USERS, World } from "./world.test-helpers.ts";

const img = (id: string): Media => ({ kind: "image", id, mime: "image/jpeg", filename: null, size: 2000, voice: false });
const CAPTION = "Late appointments every Thursday this month";
const DRAFT = "Late appointments are here. Every Thursday this month we stay open later, so you can drop in after work for a fresh coffee and a quiet table. Come by Harbour Lane Coffee on Thursday evening.";

async function send(w: World, deps: ReturnType<World["deps"]>, from: string, o: { text?: string; button?: string; media?: Media }) {
  const before = w.sent.length;
  const result = await receive(deps, msg(w, from, o));
  const replies = w.sent.slice(before);
  for (const r of replies) {
    assert.doesNotMatch(r.body, /[–—!]/, `no dash or exclamation mark in ${r.body}`);
    assert.ok(r.buttons.every((b) => b.length <= 20), "button titles fit WhatsApp");
    for (const name of w.foreignNames(r.to)) assert.ok(!r.body.includes(name), `${name} never shown to ${r.to}`);
  }
  return { result, replies, last: replies.at(-1) };
}
const lastButtonId = (w: World, phone: string, title: string) => {
  for (let i = w.outbox.length - 1; i >= 0; i--) {
    const b = w.outbox[i].phone === phone ? w.outbox[i].buttons.find((x) => x.title === title) : undefined;
    if (b) return b.id;
  }
  throw new Error(`no ${title} button for ${phone}`);
};
const onlyPost = (w: World) => {
  assert.equal(w.posts.size, 1, "one post draft");
  return [...w.posts.values()][0];
};

Deno.test("photo post: words with AI drafting on, the draft passes every check and is shown exactly", async () => {
  const w = new World();
  w.photoDraft = DRAFT;
  const deps = w.deps();
  const r = await send(w, deps, PHONES.owner, { media: img("pp1"), text: CAPTION });
  assert.equal(r.result, "photo_post_shown");
  assert.equal(r.last!.body, `*🖼️ Post with your photo*\n\n> ${DRAFT}\n\nKabsi posts it with the photo you just sent, after your yes.`);
  assert.deepEqual(r.last!.buttons, ["Approve", "Edit on kabsi.co", "Skip"]);
  assert.deepEqual(w.photoDraftCalls, [`${BIZ.harbour}:${CAPTION}`]);
  const post = onlyPost(w);
  assert.equal(post.text, DRAFT);
  assert.equal(post.caption, CAPTION);
  const photo = w.waPhotos.get(post.photo)!;
  assert.equal(photo.hold, true, "the photo is held for the post, never offered on its own");
});

Deno.test("photo post: AI drafting off, the owner's words are the post", async () => {
  const w = new World();
  const deps = w.deps();
  const r = await send(w, deps, PHONES.owner, { media: img("pp2"), text: CAPTION });
  assert.equal(r.result, "photo_post_shown");
  assert.match(r.last!.body, new RegExp(`^\\*🖼️ Post with your photo\\* · Harbour Lane Coffee\n\n> ${CAPTION}\n\nKabsi posts it with the photo you just sent, after your yes\\.$`));
  assert.equal(onlyPost(w).text, CAPTION);
  assert.equal(w.photoDraftCalls.length, 0, "no model call");
});

Deno.test("photo post: a draft that fails (no draft, or one outside 150 to 300 characters) leaves the owner's words", async () => {
  for (const draft of [null, "Late appointments on Thursdays."]) {
    const w = new World();
    w.photoDraft = draft;
    const deps = w.deps();
    const r = await send(w, deps, PHONES.owner, { media: img("pp3"), text: CAPTION });
    assert.equal(r.result, "photo_post_shown");
    assert.equal(onlyPost(w).text, CAPTION);
    assert.equal(w.photoDraftCalls.length, 1);
  }
});

Deno.test("photo post: words that fail the post checks get the postProblem line, then Add as a photo or Skip", async () => {
  const w = new World();
  const deps = w.deps();
  const r = await send(w, deps, PHONES.owner, { media: img("pp4"), text: "The best coffee in town, call 212 555 0188" });
  assert.equal(r.result, "photo_post_problem");
  assert.match(r.last!.body, /^\*🖼️ Kabsi cannot post that\*\n\nIt .+\.\n\nPlease send it again without that\. Or add the photo to your Google profile on its own, or skip it\.$/);
  assert.deepEqual(r.last!.buttons, ["Add as a photo", "Skip"]);
  assert.equal(w.posts.size, 0, "no post draft");
  const [photoId, photo] = [...w.waPhotos.entries()][0];
  assert.equal(photo.hold, true, "kept back until the owner says");
  const add = await send(w, deps, PHONES.owner, { button: lastButtonId(w, PHONES.owner, "Add as a photo") });
  assert.equal(add.result, "held_photo_added");
  assert.match(add.last!.body, /getting the photo ready on its own and will ask you here: Yes, Edit or Skip/);
  assert.equal(w.waPhotos.get(photoId)!.hold, false, "now it goes the plain photo way");
});

Deno.test("photo post: a superlative alone fails the checks too", async () => {
  const w = new World();
  const deps = w.deps();
  const r = await send(w, deps, PHONES.owner, { media: img("pp4b"), text: "The best flat white in New York this week" });
  assert.equal(r.result, "photo_post_problem");
  assert.match(r.last!.body, /\n\nIt says it is the best, which Google does not allow\.\n\n/);
});

Deno.test("photo post: a photo with no words is unchanged, a plain photo", async () => {
  const w = new World();
  w.photoDraft = DRAFT;
  const deps = w.deps();
  const r = await send(w, deps, PHONES.owner, { media: img("pp5") });
  assert.equal(r.result, "photo");
  assert.match(r.last!.body, /^\*🖼️ Photo received\*\n\nKabsi is getting it ready and will ask you here in a minute: Yes, Edit or Skip\./);
  assert.equal(w.posts.size, 0);
  assert.equal([...w.waPhotos.values()][0].hold, false);
  assert.equal(w.photoDraftCalls.length, 0);
});

Deno.test("photo post: staff send it, the owner and manager are asked, staff never get Approve", async () => {
  const w = new World();
  const deps = w.deps();
  const r = await send(w, deps, PHONES.staff, { media: img("pp6"), text: CAPTION });
  assert.equal(r.result, "photo_post_staff");
  assert.match(r.last!.body, /the owner is asked to approve it\.\n\nNothing goes on Google until they say yes\.$/);
  assert.ok(w.sent.filter((m) => m.to === PHONES.staff).every((m) => !m.buttons.includes("Approve")), "no Approve for staff");
  for (const phone of [PHONES.owner, PHONES.manager]) {
    const row = w.outbox.find((x) => x.phone === phone && x.kind === "post_ready");
    assert.ok(row, `${phone} is asked`);
    assert.match(row!.body, /^\*🖼️ Post with your team's photo\* · Harbour Lane Coffee\n\nYour team sent a photo with a note\.\n> Late appointments every Thursday this month\n\nKabsi posts it with that photo after your yes\.$/);
    assert.deepEqual(row!.buttons.map((b) => b.title), ["Approve", "Edit on kabsi.co", "Skip"]);
  }
  assert.ok(!w.outbox.some((x) => x.phone === PHONES.staff && x.kind === "post_ready"));
  // The owner approves once the photo is checked.
  w.waPhotos.get(onlyPost(w).photo)!.state = "draft";
  const a = await send(w, deps, PHONES.owner, { button: lastButtonId(w, PHONES.owner, "Approve") });
  assert.equal(a.result, "approved");
  assert.equal(a.last!.body, "*✅ Approved* · Harbour Lane Coffee\n\nIt goes to Google in 10 seconds.\n\nPress Undo to stop it.");
  assert.equal(onlyPost(w).state, "publishing");
  // The manager's button is now stale.
  const m = await send(w, deps, PHONES.manager, { button: lastButtonId(w, PHONES.manager, "Approve") });
  assert.notEqual(m.result, "approved");
});

Deno.test("photo post: Essentials with no posts left this month says so and offers Add as a photo or Skip", async () => {
  const w = new World();
  w.postsLeft.set(BIZ.deli, 0);
  const deps = w.deps();
  const r = await send(w, deps, PHONES.plain, { media: img("pp7"), text: "Fresh bagels from 7am every weekday" });
  assert.equal(r.result, "photo_post_used_up");
  assert.match(r.last!.body, /^\*🖼️ No posts left this month\*\n\nYour plan has no posts left this month, so Kabsi cannot make this a post\.\n\nYou can add the photo to your Google profile on its own, or skip it\.$/);
  assert.deepEqual(r.last!.buttons, ["Add as a photo", "Skip"]);
  const [photoId] = [...w.waPhotos.keys()];
  const s = await send(w, deps, PHONES.plain, { button: lastButtonId(w, PHONES.plain, "Skip") });
  assert.equal(s.result, "held_photo_skipped");
  assert.match(s.last!.body, /^\*🖼️ Okay, skipped\*\n\nNothing was put on Google\.$/);
  assert.equal(w.waPhotos.get(photoId)!.state, "skipped");
});

Deno.test("photo post: an owner of two businesses picks one first, then the photo becomes that business's post", async () => {
  const w = new World();
  const deps = w.deps();
  const r = await send(w, deps, PHONES.multi, { media: img("pp8"), text: "New whitening appointments on Saturdays" });
  assert.equal(r.result, "which_business");
  assert.equal(w.photos.length, 0, "nothing is uploaded before the business is known");
  const p = await send(w, deps, PHONES.multi, { button: `b:${BIZ.smile}` });
  assert.equal(p.result, "photo_post_shown");
  assert.match(p.last!.body, /^\*🖼️ Post with your photo\* · Smile Dental\n\n> New whitening appointments on Saturdays\n\n/);
  assert.equal(onlyPost(w).location, BIZ.smile);
  assert.equal(w.waPhotos.get(onlyPost(w).photo)!.user, USERS.multi);
});

Deno.test("photo post: Approve before the photo is checked asks to press again; then Approve and Undo", async () => {
  const w = new World();
  const deps = w.deps();
  await send(w, deps, PHONES.owner, { media: img("pp9"), text: CAPTION });
  const approve = lastButtonId(w, PHONES.owner, "Approve");
  const early = await send(w, deps, PHONES.owner, { button: approve });
  assert.equal(early.result, "refused:post_photo_missing");
  assert.match(early.last!.body, /^\*❓ Still checking the photo\*\n\nPress Approve again in a minute\.$/);
  w.waPhotos.get(onlyPost(w).photo)!.state = "draft";
  const a = await send(w, deps, PHONES.owner, { button: approve });
  assert.equal(a.result, "approved");
  assert.deepEqual(a.last!.buttons, ["Undo"]);
  const u = await send(w, deps, PHONES.owner, { button: lastButtonId(w, PHONES.owner, "Undo") });
  assert.equal(u.result, "undone");
  assert.match(u.last!.body, /^\*↩️ Undone\*\n\nNothing was sent\./);
});

Deno.test("photo post: Skip skips the post and its photo; a second Skip changes nothing", async () => {
  const w = new World();
  const deps = w.deps();
  await send(w, deps, PHONES.owner, { media: img("pp10"), text: CAPTION });
  const skip = lastButtonId(w, PHONES.owner, "Skip");
  const s = await send(w, deps, PHONES.owner, { button: skip });
  assert.equal(s.result, "photo_post_skipped");
  assert.equal(onlyPost(w).state, "skipped");
  assert.equal(w.waPhotos.get(onlyPost(w).photo)!.state, "skipped");
  const again = await send(w, deps, PHONES.owner, { button: skip });
  assert.equal(again.result, "post_skip:already");
  assert.ok(!w.calls.some((c) => c.startsWith("approve:")), "nothing approved");
});

Deno.test("photo post: someone else's Skip or Add as a photo is refused", async () => {
  const w = new World();
  const deps = w.deps();
  await send(w, deps, PHONES.owner, { media: img("pp11"), text: "The best coffee in town, call 212 555 0188" });
  const add = lastButtonId(w, PHONES.owner, "Add as a photo");
  const r = await send(w, deps, PHONES.plain, { button: add });
  assert.equal(r.result, "held_photo:not_yours");
  assert.equal([...w.waPhotos.values()][0].hold, true);
});

Deno.test("photo post: staff words that fail the checks get Skip only; Add as a photo is the owner's choice", async () => {
  const w = new World();
  const deps = w.deps();
  const r = await send(w, deps, PHONES.staff, { media: img("pp12"), text: "The best coffee in town, call 212 555 0188" });
  assert.equal(r.result, "photo_post_problem");
  assert.match(r.last!.body, /Or send the photo again without words to add it on its own, or skip it\.$/);
  assert.deepEqual(r.last!.buttons, ["Skip"]);
  const [photoId] = [...w.waPhotos.keys()];
  const add = await send(w, deps, PHONES.staff, { button: `hp:${photoId}` });
  assert.equal(add.result, "held_photo:not_yours", "staff cannot choose Add as a photo");
  assert.equal(w.waPhotos.get(photoId)!.hold, true);
  const skip = await send(w, deps, PHONES.staff, { button: `hs:${photoId}` });
  assert.equal(skip.result, "held_photo_skipped", "the sender may skip their own photo");
});

Deno.test("photo post: staff when no owner or manager has WhatsApp on are told it waits on kabsi.co", async () => {
  const w = new World();
  for (const u of w.users) if (u.id === USERS.owner || u.id === USERS.manager) u.optin = "stopped";
  const deps = w.deps();
  const r = await send(w, deps, PHONES.staff, { media: img("pp13"), text: CAPTION });
  assert.equal(r.result, "photo_post_staff_site");
  assert.match(r.last!.body, /It waits for the owner's yes on kabsi\.co\./);
  assert.ok(!w.outbox.some((x) => x.kind === "post_ready"));
});

Deno.test("photo post: a refusal from the database skips the held photo, nothing is left waiting", async () => {
  const w = new World();
  const deps = w.deps();
  const realPrepare = deps.db.photoPostPrepare;
  deps.db.photoPostPrepare = async () => ({ ok: false, reason: "location_not_active" });
  const r = await send(w, deps, PHONES.owner, { media: img("pp14"), text: CAPTION });
  assert.equal(r.result, "post_refused:location_not_active");
  assert.equal([...w.waPhotos.values()][0].state, "skipped");
  deps.db.photoPostPrepare = realPrepare;
});

// Fix 2 (master plan 30.27 item 2): the Approve under a photo post is bound to the post's text and its photo (the photo's id
// and its file). Any change after the post was shown makes the old Approve answer the existing changed-draft line; nothing
// is approved. A replayed Approve after a yes is the same yes.
async function shownPost(id: string) {
  const w = new World();
  const deps = w.deps();
  await send(w, deps, PHONES.owner, { media: img(id), text: CAPTION });
  const post = onlyPost(w);
  w.waPhotos.get(post.photo)!.state = "draft";
  return { w, deps, post, approve: lastButtonId(w, PHONES.owner, "Approve") };
}

Deno.test("photo post binding: unchanged text and photo, Approve works; pressing it again is the same yes", async () => {
  const { w, deps, post, approve } = await shownPost("fx1");
  // The file was recorded before the photo check finished: the same token still holds once it is checked.
  const a = await send(w, deps, PHONES.owner, { button: approve });
  assert.equal(a.result, "approved");
  assert.equal(post.state, "publishing");
  const again = await send(w, deps, PHONES.owner, { button: approve });
  assert.equal(again.result, "repeat");
  assert.match(again.last!.body, /^\*✅ This one is already handled\*\n\nNothing changed\.$/);
});

Deno.test("photo post binding: the text changed after it was shown, the old Approve is refused", async () => {
  const { w, deps, post, approve } = await shownPost("fx2");
  post.text = `${post.text} Now with oat milk.`;
  const a = await send(w, deps, PHONES.owner, { button: approve });
  assert.equal(a.result, "refused:changed");
  assert.match(a.last!.body, /^\*❓ This one is already handled\*\n\nNothing changed\.$/);
  assert.equal(post.state, "draft", "nothing approved");
});

Deno.test("photo post binding: another photo after it was shown, the old Approve is refused", async () => {
  const { w, deps, post, approve } = await shownPost("fx3");
  const other = [...w.waPhotos.keys()].find((k) => k !== post.photo) ?? "photo-other";
  w.waPhotos.set(other, { ...w.waPhotos.get(post.photo)!, file: "etag-2" });
  post.photo = other;
  const a = await send(w, deps, PHONES.owner, { button: approve });
  assert.equal(a.result, "refused:changed");
  assert.equal(post.state, "draft", "nothing approved");
});

Deno.test("photo post binding: the same photo with another file after it was shown, the old Approve is refused", async () => {
  const { w, deps, post, approve } = await shownPost("fx4");
  w.waPhotos.get(post.photo)!.file = "etag-replaced";
  const a = await send(w, deps, PHONES.owner, { button: approve });
  assert.equal(a.result, "refused:changed");
  assert.equal(post.state, "draft", "nothing approved");
  assert.ok(!w.calls.some((c) => c === `undo:${approve}`));
});
