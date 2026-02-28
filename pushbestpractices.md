# Push Notification Design — Best Practices & Audit

## Current State

Our push notifications are text-only with a basic iOS mockup. Every push looks identical — same layout, same formatting, no deep links, no character counting, no platform differentiation. Functional but missing the details that drive engagement.

**What we generate today:**
- Title + body text only (no deep links, no action buttons)
- Single iOS-style preview (gray card, basic layout)
- No character limit enforcement or warnings
- No platform differentiation (iOS vs Android render differently)
- No rich media support
- Generic "Rapsodo Golf" app name with red square icon

---

## Push Notification Anatomy

### iOS (Lock Screen / Notification Center)
- **App icon:** 20x20pt (shown automatically by OS)
- **App name:** Bold, 13px, system font
- **Time:** Right-aligned, gray, "now" / "2m ago"
- **Title:** SF Pro Text, 15px, semibold. **Safe zone: 25-40 chars collapsed.** Up to ~50 chars before truncation.
- **Body:** SF Pro Text, 13px, regular. **Safe zone: 60-90 chars collapsed.** Up to ~178 chars in expanded (3-4 lines).
- **Rich media:** Thumbnail (right side) or expanded image (on long-press). Requires Notification Service Extension on client.
- **Action buttons:** Up to 4 custom actions on long-press (e.g., "Open Practice", "Dismiss")
- **Grouping:** Notifications stack by app, latest on top

### Android (Notification Shade)
- **App icon:** Small icon (monochrome, 24dp) + large icon (optional, 48dp)
- **App name:** 12sp, system font, colored by accent
- **Title:** Roboto, 14sp, medium. **Safe zone: 25-30 chars collapsed.** Truncates earlier than iOS.
- **Body:** Roboto, 14sp, regular. **Safe zone: 40-60 chars collapsed.** BigTextStyle expands to ~450 chars.
- **BigPicture:** Expanded image style (16:9 ratio, 1024x512px ideal)
- **Action buttons:** Up to 3 inline buttons
- **Channels:** Android 8+ uses notification channels — user can mute per channel

### Cross-Platform Safe Zones
| Element | iOS Safe | Android Safe | Recommended |
|---------|----------|--------------|-------------|
| Title | 40 chars | 30 chars | **30 chars** |
| Body (collapsed) | 90 chars | 50 chars | **50 chars** |
| Body (expanded) | 178 chars | 450 chars | **100 chars** |

**Key insight:** Write for Android's collapsed limit (tighter), then the full message shows beautifully on iOS. If you write for iOS limits, Android truncates it.

---

## Performance Benchmarks (2025-2026)

### Industry Averages
| Metric | All Apps | Fitness/Sports | Rapsodo Target |
|--------|----------|---------------|----------------|
| Opt-in rate | 60% iOS, 81% Android | 55% iOS | >55% |
| Open rate (direct) | 4.6% | 3.8% ("below average") | >5% |
| CTR | 1.8% | 1.5% | >3% |
| Behavioral trigger CTR | 8-15% | 8-12% | >8% |
| Broadcast CTR | 1-2% | <1% | Avoid broadcasts |

### What Drives Performance
- **Behavioral triggers** (session_end, dormancy) get **4-8x** the CTR of scheduled sends
- **Personalized content** ("You hit 47 shots yesterday") gets **2.3x** more opens than generic
- **Deep links** to specific app screens get **3.1x** more conversions than app-open
- **Time-of-day optimization:** Post-workout windows (6-8pm for golf) get highest engagement
- **First push in first week** increases 90-day retention by **71%**
- **Users who receive push in first 90 days** have **3x retention**

### Fatigue Thresholds
- **10%** of users disable notifications after receiving 1 irrelevant push per week
- **6%** uninstall after 2-3 irrelevant pushes in a week
- **Optimal frequency:** Max 1 push/week for lifecycle, max 2/week for transactional
- **Diminishing returns** start after 3rd push in a 2-week period

---

## Copy Best Practices

### Title
- **Max 30 chars** (Android-safe)
- Lead with the hook, not the brand name (OS shows app name separately)
- Use data personalization: "47 shots and counting" > "Check your progress"
- Lowercase conversational style (not Title Case or ALL CAPS)
- No exclamation marks (reads as spam on lock screen)

### Body
- **Max 50 chars** for Android-safe collapsed view
- One complete thought. One sentence.
- Action-oriented: what to do, not what happened
- Personalize with merge fields when available: `{{total_shots}}`, `{{mlm2numSessions}}`
- End with the action, not a period: "Hit a few balls today" > "It's been a while."

### What NOT to Do
- "We miss you!" — guilt-tripping, highest unsubscribe trigger
- "Don't forget to..." — condescending
- "EXCITING NEWS!" — all caps = spam
- "Hey {{firstName}}!" — first name in push is redundant (phone is personal)
- Multiple sentences — body should be scannable in 1 second
- Emoji in fitness/sports context — data shows **-4% CTR** for fitness apps (contrary to general app data showing +5-9%)

