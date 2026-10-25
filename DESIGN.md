# DESIGN.md: the Kabsi design system

Approved by Rashid on 25 Oct 2026 (master plan 30.7 and 30.11). Every UI session reads this file first. The live system, with component previews, is the "Kabsi Design System" artifact in the lane R chat; this file is its contract for code. Copy for every page is in docs/COPY.md.

## Principles
- Calm, confident, product-led. The product is the picture: the map, the WhatsApp chat, the approval card.
- One job, one headline, one paragraph, one visual and one main button per section. One yellow button per screen.
- Phone first at 390 px, then 1440 px. No horizontal scroll at 320 px.
- Only these tokens (K-108). No hex values in components, no Tailwind default colours, no page-specific styling.

## Colour (src/styles.css, `--color-kb-*`, classes `bg-kb-*` and `text-kb-*`)
| Token | Hex | Use |
| --- | --- | --- |
| kb-yellow | #ffd60a | The one main action per screen; the needs-you ring on a Kabsi card. Never eyebrows, underlines, chips, icons or step numbers. Text on it is kb-black. |
| kb-yellow-pressed | #e8c309 | Hover and pressed state of the main button |
| kb-black | #000000 | Hero and closing bands, button label, secondary outline, focus ring on light |
| kb-carbon | #0b0b0b | Cards on black, phone frame, the "not in top 20" map pin |
| kb-ink | #111111 | All text on white and sand |
| kb-white | #ffffff | Default ground; text and focus ring on black |
| kb-sand | #f6f4ef | Alternate sections, app background, draft quote box, grey pill |
| kb-stone | #5e5b55 | Secondary text, captions, input borders (3:1 on white) |
| kb-stone-on-dark | #c9c5bc | Secondary text on black |
| kb-hairline | #e4e0d7 | Card, table and divider borders (decorative only) |
| kb-green | #1f8a5b | Done and calm as a fill or mark: ticks, done steps, icons, bold labels 19 px and up. Not small text (white on it is 4.3:1). |
| kb-green-ink | #17704a | NEW. Green text at any size; on kb-green-soft 5.4:1 |
| kb-green-soft | #e6f4ec | NEW. Ground of green pills and success banners (replaces green/10) |
| kb-red | #d93025 | Real problems only: marks, borders, text on white |
| kb-red-ink | #b3261e | NEW. Red text on kb-red-soft |
| kb-red-soft | #fce8e6 | NEW. Ground of problem pills and banners (replaces red/10) |
| kb-amber | #b45309 | Needs your attention, text and icons on kb-amber-soft |
| kb-amber-soft | #fef3c7 | Ground of attention pills and banners |
| map-rank-top | #146c46 | NEW. Map pin rank 1 to 3, white bold number |
| map-rank-mid | #6cc497 | NEW. Map pin rank 4 to 10, kb-ink number |
| map-rank-low | #fef3c7 | NEW. Map pin rank 11 to 20, kb-ink number, 2 px kb-amber ring (always) |
| map-rank-none | #0b0b0b | NEW. Not in the top 20, white "20+" |
| wa-chat-bg, wa-bubble-in, wa-bubble-out | #efeae2, #ffffff, #d9fdd3 | NEW. WhatsApp mockups only, never Kabsi's own pages |

Every state carries a word or icon as well as its colour. The map never puts red against green; the rank is printed in every pin. Web 2 adds the NEW tokens to src/styles.css and moves StatusPill and Banner to the solid soft grounds.

## Type
- Lalezar (display) for H1 and H2 only, one H1 per page. Hero clamp(3.5rem, 2.4rem + 4.6vw, 5rem), line height 1. Section clamp(2.25rem, 1.9rem + 1.4vw, 2.75rem), line height 1.05.
- Readex Pro for everything else: title 20/1.3 bold, lead 18/1.6 (marketing body and guides), body 16/1.6 (app, email), label 16/1.25 bold, small 14/1.5, caption 13/1.4 bold. 13 px is the floor.
- Bold is 700. Readex Pro ships 400, 500 and 700: never ask for 600.
- Reading width 60 to 70 characters; guides use a 680 px column.

