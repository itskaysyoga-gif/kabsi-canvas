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

`kabsi-app.lovable.app` stays published on Lovable only to redirect old email links to kabsi.co (`src/lib/legacy-host.ts`). The redirect is switched on after kabsi.co is served by Vercel. See the P0.1-03 entry in `docs/KABSI-PROGRESS.md` for the steps and how long Lovable must stay published.
