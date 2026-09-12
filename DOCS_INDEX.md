# Docs index — what each .md in this repo is for

**Created 2026-08-23. Rewritten 2026-09-12**, when the count had grown from 38
to 74 and 19 documents were missing from it.

Organised as **PRESENT** (describes how things are now) · **FUTURE** (designed,
not built) · **PAST** (spent, superseded, or kept only as the record of why).
That division is the point of this file: several documents describe a system
that no longer exists, and a few describe one that does not exist yet.

**A document's own status line is unreliable in BOTH directions.** One that says
"not yet built" may be half-implemented; one that says nothing may be finished.
Where a status matters, `PLANNING_REGISTER.md` carries evidence — a named symbol
found or not found in the code — rather than the document's own claim.

Keep this current when adding a doc. One line is enough.

---

## Start here

| file | what it is |
|---|---|
| **CONTINUATION.md** | **Read first after any break.** Where the work is, what state it is in, and which document answers which question. Written to assume nothing is remembered. |
| **HowToRestore.md** | **Read first if memory is missing.** The out-of-git memory directory, how it is mirrored here, and what else to read. |
| **BD_SYSTEM_OVERVIEW.md** | **The master description of the system as built** — data model with live counts, views, the ring ladder, pairing, every write path, speech. Written to be read without the repo. |
| **DOCS_INDEX.md** | This file — what every document *is*. |
| **PLANNING_REGISTER.md** | What every *design* proposes and **how far it is built**, evidence-based. Read when deciding what to work on. |
| **MEMORY_SNAPSHOT.md** | Mirror of the live memory directory, written by `sync_memory_snapshot.sh` via a Stop hook. **Auto-generated — never hand-edit.** |

---

# PRESENT

## References — how it actually works now

| file | date | what it is |
|---|---|---|
| **edge_model.md** | 08-22 | How relationships reach the graph. **No simulated-edge system** — the whole corpus is resident from boot. Carries the measured cytoscape 3.34.1 rendering facts. Read before touching edges or layout. |
| **work_views.md** | 08-31 | How a work is presented: gateway / title page / passage, their shapes, what each shows and hides. Companion to `edge_model.md`. |
| **ink_mode.md** | 08-28 | The state-colour scheme. **Now the default** (`?ink=0` returns the coloured model). Written because three of its decisions were reached by being wrong first. |
| **stable_id_spec.md** | 08-21 | `url` as the durable node id, replacing Memgraph elementId. Built. |
| **unified_focus_spec.md** | 08-16 | One-tap focus (text + neighbourhood together). Default ON; `?uf=0` restores legacy. |
| **DeepLinking.md** | 09-12 | **Deep-link sizing and transport.** Opens with a START HERE summary — the rest is chronological and includes two reverted experiments. The 659-char Apple data-detector limit, the anchor-vs-plain-text rule, and the JSP design. |
| **voice_training_pipeline.md** | 09-06 | As-built record of the voice-training pipeline — rig, first fine-tune, seven toolchain breakages with fixes, re-runnable commands. Read before any further voice work. |
| **controls_panels_iframe_map.md** | 07-02 | Controls / panels / iframe relations. |
| **websocketdevels.md** | 07-12 | The ws → Socket.IO migration. Historical in date, but still the reference for connection-state recovery and the grace-period purge. |

## Specs — built, detail may lag

