# CSPod Journey Builder — Architecture & Developer Guide

**Version:** 1.5
**Last updated:** February 27, 2026
**PRD:** `PRD.md`

---

## Quick Start

```bash
# Prerequisites: Node.js 20+, npm
npm install
cp .env.local.example .env.local   # Add your OPENROUTER_API_KEY
npm run dev                        # Starts client :3000 + server :3001
```

Open `http://localhost:3000`. The Vite dev server proxies `/api` and `/public` to Express on `:3001`.

---

## What This App Does

An AI-powered tool that generates complete multi-channel customer lifecycle journeys for Rapsodo Golf's MLM2PRO launch monitor. User describes a journey in plain English → Claude Opus 4.6 generates all touchpoints (email, push, in-app) with copy, conditions, and channel reasoning → user reviews/edits → exports assets for manual Iterable import.

**Critical constraint: NO Iterable API access.** This is a design-only tool. The green header badge says "Design Only — No API Access." Never add API writes.

---

## Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | React 19 + TypeScript | Single-page app, Tailwind via CDN |
| Build | Vite 6 | Dev: client :3000, proxy to :3001. Prod: `vite build` → `dist/` |
| Backend | Express 5 + TypeScript | `tsx watch` for dev, `tsx` for prod |
| Database | SQLite (better-sqlite3) | WAL mode, single file at `data/app.db` |
| AI | OpenRouter → `anthropic/claude-opus-4` | 16,384 max output tokens for journey generation |
| Icons | Lucide React | Frontend icons |
| Canvas | @xyflow/react 12+ | Node-based visual journey canvas |
| IDs | UUID v4 | All primary keys |
| ZIP | archiver | For bulk export |

### Key Dependencies

```
react 19, react-dom 19, express 5, better-sqlite3, dotenv, cors, uuid, archiver, lucide-react, @xyflow/react
Dev: vite, @vitejs/plugin-react, tsx, concurrently, typescript 5.8
```

---

## Project Structure

