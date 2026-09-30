# Continuation note — 2026-09-08, updated 09-12, 09-15, 09-17, 09-18, 09-28 and 09-29

**Read this first if context has been lost.** It says where the work is, what
state it is in, and which document answers which question.

Written before a period away from the machine, so it assumes nothing is
remembered.

---

## 1. Where the work is

**Branch `remote-graph-view`.** `main` is untouched and 226 commits behind; it is
still the stable viewer.

    git branch --show-current      # expect: remote-graph-view
    git log -1 --oneline           # expect: 50da4d5 or later (2026-09-29)

Everything below is on that branch and pushed. Merging to `main` is a deliberate
act still to be taken — see §5.

**To bring the site back up after a restart:**

    cd ~/butterflydreaming_graphviewer1
    node server.js                 # or: nohup node server.js > /private/tmp/bd_server.log 2>&1 &

Local `http://localhost:8080/`, public `https://graph.virtualfictions.uk/` via a
long-running `cloudflared` tunnel. **Client console output is forwarded to
`/private/tmp/bd_server.log`** — that log is the primary diagnostic and has
settled arguments that days of reasoning did not.

Current served versions: `viewer.js?v=798`, `style.css?v=480`, canary **green**.

---

## 1a. What has happened since this note was written (2026-09-12)

One day's work, all on `remote-graph-view`, all pushed. **Nothing in the
sections below was invalidated** — this is additive.

**Deep-link sizing was investigated and documented.** New reference:
`DeepLinking.md`, which opens with a START HERE summary. The finding: links are
~686 chars and Apple's data detector (Notes, Messages, Stickies) silently
truncates plain-text URLs over **659**, dropping the payload so the module
opens `DEFAULT_SCRIPT`. **Email and the address bar are unaffected.** It broke
on 2026-07-17 when the `name` field joined the payload and took the URL from
654 to 686 — it had been sitting 5 chars under the ceiling.

**Two changes were built, shipped and then REVERTED at the user's request:**
moving the payload to `#data=`, and copying a rich `<a href>` clipboard
flavour. The system is back to `?data=` and plain-text copy. Receivers still
accept `#data=` and a `hashchange` reload remains — inert, kept so links copied
on 09-11 still resolve. **Do not re-investigate the fragment or a supposed
newline**; both were measured and excluded, and `DeepLinking.md` has a
dead-ends list.

**Still live from this work:** the ~8 KB request-line limit means a 3-node
collage (8,276 chars) would fail **on a button press**. That is the real
blocker for the collage module, not sharing. The **JSP** design (positional
parameter arrays — a 3-node collage of saved nodes is 87 chars) is recorded in
`DeepLinking.md` and `PLANNING_REGISTER.md`.

**Housekeeping done the same day:** `MEMORY.md` had reached 29 KB against a
~24 KB load limit and was being truncated, so entries past the cut were
invisible to new sessions — trimmed to 15 KB by moving detail into the topic
files, nothing deleted (pre-trim state at `398a508`). `DOCS_INDEX.md` was
rewritten as past/present/future with 19 missing documents added, and
`PLANNING_REGISTER.md` updated with eight designs and two corrected statuses.

---

## 1b. And since then (2026-09-14 / 15) — a direction change

Still `remote-graph-view`, all pushed. **Additive again: nothing below is
invalidated, but two things in §2's reading list have been superseded in
detail.** Read `AV/README.md` and `PLANNING_REGISTER.md`'s 2026-09-15 block
before acting on anything in this area.

**The Ancillary Viewer (AV) is built and in daily use.** BD mints a
short-lived single-use token, opens a viewer WINDOW beside itself, and drives
it live over the socket. The viewer is BD's own page (`/AV/kolam.html`) using
the SAME renderer as BD and the standalone. Confirmed working on desktop and
iOS, and described by the author as "very snappy on ios so the design is
validated".

**Standalones are FROZEN, not retired.** New presentation work goes to AVs.
The frozen copies stay deployed and still work.

