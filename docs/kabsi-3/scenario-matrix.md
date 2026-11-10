# Request book scenario matrix (RB-T)

Master plan 30.50 item 8. Written from `supabase/functions/_shared/whatsapp/rb-t.matrix.ts`; `rb-t.test.ts` runs every row on the fake world (no model call: the extraction and the router are fakes that answer what the row says) and `tests/rb-t-matrix.test.ts` checks this file matches the rows. Do not edit by hand: change the rows and run `deno run -A scripts/request-eval/matrix-doc.ts`.

The phone is Rashid's (staff tools and four businesses: 1 Kabsi Test Garage, 2 Kabsi Test Gym, 3 Kabsi Test Salon, 4 Yawmiyati), working on the row's business. The clock is Monday 26 Oct 2026, 19:00 in Dubai. Customers are fictional. "Before" steps set the scene and are checked only for their result code. "(router)" marks a message that reaches the router; every other message is read by code. The expected reply is the result code, then the first line of the Look 2 reply (marker and bold title, without the business) where the row checks it, then words it must hold and its buttons.

Every row also checks: no reply has an em dash, an en dash or an exclamation mark; no reply says booked or available; at most 3 buttons; no request is written unless a step saved it (the request count where the row gives it); model calls as counted where the row gives it.

## Totals

| Pack | Rows | Pass on the fake world | Open (in docs/LATER.md) |
|---|---|---|---|
| salon | 73 | 73 | 0 |
| gym | 73 | 73 | 0 |
| garage | 73 | 73 | 0 |

## Capture

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S01-salon | A full request, read by code, one extraction call, no router |  | "Book Sarah for highlights Thursday 3pm" | `request_proposed` *📅 New appointment* [Save, Change]<br>requests: 0 |
| S01-gym | A full request, read by code, one extraction call, no router |  | "Maya asked about a trial" | `request_proposed` *💬 New enquiry* [Save, Change]<br>requests: 0 |
| S01-garage | A full request, read by code, one extraction call, no router |  | "Ali Corolla brakes squeaking tomorrow 10am" | `request_proposed` *🔧 New job* [Save, Change]<br>requests: 0 |
| S02-salon | Save saves it once; the old Save again is already handled |  | "Book Sarah for highlights Thursday 3pm"<br>tap Save<br>tap again | `request_proposed`<br>`request_saved` *✅ Appointment 1 saved* [Undo]<br>`request_already_saved`<br>requests: 1 |
| S02-gym | Save saves it once; the old Save again is already handled |  | "Maya asked about a trial"<br>tap Save<br>tap again | `request_proposed`<br>`request_saved` *✅ Enquiry 1 saved* [Undo]<br>`request_already_saved`<br>requests: 1 |
| S02-garage | Save saves it once; the old Save again is already handled |  | "Ali Corolla brakes squeaking tomorrow 10am"<br>tap Save<br>tap again | `request_proposed`<br>`request_saved` *✅ Job 1 saved* [Undo]<br>`request_already_saved`<br>requests: 1 |
| S03-salon | Typed save works like the button |  | "Book Sarah for highlights Thursday 3pm"<br>"save" | `request_proposed`<br>`request_saved`<br>requests: 1 |
| S03-gym | Typed save works like the button |  | "Maya asked about a trial"<br>"save" | `request_proposed`<br>`request_saved`<br>requests: 1 |
| S03-garage | Typed save works like the button |  | "Ali Corolla brakes squeaking tomorrow 10am"<br>"save" | `request_proposed`<br>`request_saved`<br>requests: 1 |
| S04-salon | Change, then the new words revise the waiting proposal |  | "Book Sarah for highlights Thursday 3pm"<br>tap Change<br>"make it Friday 4pm"<br>tap Save | `request_proposed`<br>`request_change`<br>`request_revised` *📅 New appointment*<br>`request_saved`<br>requests: 1 |
| S04-gym | Change, then the new words revise the waiting proposal |  | "Maya asked about a trial"<br>tap Change<br>"she wants pilates"<br>tap Save | `request_proposed`<br>`request_change`<br>`request_revised` *💬 New enquiry*<br>`request_saved`<br>requests: 1 |
| S04-garage | Change, then the new words revise the waiting proposal |  | "Ali Corolla brakes squeaking tomorrow 10am"<br>tap Change<br>"make it Thursday 9am"<br>tap Save | `request_proposed`<br>`request_change`<br>`request_revised` *🔧 New job*<br>`request_saved`<br>requests: 1 |
| S05-salon | No to a waiting proposal drops it; nothing saved |  | "Book Sarah for highlights Thursday 3pm"<br>"no" | `request_proposed`<br>`request_dropped`<br>requests: 0 |
| S05-gym | No to a waiting proposal drops it; nothing saved |  | "Maya asked about a trial"<br>"no" | `request_proposed`<br>`request_dropped`<br>requests: 0 |
| S05-garage | No to a waiting proposal drops it; nothing saved |  | "Ali Corolla brakes squeaking tomorrow 10am"<br>"no" | `request_proposed`<br>`request_dropped`<br>requests: 0 |
| S06-salon | Missing name: the proposal asks for it, Save stays off until it is given |  | "a client wants a trim Thursday 3pm" | `request_proposed` says "Still needed: Name"<br>requests: 0 |
| S06-gym | Missing name: the proposal asks for it, Save stays off until it is given |  | "someone asked about a trial" | `request_proposed` says "Still needed: Name"<br>requests: 0 |
| S06-garage | Missing name: the proposal asks for it, Save stays off until it is given |  | "a customer wants brakes done Thursday 9am" | `request_proposed` says "Still needed: Name"<br>requests: 0 |

