# In-App Message Design — Best Practices & Audit

## Current State

Our in-app templates use a white centered card with a generic red square icon, system fonts, and identical layout for every message type. They're functional but read as "Iterable default template" — not as intentional brand communications.

**What we ship today (all modals):**
- 44px red square with generic SVG icon (same icon on every message)
- White card, 16px border-radius, centered on dimmed overlay
- `-apple-system` font stack (system notification feel)
- 20px headline / 15px body / 13px dismiss
- Body color `#52525b` (washed on OLED screens)
- CTA button: 14px vertical padding, 10px border-radius
- "Not now" text dismiss link
- Banner: single-line truncated text, minimal vertical space

---

## Best-in-Class Benchmarks (2025–2026)

### Apps Studied
Duolingo, Headspace, Calm, Nike Training Club, Strava, Peloton — all fitness/wellness/sports with strong in-app messaging programs.

### Layout & Format

**Centered modal (35% interaction rate):**
- Still dominant for high-stakes moments (feature discovery, conversion prompts)
- Top apps use 20–24px corner radius on the card (not 16px)
- Scrim overlay is darker and more defined (~60% black, not 30%)
- Cards have significantly more internal padding (32–40px horizontal vs our 24px)
- Gap between icon/illustration and headline: 20–24px (we use 16px)

**Bottom sheet (emerging standard):**
- Material Design 3 and iOS both favor this for lower-friction interactions
- One full-width primary CTA + text-link dismiss below
- Split two-button rows (primary + secondary side by side) are the single most recognizable signal of a template — every Braze/Iterable default ships this way
- We don't currently use bottom sheets at all

**Banner (12.5% interaction rate):**
- Works only for persistent informational nudges, not conversion CTAs
- Our banner truncates to single-line text — loses the message
- Needs slightly more vertical breathing room

**Fullscreen (rare, celebration/milestone only):**
- Nike and Peloton use full-bleed photo or dark-gradient backgrounds
- Content sits in lower 40% of screen, text on dark, strong single CTA
- Communicates "this is a major feature" vs "this is a notification"

---

### Visual Assets: The Biggest Gap

**Single emoji/generic icon as the hero visual is the clearest sign of an undesigned template.** Every default Iterable/Braze template from 2020 onward uses this pattern. It communicates "nobody designed this."

What top apps use instead:

| App | Visual Approach |
|-----|----------------|
| Duolingo | Custom vector character illustrations — Duo in contextual poses. Rounded geometry only (circles, rounded rectangles). Never stock icons. |
| Headspace | Illustrated characters with warm skin tones on pastel backgrounds. Flat vector, specific limited palette. |
| Calm | Full-bleed nature photography. Dark overlay for legibility. Image does the emotional work. |
| Nike Training Club | High-contrast athlete photography or solid black backgrounds with large white type. Very typographic. |
| Strava | Data visualization as the visual — your activity map, your streak heatmap. "Illustration" is your own data rendered graphically. |
| Peloton | Instructor photos + gradient overlays. Personal and brand-aligned. |

**For Rapsodo:** The analogous approach would be contextual SVG icons per feature (not one generic icon repeated), or data-driven visuals (shot dispersion graphic, club stat chart, course illustration). A golf ball emoji is the exact anti-pattern.

**Proposed icon set per feature:**
- Practice Mode → target/bullseye icon (shots going somewhere)
- Session Review → bar chart / data grid icon
- Session Insights → trend line / graph icon
- Courses Mode → flag on green / course pin icon
- Range Mode → club bag / range distance icon
- Target Mode → crosshair / precision icon
- Combine → trophy / medal icon
- Video Export → play/camera icon
- General/milestone → Rapsodo "R" logomark

---

### Typography

| Element | Our Current | Best-in-Class | Gap |
|---------|------------|---------------|-----|
| Headline size | 20px | 22–28px | Too small — doesn't command attention |
| Headline weight | 700 | 700–800 | Close, could go bolder |
| Body size | 15px | 13–14px | Actually slightly large — body should be smaller relative to headline for contrast |
| Body color | `#52525b` | `#333` or `#3f3f46` | Washed on OLED. Needs higher contrast. |
| Dismiss link | 13px | 13px minimum | Acceptable but tight |
| CTA text | 15px, 700 weight | 14–16px, 700–800 weight | Close |
| Typeface | `-apple-system` stack | Brand typeface | **Major gap.** Rapsodo uses Barlow. System fonts make messages feel like notifications, not brand communications. |
| Letter spacing | -0.3px on headline | -0.3 to -0.5px | Close |

**Key insight:** The ratio matters more than absolute sizes. Best-in-class apps have a clear hierarchy: headline is 1.5–2x the body size. Our 20px/15px ratio (1.33x) is too flat. Going to 24px/14px (1.71x) creates much stronger visual hierarchy.

---

### Color

| Element | Our Current | Best-in-Class | Issue |
|---------|------------|---------------|-------|
| Card background | White only (`#ffffff`) | Dark or saturated for high-stakes; neutral for low-friction | White card = generic. Dark card = designed. |
| Brand accent | `#ce2029` (Rapsodo red) | Single consistent accent throughout | We're consistent here — good. |
| Overlay/scrim | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.6)` | Slightly too transparent. Darken for better focus. |
| CTA button | `#ce2029` solid | Brand color, often with subtle gradient or hover state | Solid is fine. Consider a subtle dark-to-light gradient for depth. |

