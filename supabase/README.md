# Kabsi backend (Supabase project `kabsi-prod`, ref `ynjdqjlmdwjgbfezevxy`)

- `migrations/` — every migration already applied to production, named with the exact version
  Supabase recorded (`list_migrations`). Never edit an applied file; add a new one.
- `functions/` — Edge Functions. Deployed by Claude (Supabase MCP) and kept here as the source of truth.
- There is deliberately **no `config.toml`** here: pushing one through the GitHub integration could
  overwrite live Auth settings (SMTP, templates, redirect URLs) that were set in the dashboard.
- Lovable must never create files in this folder (Lovable Cloud stays disabled).

Spec: `claude/KABSI-SPEC.md` in the claude.ai project.
