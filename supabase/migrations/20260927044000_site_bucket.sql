-- Public bucket for marketing-site photos (plain places, no people, no brands; KABSI-BRAND "Imagery").
-- Written only by the internal `site-assets` Edge Function (service role); readable by anyone.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site', 'site', true, 2097152, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;
