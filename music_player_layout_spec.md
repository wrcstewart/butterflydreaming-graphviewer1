# Music-player layout — spec (v0.1, 2026-08-18)

Status: **reference / pre-implementation.** A single, principled layout for the
media-module players (ABC first, then Fractal — same layout). Supersedes the
ad-hoc per-module mobile patching. Red-line this before build.

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
- **D3** ✅ Desktop side-quarters **blank** (page background) for now.
- **D4** ✅ **Finish ABC** on the new skeleton first, then point Fractal at it.
- Grid pairing (Output bottom-right of the ⅔, Ext bottom-left, arrows slot =
  full stepper-column width directly above the steppers) — ✅ confirmed.

## 7. Implementation status (2026-08-18)

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

**ABC desktop — TODO** (next): constrain the iframe to the panel-width column +
centre it (leaving the side quarters blank), and let the dock-slot mirroring run
above 1024px (`positionExtendPanel` currently returns early on desktop).

**Fractal — TODO after ABC desktop:** add the same grid + two dock-slots to
`M_Fractal/music_module.html`; it inherits the BD side for free.
