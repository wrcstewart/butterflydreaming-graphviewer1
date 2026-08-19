# Music-player layout — spec (v0.2, 2026-08-19)

Status: **built for ABC (mobile + desktop, embedded + standalone); Fractal not
yet ported.** A single, principled layout for the media-module players.
Supersedes the ad-hoc per-module mobile patching.

§§0–3 (principles, column, grid, dock-slots) are as built and unchanged. **§4
styling was revised on the standalone during the 2026-08-18 evening pass — read
§4a and §8 before copying colours from §4.**

## 0. Principles

1. **One layout, both platforms.** Mobile and desktop are the *same* layout — a
   central column. Mobile fills the screen with it; desktop centres it and
   leaves the two side quarters blank (reserved for future desktop-only
   features — leave empty for now).
2. **The module owns the grid; BD docks into it.** The control area is a CSS
   grid defined by the module. BD's chrome (↓↑ arrows, Extension panel) is
   mirrored onto two **reserved empty slots** in that grid — one read, no
   chasing shifting content. Identical for ABC and Fractal.
3. **Stack, don't overlap.** The control area starts **5px below the History
   pane**, not over it. History pane on top; module below it down to the
   breadcrumbs.
4. **Drop the piece-title square.** Gone. "Copy .abc" gives the score instead.

## 1. The central column

- Width ≈ the **Current / History (Script) panel width** (~40–50% on desktop).
- **Top of column:** BD panels — Current, History/Script, the view radios,
  Back, Pair (unchanged, as today).
- **Below (5px gap):** the module **control area** (the iframe), same width as
  the column, filling down to the breadcrumbs.
- **Mobile:** column = full screen width.
- **Desktop:** column centred; **left ~¼ and right ~¼ of the screen blank.**

Implication: the module iframe is **constrained to the column width and
centred** (was full `#cy` width with a 100px right reserve). `positionCyEl` /
`positionExtendPanel` set: `iframe.top = History-pane bottom + 5`, `iframe.width
= column width`, centred. The steppers/"winged" buttons don't move themselves —
they reflow because their box narrows to the column.

## 2. The control-area grid

Two vertical bands: **right ⅓** and **left ⅔**.

```
┌─────────────────────────────── control area ───────────────────────────────┐
│  ┌ Copy panel (top-left) ──────┐        │  ┌ ↓↑ arrows slot (BD) ─────────┐ │
│  │ Copy Script │ Copy .abc │ ＋ │        │  │   ↓                          │ │
│  └─────────────────────────────┘        │  │   ↑   (module reserves slot; │ │
│                                          │  │        BD mirrors arrows in)  │ │
│              ┌ Player (centre) ┐         │  └──────────────────────────────┘ │
│              │  ▶ Play  ■ Stop  │         │  ┌ Stepper column ─────────────┐ │
│              │  « piece name »  │         │  │  (scrollable; module owns)   │ │
│              └─────────────────┘          │  │                              │ │
│  ┌ Ext slot (BD) ┐   ┌ Output panel ───┐ │  │                              │ │
│  │ Jump   Copy    │   │ Bake  ＋ ＋ ＋   │ │  │                              │ │
│  └ bottom-left ───┘   └ bottom-right ───┘ │  └──────────────────────────────┘ │
│            left ⅔                          │            right ⅓               │
└──────────────────────────────────────────┴───────────────────────────────────┘
```

**Right ⅓ (one vertical strip):**
- **↓↑ arrows slot** — top of the control area, **same width as the stepper
  column**, directly above it. Empty slot the module reserves; **BD mirrors the
  Copy-Down/Up buttons onto it.**
- **Stepper column** — scrollable, below the arrows slot, fills to the bottom.
  Module-owned. (ABC: 8 steppers; Fractal: its own set.)

**Left ⅔ (module panels + one BD slot):**
- **Copy panel** — top-left. Buttons: **Copy Script**, **Copy .abc**
  (placeholder for now), **＋ one empty slot** for a future button.
- **Player** — centre. **Play**, **Stop**, and the **piece-name label**.
- **Output panel** — bottom-right of the ⅔. **Bake**, **＋ 3 empty slots**.
- **Extension slot** — bottom-left. Empty slot the module reserves; **BD mirrors
  the Extension panel (Jump / Copy) onto it.**