## Find

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S07-salon | Find by number: the request in full, no model | "Book Sarah for highlights Thursday 3pm"; tap Save | "1" | `request_summary` *📅 Appointment 1* |
| S07-gym | Find by number: the request in full, no model | "Maya asked about a trial"; tap Save | "1" | `request_summary` *💬 Enquiry 1* |
| S07-garage | Find by number: the request in full, no model | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "1" | `request_summary` *🔧 Job 1* |
| S08-salon | Find by #number | "Book Sarah for highlights Thursday 3pm"; tap Save | "#1" | `request_summary` *📅 Appointment 1* |
| S08-gym | Find by #number | "Maya asked about a trial"; tap Save | "#1" | `request_summary` *💬 Enquiry 1* |
| S08-garage | Find by #number | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "#1" | `request_summary` *🔧 Job 1* |
| S09-salon | Find by name, through the router's find tool | "Book Sarah for highlights Thursday 3pm"; tap Save | "find Sarah" (router) | `request_find` |
| S09-gym | Find by name, through the router's find tool | "Maya asked about a trial"; tap Save | "find Maya" (router) | `request_find` |
| S09-garage | Find by name, through the router's find tool | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "find Ali" (router) | `request_find` |
| S10-salon | A number with no request | "Book Sarah for highlights Thursday 3pm"; tap Save | "7" | `request_summary` says "not found" |
| S10-gym | A number with no request | "Maya asked about a trial"; tap Save | "7" | `request_summary` says "not found" |
| S10-garage | A number with no request | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "7" | `request_summary` says "not found" |

## List open

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S11-salon | What's open: a list message, no model | "Book Sarah for highlights Thursday 3pm"; tap Save | "what's open" | `request_open` *📋 1 open* |
| S11-gym | What's open: a list message, no model | "Maya asked about a trial"; tap Save | "what's open" | `request_open` *📋 1 open* |
| S11-garage | What's open: a list message, no model | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "what's open" | `request_open` *📋 1 open* |
| S12-salon | What's open with nothing open |  | "what's open" | `request_open` says "Nothing" |
| S12-gym | What's open with nothing open |  | "what's open" | `request_open` says "Nothing" |
| S12-garage | What's open with nothing open |  | "what's open" | `request_open` says "Nothing" |
| S13-salon | What's unconfirmed | "Book Sarah for highlights Thursday 3pm"; tap Save | "what's unconfirmed" | `request_unconfirmed` |
| S13-gym | What's unconfirmed | "Maya asked about a trial"; tap Save | "what's unconfirmed" | `request_unconfirmed` |
| S13-garage | What's unconfirmed | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "what's unconfirmed" | `request_unconfirmed` |
| S14-salon | Who asked about a service this week | "Dina asked about a keratin price"; tap Save | "who asked about keratin this week" | `request_asked` |
| S14-gym | Who asked about a service this week | "Omar asked about personal training"; tap Save | "who asked about a trial this week" | `request_asked` |
| S14-garage | Who asked about a service this week | "Karim asked about a clutch price"; tap Save | "who asked about a clutch this week" | `request_asked` |

