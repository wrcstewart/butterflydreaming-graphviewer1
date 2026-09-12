# Planning register — design docs and how far each is built

**Created 2026-08-23. Updated 2026-09-12** — eight designs added, two statuses
corrected against the code, one open item closed.

Companion to `DOCS_INDEX.md`, which says what every
file in the repo *is*. This one covers the **design and planning documents
only**, and answers the question the index does not: *how much of this is
actually built?*

A spec that says "design, not yet built" may be half-implemented; one that says
nothing may be finished. Where possible the status below is **evidence-based** —
a named symbol found or not found in the code — rather than taken from the
document's own header.

Keep this updated when a design moves. A stale register is worse than none.

---

## Status vocabulary

| | |
|---|---|
| **Built** | Implemented and in use. |
| **Built, doc stale** | Implemented, but the document describes an older state. |
| **Partly built** | Some of it exists; named gaps remain. |
| **Design only** | Nothing in the code yet. |
| **Planning only** | Deliberately not for implementation — thinking, not a queue item. |
| **Superseded** | Replaced by something later. |

---

## At a glance

| doc | date | status | evidence |
|---|---|---|---|
| `editing_spec.md` + `corner_controls_plan.md` | 08-27 | **Built** (v0.2 corner controls) | `#gn-btn`/`#bn-btn`, `gnStack`, `gn_mark`, `paintNodeButton` |
| `stable_id_spec.md` | 08-21 | **Built** | `nodeId()`, url-keyed ids throughout |
| `blue_node_spec.md` | 08-21 | **Built** (partly untested) | `showBlueNode`, `renderMarks`, `markBlueEdges` |
| `edge_model.md` | 08-22 | **Reference** (not a plan) | describes as-built |
| `work_views.md` | 08-31 | **Reference** (not a plan) | gateway/title/passage views, as-built |
| `unified_focus_spec.md` | 08-16 | **Built**, default ON | `UNIFIED_FOCUS` ×5 |
| `cc-hint-system-spec.md` | 06-12 | **Built, doc stale** | `hint_x_*`, `write_hints` ×9 |
| `cards_spec.md` | 07-15 | **Built, doc stale** | `createCard`, `card-head` ×23 |
| `communications.md` | 07-15 | **Built** | `buddy_card`, `prependPartnerCard` ×10 |
| `music_player_layout_spec.md` | 08-19 | **Partly built** | ABC done; see below |
| `SR_Editor_Rules_v0.1.md` | 08-13 | **Built** (separate page) | `sr_editor.html` |
| `bot_context.md` | 06-24 | **Partly built** | `stripBotBlocks` etc. ×5 — despite "not yet built" |
| `convergence_node.md` | 06-28 | **Design only — idea absorbed** | 12 `convergence` hits in `viewer.js`, but all are Explore vocabulary ("a recorded convergence" = a GN mark). This doc's own design was never built. *Corrected 09-12: the earlier "zero hits" evidence is stale and reads misleadingly.* |
| `BD_Viewer_Scaling_Brief.md` | 08-23 | **Planning only** | nothing scheduled, by intent |
| `speech_plan.md` | 09-04 | **Built** (stages 0–1, shipped) | `piper_direct.js`, `speakReady` ×7 in `viewer.js` |
| `voice_training_pipeline.md` | 09-06 | **Built** (first fine-tune) | `voices/bd_will_01.onnx` present |
| `ink_mode.md` | 08-28 | **Built, now DEFAULT** | `get('ink') !== '0'` — `?ink=0` is the escape |
| `ink_promotion_plan.md` | 09-04 | **Partly built** | stage 1 done (above); stage 2, walking every view, open |
| `remote_view_spec.md` | 08-31 | **Built**, colour scheme superseded | `gn_mark`/`#gn-btn` ×13; achromatic model replaced its ladder |
| `DeepLinking.md` | 09-12 | **Reference** (not a plan) | measurements; two experiments reverted |
| `speech_lexicon_draft.md` | 09-04 | **Design only** | explicitly a draft for checking by ear |
| `corner_controls_plan.md` | 08-28 | **Partly built** | breadcrumb bars retired (`BREADCRUMB_BARS = false`); offer/accept/lapse retirement open |

---

## Detail

### `stable_id_spec.md` — Built (2026-08-21)

Node ids are the durable `url`, not Memgraph `elementId`. Done and load-bearing.

**Watch:** `nodeId()`'s fallback to `getElementId` is *not* dead code — 42 edge
rows have url-less orphan endpoints. No **node** id may come from
`getElementId`; edges may.

---

### `blue_node_spec.md` — Built, partly untested (2026-08-21)

