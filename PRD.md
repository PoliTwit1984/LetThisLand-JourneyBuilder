# CSPod Journey Builder — Product Requirements Document

**Version:** 1.6
**Author:** Joe Wilson, Director of CS — Rapsodo
**Date:** February 27, 2026
**Status:** v1.6 Shipped (Analysis Fix + AI Journey Analysis + Manual Save/Preview)
**Architecture doc:** `ARCHITECTURE.md`

---

## 1. Problem Statement

Rapsodo's Customer Success team builds multi-channel lifecycle journeys manually. The current workflow:

1. Megan writes a brief describing audience, goal, and timeline
2. She drafts copy for each touchpoint across email, push, and in-app — one at a time
3. She decides channel sequencing and conditions based on intuition
4. She creates each template in Iterable individually
5. She builds the journey canvas node by node
6. She configures campaigns, links templates, sets conditions

A 20-touchpoint journey takes **2-3 full days** of work. Channel selection is gut-feel, not data-driven. Copy quality varies. There's no way to preview the full journey before building it in Iterable.

**Journey Builder solves this in under 60 seconds.** Megan describes what she wants in plain English. Claude Opus 4.6 generates the complete journey — every touchpoint, channel decision, all copy, branching conditions — in one shot. She reviews, edits, and exports ready-to-import assets for Iterable.

---

## 2. Users

### Primary: Megan (Senior Manager, Customer Lifecycle Strategy)

Megan owns lifecycle execution. She knows the customer segments and business goals but spends too much time on the mechanical work of template creation and channel planning. She needs:

- Fast journey generation from a brief
- Data-backed channel selection (not guessing)
- Editable touchpoints with live preview
- Exportable assets she can import into Iterable manually
- A wiring guide so she knows exactly how to build the journey in Iterable's canvas
- Reference guides for email, push, and in-app design best practices

### Secondary: Joe (Director of CS)

Joe reviews journey strategy, validates channel mix against engagement data, and ensures journeys align with the broader lifecycle framework. He needs:

- Visibility into AI reasoning for each touchpoint
- Data-driven channel ratios (not arbitrary)
- The ability to generate test journeys quickly for strategic planning

---

## 3. Product Overview

Journey Builder is a **local-first web application** that uses AI to generate complete multi-channel customer lifecycle journeys for Rapsodo Golf's MLM2PRO launch monitor.

**Architecture:** React 19 + Express 5 + SQLite + OpenRouter (Claude Opus 4.6)
**Deployment:** Local development (localhost:3000 client, localhost:3001 server)
**Data:** All data stored locally in SQLite. No external API writes.

### What It Does

1. **Generates** — Takes a natural language brief and produces a complete journey with 10-25 touchpoints across email, push, and in-app channels
2. **Previews** — Renders each touchpoint as production-quality HTML (branded Rapsodo email, dual-platform push mockup, in-app modal/banner/fullscreen in phone frames)
3. **Edits** — Channel-specific editor with AI copy refinement on every text field, deep link pickers, character limit indicators
4. **Exports** — Produces Iterable-importable HTML files for email and in-app, push copy sheets with deep links, and a full ZIP download
5. **Guides** — Auto-generates a step-by-step wiring guide for building the journey in Iterable's canvas
6. **Documents** — Four standalone best practices reference pages for journey design, email, push, and in-app

### What It Does NOT Do

- Does NOT connect to Iterable's API
- Does NOT create, update, or delete anything in Iterable
- Does NOT send messages to customers
- Does NOT access any production systems

This is a **design tool**, not an execution tool. The green badge in the header reads: *"Design Only — No API Access."*

---

## 4. Core Features

### 4.1 Journey Generation

**Input:** Brief form with 3 quick-start presets (45-Day Trial Conversion, At-Risk Re-Engagement, Day 0-7 Onboarding) plus custom:
- Audience (free text)
- Goal (free text)
- Duration (1-8 weeks)
- Feature focus (multi-select) — Practice, Session Review, Insights, Courses, Range, Target, Combine, R-Speed, Video Export
- Lifecycle stage (dropdown) — Pre-Activation through Churned
- Additional context (optional free text)

**Output:** Complete journey with:
- Journey name and summary
- 10-25 touchpoints ordered by day/sequence
- Channel assignment per touchpoint (email, push, or inapp)
- All copy for every channel
- AI reasoning explaining each channel decision
- Trigger/branching conditions referencing real Iterable profile fields and events

**Performance:** 15-30 seconds for full journey generation via Claude Opus 4.6 (16,384 max output tokens).

