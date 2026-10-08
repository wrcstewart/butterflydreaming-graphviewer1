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

## Added 2026-10-04 — eleven pads, and the generated one

| item | where | note |
|---|---|---|
| **`make_synth_pad.js` — a generated source** | `M_DroneFrac/` | **BUILT, and the author's favourite of the eleven.** 20 oscillators from 9 partials, each with its own slow amplitude drift. **No upstream at all** — CC0 by construction, reproducible from one file, no chain to confirm. Dissolves the provenance problem this directory opened with. |
| **Seamless BY CONSTRUCTION** | `make_synth_pad.js` | Every frequency and drift rate is an exact multiple of `1/duration`, so each completes whole cycles and the end joins the beginning. Step at the wrap **0.0014** vs 0.03 for a splice. Three earlier rounds went on loop clicks; synthesis makes them impossible. |
| **Detuning ≠ movement** | — | Beating moves AMPLITUDE and barely touches the spectrum — near-zero flux. Each oscillator needs its own **drift rate**, and because no two coincide the spectral balance keeps changing: **centroid swing 189 Hz, the highest of any source here.** Designing on detuning alone would have produced a static sine stack. |
| **`smooth=0`** | `make_sample_pads.py` | **BUILT after nearly going wrong.** The flattening step removes level variation slower than its window — right for a recording with a swell, **destructive** for a source whose movement IS slow level variation. The synth's drift periods are 2.7–14 s and `smooth=1.0` would have erased all of them. |
| **Which treatment adds most movement** | `sources/SOURCES.md` | Measured on one chord: none 0.136, Ensemble+ChromaVerb 0.291, Alchemy 0.407, **PaulXStretch 0.430**, benchmark 0.449. **Smearing across time beats modulating, and the free standalone tool beat the DAW's flagship synth.** |
| **Processed sources want LESS transposition** | `make_sample_pads.py` | **Three corrections** before the rule was stated: −2400→−1200, −1200→0, and one that needed none. Reverb tails, spectral smear and time-stretching fill the low/mid range on their own. The organ pads' two-octave drop is no precedent — single pipe tones with nothing else in them. **Start a processed source at 0.** |
| **The pulse was interval × source DETAIL** | — | `ch2_cents 2400` is fine on the smeared source and was not on the sharper one: the 1.83 s boundary jump lands between two nearly identical points in time-stretched material. The artefact was never the interval alone. Found by the author putting the "broken" setting back. |
| ~~Bake / Save wav untested~~ | `M_DroneFrac/` | **VERIFIED.** Confirmed again — the module's last untested path is exercised. |
| **`gtr_ens_Cmaj7`, `paulx_drone`** | `sources/` | Both CC0, chains confirmed. Four pads now come from one freeze-pedal guitar chord, differing only in treatment — a controlled comparison. |
| **Alchemy** | — | Several hours, much on its interface: a VA oscillator sounding instead of the imported file, modulation off making knobs inert, no obvious engine disable. **I guessed at its layout repeatedly and was wrong more than once.** Logic's own help is the authority; what I contribute is the measurement loop. |
| **A local-file sample load** | `M_DroneFrac/` | **STILL NOT BUILT** — top item in the module's `AGENTS.md`. Less pressing now that generation sidesteps licensing entirely. |
| **An output stage for Fractal and ABC** | `M_Fractal/`, `M_Music/` | **STILL NOT BUILT.** |
| **`page` entry for DroneFrac in `MODULES`** | `viewer.js` | **STILL NOT DONE.** One line. |
| **`ch2_lock`** | `M_DroneFrac/` | **NOT BUILT, offered and not needed** — the fix was a smaller interval plus more overlap. |

---

## Added 2026-10-03 — the pulse, and eight pads

| item | where | note |
|---|---|---|
| **`ch2_level` + `ch2_cents`** | `M_DroneFrac/music_module.html` | **BUILT.** Channel 2's level (−60 dB is a true mute) and interval. Added to diagnose a monotonous high pulse at the grain rate, which turned out to be `CH2_CENTS = 2400`: a grain's SLOT is `grainSize` but its rate comes from `detune`, so at 4× it reads 1.8 s of material while advancing 0.45 s — a **1.35 s jump at every boundary**, `grainSize × (rate − 1)`. **I should have made it a control rather than picking a constant.** |
| **Why a regular artefact is heard as a fault** | — | The grain clock is `playbackRate/grainSize` and has **nothing to do with the walk** — the trajectory changes each grain's pitch, never when grains fire. So the artefact arrives at a fixed rate: a metronome. **Channel 1 has the same mismatch** (ratio 0.29–3.5 at `detune_span 22`) and is inaudible as a fault *because it is irregular*. Same mechanism, opposite perception. |
| **The honest limit on fixing it** | — | Removing the jump entirely needs `playbackRate == detuneRatio`, which **re-welds pitch to travel speed** — the thing granular exists to separate. In Tone's implementation: continuous reading OR independent travel, not both. A `ch2_lock` option was offered and not taken. |
| **Masking was hiding channel 1's range** | — | At `detune_span 22` channel 1 alone roams **−2100..+2200 cents, ~3.6 octaves**, and channel 2 two octaves above the top of that was covering its upper excursions. The author had been hearing a 3.6-octave walk through a two-octave mask. Now `detune_span 10`. |
| **The metrics cannot measure interest** | — | Spectral flux in a 2 s window: vox pad (**interesting**) **0.449**, J8 pad (**dull**) **0.449**. Identical. Centroid swings within four points. Every number here measures *suitability*. **Recorded twice now** — see the loop-length item above. |
| **`gtr_pad_Cmaj7`** | `M_DroneFrac/sources/` | Freesound 870087, LAPS-Catalog, CC0. A chord held with a **freeze pedal** — no pick attack, no decay, 0 of 458 windows transient, flat to 2.8 dB over 9.17 s. *A plain strummed chord would have been the worst possible source.* At −2400 the lowest of the eight: 51.4% below C2, centroid 173 Hz. |
| **`alchemy_gtr_Cmaj7`** | `M_DroneFrac/sources/` | The same file through **Logic's Alchemy**, spectral engine, 78 s of one held note. **Needed NO transposition** — Alchemy had already taken the centroid 553 → 204 Hz, more than two octaves. Measured first, which is the only reason it was not shifted into uselessness. 2.1% below C2 against 51.4% untreated, so a different instrument rather than a version. |
| **Designer tools and CC0** | `sources/SOURCES.md` | **Processing adds nothing licensable; content does.** Safe in Logic: ChromaVerb, Ensemble, EQ, filters, Alchemy on an imported file. NOT safe: **Space Designer** (convolution — its presets are recordings), Alchemy factory sources, Apple Loops, sampled instruments. **Alchemy's Default preset is settings, not sound** — parameter values are not copyrightable audio. |
| **`read_any()` — format-agnostic** | `make_sample_pads.py` | **BUILT.** Hand-parsed 24-bit WAV until a Float32 file arrived. Python's `wave` cannot read format 3 **nor WAVE_FORMAT_EXTENSIBLE (0xFFFE), which ffmpeg emits above 16 bits** — so converting first does not help. Now decodes to **raw 32-bit PCM on a pipe**, ffprobe supplying rate and channels. |
| **`bd_ui_config` → `hostScriptPanel`** | all | **BUILT.** A third flag, each asserting one thing. Deliberately NOT read off `hostChrome`, which is about layout reserve — `controls-hidden` carried two meanings until it was split, and overloading another flag would repeat it. |
| **BD link at the foot of all five standalones** | `~/bd_standalone_*` | **DONE.** After the paragraph saying what ButterflyDreaming is. Music pages needed that paragraph moved last too. Dead `header a` / `.spacer` rules removed. |
| **`ch2_lock`** | `M_DroneFrac/` | **NOT BUILT, offered.** Would force `playbackRate = detuneRatio` on channel 2 and remove the jump completely, at the cost of channel 2 ignoring `playback_rate`. |
| **An output stage for Fractal and ABC** | `M_Fractal/`, `M_Music/` | **STILL NOT BUILT.** The same four controls. |
| **`page` entry for DroneFrac in `MODULES`** | `viewer.js` | **STILL NOT DONE.** One line. |

---

## Added 2026-10-02/03 — bd_M_DroneFrac

