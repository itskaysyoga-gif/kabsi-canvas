# Manager access instructions

## Changes
1. Improve the onboarding access step with existing shadcn tabs for phone and computer instructions, keeping the current phone flow and adding the five requested computer steps.
2. Reuse the current email copy control, replacing its direct clipboard call with the existing reliable `copyText` helper.
3. Add the two requested expandable help answers below the tabs using the existing shadcn accordion.
4. Add a share button that uses the device share sheet when available, otherwise copies the exact business-specific `/manager-steps` link and gives clear feedback.
5. Add `src/routes/manager-steps.tsx` as a public, noindex page. Validate and trim the optional `b` query value to 80 characters, render it only as text, show both instruction sets, the removal note, and the existing non-affiliation line.
6. Leave the sitemap unchanged.

## Verification
- Run the project type-check.
- Test the onboarding tabs, accordion, email copy, and share/copy fallback.
- Test `/manager-steps` with and without a business name, including overlong and encoded input.
- Check 390 px and 1440 px for overflow and 44 px tap targets.
