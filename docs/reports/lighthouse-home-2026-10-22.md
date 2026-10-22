# Lighthouse, homepage (P0.8-13 PR 2), 22 Oct 2026

Method: `npm run build`, then the production server (`node .output/server/index.mjs`) behind a small proxy that gzips with Brotli like Vercel, Lighthouse 12 with the default mobile settings (simulated slow 4G, 4x CPU slowdown), headless Chromium, run from a cloud container. Numbers move by a few points from run to run. The old homepage was built from `1b66260` and measured the same way.

| Page and visitor | Performance | Accessibility | Best practices | SEO | LCP | FCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| New homepage, first visit (privacy banner shows) | 76 | 100 | 100 | 100 | 4.4 s | 3.3 to 3.6 s | 70 ms | 0 |
| New homepage, returning visitor (choice stored) | 81 | 100 | | | 3.4 s | 3.2 s | 210 ms | 0 |
| Old homepage, first visit (same harness, 2 runs) | 68 and 74 | | | | 5.0 s | 3.3 to 3.8 s | | |
| kabsi.co live before this change, from the container | 81 | | | | 4.1 s | 2.7 s | 150 ms | |

Accessibility is 100 (the card asks for 95). **Performance is below the card's 90.** What the report shows:

- On a first visit the largest paint is the privacy banner's paragraph, not the page (it is drawn after the consent check). That is the shared banner (P0.6-01), not the homepage.
- First paint waits for the shared bundle (`index` 152 KB and `supabase` 55 KB after compression) and 2.5 s of main thread work under the 4x slowdown; the page's own code is small. "Reduce unused JavaScript" lists 116 KiB, all shared.
- The new page is faster than the old one in the same harness because it has no hero photo and no 8-photo grid.

Not changed in this card: the privacy banner, the shared bundle split and the Supabase client load on public pages. They are listed under Found, not done in PROGRESS.
