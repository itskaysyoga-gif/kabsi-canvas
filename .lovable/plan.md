# Kabsi frontend foundation

## Build
- Establish the Kabsi color, type, radius, shadow, focus, motion, and button system in the global styles, loading Lalezar and Readex Pro from the document head.
- Add the reusable Kabsi logo, button, public header/footer with mobile menu, signed-in navigation shell, confirmation shell, account menu, and global error boundary.
- Connect the browser-only Supabase client using the provided public project values and add the unused function-call helper contract.
- Add session-only authentication state, email one-time-code sign-in, protected-route handling with redirect-back, and sign-out without creating profiles or storing app data.
- Create every requested public and protected route as a focused file, including the home introduction, placeholders, `/app` redirect, and all app tabs.
- Add unique page metadata for every content route and preserve the existing TanStack Query setup.

## Verify
- Check the generated route tree and preview diagnostics.
- Exercise public navigation, signed-out protection, login form states, mobile menu, and desktop/mobile shells in the browser.
- Inspect 360px, 390px, and 1440px views for overflow, spacing, and readable text.

## Technical details
- Frontend only; Lovable Cloud remains disabled and no schema, storage, or server code is added.
- Authentication uses only Supabase Auth email and user ID from the existing external project.
- Protected pages stay client-gated because browser session storage is unavailable during server rendering.