## Update

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S15-salon | Each open status in order by number, each with Undo | "Book Sarah for highlights Thursday 3pm"; tap Save | after 4320 min, "1 came in" | `request_status` *✅ Appointment 1 updated* says "Status: Came in" [Undo] |
| S15-gym | Each open status in order by number, each with Undo | "Maya asked about a trial"; tap Save | "1 contacted" | `request_status` *✅ Enquiry 1 is now Contacted* [Undo] |
| S15-garage | Each open status in order by number, each with Undo | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "1 here"<br>"1 ready"<br>"1 collected" | `request_status` *✅ Job 1 updated* says "Status: In the shop" [Undo]<br>`request_status` *✅ Job 1 is now Ready* [Undo]<br>`request_status` *✅ Job 1 is now Collected* [Undo] |
| S16-salon | A status change by name | "Book Sarah for highlights Thursday 3pm"; tap Save | after 4320 min, "Sarah came in" | `request_status` *✅ Appointment 1 updated* |
| S16-gym | A status change by name | "Maya asked about a trial"; tap Save | "Maya contacted" | `request_status` *✅ Enquiry 1 is now Contacted* |
| S16-garage | A status change by name | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "Ali's car is here" | `request_status` *✅ Job 1 updated* |
| S17-salon | A skipped step or an ending is asked first; yes applies it | "Book Sarah for highlights Thursday 3pm"; tap Save | "cancel 1"<br>"yes" | `request_status_ask` *❓ Close Appointment 1?* [Yes, No]<br>`request_status_acknowledged` |
| S17-gym | A skipped step or an ending is asked first; yes applies it | "Maya asked about a trial"; tap Save | "1 lost"<br>"yes" | `request_status_ask` *❓ Close Enquiry 1?* [Yes, No]<br>`request_status_acknowledged` |
| S17-garage | A skipped step or an ending is asked first; yes applies it | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "1 ready"<br>"yes" | `request_status_ask` *❓ Mark Job 1 anyway?* [Yes, No]<br>`request_status_acknowledged` |
| S18-salon | The question before a change, answered no: nothing changes | "Book Sarah for highlights Thursday 3pm"; tap Save | "cancel 1"<br>"no" | `request_status_ask`<br>`request_ask_no` |
| S18-gym | The question before a change, answered no: nothing changes | "Maya asked about a trial"; tap Save | "1 lost"<br>"no" | `request_status_ask`<br>`request_ask_no` |
| S18-garage | The question before a change, answered no: nothing changes | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "1 ready"<br>"no" | `request_status_ask`<br>`request_ask_no` |
| S19-salon | Cancel by number asks first | "Book Sarah for highlights Thursday 3pm"; tap Save | "cancel 1"<br>tap Yes | `request_status_ask` [Yes, No]<br>`request_status_acknowledged` |
| S19-gym | Cancel by number asks first | "Maya asked about a trial"; tap Save | "cancel 1"<br>tap Yes | `request_status_ask` [Yes, No]<br>`request_status_acknowledged` |
| S19-garage | Cancel by number asks first | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "cancel 1"<br>tap Yes | `request_status_ask` [Yes, No]<br>`request_status_acknowledged` |
| S20-salon | Several in one message | "Book Sarah for highlights Thursday 3pm"; tap Save; "Book Rana for highlights Friday 4pm"; tap Save | after 8640 min, "came in 1 2" | `request_status_many` |
| S20-gym | Several in one message | "Maya asked about a trial"; tap Save; "Rana asked about a trial again"; tap Save | "contacted 1 2" | `request_status_many` |
| S20-garage | Several in one message | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save; "Rana Corolla brakes Thursday 10am"; tap Save | "here 1 2" | `request_status_many` |
| S21-salon | No show after the time has passed | "Book Sarah for highlights Thursday 3pm"; tap Save | after 4320 min, "no show 1" | `request_status` says "Status: No show" [Undo] |
| S21-gym | No show after the time has passed | "Omar asked about personal training"; tap Save; "Omar booked a tour Thursday 11am" | after 4320 min, "no show 2" | `request_status` says "Status: Did not come" [Undo] |
| S21-garage | No show after the time has passed | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | after 4320 min, "no show 1" | `request_status` says "Status: Did not come" [Undo] |
| S22-salon | Reopen a closed request: asked first, back to where it was | "Book Sarah for highlights Thursday 3pm"; tap Save; "cancel 1"; "yes" | "reopen 1"<br>tap Yes | `request_status_ask` *❓ Reopen Appointment 1?* [Yes, No]<br>`request_status_acknowledged` says "Status: Requested" |
| S22-gym | Reopen a closed request: asked first, back to where it was | "Maya asked about a trial"; tap Save; "1 lost"; "yes" | "reopen 1"<br>tap Yes | `request_status_ask` *❓ Reopen Enquiry 1?* [Yes, No]<br>`request_status_acknowledged` says "Status: Not contacted" |
| S22-garage | Reopen a closed request: asked first, back to where it was | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save; "1 here"; "1 ready"; "1 collected" | "reopen 1"<br>tap Yes | `request_status_ask` *❓ Reopen Job 1?* [Yes, No]<br>`request_status_acknowledged` says "Status: Ready" |
| S23-salon | Reopen a request that is still open changes nothing | "Book Sarah for highlights Thursday 3pm"; tap Save | "reopen 1" | `request_status_refused` says "is not closed" |
| S23-gym | Reopen a request that is still open changes nothing | "Maya asked about a trial"; tap Save | "reopen 1" | `request_status_refused` says "is not closed" |
| S23-garage | Reopen a request that is still open changes nothing | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "reopen 1" | `request_status_refused` says "is not closed" |

## Correct

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S24-salon | Not X, Y on the request touched last: before and after, Undo | "Book Sarah for highlights Thursday 3pm"; tap Save | "not highlights, a trim" | `request_corrected` *✅ Appointment 1 corrected* [Undo] |
| S24-gym | Not X, Y on the request touched last: before and after, Undo | "Maya asked about a trial"; tap Save | "not trial, a tour" | `request_corrected` *✅ Enquiry 1 corrected* [Undo] |
| S24-garage | Not X, Y on the request touched last: before and after, Undo | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "not Corolla, Civic" | `request_corrected` *✅ Job 1 corrected* [Undo] |
| S25-salon | Not X, Y with a number | "Book Sarah for highlights Thursday 3pm"; tap Save | "1 not highlights, a trim" | `request_corrected` *✅ Appointment 1 corrected* |
| S25-gym | Not X, Y with a number | "Maya asked about a trial"; tap Save | "1 not trial, a tour" | `request_corrected` *✅ Enquiry 1 corrected* |
| S25-garage | Not X, Y with a number | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "1 not Corolla, Civic" | `request_corrected` *✅ Job 1 corrected* |
| S26-salon | A correction of words that are not on the request | "Book Sarah for highlights Thursday 3pm"; tap Save | "not pedicure, a facial" | `request_correct_not_found` |
| S26-gym | A correction of words that are not on the request | "Maya asked about a trial"; tap Save | "not yoga, spin" | `request_correct_not_found` |
| S26-garage | A correction of words that are not on the request | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "not tyres, a battery" | `request_correct_not_found` |

