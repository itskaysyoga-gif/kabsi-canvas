# Kabsi

Kabsi looks after a local business's Google Business Profile: a reply ready for every new review, the listing watched and kept right, photos and posts prepared, a Weekly Care Report, and nothing published without the owner's approval. Your reviews and listing. Taken care of.

This repository is the website and app (TanStack Start, React, Tailwind), the Supabase Edge Functions and migrations, and the `kabsi-go` Cloudflare Worker.

- Plan and rules for every change: `docs/KABSI-PLAN.md` (sections 1 and 2), progress in `docs/KABSI-PROGRESS.md`, instructions for Claude in `CLAUDE.md`.
- Hosting, environment variables, previews and redirects: `docs/hosting.md`. The site runs on Vercel at https://kabsi.co; every pull request gets a preview.
- Edge Functions and the Worker are deployed by `.github/workflows/deploy.yml` on a push to `main`.

## Development

You need Node.js 22 and npm.

```sh
npm install --registry=https://registry.npmjs.org --legacy-peer-deps
npm run dev
```

Checks before a pull request: `npm run typecheck`, `npm run lint:changed`, `npm test`, `npm run build` (plan section 2.4).
