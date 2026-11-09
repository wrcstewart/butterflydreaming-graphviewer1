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
| **InformationLayer_Plan_2026-10-26.md** | 10-26 | **PLAN.** An `Arriving` node between Root and Settling, and `Information` as a third entry point. Carries the measured findings that decided it: the curation lever is the RELATION TYPE, not the node label (traversals filter by type and ignore direction); a new node label would cost six sites, one of which makes the node uneditable; and `Entry` buys hub status, so an entry point is never a route corridor. |
| **Hosting_and_Domains_2026-10-23.md** | 10-23 | **How BD reaches the public internet.** One tunnel, three hostnames, one Mac. Read FIRST before touching the tunnel or a zone: the tunnel is locally managed (so the dashboard cannot configure it), `cert.pem` is scoped to one zone (so `route dns` guesses wrong), and Proxied is mandatory rather than preferred. Carries the zero-downtime restart method, the `server: hcdn` vs `server: cloudflare` discriminator, the stale-resolver trap, and a copy-paste verification suite. |
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
| **speech_plan.md** | 09-04, +09-30 | Staged plan for in-browser speech. **Stages 0 and 1 shipped**; the pronunciation lexicon is the live edge. **Now also carries PROSODY (09-30): verse gets a line-end pause and a slower pace, and the two-test verse detector — the corpus is why one test was not enough.** |
| **ink_promotion_plan.md** | 09-04 | **Stage 1 done** — achromatic is the default. Stage 2, walking every view, is still worth doing. |
| **BD_Viewer_Scaling_Brief.md** | 08-23 | Whether the viewer scales. **Planning only, nothing scheduled by intent.** Its `CC analysis` section corrects the brief's own central premise and holds the draft-loss design. |
| **convergence_node.md** | 06-28 | Paired-discussion convergence node. The *idea* was absorbed into Explore (a GN mark is a "recorded convergence"); this document's own design was never built. |
| **bot_context.md** | 06-24 | Bot-context authoring. **Rendering exists** despite the doc saying "not yet built"; authoring does not. |
| **VR_FromScratch_2026-10-16.md** | 10-16 | **READ THIS BEFORE `ThreeJS_and_VR`.** How a number the turtle wrote becomes a lit pixel in front of someone's eye, assuming no background. Defines every term on first use — the room, the plate (`XRReferenceSpace`), the head pose, the two per-eye views, the figure, the plan, `camera.parent`, your camera versus three's two — and marks each for **degree of virtuality** (PHYSICAL / MEASURED / DECLARED / PURE NUMBER / DERIVED), which is what untangles the subject: *the room is physical, the figure is pure number, and everything difficult happens in the declared layer between them*. Carries **one real vertex all the way through**, computed: `(12, 400, 0)` with no unit, to world `(0.12, 1.60, -6.00)` m, to view space, to NDC, to pixel `(1059, 1108)` of 2064x2208 — and **11.2 px of disparity against the other eye, which IS the stereo.** Answers "is there a headset virtual camera" (no: two, and neither is yours) and ends with the four rows of the chain that are the author's to write. |
| **ThreeJS_and_VR_2026-09-28.md** | 09-28 | **The standing decision that visual modules render through three.js, and the whole XR fact-gathering behind it.** The decision and its evidence; what WebXR needs and the estimate; two requirements the AIM imposes (**never move the camera**; smoothness beats fidelity); **three delivery shapes** (§5) — BD flat in the headset browser with only the module immersive, versus the AV viewer as the facilitated mode, versus porting the UI to 3D (avoid); what the headset must carry, **audio paths and the mic gotcha** (§5a); line weight (§6); **THE COLLAGE FORK** (§7) — iframes versus one shared scene, to settle before the collage is built; a seven-item cheap test (§8); **which headset and why storage is the wrong axis** (§8b); **designing against hardware that improves slowly** (§8c) — size things in ANGLE, not pixels; and **glasses** (§8d) — additive displays, the dimming dial a headset cannot offer, and the two divergent trajectories after Meta Connect 2026. §9 is the authoritative open list for this area. |
| **CollagePlanStarted_2026-09-22.md** | 09-22 | **The collage plan** — `_p_` marking a directive that carries a control (and why the name, not a declaration line: length, measured against the 659-char ceiling), the three/two mode simplification, text nodes as module scripts, merge-from-history, and the collage module that binds them. Carries four implementation RULES, of which the first is a round-trip bug that exists in `setDirectiveValue` today. |
| **BDX_DEMO_PLAN.md** | 09-19 | **The plan for the independent BDX / AVX / RX demo** — what it is, the argument it makes, the dependency ladder (same machine needs NO server; cross-device needs *a* rendezvous, not necessarily ours), what exists already, what to build, how each copy is kept from rotting, hosting, and the decisions still outstanding. |
| **AV/README.md** | 09-15 | **How to build an Ancillary Viewer**, written for a third party. What an AV is (presentation, not editing), the MST token, the shim, the two traps that cost real time (named windows survive navigation; an iframe with a `src` in HTML loses BD_READY), and the measured ~30 ms socket latency. **09-15:** a module socket may send only `av_hello`; and **where a QR code for a cross-device viewer goes — entirely BD-side, the AV needs no change.** |
| **module_data_modes.md** | 09-15 | **The LD / SD / UD vocabulary**, fixed so it stops being re-explained: Live Data (token → socket → live DB, read+write), Static Data (published snapshot), URL Data (carried in the link). Plus MST, MDP, NR, OH. Argues NR — one payload shape across all three — is the integration and the rest is transport. |
| **external_collage_viewer.md** | 09-13 | **Mulling, nothing built.** A public collage viewer opened by URL, fed from saved-node ids via the server. Records the model inversion (BD designs, externals view) and the constraints that bear on it. Also holds the deferred `?n=` self-link idea. |
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
| **hardy_stanza_labels_2026-09-30.md** | Removed the bare `Stanza n` line from all 14 Hardy poem chunks — apparatus, not poem, and the chunking already IS the stanza division. Matters more now Browse shows the prose. |
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
| **session_notes_2026-10-28.md** | The voice rig made safe for a second reader: one directory per speaker, the Tao Te Ching prompt set, the Basic/Tao dropdown, the lexicon rule for a word that appears in the training text, and the 14-clip mechanism run end to end. Ends with what is still open. |
| **session_notes_2026-11-01.md** | The Rode NT1 measured against every earlier microphone (8 dB better than the best of 144 clips, and the 200–1000 Hz whirr gone at source), the signal-to-noise readout built into the recording rig and corrected four times, the pop-screen finding measured at 6–7 dB, and prompt set v4. **Several measurements were wrong first and are written down as such** — including counting a phoneme inventory piper does not use. Ends with what is still open. |
| **LSystems_in_ButterflyDreaming.pdf / .html** | **Written for an outside reader, not for the author.** Explains what an L-system is, what a renderer does, and — the part that is actually BD's — how the grammar supplies ORDER while the directives supply MAGNITUDE, and how a slider is an editor for the directive text rather than a parallel state. Illustrated from the live corpus with Kolam 2D, Kolam 3D and Fractal Music: one grammar read three ways, as ink, as a sculpture, and as pitch over time. The `.html` is the source; regenerate the PDF with Chrome headless `--print-to-pdf`. Has no figures yet — a marked slot in the source says where they go. |
| **terrain_direct.html** | The SECOND approach, 2026-11-05, at `/terrain_direct.html`. **No angle is computed**: one grammar sets the height of each flat top, another its width, and the black line joins the **midpoints of the tops** over a faint histogram of the data itself. A `walk` / `level` switch makes the number of integrations a CHOICE — walk gives slow structure, level gives fast — which is the separation `terrain_bench.html` could not provide, since there height was twice-integrated by construction. |
| **FractalTerrain_Notes.md** | Where the fractal-terrain work got to, and why the first approach was set aside. Nine measured findings — palindromic rules make mirror landscapes, rule bias makes ramps, fitting to the canvas lies by 99×, mountains must be steep, corner-cutting was the wrong smoother, **rolling hills are double integration**, the ±60 walls cause a downhill lean, correct the result not the process, and irregularity needs more than one rule. Ends with what should carry over. |
| **AV/fractal-terrain-methods.md** | **The source document for the three terrain methods**, written outside this repo. Method A random faults, B spectral synthesis, C chunked seeded noise, with full source in §11 and a test table in §8. Every terrain page cites its sections, so it is committed here. **Known issue: it carries TWO different `fbm2d` implementations** — §11.1 without the `k0` cutoff, its own demo page with it — and §3 describes that cutoff as one of the method's controls. They should be made one. |
| **build_guides.mjs** | `node build_guides.mjs` — turns every `*Guide.md` into a servable `*_guide.html`. Handles only the markdown this collection uses (headings, paragraphs, tables, fenced code, lists, rules, bold, italic, inline code, links) and **throws rather than shipping a mangled line**. A build step rather than a second hand-written file, so the prose has one source. Adding a guide is adding a markdown file. |
| **guide.css** | The house style for the guide collection, so a second guide is a markdown file and nothing else. **Nothing is carried by hue alone** — structure comes from weight, size, rules and a background tint, links are underlined, and the single accent reads as *darker* rather than as a hue. System fonts and no network, because these pages may be uploaded, read offline or printed; a print block keeps tables and headings whole. |
| **NoiseTerrainGuide.md** / **noise_terrain_guide.html** | **The guide to `noise_terrain.html`**, readable at `/noise_terrain_guide.html`. **The markdown is the SOURCE and the HTML is generated** — edit the `.md`, then `node build_guides.mjs`. Written that way because two hand-kept copies of the same prose drift, which this repo has paid for twice., the best of the three terrain pages. How the scene is constructed (chunks generated independently, one mesh each, normals from a one-cell apron, colour in a vertex attribute, and the fixed metre scale), how the noise is generated (the seven-stage pipeline, the octave sum, the four modifiers and which to reach for, the two-layer combine, the squash), then **every one of the 26 controls** with its id, range, default and purpose — including the interactions that are not obvious, such as warp destroying the grain that stretch creates, and hetero overlapping with the belt. Ends with the zoom ceiling, the things that look like faults and are not, and ten settings worth trying. |
| **terrain_selftest.mjs** | `node terrain_selftest.mjs` — **29 invariants for the terrain work in one command**, so a session resuming cold can check the claims rather than trust them. Each test names the fault it exists to catch. Covers the source document's own test table, bit-identity of `noise_variants.js` against `noise.js`, exact chunk edges with every control engaged, the direction measure's calibration and its matched null, both H estimators including the one that must throw, the clamp and the soft ceiling, hetero raising heterogeneity without smoothing, the colour bands' luminance separation, the metre scale, and normals matching across a tile seam. |
| **spectral_terrain.html** | Method B, 2026-11-08, at `/spectral_terrain.html`. Amplitude ∝ \|k\|^−(H+1), inverse FFT, real part. **No construction order, so nothing for a streak to follow** — the page that answers the question the whole terrain series was asking, at anisotropy excess 1.03 against the triangle scan's 2.89. H is checked from the **spectral** slope, which is near unbiased on a periodic field, with the variogram shown beside it and labelled as reading low. |
| **noise_terrain.html** | Method C, 2026-11-08, at `/noise_terrain.html`. Height as a pure function of world position and seed, so the world is endless rather than a tile — each chunk is generated independently and drawn as **its own mesh**, and every shared edge is measured at max difference 0. Carries the four mechanisms from `noise_variants.js`, a two-layer swell that also places the mountain belt, real altitudes with a tree line and a snow line, and the `soft ceiling` that cures the clamp's corner mesa. |
| **faults_terrain.html** | Method A, 2026-11-08, at `/faults_terrain.html`. Fracture and lift: each step a random line with the ground raised by Q·sgn(d)·\|d\|^α, thousands summing to fBm with H = α + ½. **The only one of the three whose primitive is a landform.** Cost is faults × n², so the page predicts its own runtime to 2% and declines to start anything over 1.5 s unasked. |
| **terrain_metrics.js** | Every measurement for the terrain pages, **one copy by policy**. Its header is written as instructions rather than notes, because each rule cost a round: the directional power spectrum against a **matched null**, never a ratio whose denominator the numerator can move, calibrate direction labels on known-angle stripes *and* an isotropic null, count at the scale the eye sees, and which H estimator belongs to a field that wraps against one that does not. |
| **terrain_view.js** | The shared view layer: colour schemes, the luminance-monotone elevation ramp, the three alpine bands with latitude-driven tree and snow lines, the camera, the legend, the metre scale, and **analytic normals from a one-cell apron** so independently-drawn tiles do not crease at their joins. |
| **noise_variants.js** | Four mechanisms on top of Method C, kept out of `noise.js` so that file stays as extracted. **Stretch** breaks isotropy (grain), **warp** breaks placement, **hetero** breaks roughness (rough peaks over smooth plains), and a **two-layer swell** doubles as the mask placing the mountain belt. With every control off, bit-identical to `noise.js` and asserted so. |
| **fbm2d.js / faults.js / noise.js** | The three generators, **extracted programmatically** from `AV/fractal-terrain-methods.md` §11.1–11.3 rather than retyped, so they cannot drift from it silently. All three reproduce that document's §8 test table. `fbm2d.js` adds the `k0` high-pass, copied from the document's own demo version and defaulting to 0. |
| **trianglescan_terrain.html / constdelta_terrain.html / trianglescan_scan.js** | The author's own anti-diagonal construction, 2026-11-07, **set aside**. A u,v grid filled in anti-diagonal order, each cell's base a reciprocal-distance average of three established neighbours. Defeated by its own structure rather than by a bug: it is a causal autoregressive filter whose impulse response is a plume along +u+v, so the diagonal is built into the operator. Kept because the diagnosis, the six self-tests and the √2 diagonal weight all still hold. |
| **terrain_bench.html** | Dev bench at `/terrain_bench.html`, 2026-11-05. A mountain PROFILE — black line, white canvas — driven by **two independent L-system grammars**: one supplies a ±1° decision per drawn segment, the other ±a quantum of step length (50–500 m). Clamping the angle to ±60° is what makes it a valid heightfield: cos is never negative, so the line always advances and cannot fold back. Reports the two things the picture hides — **net rule bias**, which is what separates terrain from a ramp, and the **vertical stretch** that "fit to canvas" applies. Groundwork for a 3D terrain module. |
| **voice_snr.js** | Signal-to-noise of one recorded take, measured in the browser so the reader sees it while the line can still be read again — *"we have seen that it learns the noise"*. Carries the four mistakes it is built to avoid: sustained-energy speech bounds not a peak-relative threshold, the **lead-in only** never mixed with the tail, **A-weighted** because 60% of this room's noise energy is inaudible, and the floor as a **25th percentile** not a mean, after one 50 ms mouth click inflated a mean floor by 12 dB. Returns `ok:false` with a reason rather than a verdict from an impossible reading. |
| **voice_prompts_mixed.md** | **Mixed registers** set — 128 utterances for the second recording, drawn from BD's own corpus: 30 Tao, 30 Zhuangzi, 30 Grimm, 15 Hardy, 15 Whitman and 8 written sentences. Blocks of four per style so the reader can settle. Excludes every word in `speech_lexicon.json`, and records why the phoneme counts were wrong twice before they were right. |
| **voice_code.js** | The curation code for the two voice authoring pages, held once in `localStorage` and never in the URL. The voice endpoints **write to disk** and were open to the internet until 2026-10-28; `codedFetch` throws with `needsCode` on a 403 so a caller can prompt. |
| **speech_timing.js** | HOW BD DELIVERS SPEECH, shared by `viewer.js` and `voice_compare.html`: pace (`SPEAK_LENGTH_SCALE` 1.571), the gaps (504 ms after a full stop, 180 ms after a comma break) and `splitUtterances`, which breaks a sentence over 150 characters at a comma. **Every number was tuned by ear against the others**, so it is imported in both places rather than copied. |
| **voice_compare.html** | Dev page at `/voice_compare.html`. Hears one fine-tuned voice on text it WAS trained on, text it was not but in the same register, text in a different register, and a long sentence that splits at commas. **Delivered exactly as BD delivers it** — pace and gaps imported from `speech_timing.js`. **The pair is the point** — either alone is easy to misread. Synthesises through `piper_direct.js`, so what is heard is what BD will say; reports dropped phoneme symbols. |
| **voice_prompts_basic.md** | **Basic** set — 63 plain recording prompts for the Piper fine-tune. **Read at the pace you want the finished voice to read at** — a fine-tune learns delivery more stubbornly than timbre. |
| **voice_prompts_tao.md** | **Tao Te Ching** set — 125 utterances from chapters 1–19, chosen for an unhurried delivery. Complete at utterance 73; coverage, chunking and the espeak checks are all recorded in it. |
| **ingest_tao_te_ching/** | Per-chapter tagging notes for the Tao Te Ching ingest — source translation, `CHILD` weights, cluster assignments. **Provenance that cannot be reconstructed from the database.** The cypher it produced is `TaoTeChing11_81.cypher`. |
| **Note on Cluster-Textnode edges.md** | Short note on the cluster↔textnode relationship. |

## Session notes

Chronological working record. Useful for "why is it like this", not for current
behaviour.

`session_notes_2026-08-16_17` · `…08-19` · `…08-20` · `…08-21` · `…08-22_23` ·
`…08-24_25` · `…08-27` · `…08-28` · `…09-01` · `…09-02` · `…09-03` · `…09-04` ·
`…09-05` · **`…09-12`** · **`…09-13`** · **`…10-28`** · **`…11-01`**

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
4. ~~Untracked files in the repo root~~ — **RESOLVED 2026-09-12.** Migration
   scripts and `TaoTeChing11_81.cypher` are tracked; the ingest notes moved to
   `ingest_tao_te_ching/`; the duplicate cypher fragments were removed;
   `config.js.bak*` and root-level `*.mp3` are now ignored. **0 untracked
   files remain.**
