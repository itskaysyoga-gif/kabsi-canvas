// Kabsi's Facebook and Instagram pages (R-59): the one constant. src/lib/site.ts re-exports it for the website, and every
// email footer reads it here. No imports, so the browser and the Edge Functions can both use it.
export const SOCIAL_LINKS = [
  { name: "Facebook", href: "https://www.facebook.com/profile.php?id=61574259448145" },
  { name: "Instagram", href: "https://www.instagram.com/kabsi.co" },
] as const;
