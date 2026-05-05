# Handoff: Agent Orchestrator — Dashboard

## Overview
Agent Orchestrator is a web app for managing many parallel Claude Code agents on a server. Each agent runs as an isolated Docker container with its own workspace, system prompt, and model. The dashboard surfaces:

- **Agent list** with live status (running / idle / starting / error / stopped) and unread message counts.
- **Chat-style activity stream** for the focused agent — Claude responses, tool calls, incoming agent messages, and the user's own messages, all interleaved by timestamp.
- **Inbox / Outbox panel** showing JSON messages exchanged between agents (mounted as files into the container at `/agent/inbox/` and `/agent/outbox/`).
- **Infrastructure rail** with health for Claude auth, Docker daemon, agent image, SSE stream, API rate, plus live CPU / memory / messages-per-minute sparklines for the focused agent.
- **Status bar** along the bottom mirroring the most critical infra signals + workspace metadata.

A live SSE stream pushes log lines + state changes from the server to the browser. Messages between agents are persisted as JSON files on disk, mounted into the receiving container — the UI is just a structured viewer over that file system.

## About the Design Files
The files in this bundle are **design references created in HTML/CSS/JSX** — prototypes that show the intended look, layout and behavior. They are **not production code**. They run via Babel-in-the-browser, use mock data, and should be re-implemented in the target codebase using its established patterns and libraries.

