# Slice 1 Acceptance, 2026-08-25

## Result

PASS. The live WhatsApp-to-dashboard property research loop completed against
3933 Gaineswood Ln, Tuscaloosa, AL 35406.

## Acceptance evidence

| Criterion | Result | Evidence |
| --- | --- | --- |
| Agent requests property research in WhatsApp | Pass | Inbound WhatsApp message stored and audited on 2026-08-25. |
| Concise plain-text response | Pass | Twilio delivered the response without Markdown formatting artifacts. |
| Authenticated dashboard link | Pass | Production URL resolves to the protected research route and redirects unauthenticated users to login with the destination preserved. |
| Facts, value, comps, sources, timestamps, and caveats | Pass | Research `07b4e79f-3eda-4c52-a355-baab9c74c262` contains the RentCast valuation, 25 sold records, six selected primary comps, confidence flags, provider timestamps, and MLS verification warnings. |
| Seller appointment brief without re-entering the address | Pass | Seller brief artifact `ffea0f17-ec74-44ee-922f-60b8fea91eb0` was created from the saved research record. The WhatsApp runtime now exposes the same creation function as an audited skill. |
| Research remains in history | Pass | The saved research and linked artifacts remain available in the Research workspace. |
| Complete operational trace | Pass | AI run, CMA skill run, workflow run and events, two RentCast provider runs, messages, research, artifacts, and audit records are linked. |

## Live run details

- Research ID: `07b4e79f-3eda-4c52-a355-baab9c74c262`
- AI run ID: `2a7314dd-1288-4408-9677-195587b0fe93`
- Research type: `cma_prep`
- RentCast calls: 2
- Sold records received: 25
- Selected primary comps: 6
- Seller brief artifact: `ffea0f17-ec74-44ee-922f-60b8fea91eb0`
- Confidence flags: public data only, automated estimate, MLS verification required, wide valuation range

## Reliability hardening completed

- Agent and office database lookup failures return HTTP 503 instead of being
  treated as unknown senders.
- Twilio delivery status updates are monotonic. Late `sent` callbacks cannot
  overwrite `delivered` or `read`, and terminal failures remain failed.
- Ignored stale callbacks write a separate audit action.
- Seller appointment briefs are saved artifacts and can only be reported as
  created after an artifact ID is returned.
- Production background tasks refuse to create localhost dashboard links.

## Product boundary

The CMA remains agent-facing preparation based on public provider records.
Selected closed sales, concessions, financing, condition, and market-area fit
must be verified in the brokerage MLS before an agent presents a final pricing
recommendation.