**`Jump` is now `View`, and its confirm dialog is gone** (`b6f603e`). The
dialog asked whether to pull the module's script into the card before baking a
URL; an AV never reads the card, so the question had no consequence. Removing
it made the handler synchronous up to `window.open`, which is what Safari
requires — **the click is the gesture**. This is the fourth time an `await`
before `window.open` or a clipboard write has broken Safari in this codebase;
the rule is now structural and commented as such. `Copy external url` is
**retired, not deleted** — `hidden`, handler still wired.

**CORS is now `origin: '*'`**, widened by the author so anyone may host a
module without asking. `module_data_modes.md` said "an allowlist, never `'*'`"
until 09-15 and has been corrected.

**A security hole was found and closed** (`dd6368d`). `edit_save`,
`edit_delete` and `edit_clone_cluster` checked only that a curation code was
CONFIGURED, then wrote — reachable by any origin. Proven with an anonymous
socket from a foreign origin, before and after. Three durable lessons, all now
in `project_curation_access.md`:

- **`curationCodeOk()` is the ONE check.** It was inline at each call site, and
  so was the decision whether to check at all. Never inline it again.
- **`socket.data.userId` is NOT authorisation.** Every socket gets one,
  including an AV's.
- **A module socket may send only `av_hello`** — verified even when it holds
  the correct curation code.

**ONE THING IS UNVERIFIED.** The gate was proven over a socket, but **Sv / Wr /
the cluster editor have not been clicked in a browser since**. The client now
sends a `code` on three messages it never sent one on. If curation looks dead,
start there — a refusal shows in `#dev-status` as "code rejected — re-enter
it", so it should no longer fail silently.

**Where the QR code goes, since it keeps being asked:** entirely BD-side. Only
BD can mint a token; an AV only consumes one and already accepts any token in
`?t=`. BD renders the token as a QR instead of opening a local window, and
another device's camera becomes the viewer. **The protocol needs nothing** —
`moduleFor` is a userId, not a device. Not built. Full note in `AV/README.md`.

**Canaries now rotate per code set, and the last line of every reply names
them.** BD's is `#copy-link-btn`'s border (`style.css`), the AV's is `#back`'s
(`AV/kolam.html`). They are deliberately out of step. **The media modules have
no canary host at all**, which is why renderer changes also bump
`AV/kolam.html`'s `?v=` — currently `?v=9`.

---

## 1c. Where it stands on 2026-09-17

Still `remote-graph-view`, all pushed, working tree clean.

**BD and the AV now reconcile state.** Three mechanisms, built in this order
and all verified:

1. **Exploration cache** — wandering off and returning no longer destroys the
   explored steppers. Per node, in memory, VALUES merged onto the node's saved
   text. Needs no viewer and no network; fixes the desktop case on its own.
2. **One viewer per module TYPE** — the token carries the module id and
   `av_push` filters on it server-side, so a Kolam script cannot reach a music
   viewer. `avWindows` is a Map now, not a single handle.
3. **The viewer hands its state back** — carried WITH `av_return`, because on a
   phone the way-back button closes the viewer and there is nobody left to ask
   afterwards.

**Confirmed working by the author:** the Down button, the angle cycle, Local →
node → Player, and the iOS round trip. The exploration cache is confirmed on
laptop.

### If something in this area misbehaves, read the log FIRST

`/private/tmp/bd_server.log` now carries far more than it did. As of 09-16 the
**renderer is no longer blind** — `visual_module.html` forwards its console and
uncaught errors as `[module] …`. That single change found the Down-button bug
in one press after two rounds of reasoning had missed it.

Lines worth knowing:

    [module] script in: N chars, 14 directives {...}   what the renderer GOT
    [module] render error: <message>                    it throws silently otherwise
    [Copy Up] writing N chars into: <card>              which card was written
    [View] reading from: <card>                         which card was read
    [BD] restored exploration for <node>                the cache fired
    [AV] return: took the viewer's state for <node>     the phone hand-over
    [BD] av_return -> <user> (with state, N chars)      server side of it
    [BD] av_return from a viewer whose session ... gone the orphan case
    [bg] BD hidden N s — timers x/y (z% of real time)   how asleep BD was

