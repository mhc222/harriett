# Harriett Operating Cost Model

**Document type:** Internal reference for PD Labs and Pritchett-Moore Real Estate  
**Prepared:** June 2026  
**Scope:** Phase 2 pilot (10-agent brokerage) with projections through Phase 4 multi-tenant scale  
**Status:** Estimates based on published vendor pricing and typical usage patterns unless otherwise noted. Fixed infrastructure prices are confirmed. Per-task AI costs and usage volumes are modeled estimates subject to real-world calibration.

---

## 1. Fixed Monthly Infrastructure

These costs are shared across all agents at the brokerage. They do not scale with agent count until the usage thresholds noted below.

| Service | Plan | Monthly Cost | Notes |
|---|---|---|---|
| Vercel | Pro | $20 | Serverless + edge functions, preview deploys, custom domains |
| Supabase | Pro | $25 | 8GB DB, 100GB bandwidth, 1GB file storage, pgvector included |
| Trigger.dev | Free | $0 | 100k task runs/mo free. Pro at $50/mo if needed at scale |
| Resend | Free / Pro | $0 - $20 | Free tier: 100 emails/day. Pro ($20) if transactional volume grows |
| Cal.com | Free | $0 | Basic vendor booking links. Team plan $15/mo if needed |
| **Subtotal (baseline)** | | **$45 - $65/mo** | |

Supabase storage overages are $0.021/GB/mo beyond the base 1GB. At Phase 2 volumes (contracts, photos, checklist data for 10 agents), this is unlikely to trigger but worth monitoring once photo storage or PDF archiving grows.

---

## 2. Per-Agent Monthly Fixed Costs

| Item | Cost | Notes |
|---|---|---|
| Twilio phone number | $1.15/agent/mo | One dedicated number per opted-in agent |
| Twilio A2P 10DLC campaign fee | $4/mo total | Shared across all agents on the same brand/campaign. Not per-agent. |
| Microsoft Graph API | $0 | Covered by the office's existing M365 Business license (~$6-22/user/mo, already a sunk cost) |
| Mem0 memory | ~$0.05 - $0.10/agent/mo | Memory storage and semantic search. Free tier likely covers Phase 2 pilot. |

At 10 agents: Twilio numbers = $11.50/mo + $4/mo A2P campaign = $15.50/mo total for the phone layer.

---

## 3. Per-Task AI Cost Breakdown

### Model selection rationale

Not every task requires the same model. Routing to the right model is a meaningful cost lever.

| Task type | Model | Input price | Output price |
|---|---|---|---|
| Complex reasoning (contract parse, compliance detection, CMA) | Claude Sonnet 4.5 | $3.00/MTok | $15.00/MTok |
| Standard generation (marketing copy, checklists, vendor drafts, chat) | Claude Sonnet 4.5 | $3.00/MTok | $15.00/MTok |
| Simple/fast tasks (routing decisions, short confirmations, memory lookups) | Claude Haiku 4.5 | $0.80/MTok | $4.00/MTok |

MTok = million tokens. $3.00/MTok = $0.000003 per token.

### Per-task cost estimates

All estimates use Sonnet 4.5 pricing unless noted.

**Contract PDF parse (listing agreement or purchase contract, ~10-15 pages)**
- Input: ~12,000 tokens (PDF text content) + 800 tokens (system prompt) = ~12,800 tokens
- Output: ~1,200 tokens (structured JSON deal fields)
- Cost: (12,800 x $0.000003) + (1,200 x $0.000015) = $0.038 + $0.018 = **~$0.057 per parse**

**Transaction checklist generation**
- Input: ~1,500 tokens (system prompt + deal summary)
- Output: ~3,000 tokens (25-35 checklist items with due dates and assignees)
- Cost: (1,500 x $0.000003) + (3,000 x $0.000015) = $0.005 + $0.045 = **~$0.050 per checklist**

**Marketing copy package (MLS remarks + social post + presentation talking points)**
- Input: ~1,200 tokens (system + property data)
- Output: ~2,000 tokens
- Cost: (1,200 x $0.000003) + (2,000 x $0.000015) = $0.004 + $0.030 = **~$0.034 per generation**

