# Lighthouse, new website pages (P0.8-13), 22 Oct 2026

Method: `npm run build`, then the production server (`node .output/server/index.mjs`) behind a small proxy that compresses with Brotli like Vercel, Lighthouse 12 with the default mobile settings (simulated slow 4G, 4x CPU slowdown), headless Chromium, run from a cloud container. Numbers move by a few points from run to run.

- **Cold**: Lighthouse's default, empty cache and storage, so the privacy banner shows (a first visit).
- **Warm**: a Chromium profile that already holds the privacy choice and the cached files (a returning visitor).

| Page | Run | Performance | Accessibility | SEO | LCP | FCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Homepage, final | cold | 74 to 76 | 100 | | 4.4 s | 3.7 s | 60 to 80 ms | 0 |
| Homepage, final | warm | 93 to 94 | 100 | | 0.9 to 2.4 s | 0.9 to 2.4 s | 130 to 320 ms | 0 |
| Homepage, first build of PR 2 (with a blurred glow behind the hero) | warm | 81 | 100 | | 3.4 s | 3.2 s | 210 ms | 0 |
| Pricing | cold / warm | 84 / 92 | 100 | 100 | 3.3 s / 2.4 s | 3.1 s / 2.4 s | 170 / 210 ms | |
| How it works | cold / warm | 84 / 97 | 100 | 100 | 3.4 s / 1.2 s | 3.2 s / 1.2 s | 140 / 190 ms | |
| Old homepage (`1b66260`, same harness) | cold, 2 runs | 68 and 74 | | | 5.0 s | 3.3 to 3.8 s | | |
| kabsi.co live before the change, from the container | cold | 81 | | | 4.1 s | 2.7 s | 150 ms | |

Accessibility is 100 on every page (the card asks for 95). **Performance is at least 90 on a returning visitor on all three pages and below 90 on a first visit** (homepage 74 to 76, pricing and how it works 84). What the reports show:

- On a first visit the largest paint of the homepage is the privacy banner's paragraph, drawn after the consent check (the shared banner, P0.6-01).
- First paint on a cold load waits for the shared stylesheet and bundle (`index` 152 KB and `supabase` 55 KB after compression) and about 2.5 s of main thread work under the 4x slowdown; the pages' own code is small. "Reduce unused JavaScript" lists 116 KiB, all shared. This is why pricing and how it works, which are simple pages, also score 84 cold.
- A blurred decorative glow behind the hero cost the homepage about 12 points; it was removed.
- The new homepage is faster than the old one in the same cold harness (74 to 76 against 68 to 74), with no hero photo and no photo grid.

Not changed in this card: the privacy banner, the shared bundle split and the Supabase client load on public pages. They are listed under Found, not done in PROGRESS.


## After: lane R follow-up, item 6 (22 Oct 2026, session 20b)

Same method as above (`npm run build`, the production server behind a compressing proxy, Lighthouse 12, default mobile settings, headless Chromium, cold cache, run from a cloud container). Each row is three or four runs; numbers move by a few points.

| Page | Before | After | Accessibility | SEO | LCP | FCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Homepage | 74 to 76 (this machine, unchanged main: 58, 73, 72) | **96, 96, 96, 97** | 100 | 100 | 1.7 to 2.0 s | 1.6 to 1.9 s | 150 to 200 ms | 0 |
| Pricing | 84 | **96, 98, 96** | 100 | 100 | 1.7 to 2.0 s | 1.6 to 1.8 s | 150 to 180 ms | 0 |
| How it works | 84 | **94, 94, 97** | 100 | 100 | 1.9 to 2.2 s | 1.7 to 1.9 s | 160 to 210 ms | 0 |
| About (not in the card) | not measured | 97, 94, 98 | 100 | | 1.7 to 2.3 s | 1.6 to 2.0 s | 130 to 180 ms | 0 |

The harness serves the site on 127.0.0.1, where the page's own check says "local", so PostHog does not start (as in the first report). A second, stricter run opens the same build as a production host name, so PostHog and Sentry load from the internet, with gzip (Chrome does not accept Brotli on plain http) and HTTP/1.1: **homepage 92, 93, 85, 92** (LCP 2.2 to 2.5 s, FCP 1.9 to 2.1 s, TBT 240 to 430 ms), accessibility 100. That run is harsher than Vercel (HTTP/2 and Brotli) and shows the next step, PostHog's 330 KB script, which starts about 1.5 seconds after load.

What changed, in the order of effect:

1. **Module preload hints dropped on public pages** (`src/lib/head-hints.ts`, applied in `src/server.ts`). TanStack Start lists about forty scripts as `<link rel="modulepreload">` in the head; on a slow phone they compete with the stylesheet and fonts, and the first paint moved from 1.9 s to 3.4 s (homepage, same build, hints on and off). The scripts still load, one step later. Private pages (app, sign-in, setup) keep the hints.
2. **The privacy banner opens after the first paint** (`deferred-privacy-banner.tsx`, 1.5 s after load or at the first touch, at once from "Privacy choices"). Its words are unchanged and split into one short paragraph per sentence: one six-line paragraph was the largest thing on the page, so the browser reported the banner, not the headline text, as the page's main content (LCP 4.4 s). The consent check (`initConsent`) still runs as the page hydrates, before analytics. Checked in a real browser: before a choice there are no cookies and no PostHog storage, Decline sets none, Accept sets the PostHog cookie, the footer link pressed before the banner has loaded opens it with its two switches, and no Meta tag loads.
3. **The Supabase client is off the first load of public pages** (`supabase-config.ts` holds the URL and anon headers; `@/lib/supabase` loads supabase-js, 54 KB compressed). The auth provider, consent proof, sign-up attribution, Nora and the checklist helper now import it only when a session exists, the page is private or a sign-in is returning, and a visitor with no session is known to be signed out at once. `tests/performance.test.ts` fails if a first-load file imports it statically again.
4. **Nora's launcher loads 3 seconds after load or at the first touch** (`deferred-assistant.tsx`); a request to open her before then is kept and replayed.
5. **PostHog starts 1.5 seconds after load or at the first touch** (`telemetry.ts`); events sent before then wait in a list of at most 20 and go out if statistics are still allowed. Cost: a visit that ends sooner than that without a touch is not counted by PostHog. The server's own events are not affected.
6. **The homepage sections below the first screen are one lazy chunk** (`home-sections-below.tsx`, inside a Suspense boundary). The server still sends them in the same HTML, and the browser hydrates them as a second piece of work, which cut the long hydration task and the total blocking time.

Not changed: the stylesheet (116 KB, 18 KB compressed, one file for the whole app), the four font files, the React and TanStack code in the entry chunk (about 112 KB compressed), accessibility (100 on every page above).

Left for later: the industry pages (`/for/...`) score 76 to 79 because their hero photo from Supabase Storage is the largest paint (LCP 5.1 s on the harness); a smaller image or a preload would fix it. A stylesheet split between the public site and the app would be the next gain for every page.