## Space, shape, depth
- Container 1200 px (75rem), 12 columns, 24 px gutter. Sections 96 px apart on desktop, 64 px on phones.
- Steps 4, 8, 12, 16, 20, 24, 32, 48 px. Card padding 20, quote box and banner 16, button gap 12.
- Radius: 8 inputs, 10 quote box, 14 cards and banners, 18 WhatsApp bubbles, 24 report and OG panels, pill for buttons, pills, badges and pins.
- Shadows: shadow-kb (0 6px 18px rgba(0,0,0,.06)) at rest, shadow-kb-lift (0 14px 30px rgba(0,0,0,.09)) under the pointer and for the phone frame. No gradients.
- Glass (blur over 85 percent white) only where content scrolls under it: the sticky header and the phone bottom bar.

## Motion (explains or confirms, never decorates)
- Easing cubic-bezier(0.2, 0.6, 0.3, 1). Durations: press 80 ms, colour 160 ms, lift and state 200 ms, enter 520 ms, stagger 70 ms capped at 350 ms.
- Allowed: chats that type their messages in; the map filling pin by pin once, under 1.5 s; cards rising 8 px as they enter; a listing that "heals" (wrong value fades to right, green tick); numbers that count up only when they are the visitor's own.
- The hero story plays twice and rests on its last frame. Everything loads after first paint and stays inside 24.9.
- The app has no decorative motion: skeletons, a green tick on approve or publish, short toasts.
- Never: parallax, scroll-jacking, cursor effects, looping backgrounds, carousels, autoplay video with sound.
- prefers-reduced-motion turns all of it off and shows the final state.

## Components (src/components/ui, one set, used everywhere)
Button (primary yellow, secondary black outline, tertiary link; 52 px and compact 44 px) · StatusPill (green, amber, red, grey, always with a word) · ExampleBadge (on everything that is not real) · Banner (info, needs you, attention, success, problem) · KabsiCard (eyebrow, title, pill, original, draft in a sand box, one note, one main action) · QuoteCard (real, permissioned quotes only) · List (rows of 44 px or more with state icon and chevron) · Input (label above, stone border, 2 px black focus, 2 px red error with a fix line, 44 px, 16 px text) · Switch (green on, stone off; immediate settings only) · StepList (done green with tick, current black ring, later grey; never yellow) · FAQ (native details, plus to minus) · ComparisonTable (Kabsi column outlined black; cards on phones) · EmptyState · LoadingState (sand skeletons after 300 ms) · ErrorState (what happened, what Kabsi did, Try again) · PhoneFrame (plain carbon; gentle CSS tilt in the hero only) · WhatsAppChat · MapGrid · ReportImage · EmailLayout · OGImage · SocialProfile.

The main button is "See your map"; the second is "Try it on WhatsApp"; under every main button: "Free for 14 days. No card. Cancel in WhatsApp."

## Icons and imagery
- Lucide only, 1.75 px stroke, 20 px in buttons and pills, 24 px alone. Never emoji in the interface.
- The Kabsi mark (public/kabsi-mark.svg) as it is, never redrawn. It is the business pin at the centre of every map.
- Hero: the map filling in around a pin, and the phone receiving it on WhatsApp, labelled Example (28.8).
- Scenes of local businesses in the lead markets (barber, cafe, auto shop, dentist, salon, small hotel), warm natural light, never presented as customers. No stock illustration, no 3D library.

## Visuals Kabsi sends
- Map image: 1080 x 1080 PNG from SVG (resvg), under 250 KB, rank in every pin, legend in words, "Kabsi rank check, not provided by Google" and the map attribution printed on it.
- Results Report image and PDF: two labelled sections, "From your Google Business Profile" and "From public Google Maps and AI checks by Kabsi", never mixed in one number or chart (30.10.4).
- Email: 600 px white card on sand, the mark as an inline image (not an outside URL), one yellow button, tagline footer. Tested in Gmail, Outlook and Apple Mail, light and dark.
- OG image: 1200 x 630, black ground, an approved line in Lalezar white with no Google name (K-112), one product visual, mark bottom left.
- Social: avatar is the mark centred on white; covers use the OG layout.

## Focus and accessibility
- Focus ring 2 px solid kb-black with 2 px offset on light grounds, kb-white on black. Never removed.
- Text 4.5:1 on its ground, large text and marks 3:1. Touch targets 44 px or more.

## Right-to-left readiness (for the later Saudi step)
- Logical properties only (ms-, me-, ps-, pe-, start-, end-, text-start). Never left or right in layout.
- Mirror directional icons (arrows, chevrons, send, back) with rtl:-scale-x-100; never the mark, ticks, stars or media controls.
- Numbers, prices and phones stay left-to-right inside Arabic text (bdi).