| file | date | note |
|---|---|---|
| **editing_spec.md** | 08-28 | Collaborative **Explore sessions**. v0.2 corner controls built; §10 lists what is still open. |
| **remote_view_spec.md** | 08-31 | Remote view sharing, built on branch `remote-graph-view`. **Its colour scheme is superseded by the achromatic model** — the doc says so at the top. |
| **blue_node_spec.md** | 08-21 | Partner's position on your own graph. Built; some of it untested. |
| **music_player_layout_spec.md** | 08-19 | Shared panel-grid for media modules. **Partly built** — ABC mobile done, desktop and Fractal not. |
| **cards_spec.md** | 07-15 | Card-stack chat panel. As-built at `viewer.js?v=331`; the viewer is far past that, so treat detail as historical and shape as current. |
| **communications.md** | 07-15 | Buddy communication channel. Built. |
| **cc-hint-system-spec.md** | 06-12 | Manual position-hinting. **Doc stale:** hints became per-edge-and-per-viewing-parent on 07-23, and cluster views now ignore the bare keys. |
| **SR_Editor_Rules_v0.1.md** | 08-13 | Speech-recognition editor interaction rules. Built as a separate page (`sr_editor.html`). |
| **BD_SR_Editor_Design_Notes_v0.1.md** | 08-13 | Companion design notes to the above. |

## Operations

| file | what it is |
|---|---|
| **BackupNotes.md** | Restore procedures. Every DB-mutating `bd_tool.js` subcommand auto-backs-up into `backups/`. |
| **CHANGELOG.md** | Running change log. |
| **helper_messages.md** | **Source of truth** for the helper cards, driven into the DB by `bd_tool.js sync-helpers`. Edit here, not in the database. |
| **bd_graph_schema_corrected.md** | Schema reference. Predates several 07/08 changes — cross-check against the live DB. |

---

# FUTURE

Designed, not built. `PLANNING_REGISTER.md` has the evidence and the full list
of unbuilt items.

| file | date | what is still open |
|---|---|---|
| **corner_controls_plan.md** | 08-28 | Resumable work plan for the v0.2 redesign. Much is built; the offer/accept/lapse retirement spans client and server. |
| **speech_plan.md** | 09-04 | Staged plan for in-browser speech. **Stages 0 and 1 shipped**; the pronunciation lexicon is the live edge. |
| **ink_promotion_plan.md** | 09-04 | **Stage 1 done** — achromatic is the default. Stage 2, walking every view, is still worth doing. |
| **BD_Viewer_Scaling_Brief.md** | 08-23 | Whether the viewer scales. **Planning only, nothing scheduled by intent.** Its `CC analysis` section corrects the brief's own central premise and holds the draft-loss design. |
| **convergence_node.md** | 06-28 | Paired-discussion convergence node. The *idea* was absorbed into Explore (a GN mark is a "recorded convergence"); this document's own design was never built. |
| **bot_context.md** | 06-24 | Bot-context authoring. **Rendering exists** despite the doc saying "not yet built"; authoring does not. |
| **du_fu_plan.md** | 08-02 | Ingest plan for "Dreaming of Li Bai". Also the template for the repeatable ingest pattern. |
| **speech_lexicon_draft.md** | 09-04 | Proposed pronunciations for the Zhuangzi transliterations. **Explicitly a draft to be checked by ear** — the corpus mixes Legge's 1891 romanisation with modern pinyin. |

---

# PAST

Kept for context. **Do not read these for current behaviour.**

## Corpus text edits — applied, verified live

Each records one change to a node's stored text, with the reasoning. All are
**applied** — verified against the live DB on 2026-09-12 (zero `bd_chunk`
nodes, zero un-fixed colons/typos, zero remaining "Welcome to"/"breadcrumb").
Their value now is explaining *why the wording reads as it does*.

