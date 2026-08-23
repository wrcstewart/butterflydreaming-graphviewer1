# Session notes — 2026-08-22 → 23

46 commits. Blue Node finishing, a long cluster-layout hunt, the scaling brief,
and two new doc indexes.

Canary ended **red** at `viewer.js?v=617`, `style.css?v=296`.

---

## 1. Blue Node — finished and largely confirmed

Spec `blue_node_spec.md`; status lives in the `blue-node` memory.

Working: arrival halo, retirement of the previous marker, `n_r` badge clear of
the rings, arrival pulse (6 cycles ~3.4s, ring only), radial-gradient rim,
suppression on the top-level views, fixed bottom-right placement, 0.75 opacity
on a revealed node.

Fixes worth remembering:

- **`(0)` in card heads** was the zero-based chunk index, permanently 0 for two
  independent reasons: nothing in the corpus carries `%%bd_chunk`, and Unified
  Focus retires chunk-advance for non-root nodes. Replaced with a part number
  computed as `node.seq − sectionTitle.seq` — the user's formula, cross-validated
  against Snow White's hand-authored `(part N)` titles, which agree on every part.
- **Unpair only half-completed.** `bnGone` is declared inside
  `setupInteractions` but was assigned from `init()`; module strict mode made
  that a ReferenceError which silently killed the rest of the handler, so the
  Join button stayed on "Leave". Exposed `markBuddyGone()` instead.
- **Gradient stops are not intuitive**: a node's radial gradient has radius
  `max(paddedWidth, paddedHeight)`, so the node's own edge is at **50%** and
  anything beyond that paints outside the shape. And the gradient must start
  from the *computed* background colour — gateway TextNodes carry `colour: null`
  and get their white from the stylesheet.

**Still open:** a thin dark line between the white and blue rings in the Snap.
Overlapping the strokes did not clear it. Next suspect is the blue's 0.4
outline-opacity darkening toward its edge — a colour problem. **Do not tweak the
offset again.**

---

## 2. The cluster-layout hunt — the expensive one

Reported as "subfamilies exactly on top of each other", then "gateways in a
line", then "still a line", then "no different" three times. Five separate
faults, found in this order:

1. **`preset` moves only what you give it.** The seq-grid branch never
   positioned the Family parents at all; they kept stale coordinates and any
   two that arrived coincident stayed welded, because zero-distance repulsion
   has no direction.
2. **Stale BARE hints.** Not one of the 126 clusters has hints scoped to
   itself; 59 were being dragged out of the clean branch by a leftover
   single-slot value from a Family view. Cluster parents now require scoped
   hints.
3. **`relativePlacementConstraint` pins an EXACT offset**, so every node sharing
   an anchor collapses onto one line. The constraint added to keep gateways
   below the cluster was itself creating the row being complained about.
4. **`ele.position()` returns a LIVE reference.** Pins built from it follow the
   node instead of holding it — `fixedNodeConstraint` was a silent no-op.
5. **A second writer.** `expandToCluster` ended with a `setTimeout(..., 500)`
   that moved every gateway into a row *half a second after* the layout. It
   overwrote fixes 1–4. Its own guard could never fire, so it had been running
   on every cluster expand since it was written.

**The lesson**, now in memory: when a layout looks right and then changes, stop
tuning the layout and grep for a second writer.

Final shape: gateways **seeded and pinned** in a square-ish block (a force
layout cannot give a compact cloud when every node attaches to one anchor — the
result is always an arc); families arranged by fCoSE above; both column counts
chosen against the live canvas; `animate:false` to remove the fit/animation race.

---

## 3. Scale — measured, not modelled

Five rounds of layout fixes were modelled against a **guessed** 380×330 canvas.
The user reported "no different" each time and was right each time. One
forwarded console line gave the answer:

    canvas 430x381 | content 430x362 | pad 11 | zoom 0.947 | fills 95%x90%

The canvas was 430×381 — and **the final `cy.fit` was never running**, so two of
those changes acted through a path that did not execute.

Fixed: `fitPadding` fraction 0.08 → 0.03 (padding was 14% of width and 16% of
height on a phone — exactly the "15% unused" reported); gaps 180/170 → 60; cells
tightened ~15%; the side-shift threshold derived from the gap rather than a
hardcoded 90 that inflated every view by 30px; and the **force branch**, which
is what a TextNode view uses, was padding at a hardcoded 60 — 28% of width on a
phone — now `fitPadding`.

**BD forwards every client console line to `/private/tmp/bd_server.log`.** It
costs about a minute. Use it early — see the `measure-dont-model` memory.

---

## 4. Documents

- **`BD_Viewer_Scaling_Brief.md`** — planning only. The `CC analysis` section
  corrects its central premise (the viewer neither accumulates nor replaces; it
  loads the whole corpus at boot) and records that the real cost is **~19.7 KB
  per TextNode on the wire**, because the boot query returns both endpoints of
  every edge and a node is sent ~12.6 times. `raw_text` is a byte-identical
  duplicate of `text` in 198 of 198 nodes. **`CC.7` — draft loss on reload — is
  the only present-tense risk in it, and is unimplemented.**
- **`DOCS_INDEX.md`** — what each of the ~38 repo docs is.
- **`PLANNING_REGISTER.md`** — how far each design is *built*, evidence-based,
  ending with every unbuilt item in one table.
- Tidied: deleted a byte-identical schema duplicate; `convergence_node.md` and
  `controls_panels_iframe_map.md` were untracked and existed on one machine
  only — now in git.

**`backups/` is gitignored.** The scaling brief was sitting there unpushed.
Never leave a document in it.

---

## 5. Other

- **Session expiry never disconnected** — `showSessionExpired()` only added a
  CSS class, so abandoned tabs held connection slots indefinitely ("7 connected"
  with two people present). Client now disconnects; server has an idle reaper at
  65 min as a backstop.
- **Curation code remembered per browser** in localStorage, cleared whenever the
  server rejects it. **An IP-based auto-grant was rejected**: `cloudflared` runs
  on this host, so every public visitor arrives from 127.0.0.1 and a loopback
  check would publish the code.
- A memory-index write silently failed on a stale anchor while the commit still
  printed `PUSHED` — see `verify-the-effect`.

---

## Open at end of session

| item | note |
|---|---|
| Blue Node ring seam | Colour problem, not geometry. |
| Blue edges, Snap ring orders, iOS | Built, not yet browser-confirmed. |
| Draft/panel persistence | Brief `CC.7`. Design complete, unimplemented. |
| Pair-agreed edit → new node | Next up. `convergence_node.md` is the nearest prior thinking. |
| Hybrid branch padding | Uses 8 where others use `fitPadding` — three branches, three ways. |
| `GATEWAY_LINK` | 9 in the DB, no `buildStyle` selector, drawn in fallback grey. |
