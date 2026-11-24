# GATE-2: Rashid's phone script for launch checklist lines 16 to 19

From your owner phone (the one bound to Yawmiyati) to Kabsi's number, +1 205 745 6874. Send them in this order, waiting for Kabsi's answer each time. Do not tap Approve on anything except where a step says so. Then tell the session "phone test done"; it reads the results back in whatsapp_messages and the outbox and marks each line pass or fail. Start no earlier than the deploy of the GATE-2 pull request.

## Line 16: typed, plain words (each should get the right answer with at most one question back)
1. `What needs my attention?` Expect a numbered "Waiting for you" list, or "Nothing is waiting".
2. If the list has a reply: send its number, then `Make this reply more professional`. Expect the new draft with Approve. Do not approve.
3. `Change my opening hours on Saturday`. Expect one question for the times. Answer `10am to 4pm`. Expect the whole week shown with Approve. Do not approve (it would change Google).
4. A photo of the shop with the caption `Post this`. Expect the post shown back for your yes. Tap Skip.
5. `How many reviews did I receive this month?` Expect the 30-day numbers.
6. `Show me everything you did this week`. Expect the weekly summary and the report link.
7. `Send me my review QR code`. Expect the QR code as an image.
8. New in GATE-2: `stats`, `monthly report`, `feedback`, `profile health`, `how do I compare`. Each should answer in one message.

## Line 17: the same seven by English voice note
9 to 15. Record each of the seven sentences above as a voice note, one at a time. Each reply must open with what Kabsi heard.
16. When a reply draft is shown with Approve, send a voice note saying `yes`. Expect: nothing approved, and Kabsi asks you to tap Approve or type yes.

## Line 18: limits
17. `Write me a poem about coffee`. Expect the fixed line ending with "talk to a person" and hello@kabsi.co.
18. `Change my business name to Yawmiyati Cafe`. Expect the refusal with the guide link. Nothing changes on Google.
19. From the staff phone (not the owner phone): tap Approve on any item Kabsi sends there, or type `yes` after a draft. Expect: staff cannot approve. If no staff phone is bound to Yawmiyati, say so and this step is recorded as not run.
20. `STOP`. Expect one last confirmation and then nothing. Then `START` to switch messages back on.

## Line 19: delivery
21. Every reply above is timed by the session from the stored times (owner message in, Kabsi reply out): it must arrive within 10 seconds and inside the 24-hour window (a service message).
22. Outside the window, with an approved template: after step 20, send nothing to Kabsi for more than 24 hours, from Sunday 29 Nov 08:00 UAE time until Monday's weekly note arrives (Monday 30 Nov). Kabsi starts that message itself; outside the window it goes as the approved template. When it arrives on your phone, tap its button and tell the session the time you saw it. The session reads the template name and the delivered state in the outbox.