### 4.2 Channel Selection Intelligence

Channel assignment is data-backed, not arbitrary:

| Channel | Engagement Rate | Role | When to Use |
|---------|----------------|------|-------------|
| Email (2-3% CTR) | Educator | Feature explanations, progress reports, weekly anchors, conversion | When user needs to understand something before acting |
| Push (8-28% CTR) | Re-engager | Dormant users only (3+ days no session) | Short prompt to come back to the app |
| InApp (25-40% interaction) | Feature discovery engine | Post-session modals, adoption prompts, contextual nudges | When user is already in the app |

**Target mix:** ~40% email, ~25% push, ~35% in-app.

**Data inputs baked into AI prompts:**
- 497 Iterable user profile fields (behavioral, mode, subscription)
- Full Mixpanel event taxonomy with volumes (1.24M Shot Hit Results → 6.3K View Session Insights)
- Server events (Play Session v2, Subscription Type Change, Complete Sign-Up)
- RCloud web portal events (Login, Watch Video, Subscription Success/Cancelation)
- Trial conversion multipliers (sessions predict at 5.4x, Range +1,177%, Courses +601%) — flagged as trial-only data
- Feature adoption sequence and magic number (6 features)
- 11 deep links for push and in-app CTAs
- Channel cadence rules and frequency caps

### 4.3 Touchpoint Editing

Each touchpoint has a channel-specific editor with manual Preview/Save workflow:

**Email fields:** Subject (40 char limit), preheader/context label (70 char limit), headline (8 words max), body, bullets (max 3), primary CTA (text + URL), secondary CTA (optional text link)

**Push fields:** Title (40 char limit), body (90 char limit), deep link (text field + quick-select chip picker for all 11 Rapsodo deep links)

**InApp fields:** Message type (modal/banner/fullscreen dropdown), title (50 char limit), body (150 char limit), button text (20 char limit), button action (deep link or URL)

**AI refinement:** Every text field has a wand icon that sends the text to Claude for on-brand copy refinement. The refiner enforces Rapsodo voice and channel-specific constraints.

**AI regeneration:** Each touchpoint has a regenerate button (RotateCcw icon) that sends the touchpoint back to Claude for a complete rewrite. An optional instruction textarea lets the user guide the regeneration (e.g., "make it more urgent" or "switch to push"). The regenerated touchpoint is auto-saved to DB.

**A/B variant generation:** Every text field has a Split icon that generates 3 alternative versions of that text via Claude, respecting channel-specific character limits. User picks a variant or dismisses.

**Touchpoint reorder:** Up/down chevron buttons swap adjacent touchpoints by sequence. An inline day editor lets the user change the touchpoint's day. Changes are persisted via batch API.

### 4.4 Node-Based Visual Canvas

The journey view has two modes toggled via a toolbar:

**Canvas mode (default):** A node-based visual flowchart powered by React Flow (`@xyflow/react`). Touchpoints are auto-laid out vertically as connected nodes:
- **Entry node** — Green circle, "Journey Start"
- **Wait node** — Gray pill inserted between touchpoints with day gaps, "Wait N days"
- **Send node** — Channel-colored card showing touchpoint name + day. Click to select for editing/preview.
- **Decision node** — Amber card inserted when a touchpoint's condition differs from the previous, showing the condition text
- **Exit node** — Red circle, "Journey End"

Controls: zoom, fit view, minimap with channel-colored nodes. Dark theme matching the app.

**List mode:** Vertical timeline of all touchpoints grouped by week (the original v1 view).

Both modes share the same selection behavior — clicking a touchpoint updates the editor and preview panels.

### 4.5 Journey Lint / Scoring

A toggle button in the journey action bar opens a 320px lint panel overlaying the right side. The lint engine runs client-side on every touchpoint change (via `useMemo`) and scores the journey against PRD rules:

**Rules checked:**
- First touchpoint must be email
- Last touchpoint must be email
- At least 2 different channels used
- Email ratio between 30-70%
- No emails less than 3 days apart
- No push less than 2 days apart
- No same-day email + push + inapp overload
- Push/inapp touchpoints should have deep links
- Touchpoints should span the full journey duration (no clustering)
- Copy character limits enforced per channel (email subject/preheader, push title/body, inapp title/body/buttonText)

**Scoring:** 100 minus weighted deductions (error = -10, warning = -5, info = -1), minimum 0. Color-coded: green (80+), amber (50-79), red (<50).

**Interaction:** Click any issue to jump to that touchpoint. Collapsible "Passed checks" section shows what's good.

