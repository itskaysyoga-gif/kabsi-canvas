// Run: deno test supabase/functions/_shared/team.test.ts
// P0.3-06: the team invitation email and its job. Roles and rights themselves are tested in the database suite
// (supabase/tests/roles.sql).
import assert from "node:assert/strict";
import { sendTeamInvite, type TeamInvite, teamInviteEmail } from "./team.ts";

const invite = (o: Partial<TeamInvite> = {}): TeamInvite => ({
  email: "new-hire@example.test", role: "staff", business: "Harbour Lane Coffee", invited_by: "owner@example.test",
  open: true, expires_at: "2026-10-29T04:00:00Z", ...o,
});

Deno.test("the invitation says who, which business, which role and how to accept, in house style", () => {
  const m = teamInviteEmail(invite(), "https://kabsi.co");
  assert.equal(m.subject, "Harbour Lane Coffee: you're invited to Kabsi");
  assert.match(m.text, /owner@example\.test added you as a staff member of Harbour Lane Coffee/);
  assert.match(m.text, /add photos and share the review link/);
  assert.match(m.text, /Sign in with this email address, new-hire@example\.test, to accept/);
  assert.match(m.text, /29 October 2026/);
  assert.match(m.text, /never asks for your Google password or a verification code/);
  assert.equal(m.button.url, "https://kabsi.co/login");
  for (const s of [m.subject, m.text, m.bodyHtml, m.note, m.title, m.preheader]) {
    assert.ok(!/[–—!]/.test(s), `no dashes or exclamation marks: ${s}`);
  }
  const mgr = teamInviteEmail(invite({ role: "manager" }), "https://kabsi.co");
  assert.match(mgr.text, /as a manager of/);
  assert.match(mgr.text, /approve what the owner allows/);
});

Deno.test("names in the email are escaped", () => {
  const m = teamInviteEmail(invite({ business: "<b>Cafe</b>" }), "https://kabsi.co");
  assert.ok(!m.bodyHtml.includes("<b>Cafe</b>"));
  assert.ok(m.bodyHtml.includes("&lt;b&gt;Cafe&lt;/b&gt;"));
});

Deno.test("the job sends only while the invite is open", async () => {
  const sent: string[] = [];
  const send = (i: TeamInvite) => { sent.push(i.email); return Promise.resolve(); };
  assert.equal(await sendTeamInvite("a", { read: () => Promise.resolve(invite()), send }), "sent");
  assert.equal(await sendTeamInvite("b", { read: () => Promise.resolve(invite({ open: false })), send }), "closed");
  assert.equal(await sendTeamInvite("c", { read: () => Promise.resolve(null), send }), "closed");
  assert.deepEqual(sent, ["new-hire@example.test"]);
});