## Summarize

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S27-salon | The summary after changes shows the latest facts | "Book Sarah for highlights Thursday 3pm"; tap Save | "not highlights, a trim"<br>"1" | `request_corrected`<br>`request_summary` *📅 Appointment 1* |
| S27-gym | The summary after changes shows the latest facts | "Maya asked about a trial"; tap Save | "not trial, a tour"<br>"1" | `request_corrected`<br>`request_summary` *💬 Enquiry 1* |
| S27-garage | The summary after changes shows the latest facts | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "not Corolla, Civic"<br>"1" | `request_corrected`<br>`request_summary` *🔧 Job 1* |

## Confirm

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S28-salon | The customer confirmed, with a time: one tap sets the time and records it | "Book Sarah for highlights Thursday 3pm"; tap Save | "Sarah confirmed Thursday 3pm" | `request_confirmed` [Undo] |
| S28-gym | The customer confirmed, with a time: one tap sets the time and records it | "Maya asked about a trial"; tap Save | "Maya confirmed Thursday 5pm" | `request_confirm_refused:not_appointment` *❓ Not an appointment* |
| S28-garage | The customer confirmed, with a time: one tap sets the time and records it | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "Ali confirmed tomorrow 10am" | `request_confirm_refused:not_appointment` *❓ Not an appointment* |
| S29-salon | The time first, then the confirmation by number | "Book Sarah for highlights Thursday 3pm"; tap Save | "confirmed 1" | `request_confirmed` [Undo] |
| S29-gym | The time first, then the confirmation by number | "Omar asked about personal training"; tap Save; "Omar booked a tour Thursday 11am" | "confirmed 2" | `request_confirmed` [Undo] |
| S29-garage | The time first, then the confirmation by number | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "confirmed 1" | `request_confirm_refused:not_appointment` |
| S30-salon | Confirmed with no time on the request and none said | "Rana trim"; tap Save | "confirmed 1" | `request_confirm_refused:time_required` *❓ Enter a time first* |
| S30-gym | Confirmed with no time on the request and none said | "Hana asked about membership"; tap Save | "confirmed 1" | `request_confirm_refused:not_appointment` |
| S30-garage | Confirmed with no time on the request and none said | "Sam Golf oil change"; tap Save | "confirmed 1" | `request_confirm_refused:not_appointment` |

## Convert

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S31-salon | An enquiry booked: it closes as converted and a linked request starts | "Dina asked about a keratin price"; tap Save | "Dina booked keratin Thursday 11am" | `request_converted` [Undo] |
| S31-gym | An enquiry booked: it closes as converted and a linked request starts | "Omar asked about personal training"; tap Save | "Omar booked a tour Thursday 11am" | `request_converted` [Undo] |
| S31-garage | An enquiry booked: it closes as converted and a linked request starts | "Karim asked about a clutch price"; tap Save | "Karim booked a clutch Thursday 11am" | `request_converted` [Undo] |
| S32-salon | Booked with no enquiry for that name: a new request of the other kind |  | "Hala booked a facial Thursday 11am"<br>tap Save | `request_proposed` *📅 New appointment*<br>`request_saved`<br>requests: 1 |
| S32-gym | Booked with no enquiry for that name: a new request of the other kind |  | "Sam booked a tour Thursday 11am"<br>tap Save | `request_proposed` *📅 New visit*<br>`request_saved`<br>requests: 1 |
| S32-garage | Booked with no enquiry for that name: a new request of the other kind |  | "Sam booked an oil change Thursday 11am"<br>tap Save | `request_proposed` *🔧 New job*<br>`request_saved`<br>requests: 1 |
| S33-salon | Undo of a conversion restores the enquiry | "Dina asked about a keratin price"; tap Save; "Dina booked keratin Thursday 11am" | "undo" | `request_undone` |
| S33-gym | Undo of a conversion restores the enquiry | "Omar asked about personal training"; tap Save; "Omar booked a tour Thursday 11am" | "undo" | `request_undone` |
| S33-garage | Undo of a conversion restores the enquiry | "Karim asked about a clutch price"; tap Save; "Karim booked a clutch Thursday 11am" | "undo" | `request_undone` |

