# Kabsi Canvas

Build the foundation of "Kabsi" — a web app for local businesses: new Google reviews arrive with a drafted reply, and the owner approves before anything is posted. This first message is ONLY the shell: design system, layouts, routes and login. No business features yet.

HARD RULES
- FRONTEND ONLY. Do NOT enable Lovable Cloud, do not create a database, tables, edge functions or storage. The backend already exists in an external Supabase project.
- Connect with @supabase/supabase-js using these public values (safe in the browser), in src/lib/supabase.ts:
  URL: https://ynjdqjlmdwjgbfezevxy.supabase.co
  Publishable key: sb_publishable_eF-s_uWvQzj1MngyU1to6Q_aJNQZh2R
- English only. No i18n library.
- Never write copy that promises more reviews, star ratings, rankings, "SEO results", "boost", "5-star", "automatic replies", or implies a Google partnership. Don't use the Google "G" logo, Google colours or star icons anywhere.

DESIGN TOKENS (put in the global CSS as variables and map into Tailwind theme)
--kb-yellow #FFD60A (buttons and one accent per section only, never large areas; text on yellow is always black)
--kb-yellow-pressed #E8C309; --kb-black #000000; --kb-carbon #0B0B0B (marketing hero + footer only)
--kb-ink #111111 (text); --kb-white #FFFFFF; --kb-sand #F6F4EF (alternating sections, app background)
--kb-stone #5E5B55 (secondary text); --kb-stone-on-dark #C9C5BC; --kb-hairline #E4E0D7
--kb-red #D93025 (urgent labels in the app only); --kb-green #1F8A5B ("Live on Google" only)
Radius 14px (cards), 24px (large), pill 999px. Shadow 0 6px 18px rgba(0,0,0,.06).
Fonts (Google Fonts): "Lalezar" for display headings; "Readex Pro" 400/500/700 for everything else. Body never below 16px. Sentence case.
Buttons: primary = yellow bg, black text, Readex 700, 52px tall, full width on mobile, pressed state darkens to --kb-yellow-pressed and translates 1px down. Secondary = black outline. Tertiary = text link.
Motion: short (80–200ms), respect prefers-reduced-motion. No loops, parallax, counters or typewriter effects.
Icons: lucide-react, 2px stroke.
Logo placeholder until real SVGs are uploaded: a 28px circle (black 2px ring, yellow fill, small black dot offset up-right) next to the word "kabsi" in Readex Pro 700 lowercase.

LAYOUTS
1. PublicLayout: sticky white header (logo, links: How it works, Pricing, Partners, FAQ; right: "Log in" text link + yellow "Get set up" button → /start). Mobile: hamburger sheet. Carbon footer with: logo + "Tap. Review. Reply.", links (Pricing, Partners, FAQ, Privacy, Terms), "hello@kabsi.co", and the line "© Kabsi, Beirut. Kabsi is independent and not affiliated with Google."
2. AppLayout (for /app, /partner, /staff): Sand background. Desktop: left rail with nav items; mobile: bottom tab bar (max 5 items + "More"). Top bar with a location switcher placeholder and an account menu (email + Sign out).
3. ConfirmLayout: centered white card on Sand, logo on top, used by /a/:token.

ROUTES (placeholder pages with a Lalezar H1 and one plain sentence; each in its own file)
Public: / , /how-it-works, /pricing, /partners, /faq, /privacy, /terms, /activate/:code, /login, /a/:token
Signed-in: /start, /app (tabs as sub-routes: inbox, reviews, posts, photos, hours, shield, report, cards, knowledge, plan, settings — /app redirects to /app/inbox), /partner, /staff
404 page with a link home.

AUTH (Supabase email one-time code, no passwords)
- /login: step 1 email field → supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }). Step 2: 6-digit code input (shadcn InputOTP) → supabase.auth.verifyOtp({ email, token, type: 'email' }). Show clear errors, a "Resend code" link after 30 seconds, and "Use a different email".
- After login go to the `next` query param if present, else /app.
- An AuthProvider with onAuthStateChange; a RequireAuth wrapper that sends signed-out users to /login?next=<path>. Apply it to /start, /app/*, /partner, /staff.
- Sign out in the account menu.

DATA LAYER
- TanStack Query provider.
- src/lib/api.ts: a helper callFunction(name, body) that calls supabase.functions.invoke(name, { body }) and throws a readable Error on failure. Nothing uses it yet.

QUALITY
- Mobile first; check at 360px, 390px and 1440px. No horizontal scroll.
- A global React error boundary showing "Something went wrong. Reload the page." with a Reload button.
- Accessible: visible focus rings (2px black outline, 2px offset), labels on every input.
- Home page for now: Carbon hero with H1 "Every Google review, answered. You just tap Post." and sub "New reviews arrive with a reply already written in your customer's language. Read it, change it if you like, and tap Post. Nothing goes on Google without you." plus the two buttons ("Get set up" → /start, "See how it works" → /how-it-works). The rest of the home page comes later.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2f215f56-0677-42e1-b0d5-838eb32e1c1c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