**Auto-fix:** Each fixable issue gets a Fix button. Two fix types:

- **Auto-fix (green, instant):** No API call. Cadence violations → bumps the later touchpoint's day forward (3-day min for email, 2-day for push). Same-day overload → moves push to next day. Missing deep links → sets `rapsodo://practice` as default. Duration clustering → redistributes touchpoints evenly across the journey span. "Fix all" button runs an iterative loop — re-lints fresh between each fix so each correction is computed against the latest state.

- **AI fix (purple, ~3s):** Hits Claude via API. Copy over character limit → calls refine-copy to shorten to the limit. First/last touchpoint wrong channel → regenerates the touchpoint as email via regenerate-touchpoint with channel conversion instruction.

All fixes persist to DB immediately. Lint score and issue list update in real-time after each fix.

### 4.6 Handlebars Live Preview

The preview panel detects `{{field}}` merge tags in touchpoint content (regex scan of JSON). When tags are found:
- A "tags" button appears showing the count of detected tags
- Expanding it reveals a sample data panel with input fields for each tag
- "Fill defaults" pre-populates with realistic example values (e.g., firstName → "Mike", mlm2numSessions → "47")
- The preview iframe re-renders with server-side `{{field}}` → value substitution

7 common Rapsodo merge tags are pre-mapped with labels and example values.

### 4.7 Journey Clone

Each journey in the sidebar has a clone button (Copy icon, visible on hover). Clicking it:
1. Deep copies the journey record with a new UUID and " (Copy)" appended to the name
2. Deep copies all touchpoints with new UUIDs, preserving sequence, day, channel, content, and conditions
3. Opens the cloned journey for editing
4. Refreshes the journey list

### 4.8 Bulk Copy Table

A "Copy Table" button in the journey action bar opens a full-screen modal showing all touchpoints in a structured table:
- Columns: #, Day, Channel, Name, Subject/Title, Headline/Body, CTA/Link, Condition, KPI Targets
- Channel-colored text (blue email, purple push, green inapp)
- Two export buttons: "Copy Markdown" (pipe-delimited table) and "Copy TSV" (tab-separated, pastes into spreadsheets)
- Uses `navigator.clipboard.writeText()` with visual feedback

### 4.13 KPI Targets

Each touchpoint has a collapsible "KPI Targets" section in the editor with channel-specific metric fields:

| Channel | Available KPI Fields |
|---------|---------------------|
| Email | Target Open Rate (%), Target CTR (%) |
| Push | Target Tap Rate (%) |
| InApp | Target Interaction Rate (%) |
| All | Custom KPI (free text, e.g., "50% feature adoption by day 7") |

**Storage:** KPIs are stored in the touchpoint's `content` JSON under a `kpis` key. No schema change required.

**Exports:** KPI targets appear in:
- Copy Table (dedicated column in table, TSV, and Markdown exports)
- Wiring Guide (shown on template cards and in the campaign table)

**Not connected to Mixpanel.** This is a design-time target-setting feature. Megan sets what she expects each touchpoint to achieve. Actual tracking happens in Mixpanel/Iterable after the journey is built. Read-only Mixpanel integration to compare actuals vs targets is a v2 feature.

### 4.14 AI Journey Analysis

An "Analyze" button in the journey action bar sends the entire journey to Claude for a deep evaluation against three best-practice frameworks. Returns a structured Good/Bad/Ugly assessment.

**Evaluation Frameworks:**

1. **Lifecycle Manager Best Practices** — Welcome sequence structure, funnel progression (Awareness → Activation → Engagement → Conversion), re-engagement timing (3-day/5-day/14-day dormancy tiers), churn prevention signals, channel orchestration order
2. **Iterable Best Practices** — Multi-channel orchestration, personalization depth (merge tag coverage), template diversity (vary inapp types), A/B testing opportunities, send-time optimization
3. **Rapsodo-Specific Data** — Feature adoption order, conversion multipliers, magic number (6 features), session-based targeting, copy rules, deep link requirements

**Scoring (weighted):**
- Goal Alignment: 25%
- Channel Strategy: 20%
- Cadence & Timing: 15%
- Copy Quality: 15%
- Feature Progression: 15%
- Personalization: 10%

**Output:** Structured analysis panel (380px, right side) with:
- Overall score badge (green/amber/red)
- Critical Problems (the "ugly") — expanded by default
- Issues (the "bad")
- Strengths (the "good")
- 5 dimension scores with progress bars and findings
- Prioritized recommendations (high/medium/low)
- Clickable touchpoint references that highlight in the canvas/editor

