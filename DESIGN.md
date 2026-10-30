# DESIGN.md: the Kabsi design system

Rewritten by Web 3 on 30 Oct 2026 to the light-led system of Design 6 and Design 6 round 2 (master plan 30.20 section 3 and 30.21; itskaysyoga-gif/kabsi-design-studio docs/DESIGN-PROPOSAL.md, docs/DESIGN-6-AUDIT.md and docs/DESIGN-6-REVIEW.md, approved by lane R on 30 Oct 2026). It replaces Web 2's dark-first version of 27 Oct 2026 (Design 1 to 5), which is in git. Every UI session reads this file first. Copy for every page is in docs/COPY.md (section 24 lists the design lines). The code is the contract: tokens in src/styles.css, parts in src/components/kabsi.

## Principles
- Light-led and editorial on the public website (Design 6): warm ivory (`kb-sand`, the light roles) for reading areas, near-black bands (`.theme-dark`) for the product story, the pricing preview, the closing check and the footer, yellow only for the main action, WhatsApp green only for WhatsApp or success. The public site, the signed-in website and the emails are one system. Kabsi is shown as subscription software the owner controls, never as an agency.
- The product is the picture: Home's one interactive phone (the demonstration) and the nearby check, each marked Example.
- One job, one headline, one paragraph, one visual and one main button per section. One yellow button per screen: any element marked `data-main-cta` on screen keeps the header button outlined and the phone bar hidden.
- At most one coloured headline phrase, through the `--phrase` role (`text-phrase`): kb-ink on ivory, kb-yellow on a dark band, so yellow text never sits on ivory (1.3 to 1). Home's H1 is the brand line in one colour; the industry H1's "Taken care of." uses the phrase role. The lead stays text-2.
- No handwritten note and no third font (rule-book conflict 13): if a hand-drawn touch is ever wanted, it is one drawn SVG, with lane R's yes.
- Phone first at 390 px, then 768 and 1440 px. No sideways scroll at 320 px. Sentence case everywhere; no capitals or tracked eyebrows.
- Only these tokens (K-108). No hex values in components, no Tailwind default colours, no page-specific styling. scripts/check-tokens.mjs fails a hex value outside the @theme blocks of src/styles.css.
- Every public page, the customer pages (review page, card set up, staff upload, email actions, unsubscribe, payment done) and the signed-in website are light (`.theme-light`). `SiteShell` sets `.theme-light .page-light` by default; `theme="dark"` remains for a page that has not moved yet. Inside a light page, any black band carries `.theme-dark` so its text takes the dark roles.

## Colour (src/styles.css, three layers)
1. Brand constants, in the `@theme static` block: `--kb-*`, `--map-*`, `--wa-*`, `--phone-*`. Fixed values, never used for a role directly in pages.
2. Roles, what pages use: `--surface-0..3`, `--surface-band`, `--text-1..3`, `--line`, `--line-strong`, `--stroke`, `--focus`, `--ok`, `--warn`, `--bad` and their `-soft` grounds, `--info-soft`, `--glass`, `--scrim`. `.theme-light` (also `:root`, and the public pages through SiteShell) and `.theme-dark` (the bands and the footer inside a light page) switch them. `body:not(:has(.page-light)):has(.theme-dark)` lets a fully dark page's ground, dialogs and consent bar follow it, and never turns a light page dark because it holds a band. `--phrase` is the one coloured headline phrase.
3. Tailwind names: `bg-surface-1`, `text-text-2`, `border-line`, `bg-band`, `text-ok`, `bg-kb-yellow`, `bg-map-top`, `bg-wa-out`, `fill-phone-edge`. The shadcn names follow the roles inside both themes.

