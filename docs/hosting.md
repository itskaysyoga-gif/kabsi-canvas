# Hosting

The website and app run on Vercel (team itskaysyoga-5542s-projects, project kabsi-canvas), built from `main` of `itskaysyoga-gif/kabsi-canvas`. Branches named `claude/*` are not built by Vercel (`git.deploymentEnabled` in `vercel.json`), and an `ignoreCommand` skips the build when a commit changes only files under `docs/` or `*.md` files (Vercel's daily deployment limit, 22 Oct 2026). Other branches still get a preview deployment. Edge Functions and the `kabsi-go` Worker are deployed by `.github/workflows/deploy.yml`, not by Vercel.

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

Previews of branches that Vercel builds use the same Supabase project. Preview and `*.vercel.app` addresses send `X-Robots-Tag: noindex` (`vercel.json`). Vercel Authentication protects them for team members; the connector can fetch one with a temporary link.

## Old address

Kabsi does not use Lovable. The Lovable account was cancelled on 23 Oct 2026, so `kabsi-app.lovable.app` no longer forwards anything; the forwarding code (`src/lib/legacy-host.ts`), `bun.lock` and `bunfig.toml` were removed in Clean 1 (master plan 25.10, 28.9). Email links from before 8 Oct 2026 that use the old address no longer open.

## Redirects and indexing (`vercel.json`)

- Old kabsi.co pages with no twin on the new site, permanent: `/lebanon`, `/product` and their subpaths to `/pricing`, `/partner` and its subpaths to `/partners`, `/contact` to `/faq`, `/report` to `/how-it-works`, `/admin` and `/auth/...` to `/login`, `/r-not-found` to `/`.
- Old review cards: `/r/SEVEN1` redirects (302) to that business's Google review page; any other `/r/<code>` goes to `/` (302). New cards use go.kabsi.co.
- Only kabsi.co is indexable: `*.vercel.app` (previews and the Vercel address) sends `X-Robots-Tag: noindex`; so do the private paths (`/app`, `/partner`, `/staff`, `/start`, `/login`, `/a/`, `/activate/`).


## Public page speed (lane R, 22 Oct 2026)

`src/server.ts` drops the `<link rel="modulepreload">` hints from the head of public HTML pages (`src/lib/head-hints.ts`); the app, sign-in and setup keep them. The privacy banner, Nora's launcher and PostHog load after the first paint, and the Supabase client loads only when there is a session. Numbers and method: `docs/reports/lighthouse-home-2026-10-22.md`. `tests/performance.test.ts` keeps these in place.

## Installs, versions and upgrades (Ops 1 part B, master plan 25.1 and 26.6)

- `package-lock.json` is committed. CI and Vercel install with `npm ci --registry=https://registry.npmjs.org --legacy-peer-deps` (`vercel.json` `installCommand`, `.github/workflows/ci.yml`), so every build gets exactly the packages the lockfile names. To change a dependency, run `npm install` once locally and commit the lockfile with the `package.json` change in the same pull request.
- Every GitHub Action is pinned to a full commit SHA with its version in a comment, and `npm run check:repo` (part of CI) fails on a tag. Dependabot opens one grouped weekly pull request that moves the pins; npm packages get Dependabot security updates only. Both merge only on green CI.
- Source maps: a production Vercel build with `SENTRY_AUTH_TOKEN` set makes hidden source maps, uploads them to Sentry under the release tag (the commit), and deletes them from the output (`scripts/sentry-sourcemaps.mjs`). Without the token the build is unchanged. The token is added in Vercel under Settings, Environment Variables, Production only, Sensitive (`docs/OPS-SETUP.md`, step 5).
- Framework versions stay pinned (TanStack Start and Router, Vite, Nitro, React, Tailwind). **When to upgrade:** only when the new version has been stable for two quiet weeks (no patch release in the last 14 days and no open regression issue on its tracker), and then as its own session and pull request, never mixed with a feature. No framework upgrade before launch. A Dependabot security update for one of them is the exception: it goes through CI like any other and is checked by hand on the preview.
- Lighthouse CI runs on every pull request against the built site and prints the 24.9 budgets for each public page in the job summary. It is report only until Web 2, which points it at the Vercel preview and makes it blocking (`lighthouserc.json`: change each `warn` to `error`; `ci.yml`: remove `continue-on-error`).