**Performance:** ~15 seconds via Claude Opus 4.6 (8,192 max output tokens). Raw response saved to `generations` table for audit.

**Mutual exclusivity:** The Analysis panel and Lint panel share the right-side slot — toggling one closes the other.

### 4.16 Analysis Fix (AI-Powered Issue Resolution)

Each finding in the analysis panel that references a specific touchpoint has a **Fix** button (wrench icon). Clicking it:

1. Opens an inline comment box where the user can add optional instructions (e.g., "make it more urgent" or "switch to a banner format")
2. Submitting sends the analysis finding detail + user comment to Claude via the existing `regenerate-touchpoint` endpoint
3. Claude regenerates the touchpoint to address the specific issue while maintaining journey goals and brand voice
4. The fixed touchpoint auto-selects in the editor so the user can immediately review changes

**Where Fix buttons appear:**
- Critical Problems (the "ugly")
- Issues (the "bad")
- Dimension findings (Channel Strategy, Cadence & Timing, Copy Quality, Feature Progression)
- Recommendations — single-touchpoint recommendations show one Fix button; multi-touchpoint recommendations show a Fix button per affected touchpoint

**Loading state:** While a fix is in progress, a spinner replaces the Fix button on that touchpoint's sequence number across all sections.

**No new API endpoint.** Reuses `POST /api/ai/regenerate-touchpoint` with the analysis context prepended to the instruction.

### 4.15 Manual Save/Preview Workflow

The touchpoint editor uses a manual save workflow instead of auto-save:
- Typing updates local state only — no API calls, no lag
- **Preview** button (cyan, appears when edits are unsaved) pushes changes to the preview pane without saving to DB
- **Save** button (green) persists to DB and reconciles with server-sanitized content
- Both buttons disappear once saved (clean state)
- Preview panel also has a manual refresh icon in the toolbar

### 4.9 Channel Previews

Each channel renders as production-quality HTML:

