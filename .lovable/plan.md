# Kabsi — full audit and improvement plan (brief for the build team)

All changes stay frontend only: no Lovable Cloud, no tables, writes only through existing functions. Brand and copy rules unchanged.

## 1. Account flow (highest priority)

Current problem found: the public header always shows "Log in" and "Get set up", even when the owner is signed in. An owner who leaves the dashboard to read Pricing or FAQ has no visible way back, and "Log in" silently bounces them.

Target flow:
```text
Visitor -> Get set up -> /login (email) -> 6-digit code -> /start (new) or /app/inbox (returning)
Signed in -> visits / or /pricing -> header shows "Dashboard" button + account menu
Dashboard -> "View website" link -> public pages -> "Dashboard" returns to last tab
Sign out -> confirm -> clears data -> home page with "You're signed out." note -> Back button does not reopen dashboard
```
Changes:
- Public header reads the session. Signed in: replace "Log in" + "Get set up" with one yellow "Go to dashboard" button and a small account menu (email, Dashboard, Sign out). Same in the mobile menu. Show nothing session-dependent until the session has loaded (no flicker).
- Remember the last dashboard tab; "Go to dashboard" returns there.
- "Get set up" when signed in: go to /start only if setup is unfinished, otherwise to the dashboard.
- /login when already signed in: redirect immediately (already works) — keep.
- After code: new owners go to /start, returning owners to `next` or /app/inbox.
- Sign out: cancel pending loads, clear cached data, sign out, replace history, land on home with a one-line "You're signed out." message.
- Session expired mid-use: friendly "Please log in again" and return to the same page after login.
- Add "View website" link in the dashboard account menu.
- Resend timer: spec says 30 seconds, code uses 60 — align to 30.

## 2. Landing page
- Restore the agreed hero line ("Every Google review, answered. You just tap Post.") or confirm the current one is intended.
- Keep the live reply demo high on the page; add a short 3-step strip (Tap, Review, Reply).
- One yellow button per section; remove duplicated calls to action.
- Nora chat button must not cover buttons or the footer on phones (add bottom space, hide over open menus).

## 3. Business pages (/for/...)
- Each page: one real example review and reply for that trade, plus a trade-specific FAQ.
- Clear link to pricing and to the demo.
- No invented numbers or testimonials.

## 4. Partners page
- Simple "how you earn" explanation with a calculator the visitor fills in (no promised figures).
- Clear single sign-up action.

## 5. Dashboard
- Mobile tab bar and desktop rail: active tab clearly marked; "More" sheet lists remaining tabs.
- Every empty page: one plain sentence.
- Every "Post" opens a confirm sheet showing the exact final text.
- Location switcher: show real locations when available, hide when only one.

## 6. Quality
- Test at 360, 390, 1440: no sideways scroll.
- Focus rings visible, every field labelled, body text 16px or more.
- Remove the unused font preload warnings.

## 7. New ideas
- Approve replies from an email or phone notification link (/a/:token) without opening the dashboard.
- Weekly summary email of replies posted.
- Multi-location overview showing which branch has replies waiting.

## Technical details
- `src/components/layouts/public-layout.tsx`: use `useAuth()`; render signed-in variant after `loading` is false.
- Store last dashboard path in sessionStorage, read in effect.
- `app-layout.tsx` sign out: `queryClient.cancelQueries()`, `clear()`, `signOut()`, `navigate({to:"/", search:{signedOut:1}, replace:true})`.
- `login.tsx`: resend 30s; route decision via existing onboarding status read.

## Verify
- Playwright: log in (mock session), open /pricing, confirm "Go to dashboard", return to last tab, sign out, press Back, confirm redirected to login.
