# Real Estate MCP and Compliance Knowledge Research

Date: 2026-08-21

This note reviews real estate MCP servers that may add value to Harriett, then lays out a practical way to bring NAR guidance, NAR Code of Ethics, Alabama real estate law, RECAD, and office policy into Harriett's knowledge layer.

## Recommendation

Do not make `agentic-ops/real-estate-mcp` part of Harriett's production core. Use it as a reference implementation and source of utility patterns, especially deterministic mortgage math, affordability calculations, valuation disclaimers, feature-flagged tool categories, and local audit logging.

For production value, prioritize two tracks:

1. Build Harriett's compliance and policy corpus inside the existing `knowledge_sources` / `knowledge_chunks` pgvector architecture.
2. Add live real estate data only through licensed providers or standards-based integrations, not scraped or demo MCPs.

Best near-term MCP candidates:

| MCP | Value for Harriett | Fit |
| --- | --- | --- |
| `@reso-standards/reso-mcp-server` | Standards-compliant RESO OData querying, metadata inspection, validation, certification tooling | High later, once we have MLS or provider credentials |
| Repliers MCP | Live MLS-backed listings, market stats, listing lookup via Repliers API | High if Repliers can cover Alabama/Tuscaloosa under proper data agreements |
| `agentic-ops/real-estate-mcp` | Offline reference, utility calculators, demo tool structure, optional public data adapters | Medium as reference, low as production data source |
| `GumpperGroup/unlock-reso-mcp-remote` | RESO demonstration pattern using Bridge Interactive-style workflows | Medium as architecture reference |
| regional/scraping MCPs | Dutch, Korean, or website-specific real estate retrieval | Low for Harriett |

## `agentic-ops/real-estate-mcp`

