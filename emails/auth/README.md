# Supabase Auth email templates

Built by `deno run --allow-read --allow-write scripts/render-emails.ts` from `supabase/functions/_shared/email/auth-templates.ts` on the one email layout (Email 1). Do not edit these files by hand.

| Template in Supabase | Subject | File |
|---|---|---|
| Magic link | Your Kabsi login code | `magic-link.html` |
| Confirm signup | Your Kabsi code | `confirm-signup.html` |
| Change email address | Confirm your new email for Kabsi | `change-email.html` |
| Reauthentication | Your Kabsi confirmation code | `reauthentication.html` |

To paste (Rashid): Supabase dashboard, project Kabsi, Authentication, Emails, Templates. For each row: open the template, set Subject heading to the subject above, switch the message body to Source, select all, paste the whole file, Save. Then send yourself a login code from kabsi.co/login and check the code shows in the new layout.

The mark is the hosted PNG at https://kabsi.co/email/kabsi-mark.png.
