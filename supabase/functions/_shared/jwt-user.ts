// Whether a bearer token carries a person (a session) rather than the public anon key, read without verifying it:
// Auth verifies it next. A visitor's call carries the anon key, and asking Auth about it only fails (bad_jwt, missing
// sub claim), so a token with no person is a signed-out visitor at once (session 18, 22 Oct 2026).
export function carriesUser(token: string): boolean {
  try {
    const part = token.split(".")[1];
    if (!part) return false;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.sub === "string" && json.sub.length > 0;
  } catch {
    return false;
  }
}
