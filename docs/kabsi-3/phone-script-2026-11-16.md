# Request book phone script for Rashid, 16 Nov 2026 (RB-T)

Master plan 30.50 item 8. 20 messages from Rashid's own phone (staff tools and four businesses), covering the three live test packs: Kabsi Test Salon, Kabsi Test Gym and Kabsi Test Garage. Customers are fictional. The same script runs end to end on the fake world in `supabase/functions/_shared/whatsapp/rb-t.test.ts` ("the 20-message phone script"), so every expected reply below is the reply the code gives.

**Pass:** 18 of 20 right, and no wrong save (nothing saved that the script did not save, and nothing saved at Yawmiyati).

**Before you start:** send `reset test` and tap Confirm, so the open test requests are cleared. Request numbers carry on from earlier tests, so the script writes them as N (Sarah), D (Dina), M (Maya), O (Omar) and J (Ali): use the number each saved reply shows. Monday 16 Nov: "Thursday" is Thu 19 Nov and "tomorrow" is Tue 17 Nov. A reply that takes more than 10 seconds may be preceded by "On it".

To begin, send `switch`, tap My business, then tap Choose and pick Kabsi Test Salon (or reply 3): *✅ Switched*, "You are now working on Kabsi Test Salon." This is setup and is not counted.

| # | Send | Expected reply | Right? |
|---|---|---|---|
| 1 | Book Sarah for highlights Thursday 3pm | *📅 New appointment* · Kabsi Test Salon; Name: Sarah, Service: Highlights, When: Thu 19 Nov 15:00; buttons Save and Change; grey footer "Nothing is saved until you tap Save." Nothing saved yet | |
| 2 | tap Save | *✅ Appointment N saved*; Sarah, Highlights, Thu 19 Nov 15:00, Status: Requested; "Needs confirmation from the salon and from the client."; Undo | |
| 3 | Sarah confirmed Thursday 3pm | *✅ Appointment N updated*; "Confirmed by the client, as told to staff. Still needs confirmation from the salon"; Undo. No model call | |
| 4 | not highlights, a trim | *✅ Appointment N corrected*; "Service: was Highlights, now Haircut"; Undo | |
| 5 | Dina asked about a keratin price, then tap Save | *💬 New enquiry* (an enquiry, not an appointment); Name: Dina, Service: Hair treatment; then *✅ Enquiry D saved*, Status: New | |
| 6 | Dina booked keratin Thursday 11am | *✅ Done*; "Enquiry D is now Appointment ..."; Dina, Hair treatment, Thu 19 Nov 11:00, Status: Requested; "The enquiry stays on record. No confirmation has been recorded yet."; Undo | |
| 7 | what's open | *📋 2 open* with an "Open a request" list button: Dina's and Sarah's rows; footer "This covers only what was entered in Kabsi." | |
| 8 | Is my data safe? | An answer from Nora about Kabsi (never "Kabsi cannot help with that") | |
| 9 | write me a poem | *❓ Kabsi cannot help with that*, then what Kabsi does and the request book, then "Send "help" to see what you can send." | |
| 10 | #N (Sarah's number) | *📅 Appointment N*; Sarah, Haircut, When: Thu 19 Nov 15:00, Status: Requested, the client's confirmation; "This is a note in Kabsi. It is not entered in any other diary." | |
| 11 | switch, tap My business, pick Kabsi Test Gym | *✅ Switched*, "You are now working on Kabsi Test Gym." | |
| 12 | Maya asked about a trial, then tap Save | *💬 New enquiry* · Kabsi Test Gym; Name: Maya, Asked about: Trial; then *✅ Enquiry M saved*, Status: Not contacted | |
| 13 | Maya booked a trial Thursday 6pm | *✅ Done*; "Enquiry M is now Visit ..."; Maya, Trial, Thu 19 Nov 18:00, Status: Requested; Undo | |
| 14 | who asked about a trial this week | *📋 1 asked*, "About trial this week"; Maya's row, "Became a visit" | |
| 15 | Omar asked about personal training, tap Save, then cancel O, then tap Yes | *💬 New enquiry*, *✅ Enquiry O saved*; then *❓ Close Enquiry O?* "It closes as Not joining." with Yes and No; then *✅ Enquiry O updated*, Status: Not joining | |
| 16 | switch, tap My business, pick Kabsi Test Garage | *✅ Switched*, "You are now working on Kabsi Test Garage." | |
| 17 | Ali Corolla brakes squeaking tomorrow 10am, then tap Save | *🔧 New job*; Name: Ali, Work needed: Brakes, When: Tomorrow 10:00, Car: Corolla; then *✅ Job J saved*, Status: Waiting | |
| 18 | J ready, then tap Yes | *❓ Mark Job J anyway?* "It is still Waiting, and the step before Ready was never recorded."; Yes and No; then *✅ Job J is now Ready*, "The step before was never recorded, and Kabsi has not added one." | |
| 19 | J collected, then reopen J, then tap Yes | *✅ Job J is now Collected*; then *❓ Reopen Job J?* "It is closed as Collected."; then *✅ Job J is now Ready*, "It was closed." | |
| 20 | STOP, then START | Stopped; then "Welcome back. Your Kabsi messages are on again." | |

After the script: switch to Yawmiyati (4), send `stats` and `review link`: both as before, and `help` has no request book block. Then `reset test` and Confirm.

Send the chat export or screenshots of any row that differs; the next session fixes it.
