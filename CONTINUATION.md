# Continuation note — 2026-09-05, 23:05 BST

**Read this first if context has been lost.** It says where the work is, what
state it is in, and which document answers which question.

---

## 1. Where the work is

**Branch `remote-graph-view`.** `main` is untouched and still the stable viewer.

    git branch --show-current     # expect: remote-graph-view
    git log --oneline -1          # expect: 2b9785c or later

**Nothing here is merged.** If `main` is what you want, `git checkout main`.

Current build: **`viewer.js?v=764`, `style.css?v=445`**, canary **blue**.

**Read `session_notes_2026-09-05.md` FIRST — Part 2 is the live work**: voice
training. Toolchain verified in `~/bd_voice_train`, BD loads `local/` voices,
recording rig at `/voice_record.html`, 62 prompts designed and counted.
NEXT: record ~25 prompts, fine-tune, export, listen. Part 1 covers onboarding.

**Read `session_notes_2026-09-05.md`** — it is the most recent state:
onboarding, the speech offer on the first Root click, and the pairing split.

Test URL: `http://localhost:8080/?ink=1&intro=1` (grey rings, speech dialog
forced). Phone: the same parameters on `https://graph.virtualfictions.uk/`.
`?intro=1` also clears the Speak checkbox, so it simulates a true first visit.

**Speech is SHIPPED INTO BD** and working on desktop (iOS retest pending). The
Speak checkbox drives client-side Piper with an IPA lexicon; nothing about speech
touches the server. Read `session_notes_2026-09-04.md` — Part 2 carries three
platform rules that cost most of a day: ONNX `session.run()` blocks the main
thread and starves audio, `HTMLMediaElement.volume` is read-only on iOS, and
WebKit restricts concurrent media.

**Piper DIRECT** (`piper_direct.js`) — our own
synthesis path giving IPA pronunciation control and the model's real speaking
rate. Read `session_notes_2026-09-04.md` first, then `…09-03.md`.

**Engine DECIDED — Piper, RTF 0.17 on an iPhone.** Read
`session_notes_2026-09-03.md` first; it is the checkpoint, including the six
platform faults (none a capability gap) and the one OPEN problem: the
pronunciation lexicon, where `[[espeak phonemes]]` verify correctly on the
command line but are read out letter by letter in the browser. espeak-ng is
installed locally for ground truth. **Do NOT turn on COOP/COEP in BD** — speech
does not need it and it would block the module iframes.

**Earlier staging — read `speech_plan.md`.** Stage 0 is built
(`2b9785c`): a Speak checkbox reads node text and arriving cards, synthesised
server-side by macOS `say` and cached. The voice is a DELIBERATE placeholder.
**Stage 1 is next: the same architecture with a real neural engine and its own
stock voice, before anyone records anything.** `session_notes_2026-09-02.md` has
the reasoning, including why Mandarin tones are not pursued.

**Read `session_notes_2026-09-01.md` too** — it covers the whole of 1 Sept:
chunked presentation retired, Gateways re-parented under Conversations, the
splash rebuilt, the ring geometry corrected, and three faults in the curation
write path (one of which was silently destroying node text). Its closing table
is the live open-items list.
Server: `BD_GRACE_MS=5000 node server.js` (5s grace is a DEVELOPMENT value —
`BD_GRACE_MS=65000` before real use; the server warns at boot).

Two flags gate everything on this branch:

| flag | default | what it does |
|---|---|---|
| `?ink=1` | off | the whole colour scheme. **Without it the branch renders like `main`.** |
| `BREADCRUMB_BARS` in viewer.js | `false` | the retired breadcrumb strips. Flip to bring them back. |

---

## 2. Which document answers which question

| question | file |
|---|---|
| What does the screen mean? Why is it built this way? | **`remote_view_spec.md`** — read the AS-BUILT box at its head first |
| Why are the colours what they are? | **`ink_mode.md`**, and `ink_palette_swatch.html` (open at `localhost:8080/ink_palette_swatch.html`) |
| What was decided about the corner controls? | `corner_controls_plan.md`, `editing_spec.md` §v0.2 |
| What happened on a given day? | `session_notes_2026-08-2*.md`, and this branch's git log |
| What is every doc, and how far is each built? | `DOCS_INDEX.md`, `PLANNING_REGISTER.md` |
| How does the graph actually work? | `edge_model.md` — **read before touching layout or edges** |
| How is a WORK presented — gateway, titles, passages? | **`work_views.md`** |

Memory lives outside git at
`~/.claude/projects/-Users-williamstewart2-butterflydreaming-graphviewer1/memory/`
and is mirrored into the repo as `MEMORY_SNAPSHOT.md`. See `HowToRestore.md`.

---

## 3. What the screen means, in one table

**STATE IS ACHROMATIC. Colour belongs to content.** This is the single most
important thing on the page, and it reversed an earlier decision — see §3a.

Every ring is white; only OPACITY and WIDTH carry meaning.

| ring | opacity | width | meaning |
|---|---|---|---|
| inner | 0.5 | 0.5px | a node in YOUR view (reads as grey) |
| inner | 0.5 | **2px** | **YOUR centre** |
| outer | 0.8 | 0.5px | your partner can see it too |
| outer | 0.8 | **1px** | **THEIR centre** |
| inner + outer | 0.5 / **1.0** | **1.5px each** | you are both on it — the target |

