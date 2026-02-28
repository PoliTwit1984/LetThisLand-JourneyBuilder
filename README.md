# Journey Builder

AI-powered lifecycle journey generator for Iterable. Describe a journey in plain English, get a complete multi-channel campaign (email, push, in-app) with production-ready templates, a visual canvas, and step-by-step Iterable wiring instructions — in under 60 seconds.

Built for Rapsodo Golf's Customer Success team.

## Stack

- **Frontend:** React 19, React Flow (@xyflow/react), Lucide icons
- **Backend:** Express 5, TypeScript, better-sqlite3
- **AI:** Claude Opus 4.6 via OpenRouter
- **Build:** Vite 6, tsx, concurrently

## Quick Start

```bash
# Install dependencies
npm install

# Configure API key
cp .env.local.example .env.local
# Edit .env.local with your OpenRouter API key

# Run dev (client :3000 + server :3001)
npm run dev
```

## What It Does

1. **Generate** — Enter a brief (audience, goal, duration, feature focus). Claude generates 10-25 touchpoints across email, push, and in-app with channel reasoning, branching conditions, and full copy.
2. **Preview** — Each touchpoint renders as production HTML: branded Rapsodo emails (Outlook VML, dark mode), dual-platform push mockups (iOS + Android), in-app modals/banners/fullscreen in phone frames.
3. **Edit** — Channel-specific editor with AI copy refinement on any text field, deep link picker, character limit indicators.
4. **Analyze** — AI reviews the full journey for goal alignment, channel strategy, cadence, copy quality, and feature progression. Scores each dimension and flags issues.
5. **Export** — Download Iterable-importable HTML (email + in-app), push copy sheets with deep links, and a full ZIP of all assets.
6. **Wire** — Auto-generated step-by-step guide for building the journey in Iterable's canvas (node trees, campaign configs, wait conditions).

This is a **design tool**. It does not connect to Iterable's API or send any messages.

## Project Structure

```
server/
  index.ts              Express server entry
  db.ts                 SQLite setup + queries
  claude.ts             OpenRouter / Claude integration
  validation.ts         Input validation
  routes/
    journeys.ts         CRUD for journeys
    touchpoints.ts      CRUD for touchpoints
    ai.ts               Generate, refine, analyze endpoints
    preview.ts          HTML preview rendering
    wiringGuide.ts      Iterable wiring guide generation
    export.ts           ZIP + individual asset export
src/
  App.tsx               Main app shell
  components/
    Header.tsx          Top nav + safety badge
    BriefForm.tsx       Journey brief input form
    JourneyTimeline.tsx Timeline view of touchpoints
    JourneyCanvas.tsx   React Flow visual canvas
    JourneyList.tsx     Saved journeys sidebar
    JourneyLintPanel.tsx  Client-side journey validation
    JourneyAnalysisPanel.tsx  AI analysis results display
    TouchpointEditor.tsx  Channel-specific editing
    TouchpointPreview.tsx Production HTML preview
    CopyTableModal.tsx  Tabular view of all copy
    FixChatModal.tsx    AI fix with user instructions
    ChannelBadge.tsx    Channel type indicator
    canvas/             React Flow custom nodes
services/
  promptDefaults.ts     System prompts for generation/analysis
  rapsodoContext.ts     Product context injected into prompts
utils/
  emailGenerator.ts     Rapsodo-branded email HTML builder
  pushGenerator.ts      iOS/Android push preview HTML
  inAppGenerator.ts     Modal/banner/fullscreen HTML
  smsGenerator.ts       SMS template builder
public/
  best-practices.html   Journey design best practices guide
  email-design-guide.html  Email template reference
  push-design-guide.html   Push notification reference
  inapp-design-guide.html  In-app message reference
data/
  app.db                SQLite database (auto-created)
types.ts                Shared TypeScript interfaces
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/journeys` | List all journeys |
| POST | `/api/journeys` | Create journey from brief |
| GET | `/api/journeys/:id` | Get journey with touchpoints |
| DELETE | `/api/journeys/:id` | Delete journey |
| POST | `/api/journeys/:id/clone` | Clone a journey |
| PUT | `/api/touchpoints/:id` | Update touchpoint |
| DELETE | `/api/touchpoints/:id` | Delete touchpoint |
| POST | `/api/touchpoints/reorder` | Reorder touchpoints |
| POST | `/api/ai/generate` | Generate journey via Claude |
| POST | `/api/ai/refine` | Refine copy on a single field |
| POST | `/api/ai/regenerate/:id` | Regenerate a touchpoint |
| POST | `/api/ai/analyze/:id` | AI analysis of full journey |
| GET | `/api/preview/:id` | Render touchpoint as HTML |
| GET | `/api/wiring-guide/:id` | Generate Iterable wiring guide |
| GET | `/api/export/:journeyId/:touchpointId` | Export single touchpoint |
| GET | `/api/export/:journeyId/zip` | Export full journey as ZIP |
| GET | `/api/health` | Health check |

## Scripts

```bash
npm run dev           # Run client + server concurrently
npm run dev:client    # Vite dev server only (port 3000)
npm run dev:server    # Express API only (port 3001)
npm run build         # Production build (Vite)
npm run typecheck     # TypeScript type checking
npm start             # Production server
```

## Docs

- [PRD.md](PRD.md) — Product requirements (v1.6)
- [ARCHITECTURE.md](ARCHITECTURE.md) — Technical architecture and data models