The partner's position drawn as a haloed node on your own graph, replacing the
old `#buddy-latest` panel.

**Built and confirmed:** arrival halo, retirement of the previous marker,
`n_r` badge clearing the rings, the arrival pulse, the radial-gradient rim,
suppression at the top-level views, fixed bottom-right placement, 0.75 opacity
for a revealed node.

**Open:** a thin dark line between the white and blue rings when both marks
coincide — overlapping the strokes did not clear it. Next suspect is the blue's
0.4 outline-opacity darkening toward its edge, i.e. a colour problem, not a
geometric one. **Do not tweak the offset again.**

**Untested:** blue edges (they were a no-op until 2026-08-22), the Snap's
mirrored ring orders, and iOS generally.

**Correction the spec itself needs:** §4 of the scaling brief prescribes
`cy.getElementById(id).length > 0` as the halo/corner test. Every node is
permanently resident, so that is never 0. The correct test is `.visible()`.

---

### `edge_model.md` — Reference, not a plan (2026-08-22)

Not a proposal; a description of how the graph actually works, written because
the same wrong assumption recurred twice. Establishes that **no simulated-edge
system exists** — the whole corpus is resident from boot — and that the
technique being remembered was real and retired before this repo's history.

Read before touching anything edge- or layout-related. §6 carries the measured
cytoscape 3.34.1 rendering facts, two of which are the opposite of their CSS
namesakes.

---

### `unified_focus_spec.md` — Built, default ON (2026-08-16)

One tap shows text and neighbourhood together. `?uf=0` restores the legacy
behaviour.

**Consequence worth knowing:** it retires chunk-advance for non-root nodes, so
`readingState.chunkIndex` never leaves 0. Nothing is lost today — no node in
the corpus carries `%%bd_chunk` — but the chunked-UX machinery is dormant
rather than removed, and would need this guard revisited to work again.

---

### `cc-hint-system-spec.md` — Built, doc stale (2026-06-12)

Manual position-hinting, built and in use.

**Two changes the doc predates:**
1. **2026-07-23** — hints became per-edge *and* per-viewing-parent
   (`hint_x_<parentUuid>`), fixing cross-view clobbering.
2. **2026-08-22** — Cluster parents now **ignore** the bare pre-scoping keys.
   Measured: not one of the 126 clusters had hints scoped to itself, while 59
   were being dragged out of the clean layout path by a stale bare value left
   by a Family view. Family views still use the fallback and still need it.

---

### `cards_spec.md` — Built, doc stale (2026-07-15)

Self-declares as-built at `viewer.js?v=331`; the viewer is past v600. The
*shape* is current, the detail is historical.

---

### `communications.md` — Built (2026-07-15)

The buddy channel. Self-declares "design, largely built"; the code says built.

**Fact with design consequences:** `buddy_card` is **pure pass-through with no
server persistence**. A reload loses everything the partner sent, with nowhere
to recover it from. This is the strongest argument for the draft-persistence
work in the scaling brief's `CC.7`.

---

### `music_player_layout_spec.md` — Partly built (2026-08-19, v0.2)

Shared panel-grid for media modules; the module owns a CSS grid with two empty
dock-slots and BD mirrors its chrome onto them.

**Done:** ABC embedded and standalone; Fractal embedded and aligned.

**Open:** desktop docking (`positionExtendPanel` early-returns above 1024px);
Kolam and any module lacking the slots still use per-module fallbacks.

**Trap:** an empty dock slot has no height of its own — its height comes from
the panel sharing its grid row. Read §the dock-slot gotcha before pinning
anything to one.

---

### `SR_Editor_Rules_v0.1.md` + `BD_SR_Editor_Design_Notes_v0.1.md` — Built (2026-08-13)

Speech-recognition editor, living at `sr_editor.html` — a **separate page**, not
part of the viewer. Whisper via transformers.js, AudioWorklet PCM capture.

---

### `bot_context.md` — Partly built, despite its own header (2026-06-24)

Self-declares "design, not yet built", but the viewer carries
`stripBotBlocks` / `unnormalizeBotBlocks` and a curator-view fork on bot blocks
— 5 references. So the **rendering** side exists; the authoring flow is what
does not.

A good illustration of why this register is evidence-based: the document's own
status line is wrong in the direction that matters.

---

### `convergence_node.md` — Design only (2026-06-28)

Paired-discussion convergence node. **Zero references in `viewer.js`** — nothing
is built.

