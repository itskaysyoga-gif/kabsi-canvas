"""Builds Kabsi's branded Supabase Auth email templates from one layout.
Run: python3 emails/build.py  → writes emails/auth/*.html
Paste each file into Supabase → Authentication → Emails → <template> (Source)."""
import pathlib
LOGO = "https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/brand/mark.png"
FONT = "'Readex Pro',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

def layout(preheader, title, intro, code_label, after, note):
    return f"""<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#F6F4EF;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F6F4EF;">{preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F4EF;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 20px 4px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="{LOGO}" width="32" height="32" alt="Kabsi" style="display:block;border:0;width:32px;height:32px;"></td>
<td style="vertical-align:middle;padding-left:10px;font-family:{FONT};font-size:22px;font-weight:700;color:#000000;letter-spacing:-0.3px;">kabsi</td>
</tr></table>
</td></tr>
<tr><td style="background:#FFFFFF;border-radius:14px;padding:36px 32px;font-family:{FONT};color:#111111;">
<h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;font-weight:700;color:#111111;">{title}</h1>
<p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:#111111;">{intro}</p>
<p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#5E5B55;text-transform:uppercase;letter-spacing:1px;">{code_label}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="background:#FFD60A;border-radius:14px;padding:18px 12px;text-align:center;font-family:'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace;font-size:34px;line-height:1;font-weight:700;letter-spacing:10px;color:#000000;">{{{{ .Token }}}}</td>
</tr></table>
<p style="margin:24px 0 0 0;font-size:16px;line-height:1.6;color:#111111;">{after}</p>
<p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;color:#5E5B55;">{note}</p>
</td></tr>
<tr><td style="padding:20px 4px 0 4px;font-family:{FONT};font-size:13px;line-height:1.6;color:#5E5B55;">
Kabsi only posts what you approve.<br>
Questions? Reply to this email or write to <a href="mailto:hello@kabsi.co" style="color:#111111;">hello@kabsi.co</a>.<br>
Kabsi, Beirut, Lebanon. Kabsi is independent and not affiliated with Google.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
"""

T = {
 "magic-link.html": ("Magic link or OTP", "Your Kabsi login code",
   layout("Your code to log in to Kabsi.", "Your login code",
     "Use this code to log in to Kabsi.", "Login code",
     "The code works once and expires soon.",
     "If you didn't try to log in, you can ignore this email. Nobody can log in without the code.")),
 "confirm-signup.html": ("Confirm signup", "Your Kabsi code",
   layout("Your code to finish creating your Kabsi account.", "Welcome to Kabsi",
     "Enter this code to confirm your email and finish setting up your account.", "Your code",
     "The code works once and expires soon.",
     "If you didn't sign up for Kabsi, you can ignore this email. No account is created without the code.")),
 "change-email.html": ("Change email address", "Confirm your new email for Kabsi",
   layout("Confirm your new email address.", "Confirm your new email",
     "Enter this code in Kabsi to confirm <strong>{{ .NewEmail }}</strong> as your new login email.", "Your code",
     "The code works once and expires soon.",
     "If you didn't ask to change your email, reply to this email and we'll help.")),
 "reauthentication.html": ("Reauthentication", "Your Kabsi confirmation code",
   layout("Confirm it's you.", "Confirm it's you",
     "Enter this code in Kabsi to confirm this change to your account.", "Your code",
     "The code works once and expires soon.",
     "If you didn't request this, reply to this email and we'll help.")),
}
out = pathlib.Path(__file__).parent / "auth"; out.mkdir(exist_ok=True)
index = ["# Supabase Auth email templates", "", "| Template in Supabase | Subject | File |", "|---|---|---|"]
for fn, (tpl, subject, html) in T.items():
    (out / fn).write_text(html)
    index.append(f"| {tpl} | {subject} | `{fn}` |")
(out / "README.md").write_text("\n".join(index) + "\n\nLogo is served by the `brand` Edge Function. Regenerate with `python3 emails/build.py`.\n")
print("\n".join(index))