## 3. BD dock-slots (the key mechanism)

The module renders two empty, positioned `<div>`s: `#bd-arrows-slot` (right-⅓
top) and `#bd-ext-slot` (bottom-left). Each frame in Player mode, BD reads those
two slot rects through the iframe chain (as `positionExtendPanel` already does)
and stamps its fixed `#copy-up`/`#copy-down` and `#bd-invite-panel-viewer` onto
them. Module moves the slot → BD chrome follows. No module needs to know about
BD internals; BD needs only the two slot ids. Same for ABC and Fractal.

## 4. Styling

- **Panels** (each control-containing group: Copy, Player, Output, arrows,
  stepper, ext): **white frame** (1px white border), dark/transparent fill.
- **Buttons — uniform:** white frame, **black background, white font, one
  size** for all of them.
- **Play & Stop — exception:** **2× the standard button size**; **Play =
  light-green** background, **Stop = light-red** background; white frame kept.
  Label colour: **dark** on the light fills for legibility (luminance contrast —
  see [[user-colour-vision]]); confirm if you'd rather keep white.
  → **Revised on the standalone, see §4a.**

## 4a. Styling revision (standalone, 2026-08-18 evening)

The standalone player went **black-and-white in the panel area**: the green/red
Play/Stop pair was the only hue-carrying element there, and hue was never what
distinguished it. The rule it was standing in for survives intact —
**distinguish by LUMINANCE, not hue** ([[user-colour-vision]]).

Scope note: this was **not** a whole-module desaturation. The stepper column
keeps its teal `#4a9b8e` borders/labels in *both* copies (7 occurrences each) —
only the typeface and Play/Stop actually changed.

- **Play = light fill `#f0f0f0` / black label. Stop = black fill / white label.**
  Still 2×-width, white frame kept; `min-height` 52 → **56px** (dropped to 40 in
  `dc18a56`, restored to 56 once the depth moved into the panels instead —
  the button is a standard 2× button, the *panel* carries the black space).
