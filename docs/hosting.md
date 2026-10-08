# Hosting

The website and app run on Vercel (team itskaysyoga-5542s-projects, project kabsi-canvas), built from `main` of `itskaysyoga-gif/kabsi-canvas`. Every pull request gets a preview deployment. Edge Functions and the `kabsi-go` Worker are deployed by `.github/workflows/deploy.yml`, not by Vercel.

## Environment variables

Only two names, both public by design, set in Vercel for Production, Preview and Development. Values are never written in the repository, in logs or in pull requests.

| Name                            | Where the value comes from                                     | Read by               |
| ------------------------------- | -------------------------------------------------------------- | --------------------- |
| `VITE_SUPABASE_URL`             | Supabase project `ynjdqjlmdwjgbfezevxy`, Project Settings, API | `src/lib/supabase.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same page, the publishable key (starts `sb_publishable_`)      | `src/lib/supabase.ts` |

`vercel.json` runs `scripts/check-env.mjs` before the build. It fails the build when either name is missing or empty, and when a `VITE_` name looks like a server secret.

Anything starting `VITE_` is copied into the browser bundle. Never give that prefix to a secret.

## What must not be in Vercel

The site code reads no server secret, so none belongs here. In particular: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`, every `POSTGRES_*` value, and the unprefixed or `NEXT_PUBLIC_` copies of the URL and keys that the Supabase integration adds. Server secrets live in Supabase secrets (Edge Functions) and GitHub Actions secrets (deploys). To stop the integration adding them back, disconnect the Supabase integration from this Vercel project (Settings, Integrations).

## Previews

Pull request previews use the same Supabase project. Preview and `*.vercel.app` addresses send `X-Robots-Tag: noindex` (`vercel.json`). Vercel Authentication protects them for team members; the connector can fetch one with a temporary link.

## Old address

`kabsi-app.lovable.app` stays published on Lovable only to forward old email links to the same path on kabsi.co (`src/lib/legacy-host.ts`, switched on). It must stay published at least 7 days after `APP_URL` moves to kabsi.co, and 90 days to be safe, then check Lovable visitor analytics before removing it.

## Redirects and indexing (`vercel.json`)

- Old kabsi.co pages with no twin on the new site, permanent: `/product` to `/lebanon`, `/contact` to `/faq`, `/report` to `/how-it-works`, `/admin` and `/auth/...` to `/login`, `/r-not-found` to `/`. `/`, `/how-it-works`, `/pricing`, `/faq`, `/privacy`, `/terms`, `/login` and `/app` exist on the new site.
- Old review cards: `/r/SEVEN1` redirects (302) to that business's Google review page; any other `/r/<code>` goes to `/` (302). New cards use go.kabsi.co.
- Only kabsi.co is indexable: `*.vercel.app` (previews and the Vercel address) sends `X-Robots-Tag: noindex`; so do the private paths (`/app`, `/partner`, `/staff`, `/start`, `/login`, `/a/`, `/activate/`).
