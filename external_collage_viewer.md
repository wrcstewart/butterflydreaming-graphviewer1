# External collage viewer — design thinking

**Status: MULLING. Nothing built, nothing decided.** Recorded 2026-09-13 so the
shape of the idea survives, not as a specification.

---

## The idea

A public-facing player, opened by URL, that displays a **collage** — text, music
and graphics drawn from BD — to someone who is not a BD user. Call them the
external user (UE).

- Material comes from **saved nodes**, so in principle it is reachable from node
  **ids** alone.
- UE controls are deliberately **superficial**: volume, opacity. **No saving.**
- How the source ids get selected is **TBA**.
- Content would come from the BD database **via the server** — websocket or POST
  — rather than being carried in the link.

## The model shift, which is the important part

> **BD designs the experience. The external players are viewers.**

That is **not** the current model. Today's standalones (`bd_V_Kolam`,
`bd_M_ABC`, `bd_M_Fractal`) are *editors*: they take a script, let you change it,
and hand it back through a return link. The collage viewer inverts that — it
receives an arrangement and presents it, with no path back.

Worth being explicit about, because nearly every existing mechanism (Copy BD
Link, Enter BD, the `?j=` return leg, `%%bd_` round-tripping) exists to serve
the editor model and has no counterpart here.

## The question the author is holding open

**What does the external collage give that BD does not already?** Candidate
answers, none settled:

- more screen real estate
- fewer controls — presentation rather than instrument
- an intermediate level of integration into nicer XR viewers

This is the right question to keep asking. If the answer stays thin, the honest
conclusion may be that the collage belongs *inside* BD.

## Constraints already established that bear on it

**Fetching from the server reintroduces the laptop dependency.** Everything
built to date deliberately avoids it: a self-contained link works when this
machine is off, which is why a cloud store was considered and rejected (see
`DeepLinking.md`, "DECIDED 2026-09-12"). A viewer that pulls content from BD's
server is dark whenever BD is. For a public audience that is a different
proposition from a link shared between two people — worth deciding
*deliberately* rather than inheriting.

**Ids are cheap, content is not.** A three-node collage of saved nodes encodes
to **87 chars** as ids, against 1,730 inline. So id-based selection is not only
possible, it is dramatically the smaller option — if the receiver can resolve
them, which is exactly what routing through the server buys.

**Some media cannot travel by link at all.** An ABC score is ~75% irreducible
content; an actual recording (`A_GreatWall.mp3`, 57 MB) is out of the question
by any encoding. If the collage is to carry audio recordings rather than
generated music, the server route stops being a choice and becomes the only
option.

**The 659-char ceiling applies to whatever URL a person is given.** Apple's data
detector truncates plain-text URLs past it. An id-based collage link is far
under; an inline one is not.

## Deferred, and related

**`?n=<uuid>` for BD self-links** — when the panel text is identical to the
node's stored text, the payload carries nothing the receiver lacks, so the id
alone suffices: **999 chars → 72** on the measured Whitman example. Applies to
every node type, not just text, and to BD→BD only: a standalone has no corpus to
resolve an id against. Deferred 2026-09-13 pending the author's table of what
each button does in each context, so it can be designed against the full set of
cases rather than one.

Caveat if built: BD deliberately overwrites `node.data('text')` on a deep-link
arrival, so a node that received an edited version earlier in the session would
compare "unchanged" against that shadowed text and silently ship the database
version instead. Mark locally-shadowed nodes and never send `?n=` for them.