Source: [GitHub repo](https://github.com/agentic-ops/real-estate-mcp)

What it is:

- Python FastMCP server, Python 3.10+, stdio, SSE, and streamable HTTP transports.
- README claims V2.0 status, 50+ tools across property, agent, market, client, area, mortgage, valuation, document, queue, integration, and system categories.
- Offline-first with local JSON seed data, optional integrations for Census, Walk Score, FEMA, FRED, FBI Crime Data, EPA, NOAA, RentCast, and Zillow/Bridge-style licensed access.
- AGPL-3.0 licensed.

What is useful:

- The tool surface is a good checklist for Harriett's eventual skill taxonomy.
- Mortgage and investment math is deterministic and separately tested.
- Valuation tools explicitly return disclaimers such as analytical estimate only, not appraisal or financial advice.
- Feature flags allow entire categories of tools to be disabled.
- The README is thoughtful about privacy boundaries and metered API costs.

What is not production-ready for us:

- Offline seed data is not useful for Pritchett-Moore's actual Tuscaloosa work.
- CMA logic appears simplified, for example average price per square foot by area. That is fine for a demo, not defensible for agent-facing pricing without MLS context and human review.
- AGPL-3.0 is a serious licensing constraint if code is copied into a SaaS product. Treat it as inspiration unless we are comfortable with AGPL obligations.
- It does not solve Alabama-specific brokerage compliance, RECAD, office policy, broker approval, or consumer communication gating.
- It is not an MLS entitlement layer.

Harriett use:

- Reference only.
- Reimplement any utility math cleanly in TypeScript if we need it.
- Keep CMA/pricing outputs draft-only with agent review and citations.

### Deeper Repo Read

Files reviewed: `main.py`, `feature_flags.py`, `tools/__init__.py`, `utils.py`, `tools/property_tools.py`, `tools/document_tools.py`, `tools/integration_tools.py`, `tools/finance_helpers.py`, `tools/mortgage_tools.py`, `tools/valuation_tools.py`, `tools/deep_analysis_tools.py`, `integrations/config.py`, `integrations/rentcast.py`, `integrations/zillow.py`, `tests/unit/test_finance_helpers.py`, `tests/integration/test_integrations.py`, `.agents/skills/real-estate-mcp-toolkit/SKILL.md`, and `AGENTS.md`.

Code-level findings:

- The server shape is clean. `main.py` creates a FastMCP server, registers tools, resources, and prompts, then supports `stdio`, `sse`, and `streamable-http`.
- Tool registration is easy to reason about. `feature_flags.py` and `tools/__init__.py` let operators disable whole categories with `REALESTATE_MCP_ENABLE_*` env vars.
- The core data model is local JSON. `utils.py` loads seed files under `data/` and provides simple query/filter helpers. This makes the repo portable, but not production-grade for Harriett's multi-tenant Supabase/RLS architecture.
- Search is basic substring matching across local listing fields. It is not MLS search, not RESO-aware search, and not a substitute for licensed property data.
- Document ingestion is deterministic but shallow. `document_tools.py` reads `.txt` and `.docx`, then extracts fields with regex. That can inspire Harriett's field-validation UX, but it is not enough for contracts, forms, RECAD, or broker workflow automation.
- The best reusable ideas are in `finance_helpers.py`: pure mortgage, amortization, affordability, NOI, cap rate, gross rent multiplier, and cash-on-cash calculations with unit tests.
- Mortgage tools surface assumptions and disclaimers. That pattern fits Harriett, but code should be rewritten in TypeScript because of AGPL licensing.
- Valuation is intentionally simple. It estimates value by average area price per square foot from local comparable sales. That is acceptable as a demo warning flag, but not sufficient for a real CMA.
- `deep_analysis_tools.py` uses MCP sampling if the client supports it, with a deterministic fallback. Interesting pattern, but Harriett should use Vercel AI SDK tool loops and internal observability rather than MCP sampling.
- Integrations are off by default, and tests verify disabled integrations do not make network calls. This is a good safety pattern.
- RentCast is a thin adapter and looks straightforward.
- Zillow/Bridge is clearly provisional. The adapter notes it could not be verified against a live enterprise account, so treat it as an example, not a plug-in.
- Tests are useful but mostly verify local behavior, mock HTTP, and shape compatibility. They do not prove production data quality.
- The included skill is a methodology layer for using the MCP tools, not domain authority. It consistently says to surface disclaimers and assumptions.

Verdict: strong demo/reference repo, weak production fit. Borrow architecture patterns, not code. Do not mount this MCP directly in Harriett's production agent runtime.

## RESO MCP

Sources: [RESO MCP package](https://tools.reso.org/packages/reso-mcp-server/), [RESO Web API](https://www.reso.org/reso-web-api/), [RESO tools webinar](https://www.reso.org/blog/new-reso-tools-webinar/)

What it is:

- Official RESO MCP server exposing tools for OData querying, metadata parsing, validation, and compliance testing.
- Supports bearer token or OAuth2 client credentials.
- Can be scoped to certification-only tools.
- RESO states that RESO creates standards and does not itself provide MLS listing data, so actual data access still comes from an MLS or provider.

Value for Harriett:

- Strongest technical fit if we later connect to MLS/IDX/back-office data using RESO Web API credentials.
- Useful for validating provider metadata and understanding fields before we build MLS workflows.
- Safer long-term than bespoke scraping because it follows the real estate industry's data standard.

Limits:

- No data without credentials.
- MLS rules and brokerage permissions still govern use.
- Some Add/Edit or back-office operations could become high-risk write actions and need explicit approval gates.

Harriett use:

- Keep on the Phase 3/4 integration shortlist.
- Use read-only scopes first: metadata, query, validation.
- Require broker/admin-controlled credentials and audit every retrieval.

## Repliers MCP

Sources: [Repliers MCP page](https://repliers.com/repliers-mcp-server/), [GitHub repo](https://github.com/Repliers-io/mcp-server), [setup guide](https://help.repliers.com/en/article/setting-up-repliers-mcp-8mi5t5/), [API docs](https://docs.repliers.io/reference/getting-started-1)

What it is:

- MCP server around Repliers' real estate API.
- Tools include listing search, single listing lookup, market statistics, and possible-value lookup.
- Hosted and self-hosted options.
- Open-source MIT licensed server.
- Requires a Repliers API key. Their docs note users must ensure their use complies with MLS policies.

Value for Harriett:

- Potentially the fastest way to get licensed MLS-like search and market stats into pre-listing workflows.
- More production-relevant than demo MCPs because it wraps a real data vendor.
- Natural-language search can be useful for agent-facing prep.

Limits:

- Must confirm Alabama and Tuscaloosa-area coverage, MLS board permissions, sold data access, allowed display/use, and pricing.
- Search/listing data cannot be treated as legal or pricing authority.
- Any listing or comp output needs source attribution, freshness, and review status.

Harriett use:

- Evaluate vendor fit before code integration.
- If adopted, integrate through Harriett's provider abstraction and audit trail, not as an unrestricted agent tool.

## Compliance Knowledge Layer

Harriett already has most of the right schema in `harriett-app/supabase/migrations/0010_agent_platform.sql`:

- `knowledge_sources`
- `knowledge_versions`
- `knowledge_chunks`
- pgvector embeddings
- full-text search
- authority scores
- source status, effective dates, supersession
- retrieval events

The implementation should use those tables rather than a generic vector DB.

### Source Set

Start with these authority tiers:

| Tier | Source type | Examples | Authority |
| --- | --- | --- | --- |
| 1 | Binding law and regulation | Alabama Code Title 34 Chapter 27, Alabama Administrative Code Chapter 790-X, AREC statutory change notices | 95 to 100 |
| 2 | Official regulator forms and guidance | AREC RECAD form, brokerage disclosure rules, advertising guidance, office audit checklist | 90 to 95 |
| 3 | NAR ethical/professional rules | 2026 NAR Code of Ethics, Code of Ethics and Arbitration Manual, MLS policy materials | 75 to 85 |
| 4 | Broker/office policy | Wilson-approved office procedures, Pritchett-Moore checklist, consumer-message rules | 80 to 95 depending on topic |
| 5 | Training and explanatory material | NAR explainers, AREC videos/summaries, internal training notes | 50 to 70 |

Primary sources found:

- [2026 NAR Code of Ethics and Standards of Practice](https://www.nar.realtor/about-nar/governing-documents/code-of-ethics/2026-code-of-ethics-standards-of-practice), effective January 1, 2026.
- [NAR Code of Ethics and Arbitration Manual](https://www.nar.realtor/code-of-ethics-and-arbitration-manual), 2026 edition.
- [NAR Code of Ethics and Professional Standards hub](https://www.nar.realtor/about-nar/policies/code-of-ethics-and-professional-standards).
- [AREC statutory changes page](https://arec.alabama.gov/pages/laws/StatutoryChanges.aspx?AspxAutoDetectCookieSupport=1), including 2025 RECAD changes and 2026 rule updates.
- [AREC license law list](https://arec.alabama.gov/pages/laws/LawList.aspx?AspxAutoDetectCookieSupport=1).
- [Alabama Administrative Code, Alabama Real Estate Commission chapters](https://admincode.legislature.state.al.us/administrative-code/790-X-1).
- [Alabama Code section 34-27-8](https://alison.legislature.state.al.us/code-of-alabama?section=34-27-8), Commission rulemaking and agency disclosure authority.

### Ingestion Design

Add a small ingestion pipeline:

1. `knowledge_manifest.json`
   - Source URL
   - title
   - kind
   - authority
   - effective_from
   - effective_to
   - refresh cadence
   - owner/reviewer
   - ingestion permissions

2. Fetch and normalize
   - Prefer official PDF, DOCX, or HTML.
   - Convert to text with page markers and headings.
   - Preserve source URL, page number, section, effective date, and content hash.

3. Chunk
   - Chunk by article, section, rule, form field, or checklist step.
   - Keep chunks citation-friendly. A Harriett answer should point to a specific rule or article, not a giant document.

4. Review before publish
   - Default new sources to `review`.
   - Publish only after Wilson, Tanner, or designated legal/compliance reviewer approves.
   - Keep old versions as `superseded`, never overwrite silently.

5. Retrieval
   - Query by topic and phase: RECAD, advertising, agency, fair housing, buyer agreement, listing agreement, lead-based paint, broker approval.
   - Inject top citations into the model prompt.
   - Log `retrieval_events` for auditability.

6. Guardrails
   - Harriett may summarize requirements and flag issues.
   - Harriett should not give legal advice or final compliance determinations.
   - Consumer-facing drafts remain broker-gated.
   - Legal/regulatory answers should include citations and a "verify with broker or counsel" posture when stakes are high.

### Product Behavior

Agent-facing examples:

- "Does this deal need lead-based paint disclosure?"
- "What RECAD disclosure should we have on file?"
- "Can I say this in an MLS description?"
- "What do I need before accepting this listing file?"
- "Does this email need broker approval?"

Harriett should respond with:

- Direct answer in plain English.
- Source citations.
- Confidence and whether the source is binding law, regulator guidance, NAR ethics, or office policy.
- Next action, such as "send to Wilson for approval" or "add missing RECAD form to checklist."

## Implementation Plan

Phase A, now:

- Add `docs/knowledge-source-manifest.md` or JSON manifest for authority sources.
- Write a script to ingest local PDFs/DOCX/HTML into `knowledge_sources`, `knowledge_versions`, and `knowledge_chunks`.
- Seed the first corpus: NAR Code of Ethics, AREC License Law, AREC RECAD updates, Alabama Administrative Code 790-X, Pritchett-Moore checklists.
- Add tests for source supersession, prompt-injection detection, and citation formatting.

Phase B:

- Build a broker review UI for knowledge sources.
- Add compliance retrieval to drafting flows, especially MLS descriptions, consumer-facing emails, listing/checklist review, and RECAD checks.
- Add "why did Harriett say this?" source panel.

Phase C:

- Evaluate Repliers for Tuscaloosa coverage and licensing.
- Evaluate RESO MCP once real credentials exist.
- Wrap any provider in Harriett tools with scoped permissions, audit trail, cost controls, and broker/admin configuration.

## Bottom Line

MCP adds value when it gives Harriett a well-scoped live capability, especially licensed real estate data or RESO validation. It does not replace the product's own knowledge architecture, compliance rules, approval queues, or audit trail.

For Harriett, the highest-value move is a curated, versioned compliance corpus in Supabase, with citations and broker review. The second move is licensed MLS/market data through Repliers or RESO-backed providers. The open-source real estate MCPs are useful references, not the foundation.
