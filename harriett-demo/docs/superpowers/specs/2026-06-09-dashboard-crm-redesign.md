# Dashboard CRM Redesign

**Date:** 2026-06-09  
**Status:** Approved — ready for implementation  
**File:** `app/dashboard/page.tsx`

## Problem

Current dashboard stacks all sections vertically. Content falls below fold immediately. No way to navigate between sections without scrolling. Feels like a static page, not a tool.

## Approved Design: V2 — Left Rail + Bento Stats + Table + Sidebar

Three-column layout replaces single-column scroll. Applies to all three roles (broker, agent, coordinator).

```
┌──────────┬────────────────────────┬──────────────┐
│ Left     │ Main (tab-switched)    │ Right        │
│ Rail     │                        │ Sidebar      │
│ ~110px   │ flex-1                 │ ~200px       │
│          │ [stat tiles]           │ (always      │
│ nav      │ [content area]         │  visible)    │
│ items    │                        │              │
│          │                        │              │
│ [CTA]    │                        │              │
└──────────┴────────────────────────┴──────────────┘
```

Viewport height locked (`h-[calc(100dvh-52px)]`, overflow hidden on columns). No page scroll — content scrolls only inside the main panel and sidebar.

---

## Shell Components (shared across all roles)

### `DashShell`
Wrapper: `display: grid; grid-template-columns: 110px 1fr 200px`. Height: `calc(100dvh - nav-height)`. Overflow: hidden.

### `LeftRail`
Props: `items: NavItem[], ctas: CtaItem[], activeSection: string, onSelect: (s) => void`

- Nav items: label, section key, optional sub-label (e.g. "3 active")
- Active item: left `2px solid var(--crimson)` border, `#F5F0E8` background
- CTA buttons at bottom (primary = ink fill, secondary = outline)
- Scrolls independently if items overflow

### `StatTiles`
Props: `tiles: { value: string, label: string, variant: 'neutral' | 'urgent' | 'good' }[]`

3-up grid. Always rendered above the content area in Overview section.
- `neutral`: cream bg, ink text
- `urgent`: `#FEF2F2` bg, crimson text
- `good`: `#F0FDF4` bg, green text

### `DealTable`
Props: `deals: Deal[]`

Compact table. Columns: Address | Status | Close | chevron.

Row expand (toggle chevron):
- Inline expansion below row, dashed top border
- Shows: price + loan type, buyer name, urgent flags (crimson), quick actions ("Open deal", "Checklist")

### `RightSidebar`
Role-specific panel. Always visible. Independent scroll.

---

## Role Configurations

### Agent (Jerrod)

**Left rail sections:** Overview, Deals, Pre-Listing, Activity, Vendors  
**Sub-labels:** Deals shows count, Pre-Listing shows appointment count  
**CTAs:** `+ Listing` (primary), `Build CMA` (secondary)

| Section | Center content |
|---------|----------------|
| Overview | StatTiles (Active Deals, Urgent Flags, Next Close) + DealTable |
| Deals | DealTable (all agent deals) |
| Pre-Listing | Pre-listing pipeline rows with CMA link/button |
| Activity | Full Harriett activity feed |
| Vendors | Vendor list with Harriett outreach button |

**Right sidebar:** My To-Dos (crimson urgent styling) + Harriett Activity (last 3 items)

### Broker (Wilson)

**Left rail sections:** Overview, All Deals, Pre-Listing, Approval Queue, Activity  
**Sub-labels:** Approval Queue shows pending count (pulsing if > 0)  
**CTAs:** `+ Listing` (primary), `Approve all` (secondary, only when queue > 0)

| Section | Center content |
|---------|----------------|
| Overview | StatTiles (Active Deals, Pending Approvals, Urgent Flags) + DealTable (all deals, all agents) |
| All Deals | DealTable with agent column added |
| Pre-Listing | All agents' pre-listing pipeline |
| Approval Queue | ApprovalCard list (existing component) |
| Activity | Full Harriett activity feed |

**Right sidebar:** Approval Queue count + To-Dos + Recent flags

### Coordinator (Alyssa)

**Left rail sections:** Overview, Tasks, Active Files, Activity  
**Sub-labels:** Tasks shows open count, urgent count  
**CTAs:** none (coordinator doesn't initiate deals)

| Section | Center content |
|---------|----------------|
| Overview | StatTiles (Open Tasks, Urgent, Active Files) + urgent task list |
| Tasks | Full task list — "Needs Attention Now" + "This Week" groups |
| Active Files | Deal list with folder label color, MLS status, postcard status |
| Activity | Full Harriett activity feed |

**Right sidebar:** Urgent task count + Quick file status (MLS pending count, postcards pending)

---

## Implementation Plan

### What changes in `app/dashboard/page.tsx`

1. Add `DashShell`, `LeftRail`, `StatTiles`, `DealTable` (new) components
2. Add `RightSidebar` variants per role
3. Replace `BrokerView`, `AgentView`, `CoordinatorView` bodies with the shell + role config
4. Add `activeSection` state, default `"overview"` for all roles
5. DealTable replaces the current `DealCard` grid — `DealCard` component removed
6. Lock viewport height: outer wrapper gets `h-[calc(100dvh-52px)] overflow-hidden`; left rail, center, and sidebar each get `overflow-y-auto`

### What stays unchanged

- `DashNav` — no changes
- `ApprovalCard` — reused in broker Approval Queue section
- `CoordTaskCard` — reused in coordinator Tasks section  
- `VendorRow` — reused in agent Vendors section
- `TodoWidget` — absorbed into RightSidebar (inline, not a separate component)
- All demo data (`DEALS`, `ACTIVITY`, `TODOS`, etc.) — no changes

### `DealTable` expand behavior

```
[collapsed row]
  Address | Status badge | Close date | ▼

[expanded row — same row + inline panel below]
  Address | Status badge | Close date | ▲
  ┌─────────────────────────────────────────┐
  │ $208,000 · FHA    Buyer: Fields         │
  │ ⚠ Lead paint disclosure                 │
  │ ⚠ Loan type changed                     │
  │ [Open deal]  [Checklist]                │
  └─────────────────────────────────────────┘
```

State: `expandedDealId: string | null`. Clicking row toggles. Only one row open at a time.

---

## Constraints

- No new routes — all changes inside `app/dashboard/page.tsx`
- No data model changes — all demo data stays as-is
- No new dependencies
- TypeScript throughout, no `any`
- Brand palette unchanged (`var(--ink)`, `var(--crimson)`, `var(--cream)`, etc.)