| Role | Dark (`.theme-dark`: bands, footer) | Light (`.theme-light`: public pages, signed in, customer pages, email) |
| --- | --- | --- |
| surface-0, page | kb-night #0c0c0b | kb-sand #f6f4ef |
| surface-1, card | kb-carbon #161614 | kb-white #ffffff |
| surface-2, field and hover | kb-graphite #211f1c | kb-sand |
| surface-3, pressed | kb-smoke #2c2a26 | #ece9e1 |
| band (footer, closing band) | kb-black #000000 | kb-black |
| text-1 | kb-paper #f5f3ee (16.3:1 on carbon) | kb-ink #111111 |
| text-2 | kb-mute #b8b3a8 (8.7:1) | kb-stone #5e5b55 |
| text-3, labels, small print | kb-faint #9a958a (6.1:1) | kb-stone |
| stroke, field borders | #7d786f (controls need 3:1) | kb-stone |
| line, dividers | paper at 10 percent | kb-hairline #e4e0d7 |
| focus ring | kb-paper | kb-black |
| ok / warn / bad text | #5fd39b / #f5b94a / #ff8a80 | kb-green-ink #17704a / kb-amber #b45309 / kb-red-ink #b3261e |
| phrase, the one coloured headline phrase | kb-yellow | kb-ink |