```
journey-builder/
├── index.html                     Vite entry point (loads Tailwind CDN)
├── types.ts                       All TypeScript interfaces (shared client+server)
├── vite.config.ts                 Vite: proxy /api + /public → :3001
├── .env.local                     OPENROUTER_API_KEY (not committed)
│
├── server/                        Express backend
│   ├── index.ts                   Express app, CORS, route mounting, static /public
│   ├── db.ts                      SQLite schema, CRUD functions, WAL mode
│   ├── claude.ts                  OpenRouter client: chatCompletion, cleanJsonResponse, generateVariants, analyzeJourney
│   └── routes/
│       ├── journeys.ts            Journey CRUD (GET/POST/PUT/DELETE)
│       ├── touchpoints.ts         Touchpoint CRUD (GET/PUT/DELETE)
│       ├── ai.ts                  POST generate-journey, regenerate-touchpoint, refine-copy, generate-variants, analyze-journey
│       ├── preview.ts             GET /preview/:id → rendered HTML per channel
│       ├── wiringGuide.ts         GET /wiring-guide/:id → Iterable build instructions
│       └── export.ts              GET email/inapp/all/zip export endpoints
│
├── services/                      Shared logic (imported by server)
│   ├── promptDefaults.ts          AI system prompts (~350 lines). Three prompts:
│   │                              journeyGenerator, touchpointRegenerator, copyRefiner
│   └── rapsodoContext.ts          Product data: Iterable fields, events, deep links, URLs,
│                                  channel IDs, folder ID, lifecycle stages
│
├── utils/                         HTML generators (imported by server routes)
│   ├── emailGenerator.ts          Rapsodo-branded email: dark mode, bulletproof CTAs,
│   │                              mobile responsive, VML for Outlook
│   ├── pushGenerator.ts           Dual iOS+Android mockup: char counts, deep link display,
│   │                              contextual icons, platform truncation
│   ├── inAppGenerator.ts          Modal/banner/fullscreen: contextual icons, Barlow font,
│   │                              preview + Iterable-export variants
│   └── smsGenerator.ts            iMessage bubble mockup (SMS channel disabled)
│
├── src/                           React frontend
│   ├── index.tsx                  React entry, renders <App />
│   ├── App.tsx                    Main layout: sidebar + editor + canvas/list + preview
│   ├── services/
│   │   ├── api.ts                 Fetch wrappers for all API endpoints
│   │   ├── journeyLint.ts        Client-side lint/scoring engine (10 rules, pure function)
│   │   └── touchpointGraph.ts    Auto-layout: flat touchpoints → React Flow nodes + edges
│   └── components/
│       ├── Header.tsx             App header: logo, 4 design guide links, status badge
│       ├── BriefForm.tsx          Journey brief form with 3 quick-start presets
│       ├── JourneyList.tsx        Saved journeys sidebar with clone + delete
│       ├── JourneyTimeline.tsx    Vertical timeline grouped by week, click to select
│       ├── JourneyCanvas.tsx      React Flow wrapper: minimap, controls, dark theme
│       ├── JourneyLintPanel.tsx   Lint results: score badge, grouped issues, Fix/AI Fix buttons, Fix All
│       ├── JourneyAnalysisPanel.tsx AI analysis: Good/Bad/Ugly, dimension scores, recommendations, per-finding Fix buttons
│       ├── TouchpointEditor.tsx   Channel editor: AI refine/regen/variants, reorder, day edit, KPI targets
│       ├── TouchpointPreview.tsx  Preview with Handlebars merge tag substitution
│       ├── CopyTableModal.tsx     Bulk copy table: markdown + TSV export
│       ├── ChannelBadge.tsx       Color-coded channel pill (blue/purple/green)
│       └── canvas/                Custom React Flow node components
│           ├── EntryNode.tsx      Green circle — "Journey Start"
│           ├── WaitNode.tsx       Gray pill — "Wait N days"
│           ├── SendNode.tsx       Channel-colored card — touchpoint name + day
│           ├── DecisionNode.tsx   Amber card — condition branch
│           └── ExitNode.tsx       Red circle — "Journey End"
│
├── public/                        Static HTML reference pages (served via /public/)
│   ├── best-practices.html        Journey design + channel orchestration guide
│   ├── email-design-guide.html    Email layout, dark mode, bulletproof buttons, benchmarks
│   ├── push-design-guide.html     iOS/Android anatomy, char limits, timing, deep links
│   └── inapp-design-guide.html    Modal/banner/fullscreen specs, icon system, copy rules
│
├── data/
│   └── app.db                     SQLite database (auto-created on first run)
│
├── PRD.md                         Product requirements document
├── ARCHITECTURE.md                This file
├── email-design-research.md       Email best practices research (source for guide)
├── inappbestpractices.md          In-app best practices research (source for guide)
└── pushbestpractices.md           Push best practices research (source for guide)
```

---

## Database Schema

4 tables in SQLite with WAL mode. All IDs are UUID v4 strings.

### `journeys`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT | AI-generated journey name |
| brief | TEXT | Original user prompt sent to AI |
| audience | TEXT | Target audience description |
| goal | TEXT | Journey goal |
| duration_weeks | INTEGER | 1-8 weeks |
| feature_focus | TEXT | Comma-separated feature names (nullable) |
| lifecycle_stage | TEXT | Lifecycle stage (nullable) |
| touchpoint_count | INTEGER | Cached count, updated on generation |
| status | TEXT | `draft` or `archived` |
| created_at | DATETIME | Auto |
| updated_at | DATETIME | Auto |

### `touchpoints`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| journey_id | TEXT FK | → journeys(id) ON DELETE CASCADE |
| sequence | INTEGER | Display order (1-based) |
| day | INTEGER | Day in journey (0-based) |
| channel | TEXT | `email`, `push`, `inapp`, or `sms` |
| name | TEXT | Touchpoint name ("Welcome Email", etc.) |
| condition | TEXT | Trigger condition (nullable) |
| content | TEXT | **JSON string** — channel-specific content object |
| ai_reasoning | TEXT | Why AI chose this channel (nullable) |
| created_at | DATETIME | Auto |
| updated_at | DATETIME | Auto |

The `content` column is a JSON string. Structure depends on `channel`:

**Email:** `{ subject, preheader, headline, body, bullets[], primaryCtaText, primaryCtaUrl, secondaryCtaText?, secondaryCtaUrl?, kpis? }`

**Push:** `{ title, body, deepLink?, kpis? }`

**InApp:** `{ messageType: "modal"|"banner"|"fullscreen", title, body, buttonText, buttonAction, kpis? }`

**KPIs (all channels):** `{ kpis?: { openRate?: number, ctr?: number, tapRate?: number, interactionRate?: number, custom?: string } }` — channel-appropriate fields only. Stored in content JSON, no schema change.

### `generations`
Audit trail. Every AI generation is stored raw.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| journey_id | TEXT FK | → journeys(id) ON DELETE CASCADE |
| raw_response | TEXT | Full AI response text |
| model | TEXT | Model ID used |
| created_at | DATETIME | Auto |

### `prompts`
Editable system prompts. Defaults live in code; DB overrides take precedence.

| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PK | `journeyGenerator`, `touchpointRegenerator`, or `copyRefiner` |
| content | TEXT | Full prompt text |
| updated_at | DATETIME | Auto |

---

## API Endpoints

All endpoints are under `/api`. Server runs on `:3001`, Vite proxies from `:3000`.

### Journeys
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/journeys` | List all (summary: id, name, audience, goal, count, status) |
| GET | `/api/journeys/:id` | Get journey with all touchpoints (content parsed from JSON) |
| POST | `/api/journeys/:id/clone` | Deep copy journey + all touchpoints with new UUIDs |
| DELETE | `/api/journeys/:id` | Delete journey + cascade touchpoints + generations |

### Touchpoints
| Method | Path | Purpose |
|--------|------|---------|
| PUT | `/api/touchpoints/:id` | Update touchpoint (content, name, channel, day, etc.) |
| POST | `/api/touchpoints/reorder` | Atomic batch update sequence/day in a DB transaction. Body: `{ items: [{id, sequence, day}] }`. Validates per-item, rolls back all on failure. |
| DELETE | `/api/touchpoints/:id` | Delete single touchpoint |

### AI
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ai/generate-journey` | Brief → full journey. Body: `{ audience, goal, durationWeeks, featureFocus?, lifecycleStage?, additionalContext? }` |
| POST | `/api/ai/regenerate-touchpoint` | Regenerate one touchpoint. Body: `{ touchpointId, journeyId, instruction? }`. Auto-saves to DB after validation (channel enforcement, URL sanitization). |
| POST | `/api/ai/refine-copy` | Polish text field. Body: `{ text, field, channel }` → `{ refined }` |
| POST | `/api/ai/generate-variants` | A/B variants. Body: `{ text, field, channel, count? }` → `{ variants: string[] }` |
| POST | `/api/ai/analyze-journey` | AI evaluation. Body: `{ journeyId }` → `JourneyAnalysis` (scores, findings, recommendations). Saved to generations table. |

### Preview
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/preview/:touchpointId` | Rendered HTML for any channel. Accepts `?sampleData=JSON` for Handlebars merge tag substitution (values are HTML-escaped). |

### Export
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/export/:journeyId/all` | Full export page — all assets with download/copy buttons |
| GET | `/api/export/:journeyId/zip` | ZIP download — emails/, inapp/, push/ CSV, README.md |
| GET | `/api/export/:journeyId/email/:tpId` | Single email HTML download |
| GET | `/api/export/:journeyId/inapp/:tpId` | Single in-app HTML download |