### Patterns That Work (Fitness/Sports)

| Pattern | Example | Why It Works |
|---------|---------|-------------|
| Data hook | "47 shots yesterday — ready for more?" | Personal data creates curiosity |
| Streak/momentum | "3 sessions this week. Keep the streak going." | Loss aversion (don't break streak) |
| Feature discovery | "Your Session Review is ready" | Implies content waiting for them |
| Social proof | "Range Mode users hit 12% more greens" | Data-driven peer comparison |
| Weather/context | "Perfect range weather today" | Environmental relevance |
| Achievement unlock | "You just passed 1,000 total shots" | Milestone celebration |

---

## Deep Links (Rapsodo-Specific)

Push notifications should always deep link to a specific screen, never just open the app.

| Deep Link | Use Case |
|-----------|---------|
| `rapsodo://practice` | Practice Mode — start a session |
| `rapsodo://session-review` | Session Review — view last session data |
| `rapsodo://session-insights` | Session Insights — trends and progress |
| `rapsodo://courses` | Courses Mode — virtual courses |
| `rapsodo://stats` | Stats History — club data over time |
| `rapsodo://combine` | Rapsodo Combine — 24-shot challenge |
| `rapsodo://target-mode` | Target Mode — accuracy training |
| `rapsodo://export-video` | Video Export — share swing video |
| `rapsodo://subscription` | Subscription — upgrade/manage |
| `rapsodo://my-bag` | My Bag — club settings |
| `rapsodo://settings` | Settings — device/app settings |

**Performance data:** Deep-linked push notifications get **3.1x** more feature activations than generic app-open pushes.

---

## Iterable Push Template Fields

When building push templates in Iterable:

```json
{
  "title": "Your Session Review is ready",
  "body": "47 shots analyzed — see your shot-by-shot breakdown",
  "sound": "default",
  "badge": 1,
  "deepLink": {
    "url": "rapsodo://session-review"
  },
  "customPayload": {
    "feature": "session-review",
    "source": "lifecycle-journey"
  }
}
```

### Iterable-Specific Notes
- **Deep links:** Set via "Open URL" action in push template, not in payload
- **Sound:** Use "default" for system sound, or custom sound file name
- **Badge:** Integer for app icon badge count (iOS only)
- **Custom payload:** Key-value pairs passed to app for analytics/routing
- **Rich media:** Image URL in "Media Attachment URL" field (iOS requires Notification Service Extension)
- **Action buttons:** Configured per-template in Iterable dashboard, up to 4 per push
- **Template variables:** `{{firstName}}`, `{{mlm2numSessions}}`, `{{total_shots}}`, etc.

---

## Timing Strategy for Rapsodo

### Best Send Windows
| Trigger | Time | Rationale |
|---------|------|-----------|
| Post-session nudge | Within 2h of session end | Review data while session is fresh |
| Dormancy re-engagement | 6-8pm local time | Evening = typical practice time for golfers |
| Weekend prompt | Saturday 8-10am | Weekend morning = range time |
| Feature discovery | Within 1h of app open (if didn't try feature) | Recent intent signal |

### Trigger-Based > Calendar-Based
- **Session completed → push Session Review** (if not viewed)
- **3+ days no session → push re-engagement** (max 1/week)
- **New feature available → push announcement** (1-time)
- **Milestone reached → push celebration** (immediate)

---

## Recommended Design Upgrades (Priority Order)

### 1. Add deep link field (HIGH)
Every push must deep link to a specific screen. Add `deepLink` to PushContent type and to the editor. Default to `rapsodo://practice`.

### 2. Platform-accurate preview (HIGH)
Show both iOS and Android notification previews. Different truncation, different typography, different layout. Designers need to see how it looks on both platforms.

### 3. Character count indicators (HIGH)
Show safe zones:
- Title: green < 30, yellow 30-40, red > 40
- Body: green < 50, yellow 50-90, red > 90

### 4. Personalization hints (MEDIUM)
Show available merge fields (`{{total_shots}}`, `{{mlm2numSessions}}`) as quick-insert chips in the editor.

### 5. Copy quality indicators (MEDIUM)
Flag common anti-patterns: exclamation marks, "We miss you", all caps, emoji usage, first-name-in-push.

---

## Measurement

After implementing upgrades, track in Iterable:
- **Push open rate** (direct opens / delivered)
- **Push CTR** (deep link activations / delivered)
- **Opt-out rate** (unsubscribes / delivered) — should stay under 0.5%
- **Feature activation rate** (deep-linked feature used within 1h / push opened)
- Compare behavioral-triggered vs scheduled push performance
- A/B test: personalized data vs generic copy
