// FIX-0: the one place that decides which key the Edge Functions use for the database.
// Order: KABSI_SECRET_KEY (a secret key, sb_secret_..., made in Settings, API Keys), then SUPABASE_SERVICE_ROLE_KEY, but
// only when it is set and still usable. A value is never printed, logged or returned in an error: errors name the
// variables only. Self-contained (no imports) so health and google-capture can use it too.

export const SERVICE_KEY_ENV = "KABSI_SECRET_KEY";
export const LEGACY_SERVICE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";

function jwtPayload(value: string): Record<string, unknown> | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parts[1].length / 4) * 4, "="));
    const payload = JSON.parse(json);
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

/** True for a secret key (sb_secret_...), or for a legacy service_role JWT that has not expired. Shape only: it cannot
 *  know whether the project has revoked the key. */
export function usableServiceKey(value: string | undefined | null, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  if (v.startsWith("sb_secret_")) return v.length > 20;
  const payload = jwtPayload(v);
  if (!payload || payload.role !== "service_role") return false;
  // An issued-at in the future (the 14 Nov 2026 failure was "JWT issued at future") is not usable either.
  if (typeof payload.iat === "number" && payload.iat > nowSeconds + 60) return false;
  return typeof payload.exp !== "number" || payload.exp > nowSeconds;
}

export type EnvReader = (name: string) => string | undefined;

/** The key to send to the database as a server. Throws, naming the two variables, when neither is usable. */
export function serviceKey(read: EnvReader = (n) => Deno.env.get(n), nowSeconds?: number): string {
  for (const name of [SERVICE_KEY_ENV, LEGACY_SERVICE_KEY_ENV]) {
    const v = read(name);
    if (usableServiceKey(v, nowSeconds)) return v!.trim();
    // A variable that is set but unusable (mistyped, truncated, expired) is named, never shown.
    if (v) console.warn(`service_key: ${name} is set but not usable`);
  }
  throw new Error(`no usable database key: set ${SERVICE_KEY_ENV} (a secret key) or ${LEGACY_SERVICE_KEY_ENV}`);
}