Relevant now: this is the nearest existing thinking to the imminent
**pair-agreed-edit** work (saving a pair's agreed edit as a new node). Read it
before designing that, and expect to supersede it.

*Was untracked until 2026-08-23 — existed only on one machine.*

---

### `BD_Viewer_Scaling_Brief.md` — Planning only (2026-08-23)

Whether the viewer scales. **Nothing scheduled, by intent.**

The `CC analysis` section corrects the brief's central premise — the viewer
neither accumulates nor replaces, it loads the entire corpus at boot — and
holds three measured findings worth acting on eventually, in value order:

1. Each node is sent once per incident edge (mean 12.6×). Deduping is a
   query-level change with no behavioural effect.
2. `raw_text` is byte-identical to `text` in 198 of 198 nodes carrying both.
3. Text could be fetched on open rather than at boot.

Together ~50×, turning a projected 405 MB boot at 100× corpus into ~8 MB.

**`CC.7` is the only present-tense item in the whole document** — draft loss on
tab reload — and it is unimplemented. It arrives by backgrounding, not by
memory pressure, so it needs no scaling wall to bite.

**`CC.9` lists what the pair-agreed-edit work will invalidate.** Re-read before
acting on any of it.

---

## What is genuinely open, in one place

Not a schedule — a list of what has been designed and not built.

| item | where | note |
|---|---|---|
| Draft/panel persistence across reload | brief `CC.7` | Present-tense risk. Design complete, including the `pagehide` trap. |
| ~~Retire breadcrumb bars + panel above canvas~~ | `corner_controls_plan.md` §6 | **DONE** — `BREADCRUMB_BARS = false` at `viewer.js:468`. Verified 2026-09-12. |
| Retire explore offer/accept/lapse | `corner_controls_plan.md` | Superseded by GN-on-BN-click; spans client and server. |
| Explore: reconnect behaviour | `editing_spec.md` §10 | Acceptance dialog is moot — the negotiation is going. |
| Pair-agreed edit → SAVE a new node | — | The Explore ceremony is its front door. Consent vocabularies deliberately kept apart. |
| Boot-payload dedupe + drop `raw_text` | brief `CC.4` | Two easy wins, no behaviour change. |
| Fetch text on open | brief `CC.4` | Moderate; needs a small endpoint. |
| Desktop docking for media modules | layout spec | `positionExtendPanel` early-returns above 1024px. |
| Bot authoring flow | `bot_context.md` | Rendering exists; authoring does not. |
| Blue Node ring seam | `blue_node_spec.md` | Colour problem, not geometry. |
| Delete stale BARE layout hints | `cc-hint-system-spec.md` | 166 edges (162 DESCENDS_FROM, 3 CLUSTER_REL, 1 CONTAINS). They route views down the wrong `runLayout` branch — three incidents so far. The Cluster reader already ignores them; deleting is a data change. |
| Selection rule for capped neighbourhoods | brief §5 | Curation/ethics question. Affects 15 of 105 clusters. |

---

## Added 2026-09-12

| item | where | note |
|---|---|---|
| **JSP — "just send parameters"** | `DeepLinking.md` | Designed, not built. Positional parameter arrays instead of `%%bd_` directive text: Kolam 650→181 chars, Fractal 822→188, ABC 664→266. A 3-node collage of saved nodes is **87 chars** against 1,730 today. **Version the format from day one** — the exact lesson of the `name` field. |
| **Collage module** | `DeepLinking.md` | Not built, no repo. Blocked in its current shape: a 3-node collage inline is **8,276 chars** and fails GitHub Pages' ~8 KB request-line limit **on a button press**, sharing not involved. |
| Deep links unclickable in Apple native apps | `DeepLinking.md` | Links are ~686 chars against a **659-char** data-detector cap. Email and the address bar are unaffected. Four fixes ranked in the doc; the fragment move and the rich-`<a href>` clipboard were both built and **reverted**. |
| Pronunciation lexicon | `speech_plan.md`, `speech_lexicon_draft.md` | The live edge of the speech work. The draft needs checking by ear — the corpus mixes Legge's 1891 romanisation with modern pinyin. |
| Ink promotion stage 2 | `ink_promotion_plan.md` | Walk every view under the achromatic default. |
| `MEMORY.md` index discipline | — | The index hit 29 KB against a ~24 KB load limit on 2026-09-12 and was being truncated. Trimmed to 15 KB by moving detail into topic files. **Keep entries under ~230 chars.** |

## Verified still open (2026-09-12)

Re-checked against code and the live DB rather than carried forward on trust:

| item | evidence |
|---|---|
| Delete stale BARE layout hints | **166 edges** still carry `hint_x` — unchanged since 08-23. |
| Drop `raw_text` duplication | No references in `server.js` or `viewer.js`; the duplication is DB-side only, so this is a migration, not a code change. |
| Desktop docking for media modules | `positionExtendPanel` still early-returns above 1024px. |