**Dark card option:** Nike, Calm, and Peloton use dark backgrounds (`#1a1a1a` to `#2d2d2d`) for premium/milestone moments. White text on dark reads as premium. Consider dark card for: milestone celebrations, conversion moments, feature announcements. Keep white card for: post-session nudges, gentle feature discovery.

---

### Button Design

| Element | Our Current | Best-in-Class | Issue |
|---------|------------|---------------|-------|
| Vertical padding | 14px | 16–18px | Button feels short. Taller = more confident. |
| Border radius | 10px | Pill-shaped (999px) or matched to card | 10px radius on a 16px-radius card is mismatched. |
| Width | `min-width: 180px` | Full-width or generous min-width (200px+) | Slightly narrow. |
| Dismiss pattern | "Not now" text link below CTA | Same, but 13px minimum | Acceptable. |

**The split two-button row is an anti-pattern for in-app.** One primary CTA + text dismiss link is the standard. We're already doing this correctly.

---

### Spacing & Padding

| Element | Our Current | Best-in-Class | Issue |
|---------|------------|---------------|-------|
| Card horizontal padding | 24px | 28–40px | Too tight. Content feels cramped. |
| Icon-to-headline gap | 16px | 20–24px | Compressed. Icon needs breathing room. |
| Headline-to-body gap | 8px | 10–12px | Slightly tight. |
| Body-to-CTA gap | 24px | 28–32px | Close but could use more. |
| CTA-to-dismiss gap | 14px | 16–20px | Slightly tight. |

**Key insight:** The perceptible difference between a premium in-app and a default one is often just padding. Headspace and Calm use 32–40px horizontal padding. The content area feels less cramped, the modal feels like it has more surface area, and it reads as more considered.

---

### Shadows

| Element | Our Current | Best-in-Class | Issue |
|---------|------------|---------------|-------|
| Modal card | `0 12px 40px rgba(0,0,0,0.25)` | Layered: `0 2px 8px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.15)` | Single shadow looks flat. Layered (tight near + diffused far) looks native. |
| Banner | `0 2px 12px rgba(0,0,0,0.06)` | `0 1px 0 rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.08)` | Close, could be subtler. |

---

### Visual Differentiation Between Messages

**Current problem:** Every in-app message looks identical. Session Review prompt = Courses prompt = Target Mode prompt. Same icon, same card, same layout. Users develop banner blindness fast.

**Best-in-class apps differentiate by:**
1. **Contextual icon/illustration** per feature (not one icon repeated)
2. **Color accent variation** — subtle background tint per category (e.g., blue tint for data features, green for outdoor modes)
3. **Format variation** — not every message should be a modal. Use banner for gentle nudges, modal for feature discovery, bottom sheet for settings/preferences
4. **Data personalization** — "You hit 47 shots yesterday" with actual numbers, not generic copy

---

## Iterable-Specific Constraints

Things we must work within:

- Templates are HTML/CSS pasted into Iterable's Side-by-Side editor
- No external CSS files — all styles must be inline
- No JavaScript execution in the message
- Iterable supports Handlebars merge tags: `{{firstName}}`, `{{total_shots}}`, etc.
- Images: must be hosted externally (CDN URL), max 5MB, recommend under 500KB
- Dismiss action: `iterable://dismiss` for the dismiss link href
- Deep links: `rapsodo://practice`, `rapsodo://session-review`, etc.
- No custom fonts unless loaded via `@import` in a `<style>` tag (adds load time)
- Keep HTML clean and minimal — complex layouts break on some Android WebViews

**Font loading option:** We can load Barlow via Google Fonts `@import` in the template HTML. It adds ~100ms load time but dramatically improves brand consistency. Worth it for modals and fullscreen. Skip it for banners (speed matters).

```html
<style>@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@600;700;800&display=swap');</style>
```

---

## Recommended Design Upgrades (Priority Order)

### 1. Contextual icons per feature (HIGH)
Replace the single generic red square with feature-specific SVG icons. Each feature gets its own icon in a red-tinted circle. Instantly makes each message recognizable and distinct.

### 2. Typography upgrade to Barlow (HIGH)
Load Barlow via Google Fonts import. Use 24px/800 for headlines, 14px/400 for body. Creates immediate brand alignment.

### 3. Increase padding and spacing (HIGH)
Card padding: 24px → 32px horizontal. Icon-to-headline: 16px → 22px. Body-to-CTA: 24px → 28px. Low effort, high impact.

### 4. Layered shadows (MEDIUM)
Replace single shadow with layered near+far shadow. Makes modals feel native to iOS/Android rather than floating divs.

### 5. Pill-shaped CTA button (MEDIUM)
Change button border-radius from 10px to 999px (full pill). Match what users see in native iOS/Android buttons. Increase vertical padding to 16px.

### 6. Dark card variant (MEDIUM)
Add a dark background option for milestone/celebration/conversion messages. White text on `#1a1a1a`. Premium feel for the moments that matter most.

### 7. Higher body text contrast (LOW)
Body color from `#52525b` → `#3f3f46`. Better OLED readability. Small change, noticeable improvement.

### 8. Banner vertical expansion (LOW)
Give banners 16px vertical padding instead of 14px. Allow body text to wrap to 2 lines instead of truncating.

---

## Measurement

After implementing upgrades, track in Iterable:
- **In-app message click rate** (primary CTA taps / impressions)
- **Dismiss rate** (dismiss taps / impressions)
- **Feature adoption lift** (users who see message → use feature within 48h)
- Compare modal vs banner vs fullscreen performance per feature
- A/B test dark card vs white card on conversion moments
