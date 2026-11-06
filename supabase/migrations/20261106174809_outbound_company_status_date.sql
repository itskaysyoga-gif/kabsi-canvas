-- Outbound test part 2 (master plan 30.39 item 12): no Companies House API key. Harvey's register carries company_status
-- and company_status_date (the date of Companies House's free Basic Company Data file, Open Government Licence) and
-- outbound-prepare records both on the prospect, so the staff page shows which file said the company was Active.
alter table public.outbound_prospects add column if not exists company_status_date date;
comment on column public.outbound_prospects.company_status_date is
  'Date of the Companies House Basic Company Data file that gave company_status (via Harvey''s register.csv); a UK prospect is drafted only when that file is at most 40 days old and says Active (30.39 item 12).';
