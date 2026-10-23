---
name: "kabsi-outbound"
description: "Use for Kabsi Outbound (master plan section 13): Nora at Kabsi writes short plain-text emails to US local businesses, Rashid approves each on his phone, and a yes gets a free Google profile check. Covers the Harvey fork, sending rules, limits and the kill-gate."
---

# Kabsi Outbound

Outbound is how Kabsi finds its first paying businesses after the launch gate. The plan is master plan section 13 (docs/KABSI-MASTERPLAN.md) and R-54. Nothing here starts before PROGRESS records that the launch gate (session 21) has passed. Until then this skill is for planning and drafting only: no sending, no scheduled run, no Harvey import.

## Setup (after the launch gate)
- Private repo itskaysyoga-gif/kabsi-outbound, imported from github.com/ethanplusai/harvey at that time. Never a public repo.
- A daily scheduled run in claude.ai/code. Nothing runs from Kabsi's Edge Functions.
- Drafts wait for Rashid's approval on his phone at /staff/outbound. Nothing is sent without it.
- A separate sending domain on Zoho Mail Lite with SPF, DKIM and DMARC, and two weeks of warm-up before the first real send. Never kabsi.co.
- Sender name: "Nora at Kabsi".
- Signature: "Nora, Kabsi's AI assistant. Rashid Abou Hamzy, founder, reads every reply." Add the Facebook and Instagram links from the SOCIAL_LINKS constant (R-59), never typed by hand.
- Footer on every email: "Kabsi, 451 Harwinton Ave, Torrington, CT 06790" and "Reply 'no thanks' and we will not write again". A reply of "no thanks" in any wording stops all further mail to that address at once, and the address goes on the suppression list.

## Data
- OpenStreetMap and the business's own website only.
- Never Kabsi's Google project, the Places key or the Business Profile API (R-54).
- No scraping of Google, Facebook, Instagram or directories. No bought lists.
- Keep only what a draft needs: business name, the public business email, one real detail from its own site or its OpenStreetMap entry. Do not store personal data about owners beyond that.

## Who
- US first. Auto repair, salons and barbers, then cafes and restaurants.
- No UK or EU sole traders without consent. No Lebanon. No Arabic shown (R-61): write in English, or Spanish where the business's own site is in Spanish.
- No business with an unsubscribe on file, an existing Kabsi account, or a "do not contact" note.

## Email 1
- Plain text. Under 80 words. No link. No images. No tracking.
- One real detail about that business, seen on its own site or OpenStreetMap entry. If there is no real detail, do not write the email.
- It ends with the question: "Want me to run a free check of <business>'s Google profile and send you what I find?"
- No claims about rankings, reviews gained, revenue, or what Google rewards. No industry statistics (plan 2.11). No mention of anything Kabsi cannot show.
- Follow the kabsi-copy skill: plain English, no em dashes, en dashes or exclamation marks.

## A yes
Within minutes the owner gets the check result, the founding offer (the first 30 paying businesses keep their price while subscribed) and the WhatsApp button (master plan sections 4 and 9). Use the same free check the website runs; it stays inside places_daily_cap, so check the cap before a batch.

## Follow-up
One follow-up on day 4, shorter than email 1, same plain text, same footer. No second follow-up. No reply means no more mail.

## Volume and the kill-gate
- 20 emails a day for two weeks, then 30 a day. Hard stop at 300 approved emails in total.
- Kill-gate: after 300 approved emails, fewer than 3 replies that lead to a free check or trial means stop and tell Rashid. Do not tune and continue.
- Stop sending the same day if a complaint, a bounce rate above 2 percent in a day, or a spam placement appears, and report it.

## Rules every email keeps
- Every email is approved by Rashid. The sender is named. The unsubscribe works and is honoured at once.
- Kabsi's claims rule applies to every line (plan 2.11, K-53, K-112): never "Google partner", "approved by Google", rankings or guaranteed reviews.
- Never ask for a Google password, code or token. Never offer anything in return for a review.
- Never write or paste a secret.

## Daily run (what to do)
1. Read PROGRESS for the sent count, replies and any stop notes.
2. Find candidates inside the limit, check each against the suppression list, write drafts, and put them in /staff/outbound for approval.
3. Report: drafts ready, sent so far (of 300), replies, replies that led to a check or trial, bounces, unsubscribes.

## Pipeline table
Keep one Markdown table in the private repo: business, source, email 1 date, reply, check sent, trial, follow-up date, stage, suppression. Update it every run.
