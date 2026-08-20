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

## 6. Enlarged remote breadcrumb (evening)

The remote trail is the one thing a user cannot zoom, and where the partner is
sits at the centre of the conversation — but the chips are 23px and often
abbreviated to a bare sequence number. `#buddy-latest` restates the newest one.

**It is a third cytoscape instance**, `buddyLatestCy`, not a styled div. It
shares `buildStyle()` with the two strips, so the node is drawn by the same
code and cannot drift when node styling changes. The node is added WITHOUT the
`.breadcrumb-chip` class — that class is what shrinks chips to 63×18/8px, so
omitting it renders the node at its natural per-type size, and the instance's
fit does the enlarging. It shows the **unabbreviated** name; the chip may be
just a seq number, and an enlarged "7" is still a 7.

Behaviour mirrors the chip it copies: taps through via `handleNodeTap`,
persists until the next arrives, dims (not vanishes) with the trail on
`buddy_disconnected`, clears on a new pair, hidden in Player mode.

Sizing settled at **162×55 desktop / 108×37 phone** with fit padding 3. The
padding mattered more than it sounds: at pad 7 the phone size renders a 6.8px
label, BELOW the 8px the chip uses — the panel would have been a shrunken chip
in a box. At pad 3 it is 8.5px with the node at 102×29 against 63×18, so on a
phone the enlargement is mostly in node SIZE, not text size.

**Gotchas banked:**
- The container starts `hidden` and cytoscape measures a `display:none` element
  as 0×0 — unhide BEFORE the first resize/fit or the node lands off-canvas.
- **iOS never fired the tap.** Cytoscape binds its own touch handlers to the
  container and preventDefaults them, so no synthesized click reached a
  container listener — it worked with a mouse and not on a phone. A transparent
  `.tap-shield` over the canvases takes the tap instead.
- Fit, don't fix the zoom. Node sizes vary by type (TextNode 120×34, root
  100×100); a flat 1.8× clipped root to 180×180 in a 300×66 box.

## 7. Two layout truths found along the way

**Breadcrumb trails now fill from the RIGHT.** `panYouCyToLatest` /
`panBuddyCyToLatest` had `Math.min(0, …)`, which pinned a short trail to the
left and only scrolled once it overflowed — so the newest chip crept rightwards
and only settled when the bar filled. Dropping the clamp right-aligns at every
length. That is also what makes the enlarged copy sit over the chip it
enlarges, which had not actually been true when the panel moved bottom-right.

**The two strips are swapped**: `#cy-buddy` (navy, remote) took the upper slot
at bottom 63, `#cy-you` (mustard, local) the lower at 37, so the navy panel,
navy strip and the gradient's navy foot form one block. That broke a named
lookup — `positionExtendPanel` clamped the Kolam Extension strip against
"#cy-you (the upper breadcrumb strip)", true until it wasn't; it now takes the
higher of the two by measurement. Second time this week a named lookup encoded
a layout assumption that later went stale (the arrows' `right: 116px` was the
other). **Measure, don't name.**

## 8. Chip labels truncate in JS now

Chips were showing the MIDDLE of long names — "arden Wi" for "Garden Wild",
losing a character at the start as well as the end. A trailing ellipsis only
cuts the end, so both ends missing means the label was simply wider than its
63px chip: centred, it spilled each side and the neighbouring chips, drawn
afterwards, painted over the spill. `text-max-width` and
`text-wrap: 'ellipsis'` were not constraining these labels at all.

`truncateChipLabel()` cuts to 13 chars + ellipsis BEFORE the label reaches
cytoscape — deterministic, immune to style precedence or a `text-wrap` value
the renderer ignores. The enlarged copy still receives the full name, which is
now the better justification for that panel than the one it started with.

**Not a regression:** verified the `.breadcrumb-chip` style block was
byte-identical to before this work and the label logic unchanged since
`214f20a`. The wrapping came from `text-wrap:'wrap'` on the base `node`
selector (`b61364e`, for in-node labels on the main canvas) — right there,
wrong in an 18px chip. It only became conspicuous once the trail was
right-aligned and the newest chip stopped drifting.

## 9. OPEN — circular nodes in the enlarged panel

**Undecided, to look at next.** Family (60×60) and Entry (68×68) are circles;
flat nodes are 34 tall. Fitted into a 108×37 phone panel the circles land at
zoom ~0.5 — 31×31, a 5px label, using 29% of the width, and genuinely LESS
readable than the chip they enlarge. TextNode uses 94% and reads at 8.5px.

Proposal on the table: an override class in the panel instance — the mirror of
`.breadcrumb-chip` — forcing every type to one box (~102×30) at one font size,
keeping shape and colour per-type. Cost: Family and Entry render as wide
ellipses rather than circles. Not implemented; the user is thinking it over.

## 10. Also today

- **Cluster-assign behind `CLUSTER_ASSIGN`, default OFF** (`?ca=1` re-enables —
  note the sense is INVERTED from `?uf=0`). Curation work is moving to the
  curator tool. Guarding the two tap handlers was not enough: the tableau
  layout branches on `editModeActive` in six more places, so everything
  assign-related now goes through `clusterEditActive()`.
- **Cluster count badge** clears the node frame at any zoom. It sat a flat 4px
  above the bounding box while the border scales with zoom, so a clicked
  Cluster (4px white border) had zero clearance at 1× and −8 at 3×.
- **Pairing review** for the multi-window tests — see §11.

## 11. Pairing: what governs it (reviewed, not changed)

- The wait queue is a **single slot** (`let waitingUser = null`), so
  "exactly two" is structural: first Join occupies it, second empties it by
  pairing. Four windows give two independent dyads.
- **Same-device pairing is refused** (`server.js:1080`) — two sockets sharing a
  `bd_device_id` cookie get `pair_denied: same_device`. So several windows of
  ONE browser cannot pair with each other. Four different browsers is the
  setup; four URLs are unnecessary.
- **My memory was wrong** and is corrected: there is no connect-time kick any
  more. `server.js:741` records that it broke dyad continuity on return from
  the external player, so it became a pair-time refusal.
- Curation code is **active** (`config.js`, 4 chars) and gates the ARRIVER
  only — whoever completes the pair, not whoever waits.
- Disconnects have a **65s grace period** before the buddy is told.
- **Worth probing:** `ready_to_pair` does not check whether the sender is
  already paired. The UI hides it, but nothing server-side stops a paired user
  re-entering the queue.

## 12. Desktop — working, confirmed 2026-08-20

**Not an open bug.** The user checked the arrows, the Extension strip, the invite
panel and the output panel at small, medium and large windows and confirmed each.
An earlier draft of this section called desktop "open"; that was my unease at
never having seen it, not a defect, and it is corrected here so nobody goes
hunting for a problem that is not there.

What is true is narrower: the desktop layout was never deliberately DESIGNED.
The module renders in its landscape layout at whatever width the window gives
it, and §1's work made the chrome behave at every width rather than making the
layout considered. That is a "someday, if it starts to grate" item, not a fault.

If it ever is revisited, the record matters more than the ambition: a centred
panel-width column, a virtual phone iframe for the module, and a device frame
around the whole app were all tried on 2026-08-19/20 and all reverted
(`d8f0781`). The device-frame idea was sound and the execution was not. What
actually worked was deleting width thresholds and measuring the live layout
instead — do that before reaching for a fourth structural rewrite.
