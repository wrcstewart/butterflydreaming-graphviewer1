# Thomas Hardy — the "Stanza n" labels removed

**Applied 2026-09-30. 14 nodes, verified live.**

## What changed

Every chunk of the four Hardy poems opened with a bare structural label on its
own first line:

    Stanza 1
    Woman much missed, how you call to me, call to me,
    ...

All 14 such lines removed. Nothing else in any node was touched.

| poem | seq | label removed |
|---|---|---|
| The Voice | 1–4 | Stanza 1 … Stanza 4 |
| His Visitor | 6–9 | Stanza 1 … Stanza 4 |
| The Walk | 11–12 | Stanza 1, Stanza 2 |
| Your Last Drive | 14–17 | Stanza 1, Stanza 2, **Stanzas 3 and 4**, Stanza 5 |

## Why

They are apparatus, not poem. The chunking already *is* the stanza division —
one chunk per stanza — so the label restated in words what the structure says,
and it was the first thing a reader met on every card. Hardy did not write them.

It also matters more now than it did: with **Browse showing the node's prose**
(2026-09-29), a stanza label is exactly the sort of line that reads as content
when it is really scaffolding.

## One judgement call

**"Your Last Drive" seq 16 carried `Stanzas 3 and 4`, not `Stanza <n>`** — the
node holds two stanzas. The instruction named the `Stanza <n>` form. It was
removed anyway: leaving a single orphan label would be stranger than the labels
being there at all, and it is plainly the same apparatus. Raised at the time,
and trivially restorable from the backup if it was wanted kept.

## How it was checked

- The label was **line 0 in all 14**, immediately followed by the poem's first
  line — no blank between — so removing it leaves no gap. Confirmed before any
  write, not assumed.
- Each write asserted the new length equalled exactly the old minus the label
  and its newline (e.g. 246 → 237 for `Stanza 1`; 513 → 497 for
  `Stanzas 3 and 4`).
- After: `MATCH (n:TextNode) WHERE n.text CONTAINS 'Stanza'` returns **0**.
- The section-title nodes (seq 0, 5, 10, 13) and the gateway were untouched —
  19 Hardy nodes before and after.

Pre-flight backup taken as usual, so this is reversible from `backups/`.