- Brand: kb-yellow #ffd60a is the one main action per screen, with black text (ink on yellow only there); kb-yellow-pressed #e8c309. kb-green #1f8a5b for ticks, switch on and done steps.
- Map (always on its own light ground, map-ground #efece4). The rank is printed in every dot and every card; red never sits against green. The map images Kabsi sends use the same values (tests/visibility-map.test.ts):

| Token | Hex | Use |
| --- | --- | --- |
| map-rank-top | #146c46 | Rank 1 to 3, white bold number |
| map-rank-mid | #6cc497 | Rank 4 to 10, kb-ink number |
| map-rank-low | #fef3c7 | Rank 11 to 20, kb-ink number, 2 px kb-amber ring |
| map-rank-none | #0b0b0b | Not in the first 20, white "20+" |
| kb-amber | #b45309 | The ring on rank 11 to 20; attention text on light |

- WhatsApp mockups only, never Kabsi's own pages: chat #efeae2, in #ffffff, out #d9fdd3, time #667781 (#5a6a72 on the sent bubble for 4.5:1), ticks #53bdeb, glyph #25d366. The phone frame: phone-edge #404040, phone-body #262626.
- Every state carries a word or an icon as well as its colour.
- Brand colour names (`bg-kb-yellow`, `text-kb-black`, `bg-kb-green`, `text-kb-ink` and the rest) are aliases of the brand constants in layer 1, with no hex of their own: for the one main action, ink on yellow, ticks and the light cards drawn inside dark pages. Everything else uses the roles. UX 1 deleted the legacy block of 25 Oct (text-kb-*, shadow-kb, rounded-large, the old kb-carbon).

## Type
- Bricolage Grotesque Variable (headings) and Manrope Variable (everything else), self hosted with @fontsource-variable, the latin weight files preloaded from the root, font-display swap. No outside font request. `--font-arabic-display` and `--font-arabic-text` are the slots for the later Saudi step.
- text-display 40 to 72 px fluid, line 1.02, tracking -3 percent (H1, one per page) · text-h2 30 to 48 px, 1.08, -2.2 percent · text-h3 22 px, 1.25 · text-title 18 px bold, 1.35 · text-lead 17 to 19 px, 1.6 · text-body 16 px, 1.6 (fields too, so phones never zoom) · text-small 15 px, 1.5 (the reading floor on a phone) · text-label 13 px bold (labels and badges only) · text-chat 14 px and text-chat-meta 11 px inside the phone mockup only.
- `cn()` (src/lib/utils.ts) knows the type scale, so tailwind-merge never drops `text-label` next to a text colour.

## Space, shape, depth
- 4 px base. `container-kb` 1200 px with a 20 px gutter on a phone and 32 px from 768 px. `section-y` 72 px on a phone, 120 px from 1024 px. `measure` 38 rem reading width. Header 64 px.
- Radius: input 8 · bubble 8 · inner 12 · card 16 · panel 24 · phone 48 · pill for buttons, chips, badges and dots.
- Shadows (each carries a 1 px top light on dark): shadow-rest (cards), shadow-lift (map card), shadow-float (consent bar, dialogs), shadow-phone, shadow-glow (the yellow button only, 0 6px 18px -12px at 30 percent), shadow-bubble (chat).
- `glass` only where content scrolls under it: the sticky header and the phone bar.

## Motion
- One easing, `--ease-kb` cubic-bezier(0.2, 0.6, 0.3, 1). press 80 ms (scale 0.97, the `press` utility on every control), colour 160 ms, state 200 ms, enter 320 ms (8 px rise), scene 400 ms, stagger 60 ms. Entrances play once.
- Home's demonstration (d6-demo.tsx, Design 6 round 2) is one interactive phone in the hero: it starts at the review and the ready reply (never an empty chat, on the server and with reduced motion too); Yes, Edit and Skip are real buttons; after Yes, Undo for 10 real seconds (`UNDO_MS`), then Sent to Google, then Live on Google with a link, or the one failure state; the status card and the dark band's five-step track follow the same state. Every state is a replay of fixed Example events. CSS transitions only. A hidden `data-slot="demo-video"` waits for a real video; no "Watch the demo" until one exists. The recordings play muted, inline, looping, preload none below the fold, with Play and Pause; the hidden phone or computer recording never loads.
- No motion package: Home no longer uses the Magic UI counters, lists or marquee, so `motion` is not installed. Magic UI's iphone frame is the one Magic UI part in kabsi-canvas (docs/THIRD-PARTY.md).
- prefers-reduced-motion ends every animation at once and shows the final state; the recordings show their poster and do not autoplay.
- Never: parallax, scroll-jacking, cursor effects, looping backgrounds, carousels, autoplay video with sound.

## Components (src/components/kabsi)
- ui.tsx: Button (primary, secondary, whatsapp, quiet, tertiary; 52 and 44 px; loading and disabled), ButtonLink, WhatsAppLink (hidden while Kabsi has no WhatsApp number), TrialLine, KabsiMark (the exact SVG), Logo, WhatsAppGlyph (simple-icons siWhatsapp, unaltered, only where it means WhatsApp), ExampleBadge (a thin outline, no fill, on everything that is not real), StatusPill (word plus icon), Badge, Chip, SectionHead, Field (label above, hint, error with a fix line), Switch, Segmented, Card, Banner, Faq (native details), StepList (never yellow), Skeleton, EmptyState, ErrorState, TypingDots.
- site-chrome.tsx (SiteShell with the theme, header, footer on the dark band, phone bar and Nora after the first paint), site-header.tsx (How it works, Pricing, Businesses, Founding 25, About, Log in and one "Check my business free"), site-footer.tsx (Product, Free tools, Learn, Company with Partners, Follow), site-link.tsx, page-signals.ts (the hero, consent, menu, Nora and phone bar signals), status-pages.tsx (404 and error, noindex), photos.tsx (Img with width, height and srcset; lazy unless `priority`).
- whatsapp.tsx (PhoneFrame, the hero story), nearby-places.tsx and map.tsx (the three nearby places, the one count, the 7 by 7 dots behind "Detailed results"), map-data.ts.
- d6-home.tsx and d6-demo.tsx (Home, Design 6 round 2: hero and demonstration, the five-step band, four jobs, you stay in control, nearby, pick your business, pricing preview, Founding 25 with the founder, four questions, the closing check), d6-data.ts (the hero line and the demonstration's Example review), d4-home.tsx (the earlier Home, no longer on a route), d5-picker.tsx (Pick your business), d5-founding.tsx (Founding 25 banner and /founding, real count), d5-access.tsx (the access steps, the ID with "Copy the ID", the recordings, the three states, "Send these steps"; RemoveKabsi on Security only), d5-industry.tsx (the industry template, hubs, /for), d2-parts.tsx (PageTop, ToolTabs, SearchForm, CopyField, QrCode, FlowProgress, Prose), d2-tools.tsx (the review link tool), d2-flow.tsx (/manager-steps), d2-partners.tsx, d2-legal.tsx (About, FAQ), d4-free-check.tsx and scan-live.tsx (the free check and its result on V4's /visibility/check), hiw-sections.tsx.
- src/components/marketing/legal.tsx: Security, Privacy, Terms and the partner terms in the LegalPage layout. src/components/shared/privacy-banner.tsx: the consent bar and "Your privacy choices" in the new look.
- The signed-in website (UX 1, Design 3): src/components/layouts/app-layout.tsx is the account shell (a side bar from 1024 px with the business switcher, the places, the trial strip, Need a hand and Log out; a top bar and a bottom bar of four places plus More below 1024 px). The places and tabs are src/lib/app-nav.ts (Home, Reviews, Google profile, Posts and photos, Where you show up, Reports, Get reviews, Settings). The shell gives every page its column (60rem), so pages add no outer container. d3-account.tsx: AccountTop (H1, one lead, the section's tabs), Panel, SourceLabel (where a number comes from), TaskPill, TaskTrack (Approved, Sent to Google, Live on Google; the middle step red when it did not go through) and TaskOutcome, read from src/lib/task-state.ts and src/lib/task-feed.ts, the same words as WhatsApp (task-close.ts).
- The shared Switch (kabsi/ui.tsx and ui/switch.tsx) is kb-green with a tick when on.
- `node scripts/app-shots.mjs` (with the site running) draws every signed-in and onboarding screen in scripts/app-shots/routes at 390, 768 and 1440 px with a made-up owner and fixtures (no Supabase call), and checks sideways scroll and axe.

## The phone bar and Nora (Design 6, lane R 30 Oct 2026)
- A page marks its hero with `data-hero` (Home, the industry pages). Below 768 px the phone bar ("Check my business free", and the WhatsApp button once WhatsApp is on) shows only once the visitor is past the hero, while no other main action is on screen, and never while the menu, the consent bar or Nora's panel is open. A page without a hero keeps the 360 px rule.
- Nora's launcher on the public pages waits while the consent bar or the menu is open, and on a phone (below 640 px) while the hero is on screen, so it never covers the hero's phone. It sits 12 px above the phone bar while that shows, and only on pages that have one. The phone bar steps aside while Nora's panel is open. In the account Nora sits above the bottom bar.

## The signed-in Home (Design 6)
- Title "Home". "Needs your yes" (drafts waiting for approval: replies, posts, photos, hours, business facts) and "Needs attention" (a profile change, a lost connection, billing, a Google warning), each with its count, at most three cards before "See all"; then "Done by Kabsi" and "Your business on Google", and the next report. The task words are WhatsApp's.

## Icons and imagery
- Lucide only, 1.75 to 2.5 px stroke as the parts set it. Never emoji in the interface.
- Photos: the WebP files in src/assets/photos (800 and 1600 wide), each with alt text, width and height; Home's salon photo behind the phone shows and preloads from 768 px only (at 390 px the hero shows the phone alone), the rest lazy. Pick your business is one row of 8 square tiles to swipe on a phone, two rows of four at 4:5 from 640 px. docs/PHOTOS.md lists them and what each may show. The founder photo is small and round, never on a quote or a testimonial.
- No Arabic in any photo, poster, recording or screenshot (R-61, 30.18 section 1). The recordings in src/assets/video are lane R's edited cuts.

## Visuals Kabsi sends and share images
- Share images: public/og/*.png, 1200 by 630, dark (unchanged by Design 6; a later session may move them to ivory), the mark, the page's line, the brand line, the Example badge on anything not real. Made by `node --experimental-strip-types scripts/og.mjs`, which also writes the favicon, the icons and site.webmanifest. `pageHead({ image })` in src/lib/site.ts picks one per page.
- The WhatsApp nearby image is portrait 1080 by 1500 (Design 3, V4's nearby-image.ts). Emails: the section below.

## Emails (Email 1, master plan 30.18 section 3)
- One layout for every email (supabase/functions/_shared/email/template.ts), its parts in email-layout.ts, the tokens in email/tokens.ts (copies of the brand constants; tests/email-template.test.ts keeps them equal). Light: kb-sand page, kb-white card with a kb-hairline edge and radius 16, kb-ink text, kb-stone for labels and small print. Dark (prefers-color-scheme, and Outlook.com's [data-ogsc] and [data-ogsb] hooks): kb-night page, kb-carbon card, kb-graphite panels, kb-paper and kb-mute text, the on-dark greens, ambers and reds. Gmail inverts by itself; the button keeps its yellow through a background-image.
- Headings in Bricolage Grotesque (hosted at kabsi.co/fonts, for the apps that load web fonts) with system fallbacks; body text in the system face, 16 px, line 1.6. H1 26 px, section labels 13 px bold.
- One column, 600 px at most, phone first at 390 px (the card's padding drops to 18 px under 480 px). Under 100 KB of HTML.
- One main action: the yellow pill button (kb-yellow, black text, 52 px tall), drawn as a table for every client and as VML for Outlook on Windows. Every other action is an underlined text link with a 44 px tap area.
- Parts: card (a kb-sand panel, radius 12, a 13 px label, an amber or red left edge for waiting or failed), chips (pills with a tick and a count), status icons (a 20 px round mark beside the words: tick in green, dot in amber, cross in red; never the only signal), ticks (a list with a mark per line), number cards (two to a row, stacked under 340 px: label, a 26 px number, the change against last week), quote box (a review or a draft, keeping line breaks).
- Emoji only as small section markers, at most one per card, hidden from screen readers, never in an account-mail subject and never in the plain text.
- The mark is the hosted PNG kabsi.co/email/kabsi-mark.png (96 px, shown at 32 px, alt "Kabsi", with the word Kabsi beside it), made by scripts/email-assets.mjs. No cid attachments.
- Links are absolute and on kabsi.co, apart from Facebook and Instagram (SOCIAL_LINKS), Google's third-party page and mailto. Previews and test sends carry the Example badge; a real owner's email never does.
- Footer (COPY.md 25 and 26): why you got this, the brand line, the non-affiliation line, Facebook and Instagram, the unsubscribe link only on mail a person can switch off, the operator line. Every email has a plain-text part.
- Checks: tests/e2e/email.spec.ts (every email at 390 and 600 px, light and dark, images off, Chromium and WebKit), tests/email-clients.test.ts (caniemail for Gmail, Outlook and Apple Mail), supabase/functions/_shared/email/catalog.test.ts (the house rules for every email).

## SEO and speed (brief section 7, master plan 24.9)
- Every public page is server rendered with its own title, description, canonical, share image, and Organization (on Home) and BreadcrumbList data through `pageHead`. Only indexed pages are in public/sitemap.xml (tests/sitemap.test.ts); template industry pages, hubs without a finished page, /manager-steps and free check results are noindex.
- Under 120 KB of compressed JavaScript before a public page is usable; Home's story and everything below the hero hydrate from their own chunks. Lighthouse CI (lighthouserc.json) reports on the public pages.

## Focus and accessibility
- Focus ring 2 px solid `--focus`, 2 px away. Never removed. Text 4.5:1, large text and controls 3:1. Touch targets 44 px or more. One H1 per page, a label on every field.
- `node scripts/shots.mjs` (with the site running) checks every page in scripts/routes.json at 390, 768 and 1440 px: no sideways scroll, no serious or critical axe issue.

## Right-to-left readiness (for the later Saudi step)
- Logical properties only (ms-, me-, ps-, pe-, start-, end-, text-start). Mirror directional icons; never the mark, ticks, stars or media controls. Numbers, prices and phones stay left to right inside Arabic text.
