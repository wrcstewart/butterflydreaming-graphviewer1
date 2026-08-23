# Docs index — what each .md in this repo is for

**Created 2026-08-23.** There are 38 markdown files at the repo root spanning
May to August 2026, several superseded and a few duplicated. This says what
each is and whether to trust it.

**Confidence marking.** Entries marked ✔ were read in full during the session
that wrote this index. Others are classified from their own status line, date,
and the memory index — accurate enough to route you, but read the file itself
before relying on detail.

Keep this current when adding a doc. One line is enough.

---

## Start here

| file | what it is |
|---|---|
| ✔ **HowToRestore.md** | **Read first if memory is missing.** Explains the out-of-git memory directory, how it is mirrored here, and what else to read. |
| **MEMORY_SNAPSHOT.md** | Mirror of the live memory directory, written by `sync_memory_snapshot.sh` via a Stop hook. **Auto-generated — never hand-edit;** edit the memory files and re-run the script. |
| **DOCS_INDEX.md** | This file. |

---

## Current specs — active design or as-built

| file | date | what it is |
|---|---|---|
| ✔ **edge_model.md** | 08-22 | How relationships actually reach the graph. Establishes there is **no simulated-edge system** (the whole corpus is resident from boot), that gateway→cluster edges are explicit, and carries the measured cytoscape 3.34.1 rendering facts. Read before touching anything edge- or layout-related. |
| ✔ **BD_Viewer_Scaling_Brief.md** | 08-23 | Whether the viewer scales. **Planning only, nothing scheduled.** The `CC analysis` section at the foot corrects the brief's central premise and holds the draft-loss design. |
| ✔ **blue_node_spec.md** | 08-21 | The Blue Node — partner's position shown on your own graph. **Built**; see the memory entry for what is verified vs untested. |
| **stable_id_spec.md** | 08-21 | `url` as the durable node id, replacing Memgraph elementId. **Done.** |
| **unified_focus_spec.md** | 08-16 | One-tap focus model (text + neighbourhood together). Default ON; `?uf=0` restores legacy. |
| **music_player_layout_spec.md** | 08-19 (v0.2) | Shared panel-grid for the media modules, and the BD dock-slot mechanism. |
| **SR_Editor_Rules_v0.1.md** | 08-13 | Speech-recognition editor interaction rules. Self-declared current. |
| **BD_SR_Editor_Design_Notes_v0.1.md** | 08-13 | Companion design notes to the above. |
| **communications.md** | 07-15 | Buddy communication channel. Self-declared "design, largely built". |
| **cards_spec.md** | 07-15 | Card-stack chat panel. Self-declared as-built **at `viewer.js?v=331`** — the viewer is now past v600, so treat the detail as historical and the shape as current. |
| **cc-hint-system-spec.md** | 06-12 | Manual position-hinting. **Partly superseded:** hints became per-edge-AND-per-viewing-parent on 2026-07-23, and as of 2026-08-22 cluster views ignore the bare pre-scoping keys entirely. |

---

## Operations

| file | what it is |
|---|---|
| **BackupNotes.md** | Restore procedures. Every DB-mutating `bd_tool.js` subcommand auto-backs-up into `backups/`. |
| **CHANGELOG.md** | Running change log. |
| **helper_messages.md** | **Source of truth** for the helper cards; driven into the DB by `bd_tool.js sync-helpers`. Edit here, not in the database. |

---

## Working sheets — data, not design

These are bulk-review artefacts, not specifications. Do not read them for
architecture.

| file | what it is |
|---|---|
| **nav_nodes_text.md** | Structural review sheet, 172 blocks of navigation-node text. |
| **subfamily_candidates.md** | SubFamily review sheet, consumed by `bd_tool.js apply-subfamily-labels`. |
| **du_fu_plan.md** | Ingest plan for "Dreaming of Li Bai". Template for the repeatable ingest pattern. |
| **patch_settling_text_fix.md** | One-off text patch, 2026-07-16. Spent. |
| **Note on Cluster-Textnode edges.md** | Short note on the cluster↔textnode relationship. |

---

## Module docs

| file | what it is |
|---|---|
| **FractalMusic.md** | `bd_M_Fractal` implementation notes. The module also has its own repo. |

---

## Historical — read for context, not for current behaviour

| file | date | status |
|---|---|---|
| **ButterflyDreaming_GraphViewer_Handover_v6…** | 06-24 | Latest handover **present in this repo**. See the note below about v7. |
| **ButterflyDreaming_GraphViewer_Handover_v5…** | 06-14 | Superseded by v6. |
| **ButterflyDreaming_GraphViewer_Handover_v4…** | 05-27 | Superseded by v5. |
| **graphviewer (2).md** | 05-15 | Earliest handover. Superseded. |
| **chat_panel_handover_2026-06-28.md** | 06-28 | Superseded by `cards_spec.md` + `communications.md`. |
| **websocketdevels.md** | 07-12 | The ws → Socket.IO migration. Historical, but still the reference for connection-state recovery and the grace-period purge. |
| **bd_graph_schema_corrected.md** | 06-28 | Schema reference; self-declared verified and current. Predates several 2026-07/08 changes — cross-check against the live DB. |
| **bot_context.md** | 06-24 | Self-declared "design, not yet built". |
| **ButterflyDreamingColourDesignNotes.md** | 05-30 | Colour design. See also the `user-colour-vision` memory, which is the operative constraint. |
| **summary.md** | 07-02 | Controls / panels / iframe relations. **Untracked** — see housekeeping. |
| **convergence_node (3).md** | 06-28 | Paired-discussion convergence node, "design / exploration". **Untracked** — see housekeeping. |

---

## Session notes

Chronological working record. Useful for "why is it like this", not for
current behaviour.

`session_notes_2026-08-16_17.md` · `…08-19.md` · `…08-20.md` · `…08-21.md`

---

## Housekeeping — found 2026-08-23, not acted on

1. **`bd_graph_schema (2).md` is byte-identical to `bd_graph_schema_corrected.md`**
   (verified with `diff`). A re-download. Untracked; safe to delete, but not
   deleted without asking.

2. **Three files are untracked and therefore unpushed:**
   `bd_graph_schema (2).md`, `convergence_node (3).md`, `summary.md`.
   The latter two have **no tracked counterpart**, so they exist only on this
   machine. `convergence_node` in particular is design thinking that would be
   lost with the disk.

3. **`backups/` is gitignored.** Anything written there is untracked — the
   scaling brief was, until it was moved to the root on 2026-08-23. Do not
   leave documents there.

4. **The scaling brief's reference [5] cites "Handover v7"**, which does not
   exist in this repo — v6 is the latest present. Either it lives elsewhere or
   the citation is wrong.

5. **The `(2)` / `(3)` suffixes** are browser re-download artefacts. Where a
   tracked original exists, prefer it; where it does not, the file needs
   adding to git under a clean name.
