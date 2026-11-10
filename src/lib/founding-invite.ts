// Founding 1 (R-151, master plan 30.51): Founding 25 is private. Its page is /founding/<slug>, where the slug is the one
// setting app_settings.founding_invite_slug (24 letters and digits, rotated by staff). The shape check is only a cheap
// first stop; the Edge Function programs compares the slug with the stored one. Kept equal to INVITE_SHAPE in
// supabase/functions/_shared/programs.ts by tests/founding1.test.ts.
export const INVITE_SHAPE = /^[A-Za-z0-9]{24}$/;
export const isInviteShape = (v: unknown): v is string =>
  typeof v === "string" && INVITE_SHAPE.test(v);