## Undo

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S34-salon | Undo inside 10 minutes | "Book Sarah for highlights Thursday 3pm"; tap Save | after 4320 min, "1 came in"<br>tap Undo | `request_status` *✅ Appointment 1 updated* says "Status: Came in" [Undo]<br>`request_undone` *↩️ Undone* |
| S34-gym | Undo inside 10 minutes | "Maya asked about a trial"; tap Save | "1 contacted"<br>tap Undo | `request_status` *✅ Enquiry 1 is now Contacted* [Undo]<br>`request_undone` *↩️ Undone* |
| S34-garage | Undo inside 10 minutes | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "1 here"<br>tap Undo | `request_status` *✅ Job 1 updated* says "Status: In the shop" [Undo]<br>`request_undone` *↩️ Undone* |
| S35-salon | Typed undo | "Book Sarah for highlights Thursday 3pm"; tap Save | after 4320 min, "1 came in"<br>"undo" | `request_status` *✅ Appointment 1 updated* says "Status: Came in" [Undo]<br>`request_undone` |
| S35-gym | Typed undo | "Maya asked about a trial"; tap Save | "1 contacted"<br>"undo" | `request_status` *✅ Enquiry 1 is now Contacted* [Undo]<br>`request_undone` |
| S35-garage | Typed undo | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "1 here"<br>"undo" | `request_status` *✅ Job 1 updated* says "Status: In the shop" [Undo]<br>`request_undone` |
| S36-salon | Undo after 10 minutes is refused | "Book Sarah for highlights Thursday 3pm"; tap Save | after 4320 min, "1 came in"<br>after 11 min, tap Undo | `request_status` *✅ Appointment 1 updated* says "Status: Came in" [Undo]<br>`request_undo_refused:window_passed` |
| S36-gym | Undo after 10 minutes is refused | "Maya asked about a trial"; tap Save | "1 contacted"<br>after 11 min, tap Undo | `request_status` *✅ Enquiry 1 is now Contacted* [Undo]<br>`request_undo_refused:window_passed` |
| S36-garage | Undo after 10 minutes is refused | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "1 here"<br>after 11 min, tap Undo | `request_status` *✅ Job 1 updated* says "Status: In the shop" [Undo]<br>`request_undo_refused:window_passed` |
| S37-salon | The same Undo tapped twice undoes once | "Book Sarah for highlights Thursday 3pm"; tap Save | after 4320 min, "1 came in"<br>tap Undo<br>tap again | `request_status` *✅ Appointment 1 updated* says "Status: Came in" [Undo]<br>`request_undone`<br>`request_undo_refused:already_undone` *↩️ Already undone* |
| S37-gym | The same Undo tapped twice undoes once | "Maya asked about a trial"; tap Save | "1 contacted"<br>tap Undo<br>tap again | `request_status` *✅ Enquiry 1 is now Contacted* [Undo]<br>`request_undone`<br>`request_undo_refused:already_undone` *↩️ Already undone* |
| S37-garage | The same Undo tapped twice undoes once | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "1 here"<br>tap Undo<br>tap again | `request_status` *✅ Job 1 updated* says "Status: In the shop" [Undo]<br>`request_undone`<br>`request_undo_refused:already_undone` *↩️ Already undone* |
| S38-salon | Undo of the save removes the request |  | "Book Sarah for highlights Thursday 3pm"<br>tap Save<br>tap Undo | `request_proposed`<br>`request_saved`<br>`request_undone` |
| S38-gym | Undo of the save removes the request |  | "Maya asked about a trial"<br>tap Save<br>tap Undo | `request_proposed`<br>`request_saved`<br>`request_undone` |
| S38-garage | Undo of the save removes the request |  | "Ali Corolla brakes squeaking tomorrow 10am"<br>tap Save<br>tap Undo | `request_proposed`<br>`request_saved`<br>`request_undone` |
| S39-salon | Undo of an older change, after a newer one, is refused | "Book Sarah for highlights Thursday 3pm"; tap Save | "not highlights, a trim"<br>after 4320 min, "1 came in"<br>tap Undo | `request_corrected`<br>`request_status` *✅ Appointment 1 updated* says "Status: Came in" [Undo]<br>`request_undo_refused:not_latest` |
| S39-gym | Undo of an older change, after a newer one, is refused | "Maya asked about a trial"; tap Save | "not trial, a tour"<br>"1 contacted"<br>tap Undo | `request_corrected`<br>`request_status` *✅ Enquiry 1 is now Contacted* [Undo]<br>`request_undo_refused:not_latest` |
| S39-garage | Undo of an older change, after a newer one, is refused | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "not Corolla, Civic"<br>"1 here"<br>tap Undo | `request_corrected`<br>`request_status` *✅ Job 1 updated* says "Status: In the shop" [Undo]<br>`request_undo_refused:not_latest` |