**CMA analysis**
- Input: ~2,500 tokens (system prompt + comp data passed in)
- Output: ~2,500 tokens (full analysis with pricing narrative)
- Cost: (2,500 x $0.000003) + (2,500 x $0.000015) = $0.008 + $0.038 = **~$0.045 per CMA**

**Vendor outreach draft (email to photographer, inspector, or title)**
- Input: ~800 tokens
- Output: ~500 tokens
- Cost: (800 x $0.000003) + (500 x $0.000015) = $0.002 + $0.008 = **~$0.010 per draft**

**Agent chat message (Harriett answering a question with deal context)**
- Input: ~3,000 tokens (system prompt + deal context + memory summary + conversation history + question)
- Output: ~400 tokens (Harriett's reply)
- Cost: (3,000 x $0.000003) + (400 x $0.000015) = $0.009 + $0.006 = **~$0.015 per exchange**

**Inbox-triggered contract parse (Phase 2, Microsoft Graph detection)**
- Same AI cost as PDF parse: ~$0.057
- Trigger.dev task execution: covered in free tier at Phase 2 volumes
- Total: **~$0.060 per inbox-triggered parse**

**Compliance flag check (FHA form required, lead paint disclosure, dual agency)**
- Input: ~2,000 tokens (system + deal summary)
- Output: ~600 tokens (flags list with rationale)
- Model: Haiku 4.5 (pattern matching, not open-ended reasoning)
- Cost: (2,000 x $0.0000008) + (600 x $0.000004) = $0.002 + $0.002 = **~$0.004 per check**

**Routing/classification decision (Haiku)**
- Input: ~500 tokens
- Output: ~100 tokens
- Cost: **~$0.001 per routing call**

**Voice transcription + summarization (Phase 3 only)**
- Deepgram STT: $0.0059/minute. A 30-minute seller meeting = $0.18
- Summarization (Haiku): ~6,000 tokens input from transcript + 800 tokens output
- Haiku cost: (6,000 x $0.0000008) + (800 x $0.000004) = $0.005 + $0.003 = $0.008
- Total for a 30-minute seller meeting capture: **~$0.19**

**Image generation (if added for postcards and social)**
- DALL-E 3 standard quality: $0.04 per image
- Stability AI via API: ~$0.01 - $0.02 per image
- Note: this capability is not in Phase 2 baseline. Costs above are for planning purposes only.

### Per-task summary table

| Task | Model | Estimated cost |
|---|---|---|
| Contract PDF parse | Sonnet 4.5 | $0.057 |
| Checklist generation | Sonnet 4.5 | $0.050 |
| Marketing copy package | Sonnet 4.5 | $0.034 |
| CMA analysis | Sonnet 4.5 | $0.045 |
| Vendor outreach draft | Sonnet 4.5 | $0.010 |
| Agent chat message | Sonnet 4.5 | $0.015 |
| Compliance flag check | Haiku 4.5 | $0.004 |
| Routing decision | Haiku 4.5 | $0.001 |
| Voice transcription + summary (Phase 3) | Deepgram + Haiku | $0.190 |
| Image generation (if added) | DALL-E 3 | $0.040/image |

---

## 4. Prompt Caching Discount

Anthropic supports prompt caching at a 90% discount on cached input tokens. For Harriett, the following repeat across nearly every call and are strong caching candidates:

- System prompt (office policy, Harriett persona, compliance rules, Alabama RECAD requirements): ~2,000 tokens
- Deal context (property address, parties, key dates, loan type): ~1,500 tokens per deal, reused across all calls within that deal
- Agent profile and voice instructions (Mem0 summary for the agent): ~500 tokens

In practice, the input token cost on repeated calls drops from $0.000003 to $0.0000003 per cached token. For a typical chat exchange where 3,000 input tokens are mostly cached system/deal context, the real input cost may be closer to $0.001-0.002 rather than $0.009.

**Practical effect: real-world AI costs are likely 30-50% below the per-task estimates above**, once caching is implemented. The estimates in this document are intentionally conservative (no caching assumed) and serve as a cost ceiling, not the expected steady-state.

---

## 5. Agent Usage Profiles

Three usage tiers based on realistic real estate activity in a 10-20 agent residential brokerage.

### Light agent (1-2 deals/month)

Volume assumption: 1.5 deals/month average.

Per deal: 1 parse, 1 checklist, 1 marketing package, 2 vendor outreach drafts, 15 chat messages.

| Line item | Per deal | Monthly (x1.5) |
|---|---|---|
| Contract parse | $0.057 | $0.086 |
| Checklist | $0.050 | $0.075 |
| Marketing copy | $0.034 | $0.051 |
| Vendor outreach (x2) | $0.020 | $0.030 |
| Chat messages (x15) | $0.225 | $0.338 |
| Twilio SMS (~30 texts/deal x $0.008) | $0.240 | $0.360 |
| Compliance checks (x2) | $0.008 | $0.012 |
| **Total** | | **~$0.95/mo** |

Rounded estimate: **~$1/mo per light agent**

### Medium agent (3-4 deals/month)

Volume assumption: 3.5 deals/month, plus pre-listing work.

Per deal: 1 parse, 1 checklist, 1 marketing package, 3 vendor outreach drafts, 20 chat messages.  
Extra monthly: 2 CMAs, 4 additional social/listing copy requests, 10 standalone chat sessions.

| Line item | Per deal | Monthly (x3.5) | Monthly extras | Monthly total |
|---|---|---|---|---|
| Contract parse | $0.057 | $0.200 | | $0.200 |
| Checklist | $0.050 | $0.175 | | $0.175 |
| Marketing copy | $0.034 | $0.119 | $0.136 (4 extra) | $0.255 |
| Vendor outreach (x3) | $0.030 | $0.105 | | $0.105 |
| Chat messages (x20/deal + 10 extra) | $0.300 | $1.050 | $0.150 | $1.200 |
| CMAs | | | $0.090 (x2) | $0.090 |
| Twilio SMS (~50 texts/deal x $0.008) | $0.400 | $1.400 | | $1.400 |
| Compliance checks (x3/deal) | $0.012 | $0.042 | | $0.042 |
| **Total** | | | | **~$3.47/mo** |

Adding Twilio number ($1.15) and Mem0 (~$0.08): **~$5-7/mo per medium agent**

### Heavy agent (6+ deals/month with heavy pre-listing use)

Volume assumption: 6 deals/month, daily Harriett use for pipeline, marketing, and agent-initiated requests.

Per deal: 1 parse, 1 checklist, 1 marketing, 3 vendor outreach, 30 chat messages.  
Extra monthly: 4 CMAs, 8 social/listing copy requests, 10 additional standalone chat sessions, daily pipeline chat (20 sessions).

| Line item | Monthly |
|---|---|
| Contract parses (x6) | $0.342 |
| Checklists (x6) | $0.300 |
| Marketing copies (x6 + 8 extra) | $0.476 |
| Vendor outreach (x18) | $0.180 |
| Chat messages (x180 deal + 30 extra) | $3.150 |
| CMAs (x4) | $0.180 |
| Compliance checks (x18) | $0.072 |
| Twilio SMS (~60 texts/deal x 6) | $2.880 |
| Twilio number | $1.150 |
| Mem0 | $0.100 |
| **Total** | **~$8.83/mo** |

Rounded with buffer for edge cases: **~$10-15/mo per heavy agent**

Note: a power user generating Facebook ad copy, video scripts, and flyers at very high volume could push toward $20-25/mo in AI costs alone. This is an outlier, not the expected case.

---

## 6. Office-Level Monthly Cost (Phase 2, 10-Agent Brokerage)

Agent mix assumption: 3 light, 5 medium, 2 heavy.

| Line item | Monthly cost |
|---|---|
| Fixed infrastructure (Vercel + Supabase + Resend) | $65 |
| Twilio A2P 10DLC campaign fee (shared) | $4 |
| Twilio numbers (10 agents x $1.15) | $11.50 |
| Light agents (3 x $1) | $3 |
| Medium agents (5 x $6) | $30 |
| Heavy agents (2 x $12) | $24 |
| Coordinator (Alyssa) additional use | $3 |
| Broker (Wilson) approval queue + pipeline use | $4 |
| **Total estimated monthly** | **~$144.50** |

**Rounded conservative estimate: $150 - $175/mo for the full office**

This assumes no image generation, no voice (Phase 3), and no Trigger.dev Pro upgrade. It also assumes the free Mem0 tier covers Phase 2 memory volume.

Blended per-agent cost: approximately **$15/mo per agent** when infrastructure is included, or **$5-6/mo per agent** in variable AI and SMS costs alone.

---

## 7. Internal Staff Usage Notes

Non-agent staff use Harriett differently and add modest cost on top of the agent estimates.

| Staff member | Usage pattern | Estimated monthly add |
|---|---|---|
| Coordinator (Alyssa) | Dashboard, checklist updates, weekly summary reports. Mostly Supabase reads, low AI generation. | +$2 - $3/mo |
| Broker (Wilson) | Approval queue, pipeline overview, occasional compliance drafts. Moderate AI. | +$3 - $5/mo |
| Executive admin (Gail) | Light: cc'd on workflows, reviews outgoing messages. Minimal direct AI. | +$1/mo |
| Marketing-focused user (image gen, if added) | 20 images/mo x $0.04 = $0.80 in image costs, plus regular copy generation. | +$3 - $5/mo |

These are already partially included in the office-level estimate above (Wilson and Alyssa line items). Gail and any marketing-heavy use would add up to ~$5-10/mo depending on actual behavior.

---

## 8. Scale Analysis (Phase 4 Multi-Tenant)

Costs per agent decrease as fixed infrastructure is amortized across more brokerages. This is a structural advantage of the architecture.

| Scale | Fixed infra | Variable (avg $7/agent) | Total monthly | Per-agent blended |
|---|---|---|---|---|
| 10 agents (Phase 2 pilot) | $80 | $70 | $150 | $15.00 |
| 25 agents | $100 | $175 | $275 | $11.00 |
| 50 agents | $150 | $350 | $500 | $10.00 |
| 100 agents | $200 | $700 | $900 | $9.00 |
| 200 agents | $350 | $1,400 | $1,750 | $8.75 |

Notes on infrastructure scaling:
- Supabase Pro handles moderate multi-tenant load. A larger plan (~$50-100/mo) may be needed above 50 agents depending on storage and connection volume.
- Vercel Pro covers up to 100 agents without needing the Team plan ($50/mo). Team plan adds per-seat overhead for admin access, not for end-user traffic.
- Trigger.dev free tier (100k runs/mo) covers approximately 25-30 agents before Pro ($50/mo) is needed.
- Twilio A2P 10DLC: each brokerage on the platform is a separate brand/campaign. Add $4/mo per brokerage, not per agent.

---

## 9. Phase 3 Voice Cost Additions

Voice is out of scope for Phase 2. These numbers are planning estimates for Phase 3 sizing.

**Per call (inbound agent call, Harriett responding):**
- Deepgram STT: $0.0059/minute. A 5-minute agent call = $0.030
- ElevenLabs TTS (Harriett speaking): $0.00048/character for standard voices. A 200-word Harriett response (~1,000 characters) = $0.48

ElevenLabs TTS is the expensive component. Voice responses add roughly $0.50 per substantive Harriett voice utterance. This is by far the highest-cost per-interaction channel.

**Constraints from compliance rules:**
- No outbound voice to consumers. TCPA risk is prohibitive.
- Voice is inbound from agents and outbound to vendors only.
- At Phase 3, an agent calling Harriett for a 10-minute check-in with 4-5 Harriett voice responses would cost approximately $0.35 (STT) + $2.00 (TTS) = $2.35 per call.

**Estimated voice add per agent per month (Phase 3):**
- Light user: 2-4 calls/mo = +$5 - $10/mo
- Heavy user: 8-10 calls/mo = +$20 - $25/mo

Voice roughly doubles the per-agent cost for agents who adopt it heavily. This is the primary reason voice is a Phase 3 scope item and not bundled into Phase 2 pricing.

---

## 10. Complete Summary Table

### Per-task costs

| Task | Model | Unit cost (no caching) | Unit cost (with caching, est.) |
|---|---|---|---|
| Contract PDF parse | Sonnet 4.5 | $0.057 | $0.030 - $0.040 |
| Checklist generation | Sonnet 4.5 | $0.050 | $0.025 - $0.035 |
| Marketing copy package | Sonnet 4.5 | $0.034 | $0.020 - $0.028 |
| CMA analysis | Sonnet 4.5 | $0.045 | $0.025 - $0.035 |
| Vendor outreach draft | Sonnet 4.5 | $0.010 | $0.006 - $0.008 |
| Agent chat message | Sonnet 4.5 | $0.015 | $0.007 - $0.010 |
| Compliance flag check | Haiku 4.5 | $0.004 | $0.002 - $0.003 |
| Routing decision | Haiku 4.5 | $0.001 | $0.001 |
| Voice: 30-min capture (Phase 3) | Deepgram + Haiku | $0.190 | same |
| Image generation (if added) | DALL-E 3 | $0.040 | same |

### Per-agent monthly cost by usage tier

| Usage tier | Deals/mo | AI + SMS variable | With Twilio number | Notes |
|---|---|---|---|---|
| Light | 1-2 | $0.60 | $1.75 | Infrequent use |
| Medium | 3-4 | $4.50 | $5.65 | Typical residential agent |
| Heavy | 6+ | $9.50 | $10.65 | Power user, heavy pre-listing |

### Office-level monthly (10-agent brokerage, Phase 2)

| Component | Monthly |
|---|---|
| Fixed infrastructure | $65 |
| Twilio phone + A2P (10 agents) | $15.50 |
| Agent AI + SMS variable (mixed tier) | $57 |
| Staff (coordinator + broker) | $7 |
| **Total** | **~$144.50** |
| **Rounded conservative estimate** | **$150 - $175/mo** |

### Per-agent cost at scale

| Agents | Total monthly | Per-agent blended |
|---|---|---|
| 10 (Phase 2 pilot) | $150 | $15.00 |
| 25 | $275 | $11.00 |
| 50 | $500 | $10.00 |
| 100 | $900 | $9.00 |

---

## 11. Risks and Unknowns

These items could move costs materially from the estimates above:

- **PDF extraction quality.** If contracts require multiple parse attempts due to scan quality (handwriting, poor OCR), token counts and cost per parse increase. Pre-processing with a vision model adds cost.
- **Conversation depth.** Agents who treat Harriett as a general assistant (asking non-deal questions, long back-and-forth) increase chat token costs quickly. Context window management (trimming old history) is a necessary cost control.
- **Mem0 pricing.** Mem0 is a relatively new service and pricing may change. If self-hosting pgvector for memory becomes necessary, there is no added cost but engineering overhead increases.
- **Trigger.dev volume.** If inbox monitoring runs on a tight polling loop rather than event-driven webhooks, task run counts could hit the free tier ceiling faster than expected.
- **ElevenLabs TTS (Phase 3).** Voice response cost is the single largest per-interaction cost in the stack. If agent adoption of voice is higher than expected, Phase 3 per-agent costs will be meaningfully higher than Phase 2.
- **Supabase storage.** If contract PDFs and photos are stored in Supabase Storage (rather than offloaded to S3 or similar), storage costs will scale with transaction volume. At 1 contract PDF (~1MB) and 20 photos per deal (~50MB), a brokerage doing 100 deals/year adds ~5GB/year.

---

*Prepared by PD Labs for internal planning and client communication. Prices reflect published vendor rates as of June 2026. Actual costs will vary based on real-world usage patterns, prompt optimization, and caching implementation.*
