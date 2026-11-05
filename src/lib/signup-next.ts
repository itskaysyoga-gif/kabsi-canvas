/** Only same-site paths: "/x", never "//host" or "/\\host" (browsers treat both as another site). */
export function safeNext(next?: string) {
  return next && /^\/(?![/\\])/.test(next) && !next.includes("\\") ? next : "/app";
}