The target stack as described:
- **Frontend**: React + Vite (this prototype's JSX maps cleanly).
- **Backend**: Express, JWT auth, SSE streaming.
- **Infra**: Docker, pm2, Google VM, GitHub Actions.

Recreate the design pixel-faithfully in that React/Vite project; pull data from the real Express + SSE backend instead of the mock arrays.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, density modes, accent variants, and interaction patterns are all locked in. Implementation should be pixel-faithful.

---

## Layout

The app uses a **CSS Grid** with three rows and four columns at standard density:

```
grid-template-areas:
  "topbar   topbar  topbar  topbar"
  "sidebar  main    side    infra"
  "statusbar statusbar statusbar statusbar";
grid-template-rows:    48px 1fr 32px;
grid-template-columns: 240px 1fr 340px 260px;
```

Compact density:

```
grid-template-rows:    44px 1fr 28px;
grid-template-columns: 224px 1fr 320px 240px;
```

When the **Infrastructure rail is collapsed**, the last column shrinks to `40px` (compact: `36px`) and only shows a vertical "Infrastructure" label + summary status dots.

The whole shell sits on a faint dot-grid background (`radial-gradient(circle, var(--ink-6) 1px, transparent 1px) / 24px 24px`).

---

## Screens / Sections

### 1. Topbar (height: 48px / 44px compact)

- **Brand block** (left, 240-min, right border, padding-right 16): 22×22 brand mark (rounded-rect ink fill with three connected circles inside, accent color on one node) + `orchestrator` (weight 600) + `/v0.8` (muted). Font: Geist 13.5 px.
- **Workspace pill**: pill-shaped badge with accent dot + workspace name + chevron. Background `bg-sunken`, border `line`, font-size 12, padding `4px 10px 4px 8px`.
- **Search field** (centered, max-width 420 px): icon + input + `⌘K` kbd hint. `bg-sunken`, border `line`, radius `--radius` (6px). 12.5 px placeholder.
- **Right actions**: 28×28 icon buttons (bell / help / settings) + 24×24 avatar with initials, gradient fill (`--accent` → `#8b5cf6`), 10.5 px / 600.

### 2. Sidebar — Agent List (240 px / 224 px compact)

Two stacked sections separated by `--line-2`:

**Header section** (padding 14px 14px 8px):
- Title row: `AGENTS · 8` (uppercase, 11 px, letter-spacing 0.06em, color `--ink-4`) + a `+ New` button (ghost, 12 px).
- Filter pills: `All · 8`, `Running · 4`, `Idle · 2`, `Other · 2`. Pill is 3px×8px, radius 999, font-size 11.5. Active pill: `bg-sunken` + `line` border, `--ink` text. Counts in mono 10.5 px.

**Agent list** (scrollable, 1px gap between rows):
- Row layout: `8px (status dot) | 1fr (name + meta) | optional unread badge`. Padding `8px 10px` (compact: `6px 10px`), radius 6, hover `bg-hover`, active `bg-active` + 1 px `--line` border.
- Name: 13 px / 500 / `--ink`, ellipsis if overflow.
- Meta (under name): mono 10.5 px / `--ink-4`. Format: `4f2e9c · 1h` (id slice + uptime), separators `·` in `--ink-6`.
- Unread badge (right): mono 10 px / 500, `bg-sunken`, padding `1px 6px`, radius 4. On active row uses `bg-elev`.
- **Status dot variants** (8×8 circle):
  - `running`: filled `--ok` + animated ring (`pulse` 2 s ease-out infinite, scale 0.6→1.6, opacity 0.7→0).
  - `idle`: filled `--idle` (`#6B6A63`).
  - `starting`: filled `--warn` + faster pulse (1.2 s).
  - `error`: filled `--err`.
  - `stopped`: transparent fill, 1.5 px `--ink-5` border.

### 3. Main — Detail header + Chat / Config tabs

Detail header (padding 18px 28px 0; compact 12px 20px 0; bottom border `--line`; bg `--bg-elev`):

- **Breadcrumb** (mono 11.5 px / `--ink-4`): `checkout-rebuild / agents / frontend-refactor` (last segment `--ink-2`).
- **Title row**: 10×10 status dot + agent name. Geist 22 px / 600 / -0.025em / line-height 1.2.
- **Sub row** (12 px / `--ink-3`): label/value pairs separated by 1×12 vertical dividers (`--line-strong`). Labels `--ink-4`, values mono 11.5 / `--ink-2`. Items: `id`, `model`, `workspace`, `uptime`, `image`.
- **Actions** (right): `Send message`, `Restart`, `Stop` (danger), and a more (•••) icon button.
- **Tabs** (margin-top 18 px): Chat, Config. Active tab gets a 2 px ink underline. 12.5 px / 500 / `--ink-3` resting, `--ink` active. Counts pill (mono 10.5 px / radius 4) — inactive: `bg-sunken / --ink-3`; active: `--ink / --bg-elev`.

#### Chat view

- **Toolbar** (8px 28px, bottom border `--line-2`, bg `--bg-elev`, font-size 12):
  - `LIVE · streaming` indicator (or `PAUSED`): 6px dot + label, color `--ok` / `--ink-4` paused. Dot pulses when live.
  - 1×14 vertical divider.
  - Mono summary `N tool calls · M responses` (`--ink-4`).
  - Right side: `Find` (ghost) | `Pause / Resume` (ghost, toggles state + dot animation) | `Raw logs` (ghost). All buttons 4px 8px.

- **Stream** (max-width 820 px, centered, padding 0 28px, vertical gap 14 px / 10 px compact, padding-block 24 px):
  - **Divider event**: uppercase mono 10.5 px label between two 1px lines (`--line-2`). Used for `Session resumed · 11:42:14` etc.
  - **Bubble**: 2-column grid `28px | 1fr` with 12 px gap.
    - Avatar: 28×28, radius 6, font-size 11 / 600.
      - `claude` → `--ink` bg, `--bg-elev` text, glyph `C`.
      - `you` → `--accent` bg, white text, initials.
      - `tool` → `--accent-soft` bg, `--accent-ink` text, glyph `⚙`.
      - `agent-msg` → `--warn-soft` bg, `--warn` text, glyph `↘`.
    - Body head (12 px line): name (600 / `--ink`) + tag (mono 10.5 / `--ink-4` / uppercase) + time (auto-left margin, mono 10.5 / `--ink-5`).
    - Body content: 13 px / 1.55 / `--ink-2`. Inline highlight classes:
      - `.hl-path` → `--accent-ink`, mono 12 px (file paths).
      - `.hl-num` → `--warn`, mono 12 px.
      - `.hl-quote` → `--ok`, mono 12 px.
      - `.hl-kw` → `--ink` / 500.
      - `.hl-dim` → `--ink-4`.
    - Optional `sentMsg` block under content: 8 px margin-top, 8/10 px padding, `--bg-elev`, `1px --line` border, 2px-left `--ok` accent, radius 6, mono 11.5. First line `OUTBOX → recipient` (`--ink-4`); second line quoted subject (`--ink-2`).
  - **Tool card** (replaces body content for `kind: tool`): 1px `--line` border, radius 6, mono 11.5.
    - Head row: `bg-sunken`, padding 6/10, items: tool name (600 / `--accent-ink`) + arg in parentheses (`--ink-3`) + result (auto-left, 10.5 px). Result gets `.ok` (color `--ok`, prefixed with `✓ `) when successful.
  - **Event card** (incoming agent message inline in chat): 1 px `--line` border, **2 px left border `--accent`**, `--bg-elev` bg, padding 10/12, radius 6, font-size 12.
    - Head: 11.5 px / `--ink-3` line: `from` (mono 600 `--ink`) → arrow (`--ink-5` mono) → `to`.
    - Subject: 500 / `--ink`, margin-bottom 6.
    - Footnote: mono 11 px / `--ink-4`, e.g. `click to open in Inbox →`.

- **Composer** (bottom, top border `--line`, padding 12/28; compact 10/20):
  - Inner: max-width 820 px, centered, flex `align-items: flex-end`, gap 10, bg `--bg`, 1px `--line`, radius 10, padding 10/12. Focus-within → border `--ink-5`.
  - Auto-grow `<textarea>` (min-height 22, max-height 140), font-family Geist, 13 px / 1.5.
  - Action buttons: `+` icon (attach) + primary `Send` (with paper-plane icon).
  - Hint row underneath: max-width 820, mono 10.5 px / `--ink-4`. Left: `⌘↵ to send`. Right: `JSON message → /agent/inbox/`.

#### Config tab (when active)

Padding 24/28, max-width 720, vertical gap 24:

- Section block: title (13 px / 600 / -0.01em) + subtitle (12 / `--ink-4`) above 6 px-gap rows.
- Config row: `160px | 1fr` grid, padding 8/12, `--bg-elev` bg, 1 px `--line-2`, radius 6, 12 px. Key: mono 11 / `--ink-4`. Value: 12 (sans) or 11.5 (mono).
- Sections: `System Prompt` (renders the prompt in a mono 12 / 1.6 box), `Container` (image, workspace mount, credentials with lock icon, inbox/outbox paths), `Model` (model, max tokens, temperature).

### 4. Side panel — Inbox / Outbox (340 px / 320 px compact)

Grid area `side`. White (`--bg-elev`) bg, 1 px left border `--line`. Three vertical sub-regions:

- **Tabs strip** (height 40, padding 0 12, bottom border `--line`):
  - `Inbox` + `Outbox` tabs. Same active-underline pattern as main tabs (12.5 / 500). Inbox tab carries an unread count pill identical to main-tab counts.
  - Right side: 28×28 icon buttons for `Compose` (plus) + `Filter`.

- **Message list** (flex 1, scrolls):
  - Row grid: `14px (unread dot) | 1fr (body) | auto (time)`, gap 10, padding 12/14, bottom border `--line-2`. Hover `--bg-hover`, active `--bg-active`.
  - Unread dot: 7×7 circle. Filled `--accent` when row is unread.
  - Body line 1 (12 px, gap 6): `from` (500 / `--ink`, **600** when unread) + `→` arrow (mono 11 / `--ink-5`) + `to` (mono 11 / `--ink-3`).
  - Subject: 12 / `--ink-2`, ellipsis.
  - Preview: mono 11 / `--ink-4`, ellipsis. Single-line JSON snippet.
  - Tag row (4 px gap): tag pill — see tag colors below.
  - Time column: mono 10.5 / `--ink-4`, top-aligned.

- **Detail pane** (top border `--line`, max-height 50%, scrollable, padding 14/14):
  - Subject: 13 / 600.
  - Meta row: mono 10.5 / `--ink-4` with `from → to · time · id`. Values in `--ink-2`.
  - JSON block (see "JSON viewer" tokens).
  - Action row (margin-top 10, gap 6): `Reply` (primary) + `Copy JSON` + `Open in Chat` (ghost, auto-left).

**Tag pill colors** (display: inline-block; padding 1/6; radius 3; mono 10 / 500 / letter-spacing 0.02em):
- `task` → `--ok-soft` bg / `--ok` text.
- `report` → `--warn-soft` / `--warn`.
- `query` → `--accent-soft` / `--accent-ink`.
- `alert` → `--err-soft` / `--err`.

### 5. Infrastructure rail (260 px / 240 px compact)

White bg, 1 px left border. Has a tiny **collapse toggle** in its top-right (24×24, 1 px `--line`, radius 4) — flipping it via the chevron icon (rotated 180° when expanded). Three sub-sections separated by `--line-2`, each with a click-to-collapse header chevron (rotates -90° when collapsed).

**Section: Infrastructure** (padding 16 px):
- 12 px / 500 / 0.06em / uppercase title, color `--ink-4`, margin-bottom 12.
- Health rows: `14px (status dot) | 1fr (label) | auto (value)`, gap 10, font-size 12.
  - Label color `--ink-2`. Value mono 11.
  - Variants set value color: `.ok → --ok`, `.warn → --warn`, `.err → --err`.
  - Listed: `Claude auth · valid · 27d`, `Docker daemon · v25.0.3`, `Agent image · 1.4.2 · ready`, `SSE stream · connected`, `API rate · 82% · 18m` (warn).

**Section: Live metrics · {agentName}**:
- Each metric block has:
  - Head row (margin-bottom 4, 11.5 px): label (`--ink-3`) + mono value (11.5 / 500 / `--ink`).
  - Bar: 4 px tall, radius 2, `--bg-sunken` track. Fill variants: default `--ink`, `.accent → --accent`, `.warn`, `.err`. Width transitions `width 600ms ease`.
  - Sparkline SVG below: full width, height 28, no x-axis. Polyline + 8% fill area (`fill-opacity: 0.08`). Stroke 1.2 px.
- Metrics: CPU% (accent), Memory MB (ink), Messages/min (ok). All update every 1.5 s.

**Section: Activity** (flex 1):
- Vertical list (gap 10), each item `14px (dot) | 1fr (body)`, 11.5 px text.
- Dot 6×6 with 5 px top margin. Variants: `.ok`, `.err`, `.warn`, `.accent` set dot color; default `--ink-5`.
- Body color `--ink-2`. Time line: mono 10.5 / `--ink-4`, margin-top 1.

**Collapsed-rail mode** (40 px wide):
- Centered column: 4 stacked status dots (Claude, Docker, Image, API rate) + a vertical "Infrastructure" label using `writing-mode: vertical-rl; transform: rotate(180deg);`, mono 10.5 / 0.1em / uppercase.

### 6. Status bar (height 32 / 28 compact)

Bottom row, mono 11 px / `--ink-3`, `--bg-elev` bg, top border `--line`. Items separated by `1px --line-2`. Each item: padding 0 12, gap 6.

Items in order:
1. `claude · authenticated` (status dot + ok value)
2. `docker · 25.0.3` (status dot + ok)
3. `image · claude-agent:1.4.2`
4. `agents · 4/8 running`
5. `api rate · 82% · resets in 18m` (warn value)
6. (auto-margin) `vm · gcp · europe-west3-a`
7. `build · v0.8.2 · 7e3f10a`
8. live clock (`HH:MM:SS`, locale en-GB) — refreshes every second.

Item label: uppercase 10 px / 0.06em / `--ink-4`. Item value: `--ink` (or `--ok / --warn / --err` per variant).

---

## Tweaks panel (top-right, when toggled)

A floating panel exposing three controls; persisted via the `__edit_mode_set_keys` host protocol. Defaults wrapped in `EDITMODE-BEGIN/END` markers in `app.jsx`.

- **Theme**: `light` | `dark` — sets `data-theme` on `<html>`. Dark theme overrides every neutral token; accents/status colors are kept identical with softer translucent backgrounds.
- **Density**: `comfortable` | `compact` — sets `data-density`; tightens grid track sizes, paddings, and font scales (only via the explicit compact selectors).
- **Accent**: `indigo | emerald | violet | orange` — replaces `--accent`, `--accent-soft`, `--accent-ink` at runtime.

When implementing in production, the Tweaks panel can be removed or repurposed as user theme settings.

---

## Interactions & Behavior

- **Agent selection**: clicking a row in the Sidebar updates `activeId`; the Detail header, Chat stream, Config, and metric labels all re-render against the chosen agent.
- **Sidebar filters**: `all / running / idle / other` filter pills at top of sidebar. State stored as `filter` string.
- **Chat stream auto-scrolls** to the bottom whenever events change unless paused. New events stream in via SSE in production.
- **Pause / Resume**: stops appending new chat events / log lines.
- **Tabs (Chat / Config)**: simple state swap; no transition.
- **Side panel tab swap (Inbox ↔ Outbox)**: same row component, different data source; selected message is shared state across tabs.
- **Message detail JSON**: keys colored `--accent-ink`, strings `--ok`, numbers `--warn`, booleans/null purple `#a83fbb`, punctuation `--ink-5`. Whitespace `pre`, mono 11.5 / 1.6.
- **Infrastructure collapse toggle**: shrinks the rail to 40 px and rotates the chevron 180°. Each section header inside is independently collapsible.
- **Status bar clock**: ticks every 1 second using `setInterval(setNow, 1000)` and `Date.toLocaleTimeString('en-GB')`.
- **Live metrics**: `setInterval(1500ms)` shifts a 40-sample window; CPU bounded `[2, 80]`, Memory `[80, 900]`, Messages 1–7. Sparklines re-render reactively.
- **Composer textarea** auto-grows up to `max-height: 140px`; `⌘↵` should submit (handler not yet wired in prototype).

### Status-dot pulse

```css
@keyframes pulse {
  0%   { transform: scale(0.6); opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0;   }
}
```

Applied to `::after` pseudo-element of `.status-dot.running` (2 s) and `.status-dot.starting` (1.2 s).

### Drawer / fade animations

```css
@keyframes fadein  { from { opacity: 0; }              to { opacity: 1; } }
@keyframes slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }
```

(Used by the legacy InfraDrawer; not required in the current 4-column layout but kept harmless.)

---

## State Management

| State                  | Where set                  | Notes                                                        |
| ---------------------- | -------------------------- | ------------------------------------------------------------ |
| `tweaks`               | `useTweaks(defaults)` hook | `theme / density / accent`                                   |
| `tweaksOpen`           | host postMessage           | `__activate_edit_mode` / `__deactivate_edit_mode`            |
| `filter`               | sidebar pills              | `all / running / idle / other`                               |
| `activeId`             | sidebar click              | Agent id selected                                            |
| `tab`                  | tab buttons                | `chat / config`                                              |
| `paused`               | toolbar button             | Pauses chat/log streaming                                    |
| `selectedMsg`          | side-panel rows            | Currently focused inbox/outbox row                           |
| `sideTab`              | side-panel tabs            | `inbox / outbox`                                             |
| `infraCollapsed`       | infra rail toggle          | Boolean — collapses the right rail                           |
| `chatEvents`           | SSE feed (prod)            | Array of `{ kind, time, ... }`                               |
| `cpu/mem/msgHistory`   | metrics SSE (prod)         | 40-sample rolling windows                                    |
| `now`                  | clock interval             | `Date` updated each second                                   |

Production data sources to wire up:
- Agents list + statuses → `GET /api/agents` and SSE topic `agents.update`.
- Per-agent chat events → SSE topic `agents.{id}.events`.
- Inbox/Outbox messages → polling `GET /api/agents/{id}/inbox` or SSE topic `agents.{id}.inbox`.
- Infrastructure health → `GET /api/health` (Claude auth, Docker, image, SSE) + SSE topic `system.health`.
- Live metrics → SSE topic `agents.{id}.metrics` at 1–2 Hz.
- Sending a message → `POST /api/agents/{id}/messages` (writes JSON file into `/agent/inbox/`).

---

## Design Tokens

All declared on `:root` (and overridden under `[data-theme="dark"]`). Use these directly; do not improvise new neutrals.

### Colors — Light theme (default)

| Token              | Value      | Use                                                      |
| ------------------ | ---------- | -------------------------------------------------------- |
| `--bg`             | `#FAFAF7`  | App canvas (warm off-white)                              |
| `--bg-elev`        | `#FFFFFF`  | Cards, panels, sticky headers                            |
| `--bg-sunken`      | `#F4F3EE`  | Search field, tag pills, mono badges                     |
| `--bg-hover`       | `#F0EFEA`  | Row hover                                                |
| `--bg-active`      | `#EAE8E0`  | Row active / selected                                    |
| `--ink`            | `#0E0E0C`  | Primary text                                             |
| `--ink-2`          | `#2A2A26`  | Secondary text, content body                             |
| `--ink-3`          | `#54534D`  | Tertiary, button text                                    |
| `--ink-4`          | `#84827A`  | Muted labels, timestamps                                 |
| `--ink-5`          | `#B5B3A8`  | Very muted, divider chars                                |
| `--ink-6`          | `#D9D7CC`  | Backgrounds for dots, dot-grid pattern                   |
| `--line`           | `#E5E3D8`  | Default 1 px borders                                     |
| `--line-2`         | `#EDEBE0`  | Hairlines between rows                                   |
| `--line-strong`    | `#CFCDC0`  | Vertical dividers, button borders                        |
| `--accent`         | `#3D3DF5`  | Primary accent (Indigo default)                          |
| `--accent-soft`    | `#ECECFE`  | Subtle accent backgrounds                                |
| `--accent-ink`     | `#1F1FA8`  | Accent text on light                                     |
| `--ok`             | `#119663`  | Running, success                                         |
| `--ok-soft`        | `#E1F4EB`  | Success-tinted backgrounds                               |
| `--warn`           | `#B5760D`  | Starting, warning                                        |
| `--warn-soft`      | `#FBF1DC`  | Warn-tinted backgrounds                                  |
| `--err`            | `#C8324A`  | Error                                                    |
| `--err-soft`       | `#FBE5E9`  | Error-tinted backgrounds                                 |
| `--idle`           | `#6B6A63`  | Idle status fill                                         |
| `--idle-soft`      | `#ECEAE0`  | Idle-tinted background                                   |

### Colors — Dark theme

```
--bg: #0D0D0B; --bg-elev: #161614; --bg-sunken: #0A0A09;
--bg-hover: #1C1C19; --bg-active: #232320;
--ink: #F2F1EB; --ink-2: #DAD8CF; --ink-3: #A8A69A;
--ink-4: #76746A; --ink-5: #54534B; --ink-6: #3A3935;
--line: #232320; --line-2: #1B1B19; --line-strong: #2F2F2B;
--accent-soft: #1A1A3A; --accent-ink: #C5C5FF;
--ok-soft: #0E2A20; --warn-soft: #2A2010; --err-soft: #2A1218;
--idle-soft: #1F1E1A;
```

Status `--ok / --warn / --err / --accent` and dot-grid pattern keep the same hue across themes.

### Accent variants (Tweaks)

| Name     | --accent  | --accent-soft | --accent-ink |
| -------- | --------- | ------------- | ------------ |
| indigo   | `#3D3DF5` | `#ECECFE`     | `#1F1FA8`    |
| emerald  | `#10b48a` | `#E1F5EE`     | `#0a6b50`    |
| violet   | `#7c3aed` | `#EDE7FE`     | `#4c1d95`    |
| orange   | `#E8590C` | `#FBE8DC`     | `#A03A04`    |

### Typography

- **Sans (UI body)**: `Geist`, weights 300/400/500/600/700.
- **Mono (IDs, timestamps, paths, code, JSON, kbd, badges)**: `Geist Mono`, weights 400/500/600.

Both loaded from Google Fonts:
```
https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap
```

Body defaults: 13.5 px / 1.5 / letter-spacing -0.005em / antialiased / `optimizeLegibility`.

Type scale used:
- 22 / 600 / -0.025em — Detail title
- 16 / 600 / -0.015em — Message detail subject
- 14 / 600 / -0.01em — Drawer titles, config section title (13 / 600)
- 13.5 / 600 — Brand wordmark
- 13 / 500 — Agent name, bubble name, tab text
- 12.5 / 500 — Tab / button text, side panel tab, message list rows
- 12 — Detail sub items, health rows
- 11.5 — Sidebar count, mono values, log msg padding
- 11 / 500 / 0.06em / uppercase — Section titles in rails
- 10.5 / 0.06em / uppercase — Status bar labels
- 10 / 500 / 0.02em / uppercase / mono — Tag pills

### Radii

- 3 / 4 / 6 / 10 / 14 px (`--radius-sm` 4, `--radius` 6, `--radius-lg` 10, `--radius-xl` 14).

### Shadows

- `--shadow-sm`: `0 1px 0 rgba(14,14,12,0.04)`
- `--shadow`: `0 1px 2px rgba(14,14,12,0.04), 0 8px 24px -12px rgba(14,14,12,0.08)`
- `--shadow-pop`: `0 1px 2px rgba(14,14,12,0.06), 0 16px 40px -16px rgba(14,14,12,0.16)`

### Spacing

Free-form rather than a strict scale; common values used: 4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 24 / 28 px. Inner panels generally use 14–28 px padding.

### Transitions

- 80 ms — button press translate
- 100 ms — row hover bg
- 120 ms — button hover
- 160 ms — chevron rotate / fade in
- 220 ms `cubic-bezier(0.2,0.7,0.2,1)` — drawer slide-up
- 600 ms ease — metric bar width

---

## Assets

- **Icons**: All icons are inline SVG drawn at 16×16 viewBox with stroke 1.4, stroke-linecap/linejoin `round`. See `icons.jsx` — set: `play, pause, stop, restart, send, search, plus, filter, settings, logs, inbox, outbox, config, bell, help, chevron, more, copy, ext, docker, cpu, mem, key, lock, dot, arrow-right, x`. No external icon library — keep them inlined or port to a chosen icon system (Lucide is closest in shape language).
- **Brand mark**: Inline SVG (22×22). Rounded-rect ink fill with three connected nodes (one accent, two surface) and faint connector lines. Replace with the team's real logo.
- **Avatar**: Initials in a 24×24 circle with `linear-gradient(135deg, var(--accent), #8b5cf6)` and white text.
- No raster images are used.

---

## Files (in this bundle)

| File | Purpose |
| ---- | ------- |
| `Agent Orchestrator.html` | Entry HTML — loads Geist fonts, React 18.3.1, Babel, and all JSX modules. |
| `styles.css`              | All CSS tokens, layout grid, components, and themes. **Source of truth for tokens.** |
| `app.jsx`                 | Root `<App>`: layout, state, infra collapse, tweaks. Reads `EDITMODE-BEGIN/END` defaults. |
| `sidebar.jsx`             | Agent list, filter pills, status dots. |
| `chat.jsx`                | Chat stream, bubbles, tool cards, event cards, composer. Includes `CHAT_SEED`. |
| `side-panel.jsx`          | Right Inbox/Outbox panel + the legacy `InfraDrawer` component. |
| `rightbar.jsx`            | Far-right Infrastructure rail (collapsible) + Live metrics + Activity feed. |
| `inbox.jsx`               | Older standalone Inbox view (kept for reference; new layout uses `side-panel.jsx`). |
| `logs.jsx`                | Older standalone Logs view (kept for reference; new layout uses Chat). |
| `helpers.jsx`             | `Sparkline`, `JsonBlock`, `formatUptime`, `formatUptimeShort`. |
| `icons.jsx`               | Inline-SVG icon set. |
| `data.js`                 | Mock `AGENTS`, `INBOX`, `LOG_SEED`, `ACTIVITY`. Replace with real API. |
| `tweaks-panel.jsx`        | Floating Tweaks shell + form controls. Optional in production. |

### Implementation order suggestion

1. Port `styles.css` tokens into the target codebase's CSS / Tailwind config. Establish `data-theme` and `data-density` attribute switches.
2. Implement layout shell (Topbar, Sidebar, Main, Side panel, Infra rail, Status bar) with placeholder children.
3. Wire `GET /api/agents` and SSE `agents.update` → Sidebar.
4. Wire `agents.{id}.events` SSE → Chat stream. Reuse the bubble/tool-card/event-card variants exactly.
5. Wire inbox/outbox file polling or SSE → Side panel.
6. Wire infra health endpoint + per-agent metrics SSE → Right rail + sparklines.
7. Add composer `POST` handler.
8. (Optional) Port the Tweaks panel as a user-settings menu, or remove.
