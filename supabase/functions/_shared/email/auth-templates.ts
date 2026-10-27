// The four Supabase Auth emails (sign-in code, sign-up code, change email, reauthentication) on the one email layout
// (Email 1; they replace emails/build.py and its old Readex Pro layout). Supabase fills {{ .Token }} and {{ .NewEmail }}
// when it sends. scripts/render-emails.ts writes them to emails/auth/*.html; Rashid pastes each one into Supabase
// (emails/auth/README.md has the steps). Account mail: no unsubscribe, no button (the code is the action). Pure.
import { card, esc, para } from "../email-layout.ts";
import { renderEmail } from "./template.ts";
import { HEAD_FONT, TOKENS } from "./tokens.ts";

export type AuthTemplate = { file: string; template: string; subject: string; html: string };

const codeBox = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;"><tr><td class="kb-soft kb-t1" align="center" style="background:${TOKENS.sand};border-radius:12px;padding:18px 12px;font-family:'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace;font-size:34px;line-height:1;font-weight:700;letter-spacing:10px;color:${TOKENS.ink};">{{ .Token }}</td></tr></table>`;

function auth(o: { file: string; template: string; subject: string; preheader: string; title: string; intro: string; codeLabel: string; note: string; why: string }): AuthTemplate {
  const body = para(o.intro)
    + `<p class="kb-t2" style="margin:0 0 6px 0;font-family:${HEAD_FONT};font-size:13px;line-height:1.4;font-weight:700;color:${TOKENS.stone};">${esc(o.codeLabel)}</p>`
    + codeBox + para("The code works once and expires soon.") + card({ html: esc(o.note) });
  const { html } = renderEmail(
    { subject: o.subject, preheader: o.preheader, title: o.title, bodyHtml: body, text: "", why: o.why },
    { appUrl: "https://kabsi.co", defaultWhy: o.why },
  );
  return { file: o.file, template: o.template, subject: o.subject, html };
}

export function authTemplates(): AuthTemplate[] {
  const never = "Kabsi never asks anyone for this code. Never share it.";
  return [
    auth({
      file: "magic-link.html", template: "Magic link", subject: "Your Kabsi login code", preheader: "Your code to log in to Kabsi.", title: "Your login code",
      intro: "Use this code to log in to Kabsi.", codeLabel: "Login code",
      note: `If you did not try to log in, you can ignore this email. Nobody can log in without the code. ${never}`,
      why: "You asked to log in to Kabsi. Sign-in codes are not marketing and cannot be switched off.",
    }),
    auth({
      file: "confirm-signup.html", template: "Confirm signup", subject: "Your Kabsi code", preheader: "Your code to finish creating your Kabsi account.", title: "Welcome to Kabsi",
      intro: "Enter this code to confirm your email and finish setting up your account.", codeLabel: "Your code",
      note: `If you did not sign up for Kabsi, you can ignore this email. No account is made without the code. ${never}`,
      why: "You asked to create a Kabsi account. Sign-in codes are not marketing and cannot be switched off.",
    }),
    auth({
      file: "change-email.html", template: "Change email address", subject: "Confirm your new email for Kabsi", preheader: "Confirm your new email address.", title: "Confirm your new email",
      intro: "Enter this code in Kabsi to confirm <strong>{{ .NewEmail }}</strong> as your new login email.", codeLabel: "Your code",
      note: "If you did not ask to change your email, reply to this email and a person helps.",
      why: "You asked to change the email address of your Kabsi account. Security emails cannot be switched off.",
    }),
    auth({
      file: "reauthentication.html", template: "Reauthentication", subject: "Your Kabsi confirmation code", preheader: "Confirm it is you.", title: "Confirm it is you",
      intro: "Enter this code in Kabsi to confirm this change to your account.", codeLabel: "Your code",
      note: "If you did not ask for this, reply to this email and a person helps.",
      why: "Kabsi asked you to confirm a change to your account. Security emails cannot be switched off.",
    }),
  ];
}

/** emails/auth/README.md: what to paste where. */
export function authReadme(list: AuthTemplate[]): string {
  return [
    "# Supabase Auth email templates",
    "",
    "Built by `deno run --allow-read --allow-write scripts/render-emails.ts` from `supabase/functions/_shared/email/auth-templates.ts` on the one email layout (Email 1). Do not edit these files by hand.",
    "",
    "| Template in Supabase | Subject | File |",
    "|---|---|---|",
    ...list.map((t) => `| ${t.template} | ${t.subject} | \`${t.file}\` |`),
    "",
    "To paste (Rashid): Supabase dashboard, project Kabsi, Authentication, Emails, Templates. For each row: open the template, set Subject heading to the subject above, switch the message body to Source, select all, paste the whole file, Save. Then send yourself a login code from kabsi.co/login and check the code shows in the new layout.",
    "",
    "The mark is the hosted PNG at https://kabsi.co/email/kabsi-mark.png.",
    "",
  ].join("\n");
}