### Three traps that cost time here, all now in the code as comments

- **A BUILT card must be READ BACK, not flattened.** `getCardText` was
  `body.textContent`; a chunk body is several block divs and textContent joins
  them with NO separator, welding the hint onto `%%bd_]` so the score block
  never closed. `readChunkBody` is the inverse and already existed. This is the
  Sv lesson from September repeating.
- **`advanceOrNavigate` is a TOGGLE.** Clearing `readingState` +
  `lastAutoPlayerNodeId` must happen on the REQUEST (`armFreshOpen`), never on
  leaving Player — clearing on exit makes the next `updateSendBtn` drag the
  user straight back into Player.
- **`jumpToNode` is not a tap.** A tap is `markReadNode` then
  `advanceOrNavigate`; that pair is `openNodeAsTap`.

### Still open

- **Curation UI end-to-end test** — unchanged since 09-15 and still the one
  unverified thing. Sv / Wr / the cluster editor have not been clicked since
  the client began sending a code on three messages that never carried one.
- **`[bg]` probe has never been read.** One phone round trip would give the
  real number for how throttled BD is while backgrounded.
- **`V_Kolam/preview.html` has diverged four ways** from the live renderer
  (angle 5..90, no angle_minutes, step capped at 200, colour shown as the
  exponent). A shared link renders differently there. Standalones are frozen,
  so unfreezing one is the author's call.
- **No viewer page for ABC or Fractal**, so the per-type rule is built but not
  visible — a second window has nothing to open.
- **QR / cross-device viewer** — designed, entirely BD-side, not built.

---

## 1d. 2026-09-18 — the script is the source of truth

The author's reason, which governs everything in this section: *"only the
script is flexible enough to combine sharing / saving / collaging"*.

BD no longer pushes its module's live state to a viewer. **It pushes the
card.** An `auto` tick box (under the ↓, which moved 50% lower) makes the card
and the module one thing in BOTH directions, and is ticked by default. Unticked,
↑ and ↓ are the only ways across — that is the honest meaning of the decision,
not a bug.

**The one distinction to hold on to:** the drifting angle is RECORDED in the
script but NOT pushed to a viewer while drift runs. The viewer computes it from
the same script; BD's copy is older, and on a phone much older. The script
records, the viewer computes, and they reconcile when the user returns to BD.
Anyone "fixing" this by pushing the angle will reintroduce the iOS
backward-jump of 09-16.

**The lesson that cost three attempts**, and which applies to anything else that
writes into a card: recording the script is DATA and must never stop; redrawing
the card is PRESENTATION and must never land under a live cursor. Blocking on
focus kills sync permanently, because the caret stays in the card after typing
stops. Writing anyway and restoring the caret works on a textarea and destroys
it on a contentEditable body.

Two traps now commented at their sites: `setCardText` dispatches a SYNTHETIC
input event, so `e.isTrusted` is what separates a programmatic write from a
keystroke; and the renderer's default-fallback is right for a cold script and
wrong for a live edit, which is why BD holds back a card with a valueless
directive rather than letting the figure jump to the default mid-keystroke.

Full detail: `project_script_source_of_truth.md` in memory, and the 2026-09-18
block of `PLANNING_REGISTER.md`.

**Verified on desktop only.** iOS is where the angle division and the hand-back
actually matter, and it has not been tried.

### The eight fixes that followed, and the two lessons worth carrying

Testing the migration produced eight fixes in a day. Two are worth knowing
before touching any of this again:

**Fix the WRITER, not the reader.** `avLastPushed` had two writers — a real
push, and a listener that only records. Correcting what READ it achieved
nothing while the other writer still poisoned it, and the symptom simply moved
platform and looked like a new bug. If a variable's name and its value disagree,
find everything that assigns it.

