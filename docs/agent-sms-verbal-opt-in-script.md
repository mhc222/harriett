# Harriett Agent SMS Verbal Opt-In Script

For Pritchett-Moore Real Estate, LLC agents enrolling in Harriett text messages.

Use this script only for licensed agents or staff affiliated with the brokerage. Harriett texts agents only. She does not text consumers.

## Before the Conversation

Confirm these details before asking for consent:

- Agent full name
- Mobile number that will receive Harriett texts
- Agent is affiliated with Pritchett-Moore Real Estate, LLC
- The number belongs to the agent, or the agent has authority to use it for brokerage communication

Do not enroll an agent unless they clearly say yes.

## Verbal Script

Hi [Agent Name], this is [Your Name] with Pritchett-Moore. We are enrolling agents for Harriett, our transaction assistant.

Harriett can text you at [mobile number] about your real estate work with Pritchett-Moore, including new transaction alerts, deadline reminders, scheduling coordination, and replies to questions you send her.

Message frequency will vary based on your transaction activity. Message and data rates may apply. You can reply STOP at any time to stop receiving Harriett texts, or HELP for help. Your consent is not a condition of your affiliation with Pritchett-Moore.

Do I have your permission to send Harriett text messages to [mobile number] for those purposes?

## Accepted Responses

The agent must give an affirmative response, such as:

- "Yes."
- "Yes, that is fine."
- "I agree."
- "You can text me there."

Do not treat silence, "sure, I guess," or a topic change as consent. If the response is unclear, ask:

Just to make sure I have it right, do you agree to receive Harriett text messages at [mobile number] for transaction alerts, deadline reminders, scheduling coordination, and replies to your questions?

## If the Agent Says Yes

Thanks. I have you marked as opted in for Harriett texts at [mobile number]. You can reply STOP any time if you want those texts to stop.

Record the consent event immediately.

## If the Agent Says No

No problem. I will leave you opted out of Harriett texts. You can still use the dashboard, and we can enroll you later if you change your mind.

Record the refusal if the agent was invited but declined.

## Consent Record to Save

Save one record per verbal opt-in:

- Agent name
- Agent mobile number
- Office: Pritchett-Moore Real Estate, LLC
- Consent channel: verbal
- Consent event: opt_in
- Exact script version: `docs/agent-sms-verbal-opt-in-script.md`
- Date and time of consent
- Person who collected consent
- Agent's affirmative response, summarized or quoted briefly
- Any notes, for example "confirmed number belongs to agent"

Example:

> Jerrod Hastings verbally agreed on 2026-08-21 at 2:15 PM CT to receive Harriett text messages at +1XXXXXXXXXX for transaction alerts, deadline reminders, scheduling coordination, and replies to his questions. Consent collected by Alyssa. Agent said, "Yes, you can text me there."

## Confirmation Text

After the consent record is saved and the agent is enrolled, Harriett may send this confirmation:

> Pritchett-Moore Real Estate: You're all set. I'm Harriett, your transaction assistant. I'll text you when something on your deals needs attention. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.

## Ground Rules

- Use this only for agents and staff, never consumers.
- Consent must be specific to Harriett text messages.
- The agent must hear the message frequency, message and data rates, HELP, STOP, and "not a condition" language before opting in.
- If an agent asks to stop texts in any words, mark them opted out.
- Do not re-enroll an opted-out agent without a fresh affirmative opt-in.