### Other
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/wiring-guide/:journeyId` | Auto-generated Iterable build instructions HTML |
| GET | `/api/health` | `{ status: "ok", timestamp }` |

---

## AI Prompt System

### How It Works

1. `server/claude.ts` calls OpenRouter's `/v1/chat/completions` with model `anthropic/claude-opus-4`
2. System prompt is loaded from DB (`prompts` table) with fallback to `services/promptDefaults.ts`
3. For journey generation: system prompt + user brief → JSON response → parsed into touchpoints → stored in DB
4. If JSON parsing fails, a retry is sent asking the model to fix its output
5. Max tokens: 16,384 for generation, 8,192 for analysis, 2,048 for regeneration, 512 for copy refinement, 1,024 for variant generation

### The Four Prompts

**1. `journeyGenerator`** (~350 lines in `promptDefaults.ts`)

The big one. Contains:
- Role definition (Customer Lifecycle Strategist for Rapsodo Golf)
- Full MLM2PRO product context (modes, metrics, pricing, adoption sequence)
- Available data for trigger conditions (Iterable fields, app events with volumes, server events, RCloud events)
- Lifecycle stages
- URL library (app downloads, learning center, etc.) with note that app is iOS-only
- Legal constraints (no real course names)
- **Channel selection framework** — data-driven matrix mapping user states to channels with engagement benchmarks
- **Channel cadence rules** — frequency caps, same-day restrictions, the Email→InApp→Push loop
- Brand voice rules
- **Email copy rules** — 40-char subjects, 75-125 word bodies, sentence case, bulletproof CTAs
- **Push copy rules** — 30-char titles, 50-char bodies, mandatory deep links, no emoji, no first name
- **InApp copy rules** — format selection, deep link actions, behavioral triggers only
- Output JSON schema with examples for all three channels

**2. `touchpointRegenerator`** — Regenerates one touchpoint given journey context and adjacent touchpoints. Returns single touchpoint JSON.

**3. `copyRefiner`** — Polishes individual text fields. Knows Rapsodo voice and per-field constraints (subject max 40 chars, body max 150 for inapp, etc.). Returns refined text only.

**4. `variantGenerator`** (inline in `claude.ts`) — Takes a text field, its field name, and channel, then generates 3 alternative versions. Respects channel-specific character limits (email subject ≤ 40, push title ≤ 40, push body ≤ 90, inapp title ≤ 50). Returns JSON array of strings.

**5. `journeyAnalyzer`** (inline in `claude.ts`) — Evaluates a complete journey against three frameworks: lifecycle manager best practices (welcome sequence, funnel progression, re-engagement timing, churn prevention), Iterable best practices (multi-channel orchestration, personalization, template diversity, A/B testing), and Rapsodo-specific data (feature adoption order, conversion multipliers, copy rules, deep links). Weighted scoring: Goal Alignment 25%, Channel Strategy 20%, Cadence 15%, Copy 15%, Features 15%, Personalization 10%. Returns structured `JourneyAnalysis` JSON with overall score, dimension scores, strengths, issues, critical problems, and prioritized recommendations.

### Rapsodo Context Data (`services/rapsodoContext.ts`)

Exported constants used by export routes and available for prompt construction:

- `ITERABLE_USER_FIELDS` — Behavioral (sessions, shots, dates), mode (Practice, Combine, etc.), subscription fields
- `MIXPANEL_EVENTS` — 7 events with monthly volumes and property lists
- `SERVER_EVENTS` — Play Session v2, Subscription Type Change, Complete Sign-Up, Sync Session
- `RCLOUD_EVENTS` — 7 RCloud web portal events
- `LIFECYCLE_STAGES` — Pre-Activation through Churned
- `ITERABLE_CHANNEL_IDS` — Marketing email: 81836, Push: 133028, InApp: 133085
- `ITERABLE_FOLDER_ID` — 1340586
- `DEEP_LINKS` — 11 `rapsodo://` deep links
- `WEB_URLS` — 12 web URLs (learning center, premium membership, etc.)

---

## HTML Generators

Each channel has a generator in `utils/` that produces preview HTML (with phone frames) and/or Iterable-ready HTML.

### Email (`emailGenerator.ts`)

Generates a full Rapsodo-branded email template. Key design decisions:

- **Table-based layout** (not div) for Outlook compatibility
- **600px max-width** container, fluid for mobile
- **Off-white `#F8F9FA` background** instead of pure white — resists unpredictable dark mode color inversion
- **Dark mode CSS** via `@media (prefers-color-scheme: dark)` + Outlook.com `[data-ogsc]` selectors
- **Bulletproof CTA buttons** — VML `<v:roundrect>` for Outlook, CSS fallback for everything else. 6px border-radius, 48px height.
- **Mobile responsive** — `@media (max-width: 600px)` with full-width CTAs, 20px side padding, scaled headline
- **Font stack:** `Helvetica, 'Helvetica Neue', Arial, sans-serif` — no web fonts (unreliable in email)
- **Preheader** — Hidden div with `&#847;` whitespace padding to prevent email clients from pulling body text
- **Structure:** Black header (logo + sport nav) → red accent line → context label → headline → body → bullets → CTA → footer (social, address, unsubscribe)

