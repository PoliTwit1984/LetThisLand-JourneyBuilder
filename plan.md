# Journey Builder v2 — Iterable Wiring (No API Access)

## What Changes

v1 generates touchpoints with content. v2 adds the full Iterable wiring layer — templates, campaigns, journey canvas with nodes/waits/splits — all designed locally. Megan gets a complete build spec she can execute in Iterable, or we push via API later when ready.

## The Iterable Object Model

```
Journey Canvas
  └── Entry Trigger (event, list, API call)
  └── Node 1: Send Email Campaign
  │     └── Campaign (name, type, list, send settings)
  │           └── Template (HTML, subject, from, message type)
  └── Node 2: Wait (3 days)
  └── Node 3: Decision Split (has user done X?)
  │     ├── YES branch
  │     │     └── Node 4: Send Push Campaign
  │     └── NO branch
  │           └── Node 5: Send Email Campaign
  └── Node 6: Wait (4 days)
  └── ...
  └── Exit Condition (14 days no login, subscription cancelled)
```

## What the AI Generates (v2 output schema)

The AI generates the full canvas — not just a flat list of touchpoints, but a **tree of nodes** with branching logic.

```json
{
  "journeyName": "Continuous Engagement — Habit Formation",
  "journeySummary": "8-week rolling habit loop for active paid subscribers",

  "entryTrigger": {
    "type": "list_membership",
    "listName": "Active Paid — 1+ session in 14 days",
    "filterCondition": "NOT in journey 'Churn Risk'"
  },

  "exitConditions": [
    { "condition": "14+ days no login", "action": "move to At-Risk journey" },
    { "condition": "subscription cancelled", "action": "exit journey" }
  ],

  "nodes": [
    {
      "id": "n1",
      "type": "send",
      "channel": "email",
      "day": 0,
      "name": "Week 1 Anchor — Why Practice Matters",
      "campaign": {
        "name": "CE_W1_Anchor_Email",
        "campaignType": "triggered",
        "messageTypeId": 81836,
        "listId": null,
        "sendSettings": { "skipDuplicate": true, "respectFrequencyCap": true }
      },
      "template": {
        "clientTemplateId": "ce_habit_w1_anchor",
        "subject": "the one thing that changes everything",
        "preheader": "WEEK 1",
        "headline": "One session changes the trajectory",
        "body": "...",
        "bullets": ["...", "...", "..."],
        "primaryCtaText": "View Learning Center",
        "primaryCtaUrl": "https://rapsodo.com/pages/golf-learning-center"
      },
      "next": "n2"
    },
    {
      "id": "n2",
      "type": "wait",
      "duration": "3 days",
      "next": "n3"
    },
    {
      "id": "n3",
      "type": "decision",
      "condition": "Play Session v2 event in last 3 days",
      "yesLabel": "Practiced",
      "noLabel": "No session",
      "yesBranch": "n4",
      "noBranch": "n5"
    },
    {
      "id": "n4",
      "type": "send",
      "channel": "inapp",
      "name": "Session Review Discovery",
      "campaign": { "..." },
      "template": { "..." },
      "next": "n6"
    },
    {
      "id": "n5",
      "type": "send",
      "channel": "push",
      "name": "Mid-Week Nudge",
      "campaign": { "..." },
      "template": { "..." },
      "next": "n6"
    },
    {
      "id": "n6",
      "type": "wait",
      "duration": "3 days",
      "next": "n7"
    }
  ]
}
```

## New Node Types

| Type | Purpose | Properties |
|------|---------|------------|
| `send` | Fire a campaign | channel, campaign config, template content |
| `wait` | Delay | duration (hours, days) |
| `decision` | Branch on condition | condition, yesBranch, noBranch |
| `exit` | End journey | reason |

## New DB Schema

```sql
-- Replaces flat touchpoints table with a node tree
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  journey_id TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,          -- "n1", "n2", etc. (AI-assigned)
  type TEXT NOT NULL,             -- send | wait | decision | exit
  day INTEGER,                    -- approximate day number (for timeline display)
  name TEXT,                      -- human-readable name
  channel TEXT,                   -- email | push | inapp | sms (send nodes only)

  -- Send node fields
  template_content TEXT,          -- JSON: channel-specific content (subject, body, etc.)
  campaign_config TEXT,           -- JSON: campaign name, type, messageTypeId, sendSettings
  ai_reasoning TEXT,              -- why this channel/timing

  -- Wait node fields
  wait_duration TEXT,             -- "3 days", "4 hours"

  -- Decision node fields
  decision_condition TEXT,        -- "Play Session v2 event in last 3 days"
  yes_label TEXT,                 -- "Practiced"
  no_label TEXT,                  -- "No session"

  -- Wiring
  next_node TEXT,                 -- next node_id (for send, wait)
  yes_branch TEXT,                -- node_id for YES (decisions)
  no_branch TEXT,                 -- node_id for NO (decisions)

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Journey-level entry/exit config
ALTER TABLE journeys ADD COLUMN entry_trigger TEXT;      -- JSON
ALTER TABLE journeys ADD COLUMN exit_conditions TEXT;     -- JSON array
```