## Duplicates

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S40-salon | The same name and service again: update or add | "Book Sarah for highlights Thursday 3pm"; tap Save | "Book Sarah for highlights Friday 4pm" | `request_duplicate` [Update #1, Add new] |
| S40-gym | The same name and service again: update or add | "Maya asked about a trial"; tap Save | "Maya asked about a trial again" | `request_duplicate` [Update #1, Add new] |
| S40-garage | The same name and service again: update or add | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "Ali Corolla brakes Thursday 10am" | `request_duplicate` [Update #1, Add new] |
| S41-salon | Update #1 puts the new time on #1; still one request | "Book Sarah for highlights Thursday 3pm"; tap Save | "Book Sarah for highlights Friday 4pm"<br>tap Update #1 | `request_duplicate`<br>`request_updated`<br>requests: 0 |
| S41-gym | Update #1 puts the new time on #1; still one request | "Maya asked about a trial"; tap Save | "Maya asked about a trial again"<br>tap Update #1 | `request_duplicate`<br>`request_update_same`<br>requests: 0 |
| S41-garage | Update #1 puts the new time on #1; still one request | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "Ali Corolla brakes Thursday 10am"<br>tap Update #1 | `request_duplicate`<br>`request_updated`<br>requests: 0 |
| S42-salon | Add new saves a second request | "Book Sarah for highlights Thursday 3pm"; tap Save | "Book Sarah for highlights Friday 4pm"<br>tap Add new | `request_duplicate`<br>`request_saved`<br>requests: 1 |
| S42-gym | Add new saves a second request | "Maya asked about a trial"; tap Save | "Maya asked about a trial again"<br>tap Add new | `request_duplicate`<br>`request_saved`<br>requests: 1 |
| S42-garage | Add new saves a second request | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "Ali Corolla brakes Thursday 10am"<br>tap Add new | `request_duplicate`<br>`request_saved`<br>requests: 1 |
| S43-salon | The same name and service more than 7 days later is a new request | "Book Sarah for highlights Thursday 3pm"; tap Save | after 11520 min, "Book Sarah for highlights Friday 4pm" | `request_proposed` [Save, Change] |
| S43-gym | The same name and service more than 7 days later is a new request | "Maya asked about a trial"; tap Save | after 11520 min, "Maya asked about a trial again" | `request_proposed` [Save, Change] |
| S43-garage | The same name and service more than 7 days later is a new request | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | after 11520 min, "Ali Corolla brakes Thursday 10am" | `request_proposed` [Save, Change] |

## Typos

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S44-salon | A day misspelled |  | "Book Lina for a manicure thrsday 3pm" | `request_proposed` says "Thu 29 Oct 15:00" |
| S44-gym | A day misspelled |  | "Hana wants a tour thrsday 5pm" | `request_proposed` says "Thu 29 Oct 17:00" |
| S44-garage | A day misspelled |  | "Sam Golf oil change thrsday 9am" | `request_proposed` says "Thu 29 Oct 09:00" |
| S45-salon | A month misspelled |  | "Book Lina for a manicure 3 Novmber 3pm" | `request_proposed` says "Tue 3 Nov 15:00" |
| S45-gym | A month misspelled |  | "Hana wants a tour 3 Novmber 5pm" | `request_proposed` says "Tue 3 Nov 17:00" |
| S45-garage | A month misspelled |  | "Sam Golf oil change 3 Novmber 9am" | `request_proposed` says "Tue 3 Nov 09:00" |
| S46-salon | Time words misspelled |  | "Lina manicure tmrw agternoon" | `request_proposed` says "Tomorrow afternoon" |
| S46-gym | Time words misspelled |  | "Hana wants a tour tmrw agternoon" | `request_proposed` says "Tomorrow afternoon" |
| S46-garage | Time words misspelled |  | "Sam Golf oil change tmrw mornng" | `request_proposed` says "Tomorrow morning" |
| S47-salon | A service misspelled |  | "Lina manicur Thursday 3pm" | `request_proposed` says "Service: Manicure" |
| S47-gym | A service misspelled |  | "Hana asked about pilatess" | `request_proposed` says "Asked about: Class" |
| S47-garage | A service misspelled |  | "Sam Golf suspensoin Thursday 9am" | `request_proposed` says "Work needed: Suspension" |
| S48-salon | A name misspelled is kept as written, never matched |  | "Sarha highlights Thursday 3pm" | `request_proposed` says "Name: Sarha" |
| S48-gym | A name misspelled is kept as written, never matched |  | "Mya asked about a trial" | `request_proposed` says "Name: Mya" |
| S48-garage | A name misspelled is kept as written, never matched |  | "Aly Corolla brakes Thursday 9am" | `request_proposed` says "Name: Aly" |

## Times

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S49-salon | A vague time is kept as words, no hour invented |  | "Rana trim sometime next week" | `request_proposed` says "When:" |
| S49-gym | A vague time is kept as words, no hour invented |  | "Hana wants a tour sometime next week" | `request_proposed` says "When:" |
| S49-garage | A vague time is kept as words, no hour invented |  | "Sam Golf oil change sometime next week" | `request_proposed` says "When:" |
| S50-salon | No time at all: no When line, Save still works |  | "Rana trim"<br>tap Save | `request_proposed`<br>`request_saved`<br>requests: 1 |
| S50-gym | No time at all: no When line, Save still works |  | "Hana asked about membership"<br>tap Save | `request_proposed`<br>`request_saved`<br>requests: 1 |
| S50-garage | No time at all: no When line, Save still works |  | "Sam Golf oil change"<br>tap Save | `request_proposed`<br>`request_saved`<br>requests: 1 |

## Languages

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S51-salon | Arabic script: through the router to the one extraction, name as written |  | "(Arabic script, see the row)" (router) | `request_proposed` says "Name: (Arabic script, see the row)" |
| S51-gym | Arabic script: through the router to the one extraction, name as written |  | "(Arabic script, see the row)" (router) | `request_proposed` says "Name: (Arabic script, see the row)" |
| S51-garage | Arabic script: through the router to the one extraction, name as written |  | "(Arabic script, see the row)" (router) | `request_proposed` says "Name: (Arabic script, see the row)" |
| S52-salon | Written-out Arabic: read by code, digits in the name are not a phone |  | "Rima bedha highlights bukra l 3" | `request_proposed` says "Service: Highlights" |
| S52-gym | Written-out Arabic: read by code, digits in the name are not a phone |  | "3ali bedo yeshterek membership" | `request_proposed` says "Asked about: Membership" |
| S52-garage | Written-out Arabic: read by code, digits in the name are not a phone |  | "3ali korolla frem bukra l 10" | `request_proposed` says "Work needed: Brakes" |
| S53-salon | Mixed English and written-out Arabic |  | "Sarah ba3d bukra highlights l 3" | `request_proposed` says "Service: Highlights" |
| S53-gym | Mixed English and written-out Arabic |  | "Maya bedha trial Thursday 5pm" | `request_proposed` says "Asked about: Trial" |
| S53-garage | Mixed English and written-out Arabic |  | "Ali's Civic, ghayyer zeit w filter, ba3d el dohr" | `request_proposed` says "Work needed: Oil change" |

## Guarded words

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S54-salon | STOP wins even with a proposal waiting; START comes back |  | "Book Sarah for highlights Thursday 3pm"<br>"STOP"<br>"START" | `request_proposed`<br>`stopped`<br>`started`<br>requests: 0 |
| S54-gym | STOP wins even with a proposal waiting; START comes back |  | "Maya asked about a trial"<br>"STOP"<br>"START" | `request_proposed`<br>`stopped`<br>`started`<br>requests: 0 |
| S54-garage | STOP wins even with a proposal waiting; START comes back |  | "Ali Corolla brakes squeaking tomorrow 10am"<br>"STOP"<br>"START" | `request_proposed`<br>`stopped`<br>`started`<br>requests: 0 |
| S55-salon | Yes with nothing waiting keeps its meaning |  | "yes" | `yes_nothing` *📋 Nothing is waiting*<br>requests: 0 |
| S55-gym | Yes with nothing waiting keeps its meaning |  | "yes" | `yes_nothing` *📋 Nothing is waiting*<br>requests: 0 |
| S55-garage | Yes with nothing waiting keeps its meaning |  | "yes" | `yes_nothing` *📋 Nothing is waiting*<br>requests: 0 |
| S56-salon | Yes while a proposal waits saves it, never an approval elsewhere |  | "Book Sarah for highlights Thursday 3pm"<br>"yes" | `request_proposed`<br>`request_saved`<br>requests: 1 |
| S56-gym | Yes while a proposal waits saves it, never an approval elsewhere |  | "Maya asked about a trial"<br>"yes" | `request_proposed`<br>`request_saved`<br>requests: 1 |
| S56-garage | Yes while a proposal waits saves it, never an approval elsewhere |  | "Ali Corolla brakes squeaking tomorrow 10am"<br>"yes" | `request_proposed`<br>`request_saved`<br>requests: 1 |
| S57-salon | closed alone stays hours; closed with a number is the request | "Book Sarah for highlights Thursday 3pm"; tap Save | "closed 1"<br>"closed" | `request_ref_closed`<br>`hours_no_day` *🕒 Which day, and what hours?* |
| S57-gym | closed alone stays hours; closed with a number is the request | "Maya asked about a trial"; tap Save | "closed 1"<br>"closed" | `request_ref_closed`<br>`hours_no_day` *🕒 Which day, and what hours?* |
| S57-garage | closed alone stays hours; closed with a number is the request | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "closed 1"<br>"closed" | `request_ref_closed`<br>`hours_no_day` *🕒 Which day, and what hours?* |
| S58-salon | post alone stays a Google post; post with a number is the request | "Book Sarah for highlights Thursday 3pm"; tap Save | "post"<br>"post 1" | `post_ask`<br>`request_ref_post` |
| S58-gym | post alone stays a Google post; post with a number is the request | "Maya asked about a trial"; tap Save | "post"<br>"post 1" | `post_ask`<br>`request_ref_post` |
| S58-garage | post alone stays a Google post; post with a number is the request | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "post"<br>"post 1" | `post_ask`<br>`request_ref_post` |
| S59-salon | cancel alone stays billing |  | "cancel" | `billing_stub`<br>requests: 0 |
| S59-gym | cancel alone stays billing |  | "cancel" | `billing_stub`<br>requests: 0 |
| S59-garage | cancel alone stays billing |  | "cancel" | `billing_stub`<br>requests: 0 |
| S60-salon | A bare number is the request | "Book Sarah for highlights Thursday 3pm"; tap Save | "1" | `request_summary` |
| S60-gym | A bare number is the request | "Maya asked about a trial"; tap Save | "1" | `request_summary` |
| S60-garage | A bare number is the request | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "1" | `request_summary` |
| S61-salon | Kabsi sign in CODE goes to sign-in, never the book |  | "Kabsi sign in AB23CD" | `signin_asked`<br>requests: 0 |
| S61-gym | Kabsi sign in CODE goes to sign-in, never the book |  | "Kabsi sign in AB23CD" | `signin_asked`<br>requests: 0 |
| S61-garage | Kabsi sign in CODE goes to sign-in, never the book |  | "Kabsi sign in AB23CD" | `signin_asked`<br>requests: 0 |

## Phone with several businesses

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S62-salon | Nothing chosen yet: the role and business questions hold the request, then it is read |  | "Book Sarah for highlights Thursday 3pm"<br>tap My business<br>"3" | `which_role`<br>`which_business`<br>`request_proposed`<br>requests: 0 |
| S62-gym | Nothing chosen yet: the role and business questions hold the request, then it is read |  | "Maya asked about a trial"<br>tap My business<br>"2" | `which_role`<br>`which_business`<br>`request_proposed`<br>requests: 0 |
| S62-garage | Nothing chosen yet: the role and business questions hold the request, then it is read |  | "Ali Corolla brakes squeaking tomorrow 10am"<br>tap My business<br>"1" | `which_role`<br>`which_business`<br>`request_proposed`<br>requests: 0 |
| S63-salon | A request at one business is never seen at another | "Book Sarah for highlights Thursday 3pm"; tap Save | "switch"<br>tap My business<br>"1"<br>"1" | `which_role`<br>`which_business`<br>`business_set`<br>`request_summary` says "not found" |
| S63-gym | A request at one business is never seen at another | "Maya asked about a trial"; tap Save | "switch"<br>tap My business<br>"1"<br>"1" | `which_role`<br>`which_business`<br>`business_set`<br>`request_summary` says "not found" |
| S63-garage | A request at one business is never seen at another | "Ali Corolla brakes squeaking tomorrow 10am"; tap Save | "switch"<br>tap My business<br>"2"<br>"1" | `which_role`<br>`which_business`<br>`business_set`<br>`request_summary` says "not found" |

## Forwarded

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S64-salon | A forwarded request is not read by the book |  | forwarded "Book Sarah for highlights Thursday 3pm" | `off_topic`<br>requests: 0 |
| S64-gym | A forwarded request is not read by the book |  | forwarded "Maya asked about a trial" | `off_topic`<br>requests: 0 |
| S64-garage | A forwarded request is not read by the book |  | forwarded "Ali Corolla brakes squeaking tomorrow 10am" | `off_topic`<br>requests: 0 |
| S65-salon | A forwarded yes never saves a waiting proposal |  | "Book Sarah for highlights Thursday 3pm"<br>forwarded "Yes" | `request_proposed`<br>`forwarded_yes`<br>requests: 0 |
| S65-gym | A forwarded yes never saves a waiting proposal |  | "Maya asked about a trial"<br>forwarded "Yes" | `request_proposed`<br>`forwarded_yes`<br>requests: 0 |
| S65-garage | A forwarded yes never saves a waiting proposal |  | "Ali Corolla brakes squeaking tomorrow 10am"<br>forwarded "Yes" | `request_proposed`<br>`forwarded_yes`<br>requests: 0 |

## Off topic

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S66-salon | A general assistant ask gets the fixed line, no model |  | "write me a poem" | `off_topic` *❓ Kabsi cannot help with that* |
| S66-gym | A general assistant ask gets the fixed line, no model |  | "write me a poem" | `off_topic` *❓ Kabsi cannot help with that* |
| S66-garage | A general assistant ask gets the fixed line, no model |  | "write me a poem" | `off_topic` *❓ Kabsi cannot help with that* |
| S67-salon | Something unclear the router places nowhere gets the fixed line |  | "is it any good" (router) | `off_topic` |
| S67-gym | Something unclear the router places nowhere gets the fixed line |  | "is it any good" (router) | `off_topic` |
| S67-garage | Something unclear the router places nowhere gets the fixed line |  | "is it any good" (router) | `off_topic` |

## Questions for Nora

| Id | Scenario | Before | Send | Expected |
|---|---|---|---|---|
| S68-salon | Is my data safe? goes to Nora, read by code |  | "Is my data safe?" | `nora` |
| S68-gym | Is my data safe? goes to Nora, read by code |  | "Is my data safe?" | `nora` |
| S68-garage | Is my data safe? goes to Nora, read by code |  | "Is my data safe?" | `nora` |
| S69-salon | A question about the price of Kabsi goes to Nora |  | "How much does Kabsi cost?" | `nora` |
| S69-gym | A question about the price of Kabsi goes to Nora |  | "How much does Kabsi cost?" | `nora` |
| S69-garage | A question about the price of Kabsi goes to Nora |  | "How much does Kabsi cost?" | `nora` |
| S70-salon | A question about logging in goes to Nora |  | "How do I log in on my laptop?" | `nora` |
| S70-gym | A question about logging in goes to Nora |  | "How do I log in on my laptop?" | `nora` |
| S70-garage | A question about logging in goes to Nora |  | "How do I log in on my laptop?" | `nora` |
| S71-salon | A question about my account or privacy goes to Nora |  | "Can I delete my account and my data?" | `nora` |
| S71-gym | A question about my account or privacy goes to Nora |  | "Can I delete my account and my data?" | `nora` |
| S71-garage | A question about my account or privacy goes to Nora |  | "Can I delete my account and my data?" | `nora` |
| S72-salon | A question about the bill or the plan goes to Nora |  | "Why was I charged twice this month?" | `nora` |
| S72-gym | A question about the bill or the plan goes to Nora |  | "Why was I charged twice this month?" | `nora` |
| S72-garage | A question about the bill or the plan goes to Nora |  | "Why was I charged twice this month?" | `nora` |
| S73-salon | A customer asking the business a price stays the book's |  | "Dina asked about a keratin price" | `request_proposed` |
| S73-gym | A customer asking the business a price stays the book's |  | "Omar asked about personal training" | `request_proposed` |
| S73-garage | A customer asking the business a price stays the book's |  | "Karim asked about a clutch price" | `request_proposed` |