**A timer rescheduled AFTER its work has a systematic rate bias.** The drift
clock did `setTimeout(tick, interval)` at the END of the tick, so the period was
`render time + interval`. A bigger canvas draws slower and therefore ticks
slower, for ever — BD and a viewer ran at genuinely different RATES, about 25
arcminutes apart over 20 minutes. Schedule from when the tick was DUE. This
pattern will be in any other animation loop in the codebase.

And one diagnostic habit that paid: *"subsequent pressing view always takes AV
back to the SAME position"* identified a FROZEN value, where "it jumps
backwards" alone would not have. Ask what shape the error has, not just its
direction.

---

## 1e. 2026-09-19 → 09-28 — a third module, and a rendering decision

Ten days, and §1d's "the script is the source of truth" held throughout — every
piece below is built on it rather than around it.

**BDX/AVX finished and aligned with BD.** The relay setting made foolproof (a
persisted setting that can outlive what it points at must be able to
un-persist itself; storing the DEFAULT is a pin, not a no-op). Spare tokens
fanned out, a Device dialog with a QR, `copy view URL`, Sync labelling, and a
statement of purpose on the page. **The three standalone repos are retired in
their READMEs** — the URL length ceiling is why, and BD is the controller now.

**`%%bd_hint` retired** from the code and the corpus — one directive doing two
jobs, of which the suppression half had never worked. **The AI note system was
restored** on `[[ … ]]`, after the author remembered it working and `git log -S`
proved it had been built in `af1605b` and lost in `392106d`. A memory of a
feature working is evidence.

**`_p_` control marking** carried across Kolam, Fractal and ABC with all four
nodes migrated, and **the viewers aligned**: Fractal and ABC had been shipping
full editors where Kolam shipped a viewer. They now all obey
`bd_ui_config { hideControls }` — control of parameters happens on BD or BDX;
the point of a viewer is to play the thing on another device.

**`bd_V_Kolam3D` — the kolam in three dimensions.** A new Cluster `Kolam3D` off
**Graphics**, not under Kolam: a sibling, not a variant. Same `%%bd_` script, a
different renderer, two angles instead of one and a camera to place. three.js
0.160.0 UMD from a CDN, pinned.

Its invariant, and the thing to check before touching any sign in the turtle:
**at `pitch 0` and `cam_elevation 90` it draws exactly what the flat module
draws**, verified numerically to `Float32Array` precision. It then grew
`step_pitch` (the step length in the new dimension, applied as `group.scale.y`,
which is exactly — not approximately — scaling the y of every move), `opacity`,
a `cam_elevation` opened to the full turn, and `cam_elevation_speed` to rotate
it on its own 20 Hz clock.

**Three faults worth remembering from building it**, because each was a comment
of mine being wrong about code I had already written:

- `cam_elevation` was clamped to ±90 under a note saying the poles would break
  round-tripping. True of a naive up vector; **not** true of the sphere's north
  tangent, which `placeCamera` had used from the first commit.
- `AV_ANGLE_LINES` named the angle triple **literally**, so when the 3D module
  added two more clocks their drift frames read as human changes and were pushed
  to the viewer — "small jerks of elevation every one or two seconds". The
  comment above it had predicted that exact failure; what it missed is that
  **adding a member to the category does the same damage as the matcher
  breaking.** Now `AV_CLOCK_LINES`.
- The hold-repeat floored at one step per tick and called small ranges "already
  quick enough", so `depth` crossed its whole range in **0.24s**. A floor you
  cannot go below is not the same as a floor you do not need.

**RULE 9** (in the collage plan): a module's default script carries no directive
it cannot act on. `%%bd_weight` and `%%bd_stroke` came out of the 3D node —
dead text in a card a person reads.

**And a standing decision, 2026-09-28: visual modules render through three.js.**
Not because 3D is better, but because a 2D canvas has no WebXR route at all
while a three.js scene is a session flag away from a headset.