- **Email** — Full Rapsodo-branded HTML in iframe. Black header with logo + sport nav, red accent line, off-white (#F8F9FA) card body, headline, paragraphs, bullets, bulletproof CTA button (VML for Outlook), branded footer. Dark mode CSS support. Mobile responsive (full-width CTA, fluid tables).

- **Push** — Side-by-side **iOS Lock Screen + Android Notification Shade** mockups in dark phone frames. Platform-specific fonts (SF Pro / Roboto), platform-specific truncation preview (Android clips tighter), contextual icon per feature, character count indicators (green/yellow/red), deep link display with missing-link warning.

- **InApp** — Phone frame mockup (375px) with three format variants:
  - **Modal** (~35% interaction): centered card on 60% scrim, contextual SVG icon per feature, Barlow font, 22px/800 headline, pill CTA with red glow, circle X dismiss
  - **Banner** (~12.5%): floating card at top, icon + title + body + pill CTA, wrapping text
  - **Fullscreen** (rare): dark (#111113) background, glowing icon, 28px headline, large pill CTA
  - All formats have Iterable-export variants (clean HTML for Side-by-Side editor)

### 4.10 Asset Export

Three export mechanisms:

1. **Export Assets page** (`/api/export/:journeyId/all`) — Single HTML page with all assets organized by channel. Email HTML download buttons. InApp HTML with copy-to-clipboard and view source. Push copy sheet table with deep links. Campaign settings reference.

2. **Download All ZIP** (`/api/export/:journeyId/zip`) — Structured ZIP file:
   - `emails/` — HTML files named `{ABBREV}_W{week}_{Purpose}_Email.html`
   - `inapp/` — HTML files for Iterable Side-by-Side editor
   - `push/` — CSV copy sheet with title, body, deep link, condition
   - `README.md` — Journey summary, file structure, campaign settings, message type IDs

3. **Individual downloads** — Per-touchpoint email HTML and in-app HTML endpoints

### 4.11 Wiring Guide

Auto-generated HTML document (`/api/wiring-guide/:journeyId`) for building the journey in Iterable:

1. **Templates** — Every template listed with full copy, organized by week, color-coded by channel
2. **Campaign Table** — Naming convention, channel type, message type IDs, folder assignment
3. **Canvas Build Order** — Step-by-step instructions for journey canvas: entry trigger, node sequence, wait durations, decision splits
4. **Testing Checklist** — Pre-launch verification steps

### 4.12 Design Reference Guides

Four standalone reference pages linked from the app header:

| Page | URL | Coverage |
|------|-----|---------|
| Best Practices | `/public/best-practices.html` | Journey design, lifecycle stages, channel orchestration |
| Email Design | `/public/email-design-guide.html` | Layout, typography, CTA (bulletproof buttons), subject lines, preheader, dark mode, mobile, benchmarks, Iterable implementation |
| Push Design | `/public/push-design-guide.html` | iOS/Android anatomy, character limits, copy patterns, anti-patterns, deep links, timing, Iterable template fields |
| In-App Design | `/public/inapp-design-guide.html` | Modal/banner/fullscreen specs, icon system, copy constraints, before/after comparison, timing rules |

Each guide is self-contained HTML (dark theme, Tailwind CDN, Google Fonts) with sidebar navigation, live rendered examples, and code snippets.

---

## 5. Rapsodo Product Context

Journey Builder is purpose-built for the **Rapsodo MLM2PRO** golf launch monitor:

- **Hardware:** $699, dual camera + Doppler radar, tracks 15 metrics
- **Software:** $199/year (or $329/2yr, $599 lifetime) subscription for premium features
- **Trial:** 45 days from hardware registration, full feature access
- **9 Modes:** Practice, Session Review, Session Insights, Courses (30K+ virtual courses), Range, Target, Combine, R-Speed, Video Export
- **Feature Adoption Sequence:** Practice → Session Review → Insights → Courses → Range → Target
- **Magic Number:** 6 features explored predicts conversion
- **Conversion Data (trial only):** Sessions predict conversion at 5.4x. Range Mode +1,177%. Courses +601%. Target +686%.

---

## 6. Constraints

1. **No API writes** — Designs journeys only. Megan builds in Iterable manually using the wiring guide and exported assets.
2. **No SMS** — Rapsodo has no SMS integration. SMS is excluded from all prompts and output.
3. **Trial data caveat** — Conversion multipliers are from trial users only. The AI is instructed not to cite them as general engagement facts for paid subscribers.
4. **No real course names** — Rapsodo cannot reference real golf course names without licensing.
5. **Single user** — No auth, no multi-tenancy. This is Megan's tool.
6. **Local only** — SQLite database, localhost deployment. No cloud hosting.

---

## 7. Success Criteria

1. Megan can generate a complete 20-touchpoint journey in under 60 seconds
2. Channel mix reflects data-driven ratios (~40% email, ~25% push, ~35% inapp)
3. Email templates render correctly when imported into Iterable (dark mode, mobile, Outlook)
4. InApp HTML works in Iterable's Side-by-Side editor with iterable://dismiss links
5. Push copy sheet includes deep links for every notification
6. Wiring guide is detailed enough for Megan to build the journey without asking questions
7. AI copy follows Rapsodo brand voice and channel-specific constraints
8. Every touchpoint has clear AI reasoning for channel selection
9. Design reference guides give Megan self-serve answers to "what are best practices for X?"
10. Lint score catches cadence violations, missing deep links, and channel imbalance before export
11. Canvas view shows journey flow with wait periods and decision branches visually
12. Touchpoint regeneration allows iterating on individual touchpoints without regenerating the whole journey
13. A/B variants provide quick alternative copy options for testing
14. Clone lets Megan duplicate a journey as a starting point for variations
15. Copy table gives a shareable overview of all touchpoints for stakeholder review
16. KPI targets per touchpoint give Megan measurable success criteria before building in Iterable
17. AI analysis evaluates journey against lifecycle, Iterable, and Rapsodo best practices with actionable recommendations
18. Manual Preview/Save workflow lets users type freely without auto-save lag
19. Analysis Fix buttons let users resolve individual findings with optional instructions, directly from the analysis panel

---

## 8. v2 Roadmap

All originally planned v2 features (node-based canvas, touchpoint regeneration, AI analysis, analysis-driven fixes) have been shipped in v1.6. Potential v2 additions:

- **Mixpanel KPI dashboard** — Read-only Mixpanel integration to pull actual metrics and compare against per-touchpoint KPI targets. Actuals vs targets display in the lint panel and wiring guide.
- **Drag-and-drop reorder** on canvas — currently uses up/down buttons
- **Journey comparison** — side-by-side two journeys to diff touchpoints
- **Template library** — save and reuse individual touchpoint templates across journeys
- **Batch regeneration** — regenerate all touchpoints matching a filter (e.g., all push notifications)
- **Journey analytics mock** — simulated funnel visualization showing expected drop-off per touchpoint
- **Collaborative notes** — per-touchpoint comments/annotations for team review