## Visual Canvas (React)

Replace the flat timeline with a **visual flowchart canvas**:

```
[Entry: Active Paid, 1+ session]
         │
    ┌────▼────┐
    │ Email   │  Day 0: Week 1 Anchor
    │ W1 Anch │
    └────┬────┘
         │
    ┌────▼────┐
    │ Wait    │  3 days
    │ 3 days  │
    └────┬────┘
         │
    ┌────▼────┐
    │ Split   │  Session in last 3 days?
    └──┬───┬──┘
   YES │   │ NO
  ┌────▼┐ ┌▼────┐
  │InApp│ │Push │  Nudge or reward
  └──┬──┘ └──┬──┘
     └───┬───┘
    ┌────▼────┐
    │ Wait    │  3 days
    │ 3 days  │
    └────┬────┘
         │
       (Week 2...)
```

Implementation: React component with SVG or CSS grid. Each node is a card. Lines connect them. Click a send node to edit its template in the left panel.

Canvas features:
- Zoom/pan (CSS transform)
- Click send nodes → edit template content in left panel
- Click decision nodes → edit condition
- Click wait nodes → edit duration
- Hover any node → see AI reasoning
- Add/delete/reorder nodes
- Color coding: email=blue, push=purple, inapp=green, sms=amber, wait=gray, decision=yellow

## Campaign Config the AI Generates

For each send node, the AI also generates campaign-level config:

```typescript
interface CampaignConfig {
  name: string;                    // "CE_W1_Anchor_Email" — snake_case convention
  campaignType: 'triggered' | 'blast';
  messageTypeId: number;           // 81836 (marketing email), 133028 (push), etc.
  listId?: number;                 // only for blast campaigns
  sendSettings: {
    skipDuplicate: boolean;        // don't re-send if already received
    respectFrequencyCap: boolean;  // honor Iterable frequency caps
    throttlePerMinute?: number;    // rate limiting
  };
}
```

## Wiring Guide Export

Generate a Megan-readable document (HTML page) with step-by-step Iterable build instructions:

```
# Continuous Engagement — Iterable Build Guide

## Step 1: Create Templates
Create these templates in Iterable under folder "Journey Builder" (ID: 1340586):

  1. CE_W1_Anchor_Email (Marketing Email)
     - Subject: "the one thing that changes everything"
     - Copy below:
     [full HTML preview]

  2. CE_W1_Nudge_Push (Push)
     - Title: "..."
     - Body: "..."

  ...

## Step 2: Create Campaigns
Create these campaigns, each referencing the template above:

  1. Campaign: "CE_W1_Anchor_Email"
     - Type: Triggered
     - Template: CE_W1_Anchor_Email
     - Message Type: Marketing Email (81836)
     - Skip duplicate: Yes

  ...

## Step 3: Build Journey Canvas
  1. Create new Journey: "Continuous Engagement — Habit Formation"
  2. Entry: List "Active Paid — 1+ session in 14 days"
  3. Add nodes in this order:
     - Send: CE_W1_Anchor_Email
     - Wait: 3 days
     - Decision: "Play Session v2 in last 3 days"
       - YES → Send: CE_W1_Review_InApp
       - NO → Send: CE_W1_Nudge_Push
     - Wait: 3 days
     ...
  4. Exit conditions:
     - 14+ days no login → move to At-Risk
     - Subscription cancelled → exit
```

## Updated AI System Prompt (additions for v2)

Add to the system prompt:

1. **Node types** — teach the AI about send/wait/decision/exit nodes
2. **Campaign naming convention** — `{journey_abbrev}_{week}_{purpose}_{channel}` (e.g., `CE_W1_Anchor_Email`)
3. **Decision conditions** — must use available Iterable events/fields (from the event taxonomy)
4. **Wait logic** — typical patterns: 2-3 day waits between sends, shorter for push follow-ups
5. **Output schema** — tree of nodes instead of flat touchpoint array

## Build Order

1. Update DB schema (nodes table, journey entry/exit fields)
2. Update AI prompt with node-based output schema
3. Update `server/routes/ai.ts` to parse node tree
4. Build canvas React component (the big piece)
5. Update editor to handle all node types
6. Build wiring guide export (HTML generation)
7. Keep existing preview system (still renders per send node)

## What This Does NOT Do

- Does NOT connect to Iterable API
- Does NOT create templates, campaigns, or journeys in Iterable
- Does NOT read from Iterable
- All design is local — SQLite + browser only
- The wiring guide is a document Megan follows manually (for now)
