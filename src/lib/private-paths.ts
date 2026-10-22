// Pages that show an owner's or the team's data. Session replay never records them, the privacy banner does not open
// on them, and the auth provider loads the Supabase client for them. Pure, so the server entry can use it too.
const PRIVATE_PATHS = [
  /^\/app(\/|$)/,
  /^\/partner(\/|$)/,
  /^\/staff(\/|$)/,
  /^\/start(\/|$)/,
  /^\/login(\/|$)/,
  /^\/a\//,
  /^\/activate\//,
];

export function isPrivatePath(path: string) {
  return PRIVATE_PATHS.some((pattern) => pattern.test(path));
}
