# Session notes — 2026-09-01

Copy brought in line with one-tap; chunked presentation retired; Gateways
re-parented; the splash rebuilt; and three faults found in the curation write
path, one of which was silently destroying node text.

Ended at **`viewer.js?v=763`, `style.css?v=444`**, canary **green**, branch
`remote-graph-view`.

---

## 1. Instructions that described gestures that no longer exist

Under `UNIFIED_FOCUS` (the default) a non-Root node opens its text AND expands
its neighbourhood on one tap, and `advanceOrNavigate` returns immediately on any
re-tap. So every "tap once more" hint named a gesture that does nothing.

`getChunkHint` now **suppresses** them rather than rewording — there is no second
gesture to name, so any wording would be wrong. Root and `?uf=0` keep the
original strings; there the extra tap is still real. `CHUNK_HINT_NO_MORE` stays
in all modes: a dead end is a fact about the graph, not an instruction to tap.

Three stale copies in the DB went with it — the Conversations retrace line ("Back
button (top left) or use the breadcrumbs below" → the Local button),
`helper-nav-hint` (entirely a description of the two-tap rhythm), and Settling's
hint, which was **stale twice**: it named the retired gesture AND pointed at the
node you were already standing on.

Every remaining `%%bd_hint` now names a DIFFERENT node, which is one tap and
true.

## 2. Chunked presentation retired

Root was the last multi-chunk node in the corpus, so collapsing it empties the
mechanism: `%%bd_chunk` appears in **zero** nodes. Its two chunks were joined
into a **single paragraph, not two** — a paragraph break risked the second half
sitting below the card's scroll limit, which is the same disappearance the
chunking caused, just quieter.

**The code change this needed is not cosmetic.** The rule that reveals Settling
when Root reaches its last message lived ONLY on the chunk-advance path, which
requires a second tap. With one chunk the fresh tap returns before reaching it,
so Root would have become a dead end whose card told you to tap a node that was
never shown. The rule now fires at both ends of `advanceOrNavigate`, each
commented pointing at the other.

## 3. The curation write path — three faults, one destructive

Reported as "I saved a layout and it did not restore". **Sv saves TEXT, Wr saves
LAYOUT, and both say "saved".**

**Sv round-tripped the RENDERED card back into the DB and was lossy twice.**
`querySelector('.chunk-text')` is singular, but `%%bd_center` renders a SECOND
`.chunk-text` div — everything after the directive was dropped. And
`.textContent` drops `<<yellow>>…<</>>`, which renders as a span. The
Conversations node came back as its first paragraph alone, silently. Any node
using either feature was one Sv press away from the same fate. Fixed by writing
the actual inverses (`serialiseHighlights`, `readChunkBody`) directly beneath the
renderers they invert. **Rule: a new renderer needs its inverse beside it.**

**The server reported the size of the REQUEST, not the match count.** A relId
matching nothing makes `SET r += h.props` a silent no-op, so a write that stored
nothing answered "saved 8". Now reports matches; the client says "saved N of M —
K not found" when they differ.

**`MATCH ()-[r]-()` returns every relationship TWICE** (verified on this DB), so
the `SET` ran twice — idempotent, hence unnoticed. Any count taken from it reads
double. Directed `->` now.

**And a regression I introduced:** re-parenting Gateways deleted the edge that
carried its view-scoped hints, and added an unhinted child to the Conversations
view. `total=8 hinted=7 mode=hybrid` in the client log. The hinted nodes stay
pinned so nothing was lost, but fcose re-simulates for the newcomer and re-fits
around n+1 nodes — indistinguishable from a failed save. Values recovered from
the pre-flight dump; the Conversations view got a **seeded** position (widest
angular gap, deliberately not the one on the line out to Settling).

## 4. The rings were inverted — and the comment explaining why was wrong

Reported as a thin grey inside a much wider white, where the design says the
opposite. Two hypotheses died to a probe (the state was classified correctly;
`border-position` resolved to `outside`). The decisive measurement was the
bounding box:

    node        border  outline   ring depth over body
    Graphics      3.2     4.0       8.2   (= 3.2 + 4.0 + 1)
    Arts          0.8     2.4       4.2   (= 0.8 + 2.4 + 1)

The constant cancels and the 4.0 difference matches `border + outline` exactly,
which rules out overlap. **With `border-position: 'outside'` the outline begins
at the border's OUTER edge**, so `outline-width: wIn + wOut` put every pixel of
the intended-hidden padding into the white band — 4.0px where the design says
0.8, five times too wide and wider than the inner ring it sits against.

`HALO_THIN` also went 0.5 → 0.8: at 0.5 the resting ring fell under one device
pixel once zoomed out. **There is no intermediate for the resting ring alone** —
the four widths are one ladder off that number, and 1.0 is exactly where their
centre sits.

## 5. Smaller items

- **Pair button waits for the Local button**, keyed to the SAME signal so the two
  cannot drift. A LATCH, not a mirror — `show` can fall back to false and a Pair
  button vanishing mid-pair is worse than one arriving early. Hidden in the
  MARKUP, not at boot, so there is no frame where it flashes.
- **`--bd-gold` 50% → 46% lightness** (`#BFAC40` → `#b09e3b`). One line, as the
  variable was created for. The root node's `#FFD700` is a separate literal and
  stays bright.
- **History cards 0.6 → 0.78.** The dimming is on the whole card, so at 0.6 the
  head colours faded with the text and the panel read as switched OFF rather than
  as past. Also: cards were created at `volume: 0.85` and corrected to 1 on
  placement, so every arrival faded UP.
- **Intermittent tiny-graph on first load.** `cy.fit` frames into the size
  cytoscape has CACHED. A `ResizeObserver` on `#cy` now catches every late settle.
- **Paired-success helper** extended with the shared-navigation explainer. Only
  accurate as of the ring fix.

## Open at end of session

| item | note |
|---|---|
| Gateways position | SEEDED, not curated. Drag + **Wr** in the Conversations view. |
| `BD_GRACE_MS` | still 5000, the development value. 65000 before real use. |
| Root welcome length | now one paragraph; check it clears the card's scroll limit on a phone. |
| `octagon` collision | Conversations and section titles share it. They never co-occur — yet. |
| Chunk machinery | dormant, not gone. `splitNodeChunks`/`getChunkHint` still carry `%%bd_hint`. |
| Stale BARE layout hints | 166 edges. Unchanged from before. |