| file | what it changed |
|---|---|
| **root_text_2026-09-01.md** | Retired the breadcrumb-bars sentence (the bars are gone). |
| **root_onechunk_2026-09-01.md** | Collapsed Root's two chunks into one — Root was the last multi-chunk node, so this emptied the mechanism. |
| **settling_hint_2026-09-01.md** | Removed a hint pointing at the node you were already standing on. |
| **nav_instructions_2026-09-01.md** | Brought navigation copy in line with one-tap. |
| **conversations_restore_2026-09-01.md** | Restored a line that Sv stripped by round-tripping the rendered card into the DB. |
| **conversations_colon_2026-09-04.md** | "the Local: button" → "the Local button". |
| **conversations_typos_2026-09-04.md** | Three typos that also affected the spoken reading. |
| **root_boot_split_2026-09-05.md** | Root's welcome moved to the tap card (`ROOT_BOOT_MESSAGE`). |
| **root_orientation_2026-09-05.md** | Added a closing sentence that works both read and heard. |
| **pairing_split_2026-09-05.md** | Pairing mentioned at Root, instructed at Conversations — the button is gated until then. |
| **conversations_pairing_2026-09-05.md** | Introduced what pairing is for, ahead of the button instruction. |
| **gateway_text_factual.md** | Stripped interpretive prose from gateway nodes, keeping attribution and provenance. |
| **patch_settling_text_fix.md** | One-off text patch, 07-16. Spent. |

## Superseded documents

| file | date | status |
|---|---|---|
| **ButterflyDreaming_GraphViewer_Handover_v6…** | 06-24 | Latest handover present in this repo. |
| **ButterflyDreaming_GraphViewer_Handover_v5…** | 06-14 | Superseded by v6. |
| **ButterflyDreaming_GraphViewer_Handover_v4…** | 05-27 | Superseded by v5. |
| **graphviewer (2).md** | 05-15 | Earliest handover. Superseded. |
| **chat_panel_handover_2026-06-28.md** | 06-28 | Superseded by `cards_spec.md` + `communications.md`. |
| **state of work-20:27-270826.md** | 08-27 | **RESOLVED 08-28** — its §2 hypothesis was disproved by the test. The resolution is at the top of the file. |
| **ButterflyDreamingColourDesignNotes.md** | 05-30 | Colour design. The `user-colour-vision` memory is the operative constraint. |
| **FractalMusic.md** | 08-10 | `bd_M_Fractal` implementation notes. The module also has its own repo, which is ahead of this. |

## Working sheets — data, not design

Bulk-review artefacts. Do not read them for architecture.

| file | what it is |
|---|---|
| **nav_nodes_text.md** | Structural review sheet, 172 blocks of navigation-node text. |
| **subfamily_candidates.md** | SubFamily review sheet, consumed by `bd_tool.js apply-subfamily-labels`. |
| **voice_prompts.md** | 63 recording prompts for the Piper fine-tune. **Read at the pace you want the finished voice to read at** — a fine-tune learns delivery more stubbornly than timbre. |
| **Note on Cluster-Textnode edges.md** | Short note on the cluster↔textnode relationship. |

## Session notes

Chronological working record. Useful for "why is it like this", not for current
behaviour.

`session_notes_2026-08-16_17` · `…08-19` · `…08-20` · `…08-21` · `…08-22_23` ·
`…08-24_25` · `…08-27` · `…08-28` · `…09-01` · `…09-02` · `…09-03` · `…09-04` ·
`…09-05`

---

## Housekeeping

**Done 2026-08-23:** `bd_graph_schema (2).md` deleted (byte-identical duplicate,
verified with `diff`); `convergence_node (3).md` → `convergence_node.md`;
`summary.md` → `controls_panels_iframe_map.md`. Both now tracked.

**Done 2026-09-12:** this index rewritten past/present/future; 19 missing
documents added; the corpus text-edit notes gathered into one section and
verified applied against the live DB.

**Still open:**

1. **`backups/` is gitignored.** Anything written there is untracked. Do not
   leave documents there.
2. **The scaling brief's reference [5] cites "Handover v7"**, which does not
   exist here — v6 is the latest present. Either it lives elsewhere or the
   citation is wrong.
3. **`(2)` / `(3)` suffixes** are browser re-download artefacts. Prefer a
   tracked original where one exists.
4. **Untracked files sit in the repo root** — `apply_mm.js`, `migrate_mm1.js`,
   `migrate_mm2.js`, `TaoTeChing11_81.cypher`, several `.mp3`s and a
   `files (3)/` directory. Decide: track, move, or delete.