| item | where | note |
|---|---|---|
| **`bd_M_DroneFrac` — the granular drone** | `M_DroneFrac/` | **BUILT, IN BD, AND PUBLISHED.** Fifth media module. Cluster **Drone** under Music, gateway `bd_M_DroneFrac` (displays as DroneFrac), content `bd_M_DroneFrac_001`. All four registries + static route done. Standalone at `ButterflyDreaming-Standalone-DroneFrac`. An L-system walk steers grains: height → pitch, run length → grain size — **two independent destinations, which is the point** (Fractal's ABC layer welds them). Second channel reads the same walk at an offset, two octaves up. |
| **`GrainPlayer`'s params are NOT Signals** | Tone 14 | **Established from the source, against the docs.** `detune`, `grainSize`, `overlap`, `playbackRate` are plain numbers, read at grain-fire time, so modulation resolution is `1/grainSize`. Hence a SCHEDULED trajectory and **no LFOs** — at drone speeds five steps a second is finer than the ear resolves. |
| **Sample Focus material WITHDRAWN** | `~/bd_private_samples/` | **RESOLVED 2026-10-02.** Its licence permits use "as part of a new creative work" but forbids making the sound available in a downloadable format — and it was verified publicly downloadable through the tunnel, HTTP 200, full file. Removed from the served tree (the repo root is `express.static`'d too, so nowhere inside the checkout is safe). **"Royalty-free" is about royalties and says nothing about redistribution.** Local use remains permitted. |
| **Six CC0 pads, all rebuildable** | `M_DroneFrac/sources/` | 3 from VCSL (explicit redistribution grant in its `Info.txt`), 3 from Freesound. `make_organ_pads.sh` + `make_sample_pads.py` ship with the module. One entry (Freesound 697998, deleted uploader, "royalty free collection" wording) is **flagged lowest-confidence** and is the first to reconsider before any wider publication. |
| **Registration beats octave** | — | Measured, share of energy ≤C2: Full **10.9%**, 8′ **46.3%**, 4′ 2.9%. "Full" is a mixture, so moving its fundamental moves little of what is heard. Also: **VCSL labels files an octave low** — the file called `C1` sounds C2. |
| **Loop length is a MUSICAL choice** | `make_sample_pads.py` | **Author's finding.** A short loop recurs often and the detuned voices vary each time — theme and variation. A loop longer than the piece develops nothing. The seam-free 64 s loop is the weakest of the six. **Steadiness measures suitability, not interest**, and every candidate had been screened on steadiness alone. |
| **Output stage: volume / bass / treble / balance** | `M_DroneFrac/music_module.html` | **BUILT.** All `_p_`, so a balance against other sound is **written into the script**. `reverb → EQ → pan → volume → limiter`. Bake renders the same four; the spectrum taps after the stage. |
| **Speech slower again** | `viewer.js` | Effective rate 0.700 → **0.636**, sentence gap 420 → **504 ms**. `SPEAK_LINE_GAP_MS` deliberately left at 180 so a line turn stays audibly shorter than a full stop. |
| **`page` entry for DroneFrac in `MODULES`** | `viewer.js` | **NOT DONE.** `embedded` only, so BD does not know its standalone page exists. One line. |
| ~~Bake / Save wav untested~~ | `M_DroneFrac/` | **VERIFIED 2026-10-03** — a `bd_M_DroneFrac.wav` turned up in the author's Downloads. The `Tone.Offline` + `ctx.transport` pattern works. It renders the output stage and both channels, so a saved file matches what was balanced. |
| **An output stage for Fractal and ABC** | `M_Fractal/`, `M_Music/` | **NOT BUILT.** The same four controls, if balancing against speech proves generally useful. |
| **A local-file sample load** | `M_DroneFrac/` | **NOT BUILT, and the top item in the module's `AGENTS.md`.** It sidesteps the licensing constraint entirely — nothing bundled, the user supplies the file. Needs care about honesty: a granular drone IS its source file, so a script naming a local sample reproduces nothing elsewhere, and RULE 9 says a module carries no directive it cannot act on. |

---

## Added 2026-09-30 — speech prosody

| item | where | note |
|---|---|---|
| **Verse reads as verse** | `viewer.js`, `speech_plan.md` | **BUILT.** A line break produced no pause: espeak makes pause PHONEMES from `,` and `.`, and a newline is only whitespace. A verse line is now its own utterance — `SPEAK_GAP_MS` already existed — with the gap set by the punctuation the fragment ends with: 420ms for `. ! ?`, 180ms otherwise. Verse also read 8% slower. Improved prose too: an over-long sentence split at the 400-char cap no longer takes a full stop's pause mid-clause. |
| **The verse detector needs TWO tests** | `viewer.js` `looksLikeVerse` | The author proposed capitalised line starts. MEASURED first: Hardy and Whitman are 100%, but **Du Fu is 33%** — a modern translation, and poetry the pause is wanted in. Whitman's mean line of 59 defeats a length rule equally. So: mean line length OR capitalisation, under a mean-70 ceiling that excludes hard-wrapped prose whatever its capitals do. **0 of 167 prose nodes read as verse.** `%%bd_` is never verse. |
| **Two verification failures, one rule each** | — | (1) A check for the queue's type change reported clean because its filter excluded the failing pattern — **a filter encodes the assumption under test**. (2) A check ran `splitUtterances` on raw node text, bypassing the normaliser that runs first, so it passed on input the code never receives — **test the path, not a stage of it**. Both in `feedback_verify_the_effect.md`. |
| **Tuning numbers are guesses at the ear** | `viewer.js` | `SPEAK_LINE_GAP_MS` 180, `SPEAK_VERSE_SCALE` ×1.08, `SPEAK_GAP_MS` 420. One-line changes. |

---

## TIDY UPS LATER

Deferred deliberately. Each is mechanical, each is a rename rather than a
behaviour change, and each is better done on its own than folded into work that
also changes what the code does.

| item | where | note |
|---|---|---|
| **`#bd-toppanel` → `#bd-jumpbar`** | `index.html`, `style.css`, `viewer.js` | The bar is agreed to be the **Jump Bar (JB)** — every control in it takes you somewhere: Local to your own position, Remote to your partner's, Green to the ones you followed them to, and now View to another screen. "Top panel" named it for sitting at the top of the CANVAS, but it is BELOW both reading panes, so the name misleads in conversation and in comments. One mechanical pass. |
| **The identifiers that say "merge" all mean "route"** | `viewer.js`, `index.html`, `style.css` | `clear-merge-btn`, `clearMergedView`, `mergedRemoteIds`, `applyMergedView` are leftovers from a wholesale-merge design that **was scaled back and never shipped**. What is live: their view is stored and never drawn, a shared node is only SIGNALLED when already in yours, and what can be drawn is a **route** to them. **These names actively mislead** — they led an assistant to describe the system as merging graphs, and the author had to correct it. Rename to route-* and the code says what it does. Bigger than the one above, and worth doing alone. |

---

## Added 2026-09-29 — three view modes become two

| item | where | note |
|---|---|---|
| **Browse \| Create — step 1 of 3** | `viewer.js`, `index.html`, `CollagePlanStarted_2026-09-22.md` §3 | **BUILT.** Nodes→Browse; Player+Edit→Create. Done FOR THE COLLAGE: three modes cannot be explained to someone who did not build the system. **Player was never a mode, it was a layout** — the NODE decides whether the module shows, and it rides under either mode. The auto-transition becomes a layout consequence rather than a mode change, which removes the boundary the 09-22 card overwrite lived on. |
| **`edit-active` orthogonal to `player-active`** | `viewer.js` | Could not be deferred: the two modes being merged had OPPOSITE layouts and the two classes were mutually exclusive, so a straight rename would have left a module node with no route to the compose controls. |
| **State at MODULE scope, applyView in `init()`** | `viewer.js` | `updateSendBtn` is not inside `init()` — the `bd:force-nodes-mode` listener exists only to bridge those scopes and says so. Declaring the new state in `init()` would have been a ReferenceError from there. Bridged by one `bd:view-apply` event. |
| **Both body classes set at once is a NEW state** | — | **NEEDS EYES.** How the compose controls sit over the module layout has never been seen. One line suppresses them there if it is wrong. |
| **Step 2: Browse plays the module with `hideControls`** | `CollagePlanStarted_2026-09-22.md` §3 | **NOT STARTED.** The mechanism exists and is proven in the AV viewer; this is a LAYOUT problem. It is also what makes the name "Create" honest, since until then a module node still lands you there automatically. |
| **Step 3: `Local` as a back button** | `CollagePlanStarted_2026-09-22.md` §3 | **NOT STARTED**, deliberately. One clean job: reaching the graph while on a module node in Create. Note `#back-btn` already does exactly this and now keeps the mode. |

---

## Added 2026-09-28 — STANDING DECISION: graphics render through three.js

| item | where | note |
|---|---|---|
| **Every visual module from here uses three.js, not a 2D canvas** | `ThreeJS_and_VR_2026-09-28.md` | **AUTHOR'S DECISION, 2026-09-28.** Stated reason: keep a WebXR conversion possible. A canvas renderer has no VR meaning at all; a three.js scene is a session flag and a camera-ownership change away from a headset. Do not reach for `getContext('2d')` for a new visual module. |
| **`bd_V_Kolam3D` is a measured superset of `bd_V_Kolam`** | `V_Kolam3D/`, `V_Kolam/` | At `pitch 0` and `cam_elevation 90` the 3D module draws the flat one's figure to `Float32Array` precision — 6.1e-5 world units on a radius of 1362, verified across five settings. So the flat module could be RETIRED rather than ported. The one real loss is `weight`: `ctx.lineWidth` works, core WebGL ignores line width. Second, smaller: the canvas rasterises a bezier for free where three tessellates it. Not decided. |
| **THE COLLAGE FORK — decide before building, not after** | `ThreeJS_and_VR_2026-09-28.md` §7 | If visuals are three.js, a collage can be **one scene holding several objects** rather than several iframes side by side — which is the only version that means anything in a headset, where a collage is a space you stand in. But the module contract is deliberately iframe + postMessage so a third party can write one (the whole point of the BDX harness). A shared scene means modules export GEOMETRY, not pixels: a new contract, and the isolation goes. Pressure towards the shared scene: browsers cap live WebGL contexts (~16 in Chrome, oldest silently lost), so an iframe-per-visual collage has a hard ceiling. **Worth measuring on the target devices before choosing.** |
| **Delivery shape settled in principle** | `ThreeJS_and_VR_2026-09-28.md` §5 | Three shapes, two of them keepers. **C** — BD flat in the headset browser, only the module immersive — is cheapest (same-origin iframe, no token/socket/relay) and the only one where the audio coheres, since Piper is client-side. **A** — the AV viewer — is the FACILITATED mode and is not superseded. Both run the identical module. **B**, porting BD's graph and cards into 3D, is declined on four grounds. |
| **Hardware conclusion** | `ThreeJS_and_VR_2026-09-28.md` §8b | **Quest 3, and storage is the wrong axis** — browser WebXR installs nothing. The lineup does not sell the good optics with the small drive; take the 512 GB anyway. Rests on **glare and field of view** (96° vs 110°), NOT on text legibility, which a 1.2x pinch handles either way. |
| **Size things in ANGLE, not pixels** | `ThreeJS_and_VR_2026-09-28.md` §8c | A 1px line gets WORSE as hardware improves — higher PPD means it subtends less angle. Anything sized in pixels shrinks as the tech improves. An argument for `Line2` independent of today's numbers. |
| **Glasses: the dial, and which lane to watch** | `ThreeJS_and_VR_2026-09-28.md` §8d | Electrochromic dimming makes depth-of-immersion a continuous dial adjustable mid-session — a facilitator raises transparency instead of removing a headset. **A therapeutic affordance no headset can offer**, and the strongest argument for glasses eventually. It belongs to the OPTICAL see-through lane (Android XR / Xreal / Viture), **not** to Meta's VR Glasses, whose full-colour passthrough is still camera-mediated. |
| **The open list for this whole area** | `ThreeJS_and_VR_2026-09-28.md` §9 | **Fifteen items, kept THERE rather than duplicated here** — two lists of the same questions would drift. Read §9 before starting any XR or graphics work. |

---

## Added 2026-09-27 — RULE 9, dead directives

| item | where | note |
|---|---|---|
| **RULE 9: a module's default script carries no directive it cannot act on** | `CollagePlanStarted_2026-09-22.md` | The script is not a private config file — it is the card a person reads, edits, copies and collages, so every line should do something. `bd_V_Kolam3D_001` shipped `%%bd_weight` (read, but applied to a WebGL property that is ignored) and `%%bd_stroke` (**not read at all** — the 3D renderer always takes its hue from the yaw). Both removed; all 20 remaining directives are live. |
| **Safe because nothing is lost — checked, not assumed** | — | Absent, the flat module defaults `stroke` to `angle` and the 3D module defaults `weight` to 1.5: exactly the values the removed lines carried. "The module ignores it" and "removing it changes nothing" are different statements, and the second is the one that licenses removal. |
| **What a module WRITES and what its default script CARRIES are separate** | — | RULE 9 does not license stripping a directive from a script that has one. A figure given a weight in the flat module keeps it through the 3D one, because that module never *rewrites* `weight` — unchanged by this. |

---

## Added 2026-09-27 — the viewer and the sender's clock

| item | where | note |
|---|---|---|
| **A drift frame differing only in pitch or cam_elevation was pushed to the viewer** | `viewer.js` | **FIXED.** `pushScriptToAV` declines a drift frame that differs from the last push only in a value the receiver computes itself — but the comparison stripped `AV_ANGLE_LINES`, which named the angle triple LITERALLY. So the camera rotation was pushed, and the viewer snapped back to a value up to a second stale: "small jerks of elevation every one or two seconds". Now `AV_CLOCK_LINES`: angle triple + pitch triple + `cam_elevation`. Pitch was leaking identically and unnoticed because the node ships `pitch_drift 0`. Rates are deliberately excluded and the exclusion is structural, not careful. 31 cases checked. |
| **A matcher that lists a category must be edited when the category grows** | `viewer.js` | The comment above that regex had already predicted the exact failure — "if it stopped matching, every drift frame would read as a human change and be pushed". What it missed is that ADDING A CLOCK does the same damage as the regex breaking. Note now says so, and says where to edit. |
| **`avWithClockDrivenFrom` carries all five values** | `viewer.js` | A resync exists to make the viewer agree with BD NOW. It copied only angle and angle_minutes; a value left out would have been the one parameter a resync could not fix. That resync is what makes the phase offset between two independent clocks tolerable. |
| **Two independent clocks hold a phase offset** | — | **ACCEPTED, with the same standing as angle drift.** BD and the viewer each compute the rotation from `cam_elevation_speed`, starting at different moments, so they can show different elevations. Sync is the way back into step. |

---

## Added 2026-09-27 — camera range and auto-rotate

| item | where | note |
|---|---|---|
| **`cam_elevation` is the full turn, cyclic** | `V_Kolam3D/visual_module.html` | **BUILT.** −180..179, wrapping. It was −90..90 under a comment of MINE claiming the poles would flip the azimuth and break round-tripping. That comment was wrong about code written to avoid exactly that: the up vector is the sphere's north tangent, not world +Y. VERIFIED across all 360 degrees — up stays unit, up·view is 0 to twelve places at the poles included, no two elevations give the same view, every 1° step moves the camera 0.01745 of the radius with no jump over the top. Stops at 179 because 180 ≡ −180 and one picture must not have two spellings. |
| **`cam_elevation_speed` — auto-rotate** | `V_Kolam3D/visual_module.html` | **BUILT.** Degrees per second: 0 off, 1 = a turn in 6 min, 60 = 6 s. NOT called `_drift`, because drift means arcseconds per tick in this module and at that unit's maximum the camera would need 21 minutes for one turn — a control borrowing a family name must borrow its unit. **Its own clock at 20 Hz, not the drift timer's**, which is depth-throttled to 1 Hz at depth 5 because it rebuilds geometry; a camera move rebuilds nothing, so the rotation is smooth at every depth. Drawing follows a float, the script records whole degrees at ≤5 writes/s, announced as drift (RULE 7). |
| **No azimuth speed yet** | — | **OPEN, one row.** A turntable is the more usual auto-rotate than a pole-to-pole tumble; only elevation was asked for. Same mechanism, so it is a stepper plus three lines. |

---

## Added 2026-09-27 — opacity

| item | where | note |
|---|---|---|
| **`%%bd_p_opacity`, 0 to 1** | `V_Kolam3D/visual_module.html` | **BUILT.** Seventeenth stepper, twentieths. Worth more here than in the flat module: eight symmetric copies of a folded curve are mostly self-occluding. `depthWrite` follows the transparency — with it left on, the nearest line per pixel hides everything behind it and the figure reads as a solid shell. `transparent` is in three's program cache key, so `needsUpdate` is guarded behind an actual change (this runs 5-10x a second under drift). Material only, so it joins the no-rebuild path. Readout drops the leading zero; measured, all 21 values fit the span and the round trip is float-exact. |
| **Opacity is NOT in the flat module** | `V_Kolam/` | Deliberate — not asked for, and marginal on a 2D canvas. Verified safe: the flat module reads `opacity` into its directives, has no `CONTROL_FOR` entry so offers no row, and never writes it — so the line survives a round trip there intact and draws opaque. |

---

## Added 2026-09-27 — hold-repeat

| item | where | note |
|---|---|---|
| **A held stepper ran away** | `V_Kolam/`, `V_Kolam3D/` | **BUILT.** Two faults. (1) A small range had NO BRAKE: the repeat floored at one step per 60ms tick and returned early saying such controls were "already quick enough", so `depth` crossed its entire 4-wide range in **0.24s**. The code could not express "slower than one step per tick" and the comment recorded that limit as a property. (2) A 2500ms traverse was brisk for wide ranges too. Fixed by letting the magnitude go FRACTIONAL and accumulating in the caller, so the range-derived rate governs small ranges as well; the floor is now a TIME (one step per `START_STEP_MS`) not one step per tick. Traverse 7000ms, ramp 1400ms. Measured before/after in the changelog. |
| **The two Kolam modules share this block and must stay identical** | `V_Kolam/`, `V_Kolam3D/` | The 3D file's header states the parser, stepper machinery and drift clock are the 2D file's verbatim. Fixing only the module that was complained about would have quietly made that false. A check compares the two blocks with comments stripped. The MUSIC modules use an older repeat and were not touched. |

---

## Added 2026-09-27 — the 3D kolam

| item | where | note |
|---|---|---|
| **`bd_V_Kolam3D` — kolam in three dimensions** | `V_Kolam3D/`, `server.js`, `viewer.js`, `AV/kolam.html` | **BUILT.** A SIBLING of Kolam, a Cluster off Graphics — same `%%bd_` script, different renderer. `+` turns by `angle` about the turtle's up axis AND by `pitch` about its left, so **pitch 0 at cam_elevation 90 reproduces the 2D figure exactly**: VERIFIED numerically over five settings, worst deviation 6.1e-5 world units on a radius of 1362, which is `Float32Array` precision and not the arithmetic. three.js 0.160.0 UMD from jsdelivr, pinned, colour management OFF so `setHSL` matches a 2D canvas. |
| **Camera steppers** | `V_Kolam3D/visual_module.html` | **BUILT.** `cam_azimuth` / `cam_elevation` / `cam_distance`, on a fast path that rebuilds no geometry — the drawing is on the card, so looking at it from elsewhere is a matrix. `cam_distance` **auto-frames on first render** when the script does not name it, because the stored Kolam settings have radii from 97 to 1362 and a camera inside the geometry shows nothing. The auto-fit is not announced (RULE 7) and enters the script on the first human control change. |
| **Pitch compounds — the control bites harder than a degree suggests** | — | MEASURED: **five** degrees takes the default figure's max \|y\| from 0 to 343 world units against an in-plane radius of 97; one degree gives 75. The turn applies at every one of 512 steps. `pitch_minutes` is load-bearing, not a nicety. **Corrected**: this row first said ONE degree gave 343, reading the wrong line of the table, and `step_pitch`'s node default was picked from it ten times too small. |
| **`%%bd_step_pitch` — the step length in the new dimension** | `V_Kolam3D/visual_module.html` | **BUILT**, same day, off the first test. The answer to the row above: the turtle's step length out of the plane, in `step`'s units. Applied as `group.scale.y`, which is EXACTLY equivalent to scaling the y of every move — verified against an independent turtle that scales during the walk, five ratios including 0 and 2.5, agreement to `Float32Array` precision. So it rebuilds no geometry and the figure inflates under your finger at depth 5. On the group above the symmetry children, because a y-rotation commutes with a y-scale. Inert at pitch 0, correctly. Node default 5 against step 50; the module's fallback for a script that omits it is `step` itself, because isotropic is the only default that cannot change a figure written earlier. |
| **No `weight` stepper in 3D** | `V_Kolam3D/visual_module.html` | **DELIBERATE, and an OPEN item if thickness is wanted.** Core WebGL ignores line width, so a weight control would be wired to nothing. `%%bd_weight` is passed through untouched so a figure keeps it on the way back to the flat module. Real thickness = `Line2` / `LineMaterial` from `examples/jsm`: ES modules, an import map, three more CDN fetches. Not silent work. |
| **The 3D wrapper closes two whitelist gaps the 2D one has** | `V_Kolam3D/index.html` | `bd_ui_config` in `RELAY_DOWN` and **`BD_ERROR` in `RELAY_UP`**. The second is specific to this module: it depends on a CDN, and "the library did not load" is the one sentence that must never stop at a relay. Said on screen too, in a different colour from "waiting" — a dead module must not look like a slow one. |
| **Paired stepper column** | `V_Kolam3D/visual_module.html` | **BUILT.** Every quantity that exists in both planes beside its counterpart: step/step_pitch, angle/pitch, angle_minutes/pitch_minutes, angle_drift/pitch_drift. Column, `CONTROL_FOR`, the writer and the stored script's `_p_` marks are all in that one order, and a check asserts all four agree. |
| **The node opens at pitch 1** | `bd_V_Kolam3D_001` | **BUILT.** A control that does nothing in the default state is a bad control however correct it is — step_pitch was inert at pitch 0 and was reported as broken. The MODULE's parse fallback stays 0, deliberately: a script that never mentions pitch was written for the flat module and must render flat. Markup default and parse fallback differ on purpose, and say so. |
| **iOS / phone testing of Kolam3D** | — | **PENDING.** Verified on this machine only. WebGL context loss on a backgrounded tab is the specific thing to watch; the 2D canvas has no equivalent failure. |

---

## Added 2026-09-22 — align BD with BDX

**The plan, in order.** BDX/AVX/RX grew four things BD does not have, and the
two are supposed to be the same architecture. `bd_relay.js` is already
byte-identical between them and `bd_av_client.js` is a tracked copy, so most of
the alignment is already structural — what is missing is the **controller**
half, which lives in `viewer.js` and was only ever written for BDX.

Facts established 2026-09-22, by test rather than assumption: **BD is publicly
hosted** at `https://graph.virtualfictions.uk` (cloudflared tunnel on this Mac
to `localhost:8080`, running since May), the AV page is served from the same
origin, and **WebSocket crosses that tunnel**. So BD needs none of the
apparatus BDX needed — no `?rx=`, no substitutable relay, no mixed content —
because BD serves the pages *and* is the relay, over https throughout.

**ALL FOUR BUILT 2026-09-22.** BD's server was restarted to pick up the relay
handler (it had been running since Sep 19, and `av_spare_token` landed Sep 20 —
sender and client without the middle site, the failure this project has
documented before). Proven against BD's own relay: spare delivered, spent token
refused, spare accepted.

| # | item | status | note |
|---|---|---|---|
| 1 | `av_spare_token` sent by `viewer.js` | **BUILT** | The relay carries it and `bd_av_client.js` already stores and spends it; BD never sends one. BD's viewers have an opener and renew through it, so this has never shown — but a viewer opened from a *pasted link* has no opener, and on a phone that is the ordinary case. Needed whether or not the rest is built. |
| 2 | `qrcode.js` vendored into BD | **BUILT** | MIT, 57 KB, lazy-loaded on first press. Verified by decoding, not by matrix comparison — see `BDX_DEMO_PLAN.md`. |
| 3 | "Device" button + dialog | **BUILT** | Beside View. Mint on the press; single-use, three minutes; countdown from the relay's own `ttl_ms`. Refuse on localhost, where the link means the other device itself. |
| 4 | Safari clipboard pattern | **BUILT** | A write after the mint's round trip is refused — the gesture is over. Hand the clipboard the *promise* during the press, then `writeText`, then a visible copy button. |

**Design note for (3): leave room for a short typed code.** The QR is one
delivery, not the mechanism. A VR headset is exactly the device this exists for
— no window handle — and is also the worst at both scanning a QR and typing a
150-character URL. A six-character code typed into the viewer would suit it,
and is the one option needing a **protocol addition**, so the dialog should be
laid out to accept it later rather than be retrofitted.

**VERIFIED BY HAND 2026-09-22.** Device → QR → a phone across the room → drift
there → Sync → BD lands on the node at the phone's position and says so. The
viewer's back button was rebuilt for the case: BD marks the launch URL `d=1`
and such a viewer offers **Sync** rather than a way back that is not there.

**Two process notes from getting there**, both in memory:

- **BD's client-console log is stdout.** Restart it as
  `node server.js >> /private/tmp/bd_server.log 2>&1`, or the log silently
  stops growing and the next debugging session reads a dead file. That cost
  two rounds here.
- **Block scope is not function scope.** A helper declared in a nested block of
  `init()` is invisible to a dispatcher one level out, even though both are
  "inside `init()`". Checking by backwards-searching for an indent-0 function
  header cannot see this and will say they match.

**`GRACE_MS` and cross-device — a real interaction, noted 2026-09-22.**
`server.js:1301` runs at **10s**, and that is DELIBERATE, not an oversight: the
comment records it as the author's development compromise of 2026-09-12 — long
enough that a brief blur does not tear a pair down, short enough that a dev
restart leaves no ghost occupying the pair slot. The production value is 65000,
chosen to sit just above Socket.IO's 60s `connectionStateRecovery`.

The interaction worth knowing: a purged session takes its viewers with it. A
viewer's `moduleFor` names a session, and `sessions.get()` returning nothing
means `av_hello` and `av_return` are dropped — the relay has nobody to deliver
to. **At 10s a controller that sleeps for eleven seconds orphans a phone
permanently**, and the spare token does not help: it covers the VIEWER losing
its connection, not the controller's session being reaped. Cross-device is
precisely the case where the controller sits unattended.

No code change: `BD_GRACE_MS=65000 node server.js` sets the production value
without editing anything.

**Found on the way, unrelated to the feature:** `MODULE_ORIGINS`
(`server.js:1038`) is **dead code** — declared, referenced nowhere, while
`cors.origin` is `'*'`. Its comment claims "an explicit ALLOWLIST, not `'*'`",
which is not true. The real gates (`curationCodeOk()`, `VIEWER_MAY_SEND`) were
tested and do hold, so this is not an open hole; but it is a comment that would
licence a bad decision later, and BD is on the public internet. Either enforce
it or delete it. If enforced, note BD's own public origin is **not** in the
list, so View would break with it.

---

## Added 2026-09-22 — the collage plan

### `CollagePlanStarted_2026-09-22.md` — Design only, discussed and agreed

Two phases: **text_media + UX alteration** (text nodes as module scripts, three
modes to two, `_p_` control marking, merge from history, a collage module),
then **shared editing**. The sequencing is deliberate: the merge semantics ARE
the data structure, and a format that has reached the corpus cannot be revised
cheaply.

`_p_` was chosen over a `%%bd_ui` declaration line **on length** — 24 chars for
eight controls against ~70 — which is the constraint that binds, given the
659-char ceiling measured in `DeepLinking.md`. Module blocks provide the
namespace, so no qualified names are needed.

Four rules in the doc, all evidence-based rather than anticipated:

| rule | why |
|---|---|
| The writer must reconstruct the form it read | `setDirectiveValue` (`visual_module.html:713`) builds `%%bd_${name}` from the STRIPPED name — one stepper press would leave both `%%bd_p_symmetry 8` and `%%bd_symmetry 9` in the script. Exists today, waiting. |
| A script with no `_p_` keeps current behaviour | Auto-population already exists (`visual_module.html:331`). Makes the format self-describing and removes the corpus migration entirely. |
| Two-phase deploy, receivers first | Old consumers do not strip `_p_` and would render at defaults, silently. `DeepLinking.md`'s existing procedure applies unchanged. |
| Truncated labels can collide | `colour_speed` / `colour_scale` truncate alike. Accepted, recorded. |

**Open, and needed before code:** what occupies the screen in Create (Player
shows the iframe, Edit shows `cy`, and Merge needs history reachable); what a
module block's closing looks like; whether a merged script carries a format
version.

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
| ~~BD/BDX alignment (4 items)~~ | Added 2026-09-22, above | **DONE 2026-09-22.** Untested in a browser: nobody has pressed Device. |
| `MODULE_ORIGINS` dead code | `server.js:1038` | Enforce it or delete it. The comment claims a protection that is not there. |
| Short typed code for a viewer | Added 2026-09-22, above | The one hand-off option needing a protocol addition. For headsets. |
| Collage: `_p_`, modes, merge | `CollagePlanStarted_2026-09-22.md` | Phases 0-2 BUILT for Kolam + Fractal; nodes 001/002 migrated. Read/Create modes and merge not started. |
| ABC: `_p_` + announcements | same doc | Three edits — module announces `bd_av_state`, wrapper whitelists it and `bd_module_log` — then the mark pass. |
| Never announce on a script push | same doc, RULE 7 | Looks safe, loops. A module rebuilds the script, so it never matches what was pushed. |
| Create-mode layout | same doc | Player and Edit show opposite things; Merge needs both. Needs a layout answer before code. |

---

## Added 2026-09-12

| item | where | note |
|---|---|---|
| **JSP — "just send parameters"** | `DeepLinking.md` | **BUILT + VERIFIED IN USE for Kolam 2026-09-12** (`77c5bba` + `2d44c71` + guard `26f1329`): `?j=` short-key pairs, 237 chars against 650; round trip confirmed in a browser. ABC, Fractal and the return trip still use `?data=`. Originally: Positional parameter arrays instead of `%%bd_` directive text: Kolam 650→181 chars, Fractal 822→188, ABC 664→266. A 3-node collage of saved nodes is **87 chars** against 1,730 today. **Version the format from day one** — the exact lesson of the `name` field. |
| **Collage module** | `DeepLinking.md` | Not built, no repo. Blocked in its current shape: a 3-node collage inline is **8,276 chars** and fails GitHub Pages' ~8 KB request-line limit **on a button press**, sharing not involved. |
| Deep links unclickable in Apple native apps | `DeepLinking.md` | Links are ~686 chars against a **659-char** data-detector cap. Email and the address bar are unaffected. Four fixes ranked in the doc; the fragment move and the rich-`<a href>` clipboard were both built and **reverted**. |
| Pronunciation lexicon | `speech_plan.md`, `speech_lexicon_draft.md` | The live edge of the speech work. The draft needs checking by ear — the corpus mixes Legge's 1891 romanisation with modern pinyin. |
| Ink promotion stage 2 | `ink_promotion_plan.md` | Walk every view under the achromatic default. |
| `MEMORY.md` index discipline | — | The index hit 29 KB against a ~24 KB load limit on 2026-09-12 and was being truncated. Trimmed to 15 KB by moving detail into topic files. **Keep entries under ~230 chars.** |

## Added 2026-09-18 — the script becomes the source of truth

Author's reason, recorded because it governs the rest: *"only the script is
flexible enough to combine sharing / saving / collaging"*.

| item | where | note |
|---|---|---|
| **BD pushes the CARD, not the module** | `viewer.js` | **BUILT** (`849c34e`). What a viewer shows is now what the script says — the same text that is shared, saved or collaged. A card edited BY HAND reaches the viewer too, which the module-direct push could never do. |
| **`auto` tick box, two-way, on by default** | `index.html`, `style.css`, `viewer.js` | **BUILT** (`a5dec2d`, `001f595`, `849c34e`). ONE meaning covering both directions: the card and the module are the same thing. Unticked, the card stops tracking the steppers and so does the viewer — the honest meaning of the decision, not a regression, which is why ticked is the default. The ↓ also moved 50% lower: the two arrows do opposite things, so hitting the wrong one costs whichever side you had just got right. |
| **The drifting angle is RECORDED but not pushed** | `viewer.js` | **BUILT** (`76d3434`). It determines the picture more than any other parameter, so the script must hold it. It is still not sent to a viewer while drift runs: the viewer computes it from the same script, and pushing ours snapped it backwards on a phone (the 09-16 fault). **The script records; the viewer computes.** Throttled to 1/s with a trailing write so a drift stopped mid-interval records where it stopped. |
| **Half-typed scripts are held back** | `viewer.js` | **BUILT** (`2d24488`). The renderer fills an unparseable value from a hardcoded default, so deleting a digit sent the figure to the DEFAULT instead of holding still. Fixed in BD, not the renderer — the renderer cannot tell a cold script from a live edit, and BD knows the card is being typed in. |
| **Recording vs redrawing** | `viewer.js` | **BUILT after three attempts** (`27a48d6`, `fe874f5`). Recording is data and must never stop; redrawing is presentation and must never land under a live cursor. v1 blocked on focus and killed sync permanently after any edit; v2 wrote anyway and reset the caret on contentEditable. The lesson is in `project_script_source_of_truth.md`. |
| **Eight follow-up fixes from testing** | `viewer.js`, `AV/` | **BUILT** (`b8fdd6d`, `a5d201c`, `d23f9c4`, `45f34c1`, `2cb6e2f`, `c10a867`, `0a02fab`, `6e10627`). Four were "the wrong thing treated as the truth": av_hello answered with the module; **`avLastPushed` had TWO WRITERS** so fixing the reader achieved nothing; re-ticking `auto` ran the wrong way; the viewer was gated on `auto` (it must not be — that box governs card↔module ONLY). Four were timing, ending in the drift clock. |
| **Drift clock rate bias** | `V_Kolam/visual_module.html` | **BUILT** (`0a02fab`). The next tick was scheduled AFTER the render, so the period was `render time + interval` — a SYSTEMATIC bias. A bigger canvas ticks slower for ever, so BD and a viewer ran at different RATES. Measured: 11,321 vs 9,837 ticks over 20 min at 6ms/22ms render. Now scheduled from when the tick was DUE: 12,000 and 12,000. No feedback loop needed once the systematic error is gone. |
| **iOS testing of the script migration** | — | **PENDING.** The angle/viewer division and the hand-back are verified on desktop only. Timing issues are reported resolved on desktop as of 09-18. |

## Added 2026-09-17

| item | where | note |
|---|---|---|
| **Down button fixed** | `viewer.js` | **BUILT** (`b8f0b6e`). `getCardText` flattened a BUILT card with `textContent`, welding the tap-hint onto `%%bd_]` so the score block never closed and the renderer threw for want of an axiom. `readChunkBody` is the inverse and already existed. Sv's September lesson repeating. |
| **The renderer forwards its console** | `V_Kolam/`, `viewer.js` | **BUILT** (`2f64c03`). It was in an iframe and reached nobody; `render()` swallows its own exceptions. Now `[module] …` in the server log. Needed `bd_module_log` in the wrapper's `RELAY_UP` — the same whitelist trap as `bd_av_state`. |
| **Angle is a full turn, angle_minutes is a stepper** | `V_Kolam/visual_module.html` | **BUILT** (`bad75d4`, `cd86dae`). Three disagreeing definitions of the range meant drift walked 270 degrees all drawn as 90. One definition now, 0..359 wrapping, stepper wraps too. Low angles with `angle_minutes` are the interesting region, not a dead spot. |
| **Way-back button opens the node** | `viewer.js`, `AV/` | **BUILT** (`691e080`, `47481c8`, `511c237`, `5902c6a`). It only raised the window — indistinguishable from nothing on a desktop. Now `av_return` (no destination) → `openNodeAsTap` → card + Player. `armFreshOpen` clears `readingState` + `lastAutoPlayerNodeId`, **on the request, never on Player exit**. |
| **The viewer hands state over on the way back** | `server.js`, `AV/` | **BUILT + VERIFIED ON iOS** (`4b48caf`). On a phone the button closes the viewer, so asking later cannot work. `av_return` may carry a script and never a destination; BD seeds the cache before opening so the node opens already correct. |

## Added 2026-09-16

| item | where | note |
|---|---|---|
| **An exploration survives wandering off** | `viewer.js` | **BUILT** (`5a4f0aa`). `loadModuleForNode` posted the node's SAVED text to the module and pushed it to any viewer, so walking away and returning destroyed the explored steppers in both places — on desktop too, where BD was never suspended and had the state all along. Now cached per node, in memory only, and **VALUES merged onto the saved text**: the node supplies the score block and structure, and a directive is restored only if the node already has it. The card is untouched, so Down still loads what the author wrote. |
| **One viewer per module TYPE** | `server.js`, `viewer.js` | **BUILT + PROVEN** (`383194d`). `av_push` fanned out to every module socket the user had open and the token carried no type — a second viewer of another kind would have been handed an L-system score to play. Token now carries the type, handshake stamps it, delivery filters on it, **server-side** so a third-party author need not implement "ignore what is not mine". Grants BD no new reach — still scoped to `moduleFor`. Verified with two viewers of different types on one session. `avWindow` is now a registry keyed by module id. |
| **The viewer answers when asked** | `server.js`, `viewer.js`, `AV/` | **BUILT + PROVEN** (`afbaf5e`). The one thing a viewer knows that BD cannot: while you look at the viewer, BD is a background tab and is throttled or suspended, so the viewer's drift is the only record. BD asks on return to the foreground; the answer is merged values-only. Module allowlist gains its **second** entry (`av_state_report`, solicited only) — a viewer still cannot push, address anything, or reach a corpus handler, verified while holding a valid curation code. Guards: 1.2s expiry, node-id verification via the `?n=` handed at launch, and no adoption unless the module still shows that node. |
| **A viewer page for ABC / Fractal** | `AV/` | **NOT BUILT — the blocker on the type rule being visible.** Only `/AV/kolam.html` exists, so a different module type reports "no viewer page yet" and falls back to the standalone. The second window becomes real when these are written. |
| **QR code for a cross-device viewer** | `AV/README.md` | Still not built; design unchanged and still entirely BD-side. |
| **Background-rate probe** | `viewer.js` | **BUILT** (`c92eec9`), not yet read. Logs one line on return to visible: how many of BD's own 1s timers fired against wall clock, and how many frames the renderer managed. Inference from the old symptom was ~0.2 ticks/s, about 2% of foreground — near-total suspension in bursts, not a steady slow tick. |

## Added 2026-09-15

| item | where | note |
|---|---|---|
| **Curation code required on every corpus write** | `server.js`, `viewer.js` | **BUILT + PROVEN 2026-09-15** (`dd6368d`). `edit_save`, `edit_delete` and `edit_clone_cluster` checked only that a code was CONFIGURED, then wrote — reachable by any origin under `cors: '*'`. An anonymous socket from `https://evil.example` got ACCEPTED before, `bad_code` after; the same probe was run against the pre-fix server so the pass is not vacuous. `curationCodeOk()` is now the ONE check. **`socket.data.userId` is not authorisation** — every socket gets one. A module socket may send only `av_hello`, verified even with the correct code in hand. |
| **Curation UI end-to-end test** | — | **PENDING — the one thing not verified.** The gate was proven over a socket, but Sv / Wr / the cluster editor have NOT been clicked in a browser since the change. The client now sends `code` on three emits it never sent one on. If curation appears dead, this is the first place to look: a rejection now shows in `#dev-status` as "code rejected — re-enter it" rather than failing silently. |
| **QR code for a cross-device viewer** | `AV/README.md` | **NOT BUILT. Design settled, and it is entirely BD-side.** Only BD can mint a token; an AV only consumes one and already accepts any token in `?t=`. So BD renders the token as a QR instead of opening a local window, and a camera makes the other device the viewer. The protocol needs NOTHING — `moduleFor` is a userId, not a device. Needs: a second action beside View (which must NOT `window.open`), and a QR renderer. Mint on the press — a pre-rendered QR is a dead QR. |
| **`V_Kolam/preview.html` has drifted from the live renderer** | `V_Kolam/` | **OPEN DECISION, raised twice.** The standalone's own stepper table still shows the colour EXPONENT where BD now shows the directive's value, and still caps `step` at 200 where BD allows 999 — so a shared link carrying `step 400` renders differently from the one that was sent. Both are two-line fixes. Held because standalones are frozen and unfreezing one is the author's call. |
| **View replaces Jump; the update dialog is off that path** | `viewer.js`, `index.html` | **BUILT 2026-09-15** (`b6f603e`). The dialog asked whether to sync the module into the card before baking a URL; the AV never reads the card, so the question had no consequence. Removing it made the handler synchronous to `window.open`, which is what Safari requires — the click is now the gesture. `Copy external url` is RETIRED, NOT DELETED (`hidden`, handler wired). |
| **Kolam `step` ceiling 200 → 999** | `V_Kolam/visual_module.html` | **BUILT 2026-09-15** (`c90ee30`). Raising the number alone would not have delivered it: at one step per 60ms tick the new range took 60s to cross. Hold-repeat now scales with the range — any control crosses in ~2.5s — so small ranges are unchanged by construction, not by exception. |
| **The media modules have NO canary host** | `style.css` | **OPEN.** `style.css` claims the role moved to `music_module.html`'s play button; it is not there, in any module. BD's `#copy-link-btn` is doing double duty — it reports both BD chrome changes and renderer changes, and cannot distinguish them. A canary on the Kolam stepper panel would separate them and would show in the AV too. |

## Added 2026-09-14 — direction change

| item | where | note |
|---|---|---|
| **Socket.IO CORS** | `server.js` | **BUILT 2026-09-14** (`5dae4f4`) as an allowlist, then **widened to `origin: '*'` by the author** so a third party can host a module anywhere without asking us first. That is deliberate. It is also why the write handlers had to be gated properly — see 2026-09-15 below. |
| **LD / SD / UD data modes** | `module_data_modes.md` | **Design, partly built.** LD needs MST minting + MDP over the socket (not built). SD needs a publish step (not built). UD is built — that is JSP. |
| **Ancillary Viewer (AV)** | `AV/README.md` | **BUILT 2026-09-14** (`4b1106c`): MST tokens, `av_push` relay, client shim, Kolam reference viewer, Jump repurposed as launcher. Verified end to end. Terminology settled: **AV**, superseding the earlier **AT**. |
| ~~Ancillary tabs (AT) replace standalones for new work~~ | `external_collage_viewer.md` | **DECIDED 2026-09-14.** A second tab served by BD, for presentation: near-full screen, collage, minimal chrome. Same origin, so `BroadcastChannel` carries an arrangement with **no size limit** — no encoding, no wire table, no deploy lag. |
| ~~Standalones FROZEN, not retired~~ | — | **SUPERSEDED 2026-09-30.** The old three (`bd_V_Kolam`, `bd_M_ABC`, `bd_M_Fractal`) are replaced by four new `ButterflyDreaming-Standalone-*` repos, one per module, rebuilt without the deep-link apparatus. See 2026-09-30 below. |
| AT controls | `external_collage_viewer.md` | **The open question.** Presentation is the job, so "few" — which few is undecided. Keep the AT (for the BD user) distinct from the external viewer (for a stranger). |

## Added 2026-09-30

| item | where | note |
|---|---|---|
| **Four standalone module repos** | `ButterflyDreaming-Standalone-{Kolam3D,Kolam,Fractal,ABC}` | **BUILT and LIVE 2026-09-30** at `wrcstewart.github.io/ButterflyDreaming-Standalone-<name>/`. Module + script box + **Copy script** + a link to butterflydreaming.org. Defaults are the corpus nodes (`bd_V_Kolam_001` etc), fetched from Memgraph at generation time. **Deep links deliberately absent** — that apparatus was the reason the old standalones were frozen. Each vendors its module and refreshes it with `./sync_from_bd.sh`, recording the BD commit in `MODULE_SOURCE.txt`. |
| **`hostChrome` in `bd_ui_config`** | all four media modules | **BUILT 2026-09-30** (`8ae5581` + the Kolam3D work). Split out of `hideControls`, which meant *the host supplies the stepper column* and could not also mean *the host draws nothing around this iframe*. A viewer wants both; a standalone wants the chrome released and the steppers kept. Defaults to **true**, so nothing already working changed. |
| **The author's About text** | the four `index.html` files, `<section id="about">` | **NOT WRITTEN — placeholder in place.** Each page carries a short holding paragraph, deliberately short so replacing it is one edit. |
| **A link from the standalones to a landing page** | the four `index.html` headers | **Points at `butterflydreaming.org`.** If a per-module landing page is wanted later, that is where it goes. |
| **`V_Kolam/preview.html` drift** | `V_Kolam/` | Still open, and now less pressing: the new Kolam standalone does not use `preview.html` at all. The old `bd_V_Kolam` repo is the only thing still serving it. |

## Added 2026-09-13

| item | where | note |
|---|---|---|
| **External collage viewer** | `external_collage_viewer.md` | **Mulling, nothing decided.** A public viewer opened by URL, showing a collage of saved-node material; superficial controls, no saving; content from the BD database via the server. **Inverts the model**: BD designs the experience, externals are viewers — today's standalones are editors. Open question the author is holding: what does it give that BD does not? |
| `?n=<uuid>` for BD self-links | `external_collage_viewer.md` | Deferred pending the button/context table. When the panel text equals the node's stored text the id alone suffices — measured 999 → 72 chars. BD→BD only; a standalone has no corpus to resolve against. |

## Verified still open (2026-09-12)

Re-checked against code and the live DB rather than carried forward on trust:

| item | evidence |
|---|---|
| Delete stale BARE layout hints | **166 edges** still carry `hint_x` — unchanged since 08-23. |
| Drop `raw_text` duplication | No references in `server.js` or `viewer.js`; the duplication is DB-side only, so this is a migration, not a code change. |
| Desktop docking for media modules | `positionExtendPanel` still early-returns above 1024px. |

## Added 2026-10-06 — the L-system skip, and what `iterations` cannot do

Both music modules that walk an L-system (`M_DroneFrac`, `M_Fractal`) had the
same three problems. Two are fixed; the third is now understood and not built.

| item | where | note |
|---|---|---|
| **Shared opening MEASURED, not assumed** | `M_DroneFrac`, `M_Fractal` | **BUILT 2026-10-06.** `sharedOpening()` advances two expansions in lockstep and skips exactly what they share. The old `L(iterations - 1)` was true only of a grammar whose rule for X *begins with X* — and the grammar lives in the script, so it was silently wrong for any other, over-skipping material nobody had heard. Returns the old value for the old rules; verified byte-identical output at every iteration. |
| **Expansion and turtle FUSED** | both modules | **BUILT 2026-10-06.** The shared opening is traversed without being stored — it only ever contributes the turtle's x, y and heading. DroneFrac iteration 7: peak **45 MB → ~7 MB**, and *faster* (97 → 52 ms), since the discarded work is no longer done. `MAX_TOTAL_EMISSION` (memory, 5 M) became `MAX_SYMBOLS_TRAVERSED` (**time**, 20 M). |
| **Grammar with no shared opening as the default** | both modules | **BUILT 2026-10-06**, at the author's request. Cutting the leading symbol from each rule turns the recursion into `shared(N) = 2 + shared(N-2)`, so the shared opening is ~N and the skip has nothing to do. **Not a clean win**: distinct figures across M_Fractal's 5–20 range go **4 → 3**. DroneFrac was unaffected (5 either way). |
| **`start_at` — one honest axis in place of `iterations`** | **BUILT 2026-10-06**, both modules | A `%%bd_p_` stepper giving the offset into the rewritten string in **thousands of symbols** (2.5 = 2,500), so a six-figure range fits a three-character readout. **Measured: twelve settings from 0 to 177k give TWELVE distinct figures**, against five for `iterations` in DroneFrac and three in Fractal. ADDED to the shared opening, so 0 is the previous behaviour exactly; clamped to 25% of the iteration's real length (which is the job `computeExpansionLength` kept), and the clamp is reported rather than silent. The original finding: **`iterations` is not a variety control under ANY of these grammars.** Iterations 6 and 8 are byte-identical under both, because the curve is self-similar and `L(N-1)` lands on a self-similar boundary *by construction*. The current rules fail differently rather than better: their string opens with a run of N consecutive `F`s, and after it the figure depends only on the **parity** of N. The fractal is **one endless string**; depth only extends it. A single `start_at` offset would replace the depth/skip pair with the only thing audible — where you begin. |
| **A canary for `M_Fractal`** | `M_Fractal/music_module.html` | **NOT BUILT.** DroneFrac declared one (the Play button's background) and it has repeatedly answered "am I seeing my edit or a cached copy". M_Fractal has none, and BD serves its module with no cache-buster — only the AV renderer has one. |
| **`grain_from_run` normalises against the MAXIMUM run** | `M_DroneFrac` | **NOT FIXED.** Under the current grammar `maxRun` is 9 while 98% of runs are 1–5, so most notes land in the bottom half of the grain-size range and the control is less potent — effective grain size fell from a mean of 0.656 to 0.526. A high **percentile** rather than the maximum would make it behave the same under any grammar. |

| follow-on | where | note |
|---|---|---|
| **`decimals` on a stepper spec** | both modules | **BUILT 2026-10-06** as part of `start_at`. `formatDisplay` printed 177.9 as "178", and `getStepperValue` reads the DISPLAY back — so the fraction was destroyed by looking at it. The same inverse-pair hazard once flipped `loop` off in Fractal. Any future stepper needing more than two significant figures wants this field. |
| **A `start_at` stepper is 2,000 clicks end to end** | both modules | **Accepted, not solved.** 0–200 in steps of 0.1. Press-and-hold repeat covers it, and the directive can be typed, but a coarse/fine pair or a log step would suit the range better. |
| **`iterations` is now nearly redundant** | both modules | **Open question for the author.** With `start_at` carrying the variety, `iterations` only decides how long the string is — i.e. how far `start_at` may reach. It could become derived (expand to whatever depth covers `start_at` + the window) and leave the panel entirely. Kept for now because removing a control from existing scripts is not reversible. |

## Added 2026-10-07 — collage v1 decided

Design conversation with the author, written up as §7–§16 of
`CollagePlanStarted_2026-09-22.md`. Nothing built yet; the decisions are what
changed.

| item | where | note |
|---|---|---|
| **Text nodes stay as they are** | §7 | **DECIDED — no migration, and it was already decided in §4.** Absence of `%%bd_module` already means "this is text", and Browse already strips directives for every node (`viewer.js:1114`). Placement goes in the COLLAGE, not the node, because **placement is a property of the arrangement** — the same poem in two collages wants two placements. |
| **Merge stamps a slot id and default placement** | §8 | **DECIDED.** The "Paste button" is Merge, already in §5. Slot ids are needed because a module name is not unique — which retires §5's open question about two identical blocks: they are just two slots. |
| **Placement carries no `_p_`** | §8.1 | **DECIDED by the author**: View has no steppers and View is the target. Needs no new rule — RULE 4a already lets a module decline a control. |
| **The collage has exactly TWO steppers** | §9 | **DECIDED**: `opacity` and `duck`. The rule that generalises: **a control earns its place when the value cannot be chosen without perceiving the outcome.** Placement is set once by eye; mix decisions need the live result. |
| **Ducking is a TRANSIENT, never script state** | §9.1 | **NOT BUILT.** A `bd_mix { volume }` message. Writing a duck into `%%bd_p_volume` would make a momentary mix change part of the saved document — save mid-sentence and it is quiet for ever. Same principle as RULE 7. |
| **Module output decided by its own author, in CSS** | §10 | **DECIDED.** One new `bd_ui_config` flag ("show only your output") plus slot `opacity` as the override. **A parts/roles vocabulary was proposed and REFUSED** — invisible in the script, needs two parties to agree, grows per feature; the `%%bd_ui` line of §1 in different clothes. |
| **The collage runs the REAL modules** | §11 | **DECIDED**, and it dissolves a fork. No control-metadata contract, because the script carries name and value only while ranges live in code. A merged column would also be forty-odd knobs on a phone (DroneFrac 24 + Fractal 13). |
| **Do not strip `_p_` on merge** | §11.1 | **DECIDED.** RULE 2 inverts it: no marks tips the script into legacy mode and auto-populates ALL controls. `hideControls` does the job properly. |
| **PRESENTATION IS IN-PAGE, not a second tab** | §13 | **DECIDED — the session's biggest reversal.** `window.open` on iOS backgrounds BD, suspending Web Audio and throttling the timers that sequence speech (`viewer.js:520`, already documented from the angle-sync bug). In-page also deletes the relay-depth problem **and is the shape VR requires** — an immersive session shows only the WebGL scene, no DOM, which is exactly the "no steppers, no script, no graph" surface. **Not a third radio mode**: a mode changes what you can DO, this changes only what you can SEE. |
| **BD preview / BD Viewer** | §13.2 | **DECIDED** — the author's names. One surface, two sizes. |
| **The AV is demoted, not deleted** | §13.4 | **DECIDED.** It becomes a *send-to-another-screen* action — a verb, not a second viewer — keeping the facilitator/participant case it was built for. |
| **Speech and all audio in BD for v1** | §13.5 | **DECIDED.** The Viewer has no speech at all. Consequence stated: works in a room, not across a network. Speech in View is a later project — the author: *"a multimedia collage viewer is a significant app in itself"*. |
| **Relay depth is the FIRST thing to test** | §14.2 | **NOT DONE.** The collage is the first module that hosts modules, so postMessage goes a level deeper. Prove one frame and one directive before any layout — if the script does not arrive, no CSS will reveal it. |
| **How you LEAVE the BD Viewer** | §15 | **UNDECIDED, and the one that gets found late.** No chrome, and on iOS no keyboard. |
| **Font size in relative units** | §14 | **DECIDED.** One value then serves both the unreadable preview and a readable View; `px` would need two values for one decision. |
| **The iframes-vs-one-scene fork** | §15 | **STILL OPEN**, and in-page prejudices neither side — a shared scene is also one document. The deciding numbers remain *documented but never measured*. |

## DONE 2026-10-08 — scaling fixes 1 and 2

`BD_Viewer_Scaling_Brief.md` §CC.4's two no-behaviour-change fixes, done before
the Quest arrives so that a slow boot there cannot be mistaken for a speech
problem. Pre-flight: DB backup `backups/memgraph_2026-10-08_091028.cypher`,
git level with origin at `c665bfd`.

**Measured before starting:** 483 nodes, 2,725 edge rows. The boot query
returns one row per edge carrying BOTH endpoint nodes in full, so node payloads
cross the wire **5,450 times for 483 nodes — 11.3×**.

| fix | what | saving | state |
|---|---|---|---|
| **2** | drop `raw_text` | ~2× of the text payload | 198 TextNodes carry it, 123,760 B against 128,044 B of `text` — a near-duplicate that **nothing reads** (verified: zero references in any `.js`/`.html`). A DB migration, not a code change. |
| **1** | send each node once | ~11.3× | `viewer.js:10062` `MATCH (n)-[r]->(m) RETURN n, r, m` → a node query plus an edge query carrying only what the edge builder needs from its endpoints. |

**Fix 1 is NOT "query and serialisation only", which is how the brief rated
it.** `buildEdgeData(r, n, m)` denormalises `n.properties.name` onto every edge
as `source_name`/`target_name`, for stylesheet selectors that cannot reach into
an endpoint's data; and `nodeId()` falls back to `getElementId()` for the 42
url-less orphan endpoints, which [[stable-ids]] records as load-bearing. So an
endpoint needs **three** fields, not an id: `url`, `name`, and the elementId
fallback.

Approach chosen to keep that contained: the edge query returns those three per
endpoint, and the client **shims** them into `{elementId, properties:{url,name}}`
so `buildEdgeData` and `nodeId` are untouched.

**Equivalence checked, not assumed:** the proposed node set is 483, today's is
483, and the DB holds 483 — every node has at least one edge, so `MATCH (n)`
needs no pattern predicate and cannot introduce isolated nodes that were
previously invisible.

Still on one query shape afterwards: `fetchNodeByUrl`, `fetchNodesSince` and
`handleGatewayClick` also use `RETURN n, r, m`. Small result sets, so not urgent
— but they are the same waste and the same shim would serve them.

**BOTH DONE, verified 2026-10-08.**

- **Fix 2**: `raw_text` removed from 198 TextNodes (123,760 B). `text` intact at
  215 nodes / 128,044 B, so only the duplicate went.
- **Fix 1**: `viewer.js` now runs `MATCH (n) RETURN n` plus an edge query
  carrying `url`, `name` and `toString(id(n))` per endpoint, shimmed client-side
  into the shape `buildEdgeData`/`nodeId` already expect. **Node payloads on the
  wire: 5,450 → 483, 11.3× less.**

**How it was verified**, since the browser could not do it: the real
`buildEdgeData`, `nodeId`, `getElementId` and `flattenProps` were extracted from
`viewer.js` and run against the real query output. Result — 483 nodes, 2,725
edges, **0 edges with an endpoint missing from the node map** (cytoscape drops
those silently, so a correct count IS the test), and **84 endpoints resolved via
the elementId fallback**, which exercises the url-less orphan path
`stable_id_spec.md` calls load-bearing. The 438 edges with neither endpoint
named were confirmed against the DB as pre-existing (438 there too), not a loss
from the shim.

**`--virtual-time-budget` defeated the browser test** and it is worth recording
why: BD's loader races its queries against `sleep(8000)`, and under virtual time
a `setTimeout` fires instantly, so the race always loses and the log showed only
"Load attempt 1 failed: timeout". The same trap invalidated three measurements
during the voice work the day before. **Headless Chrome cannot test anything
that races a timer against real I/O.**

**Still outstanding:** `fetchNodeByUrl`, `fetchNodesSince` and
`handleGatewayClick` still use `RETURN n, r, m`. Small result sets, the same
waste, and the same shim would serve them.


## Trigger-conditioned 2026-10-08 — before pairing leaves development

| item | where | note |
|---|---|---|
| **`GRACE_MS` 10 s → 65000** | `server.js:1337` | **NOT a bug — the author's deliberate development compromise (2026-09-12).** But 65 s exists so a phone **locking its screen** does not tear a pair down: `connectionStateRecovery` is 60 s and the grace period must outlast it. At 10 s a screen lock, a backgrounded tab or a tunnel blip ends the pair. `BD_GRACE_MS=65000 node server.js` — no code edit. **Verified the only setting flagged as a development value** in `server.js` or `viewer.js`. Surfaced 2026-10-08 on a restart done for another reason: the warning prints at **start-up only**, and that process had been up since 2 October, so a server already running never shows it. |


## Added 2026-10-08 — text over a 3D graphic, and a line-at-a-time 3D text module

Nothing here is built. It came out of one question — *can text be superimposed
on a reduced-opacity Kolam / Kolam3D?* — whose answer is **yes in both cases**,
but only because of facts that are easy to get wrong in the same way twice.

### The layering facts, measured not assumed

- **`background` is a DIRECTIVE** (`%%bd_background`, default `#0a0a0f`), not a
  stepper, in both Kolams. So it is an authored choice per node and a viewer
  cannot change it mid-reading. **`lightness` and `saturation` ARE live
  steppers** (0–100, defaults 65 and 100), so the *ink* is not fixed.
- At the default `L=65 S=100` the ink's relative luminance runs **0.141**
  (hue 240) to **0.933** (hue 60) — a **6.6× spread at one lightness setting**.
  White text scores 5.50:1 over the blue end and **1.07:1** over the yellow.
  `colour_speed` cycles hue *along the curve*, so both ends are present in a
  single frame. Given the author's reduced colour vision there is no hue rule to
  fall back on: **the number in the panel does not predict legibility.**
- **The figure's densest point is the canvas CENTRE** — the turtle starts there
  (`V_Kolam/visual_module.html:1267`) and `applySymmetry` rotates about it
  (`:1357-1365`), so all N copies converge there. That is exactly where centred
  text goes.
- `angle_drift` (2D) and `cam_elevation_speed` (3D) redraw continuously, so
  contrast beneath a fixed glyph can only be **bounded**, never verified on a
  frame.

### The two `opacity` controls are not interchangeable

- **A module's own `opacity` fades the ink toward `params.background`, not
  toward transparency.** 2D: `globalAlpha` applies to the *offscreen*
  (`V_Kolam/visual_module.html:1280`), which is then `drawImage`d over a canvas
  already filled with the background. 3D: `WebGLRenderer({ canvas, antialias:
  true })` — **no `alpha: true`** (`V_Kolam3D/visual_module.html:1512`) — and
  `scene.background` is an opaque `THREE.Color`, so `material.opacity` blends
  against it.
- So **a dimmed Kolam3D is still an opaque near-black rectangle** holding a
  faint figure. This is invisible as a limitation at the default background,
  because `#0a0a0f` is almost exactly BD's page ground — the wrong control
  *appears* to work and then fails on any node with a light `%%bd_background`.
- **For the first experiments (graphic as background, bright text on top) the
  module's own `opacity` is the RIGHT control** — better than CSS opacity on the
  iframe, which would also fade the slot's own black toward the page and buy
  nothing.
- The limit is one layer up: **two stacked visual slots, or a background that is
  not near-black**, needs `alpha: true` + `setClearAlpha(0)` +
  `scene.background = null`. That is a change to the MODULE, so its author's
  call.
- **Round-trip is safe.** `applyControlDirectives` writes `opacity` on every
  control change (`V_Kolam3D/visual_module.html:1136`) and `setDirectiveValue`
  reconstructs whichever form it read (RULE 1, `:1094-1114`), so a value chosen
  in preview rides into the collage inside the module's own block.
- **Naming, deferred not decided.** A collage stepper also called `opacity`
  would collide with `%%bd_p_opacity` inside a merged block, and at the default
  background the two are indistinguishable. If a collage-level dimmer is ever
  needed, call it **`dim`**, pairing with `duck` — duck lowers a module's sound,
  dim lowers its picture, and neither word appears in any module's stepper list.
  The background case does not need one, which is the better outcome under
  `CollagePlanStarted_2026-09-22.md` §7–§16's rule that a control earns its place
  only when the value cannot be chosen without perceiving the outcome.

### Text IN the 3D scene — the numbers

There is no font size in a 3D scene; the governing quantity is world height ÷
camera distance. The module pins everything else: `CAM_FOV = 50`
(`V_Kolam3D/visual_module.html:1487`), a **square** canvas — `min(wrapper width,
height)` (`:1522-1534`) — and default `cam_distance` 260, giving a visible
vertical span of **242.5 world units**.

> **world height ≈ 0.64 × desired cap height in CSS px**, at `cam_distance` 260,
> scaling linearly with distance.

| cap px | ≈ font px | world height | chars across, H=380 | H=800 |
|---|---|---|---|---|
| 7 | 10 — floor | 4.5 | 76 | 160 |
| 10 | **14 — comfortable min** | 6.4 | **53** | 112 |
| 14 | 20 | 8.9 | 38 | 80 |
| 18 | 26 | 11.5 | 29 | 62 |
| 24 | 34 | 15.3 | 22 | 46 |
| 30 | **43 — headset-safe** | 19.1 | **18** | 37 |

(cap height ≈ 0.70 em, character advance ≈ 0.50 em for a readable sans.)

- **Headset-safe is ~18 characters per line.** A Quest 3 gives roughly 25 pixels
  per degree against a phone's ~95, so text needs **3–4× the angular size** in a
  headset. Size for VR and it is comfortably large on screen; size for the phone
  and VR gets mush. This is §8c's rule — *specify size in ANGLE, not pixels* —
  applied to glyphs rather than to lines.
- **The square canvas, not the preview, is the constraint.** Portrait phone:
  View ≈ 390 px, the BD preview ≈ 380 px — **essentially identical**, because the
  canvas is square and sized to the narrower dimension. So whatever is readable
  while adjusting steppers is readable in View, and on a phone the preview is all
  you have. The gain arrives only on a desktop or landscape screen, where the
  square becomes the ~800 px height and everything roughly doubles.
- **`cam_distance` (20–9900) will swim world-sized text** — a third the size at
  780, unreadable at 2000. Either parent the text to the camera (fixed angular
  size, a HUD plane) or slave its scale to `cam_distance`. **Decide before
  building, not after.**

**Technique.**

- **`CSS2DRenderer` / `CSS3DRenderer` is ruled out.** It is the obvious route and
  it is crisp, because it is real DOM text — and an immersive WebXR session
  displays **no DOM at all**, so it is precisely the thing that cannot make the
  jump. Choosing it would repeat the mistake the three.js standing decision
  exists to prevent.
- **Start with a `PlaneGeometry` + `CanvasTexture`**: it reuses the `ctx.fillText`
  idiom already in the module, adds no dependency, and at ~18 characters needs no
  wrapping. Render the canvas at 2–3× for texel density or it blurs.
- Keep **`troika-three-text`** (MSDF — crisp at any scale and depth, real
  wrapping) in reserve for text that must be read at varying distance.

**Why it is worth doing at all:** a plane in the scene can be **occluded by and
intersect** the figure. No DOM overlay can do that, at any opacity. That is the
new expressive thing, not "text in 3D" as such.

**Caveat, and it is load-bearing:** the module already sets
`material.depthWrite = false` whenever `opacity < 1`
(`V_Kolam3D/visual_module.html:1617-1623`), so at the low opacity wanted here the
figure will **not** hide the text — the text reads *through* it. That is almost
certainly the wanted effect, but it is currently a side-effect of the opacity
handling rather than a decision, so it is easy to break later without noticing.

### A second collage module — lines one at a time in 3D (author's sketch, FUTURE)

Shape, as sketched: takes the text **a line at a time** and displays it in 3D on
a **programmable interval**. Explicitly for later; recorded because three of its
consequences bind decisions being taken now.

**1. It is evidence for §7's SHARED-SCENE branch, and that is the main reason to
record it.** As a module of its own it gets its own iframe, its own WebGL context
and its own scene — and then the text **cannot** be occluded by or intersect the
Kolam figure, because the two are composited by CSS and not by a depth buffer.
That removes the one thing a 3D text module offers over a flat overlay. So the
exciting version requires either **one scene**, or the text being a **mode inside
Kolam3D** rather than a separate module. §7's middle path — a module may *also*
export geometry — would serve equally.

**2. It is a music-module shape with visual output.** Its defining feature is a
**clock**: transport, Play/Stop, a `%%bd_p_` interval. Structurally it is closer
to DroneFrac than to Kolam3D. That breaks **`MODULES.kind`**, currently a binary
`'visual' | 'music'` — it will need a third value or a second axis.

**3. Consequences to carry:**

- **No new syntax is needed.** `%%bd_text [` … `%%bd_]` already gives one line
  per line. Settling that now stops a format being invented for it later.
- **The interval stepper earns its place** under the §7–§16 rule: reading pace
  cannot be chosen without hearing/seeing the outcome. Probably a fade or hold
  beside it, so lines cross-fade rather than cut.
- **Write the line clock on WALL TIME from the start** — `driftNextDue`-style, as
  the 2D Kolam's drift clock does. A timer rescheduled *after* its render has a
  systematic rate bias (`project_script_source_of_truth`), already paid for once;
  here it would make the reading pace drift with scene complexity.
- **Speech and the line clock are two clocks and they will fight.** Piper
  utterance length is not predictable from character count. The sane default is
  **speech drives, the interval is a floor** — but that is a fork to NAME now and
  decide later.
- **18 characters against 30–45.** A headset-safe line is ~18 characters; a line
  of verse is typically 30–45. So "one line at a time" in VR means accepting
  roughly half the safe size, or folding each line in two.
- The in-page presentation decision already protects a line timer from iOS
  throttling of background tabs — but **only** because of that decision, so the
  dependency now runs both ways.
