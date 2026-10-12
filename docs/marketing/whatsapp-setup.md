# WhatsApp on the Kapso number: setup for Hussein

Decisions: K-122 (the number), K-121 point 3 (greeting, away message, quick replies, labels), K-103, G-36. Task P0.6-10.

The number is **+1 201-483-5474** (Kapso). A person answers it. It is not an automatic bot, it sends no alerts and nothing is approved over it. The website, the assistant's hand-off note and the footer of Kabsi emails open `https://wa.me/12014835474` with a short message already typed; the visitor presses send.

This file was written without a Kapso login, so the screen names below may differ a little from what you see. Use whatever the Kapso inbox offers for each item. If it offers none of a kind (for example no labels), skip that item and tell the next build chat.

## What you do in Kapso, one click at a time

Do these in order. Nothing here needs an API key, and you never paste a key into a chat. Kapso's API keys are only needed later (P1-21) and go straight into Supabase secrets.

1. Sign in to Kapso with hello@kabsi.co (never a personal address).
2. Open the page that lists your WhatsApp numbers. Check that **+1 201-483-5474** is there and shows as connected.
3. Open that number's **business profile**. Paste the profile text from section 1 below, one field at a time, and save.
4. Open the **inbox** for the number. Find the place for a **greeting message** and paste section 2. Save.
5. Find the place for an **away message** and paste section 3. Set the hours to Monday to Friday, 8am to 6pm Beirut time (the hours of the setup call). Save.
6. Find **quick replies** (also called saved replies, templates for the inbox, or shortcuts). Add the nine replies in section 4, using the shortcut word shown for each. Save.
7. Find **labels** (also called tags). Add the six labels in section 5.
8. Send a test: from your own phone, open the link under "Test" below, press send, and check the message arrives in the Kapso inbox. Reply from the inbox and check it arrives on your phone.
9. Tell the build chat what was not available (no labels, no away message, and so on) so this file is corrected.

Test link: `https://wa.me/12014835474?text=Hello%20Kabsi%2C%20I%20have%20a%20question.`

## 1. Business profile

- Name: Kabsi
- Picture: the Kabsi mark, `public/kabsi-mark.svg`, exported as a square PNG.
- About (short): Your reviews and listing. Taken care of.
- Description: Kabsi looks after your business on Google: a reply ready for every new review, your hours and details kept right, and fresh posts. You approve every change. A person answers this chat.
- Website: https://kabsi.co
- Email: hello@kabsi.co
- Hours: Monday to Friday, 8am to 6pm Beirut time. We reply within one working day.
- Category: Professional services (or the closest one Kapso offers).

Do not write that Google approves, endorses, sponsors or partners with Kabsi (K-112). Do not add a Google logo.

## 2. Greeting message

Hello, this is Kabsi. A person reads this chat, not a robot. Tell us what you need and we will reply within one working day. We never ask for your Google password or any code sent to you.

## 3. Away message

Thanks for writing to Kabsi. We are away right now. We answer Monday to Friday, 8am to 6pm Beirut time, and we will reply within one working day. For anything urgent, such as wrong information on your Google profile or a payment problem, email hello@kabsi.co. We never ask for your Google password or any code sent to you.

## 4. Quick replies

Every reply is plain text, with no dashes used as punctuation and no exclamation marks. Prices and the trial come from `knowledge/kabsi-facts.md`; if they change there, change them here.

**/manager: how to add Kabsi as Manager**

To add Kabsi you send one invitation from Google, and you stay the owner. On your Business Profile open Menu, then Business Profile settings, then People and access. Choose Add, paste the group ID 5481006796, pick Manager and send the invitation. The ID is for the group Kabsi Clients, not an email address. Kabsi accepts within minutes once it is connected. If you get stuck, we can do it together on a free call: https://kabsi.co/setup-call?topic=setup

**/call-setup: book a setup call (setting up my Google profile)**

A free 20 minute call, Monday to Friday, 8am to 6pm Beirut time. Pick a time here: https://kabsi.co/setup-call?topic=setup

**/call-partner: book a call (partner or agency)**

Thanks for your interest in partnering. Pick a time for a free 20 minute call here: https://kabsi.co/setup-call?topic=partner

**/call-other: book a call (something else)**

Happy to talk it through. Pick a time for a free 20 minute call here: https://kabsi.co/setup-call?topic=other

**/prices: prices and trial**

Kabsi Pro is $19 a month or $190 a year. The free trial is 14 days with no card, and 30 days if a partner brought you. The trial starts when Kabsi can reach your Google profile. The review link and QR code are free on every plan. Details: https://kabsi.co/pricing

**/disconnect: how to disconnect**

You can disconnect any time. In Kabsi open Settings and choose Disconnect Kabsi from Google, and Kabsi stops at once and removes its own access. Or on Google open People and access, select Kabsi Clients, and choose Remove person. Your profile and your reviews on Google stay yours either way.

**/password: no password, no codes**

We never ask for your Google password, and we never ask for a verification code that Google sends you. If anyone asks you for either in the name of Kabsi, do not share it and tell us at hello@kabsi.co.

**/approve: approvals happen on kabsi.co**

Nothing is posted to your Google profile until you approve it. You approve on kabsi.co, not in this chat, so there is nothing to approve here. Open https://kabsi.co/app to see what is waiting.

**/pay-lebanon: Whish, OMT or cash (Lebanon only)**

In Lebanon you can pay by Whish, OMT or cash. Tell us your business name and the plan you want, and we will arrange it and confirm within one working day.

## 5. Labels

Use these six, one colour each if Kapso allows:

- lead
- trial
- customer
- partner
- urgent
- lebanon

## What the number must never be used for

- No approvals, no alerts, no review text or reviewer names in either direction. If an owner pastes review text, answer the question and do not copy it elsewhere (K-113).
- No messages to people who did not write first. No marketing blasts, no bulk tools (G-36).
- Automatic WhatsApp (alerts, approvals, the assistant on WhatsApp) is later work (P1-21, P1-22) and needs Meta business verification first.
