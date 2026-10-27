// Sec 1: the one way an Edge Function reads the visitor's address for a rate limit key or Turnstile's remoteip.
// Order: cf-connecting-ip (set by Cloudflare in front of Supabase, a visitor cannot forge it), then the first
// X-Forwarded-For entry (Supabase's gateway rewrites the header, so a forged value is not trusted; checked live in
// docs/progress/archive/evidence.md). x-real-ip is not read: it can name a proxy, which would put every visitor under
// one key. Anything that is not an address becomes "unknown", which shares one key and so is limited harder.
// The address is never stored: callers hash it with a salt before it becomes a key.
const IP_RE = /^[0-9a-fA-F:.]{2,45}$/;

export function clientIp(req: Request): string {
  const cf = (req.headers.get("cf-connecting-ip") ?? "").trim();
  if (IP_RE.test(cf)) return cf;
  const first = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return IP_RE.test(first) ? first : "unknown";
}
