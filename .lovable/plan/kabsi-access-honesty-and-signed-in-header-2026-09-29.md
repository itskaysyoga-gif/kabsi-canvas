# Kabsi access honesty and signed-in header

## Changes

- Search all `src/` copy for setup or Manager-access speed promises. Replace only claims about setup or access with honest wording that says Kabsi accepts the invite and emails the owner when access works. Leave drafting-speed and unrelated timing messages unchanged.
- Update the onboarding access waiting state with a small text-only `Early access` badge and: “We will email you as soon as access works. You can close this page.”
- Update the onboarding completion screen to use `Almost there` whenever Google access or payment is still pending. Show the existing two readiness checks as `Access from Google` and `Your plan`, with each check driven only by the location data already loaded. Keep `You're set` when both are complete.
- Update the public header for authenticated owners. Desktop and mobile will show a clear dashboard link plus an account menu containing the signed-in email and a working sign-out action. Signed-out visitors keep the current `Log in` and `Get set up` links.

## Scope safeguards

- No new API calls, packages, routes, backend work, pricing changes, or unrelated copy/design changes.
- Reuse the existing authentication provider, menu components, button styles, and design tokens.

## Verification

- Run the existing type-check.
- Re-scan `src/` for the specified timing phrases and confirm unrelated drafting-speed wording remains unchanged.
- Check the affected screens at 390 px and 1440 px, including signed-out and signed-in header states, dashboard navigation, account menu, and sign-out.