### Push (`pushGenerator.ts`)

Generates dual-platform notification mockups:

- **iOS Lock Screen** — SF Pro fonts, glass-blur notification card, app icon, title, body, timestamp
- **Android Notification Shade** — Roboto fonts, Material-style card, small app icon, title (auto-truncated at 30 chars), body (auto-truncated at 50 chars)
- **Character count indicators** — green (safe) / yellow (risk) / red (truncated) for both title and body
- **Deep link display** — Purple tag showing the deep link URL, or red warning if none set
- **Contextual icons** — Maps deep links and content keywords to feature-specific icons (bullseye for practice, bar chart for review, etc.)
- Also exports `generatePushCopySheet()` for structured data extraction

### InApp (`inAppGenerator.ts`)

Generates phone-frame mockups with three format variants, each having a preview and an Iterable-export version:

- **Modal** — Centered white card on 60% scrim, contextual SVG icon, 22px/800 Barlow headline, 14px body, pill CTA (999px radius) with red glow shadow, circle X dismiss
- **Banner** — Floating card at top, icon + title + body + pill CTA in a row
- **Fullscreen** — Dark (#111113) background, glowing 64px icon, 28px headline, large pill CTA

Key features:
- **Barlow font** via Google Fonts `@import` (fine for in-app WebView, unlike email)
- **9 contextual SVG icons** — `pickIcon()` maps button actions and content keywords to: practice (bullseye), review (bar chart), insights (trend line), courses (flag), range (ruler), target (crosshair), combine (trophy), video (play), default (bolt)
- **Iterable-export versions** use `iterable://dismiss` for dismiss links and exclude the phone frame

---

## Frontend Architecture

### State Management

`App.tsx` manages all state with `useState`:
- `journeys` — list of saved journeys
- `currentJourney` — selected journey with touchpoints
- `selectedTpId` — currently editing touchpoint ID
- `isGenerating` — loading state during AI generation
- `rightView` — `'canvas'` or `'list'` toggle
- `showLint` — lint panel visibility
- `showAnalysis` — analysis panel visibility (mutually exclusive with lint)
- `analysisResult` — cached AI analysis result
- `isAnalyzing` — loading state during AI analysis
- `fixingSequence` — sequence number of touchpoint currently being fixed via analysis (null when idle)
- `showCopyTable` — copy table modal visibility

Computed values via `useMemo`:
- `lintResult` — recomputes lint score on every touchpoint change
- `sortedTouchpoints`, `selectedIdx` — for move up/down bounds

No external state library. State flows down as props. API calls are in `src/services/api.ts`.

### Component Flow

```
App.tsx
├── Header.tsx                    Fixed top bar
├── Left Sidebar (w-56)
│   └── JourneyList.tsx          Journey list with clone + delete
├── Left Panel (w-400)
│   ├── BriefForm.tsx            When creating new journey
│   └── [Journey View]
│       ├── Action bar           Wiring Guide / Export / ZIP / Copy Table / Lint / Analyze toggles
│       └── TouchpointEditor.tsx When touchpoint selected (edit, regen, variants, reorder)
├── Main Content (flex-1)
│   ├── View toggle toolbar      Canvas / List buttons
│   ├── JourneyCanvas.tsx        Canvas mode — React Flow node graph
│   └── JourneyTimeline.tsx      List mode — vertical timeline
├── JourneyLintPanel.tsx         320px side panel (when lint toggled on)
├── JourneyAnalysisPanel.tsx    380px side panel (when analyze toggled on, mutually exclusive with lint)
│   ├── FixButton               Inline per-finding: wrench icon → comment textarea → Apply Fix
│   │                           Calls onFix(touchpointSequence, analysisDetail, userComment)
│   │                           → App.tsx handleAnalysisFix → POST /api/ai/regenerate-touchpoint
├── Preview (w-520 canvas / flex-1 list)
│   └── TouchpointPreview.tsx    Preview with merge tag substitution
└── CopyTableModal.tsx           Full-screen modal (when Copy Table clicked)
```

Layout in canvas mode:
```
[ Sidebar 56px ] [ Editor 400px ] [ Canvas flex-1 ] [ Lint? 320px | Analyze? 380px ] [ Preview 520px ]
```

Layout in list mode:
```
[ Sidebar 56px ] [ Editor 400px ] [ Timeline flex-1 ] [ Lint? 320px | Analyze? 380px ] [ Preview flex-1 ]
```

### Preview Rendering

`TouchpointPreview.tsx` renders via iframe pointing to `/api/preview/:id`. Supports optional Handlebars merge tag substitution:
- Auto-detects `{{field}}` patterns in touchpoint content JSON
- Shows sample data input panel with 7 pre-mapped Rapsodo merge tags
- Passes `sampleData` query param to server for `{{field}}` → HTML-escaped value replacement
- Preview refreshes only on explicit action: Preview button click, Save button click, or touchpoint switch. No auto-debounce. Manual refresh icon in preview toolbar for on-demand reload.

### Manual Save/Preview

`TouchpointEditor.tsx` uses a manual save workflow (no auto-save):
1. Typing updates local state only — no API calls, no lag
2. **Preview** button (appears when content is dirty) pushes current edits to the preview pane via `onUpdate` without saving to DB
3. **Save** button persists to DB via `PUT /api/touchpoints/:id`, reconciles with server-canonical content (URLs sanitized server-side), clears dirty state
4. Both buttons disappear when content is clean (matches DB)
5. Preview pane refreshes only on explicit Preview/Save click or touchpoint switch (no debounce timer)

---

## Data Flow: Journey Generation

```
User fills BriefForm
  ↓
POST /api/ai/generate-journey { audience, goal, durationWeeks, ... }
  ↓
server/routes/ai.ts builds brief text from fields
  ↓
server/claude.ts:generateJourney()
  ├── Loads system prompt (DB or promptDefaults.ts fallback)
  ├── Sends to OpenRouter (anthropic/claude-opus-4, 16384 max tokens)
  ├── Parses JSON response (retry once on parse failure)
  └── Returns { result: JourneyGenerationResult, raw: string }
  ↓
ai.ts route handler:
  ├── Creates journey row in DB
  ├── Creates touchpoint rows (content stored as JSON string)
  ├── Creates generation row (raw AI response for audit)
  └── Returns journey with touchpoints to frontend
  ↓
App.tsx receives response
  ├── Sets currentJourney state
  ├── Refreshes journey list
  └── Timeline + first touchpoint auto-selected
```

---

## Data Flow: Export

```
User clicks "Download All" or opens Export Assets page
  ↓
GET /api/export/:journeyId/zip  (or /all for HTML page)
  ↓
export.ts route handler:
  ├── Loads journey + all touchpoints from DB
  ├── Parses content JSON for each touchpoint
  ├── For emails: generateEmailHtml(content) → HTML files
  ├── For inapp: generateInAppIterableHtml(content) → HTML files
  ├── For push: builds CSV with title, body, deepLink, condition
  ├── Generates README.md with journey summary
  └── Streams ZIP archive to response (archiver)
  ↓
Browser downloads .zip file
```

---

## Environment

### `.env.local`

```
OPENROUTER_API_KEY=sk-or-v1-...   # Required. Get from openrouter.ai
```

No other environment variables required. Database path defaults to `data/app.db`.

### Ports

| Port | Service | Notes |
|------|---------|-------|
| 3000 | Vite dev server | Proxies /api and /public to :3001 |
| 3001 | Express API server | Also serves /public static files directly |

In production (`npm run build && npm start`), Express serves both the API and the built frontend from `dist/`.

---

## Design System Reference

### Colors
| Usage | Value | Notes |
|-------|-------|-------|
| Rapsodo red | `#ce2029` | Primary accent, CTAs, icons |
| Email background | `#f8f9fa` | Off-white (dark mode safe) |
| Email outer | `#f0f0f2` | Outer table background |
| Email text | `#333333` | Body text (not pure black) |
| Email heading | `#1a1a1a` | Headlines |
| InApp headline | `#18181b` | Modal headline |
| InApp body | `#3f3f46` | Modal body text |
| Fullscreen bg | `#111113` | Dark fullscreen variant |
| Push preview bg | `#111113` | Dark phone frame |
| App UI bg | `#0f172a` | Slate-900 (Tailwind) |

### Fonts
| Context | Stack | Notes |
|---------|-------|-------|
| Email | `Helvetica, 'Helvetica Neue', Arial, sans-serif` | Email-safe only. No web fonts. |
| InApp | `Barlow, -apple-system, BlinkMacSystemFont, sans-serif` | Loaded via Google Fonts @import |
| Push (iOS) | `-apple-system, 'SF Pro Text', sans-serif` | Platform-native |
| Push (Android) | `Roboto, sans-serif` | Platform-native |
| App UI | System default (Tailwind) | No custom font loading |

### Channel Color Coding (UI)
| Channel | Color | Tailwind |
|---------|-------|---------|
| Email | Blue | `bg-blue-500/20 text-blue-400` |
| Push | Purple | `bg-purple-500/20 text-purple-400` |
| InApp | Green | `bg-emerald-500/20 text-emerald-400` |
| SMS | Amber | `bg-amber-500/20 text-amber-400` |

---

## Adding a New Channel

If you need to add a new channel (e.g., webhook, SMS):

1. Add type to `Channel` union in `types.ts`
2. Add content interface (e.g., `WebhookContent`) to `types.ts`
3. Add to `TouchpointContent` union type
4. Create generator in `utils/` (preview HTML + export format)
5. Add preview case in `server/routes/preview.ts`
6. Add editor fields in `src/components/TouchpointEditor.tsx`
7. Add export handling in `server/routes/export.ts`
8. Add channel color in `src/components/ChannelBadge.tsx`
9. Update AI prompt in `services/promptDefaults.ts` — channel rules, copy rules, output schema
10. Add channel ID to `services/rapsodoContext.ts`

---

## Modifying AI Behavior

The AI's behavior is controlled by three prompts in `services/promptDefaults.ts`. To change how journeys are generated:

1. **Channel mix** — Edit the "Channel Decision Matrix" and "Channel Ratio Target" sections in `journeyGenerator`
2. **Copy style** — Edit the "Brand Voice" and channel-specific copy rules sections
3. **Available data** — The "Available Data for Trigger Conditions" section lists all Iterable fields and events the AI can reference
4. **Output format** — The JSON schema at the bottom of `journeyGenerator` defines the structure
5. **New features** — Add to the "Modes" section and update the feature adoption sequence

Prompts can also be overridden at runtime via the `prompts` DB table (takes precedence over code defaults).

---

## Journey Lint Engine (`src/services/journeyLint.ts`)

Two exported functions:
- `lintJourney(touchpoints[])` — pure scoring, returns `{ score, issues[], passed[] }`
- `applyAutoFix(touchpoints[], issue)` — applies a single auto-fix, returns updated touchpoints array

### Rules

| Rule | Severity | Fix Type | Check |
|------|----------|----------|-------|
| first-email | warning | AI | First touchpoint (by sequence) must be email |
| last-email | warning | AI | Last touchpoint should be email |
| channel-mix | warning | — | At least 2 different channels used |
| email-ratio | info | — | Email should be 30-70% of touchpoints |
| email-cadence | error | Auto | No two emails less than 3 days apart |
| push-cadence | error | Auto | No two push less than 2 days apart |
| same-day | error | Auto | No day with email + push + inapp all at once |
| copy-limit | warning | AI | Per-field character limits: email subject (40), preheader (70), push title (40), push body (90), inapp title (50), inapp body (150), inapp buttonText (20) |
| deep-link | warning | Auto | Push/inapp should have deep link / button action set |
| duration-spread | info | Auto | Touchpoints should span the journey duration, not cluster |

### Scoring

`score = max(0, 100 - Σ(error × 10) - Σ(warning × 5) - Σ(info × 1))`

Color: green (≥ 80), amber (50-79), red (< 50).

### Auto-Fix Engine

Each `LintIssue` now carries optional `fixType` (`'auto'` or `'ai'`) and `fixDetail` (rule-specific data).

**Auto-fixes** (`applyAutoFix` in `journeyLint.ts`):
- `email-cadence` / `push-cadence` — Sets the offending touchpoint's day to `previousSameChannelDay + minGap`
- `same-day` — Moves the push touchpoint to `day + 1`
- `deep-link` — Sets `content.deepLink` (push) or `content.buttonAction` (inapp) to `rapsodo://practice`
- `duration-spread` — Redistributes all touchpoint days evenly from 0 to maxDay

**AI fixes** (handled in `App.tsx` via `handleLintFix`):
- `copy-limit` — Calls `POST /api/ai/refine-copy` with the oversized text + field + channel → replaces with shortened version
- `first-email` / `last-email` — Calls `POST /api/ai/regenerate-touchpoint` with instruction to convert to email channel

**"Fix all" button** in lint panel header delegates to `handleLintFixAll` in `App.tsx`, which runs an iterative loop: apply auto-fix → re-lint fresh → get next auto issue → repeat (max 50 iterations). This ensures each fix is computed against the latest state, not stale snapshots.

### Analysis Fix Flow

Findings in `JourneyAnalysisPanel.tsx` that reference a `touchpointId` (sequence number) get a **FixButton** component:

1. User clicks **Fix** (wrench icon) on any finding → inline textarea opens for optional instructions
2. User clicks **Apply Fix** → `onFix({ touchpointSequence, analysisDetail, userComment })` called
3. `App.tsx:handleAnalysisFix()` maps sequence → touchpoint UUID, constructs instruction combining the analysis detail + user comment
4. Calls `POST /api/ai/regenerate-touchpoint` with the instruction — reuses the existing regeneration endpoint
5. Updates touchpoint in local state, auto-selects it in editor for review
6. `fixingSequence` state tracks which touchpoint is being fixed → shows spinner on all Fix buttons for that sequence

No new API endpoint. The analysis finding context is prepended to the regeneration instruction so the AI understands what problem it's solving.

All fixes trigger optimistic UI update + DB persistence via `PUT /api/touchpoints/:id`. Lint score recomputes automatically via `useMemo` since touchpoints changed.

---

## Canvas Graph Algorithm (`src/services/touchpointGraph.ts`)

Converts flat touchpoint array → React Flow `{ nodes[], edges[] }`.

### Node Generation

1. Sort touchpoints by sequence
2. Insert **EntryNode** at top (y=0)
3. For each touchpoint:
   - If day gap from previous node > 0 (including before first touchpoint if day > 0): insert **WaitNode** ("Wait N days")
   - If condition differs from previous touchpoint and it's not the first touchpoint: insert **DecisionNode** (condition text). First touchpoint skips decision node since the entry node already implies start.
   - Insert **SendNode** (channel-colored, touchpoint name + day)
4. Insert **ExitNode** at bottom

### Layout

Vertical stack. Each node type has a fixed height:
- Entry/Exit: 60px
- Wait: 50px
- Decision: 70px
- Send: 80px

Y position = previous node Y + previous node height + gap (40px). All nodes centered at x=250. Edges connect sequentially.

### Custom Node Components (`src/components/canvas/`)

All use Handle components for React Flow connections. SendNode stores `tpId` in data — on click, the canvas propagates selection to the parent via `onNodeClick`.

---

## Known Limitations

1. **Manual preview** — Preview requires clicking "Preview" or "Save" button. No auto-refresh on keystroke.
2. **No undo** — Edits are immediately saved. No undo/redo history.
3. **No drag-and-drop reorder** — Touchpoints can be reordered via up/down buttons, but not by dragging on the canvas.
4. **Single model** — Hardcoded to `anthropic/claude-opus-4` via OpenRouter. No model selection UI.
5. **No tests** — No unit or integration tests. `npm run typecheck` provides type-level safety.
6. **SMS disabled** — SMS generator exists but the channel is excluded from AI prompts and UI presets.
7. **No Mixpanel integration** — KPI targets are design-time only. No read-only Mixpanel connection to compare actual vs target metrics (v2).
