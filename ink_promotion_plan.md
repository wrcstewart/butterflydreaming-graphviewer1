# Promoting the achromatic model to default — plan for review

2026-09-04. **No code or migration yet.** This is for checking over first.

---

## The premise needs one correction

The speech work was **not** integrated into the coloured node model. It is not
integrated into either model — it has no colour-model coupling whatever:

    INK_MODE references in the speech code : 0
    inkify / inkPurity in the speech code  : 0

Speech touches text, audio and the media bar. It never reads a node's colour. So
**"integrate the speech work into the grey/white version" requires no work at
all** — it already runs identically under `?ink=1` and without it. Worth
confirming by ear once, but there is nothing to port.

The real task is the other half of the sentence: making the achromatic model the
main one.

## What "promotion" actually costs

Mechanically, almost nothing. The flag is three references:

    const INK_MODE = new URLSearchParams(location.search).get('ink') === '1';
    …
    return INK_MODE ? base.concat(inkModeOverrides()) : base;

`inkModeOverrides()` appends about ten selectors to the base stylesheet. Flipping
the default is one line, and there is an exact precedent in the codebase for how
to do it — `UNIFIED_FOCUS` defaults ON and is opted out of with `?uf=0`:

    const UNIFIED_FOCUS = (() => {
      try { return new URLSearchParams(location.search).get('uf') !== '0'; }
      catch (_) { return true; }
    })();

So `?ink=0` becomes the escape hatch, mirroring a pattern already proven here.

**The cost is not the flip. It is that every colour decision made against the
coloured model becomes untested.** Those decisions were made over weeks, some of
them by ear and eye against a background that is about to change.

## Stage 1 — flip the flag, keep the escape hatch

One line, plus a comment explaining that the default inverted and why. `?ink=0`
must keep working throughout; it is the only way to compare the two while
judging, and the only way back if something is wrong on a phone at an
inconvenient moment.

Nothing else changes in this stage. Deliberately: a one-line change that can be
reverted in seconds is a good place to discover what breaks.

## Stage 2 — walk every view and look

This is the actual work, and it is looking rather than coding. The views that
each exercise different style paths:

| view | what it tests |
|---|---|
| Root splash | the 110px gold root and the round-triangle Settling |
| Conversations | the octagon, six Family circles, the white Gateways circle |
| a Family | family colours, now carried by labels rather than bodies |
| a Cluster | `inkify()` and `inkPurity` on cluster labels — the most complex path |
| a gateway | section titles, the seq grid, title octagons |
| a reading view | the reading spine, successor arrow, `MARK_LOCAL` amber |
| a route view | the route ramp, `RING_ROUTE_MIN` |
| paired, two devices | the whole ring ladder: 0.8 / 1.6 / 2.4 / 3.2 |

**The last one matters most**, because the achromatic rings were designed for
exactly this and have only ever been judged with `?ink=1` deliberately switched
on — never as the thing you simply arrive at.

## Stage 3 — two design questions the flip will raise

Neither is a bug; both are choices that only become visible once the default
changes.

**The corner controls stay coloured.** `paintNodeButton` paints Local / Remote /
Common with the node's own colour and picks black or white ink by measured
luminance. Against achromatic nodes those buttons become the loudest colour on
screen. That may be right — colour still means content, and the buttons are
where content is named — or it may look like a leftover. It cannot be judged
until the nodes around it are grey.

**The base stylesheet's colour work becomes dead weight.** It still paints
coloured bodies and type borders, which `inkModeOverrides()` then zeroes. Leaving
it costs nothing and keeps `?ink=0` working. Removing it is tidier but forecloses
the comparison. **Recommend leaving it until the achromatic model has been lived
with for a while** — the option to go back is worth more than the tidiness.

## Stage 4 — the branch question, which is separate

`remote-graph-view` is **180 commits and 33 files** ahead of `main`. That is a
merge decision in its own right and should not be entangled with a visual
default.

Recommended order:

1. Flip and verify **on the branch**, where `?ink=0` exists and `main` is still
   untouched as a fallback.
2. Merge to `main` once, as a single deliberate act, when the achromatic default
   has been used enough to trust.

Merging first and flipping after would mean judging the new default with no
stable fallback, which is the wrong way round.

## Stage 5 — speech, for completeness

Nothing to do. Two checks only:

- `grep -c INK_MODE` over the speech functions stays at 0 after the flip
- listen to one node under `?ink=0` and once without, to confirm they are
  identical

If speech ever *does* need to know the colour model, that is a design smell worth
questioning rather than accommodating.

## Risks worth naming

**The reduced-colour-vision argument runs in favour of this change**, which is
easy to forget while worrying about it: an achromatic model that carries state in
luminance and width rather than hue is better suited to the author than the
coloured one, and the ring ladder was built on that principle.

**The unknown is the cluster views.** `inkify()` with `inkPurity` is the most
elaborate colour path in the codebase, and cluster labels carry blended family
colour at reduced saturation. That is where a change of ground is most likely to
produce something illegible, and it should be looked at early rather than last.

**A phone in daylight is the real test.** Achromatic designs that read well on a
desktop can lose their state distinctions outdoors, and the ring widths are
fractions of a pixel apart at the resting tier.