**Read `ThreeJS_and_VR_2026-09-28.md` before any graphics or XR work.** It grew
into the whole fact-gathering: the measured scoping and estimate; two
requirements the intended experience imposes (**never move the camera** —
a comfort property, not plumbing; and smoothness beats fidelity); **three
delivery shapes**, of which BD-flat-in-the-headset-browser with only the module
immersive is cheapest and the only one where the audio coheres, while the AV
viewer remains the *facilitated* mode; audio paths and a mic gotcha; which
headset to buy and why storage is the wrong axis; how to design against hardware
that improves slowly (**size things in angle, not pixels**); glasses, the
dimming dial no headset can offer, and the two divergent trajectories after Meta
Connect 2026. **§9 is the authoritative open list for the area — fifteen items —
and §7 is the collage fork, which has to be chosen before the collage is
built.**

---

## 1f. 2026-09-29 — the modes become two, and WHERE TO PICK UP

### ⇒ START HERE

**The JB alignment question is CLOSED — measured 2026-09-30, nothing to fix.**

    [JB] bar w=430 scrollW=430 fits | jb-right left=311 w=111 gapToEdge=8
         | visible: back-btn:85 jb-right:111

`gapToEdge=8` is the bar's own padding, so `margin-left: auto` is working and
the group sits hard against the right edge. The earlier report was pre-reload —
a phone holds CSS.

**But only ONE left-hand control was visible** (unpaired). Paired and merged the
bar carries five: Local, Remote, Green, ✕ and the View/Device group — roughly
85×3 + 38 + 111 + gaps + padding ≈ **406 of 430**, about 24px spare. On a
narrower phone that overflows, `margin-left: auto` has nothing to consume, and
the original symptom returns. **The probe is deliberately left in** to catch
that the first time anyone pairs on a phone.

Still untested on a phone: the two view modes, the prose card, the View fix, and
the AV button's new label.

### What changed today

**Three view modes became two: Browse | Create.** The reason is the collage —
*"iteration towards a user comprehensible create a Collage structure"* — because
three modes, two of which differ only in whether two buttons show, cannot be
explained to someone who did not build the system.

**Player was never a mode; it was a LAYOUT.** The NODE decides whether the
module shows. That removes the boundary the 09-22 card overwrite lived on: you
never "leave Player", you navigate away from a module node. `edit-active` had to
become orthogonal to `player-active` — the two modes being merged had opposite
layouts — and the state had to live at MODULE scope, because `updateSendBtn` is
not inside `init()` (the `bd:force-nodes-mode` listener exists solely to bridge
those scopes and says so).

**Browse is TEXT; Create is media.** Browse shows the node's PROSE — everything
outside the `%%bd_` directives — for EVERY node. It does not raise the module at
all: it offers **View** instead, because Browse eventually shows a COLLAGE, not
one work, and a module inline competes for exactly that room. A node that is
only directives falls back to its **name**.

⚠ **THE STRIP HAS NO INVERSE.** You cannot rebuild `%%bd_score` from prose, so
anything writing a Browse card back to a node destroys the script — the Sv bug
exactly. `autoWrite`'s redraw was already guarded by `player-active`; **`Sv` now
refuses outside Create**. Any NEW writer must check.

**The Jump Bar (JB).** The bar holding Local, Remote and Green — id still
`#bd-toppanel`, which misleads. **View and Device moved into it**, right-aligned,
out of `#bd-invite-panel-viewer`, which is now emptied and hidden. Top-row labels
dropped to 10px. Node labels lost the `bd_X_` taxonomy prefix so the sequence
number survives (`Kolam_001`, not `bd_V_Kolam_0…`).

**The AV way-back button** says `← Return to Node`, except on a separate device
where it stays `Sync` — the real axis being whether anything comes back or only
the state.

**Also:** opacity on the flat Kolam as well as the 3D one, both stepping in
hundredths; `bd_V_Kolam_001`'s script set to the author's values; and RULE 9 —
a module's default script carries no directive it cannot act on.

