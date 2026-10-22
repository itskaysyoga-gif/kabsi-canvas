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
