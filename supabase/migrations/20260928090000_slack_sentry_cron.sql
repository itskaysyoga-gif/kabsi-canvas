-- KABSI — D265: Sentry has no Slack integration without the Team plan, so poll its API instead.
-- slack/sentry (deployed separately) checks kabsi-web/kabsi-edge/kabsi-go for new unresolved issues
-- every 10 minutes and posts each one to #kabsi-alerts once (dedupe_key = sentry:<issue id>).
select cron.schedule('kabsi_slack_sentry', '*/10 * * * *', $$select public.call_internal('slack/sentry')$$);