### Outstanding, besides the measurement

- **The five module nodes show only their name.** Each wants a line of prose.
  A good task: it forces "what is this piece?", the question a collage is made of.
- **The music modules' dock slots now receive nothing**, since the panel they
  docked is empty. Visible in Fractal and ABC; decide whether they still earn
  their place.
- **TIDY UPS LATER** in `PLANNING_REGISTER.md`: `#bd-toppanel` → `#bd-jumpbar`,
  and the identifiers saying "merge" that mean "route".
- **Step 3 of the mode work**: `Local` as a back button, labelled
  `Local:Browse` / `Local:Create`. Not urgent — Browse still clears the module
  layout, so the radio remains a way out. **Show the mode, do not SYNC it**: the
  asymmetric case (facilitator in Create, participant in Browse) is the valuable
  one.

### One correction worth carrying

**BD does NOT merge a partner's graph into yours.** Their view is stored and
never drawn; a shared node is only SIGNALLED when it is already in yours. Every
identifier saying "merge" — `clear-merge-btn`, `clearMergedView`,
`mergedRemoteIds`, `applyMergedView` — is a leftover from a design that was
scaled back, and they misled me into telling the author otherwise.

---

## 2. Start here, in this order

0. **`BD_SYSTEM_OVERVIEW.md`** — the master description of the system as built.
   Data model with live counts, views, the ring ladder, pairing, every write
   path, speech, and the open design questions. Written to be readable without
   the repo. **If you read one document, read this one.**
1. **`DOCS_INDEX.md`** — what every other .md in the repo is for.
2. **`PLANNING_REGISTER.md`** — how far each design is actually built.
3. **`MEMORY_SNAPSHOT.md`** — mirror of the out-of-git memory directory, written
   by `sync_memory_snapshot.sh` via a Stop hook. Never hand-edit it.
4. **`ThreeJS_and_VR_2026-09-28.md`** — read before ANY graphics work, and
   before building the collage. Carries the standing rendering decision and the
   fork that is cheap now and expensive later.

---

## 3. What changed in the last three days

**2026-09-06 — the speech offer, and the first voice fine-tune.**

- The speech dialog is asked **every visit** and is **identical every time**.
  Nothing about the answer is remembered. A short form for returning readers was
  built and reverted the same day, on the author's call: the variation cost two
  flags, a branch, a CSS rule and a real question about which flag the download
  warning should key on. `bd_speak` and `bd_speak_explained` are retired and
  cleared at boot; only `bd_speak_dl` survives, and only for the checkbox path.
- **A voice was fine-tuned end to end** from 6.2 minutes of the author's own
  reading — 42 minutes of training, exported to ONNX, loaded, and judged
  intelligible. Everything about it, including seven toolchain breakages and a
  re-runnable command block, is in **`voice_training_pipeline.md`**.

**2026-09-07 — the overview, and a cascade bug.**

- `BD_SYSTEM_OVERVIEW.md` written and then corrected several times against the
  author's knowledge: colour did **not** go away with the achromatic model, the
  audience model is settled, and the SC problem got its own section.
- The radio strip was left-aligned to the panel edge. **It first moved the wrong
  way**, because a media override placed earlier in the stylesheet loses to the
  base rule at every width — a media query carries no extra specificity. Fixed by
  moving it below the rule it overrides.

**2026-09-08 — pairing closed to the public.**

- **Pairing now requires a code, on the client and on the server, for both the
  waiter and the arriver.** BD is publicly reachable with no content screening,
  so it is not fit for public pairing.
- **Pairing has its own code, separate from curation.** Both live in the
  gitignored `config.js`. The curation code is also accepted for pairing, since a
  curator holds strictly more authority; the reverse is not true.
- A **development notice** appears on the first click on Root, before the speech
  offer. It explains that pairing is closed, carries the code field, and invites
  a request by email. **Delete it outright when it stops being true.**

