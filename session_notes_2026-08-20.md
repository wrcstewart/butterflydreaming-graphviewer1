# Session notes — 2026-08-20

Continues `session_notes_2026-08-19.md`. Kolam player chrome, then a run of
small standalone fixes. **Desktop is the open item** — see §5.

## 1. Kolam player chrome — settled by measuring, not by thresholds

The whole day-and-a-half detour came from one structural mismatch: **Kolam
switches internal layout on its own IFRAME width (500px), while BD's chrome
keyed off the WINDOW width** (767 for the right-reserve and the arrows, 1024 for
the Extension panel). Those agree only at phone sizes, so every window produced a
different arrangement and resizing walked through all of them.

Three attempts to fix it responsively were all reverted (`d8f0781`): a centred
panel-width column, a virtual phone iframe for the module, and a device frame
around the whole app. What worked was deleting the thresholds:

- Extension panel: horizontal strip under the canvas at EVERY width. Kolam is
  excluded from the legacy desktop early-return.
- ↓↑ arrows: left of the stepper column at every width, positioned from the
  column's **live rect**. The old `right: 116px` constant assumed the small
  layout's 108px column.
- The module reserves the bands the chrome needs (44px right, 52px bottom), so
  there is somewhere for them to go in the landscape layout too.

Full rules and the gotcha in the [[kolam-player-chrome]] memory.

## 2. The feedback loop — worth internalising

`positionCyEl` anchors the iframe to the bottom of `#chat-panel`; the Kolam
branch grows `#chat-panel` down to the canvas top. Grown pane → lower anchor →
shorter iframe → smaller, lower canvas → deeper pane. One pass per event hid it
for weeks. Adding settle re-runs for the rotation bug turned it into a runaway.

**Two lessons.** Any "grow A to meet B" needs checking whether B depends on A —
if so, measure A's natural state. And re-running a layout function more often is
only safe if it is idempotent; prove the fixed point first.

## 3. Handover audio

Both players now stop their own track before handing over. The BD→standalone
direction needed an explicit call because **`window.open` does not fire
`pagehide`** on the opening tab — the asymmetry that made one direction work and
the other not. Details and the diagnosis trail in [[handover-audio]].

The first attempt broke the jump entirely: a bare cross-scope call threw, the
enclosing promise swallowed it, and the button silently did nothing. Found in
`/private/tmp/bd_server.log` — the rejection carried the line number.

## 4. Small standalone fixes

- **ABC**: invite strapline removed and the panel pinned to its grid cell so its
  bottom aligns with the output panel (`85db096`). Script panel 16→13px with
  `:focus` restoring 16px — see [[feedback-ios-input-zoom]] for why that dodges
  the auto-zoom. Made editable again (`b824a91`), reversing the 2026-07-15
  readonly on [[consent-model]] grounds.
- **Fractal**: same invite fix, plus a 6px content lift done as a relative
  offset rather than padding — padding would add to the height a pinned,
  `overflow:hidden` panel needs, so it would clip rather than lift (`f7eabec`).
- **Kolam standalone**: Edit button became a standing label + Off/On button, so
  the state is carried by a word rather than an amber tint (`056dce7`). Media bar
  nudged 20px left.

## 4a. The FSA invite panel — an empty slot inherits its height

Reported as two panels collapsing on medium/large desktop windows; it was one
cause. `#bd-ext-slot` is an EMPTY div sharing grid row 3 with the output panel,
so the row's height is the output panel's height, the empty slot stretches to
it, and the invite panel (pinned to the slot since `f7eabec`) inherits it at one
remove. Past ~740px of module width all four output buttons fitted on one line,
the row halved 85 → 46px, and Copy Link was clipped off the bottom.

Fixed by holding the output buttons at two per row (`6ab4695`), so wide
reproduces the wrapping narrow already had. Modelled 500–1600px first to prove
the row height is **unchanged at every width that was already right** — the
user's explicit constraint. A `min-height` on the slot was the ranked fallback
and is still available; it was second because a floor has to be measured against
the layout you must not disturb, and my 85px was arithmetic, not a measurement.

Full rule in `music_player_layout_spec.md` §3a and the [[music-player-layout]]
memory.

## 5. Open: desktop

BD's desktop Kolam player is usable but not designed — the module renders in its
landscape layout at whatever width the window gives it. Everything in §1 makes
the CHROME behave at every width; it does not make the desktop layout good.

If picking this up: the honest options are a device frame done properly (the
idea was sound, the execution was not — it broke several things and was
reverted), or accepting BD as phone-first and leaving desktop as a functional
fallback. Do not attempt a third round of per-element responsive tuning.