- **Typeface: Arial/Helvetica sans throughout** (was Georgia serif; the stepper
  labels' Courier also went). The **one** serif element left is the standalone's
  `#bd-invite-target` title line, in dark gold `#d4a017` — deliberately the sole
  exception.
- **Depth, not size.** Where a panel looked cramped the fix is to grow the
  *panel* (adding black space) and leave the buttons at their normal size.
  Mechanically: `.copy-panel { min-height: 80px }`, `.player-panel
  { min-height: 160px; justify-content: flex-start }` — content top-aligned so
  the surplus reads as black space *under* the buttons, not as centring.
  Standalone grid rows are pinned explicitly for this:
  `minmax(80px, auto) minmax(136px, auto) 1fr` — the player row was cut 160 →
  136 so the freed depth goes to the bottom row (ext invite + Bake output),
  which needed it. `minmax(…, auto)` lets a row grow if content ever exceeds
  the floor.

**This revision has NOT been applied to the embedded copy** — see §8.

## 5. Per-module specifics (same skeleton, different fills)

| Slot | ABC | Fractal |
|---|---|---|
| Copy panel | Copy Script, Copy .abc (placeholder), ＋ | same (Fractal has an ABC pane → Copy .abc works) |
| Output panel | Bake, ＋＋＋ | Bake/Save wav/MIDI etc. into the same 4-slot grid |
| Stepper column | 8 ABC steppers | Fractal's steppers |
| Player | Play / Stop / name | same |
| Arrows slot, Ext slot | BD-docked | BD-docked |

## 6. Decisions (2026-08-18 — all resolved)

- **D1** ✅ Column width **matches the panel width exactly** (40% desktop / 100%
  mobile) — for neatness and simpler onward design.
- **D2** ✅ Play/Stop labels **dark** on the light-green/light-red fills.
  **→ superseded 2026-08-18 for the standalone: B&W, see §4a.**
- **D3** ✅ Desktop side-quarters **blank** (page background) for now.
- **D4** ✅ **Finish ABC** on the new skeleton first, then point Fractal at it.
- Grid pairing (Output bottom-right of the ⅔, Ext bottom-left, arrows slot =
  full stepper-column width directly above the steppers) — ✅ confirmed.

## 7. Implementation status (2026-08-19)

**ABC mobile — DONE** (module `M_Music/music_module.html`; BD `viewer.js` /
`style.css`; served at `/bd_M_ABC/` via inner `music_module.html`):
- `.module-layout` is a CSS grid with the areas above; square dropped, piece
  name is a plain `#piece-title` label under Play/Stop; status floats out of the
  grid (errors only). Old `max-aspect-ratio` query replaced by `max-width:500px`
  (the Player iframe is often wider than tall → the aspect query never matched).
- Two empty dock-slots (`#bd-arrows-slot`, `#bd-ext-slot`). BD's
  `positionExtendPanel` detects them (via the iframe chain) and **mirrors** the
  ↓↑ arrows onto the arrows slot and the Extension panel onto the ext slot — the
  mechanism that ends the pixel-chasing. Kolam/Fractal keep their per-module
  fallbacks (Fractal still `#abc-pane`).
- Styling: white-framed panels + stepper column; uniform white-frame/black-bg/
  white-font buttons; Play/Stop 2× with light-green/light-red + dark label;
  step-btn +50% (39×33). Extension panel = two stacked white-framed buttons
  ("Jump to external player" / "Copy external url"), blue-grey dropped.
- Bug fixed: entering Player straight from Nodes left the iframe top under the
  History pane — `positionCyEl` now computes the iframe rect from the LIVE
  Player pane layout when `#cy` is hidden (was reusing a stale Nodes rect), and
  `setViewMode('player')` re-runs it after `player-active` is set.

**ABC desktop — DONE** (BD commit `370b02d`, 2026-08-18 13:01):
- `positionCyEl` branches on `iframeEl.src.indexOf('/bd_M_ABC/')`: for a
  grid module the iframe **is** the column — left/width copied from the bottom
  panel's rect (40% centred desktop / 100% mobile), `top = panel.bottom + 5`,
  height down to the 90px breadcrumb clearance. Every other module keeps the old
  `#cy`-rect path. **Add `/bd_M_Fractal/` to that test when Fractal is ported.**
- `positionExtendPanel`'s `innerWidth > 1024` early-return **moved below the
  dock-slot check**, so slot-bearing modules dock on desktop too; legacy
  (Kolam/Fractal) modules still hit it and fall back to the CSS default
  right-side panel.

**Other BD work the same afternoon** (13:09–13:51): module `#status` shows
errors only; BD reuses the "N connected" label as a scrollable status strip and
relays only real errors, not playback chatter; breadcrumb strips tried
column-constrained (`2b25b03`) then reverted to full width (`019d043`); the
phone rotate overlay gated on `(pointer: coarse)` so it never fires on desktop
(`9f8bb73`). **`9f8bb73` is the last BD-repo commit of the day — everything
after 13:51 happened in the `bd_M_ABC` repo (see below).**

**Standalone (`bd_M_ABC` repo) — DONE, 15:00→20:56, commits `1828135`,
`dc18a56`, `66349e0`, `f38b39d`, `0c51dfb`, `9598b94`:**
- `1828135` — standalone `music_module.html` replaced wholesale with the
  embedded grid copy. No stepper duplication: the standalone side-panel already
  had `STEPPERS=[]`, the module always owned them. Divergence preserved: **Save
  wav + Save midi** occupy two output-panel slots (spares in the embedded copy);
  `downloadBlob`/`lastBakedBlob` re-added. `preview.html` lifted the ↓↑ arrows
  out of the side-panel into `#arrow-dock`, overlaid onto `#bd-arrows-slot` by a
  local `positionSlots()` (single same-origin iframe → slot rect + iframe page
  offset; top-right fallback if unreadable). `.dock-slot` borders made
  transparent so an un-docked slot reads as clean free space, not an empty box.
  **`#bd-ext-slot` started as free space here and was then used** (`dc18a56`,
  "docked invite"): `positionSlots()` now docks the **Collaborate invite panel**
  into it in **both** modes with `growable = true`, while `#arrow-dock` docks
  into `#bd-arrows-slot` in **edit mode only** (`growable = false`) and has its
  geometry cleared in basic mode so it doesn't linger. Module `setStatus` relays `BD_STATUS` straight to preview's side-panel
  status (no wrapper hop — `module.parent` IS preview).
- `dc18a56`…`9598b94` — the §4a B&W restyle, the row-depth tuning, docked
  invite, `#script-input` min-height 160 → 320 → 368px, gold serif title,
  module iframe cache-bust `?v=2` → `?v=3`, no ready-noise on load.
- **`dockOnto(el, slotId, growable)`** — third argument added: `growable` sets
  `min-height` rather than `height`, so a docked element fills its slot but can
  grow past it when its content needs the room instead of clipping. Use it for
  any slot with variable-height content.

## 8. Two-copy divergence (as of 2026-08-19)

`M_Music/music_module.html` (embedded, this repo) and `bd_M_ABC/music_module.html`
(standalone) share the grid but **no longer share the styling**. Reconcile
deliberately, don't diff-and-merge blind:

**Converged 2026-08-19** (BD `54ae973`, standalone `02b8cae`): Play/Stop is the
light-green/light-red pair in both again, and **Copy .abc, Save wav and Save
midi now exist in both**. The two files' JS is identical bar declaration order;
what is left is styling only.

| | Embedded (BD) | Standalone (`bd_M_ABC`) |
|---|---|---|
| Typeface | Georgia serif + Courier steppers | Arial sans throughout (serif only on preview's gold title) |
| `grid-template-rows` | `auto 1fr auto` | `minmax(80px,auto) minmax(136px,auto) 1fr` |
| Panel depths | none pinned | `.copy-panel` 80px, `.player-panel` 160px + `flex-start` |
| `.big-btn` min-height | 52px | 56px (the panel, not the button, carries the black space) |
| `.dock-slot` border | `1px dashed rgba(255,255,255,.35)` — visible reserved box | `1px solid transparent` — empty slot reads as free space |
| Dock mechanism | BD `positionExtendPanel` through the iframe chain | preview's local `positionSlots()` / `dockOnto` |

The dock-mechanism row is **intended** divergence (different harnesses). The
other four are the standalone's depth/typeface work not yet ported back — that
is the remaining §4a decision.

**Copy .abc / Save wav / Save midi (both copies, 2026-08-19).**
- `copyViaClipboard(text, btn)` — one helper, both copy buttons: async
  clipboard, then hidden-`<textarea>` + `execCommand`, flash on success.
- **Copy .abc** = `extractScore()` with any surviving `%%bd_` lines filtered
  out, so the clipboard holds ABC an external editor will open. Genuine ABC
  `%%` directives (`%%score`, `%%MIDI`) are deliberately kept.
- **Save wav** hands out the cached bake Blob; **Save midi** renders from the
  score via `ABCJS.synth.getMidiFile(..., 'binary')`, which returns an ARRAY —
  take `[0]`.
- The bake Blob is cached **before** the `BD_MEDIA_BLOB` post. Structured clone
  makes that moot today, but a transfer list would detach the buffer.
- **Downloads inside BD depend on `allow-downloads`** in `#visual-iframe`'s
  sandbox (`index.html:105`); `M_Music/index.html` sets no sandbox of its own,
  so it inherits the grant. Remove that token and both saves go silent.
- Both saves **flash the button**: inside BD `setStatus` relays only real
  errors, so a success line alone is swallowed and the save looks inert.

Verified by direct diff on 2026-08-19 (935/1003 lines and ~122 changed before
the port; 71 changed after), and **all four repos are level with `origin/main`**
— GitHub holds nothing newer than what is described here.

The Save-wav/Save-midi and dock-mechanism rows are **intended** divergence. The
typeface / Play-Stop / grid-rows rows are the standalone running ahead —
**decide whether to port §4a back to the embedded copy** (and whether the BD
Player should read B&W too) before touching Fractal.

## 9. Fractal — TODO

Add the same grid + two dock-slots to `M_Fractal/music_module.html`; the BD side
is free once `/bd_M_Fractal/` is added to the `positionCyEl` src test (§7). Pick
the styling from §4 or §4a per the §8 decision first, so Fractal doesn't become
a third variant.
