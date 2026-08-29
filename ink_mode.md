# Ink mode — the state-colour scheme

**Branch `remote-graph-view`, 2026-08-28/29. Off by default: `?ink=1`.**

Reference for how the ink scheme works and why, written because three of its
decisions were reached by being wrong first.

---

## 1. Why it exists

**Colour currently encodes CONTENT** — which family a node belongs to. The
remote-graph idea needs colour to encode **STATE**: yours, theirs, shared.

One channel cannot carry both. So the bodies give up their fill, identity moves
to the **label**, and the fill and outline are freed for state. That makes this
the *precondition* for the remote-graph work rather than a cosmetic change.

The user's own observation started it: halos will be overwhelmed once the screen
is full of coloured nodes.

---

## 2. The three parts

### Transparent bodies
`INK_BODY_OPACITY = 0`. Painting them black made every node an **occluder** — an
overlapping neighbour simply vanished, which dense cluster views cause routinely.
With no fill, labels and halos show through one another: an overlap costs
legibility instead of costing a node.

`background-opacity`, **not** `opacity` — the latter would take the label and the
halo with it and would stop the node receiving taps.

**Four selectors needed clearing individually** (gateway white, the Gateways
square, root gold, section-title grey). They set their own opaque fills in the
base sheet and would have survived the generic rule and gone on occluding.

### The label palette — "swatch B"
Six family hues, **luminance assigned rather than normalised**:

| | | contrast |
|---|---|---|
| Symbolic | `#F2DBA3` | 14.2 |
| Spirit | `#F4B2F4` | 11.5 |
| Arts | `#EEA788` | 9.6 |
| Nature | `#1BBD27` | 7.6 |
| Reason | `#5591E7` | 6.0 |
| Emotion | `#E33C38` | 4.5 |

Steps of 1.2×–1.4×, widest separation across the four hues in the **red-green
confusable band** (red, orange, gold, green).

Driven by **hue → target luminance**, not by family name. This is the part that
matters: cluster colours are *blends*, so a six-entry table would have fixed the
six families and left all 126 clusters flat — the majority of what is on screen.
A blend lands between its neighbours' targets.

Swatch at `ink_palette_swatch.html`, with a **luminance-only column**: two rows
that match there cannot be told apart however far apart their hues are.

### The local halo
Every node in your view wears bright amber `#b79d00`, separated by opacity alone:

| | |
|---|---|
| 0.85 | the node you are on |
| 0.65 | the node you came from |
| 0.2 | everything else in your view |

`outline-*` not `border-*`: an outline is stroked entirely outside the shape, so
it never eats a tight label — **and it leaves `border-*` free** for the remote
channel.

**The resting tier lives in the stylesheet**, not painted per node.
`clearMarksFrom` strips inline `outline-*`, so a node that stops being marked
falls back to the resting tier by itself. There is no path to a node with no halo.

---

## 3. Three lessons, each reached by being wrong first

### Equal legibility means equal indistinguishability
The first palette normalised every family to one HSL lightness, reasoning that
this made them equally legible. It did. The user then could not separate Nature
from Symbolic — **9% apart in luminance**, with Reason and Spirit **1% apart**.
For a reading that does not lean on hue, uniform lightness removes the only
channel that works.

### Low saturation is INFORMATION
`inkify` forced every colour to 75% saturation. A six-family blend is 9%
saturated — very nearly grey — so its hue is residual noise, and pushing it to
75% invented an identity the node does not have. Symbolic Action reached 9.9:1
against Nature's 7.6:1. Saturation now scales with purity.

### A colour cannot tell you what it is made of
The **first fix was wrong**: purity derived from the colour's own saturation
dimmed **Spirit** from 11.5 to 8.7, because its family colour is only 19%
saturated. A saturation guess cannot distinguish a six-way blend from a family
that happens to be muted.

Purity is now recorded in `computeBlendedColours`, the only place that knows the
parentage: `1/sqrt(n)`. **It cascades** — Seasons/Cycles has one parent, Living
World, which is itself a four-way blend, which is exactly why it read strong.

| | before | now |
|---|---|---|
| Symbolic Action (6) | 9.9 | 6.5 |
| Living World (4) | ~10.6 | 8.7 |
| two-family blend | ~13.5 | 10.8 |
| every pure family | — | unchanged |

---

## 4. Constants — the whole tuning surface

| constant | value | what it does |
|---|---|---|
| `INK_MODE` | `?ink=1` | the flag |
| `INK_BODY_OPACITY` | 0 | raise for a faint ground |
| `INK_ANCHORS` | 6 pairs | hue → target contrast (swatch B) |
| `INK_SATS` | 0.75… | saturation ladder, most saturated first |
| `INK_NEUTRAL_C` | 4.0 | where a fully blended colour lands |
| `INK_NEUTRAL_SAT` | 0.10 | and its saturation |
| `LOCAL_HALO_W` | 3 | halo extent, px |
| `LOCAL_HALO_CURRENT/PREV/REST` | .85/.65/.2 | the three tiers |

Blends still too loud? `INK_NEUTRAL_C`, or `1/n` instead of `1/sqrt(n)`.

---

## 5. Compatibility with the blue remote channel — assessed, not built

The design extends, on three conditions.

1. **Membership must be CLASSES, not inline styles.** The cascade then does the
   work: `node` → amber, `node.remote-only` → blue, `node.shared` → green.
   `clearMarksFrom` strips inline styles only, so class-based membership
   survives every navigation without being repainted. Painting blue with
   `.style()` would have it erased on the next mark change.
2. **The four existing marks are painted INLINE and will beat any class rule** —
   current, predecessor, BN, GN. That is probably wanted, but it is currently
   precedence by accident. **Move those four to classes too**, before the blue
   work: the whole system becomes one cascade and it deletes code.
3. **A node can be in both views at once**, and one outline can only be one
   colour. Either *priority* (shared → green, losing the shared-and-current
   distinction) or *two rings* — outline = local, border = remote, which is
   already the Snap vocabulary and is why `border-*` was kept free. Two rings
   costs rework of the `border-width: 0` the marks set to stop Cluster borders
   bleeding.

**The real risk is ink, not architecture.** Every node already carries a halo;
add a border for remote membership and a dense cluster view gets very busy. If
it bites, drop the *resting* tiers toward 0.15 rather than abandoning the scheme.

---

## 6. Known consequences not fixed

- **`applyBlueFill` is invisible in ink mode.** It paints the Blue Node's arrival
  rim as a background *gradient*, which a transparent body cannot show. The blue
  halo channel replaces that cue, so it should be re-derived there rather than
  patched. The pulse and the corner button still work.
- `MARK_PREV` (the second, darker amber) is now unused. Left in place — the
  branch is exploratory.
