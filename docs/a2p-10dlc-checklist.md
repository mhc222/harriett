# A2P 10DLC Pre-Registration Checklist

For Wilson Moore, Pritchett-Moore Real Estate, LLC
Prepared by Matt Cronin, PD Labs. 2026-08-11.

Before Harriett can send a single text message, US carriers require the brokerage to be
registered as a verified sender (A2P 10DLC). Registration runs through Twilio and takes
3 to 4 weeks end to end: the brand check clears in days, but campaign review runs 10 to
15 business days, and any rejection adds 3 to 7 more. That makes this the critical path
for the whole pilot, so it goes in on Day 1.

The good news: Harriett texts agents only, never your clients. That keeps the
registration simple and the compliance surface small. Consumer-facing communication is
email, drafted by Harriett and approved by you before it goes out.

## What I need from you (this week)

1. **EIN and legal name, exactly as the IRS has them.** The registration is checked
   against IRS records character for character. "Pritchett-Moore Real Estate LLC" vs
   "Pritchett-Moore Real Estate, LLC" is a rejection. The safest source is your IRS
   CP 575 letter (the one issued when the EIN was created) or a 147C letter, which the
   IRS will fax same-day if you call 1-800-829-4933.
2. **Legal business address as registered with the IRS.** Same rule: it must match, not
   just be correct.
3. **Business details:** entity type (LLC), state of formation (Alabama), and the
   website URL to list (pritchett-moore.com).
4. **Authorized representative:** your name, title, email, and direct phone. Carriers
   may verify by calling.
5. **A home for two public pages** (see copy below): an SMS opt-in page and a privacy
   policy. They can live on pritchett-moore.com or on a page I host for the office;
   carriers just need a public URL. Tell me which you prefer.
6. **Your OK on the sample messages below.** They must match what Harriett actually
   sends; carriers audit live traffic against them after approval.

## What I handle

- Twilio subaccount setup for Pritchett-Moore under our ISV registration (your traffic
  is always sent under your own brand, never ours).
- Standard brand registration on your EIN.
- Campaign registration (Low Volume Mixed use case: notifications plus two-way
  conversation with your agents, well under carrier volume thresholds at pilot scale).
- Building the opt-in flow, STOP/HELP handling, and the content guardrails that keep
  Harriett's messages inside the registered use case.
- Tracking the review and handling any rejection resubmission.

## Campaign description (what carriers will see)

> Harriett is a transaction assistant for Pritchett-Moore Real Estate, LLC. Messages
> are sent only to licensed real estate agents affiliated with the brokerage who have
> opted in through the brokerage's enrollment form. Content includes new transaction
> alerts, compliance deadline reminders, scheduling coordination, and two-way
> conversational replies. No messages are sent to consumers. No marketing content.

## SMS opt-in page copy (draft for your review)

Page title: **Harriett Text Notifications, Agent Enrollment**

> Harriett is Pritchett-Moore Real Estate's transaction assistant. By enrolling, you
> agree to receive text messages from Harriett at the mobile number you provide,
> including new transaction alerts, deadline reminders, and replies to your questions.
>
> Message frequency varies by transaction activity. Message and data rates may apply.
> Reply STOP at any time to stop receiving messages, or HELP for help. Consent is not
> a condition of your affiliation with Pritchett-Moore Real Estate.
>
> See our [Privacy Policy] for how your information is handled.

Form fields: name, mobile number, unchecked consent checkbox ("I agree to receive text
messages from Harriett as described above"), submit. The unchecked checkbox matters;
pre-checked boxes are a rejection reason.

## Privacy policy language (required lines)

Carriers reject campaigns whose privacy policy allows sharing phone numbers for
marketing. The policy must contain language equivalent to:

> Mobile phone numbers and SMS opt-in consent collected for Harriett text
> notifications are used solely to deliver those notifications. They are not shared
> with, sold to, or transferred to any third party for marketing or promotional
> purposes. Text messaging opt-in data is not shared with third parties.

If pritchett-moore.com already has a privacy policy, this gets added to it. If not, I
will draft a short standalone policy for your review.

## Sample messages (must match real Harriett output)

These five go on the registration. After approval, carriers can audit live traffic
against them, so Harriett's send path enforces that outbound messages stay in this
style and subject matter.

1. **Enrollment confirmation**
   > Pritchett-Moore Real Estate: You're all set. I'm Harriett, your transaction
   > assistant. I'll text you when something on your deals needs attention. Msg
   > frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt
   > out.

2. **New deal detected**
   > Hi Jerrod, it's Harriett. I picked up the signed purchase agreement on 604 2nd St
   > NW in Gordo, closing set for June 5. Two things need attention: the lead-based
   > paint inspection window runs 10 days from acceptance, and the loan switched to
   > FHA, so the Amendatory Clause needs to be re-executed. Your checklist is ready on
   > the dashboard. Want the top three items here?

3. **Deadline reminder**
   > Hi Jerrod, it's Harriett. The lead-based paint window on 604 2nd St NW closes this
   > Friday and I haven't seen the signed waiver come through. Want me to draft a nudge
   > to the buyer's agent for your review?

4. **Scheduling coordination**
   > Hi Jerrod, it's Harriett. Photos for 604 2nd St NW: the photographer has Tuesday
   > 10am or Wednesday 2pm open. Which works? I'll confirm and put it on your calendar.

5. **HELP response**
   > Harriett, Pritchett-Moore Real Estate's transaction assistant. For support,
   > contact matt@pdlabs.xyz or call the office. Reply STOP to opt out of texts.

STOP response (sent once, then the number goes silent):
   > You've been unsubscribed from Harriett texts and won't receive further messages.
   > Contact the office to re-enroll.

## Ground rules already built into Harriett

- Opt-outs are honored however an agent expresses them (STOP, QUIT, or plain English
  like "stop texting me"), not just keywords, and the flag applies globally.
- Every message Harriett sends or receives is logged to a full audit trail.
- Harriett never texts consumers. That path does not exist in the system.

## Timeline

| Step | Owner | Duration |
| --- | --- | --- |
| Items 1 to 6 above | Wilson | This week |
| Opt-in page and privacy policy live | Matt | 1 to 2 days after your OK |
| Brand registration submitted | Matt | Same day |
| Brand clears | Carrier | 2 to 5 days |
| Campaign submitted | Matt | Same day brand clears |
| Campaign review | Carrier | 10 to 15 business days |
| If rejected: fix and resubmit | Matt | Adds 3 to 7 days per round |

Until this clears, Harriett can do everything except text. The build continues in
parallel; texting switches on the day the campaign is approved.