**Yours thickens the INNER ring, theirs the OUTER.** Whichever ring grows says
whose focus it is, and neither needs a colour to say it.

Widths come from `HALO_THIN` (0.5) via `SEL_MUL_IN` (4, yours), `SEL_WIDTH_MUL`
(2, theirs) and `SNAP_WIDTH_MUL` (= SEL × 1.5). **They are not independent** —
thinning the base shrinks everything derived from it, which has silently undone
two earlier adjustments. Yours takes a BIGGER multiplier because the inner ring
sits at 0.5 opacity against the outer's 0.8, so equal widths do not buy equal
visibility.

Geometry: the outline runs the whole way from the body, `wIn + wOut` wide, with
the border drawn over its inner part. So the visible bands are exactly `[0,wIn]`
yours and `[wIn, wIn+wOut]` theirs, and there is no antialiasing hairline between
them.

**Your own centre is not marked on the graph.** The Local control names it
instead — that control shows WHERE YOU ARE, not where Back would take you, and
pressing it still goes back.

The controls carry the same three strengths as achromatic borders: Local 2px @
0.5, Remote 2px @ 0.8, Common 3px @ 1.0. Their BACKGROUNDS keep the node's own
colour, because that is content.

**Route arrow** `#9FD0FF` solid 2.5px, head on the node to CLICK. **Route
shadow** ramps 0.2 → 0.8 along the hops, so distance is visible rather than
counted. **Reading-spine successor** is dotted grey (white @ 0.5) — a suggestion,
where the route arrow is solid because it is a recommendation.

**The route is CANONICAL**: both users compute the identical path. Distances run
from the endpoint with the smaller url and ties break by url, so A→B and B→A
agree. Without that they walk equal-length but different corridors and never
meet — which is the whole convergence idea failing silently.

**A route view shows ONLY the route.** The reading spine is suppressed while one
is showing, and the legacy `bn-edge` marking is retired — three edge vocabularies
were being drawn at once.

**Back is transparent to a route**: leaving one by tapping suppresses that
navigation's `saveState`, so Back returns the view you were in BEFORE the route
rather than the hop diagram.

Card heads say WHO: gold `#8d7900` you, navy `#001f4d` partner, grey `#C9CCD1`
system (helper hints share the grey).

---

## 3a. The reversal, and why it matters

`ink_mode.md` says the black bodies exist to FREE COLOUR FOR STATE. **That is no
longer true and the doc's rationale is superseded.** We went the other way:
state gave up colour entirely.

The reason, in the user's words, is that colour was doing two unrelated jobs —
labels use it for CONTENT, rings were using it for STATE — and two vocabularies
in one channel is confusing however well explained. Needing the explanation was
the tell.

Ink mode is still right, but for the OTHER two reasons: transparent bodies stop
nodes occluding each other, and moving identity into the label leaves the node's
outline free for rings.

## 4. What is unfinished

| | |
|---|---|
| **The crossing** | Simultaneous clicks swap without reaching green. Detectable with no protocol via `previous`. **The user is deciding what it should MEAN** — "you passed each other" vs "you crossed". `remote_view_spec.md` open list. |
| Weighted hubs | Routes currently EXCLUDE hubs outright. Measured: 0 of 400 pairs unreachable, so this is a refinement for a larger corpus, not a fix. |
| Gateway row at scale | At ~40 works a Cluster view shows ~10 gateways (27 for popular themes) against 2.2 now. **This is what breaks first.** |
| `.card.local .card-head` | Still `#8d7900`, chosen to match the old selection ring. The ring is now `#FFD400`, so that correspondence has lapsed. |
| `isGreen` in renderMarks | Declared, now unused. |
| Explore protocol | Retired. A consent step is still wanted for SAVING — see `editing_spec.md` §7, which is the part worth re-reading. |

---

## 5. Traps that have cost real time

- **Verify the effect, not the exit code.** A `&&` chain commits even when the
  edit aborted. One commit shipped only a version bump. Put the verifying grep
  BEFORE the commit.
- **After replacing a span of code, grep for every function the new code CALLS**
  — not for what you just wrote. A span replacement silently deleted
  `findBridge` and no route appeared; `node --check` passes on a deletion.
- **Never `git add -A` here.** The repo root permanently holds ~127 MB of
  untracked mp3s. Stage by name.
- **A relayed message needs THREE sites** — sender, server whitelist, client
  RECEIVE whitelist. Two of three fails silently.
- **Whatever runs last decides** — and its mirror: `publishPosition` ran FIRST
  and so reported the view it was leaving.
- **Placing a node after a layout is NOT a constraint on that layout.** If other
  nodes must move out of its way, fcose has to be told —
  `fixedNodeConstraint`, not a post-hoc `position()`. Post-layout placement is
  right only when the destination is empty space.
- **Stale BARE hints send a view down the wrong `runLayout` branch.** Three times
  now. A bare `hint_x` means "positioned in SOME view" and the reader cannot tell
  which, so it is applied in views it was never about. Anything that must hold
  for a KIND of view belongs before the branches, not inside one. 166 bare-hint
  edges remain: 162 `DESCENDS_FROM`, 3 `CLUSTER_REL`, 1 `CONTAINS`.
- Client console forwards to **`/private/tmp/bd_server.log`**. A second "no
  different" means instrument, not iterate.
