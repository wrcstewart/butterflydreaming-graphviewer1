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
| **Standalones FROZEN, not retired** | — | `bd_V_Kolam`, `bd_M_ABC`, `bd_M_Fractal` stay deployed and working; still useful to an experimenter and still a good way to send one node. No new features. **Finish Fractal and ABC first** so all three are left coherent. |
| AT controls | `external_collage_viewer.md` | **The open question.** Presentation is the job, so "few" — which few is undecided. Keep the AT (for the BD user) distinct from the external viewer (for a stranger). |

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