---

## 4. The state of the collaborative work

Everything downstream of composing is **behind the code** until content screening
exists. That is a decision, recorded in `BD_SYSTEM_OVERVIEW.md` §6.4a.

**The next design conversation** is what data is written when a user saves a node
they created, and how joint editing should work. The author is holding that
conversation elsewhere and will bring conclusions back. §12 of the overview is
the agenda; §10 and §11 are the harder ground beneath it.

Two positions already settled, so do not reopen them:

- **Self-pairing is not prevented.** A same-IP check would break the most likely
  genuine pairing — two people in one house — while a determined user switches to
  mobile data and walks through it. The both-agree rule is etiquette, not an
  authorisation boundary. Limit consequences, not access.
- **BD is not written for children, but children are first-class citizens**, as
  are other vulnerable readers. Two child-protection advisors will review once
  content, screening and saving are built.

---

## 5. What is unfinished

| item | note |
|---|---|
| **Content screening** | The largest single challenge. TF.js toxicity plus identity-disclosure checks, then a later AI pass. **Nothing is built.** |
| **User-created nodes** | No node type, no write path, no provenance. The subject of the next conversation. |
| **The unguarded query channel** | `server.js` runs any Cypher a client sends. Any authenticated write path is decoration until this is faced. |
| **Merge to `main`** | 226 commits. A deliberate act, kept separate from the visual default flip. |
| **`BD_GRACE_MS`** | Still 5000, a development value. 65000 before real use. |
| **Recording the author's wife** | Planned within ~2 weeks. See `voice_training_pipeline.md` §7 — the espeak trap on contemplative vocabulary is the thing to check first. |
| **THE COLLAGE FORK** | Added 09-28. Several iframes each with a canvas, or one scene holding several objects. `ThreeJS_and_VR_2026-09-28.md` §7. **Settle before building the collage**, not after. |
| **Retire `bd_V_Kolam`?** | The 3D module is a *measured* superset of it. The one real loss is `weight` — core WebGL ignores line width. Two stored nodes would need migrating. |
| **Kolam3D on a phone or headset** | Verified on this machine only. WebGL context loss on a backgrounded tab is the specific thing to watch; the 2D canvas has no equivalent. |

---

## 6. What exists ONLY on this machine

Nothing here is in git, deliberately — the repository is public and a voice is
personal data.

| path | size | if lost |
|---|---|---|
| `voice_dataset/` | 34 MB | recordings. Covered by Time Machine, and the first set was a disposable rehearsal anyway |
| `voices/` | 121 MB | rebuildable from the recordings |
| `~/bd_voice_train/` | 5.7 GB | rebuildable; the venv and base checkpoint are downloads |
| `config.js` | — | holds `CURATION_CODE` and `PAIR_CODE` |
| `backups/` | 71 files | DB dumps from curator writes |

The machine is covered by Time Machine, so none of this is at real risk. The
ordering still holds if it ever matters: everything else can be regenerated from
`voice_dataset/`, and `voice_dataset/` can only be regenerated by recording it
again. **That becomes worth minding when the real hour-long set is recorded** —
a rehearsal can be redone in forty minutes; a session with someone else's time in
it cannot.

---

## 7. Traps that have cost real time

- **Never `git add -A`.** The repo root permanently holds ~127 MB of untracked
  mp3s and ingest files. Stage by name.
- **Verify the effect, not the exit code** — and for CSS, verify what *wins*, not
  what is served. A rule being present says nothing about whether it applies.
- **A relayed message needs three sites**: sender, server whitelist, receiving
  client whitelist. Two of three fails silently.
- **Anchor scripted edits on constant names**, never on a paragraph of prose.
  Long anchors drift, the script raises, and an `&&` chain commits anyway.
- **Sv saves text, Wr saves layout**, and both say "saved".
- **Never grant authorisation by IP address** — the tunnel makes every public
  visitor arrive from loopback. The real address is in `CF-Connecting-IP`.
