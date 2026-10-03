# CHANGELOG

Human-readable running log of substantive work sessions. Newest entries at the top. Committed alongside the code, so `git log CHANGELOG.md` reads as a summary-of-summaries.

The full commit history in `git log` is authoritative; this file is the friendlier read.

---

## 2026-10-02/03 — bd_M_DroneFrac: a granular drone, and a licence that could not be kept

A fifth media module, **`bd_M_DroneFrac`** — `M_DroneFrac/`, served at
`/bd_M_DroneFrac/`, Cluster **Drone** under Music, content node
`bd_M_DroneFrac_001`. Published standalone at
[/DroneFrac/](https://wrcstewart.github.io/ButterflyDreaming-Standalone-DroneFrac/).

**What it is.** A sustained sample never stops sounding; it is chopped into
grains and an L-system walk steers them — the walk's height sets their pitch,
the length of its horizontal runs sets their size. **Two independent
destinations from one walk**, which is the reason it exists: `bd_M_Fractal`
walks the same kind of turtle but funnels everything through an ABC score, where
duration and pitch arrive welded together. There is no notation here to collapse
them. A second channel reads the same walk at an offset two octaves up, so at
any moment you hear two places in one walk — a chord the grammar builds from
itself. Export is **.wav only**: no interchange format for a granular patch
exists, and MIDI carries notes, of which this has none.

**No LFOs, and that is a finding not an omission.** `GrainPlayer`'s `detune`,
`grainSize`, `overlap` and `playbackRate` are **plain numbers in Tone 14, not
Signals** — the docs read as though you can connect to them and the source says
otherwise. They are read when a grain FIRES, so the effective modulation rate is
`1/grainSize`, five a second at the default. The trajectory is therefore
SCHEDULED rather than connected, and for drone-speed movement five steps a
second is far finer than the ear resolves. The author's question — "why do we
need the LFOs, is it because the drone will sound stepped?" — was the right one:
they were a carry-over from a synth design and were dropped.

### The licence incident, which is the part worth remembering

Two pads came from **Sample Focus**. Its Standard Licence grants a royalty-free
right to use a sound *"as part of a new creative work"* but prohibits making it
available *"in a complete, archived, downloadable, or readily extractable
format"*, prohibits redistribution as part of a sample pack, and is
**non-transferable**.

Serving the file from BD is exactly that. **Verified publicly downloadable** at
`graph.virtualfictions.uk/bd_M_DroneFrac/sources/...`, HTTP 200, full file,
through the live Cloudflare tunnel. Moved out of the served tree immediately —
the repo root is `express.static`'d as well as the module route, so there is no
safe folder inside the checkout; they now live at `~/bd_private_samples/`.

**And BD publishes CC0, which cannot be claimed over someone else's work.** That
is the more serious half: a false licence statement invites downstream users to
redistribute in reliance on it. Nothing ever reached GitHub.

**"Royalty-free" is about ROYALTIES.** It says nothing about whether you may
pass the file on. The question to ask a sample library is whether the SAMPLE may
be redistributed, not whether music made from it may be — and that is now the
first item on the candidate checklist in `M_DroneFrac/sources/SOURCES.md`.

### Six CC0 pads, all rebuildable

Three from the [Versilian library](https://github.com/sgossner/VCSL) (CC0, and
the Renaissance Organ carries an explicit redistribution grant in its own
`Info.txt`), three from Freesound — two by **voxlab**, one from a deleted
account which is flagged in `SOURCES.md` as the lowest-confidence entry because
its description says *"royalty free collection"*, the exact phrase that caused
the above. `make_organ_pads.sh` and `make_sample_pads.py` ship with the module:
**a derived work nobody can rebuild is one whose licence cannot be checked.**

**The registration matters more than the octave.** Dropping the organ pads'
nominal octave twice barely changed what was heard. Measured on one note, share
of energy at or below C2: **Full 10.9%, 8′ 46.3%, 4′ 2.9%** — "Full" is a
mixture with upper ranks built in, so most of its energy lives above its nominal
pitch and moving the fundamental moves little. Also discovered: **VCSL labels
its files an octave low** (the file called `C1` sounds 65.4 Hz, which is C2).

**Loop length is a musical choice, not a technical one.** The author noticed
that the vox pad cut from 2.5 s was "more interesting musically" than the J8 cut
from 16 s — the opposite of what the measurements predicted, the J8 being much
the steadier source. The reason is repetition: a 5 s loop recurs seven times in
a 36 s pad and each time the detuned voices stand in a different relation, which
the ear follows as theme and variation. A 64 s loop is longer than the pad, so
it is heard once and never recurs. **The seam-free long loop, which cost three
rounds to arrive at, is musically the weakest of the six. Steadiness measures
suitability, not interest** — and every candidate had been screened on
steadiness alone.

### An output stage

`%%bd_p_volume` (−40..+6 dB), `%%bd_p_bass` and `%%bd_p_treble` (±12 dB, shelves
at 250 Hz and 3 kHz), `%%bd_p_balance` (−1..+1). All `_p_` marked and therefore
**written into the script**, which is the point: a drone is played *against*
something — the author was running one under the Tao Te Ching — and a balance
you cannot write down has to be found again every time.

Order is `reverb → EQ → pan → volume → limiter → out`: EQ before the limiter so
a boost is caught rather than clipped, volume after the EQ so the fader means
what it says, limiter last because it is all that stands between grain summing
and a clipped output. Bake renders the same four, and the spectrum taps after
the stage.

### Four faults of my own, each instructive

**The crossfade that cost 16 dB.** A 0.6 s self-overlap crossfade, added to cure
a loop click, left only the overlap window with both voices present — so each
pad was loud for 0.6 s and 16 dB quieter for 3.7 s, repeating. It went unnoticed
because **the seam was measured and the envelope was not**. A fix aimed at one
property must be checked against the others. Removed; 5 ms fades to zero at both
ends do the job, because a step at the wrap becomes impossible rather than
unlikely (998 → 8 of 32768).

**And that crossfade WAS the reported symptom.** "Higher frequencies come in
briefly every few seconds and pop" was those loud 0.6 s windows, not a click at
all. I diagnosed a splice and treated something else.

**A ratio against a moving baseline will lie to you.** High-band energy
*relative to the median* reported the crossfade as 15 dB worse when it was 8 dB
better — smoothing the signal moved the median too.

**Answering BD's poll loops.** `BD_REQUEST_UPDATE` went into the new wrapper's
`RELAY_DOWN`; the three older wrappers omit it deliberately. BD polls, the
module announces, BD rewrites the card, the card is pushed back — observed in
the server log cycling 540 → 544 → 542 → 540 chars several times a second. A
module announces on a USER ACTION, which cannot loop.

### Two cache lessons, learned twice

**A canary certifies the file it lives in, and nothing else.** Two rounds were
lost to a fresh page serving stale audio: the canary said current, the sound
said otherwise, so the natural conclusion was that the edit had failed. Sample
URLs now carry a **content hash** from the manifest (`?v=<sha>`), which also
matters for the published copy behind a CDN — the same lesson `AV/kolam.html`
already encoded for its renderer and which I had not applied to assets.

**A browser cannot read a directory.** The sample dropdown is fed by
`sources/manifest.json`, generated by `make_manifest.py`. A manifest rather than
a server endpoint because an endpoint works in BD and fails on GitHub Pages.

### Also

- **`CLUSTER_REL` is what makes a content node reachable.** The new gateway had
  its three edges right and showed nothing under it; `bd_M_Fractal_001` carries
  a `CLUSTER_REL` to its cluster and the new node had none. I had compared the
  gateways and never the content nodes.
- **`<select>` cannot wear the label font.** iOS Safari zooms the page when a
  form control under 16px takes focus, and in an iframe that zoom is
  unrecoverable — so the sample selector sits under the spectrum rather than in
  the 136px stepper column, but is `%%bd_p_sample` marked so the script still
  governs it.
- **A canvas sizing itself from its own rect inside a flex container is a
  feedback loop.** `drawSpectrum` sets `canvas.width/height`, which are the
  element's intrinsic size, so with `flex-basis: auto` it asked to be
  devicePixelRatio times taller every frame — and `.panel`'s inherited
  `flex-wrap: wrap` then moved the selector into a second column where
  `overflow: hidden` erased it. Fixed with `flex: 1 1 0` and `nowrap`.
- **`.panel button` outranks `.step-btn`.** (0,1,1) against (0,1,0), so the
  generic rule won on min-width, border, background, colour and font-size
  alike — the stepper buttons never had their intended styling, and three
  attempts to narrow them changed nothing on screen. Fixed by excluding them
  from the generic rule rather than fighting it.

### Speech: slower again

`SPEAK_LENGTH_SCALE` × 1.10 (effective rate 0.700 → **0.636**) and
`SPEAK_GAP_MS` 420 → **504**, both by ear after "it sounds a little rushed".
Two separate levers — the scale slows the delivery of words, the gap lengthens
the silence between sentences — and the comment beside `SPEAK_GAP_MS` already
predicted the coupling. `SPEAK_VERSE_SCALE` is derived, so verse stays 8% slower
and both move together. **`SPEAK_LINE_GAP_MS` left at 180 on purpose:** the
report was about sentences, and the value exists to make a line turn audibly
shorter than a full stop — 180:504 states that more clearly than 180:420.

---

## 2026-09-30 — MODULES learns about the new repos, and a canary that was owed

`MODULES` in `viewer.js` gains a **`page`** field naming each module's home
among the four new `ButterflyDreaming-Standalone-*` repos, and `bd_V_Kolam3D`
gets its first entry of any kind.

**`page` is not a second name for `standalone`, and the tempting tidy-up is a
silent data loss.** `standalone` is a *deep-link target*: `buildExternalWebsiteUrl`
appends `?data=<base64>` or a JSP form, and the page at the other end decodes it
and renders the script it was sent. The three older repos still do that and are
**still live** (verified 200). The four new pages read **nothing** from the URL —
deep linking was dropped on purpose, its apparatus being the reason the old ones
were frozen. Point `standalone` at a `page` and the link still opens, the module
still draws, and the user's script is quietly replaced by the page's default,
with nothing anywhere reporting it. The comment in the table now says this at
length.

Kolam3D still has no `standalone`, so its external link still goes to the 2D
player and still comes back flat. The warning now also names the page that
renders it properly. **Left as an open decision, deliberately:** whether that
button should instead send a 3D script to the right renderer showing the *wrong*
figure. Both are lossy, so nothing changed quietly.

### The canary was owed for a commit before this one

`8ae5581` gave both music modules the no-host-chrome mode and rotated nothing,
on the stated belief that media modules have no canary host. **The comment
beside `#copy-link-btn` says the opposite in its own words** — the border
rotates for any file BD serves, "including the media modules … which have no
canary host of their own". The right reading is *the module has no canary of its
own, so BD's stands in for it*; the wrong one is *no rotation needed*. The AV's
`?v=` bump was missed in the same breath and has been applied (v25 → v26, AV
canary green → blue).

So this rotation covers two commits: BD **red → green**, `viewer.js?v=835`,
`style.css?v=481`.

### Still undeclared

The four standalone repos are served from GitHub Pages behind a CDN and **none
of them has a canary**, which is exactly the case the 2026-09-19 rule was
written for. Flagged, not built — it puts a visible mark on pages that may be
shown to people. The obvious host in each is the **Copy script** button border.

---

## 2026-09-30 — four standalones, and hostChrome splits off controls-hidden

Each of the four media modules now has its own repository and its own page: a
module, its script in a box beside it, a **Copy script** button, and a link back
to butterflydreaming.org. No build step, no bundler, no server.

| module | repo | page |
|---|---|---|
| Kolam3D | `ButterflyDreaming-Standalone-Kolam3D` | [/Kolam3D/](https://wrcstewart.github.io/ButterflyDreaming-Standalone-Kolam3D/) |
| Kolam | `ButterflyDreaming-Standalone-Kolam` | [/Kolam/](https://wrcstewart.github.io/ButterflyDreaming-Standalone-Kolam/) |
| Fractal | `ButterflyDreaming-Standalone-Fractal` | [/Fractal/](https://wrcstewart.github.io/ButterflyDreaming-Standalone-Fractal/) |
| ABC | `ButterflyDreaming-Standalone-ABC` | [/ABC/](https://wrcstewart.github.io/ButterflyDreaming-Standalone-ABC/) |

Defaults are the corpus nodes themselves — `bd_V_Kolam_001`, `bd_M_Fractal_001`,
`bd_M_ABC_001` — fetched live from Memgraph when the pages were generated, so
each opens on a figure or a piece that exists in BD rather than on an invented
one.

**Deep links are deliberately gone.** The earlier standalones packed the whole
script into a URL, which cost compression, a wire table of abbreviated keys and a
length ceiling to measure against — a great deal of apparatus standing between a
reader and how a module actually works, and the reason this was put off. Copy the
script; where it goes after that is the reader's business.

### hostChrome, split out of controls-hidden

A module reserves layout for furniture **only BD draws**. The Kolam modules keep
88px to the left and 52px below for the arrows and the Extension strip; the two
music modules hold a grid area for each of their two dock slots. A host that
stamps nothing into that reserve was getting it as lost picture — on a 430x335
wrapper the Kolam square fell to 283, and the music panel gave a third of its top
row and a third of its bottom to two empty dashed boxes.

`controls-hidden` could not say this. It means *the host supplies the stepper
column*, which is a different claim, and the two come apart exactly here: a
**viewer** wants the chrome released AND the controls gone; a **standalone**
wants the chrome released and the steppers KEPT. So `hostChrome` is its own flag
in `bd_ui_config`, defaulting to **true** — a host that says nothing keeps BD's
behaviour, and nothing already working changed. `hideControls` implies it.

Released, the music layout also lets the stepper column run full height (it is a
12-row scroller that wanted it) and gives the output panel the width the ext slot
was holding.

### What generating three pages from one caught

The three were spliced from the Kolam3D template, and the splice carried facts
that were true only of their origin: *88px to its left and 52px below* (the music
modules have no such gutters — they have dock slots), *the drift timer ticks
several times a second* (nothing in a music module drives one), *the module is
square and sizes itself to its iframe* (a music panel is not square and cannot
shrink with the width — the transport, the output panel and the stepper column
all need room whatever the phone is), *fetches three.js from a CDN* (Kolam fetches
lindenmayer.js; the music modules fetch Tone.js and abcjs), and a script-format
example naming `bd_V_Kolam3D` in all four READMEs. **A comment is a claim, and
copying a file copies its claims to somewhere they may not hold.** Each was
corrected against the module rather than reworded around.

### The Kolam README got the measurement

A kolam is a **closed looped figure on a lattice of dots**, and neither property
comes from the rewriting rule — both come from the angle, and most angles give
neither. Measured on the default rule: 45° and 90° close exactly (end-to-start
gap 0.0000) at every depth tried and for axioms of 3, 4, 6, 8 and 12 `F`s, so
closure is a property of the rule and not of how far it is grown. A **lattice**
is the separate condition that `360 ÷ angle` be a whole number — 4 headings at
90°, but 82 at 68°, where the weave is gone. 60° and 72° sit on a lattice and
stay open. That is why `angle_minutes` matters: a sixtieth of a degree opens a
closed figure, and the drift is how you watch a kolam come apart and reassemble.

---

## 2026-09-30 — verse gets its line-end pause

Reported: the Tao Te Ching, Zhuangzi and Grimm's read well; Hardy and Whitman do
not. The diagnosis was right — **a line break invokes a short pause when a person
reads verse, and here it produced nothing.** espeak turns `,` and `.` into pause
*phonemes*, which is why prose works; a newline is only whitespace.

**The mechanism already existed.** `SPEAK_GAP_MS = 420` is an explicit gap
between utterances, so a verse line only had to *become* an utterance — with a
shorter gap than a sentence gets. `splitUtterances` now splits verse at line ends
as well as sentence ends and returns `{ text, gap }`, where **the gap follows the
punctuation the fragment ends with**: `. ! ?` gets the full 420ms, anything else
— a comma, a colon, a verse line with no punctuation — gets 180ms. That improves
prose too: an over-long sentence broken at the 400-character cap used to take a
full stop's pause mid-clause.

**The detector, and where the author's proposal had to be corrected.** The
suggestion was capitalised line starts, the traditional convention. MEASURED
across the corpus first, and it is not sufficient:

| | capitalised | mean line |
|---|---|---|
| Thomas Hardy | 100% | 38 |
| Leaves of Grass | 100% | 59 |
| **Poems of Du Fu** | **33%** | 42 |

Du Fu is a modern translation that does not capitalise every line, so the capital
rule alone would have missed two thirds of its line breaks — and it is poetry the
pause is wanted in. Whitman's long lines defeat a length rule just as squarely.
**Together they cover each other's blind spot**, which is why both are in
`looksLikeVerse` rather than one.

The ceiling matters as much as either test: the thing to exclude is hard-wrapped
**prose**, which sits near a fixed width and breaks mid-sentence in lower case. A
mean below 70 rules it out whatever its capitals do, and keeps the module
gateways (mean ~400) out with it.

Checked against every node: **0 of 167 prose nodes read as verse**; Hardy 14 of
19, Whitman 10 of 12, Du Fu 4 of 6 — the misses in each being exactly the
section-title and gateway nodes, which are single-line and carry no line break to
pause at. One false positive was closed on the evidence: a module *script* is a
stack of short lines and read as verse on every measure, so `%%bd_` is never
verse.

**Verse is also read more slowly** — 15% at first, reduced to **8%** by ear the
same day — which is what the author asked for and
what the detector now makes possible. The scale rides with each queued utterance
rather than sitting in a global, so a second passage queued behind the first
keeps its own pace.

**It threw on the first poem**, and the way I missed it is the part worth
keeping. Changing the queue from strings to `{ text, gap, scale }` left **four**
places still calling `next.slice(...)` — the two console warnings, the stalled
handler and the catch. Three of them are on error paths, so they would have sat
there silently until something else went wrong.

I had run a check for exactly this and it reported clean, because the filter
excluded any line containing `next.` — which is every line containing
`next.slice(`. **A check whose filter excludes the failing pattern proves
nothing.** The second pass listed every use of the identifier and classified each
one, which found all four immediately.

**And a line ending in a dash lost its pause — `\s` includes `\n`.** The
normaliser that turns spaced hyphens into em-dashes used `/\s+[-–—]\s+/`, so a
line ending " —\n" matched and was replaced with " — ": **the line break was
destroyed before `splitUtterances` ever saw it**, and the two lines were spoken
as one. Four lines in Du Fu, all of them. Fixed by matching horizontal
whitespace only.

MEASURED before changing it: the old pattern matched 111 times across the
corpus, the new one 107 — the difference being exactly those four, every one
already an em-dash and so needing no conversion. Nothing is lost. A plain hyphen
at a line end would be, and the corpus holds none.

**That is the second verification hole in this one feature**, and the pair make
a rule. The first filtered out the very lines that were wrong. This one tested
`splitUtterances` on the RAW node text, bypassing the normaliser that runs
before it in the real path — so the check passed on input the code never
receives. **Test the path, not a stage of it.** The end-to-end harness now runs
`speechTextFrom → looksLikeVerse → splitUtterances` as `speak()` does.

Known exception, accepted: verse that is both long-lined *and* uncapitalised —
e e cummings, much modern free verse — reads as prose. One rule cannot have
everything, and being wrong towards prose is the quieter failure.

---

## 2026-09-30 — Hardy loses its stanza labels, and Speak gets its own pill

**All 14 `Stanza n` lines removed from the Thomas Hardy poems.** They are
apparatus, not poem: the chunking already *is* the stanza division, so the label
restated in words what the structure says, and it was the first thing a reader
met on every card. It matters more since 09-29, because **Browse shows the
node's prose** — and a stanza label is exactly the sort of line that reads as
content when it is really scaffolding. Written up in
`hardy_stanza_labels_2026-09-30.md`, including the one judgement call: seq 16 of
"Your Last Drive" carried `Stanzas 3 and 4`, which was not the named form and
was removed anyway, because one orphan label would be stranger than all of them.

**Speak became its own pill**, after two attempts that are worth the note.

A `margin-left` did nothing visible, and the reason was the useful part:
`#view-mode-toggle` **was** the gold pill, and Speak sat inside it — so moving it
along just made the block wider. There was nothing for a gap to appear in.

So `#view-mode-toggle` is now a bare positioned ROW holding two pills: the
Browse/Create pair, and Speak. Everything that *placed* the control stayed;
everything that *painted* it moved onto the pills. The radios are still
descendants, so every existing selector still matches.

Then the two pills were not the same height — the radio pill's inner `<label>`s
each add 2px of vertical padding for their tap zone, while `#speak-control` IS
the label and takes the pill's padding instead. Fixed with `align-items:
stretch` on the row rather than a height on either pill, so they match by
construction rather than by a number that would drift the next time either one's
padding changed.

And a specificity trap caught on the way: `#view-mode-toggle label` is 0,1,1
against `#speak-control`'s 0,1,0, so the label rule's padding would have won and
the Speak pill would have sat visibly tighter than its neighbour. The pill rules
are scoped through the row for that reason, not for tidiness.

---

## 2026-09-30 — the card follows the mode

Two faults reported, which look unrelated and are the same one:

- **Fractal and ABC in Create showed only the fallback name**, not the script.
- **Kolam in Browse kept the script**, instead of reverting to the name.

**The card's CONTENT depends on the mode — Browse shows the prose, Create shows
the whole script — but the card is built at NAVIGATION time.** Changing the mode
changed the layout and left whatever was already on screen.

**And Kolam "working" in Create was an accident.** The only thing that had ever
put a script into that card was the module's own echo — `autoWrite`, once the
module was up and announcing. A music module has no reason to echo anything
back, so Fractal and ABC never got one; and an echo that *stops* does not undo
what it wrote, which is why Browse kept the script. One missing rebuild, wearing
two faces.

`applyView` now rewrites the card from the NODE at the end of both branches,
**only when the mode actually changed** — not on a layout change, which would
rewrite a card the module is about to echo into, and not on every apply, or a
drift would fight it five times a second.

**It threw on the first press, and the reason is worth keeping.** There are
**two functions called `setCardText`** in this file — one in `setupInteractions`
taking a **card**, one in `init` taking a **body** — and from inside `init` the
second wins. So a card object went where a DOM element was expected.

But neither was right anyway. **A chunk card's body is BUILT** — `.chunk-text`
divs, with `.chunk-text--center` for `%%bd_center` — and `readChunkBody` reads it
back by querying exactly those classes. Writing plain text into it would have
left the reader with nothing to read, which is the same fault in a new place:
Sv flattening `%%bd_center`, and the Down button welding the hint onto `%%bd_]`.

So the builder is factored out as **`renderChunkBody`, placed directly beside its
inverse `readChunkBody` at module scope**, and both the original card builder and
the mode refresh call it. A renderer whose inverse lives somewhere else is how
this keeps happening.

Three guards worth keeping: `setCardText` calls `updateSendBtn`, which can reach
`setModuleLayout` and come back, so there is a re-entry flag (and by then
`lastAppliedMode` already matches, so the recursion cannot start anyway); and if
the chunk count ever differed between modes the refresh **bails**, because
adding or removing cards is `advanceOrNavigate`'s job and leaving `readingState`
describing a card stack that is not on screen would be worse than not
refreshing. `%%bd_chunk` is retired and in zero nodes, so it is one chunk today.

---

## 2026-09-29 — View and Device move into the Jump Bar

**The bar with Local, Remote and Green in it is now called the Jump Bar (JB)**,
because every control in it takes you somewhere. Its id is still
`#bd-toppanel`, which is misleading — it sits at the top of the CANVAS but below
both reading panes — and the rename is filed under TIDY UPS LATER with the other
mechanical one.

**View and Device moved there**, right-aligned, from `#bd-invite-panel-viewer`.
They had to: Browse no longer raises the module, so the panel that carried them
— docked into the 220px band beside the iframe — is not on screen when you need
them. And they belong with the others: Local is me, Remote is them, Green is
where I followed them to, and these two are another screen, beside BD or on a
different device.

Right-aligned by `margin-left: auto` on a **wrapper** rather than on the first
button, because `#av-sync-note` is `hidden` most of the time and a margin on a
hidden element aligns nothing.

Shown on `body.module-node`, set from the same test that decides a module
exists, so the button cannot appear for a node it would do nothing on — and in
**both** modes, since Browse needs it to reach the work at all and Create still
needs it to reach another device.

`#jump-to-ext-btn` carried `width: 50px` and `white-space: normal` from its old
home in a narrow panel, where a wrapped two-line label was right; in a row it
sizes to its text and stays on one line.

**The panel is emptied, not deleted** — hidden in CSS, with its two captions
left, so `positionExtendPanel` and the modules' dock-slot machinery still find
what they were written against. `positionExtendPanel` now bails on a hidden
panel rather than measuring and moving nothing several times a frame during a
drift.

**One consequence to look at:** those dock slots in the music modules now
receive nothing. Visible in Fractal and ABC, and worth deciding whether the
slots still earn their place in those layouts.

Also filed under **TIDY UPS LATER**: `#bd-toppanel` → `#bd-jumpbar`, and the
identifiers that say "merge" but mean "route" — `clear-merge-btn`,
`clearMergedView`, `mergedRemoteIds`, `applyMergedView`, all leftovers from a
wholesale-merge design that was scaled back and never shipped. Those names led
me to describe the system as merging partners' graphs, which it does not: a
shared node is only SIGNALLED when it is already in your own view.

---

## 2026-09-29 — Browse is text, Create is media

Step 2 of the mode work, and it went a different way than planned for a better
reason. The plan had Browse playing the module *bare*. The author's argument
against it: **Browse eventually shows a COLLAGE, not one work**, and a module
inline competes for exactly the room a collage needs. Every earlier option
quietly assumed Browse displays one node at a time, and that assumption expires.

So Browse does not raise the module at all. It stays text and offers **View**,
which reaches the work through the viewer that already exists. Which also, in
the author's words, **keeps BD itself pure text in Browse** — worth more for
comprehensibility than immediacy is.

**The rule that came out of it is bigger than module nodes.** Browse shows the
node's **prose** — everything outside the `%%bd_` directives — for **every**
node; Create shows the whole script. "BD is pure text in Browse" is then true by
construction rather than by special-casing modules.

Chosen over *generating* a description from the script, which was the earlier
idea and the author's correction is the better one: authored prose says what a
piece **is** rather than enumerating its parameters, and it needs no describer
kept in step with the directives — which would have been a second vocabulary for
the same facts. A node that is nothing but directives falls back to its **name**.

**It also largely dissolves §4 of the collage plan**, which had been parked. It
stops mattering where a directive lives, because Browse never shows one. What
remains of that section is a genuinely different question — whether a text
node's *content* should feed a module — and it is no longer entangled with this.

**THE STRIP HAS NO INVERSE, and that is the whole danger.** You cannot rebuild
`%%bd_score` from prose, so anything that writes a Browse card back to a node
destroys the script. That is the Sv bug exactly — *"a renderer needs its INVERSE
beside it"* — and the Down button repeated it by flattening a built card. Both
live writers were checked: `autoWrite`'s redraw is already guarded by
`player-active` (the 09-22 fix, for the same reason), and **`Sv` now refuses
outside Create**, because it is gated on the curation code rather than the mode
and a curator could have reached it from Browse.

The strip handles the block form (`%%bd_score [ … %%bd_]`), not just single
lines, or the axiom and rules would have been left on screen. Run against the
corpus: of the six nodes carrying directives, the one with prose keeps it intact
and the five pure-directive module nodes empty to their fallback.

Also: the auto-switch is gone — a tap on a module node no longer changes your
mode — and the mode you pressed View *from* is restored on the way back, because
`armFreshOpen` clears `lastAutoPlayerNodeId` so a return counts as a fresh
landing and would otherwise raise the module in Create.

**And one thing this broke, found on the first test: View opened an empty
viewer.** The log named it in a line — `[View] reading from: … len=14
module=NONE`, the card holding the 14-character fallback name — and then no
`av_push` at all.

A viewer is fed by `pushScriptToAV`, which until today was only ever reached
from `autoWrite` — that is, **from the module announcing**. Invisible while View
could only be pressed in Player, where a module was always loaded and announcing
and `avLastPushed` was permanently warm. Pressed from Browse there is no module
loaded, nothing announces, nothing pushes: the viewer connected, asked
`av_hello`, and `answerAVStateRequest` found `avLastPushed || avLastState` both
null. A viewer with no script draws nothing.

**The dependency was implicit, which is why moving View exposed it.** Now the
View press seeds the script itself, from `payload.script` — already the right
text, because `buildExternalWebsiteUrl` falls back to the NODE when the card
carries no module, which in Browse it never does. `pushToAV` sets `avLastPushed`
before it looks at the socket, so the seed survives the viewer not having
connected yet and the `av_hello` answer carries it.

**Two things outstanding.** The five module nodes now show only their name and
each wants a line of prose — a small task, and a good one, since it forces "what
is this piece?". And the View button is exposed but still positioned for the
player layout's right-hand band, so in Browse it sits over the graph's edge; its
agreed home is the Local/Remote row, which becomes *where things go* — Local is
me, Remote is them, View is another screen.

---

## 2026-09-29 — three view modes become two

**Browse | Create.** Nodes becomes Browse; Player and Edit become Create. Done
**for the collage**, in the author's words — *"iteration towards a user
comprehensible create a Collage structure"* — because three modes, two of which
differ only in whether two buttons are visible, cannot be explained to someone
who did not build the system.

**Player was never a mode. It was a LAYOUT.** That is the whole change. Whether
the module shows is decided by the **node**, and rides underneath whichever mode
is selected. You never "leave Player" — you navigate away from a module node.
Which is the fault this was written against: the 09-22 card overwrite happened
because leaving Player *hid* the module without unloading it and the echo did
not know which mode it was in. With no leaving, there is nothing to be wrong
about. The auto-transition changes character with it — it is a **layout
consequence** now, not a mode change.

**`edit-active` had to become orthogonal to `player-active`, and this could not
be deferred.** `setViewMode` said so in its own comment: *"'nodes' or 'edit' —
both keep cy visible + hide iframe"*, while `player` hides `cy`. **The two modes
being merged were the two with opposite layouts**, and the two body classes were
mutually exclusive by construction. A straight rename would have left a module
node with no route to the compose controls, since the Edit radio was the only
one. Now Create sets its furniture whichever layout the node chose.

**Two traps, one of which the codebase had already documented.**

`updateSendBtn` — which decides whether a module is in play — **is not inside
`init()`**, and the `bd:force-nodes-mode` listener exists solely to bridge the
two scopes, saying so in its own comment. Declaring the new state inside `init()`
would have been a `ReferenceError` from there and a TDZ error from anything in
`init()` running earlier. So the state and both setters live at **module scope**,
and `applyView` — which touches `cyEl`, `visualIframe`, `loadModuleForNode` —
stays in `init()`, reached through one event.

And `applyView` now runs on a plain mode toggle, so the player **entry** actions
(the helper card, `loadModuleForNode`) are guarded to the transition. Without
that, switching Browse ↔ Create while on a module node would have reloaded and
flashed the module for no reason.

**Legacy names are mapped, not renamed at every site** — `'nodes'`, `'player'`
and `'edit'` still arrive from deep links and half a dozen callers, so the change
cannot break a path by missing one. Verified by driving the state machine in
isolation: eleven transitions, all correct, including the two that matter —
**Back from a module node keeps you in Create**, and switching mode while on a
module node keeps the module on screen.

**One thing needs eyes, and it is the new state:** Create *and* the module layout
means both body classes are set at once, which never happened before. How the
compose controls sit over the module needs looking at. If it is wrong, one line
suppresses them there.

**Revised within the hour, on the author's testing.** The first cut made mode and
layout fully independent. That reads well and left a hole: on a module node,
pressing Browse kept the module on screen, so the radio stopped being the way
back to the graph that it has always been, and the only escape was `#back-btn` —
step 3 arriving uninvited. The author spotted it from the other direction,
asking whether a module node should not put you in Create, since that is where
the steppers are going to live. Both point the same way.

So **Browse is the graph, always** — selecting it clears the module layout — and
**landing on a module node switches the mode to Create**, not just the layout.
Until Browse can show a module bare (step 2), a module on screen means the
module's own steppers are on screen, and that is Create's surface. The label is
honest now rather than after step 2.

The invariant that falls out is checkable and checked: **`browse` + module layout
is unreachable by any route**, across every alias and every path.

At step 2 this inverts — Browse gains the bare module, the radio stops being an
escape, and the back button becomes the way out. Which is exactly why step 3 is
scheduled after step 2.

Next, in order: Browse plays the module with `hideControls` (the layout problem),
then `Local` as a back button. §3 of the collage plan carries both.

---

## 2026-09-29 — opacity on both Kolams, in hundredths

**`%%bd_p_opacity` on the flat module too.** It was added to the 3D one first,
where eight overlapping copies of a folded curve make the figure mostly its own
occlusion; on a 2D canvas it is a gentler effect but the same control, and
having the same script read the same in both modules is worth more than the
asymmetry was.

Applied as `globalAlpha` **on the offscreen context only** — the one the path is
drawn to. That gives both kinds of blending at once: strokes overlapping *within*
the figure blend, and the translucent bitmap stamped N times by `applySymmetry`
blends *across* the copies. Which is what the 3D module's material opacity does,
so the two agree. The main context is deliberately untouched, because it carries
the background fill and the border, which must stay opaque — and it already
drives `globalAlpha` itself for that border.

**Both step in hundredths now**, 0.05 → 0.01. Verified against each module's own
`stepControl`: exactly 100 presses from 1 to 0 and 100 back, **no float tails and
no readout over three characters** — the leading zero is dropped, so `.99`, `.5`,
`1`. A held button crosses the range in 7.6s, because the hold-repeat rate is
derived from the range rather than set per control, so a hundredfold finer grain
needed no tuning at all.

Marked in both stored Kolam nodes, because they already carry marks and RULE 2
would otherwise have given the new control no row.

**And a pre-existing mismatch surfaced while checking that.** `%%bd_p_weight` sat
at the end of both scripts while the column has it between `colour_speed` and
`saturation`. Moved. All three Kolam nodes now read exactly as their module's
column does, which is the ordering principle asked for on 09-27 applied to the
flat module as well.

---

## 2026-09-28 — graphics render through three.js, and the road to VR

**A standing decision, recorded rather than left in a conversation:** no new
visual module is built on a 2D canvas. The reason is narrow and is not "3D is
better" — a canvas renderer has **no VR route at all** short of a rewrite, while
a three.js scene is a session flag, an animation loop and a change of camera
ownership away from a headset. The option is cheap only if taken before the code
exists.

Written up in **`ThreeJS_and_VR_2026-09-28.md`**, with the scoping measured
rather than estimated: `VRButton.js` is 4.5 KB and imports nothing, so it works
with the UMD three already loaded; BD answers over https through the tunnel, so
a headset can reach it; the viewer says "NO CONTACT" on a dropped socket but
**never stops the renderer**, so losing the connection mid-piece means "no new
parameters", not "it stops". Half a day to something you can look at in a
headset; two to three days on top for it to be good.

**Two things the AIM turns from preferences into requirements.** The intended
use is a long, continuous, attended piece of pattern, music and spoken poetics —
which, as the author pointed out, makes the "put it down for coffee" failure
much less relevant than I had weighted it. The same framing raises two others:

- **Never move the camera.** Continuous VR with an auto-rotating viewpoint is
  the textbook cause of sickness. `cam_elevation_speed` must tumble the *figure*
  in front of a stationary viewer. Same code either way; it is a safety property,
  not plumbing.
- **Sustained smoothness beats fidelity.** In a continuous piece a hitch is the
  whole thing broken — and the drift timer's whole-buffer rebuild is precisely a
  periodic hitch. Depth 3 entirely smooth serves this better than depth 5 that
  stutters, which inverts the usual instinct.

**And the larger question, which is not XR plumbing at all:** pattern, music and
voice *together* means the headset carries all three, so a VR viewer is a viewer
hosting several modules — not `bd_V_Kolam3D` with a session flag. Half a day
gets the pattern into the headset, silent.

**The fork the document exists for.** If visuals are three.js, a collage could be
one scene holding several objects instead of several iframes — the only version
that means anything in a headset, where a collage is a space you stand in. But
the iframe + postMessage contract is what lets a stranger write a BD module, and
is the whole argument BDX exists to make. Neither is obviously right; a middle
path (keep the iframe contract, add an optional geometry output) does not force
the choice today. Cross-referenced from the collage plan, which must not be built
past §5 until it is settled.

Also recorded: which headset, and why storage is the wrong axis — browser WebXR
installs nothing, so 128 GB is ample and the money belongs in resolution and
optics, which are exactly what 1-pixel lines care about.


### And then the fact-gathering, over the rest of the day

The decision was the start of it. The document grew into the whole enquiry, and
the parts worth knowing without reading it:

**Three delivery shapes, not two** (§5). Either BD runs elsewhere with the
headset as viewer, or BD runs *on* the headset with the graph navigated in VR —
and there is a third that dissolves the choice: **BD as an ordinary flat page in
the headset browser, with only the module going immersive.** That is the
standard WebXR arrangement, it is cheapest (same-origin iframe, no token, no
socket, no relay), and **the audio settles it** — Piper is client-side, so with
BD on a laptop the spoken poetics come out of the laptop. The AV viewer is not
superseded: it is the *facilitated* mode, and both shapes run the identical
module.

**Which headset, and why storage is the wrong axis** (§8b). Browser WebXR
installs nothing. The recommendation ended up resting on **glare and field of
view** — 96° against 110° — and explicitly **not** on text legibility, because a
1.2x pinch closes that gap on either device. Two of my own arguments were
corrected in the course of getting there.

**Designing against hardware that improves slowly** (§8c), which produced the
most portable rule in the document: **a 1-pixel line gets WORSE as hardware
improves**, because higher pixel density means it subtends less angle. Anything
sized in pixels shrinks as the tech gets better. **Size things in angle or world
units.**

**Glasses** (§8d). Additive displays cannot render black, so `%%bd_background`
stops existing — which *hurts the interface and helps the artwork*, the exact
inverse of a headset. Then a question that revised it: you **can** dim the room,
in 5 or 9 graded levels on current devices. And the important part is not the
contrast fix — **dimming makes depth-of-immersion a continuous dial, adjustable
mid-session.** A facilitator can raise transparency rather than take a headset
off someone's face. For arts therapy that is a real affordance, and **no headset
can offer it.**

Checked against **Meta Connect 2026** (23-24 September), which named the thing
that would otherwise mislead: **Meta VR Glasses are not AR glasses.**
Full-colour passthrough is still camera-mediated, so the dial does not apply to
them. Two divergent trajectories — Meta making opaque VR smaller, Android XR and
the glasses makers making optical see-through better. **BD's argument attaches
to the second.**

Also recorded along the way: the audio paths out of the headset and the mic
gotcha (inline mics over the 3.5mm jack are not supported, so there is no wired
fallback for `sr_editor.html`), and **RULE 9** in the collage plan — a module's
default script carries no directive it cannot act on, which took `%%bd_weight`
and `%%bd_stroke` out of the 3D node.

**§9 of the document is the authoritative open list for the area** — fifteen
items — and §7, the collage fork, is the one that has to be settled before the
collage is built.
---

## 2026-09-27 — RULE 9: no dead directives in a default script

A directive a module cannot act on is **dead text in a card a person reads**.
The script is not a private config file; it is the thing shown, edited, copied
and collaged, so every line in it should be a line that does something.

`bd_V_Kolam3D_001` shipped two that were not. `%%bd_weight` was read but applied
to `material.linewidth`, which core WebGL ignores. `%%bd_stroke` was **not read
at all** — the 3D renderer always takes its hue from the yaw, where the flat
module uses `stroke` to decide whether it does. Both gone; the node is 479
characters from 513, and all twenty remaining directives are ones the module
acts on.

What makes that safe rather than merely tidy is that **nothing is lost, and it
was checked rather than assumed**: absent, the flat module defaults `stroke` to
`angle` and the 3D module defaults `weight` to 1.5 — in both cases precisely the
values the removed lines carried. "The module ignores it" and "removing it
changes nothing" are not the same statement, and only the second licenses a
removal.

And the rule governs the DEFAULT script a module ships — not what a module may
strip from a script that already has one. A figure given a weight in the flat
module still keeps it through the 3D module, because that protection comes from
the 3D module never *rewriting* `weight`, which is untouched.

---

## 2026-09-27 — the viewer was being sent the sender's clock

Reported as "the AV viewer makes small jerks of elevation every one or two
seconds". The server log named it: **10,200 drift frames correctly declined, and
an `av_push` going out beside every card write anyway.**

`pushScriptToAV` suppresses a drift frame when it differs from the last push
*only in the angle*, because the receiver computes the angle for itself from the
same script. The comparison stripped `AV_ANGLE_LINES` — which named the angle
triple **literally**. A frame whose only difference was `cam_elevation` therefore
read as a human change and was pushed, and the viewer's smooth rotation snapped
back to a value up to a second stale.

**The comment sitting above that regex had already said this would happen**: *"it
names the angle triple literally, and if it stopped matching, every drift frame
would read as a human change and be pushed to the viewer. That is last week's iOS
smoothness work undone, with no error to notice."* It was right. What it did not
say was that ADDING A CLOCK has the same effect as the regex breaking, and that
is the lesson worth keeping: a matcher that lists the members of a category is a
matcher that must be edited whenever the category grows.

`AV_ANGLE_LINES` is now `AV_CLOCK_LINES` — every directive a receiver advances
from its own clock: the angle triple, **the pitch triple, and `cam_elevation`**.
Pitch was leaking in exactly the same way and had simply not been noticed,
because the stored node ships `pitch_drift` at 0.

**The angle case is what hid it.** Angle drift is slow, so a one-second-stale
angle lands almost where the viewer already was. A camera turning at 20 degrees a
second is twenty degrees out, and you can see that.

The rates are deliberately NOT in the set — `angle_drift`, `pitch_drift` and
`cam_elevation_speed` are human controls, and a change to one MUST reach the
viewer or it keeps turning at the old rate for ever. That distinction is
structural rather than careful: `cam_elevation` is followed by whitespace in the
pattern, so `cam_elevation_speed` cannot match it, and `pitch` cannot match
`pitch_drift` or `step_pitch`. Checked over 31 cases, every one correct, plus the
real comparison: two spin frames compare equal, a change of speed or distance
still differs.

`avWithAngleFrom` became `avWithClockDrivenFrom` and carries all five values, so
a **resync** still makes the viewer agree — which is what makes the phase offset
between two independent clocks tolerable rather than a defect.

Two ordering fixes in the module alongside. Stopping the rotation hands the
smooth degrees back to the slider, so it now happens BEFORE the script is
rebuilt — called from `handleControlChange` rather than its own listener, so the
order is stated rather than left to registration order — and the hand-back is
skipped if a script has set the slider since, because then the script is the
authority.

---

## 2026-09-27 — the camera goes all the way round, and turns itself

**`cam_elevation` opens to the full turn**, −180..179, cyclic. It was −90..90
under a note of mine saying it must not wrap because *"stepping past the pole
would flip the azimuth by 180 degrees without the azimuth control moving, so two
different numbers would name one view"*.

**That note was wrong, and it was wrong about code already written to avoid the
problem it described.** It is true of a naive up vector of world +Y. It is not
true of the sphere's north tangent, which is what `placeCamera` has used from
the first commit — the up vector I put there specifically so the poles would not
degenerate, and then wrote a comment forbidding the range that needs them.
CHECKED rather than reasoned about a second time: across all 360 whole degrees
the up vector stays unit length and its dot product with the view direction is
zero to twelve places, *including at the poles*; no two elevations in −180..179
give the same position and up; and every one-degree step moves the camera exactly
0.01745 of the radius, so there is no jump going over the top. It stops at 179
because 180 and −180 are verifiably the same view, and one picture must not have
two spellings — the same discipline as `angle`, where 360 is never stored.

**`cam_elevation_speed`** turns it: degrees per second, 0 off, 1 a turn in six
minutes, 60 a turn in six seconds. MEASURED, not estimated.

Called `_speed` and deliberately **not** `_drift`. `angle_drift` and
`pitch_drift` are the module's other automatic movements, and their unit is
arcseconds per tick — at the top of *that* range the camera would take
twenty-one minutes to come round once. A control that borrows a family's name
must borrow its unit, so this one takes a different name rather than giving
"drift" a second meaning.

**It has its own clock at 20 a second, not the drift timer's.** That timer is
throttled by DEPTH — a whole second per tick at depth 5 — because every tick of
it rebuilds the geometry. A camera move rebuilds nothing, so this rotation is as
smooth at depth 5 as at depth 1, which is exactly what the no-rebuild path was
built for.

The drawing follows a float; the script records whole degrees, rewritten at most
five times a second rather than twenty. Same division as `angle_seconds` against
`angle_minutes`, and for the same reason: twenty script rewrites a second for a
number read back to half a degree is noise on the wire. The announcement is
labelled as drift (RULE 7), because a timer moved it and a viewer is computing
the same rotation from the same script.

Three guards that each fix a real way this could go wrong: a hand on the
elevation stepper reseeds the smooth accumulator, so the rotation does not snap
back to its own running total; a script value that differs from the integer this
module last wrote also reseeds it, or the angle-drift render reaching
`setControlValues` five times a second would quantise the rotation to whole
degrees; and stopping hands the rounded degrees back to the slider so the
script, the readout and the picture agree the moment it stops.

Azimuth has no speed control yet — one more row if a turntable is wanted as well
as a tumble.

---

## 2026-09-27 — opacity on the 3D kolam

**`%%bd_p_opacity`**, 0 to 1 in twentieths, a seventeenth stepper on
`bd_V_Kolam3D`. It earns its place in the 3D module far more than it would in
the flat one: with eight symmetric copies of a folded curve the figure is mostly
its own occlusion, and turning the lines translucent is how you see into it.

Two details that are the whole of whether it works.

**Translucent lines must not write depth.** With depth writing left on, the
nearest line in each pixel hides every line behind it, and the figure reads as a
solid shell — which defeats the entire reason for reaching for opacity here.
`depthWrite` follows the transparency, and opaque lines write depth as normal.

**`transparent` takes part in three's program cache key**, so changing it needs
the material recompiled. That is guarded behind an actual change, because
`applyOpacity` runs on every render — five to ten times a second while drift is
on — and an unguarded `needsUpdate` would rebuild the shader every frame.

Material only, so it costs no geometry and joins `step_pitch` and the camera on
the no-rebuild path: it sweeps live at any depth. The readout drops the leading
zero — `.05`, `.5`, `1` — which is RULE 8 (abbreviate, never translate) and the
same trade the colour readout already makes; MEASURED, all 21 values fit the
three-character span without shrinking, and the 20-press round trip from 1 to 0
and back is exact with no float drift.

The flat module is deliberately untouched. It reads `opacity` into its
directives, offers no row for it, and never rewrites it — so a 3D script keeps
the line intact through a round trip there and simply draws opaque.

---

## 2026-09-27 — a stepper you could not hold

Reported as "ok for a single click but when held down they work too fast", and
MEASURED before anything was touched. Two faults, in BOTH Kolam renderers:

**A small range had no brake at all.** `repeatMagnitude` floored the repeat at
one step per 60 ms tick — 16.7 a second — and returned early under the comment
*"below one step, the control is already quick enough — leave it alone"*.
Leaving it alone was the bug. `depth` is four wide, so a held button crossed its
**entire range in 0.24 s**; `colour_speed` in 0.36 s; `symmetry` in 0.90 s. The
code could not express "slower than one step per tick", so it never tried — and
the comment recorded that limit as though it were a property. Which is the
lesson: *a floor you cannot go below is not the same as a floor you don't need.*

**And 2500 ms to cross a range was brisk for the wide ones too** — 360 degrees
of `angle` in two and a half seconds flies past what you aimed at.

Both go away once the magnitude is allowed to be **fractional**: the caller
accumulates it and steps only when a whole step has built up, so the
range-derived rate governs small ranges as well instead of being clamped away by
them. The floor became a TIME — one step per `START_STEP_MS` — rather than one
step per tick. Traverse 2500 → 7000 ms, ramp 900 → 1400.

Measured, holding the button, before → after:

| control | range | first 0.5 s | full sweep |
|---|---|---|---|
| `depth` | 4 | — → 2 | 0.24 s → 1.08 s |
| `colour_speed` | 6 | — → 2 | 0.36 s → 1.56 s |
| `symmetry` | 15 | 9 → 2 | 0.90 s → 3.90 s |
| `pitch` | 359 | 29 → 6 | 2.82 s → 7.68 s |
| `step` | 9890 | 1200 → 300 | 3.18 s → 7.56 s |

("—" means the control hit its end before half a second was up.)

Fixed in **both** `V_Kolam` and `V_Kolam3D`, which carry the same block — the
3D file's header promises the shared parts are identical, and fixing one would
have made that false. The two music modules use an older repeat and are
untouched.

---

## 2026-09-27 — the kolam in three dimensions

**`bd_V_Kolam3D`**, a new visual module, hung off **Graphics as a Cluster of
its own** and not under Kolam. It is a sibling, not a variant: the same `%%bd_`
script, a different renderer, two angles instead of one and a camera to place.

**The invariant it is built around:** at `%%bd_pitch 0` and
`%%bd_cam_elevation 90` it draws exactly what V_Kolam draws — the same
segments, the same hues. VERIFIED numerically against the 2D turtle across five
parameter settings including 65,536 segments: worst deviation **6.1e-5 world
units on a figure of radius 1362**, which is `Float32Array` storage precision
and not the arithmetic. Three sign conventions exist only to keep that true and
each is commented where it is chosen — the yaw applied as −a, the bulge along
−L rather than the up vector, and the camera up taken from the sphere's north
tangent. That last one matters twice over: world +Y is parallel to the view
direction at elevation 90, so `lookAt` degenerates there — and elevation 90 is
not a corner case in this module, it is the view the invariant is stated at.

**`+` turns the turtle by `angle` about its up axis AND by `pitch` about its
left.** Pitch compounds at every one of 512 steps, so it bites far harder than
a single degree suggests: MEASURED, **five** degrees takes the default figure's
maximum |y| from 0 to 343 world units against an in-plane radius of 97. One
degree gives 75 — a shallow dome, and the value the stored node now opens at.

(An earlier draft of this entry, and of the commit message, said ONE degree gave
343. That was the five-degree row of the same table. It mattered: `step_pitch`'s
default in the node was chosen from it and was ten times too small.)

That showed up in the first test, and the answer is **`%%bd_step_pitch`** — the
turtle's step length in the new dimension, in the same units as `%%bd_step`.
Equal means isotropic; a fifth means the same pitch lifts the figure a fifth as
far; 0 means flat whatever the pitch says. It is what makes pitch a dial
instead of a switch, and it sits beside `step` rather than beside `pitch`
because it is a length and the two are read together.

It is applied as **`group.scale.y`, and that is exactly equivalent to scaling
the y of every individual move** — not an approximation of it. Every position
is a sum of moves, so scaling each move's y scales the sum's y, and the bezier
is affine in its control points. CHECKED rather than asserted: the module's
output y-scaled after the walk against an independent turtle that scales during
it, five settings including ratios 0 and 2.5, agreement to `Float32Array`
precision. Two things fall out. Sweeping the control **rebuilds nothing**, so
the figure inflates under your finger even at depth 5. And it has to go on the
group, ABOVE the symmetry children, because a rotation about y commutes with a
scale in y — which is also why the module's base plane is the horizontal one.

**The column runs in pairs.** Every quantity that exists in both planes sits
next to its counterpart — `step`/`step_pitch`, `angle`/`pitch`,
`angle_minutes`/`pitch_minutes`, `angle_drift`/`pitch_drift` — so "what is the
pitch equivalent of this" is answered by the row underneath rather than by
scrolling. The script's directives are in the same order, because the script IS
the card the user reads. Order is presentation only: `parseBD` is order-blind
and `setDirectiveValue` replaces in place.

**The node opens at `pitch 1`.** At pitch 0 the turtle never leaves the plane,
so `step_pitch` has no out-of-plane extent to scale and reads as a dead
control — which is how it was first reported, and correct behaviour badly
chosen. One degree is a shallow dome. The module's *parse* fallback stays 0
though, and the two differ on purpose: a script that never mentions pitch was
written for the flat module and must render flat here rather than be quietly
given a shape its author did not ask for.

**Camera steppers** `cam_azimuth` / `cam_elevation` / `cam_distance`, because a
3D figure you cannot walk round is a flat picture with extra cost. `cam_`
leads all three names so they group in the column, and the labels **wrap rather
than truncate** — 13 characters is the one-line limit, set by `angle_minutes`,
and all three fit. Moving the camera takes a **fast path that rebuilds no
geometry**: the drawing is already on the card, and an orbit button that paid
for an L-system rewrite plus a quarter-million-segment turtle walk per press
would be a camera wish rather than a camera control.

**`cam_distance` auto-frames on first render when the script does not name
it.** Not a flourish: the four stored Kolam settings have radii from 97 to 1362
world units, so no fixed default can serve them, and a camera inside the
geometry shows *nothing* — the worst possible first impression of a new module.
The auto-fit is deliberately NOT announced and NOT written into the script
(**RULE 7**: a human action, never a script push — announcing on a push is what
once took the graph down in a 421/430-character loop). The value enters the
script the first time a person moves any control.

**three.js 0.160.0 from jsdelivr, pinned**, because BD's bytes go over a
Cloudflare tunnel and ~600 KB of library is the client's to fetch. The UMD
build, so no import map. Colour management is switched **off** so `setHSL`
means what `hsl()` means on a 2D canvas — otherwise the same script would
render visibly different hues in the two modules, and a figure tuned by eye in
one must not shift when it moves to the other.

**No `weight` stepper**, and that is the honest answer rather than a gap: core
WebGL ignores line width on every platform that matters. A knob wired to
nothing is worse than no knob. `%%bd_weight` is left untouched in the script so
a figure keeps its stroke width on the way back to the flat module. Real
thickness needs `Line2` from three's `examples/jsm` — ES modules, an import
map and three more fetches. A fair next step, but not a silent one.

Symmetry is **one geometry stamped N times** — the Nth copy is a matrix and a
draw call. The 2D module stamps a rasterised bitmap, and the honest equivalent
here would have been N copies of the whole buffer. Curve tessellation falls
with depth (6 samples at depth 2 down to 1 at depth 5) because the F count
rises as 8^(depth+1), and at depth 5 the effective step is 0.49 world units —
the bulge on half a unit is under a pixel.

Two whitelist gaps in the new wrapper were closed rather than copied forward
from the 2D one: `bd_ui_config` down, and **`BD_ERROR` up** — for a module that
depends on a CDN, "the library did not load" is the one sentence that must
never be silent. It is said on screen too, in a different colour from
"waiting", because a dead module must not look like a slow one.

Graph: Cluster `Kolam3D` under Graphics, gateway `bd_V_Kolam3D`, content
`bd_V_Kolam3D_001`. The ingest's `DESCENDS_FROM` runs **parent → child**, the
opposite way round from `bd_m_fractal_ingest.js`; both directions are live in
the graph, and the one Graphics already uses for Kolam was checked before
writing rather than assumed.

---

## 2026-09-25 — one directive retired, another brought back to life

**`%%bd_hint` is gone**, from the code and the corpus. One directive doing two
jobs distinguished only by whether a body followed the word: override the
automatic hint, or (bare) suppress it. **The suppression half had never
worked** — `extractChunkHint` returned `''` and both call sites read
`chunk.hint || getChunkHint(…)`, where `''` is falsy and falls straight through
to the hint it was asking to silence. Invisible only because UNIFIED_FOCUS
makes most automatic hints empty anyway, and visible on exactly one node: a
dead-end poem stanza, which is the case the original comment said it was
written for.

Of its six users, four were bare suppressions doing nothing, one duplicated a
sentence already in Root's prose, and the last held text that now reads better
as the end of Settling's paragraph. Removed from four code sites including the
**save path**, which read the hint back out of the DOM and wrote the directive
in again — left there, the retirement would have undone itself one saved node
at a time. The automatic hints are a separate mechanism and remain.

**The AI note system works again**, and the story is the instructive part.

Built in `af1605b` and **lost on 2026-07-25** in `392106d`, when the
default-panel Save button it lived on was retired as orphaned by always-on-chat.
The normalisation went with the button. Nothing produced a bot block from then
until now — which is why the corpus has none — while the display fork went on
faithfully hiding a form nothing wrote.

**I concluded from the current file that it had never been wired. The author
remembered otherwise and was right.** `git log -S` found the call site and the
commit that dropped it. A memory of a thing working is better evidence than a
search of the code as it stands.

Restored on **Sv**, and that forced a change of convention. The old path saved
only nav nodes; Sv saves **any** node including the music ones, and ABC writes a
chord as `[CEA]` — single brackets would have rewritten chords as bot blocks and
destroyed the score in silence. So authoring is **`[[ … ]]`** now: explicit
rather than positional, a note being a note because you typed two brackets
rather than because of where it sits. **Storage is unchanged** —
`%%bd_ai_read [ … %%bd_]`, single-bracketed — because the ambiguity lives in
prose beside notation, not in text already carrying the prefix, and `%%bd_]]`
would break every module parser.

### Found by a test written to check something else

`normalizeBotBlocks` matched a bracket span, and that pattern reaches across a
whole score block because `%%bd_]` ends in `]`. Given a script with a score it
rewrote from the `[` of `%%bd_score [` to the `]` of the closer, producing
`%%bd_score %%bd_ai_read [` with a severed closer below. **The score was
destroyed on save.** Latent only because nothing had called the function for two
months. The doubled brackets fix it at the root; a guard against converting any
span containing a directive backs it up.

---

## 2026-09-23 (evening) — Fractal joins in, and two instruments that lied

**The two Kolam nodes are migrated.** `bd_V_Kolam_001` and `_002` carry ten
marks each; `module`, `stroke`, `background` and the `score` block deliberately
carry none, having no control to offer. A full DB backup was taken first, since
`bd_tool cypher` does not auto-backup the way `write` does.

**Fractal's `auto` works in both directions.** The push half never was broken —
BD posts `bd_script_update` to whatever iframe is loaded and Fractal already
answered it. The pull half could not work: the module announced `BD_READY`,
`BD_STATUS` and a `bd_script_response` when asked, and volunteered nothing. It
now sends `bd_av_state` on a stepper press.

**Three sites, again.** Adding the sender was not enough: Fractal sits behind a
relay wrapper whose `RELAY_UP` is a whitelist, and V_Kolam's gained
`bd_av_state` on 2026-09-14 while Fractal's never did. *Two of three working is
indistinguishable from none.* Fractal also forwards its console now, so a fault
in there reaches the server log instead of an iframe console nobody has open.

**Announcing on a script push was tried and reverted within the hour.** It
loops: the script is rebuilt from the steppers, so what comes back is never
identical to what went in, and BD's "already equal" guard never fires. Writes
of 421 and 430 characters alternated without end and took the graph down. The
commit that introduced it claimed the echo was "bounded, not a loop" — asserted
rather than checked.

**No module's script can reach another module's card**, by any route. Three
sites shared one blindness: `autoWrite`, the exploration cache, and a
`focusout` handler that wrote `avLastState` — the freshest announcement from
*whatever module last spoke* — into the card you had just left. That is what
made a hand-edited Fractal script jump back to Kolam's.

**The bar is laid out from the right**: `[Copy Script][Copy abc] … [auto] (gap)
[↑↓]`, an arrow one stepper-button wide, right-aligned to the stepper box.
Kolam keeps its own arrangement — arrows beside the stepper column, tick box
beneath — because it reserves no dock slots and has nothing to sit beside.
Differing stepper layouts between modules are being kept on purpose for finger
testing.

### Two instruments lied, and both cost hours

**`node --check` is not a check for this file.** It parses as CommonJS;
`viewer.js` is an ES module. It passed a duplicate `const`, which stopped the
whole application — no graph, no socket, no logs, and no error banner either,
because the banner is installed by the file that would not parse. Checked as a
module, the line is named at once. `check_module.sh` now exists. The very next
commit then shipped a second syntax error *that the new tool had reported*,
because the check and the push went out in one breath.

**Every measurement was right, and all of it was useless.** Fractal's copy
buttons were invisible while reporting sensible rects, with nothing
overlapping, nothing clipped and the wrapper exactly where it belonged. Six
rounds of arithmetic. `document.elementFromPoint(500, 490)` returned
`DIV#bd-toppanel` — a fixed, opaque 50px bar at z-index 6 — in one line. Grid
modules positioned the iframe at the anchor itself rather than below that
panel; `#cy` has always used `anchorBottom + TOP_PANEL_H`, and the grid branch
was written later and did not inherit it.

**Why it looked impossible:** BD's docked arrows are `position: fixed` at
z-index 7, so they float *above* the covering panel while the module's own
content does not. "Our controls appear there and the module's do not" reads as
a layout-arithmetic problem and is an overlay problem.

---

## 2026-09-23 — `_p_`: the script says which controls it wants

First working stage of the collage plan. A directive written
`%%bd_p_symmetry 8` asks for a user control; the mark is **presentation and
nothing else**, stripped before the value is looked up, so a marked directive
means exactly what the unmarked one did and one whose control is hidden still
applies. Delete a `p_` and the stepper goes while the value stays — which is
the point, for a collage that merges more controls than anyone wants.

Done in three passes, deliberately: **matching first, meaning second, scripts
last.**

**Phase 0 — nothing visible.** Every place BD matches a directive by name
learned to see through a mark. This went first because `AV_ANGLE_LINES` names
the angle triple literally: had a script gained `%%bd_p_angle` while that still
read `%%bd_angle`, it would have stopped matching, every drift frame would have
counted as a human change and been pushed to the viewer — the iOS smoothness
work undone with **no error to notice**, only a warmer phone.

**Phase 1 — the renderer.** `parseBD` strips and remembers; the control column
follows what the script marks. `setDirectiveValue` was already wrong for this:
it built its line from the *stripped* name, so on a marked script nothing
matched and a second **unmarked** copy of the directive was appended. One
stepper press would have left both.

**Phase 2 — BDX's default script** carries marks. BD's saved nodes deliberately
do not: a script with no mark anywhere keeps every control, so there is nothing
to migrate and nothing already shared changes.

### Two bugs found by testing, both older than the feature

**A mark could not be authored.** `loadModuleForNode` pushes
`mergeExploredValues(savedText, explored)`, where `savedText` is whatever
Memgraph last stored — unmarked — and the edit lives in `explored`. The rule
shipped that morning said the saved mark wins, so every merge reverted the
edit: 304 characters into the module, 302 straight back out. The rule was
reasoned about the wrong actor — right that a *viewer* should not restyle the
host's controls, wrong about where authoring happens, since the script is the
source of truth and it lives in the card. Compounded by a short-circuit on the
value alone, so adding a `p_` *without changing the number* — exactly how
anyone turns a control on — counted as nothing to do.

**The echo stopped for good after any hand edit.** `autoWrite` refuses to
redraw a card that has focus. Right for drift; wrong after a deliberate control
change, because **the caret does not move on its own**. Edit a script, work the
steppers, and nothing echoes ever again — v1's failure verbatim, *"sync died
permanently after any manual edit"*, alive inside the v3 design meant to have
retired it. Copy Up appeared to cure it and did not: pressing the button moved
focus off the card, which was all that was ever needed. `fromDrift:false` now
takes the caret out and writes.

**The instrument nearly hid the second one.** It logged only when the *reason*
changed, so the same skip recurred in silence and read as "nothing is
happening" — the second time in two days that a once-only log has cost a round.
It reports every fiftieth repeat now.

BDX turned out not to share the fault: its panel is a `<textarea>`, so it uses
the v2 approach — write anyway, restore the selection — which a contentEditable
card cannot.

---

## 2026-09-22 (evening) — Sync, and a bug that ate a whole code path

The Device hand-off works end to end: BD → QR → a phone across the room →
drift there → **Sync** → BD lands on that node at the phone's position and says
`synced` beside View for two seconds.

**The viewer's button is honest now.** "← controls" assumed BD was in this
browser — it closed the window and raised the opener. Opened from a QR code on
another device there is no opener, `window.close()` is refused for a window the
script did not open, and "back to ButterflyDreaming" names something that is
not on that machine. BD marks the launch URL `d=1` (not `window.opener`, which
an ordinary reload also loses), and on such a viewer the button becomes
**Sync**: it sends what this viewer is showing and stays put.

**BD acknowledges it**, because a viewer can only report that it SENT, and from
another device that is all the sender would ever learn — while at the BD end
the node changes under you with nothing explaining why.

### The bug worth remembering

The note threw a `ReferenceError`, and because it threw at the TOP of the
`av_return` handler it **took the entire path with it** — no note, no state
taken, no navigation. Pressing Sync did nothing at all, and "nothing at all" is
what a throw near the top of a handler looks like.

`flashSyncNote` was declared inside a nested block of `init()`; the dispatcher
is a level out, and a function declared in a block is not visible outside it. A
`window` export had been written for exactly this and then removed, because a
scope check that searched backwards for an indent-0 function header reported
"both inside `init()`". Both were — at different depths, which is the whole
question.

**And the log that would have said so had stopped being written.** BD forwards
the client console to *stdout*; an earlier restart redirected stdout elsewhere,
so `/private/tmp/bd_server.log` silently froze and two rounds of debugging read
a dead file. BD is restarted with `>> /private/tmp/bd_server.log` and that is
now written down as part of how to restart it.

---

## 2026-09-22 (later) — BD catches up with the demo

Four things the BDX/AVX/RX demo grew last week, brought back into BD, which is
where they were always meant to end up. `bd_relay.js` was already byte-identical
between the two and `bd_av_client.js` a tracked copy, so the gap was only ever
the **controller** half.

**BD now arms its viewers with a spare token.** A module token is single-use and
spent at first connect; a drop longer than the sixty-second recovery window
makes the reconnection a fresh one, and the spent token is refused for ever.
Viewers BD opened have always recovered by asking their opener — which stops
working the moment a viewer arrives from a pasted link or a QR code, and on a
phone that is the ordinary case. BD hands one over while the line is up, and
re-arms whenever a viewer returns.

**A "Device" button beside View**, with a dialog carrying a QR code and the
link. Minted on the press, single-use, three minutes, with the countdown read
from the relay rather than copied into the page. It refuses on `localhost`,
where the link would mean the other device itself.

Two traps worth recording. The **Safari clipboard** refusal is the `window.open`
refusal this file already documents three times — a write after an `await`
arrives too late to count as a gesture — so the clipboard is handed the
*promise* during the press. And `requestModuleToken` lives inside
`setupInteractions` while the new code runs inside `init()`: **different
scopes**, so the bare call would have been a `ReferenceError` on the first
press. `window.bdRequestModuleToken` is what that handle was exposed for.

**The server was restarted**, having been up since Sep 19 while
`av_spare_token` landed on Sep 20 — sender and client with no handler between
them, which is exactly the "a relayed message needs three sites" failure
already in these notes.

---

## 2026-09-22 — a hidden module kept redrawing the card

Reported from BD: after looking at Kolam in Player, switching to the **Edit**
radio and wandering nodes, a node's text reached the top panel and about a
second later the old Kolam script pushed it out — *"if at all"*.

**About a second was the whole diagnosis.** That is `AUTO_DRIFT_MIN_MS`, the
interval at which a drifting module's echo is allowed to write. Leaving Player
mode **hides** the iframe and does not unload it, so the module went on
drifting and announcing `bd_av_state` from behind the graph. The auto-echo
listener went on redrawing *the focused card* with what it heard — and in Edit
mode the focused card is whichever node you just opened, because
`getFocusedCardBody()` falls through to the newest card in the stack. Nothing
tied the card being written to the node the module was showing.

The fix follows a line this code already draws for itself: **recording is data
and must never stop; redrawing is presentation and must not happen where it
does not belong.** A hidden module has nothing to present, so the presentation
half of `autoWrite` is now gated on `player-active`.

**The module is deliberately left running.** Unloading it on leaving Player
would also have cured the symptom and broken something real: a viewer on
another device must keep receiving frames while BD sits in Edit. The data half
is untouched, so it does. The bug was the redraw, not the drift.

---

## 2026-09-18 — the script becomes the source of truth

A direction rather than a fix: *"only the script is flexible enough to combine
sharing / saving / collaging"*. So BD stopped pushing the module's live state to
a viewer and started pushing **the card**. What a viewer shows is now what the
script says — the same text you would share, save or collage — and a script
edited by hand reaches both the module and the viewer, which the old path could
never do.

An `auto` tick box, on by default, makes the card and the module one thing in
both directions: stepper changes are written into the script, and edits to the
script move the steppers. Unticked, ↑ and ↓ are the only ways across. The ↓
moved 50% lower at the same time — the two arrows do opposite things, so hitting
the wrong one costs whichever side you had just got right.

**The drifting angle is now recorded in the script but still not pushed to a
viewer.** Those turned out to be different questions: the viewer runs the same
renderer and computes the angle itself, so sending ours only overwrote its
smooth value with an older one — the iOS backward-jump. The script records; the
viewer computes; the two reconcile when you come back.

The awkward part took three attempts, and the lesson is worth keeping:
**recording the script is data and must never stop, while redrawing the card is
presentation and must never land under a live cursor.** Treating that as one
decision failed twice — first by blocking on focus, which killed sync
permanently after any edit because the caret stays put; then by writing anyway
and resetting the cursor to the top of a contentEditable card. Separating them
made both easy.

Finally, a half-typed script is held back rather than sent, because the
renderer fills an unparseable value from its own default — so deleting a digit
used to send the figure to the default instead of leaving it where it was.

**Eight follow-up fixes came out of testing it**, and they divide cleanly.

Four were the wrong thing being treated as the truth. `av_hello` was answered
with the module's live state rather than the script — the only route left once
`auto` was unticked, which is why it showed on a phone and not a desktop: the
shim re-asks whenever the page becomes visible, and a phone switches tabs
constantly. Then `avLastPushed` turned out to have **two writers**, so its name
meant "the last script sent" while its value meant "the last thing the module
said" — which had silently defeated the previous fix and made the symptom look
like a new bug on a different platform. Re-ticking `auto` made the script
follow the steppers rather than the reverse, losing whatever had been typed
while it was off. And the viewer had been gated on `auto` by a regression of
mine: that box governs the card↔module coupling and nothing else, because a
viewer follows the script unconditionally.

Four were timing. A returning viewer threw away an edited card, because the
return forced a fresh one; pressing View doesn't change BD's mode, so coming
straight back now does nothing at all. A defence added that morning to ignore
BD's stale angle turned out to discard deliberate angle changes too, and was
removed along with the reason it existed.

**The real one was the drift clock.** The next tick was scheduled *after* the
render, so the period was `render time + interval` — a systematic bias rather
than jitter. A bigger canvas costs more to draw and therefore ticks slower, for
ever, so BD's module and the viewer's square canvas genuinely ran at different
rates. Over 20 minutes at a 6ms and a 22ms render that is 11,321 ticks against
9,837, about 25 arcminutes apart and still growing. Scheduling from when each
tick was *due* gives 12,000 and 12,000, and needs no measurement or feedback
between the two.

Last, a resync was sending a frozen angle, since angle-only drift frames are
deliberately suppressed. The user's observation settled it: *"subsequent
pressing view always takes AV back to the same position"* — a rate error would
land somewhere different each time, so landing on one fixed place meant a
frozen value. A resync now takes every parameter from the script and the angle
from BD's live figure, that being the one moment where BD's angle is the right
answer.

---

## 2026-09-16 → 2026-09-17 — BD and the viewer reconcile, and the renderer gets a voice

**The renderer stopped being blind.** `visual_module.html` runs in an iframe, so
its console and uncaught errors reached nobody — and `render()` catches its own
exceptions, making a throw silent twice over. Three bugs in this area had been
debugged without ever seeing what the renderer thought was happening. It now
forwards to BD and so to the server log. The very next press found the fault
that two rounds of reasoning had missed.

**The Down button was delivering a script with the L-system removed.**
`getCardText` was `body.textContent`, but a chunk card's body is several block
divs and textContent joins them with no separator — welding the tap-hint onto
`%%bd_]` so the score block never closed and the renderer threw for want of an
axiom. `readChunkBody`, the inverse the Save path already used, was the fix.
The same lesson as September's Sv incident: a renderer needs its inverse beside
it.

**The angle became a full turn.** Three definitions of its range disagreed —
input, render clamp and drift wrap — so drift walked 270 degrees that all drew
identically as 90, and at high drift the pattern visibly froze in under three
minutes. Now one definition, 0..359, wrapping. `angle_minutes` is a visible
stepper again, because the script records it and the user had no way to set it.

**BD and the viewer now reconcile state**, in three parts: an exploration cache
so wandering off no longer destroys the steppers; one viewer per module type,
so a Kolam script can never reach a music viewer; and the viewer handing its
state back — carried *with* the return, because on a phone the way-back button
closes the viewer and there is nobody left to ask afterwards.

**The way-back button grew up.** It only raised the window, which on a desktop
looks identical to doing nothing. It now opens the node — card and Player — the
way a tap does, and clears the two guards (`readingState`,
`lastAutoPlayerNodeId`) that made a return to a node BD was already on a silent
no-op.

---

## 2026-09-14 → 2026-09-15 — Ancillary Viewers, and closing three write holes

> **Gap notice.** The entry below this one is dated 2026-07-24. This file was
> not kept up through August and early September — roughly 200 commits covering
> speech synthesis and voice training, work views, cluster layout, remote view
> sharing, ink mode and the deep-link investigation are absent. `git log` is
> authoritative; `PLANNING_REGISTER.md` and `DOCS_INDEX.md` were brought current
> on 2026-09-12 and are the better summaries for that period.

**The Ancillary Viewer (AV) shipped.** BD mints a short-lived, single-use token
and opens a viewer WINDOW beside itself, driven live over the socket. The
viewer is BD's own page using the same renderer as BD and the standalone, so
there is one renderer to maintain rather than three. Verified on desktop and
iOS. Standalones are now **frozen, not retired** — new presentation work goes
to AVs.

**`Jump` became `View`, and its confirm dialog was removed.** The dialog asked
whether to pull the module's live script into the focused card before baking a
URL. An AV never reads the card — it asks the module directly — so the question
had no consequence to attach to. Removing it also removed the only reason the
handler was async before opening a window, which is what Safari requires. The
click is now the gesture, and the pre-claim machinery went with the dialog.
`Copy external url` was retired but deliberately not deleted.

**Three corpus-write handlers had no authentication at all.** `edit_save`,
`edit_delete` and `edit_clone_cluster` checked only whether a curation code was
*configured*, then wrote — while two sibling handlers verified it properly.
With CORS open, any page on the internet could reach them. Proven with an
anonymous socket from a foreign origin, run against both the pre-fix and
post-fix servers so the pass was not vacuous. The check is now a single
function; a module socket may send only `av_hello`; and refusals are surfaced
in the UI, which they never were.

**Kolam:** the `colour_speed` readout shows the directive's own value again
(the script said 4 while the stepper said 34), and the `step` ceiling went
200 → 999 — with a hold-repeat that now scales with the range, because at one
step per tick the new ceiling would have taken 60 seconds of holding to reach.

---

## 2026-07-19 → 2026-07-24 — SubFamily label + curator browser + view-scoped hints + auto-backup + one-tap chunked UX

Long span, many strands, all interconnected through the theme "make the graph properly navigable and editable". Runs across two dozen commits.

**Landmark commits:** `0a0951f` (apply-subfamily-labels + label hardening) → `e3b0f41` (nav_nodes_text restructure + child-normalized weights) → `74a9c2b` (curator page + endpoints + hint rate-limit 8s→500ms) → `f75656e` (cluster hint context + chat prefix + node shapes) → `8390db1` (curator: Add Cluster + zero-weight delete) → `9999b5e` (expandToNode hint context) → `013160b` (pre-flight auto-backup on every DB-mutating subcommand) → `f14ed4f` (view-scoped hint properties) → `298b336` (nav_nodes_text flag reset) → `89e8417` (BackupNotes appendix) → `f59f3de` (**one-tap chunked node reading UX**).

**What shipped, by theme:**

### `:SubFamily` label rolled out; nav-node file restructured

27 nodes tagged with `:SubFamily` alongside their existing `:Family` (dual-labelled — every SubFamily is still a Family for downstream code that queries by that label). Top 6 Families (Arts / Emotion / Nature / Reason / Spirit / Symbolic) remain single-labelled. Also fixed the Conversations→top-Family edge weights (all were 0.17, wrong under child-normalized convention; set to 1.0).

`nav_nodes_text.md` regenerated with the new tier ordering: Root → Entry (alpha) → Family top-level (alpha) → SubFamily (alpha) → Cluster (alpha). Each block shows `parents:` with **child-normalized** weights — per node, incoming DESCENDS_FROM weights divided by their sum so each row totals 1.0. Display-only projection over raw DB values; write-back to migrate weights follows the same `@flag update_this` convention as text edits.

### Browser-based curator at `/curator.html`

Three-column layout (Family / SubFamily / Cluster) with click-to-drill filtering. When a Cluster is selected, its SubFamily-parent weights become editable in the SubFamily column with a Save that atomically replaces the Cluster's parent edges — deletes any direct top-Family attachments and merges the new SubFamily edges. Orphan Clusters auto-seed guesses (grey italic) translated from Family weights; guesses commit on any edit.

When a SubFamily is selected, the Family column becomes editable — same shape, but for SubFamily→Family edges. Add-new-SubFamily + Add-new-Cluster strips below their columns. Zero-weight save on a SubFamily/Cluster deletes it (with safety checks: SubFamily delete relocates Cluster children per a documented rule; Cluster delete refuses if gateway TextNodes exist).

Endpoints added: `GET /api/nav-structure`, `POST /api/save-cluster-parents`, `POST /api/save-subfamily-parents`, `POST /api/create-subfamily`, `POST /api/create-cluster`.

Dev-write hint rate-limit reduced 8000 ms → 500 ms — the old window blocked the arrange→Write→arrange→Write curator cadence for legitimate use.

### View-scoped layout hints (`hint_x_<parentUuid>`)

The pre-existing `hint_x` / `hint_y` / `hint_scale` slots on edges were single-slotted per edge — but a DAG edge participates in ≥2 views (Nature→Animals is in Nature's view AND Animals's view). Whoever wrote last owned the slot; the other view's arrangement was clobbered.

Now each edge can carry multiple hint sets keyed by the "viewing" parent's URL-UUID: `hint_x_<uuid>`, `hint_y_<uuid>`, `hint_scale_<uuid>`. Client sends a pre-built `props` map; server `SET r += h.props` (additive). Reader picks the set matching the current expand parent, falling back to the bare `hint_x` keys for edges written before this change. Zero-migration.

Also fixed: `expandToCluster` and `expandToNode` were calling `runLayout(cy)` with no parent — hint restore silently skipped on Cluster / Root / Entry / TextNode expands. Now both set `lastParentNode` AND pass the node into runLayout, symmetric with the pre-existing `expandToFamily` behaviour.

### Pre-flight auto-backup on every DB-mutating `bd_tool.js` subcommand

Every subcommand that writes to Memgraph (`write`, `sync-helpers`, `apply-subfamily-labels`, `backfill-urls`) now snapshots both the DB (`DUMP DATABASE` → `.cypher`) AND the source `.md` (byte copy) into `./backups/` BEFORE touching Memgraph. Named `<original>.<tag>_<stamp>` so a `ls backups/` tells you which command produced each snapshot at a glance. `--dry-run` and `--no-backup` opt out. `cypher` is deliberately NOT wrapped (low-level tool — you own the safety).

Full restore surface documented in `BackupNotes.md` at the repo root: coverage matrix, restore procedures per failure mode (bad write, bad label pass, full DB rollback via mgconsole). Appendix added covering the view-scoped hint property keys anyone might encounter when reading a `.cypher` backup file.

### One-tap chunked node reading UX (2026-07-24)

The big pivot at the end of the run. Node text becomes a chunk list split on lines that read exactly `%%bd_chunk`. Every single tap on the main canvas advances the current node's sequence; a fresh node resets; tapping past the last chunk on a node with descendants navigates in. **Double-tap detection retired entirely** on the main canvas — all four state slots removed, defer windows gone.

Author-controlled tap hints via `%%bd_hint <one-line text>` inline in any chunk (extracted at parse time, removed from the displayed body). If absent, auto-defaults still fire: "Tap for next message from me." (non-last), "Tap once more to see connected nodes." (last-with-descendants), "There are not yet further descendants." (leaf).

Chunks render as div-body system cards (one per chunk) with head label `<name> (N)` and a centred italic amber `.chunk-hint` line immediately below the chunk body. Local cards (textareas) can't do inline centring so system-kind cards are the natural fit; consequence — chunk cards stack newest-on-top per BD convention, so multi-chunk sequences read reverse-chronological.

Boot-helper sequencing machinery from the intermediate iteration (2026-07-23 — added a `bootHelperQueue` on the server and a `next_boot_helper` handler so onboarding cards trickled in one-per-tap) is now **dormant**: `startBootHelperSequence` call in `enter_chat` is commented out (one line). Root's own chunk 0 becomes the eager pre-tap onboarding card, fired from `handleChatReady` via a new `primeRootReading` helper. All the machinery remains in place for a one-line re-enable if we ever want a supplementary boot batch again.

Root and Settling authored per user's copy:
- Root (0): welcome text + hint "Tap the ButterflyDreaming node below for its next message to you"
- Root (1): "First just browse …" + hint "Tap once more to see a connected node - then just keep tapping!"
- Settling: mindfulness copy (dropped the outdated "Now double click to find the Conversations node") + hint "When your ready tap the Settling Node to see its connection."
- Conversations: body updated to swap "Remember double click (or tap) to journey on..." for "If you want to retrace your steps you can use the Back button (top left) or the breadcrumbs bar."

**Polish batch (`52a79bd`, same day):**
- **Breadcrumb chips → single-tap navigate** (buddyCy + youCy). Same one-gesture model as main canvas; retired 8 pending/timer state slots.
- **`.text-reading` class** on TextNode chunk cards dims head + hint to 0.5 opacity so the actual verse/prose is the star during reading.
- **Newest chunk spotlit, priors dimmed** — inline `el.style.opacity = 1` on the current chunk, `0.4` on demoted priors. Managed via inline style rather than CSS class because `createCard` writes an inline `opacity: 0.85` on every card at creation, and inline beats class-based rules on specificity (documented as a gotcha in [[chunked-ux]] memory G6 for future traps).
- **Player-radio gate reads `readingState`** — `updateSendBtn` also inspects the currently-being-read node's text (via `readingState.nodeId`), so tapping a `bd_V_Kolam_*` module TextNode surfaces the Player radio again. Under the chunked UX the node text no longer lives in the top local textarea, so the old textarea-only check was missing it.
- **`insertNodeChunkAsCard` takes the node** (was `meta`) so it can build a useful head label for TextNodes via `title`/`source_text`/`name` fallback — TextNode chunks previously fell through to a "(node)" placeholder.

### Small polish along the way

- Chat card node-insert prepends `<name>: ` (or under the chunked UX, moved into the card head as `<name> (N)`).
- Top-level Family nodes: 80×33 oval → 60×60 circle. Conversations Entry node: 68×68 default ellipse → 88×76 hexagon (2:√3 ratio for equal sides). Shape carries the tier signal without relying on colour, per the reduced-colour-vision preference.
- `hasNavDescendants` uses direction-agnostic `connectedEdges` — the CF/SF replacement loops force edge source/target to canonical sides, so `outgoers` returned zero for every SubFamily and wrongly said "no further descendants".

### Reversal path

Each landmark commit reverts cleanly with `git revert`. All DB writes went through `bd_tool.js write` with auto-backup, so `backups/` has recoverable snapshots. Two dormant subsystems (boot-helper queue on the server, `bootHelperMoreAvailable` gate on the client) remain intact — never in the way, always available to re-enable.

---

## 2026-07-17/18 — EV extracted to its own repo + music player + ai_read scaffold

**Landmark commits (BD side):** `0d2045c` (BD → Pages URL) → `0dfba8b` (retire Prev/Next + API-dependent code) → `345545d` (name in Copy Link payload + display) → `3583c04` (amber Copy Link) → `50ddc3f` (inline music player) → `e47f237` (nav_nodes ai_read scaffold).

**Landmark commits (bd_V_Kolam repo, new):** `a03d5e6` (initial: preview.html + visual_module.html + README + CC0 LICENSE) → `00762ca` (Prev/Next retirement companion) → `8b072ef` (source-context node-name companion) → `87f3916` (amber Copy Link companion) → `39eb95a` (music player + 3 mp3s).

**What shipped, by theme:**

### EV → its own GitHub repo (public, CC0)

New repo `github.com/wrcstewart/bd_V_Kolam` — public, CC0-1.0 licensed, served via GitHub Pages at `https://wrcstewart.github.io/bd_V_Kolam/preview.html`. Contains `preview.html`, `visual_module.html`, README, LICENSE, `.gitignore`.

Repo name preserves the internal module id exactly (underscores + capital V) for grep consistency. Pages URL is case-sensitive.

BD's `viewer.js` `standaloneBaseUrl` swapped from the localhost URL to the Pages URL — all three deep-link paths (Jump-to, Copy-Link-to, BD-self Copy Link) now produce URLs anyone on any network can open. EV → BD direction unchanged (was already targeting the Cloudflare tunnel at `graph.virtualfictions.uk`).

### API-dependent code retired on the EV side

Everything that assumed a co-hosted BD Express server got deleted:

- ◀ Prev / Next ▶ buttons (relied on `/api/module-sibling`)
- `navigateSibling()`, `goToVirtual()`, `updateEvNavState()`, `evPrevBtn`, `evNextBtn`
- `fetchModuleDefault()`, `loadModuleDefault()` (relied on `/api/module-default`; DEFAULT_SCRIPT fallback covered the cold-boot no-params case anyway, but every load logged a stderr 404)
- `virtualStart`, `atVirtualStart` state (only used by navigateSibling)
- `moduleId`, `getModuleIdFromPath()` (only read by the retired fetches)

~163 lines removed. Kept: Freeze, Edit, source-context, sliders, textarea, Copy Link, invite panel, `?data=` arrival flow. All changes replicated in both preview.html copies (BD's `V_Kolam/` + the new bd_V_Kolam repo).

### Source-context now shows the node name

Reported: after moving to standalone EV, the bottom-bar source-context text showed only `"bd_V_Kolam"` (module/gateway label) even when the sender was on `bd_V_Kolam_2` — losing the `_2` identifying the specific node.

Fix: added `name` to the Copy Link payload in BD's `buildExternalWebsiteUrl` (was missing); EV's `renderSourceContext` now displays `name` alone when present (node names already carry the module prefix, so pairing with source_text read redundantly). Falls back to `source_text — title` for nodes without `name` (section-title TextNodes etc).

### Amber Copy Link

EV's side-panel Copy Link (the primary sharing action, directly below the script textarea) was inheriting `.action-bar button`'s teal-outline default, indistinguishable from Copy / ↓ / ↑. Given filled amber (`#a07820` bg, dark text, bold) to stand out. Same palette as the invite panel's `#bd-enter-btn`.

### Inline music player

Added to the right end of `#bd-bar` alongside Freeze/Edit/source-context: `<select>` track picker → play/pause button → `<audio preload="none">`. Three tracks hardcoded (EV has no server-side file discovery like BD does): `D_ChineseSad1.mp3` (63 MB, default), `A_GreatWall.mp3` (57 MB), `A_QiuFengCi.mp3` (844 KB).

`preload="none"` + lazy `src` assignment (only set on first play) is load-bearing — otherwise every fresh EV load would eagerly download ~120 MB.

The three mp3s pushed to the bd_V_Kolam repo. The two ~60 MB files tripped GitHub's 50 MB soft warning (`GH001: Large files detected`) but pushed successfully — well under the 100 MB hard limit. **No Git LFS needed at this scale.**

### nav_nodes_text.md ai_read scaffold

One-off transform: appended empty `%%bd_ai_read [ / %%bd_]` scaffolds to every block that didn't already have one. Opening + closing on their own lines with a blank between so a curator can just type between them. 171 got added; Root (which had one inline) untouched. Canonical form used, so sync-time normalisation is a no-op — what you write is exactly what lands in `node.text`.

Script at scratchpad `add_ai_read_scaffold.js` — one-off, not committed.

### Two-copy drift management

`preview.html` + `visual_module.html` + the three mp3s now exist in TWO places (BD's `V_Kolam/` + bd_V_Kolam repo root). User's stated preference (2026-07-17): keep both copies, manage the push manually.

Sync workflow: edit BD's copy first (all tooling geared there), `cp` overwrite EV's copy, `diff -q` verify byte-identical, commit + push both repos.

**Related memory:** [[ev-standalone-deployment]] — new, comprehensive doc. MEMORY.md index refreshed.

---

## 2026-07-17 — @flag review workflow + :User retired + Player gated + URLs stripped

**Landmark commits:** `540b46b` (sync-helpers @flag gate) → `de85344` (retire :User nodes) → `fbad529` (backfill-urls) → `f36cd78` (multi-block write + dump-nav-nodes + nav_nodes_text.md) → `aeb2115` (Player visibility gate + deep-link URL strip) → `7fdf7bc` (extractor: line-walk not paragraph-split).

**What shipped, by theme:**

### Bulk-review workflow

- **`@flag update_this: true|false`** directive now recognised by both `sync-helpers` (per @hub/@helper block) and the newly-multi-block-aware `write` command (per @match/@set block). CREATE (node doesn't exist yet) always applies. UPDATE (node exists) only applies when the flag is `true`; otherwise skipped and reported. Flags auto-reset to `false` after apply — file returns to a "no pending edits" state. Test on 6-block helper_messages.md: flipped `helper-nav-hint` to true, added a comma, sync applied 1 + skipped 5, flag reset to false in the .md.
- **`write` extended to multi-block** — `---` divider between blocks, same @match/@set format. `parsePatch` retired in favour of `parsePatchesFile`. `@match title` added as third-tier identity (url > name > title) for section-title TextNodes.
- **`backfill-urls`** subcommand — corpus-wide UUID identity coverage for `:Cluster` + `:Family` (default target labels). One round-trip: query candidates by `id(n)` (Memgraph doesn't have `elementId()`), JS generates UUIDs, one `UNWIND'd SET`. Applied to 126 nodes (120 Cluster + 6 Family). Corpus is now url-keyed everywhere except 84 empty orphan nodes (separate cleanup deferred).
- **`dump-nav-nodes`** subcommand + **`nav_nodes_text.md`** — 172-block file at repo root covering every Root + Entry + Family + Cluster + gateway/section-title TextNode (content-chunk TextNodes deliberately excluded). Each block carries `@match url` (always), `@match name` where present, `@match title` fallback for section-titles, `@flag update_this: false`, and `@set text:` with current text. Ready for the user's periodic review pass.

### Architectural cleanup: `:User` nodes retired

Server was creating a `:User` node in Memgraph on every socket connect purely to inherit an integer from `id(u)` into the viewer_id string. Leaky (~42 orphans had accumulated across dev iterations when purge timers died with their process). Now `viewer_id = 'N_' + crypto.randomUUID().split('-')[0]` — 8 hex chars, globally unique, in-memory only. `executePurge` no longer touches the DB.

Boot chain also gains `purgeStaleUsers()` chained after `pingMemgraph`: `MATCH (u:User) DETACH DELETE u` — one-off cleanup deleted the 42 orphans; a cheap no-op on every subsequent boot.

**Principle codified by user:** "no nodes in Memgraph for non-obvious architectural reasons".

### Memgraph id() vs elementId() gotcha

Discovered live: `elementId()` is Neo4j-only, Memgraph doesn't implement it. Memgraph uses `id()`. AND `id()` returns a numeric id that shares its space with relationship ids, so a bare `WHERE id() = X` could false-match either. Rule now codified: always scope MATCH patterns to nodes-only via `MATCH (n)` before the WHERE clause. Correct form:

```cypher
MATCH (n) WHERE id(n) = $nid SET n.url = $url
```

Never `MATCH () WHERE id() = X`. User's warning materialised on my first backfill-urls draft (used elementId — parse error `Function 'elementId' doesn't exist`); the corrected `id()` form runs everywhere in bd_tool.js writes.

### Player mode gated on module-in-top-card

Was previously always-enabled from boot. Now hidden AND disabled by default; visible + enabled only when the top local card's text contains a `%%bd_module` directive. Extends `updateSendBtn` (already called from every top-card mutation) with a regex check + label toggle. If user is currently in Player mode and the module disappears from the top card (e.g. new empty Local card created), a `bd:force-nodes-mode` custom event fires and init()'s listener calls `setViewMode('nodes')` to surface the graph.

### Deep-link URLs stripped to latest module block only

Cards accumulate paragraphs from every node-tap (each separated by `\n\n` since 2026-07-16). Previously, deep-link URL builders baked the whole card into the payload's `script` field, leaking "text from previous browsing". Now they call new helper `extractLatestModuleScript(text)` which returns just the latest module-script block.

Algorithm — LINE-WALK not paragraph-split (per user question: why require a blank line above the `%%bd_module` marker?):

1. Find the last line matching `/^%%bd_module\s+\S+/`
2. Walk forward, keeping every line while EITHER it starts with `%%bd_` OR we're inside an open `%%bd_score [ … %%bd_]` block (blank lines allowed inside score)
3. Stop at the first line that's neither a `%%bd_` directive nor inside an open score block

The module's own directive syntax is the boundary. Handles: no-blank-above, blank-inside-score, trailing-prose-cut, multiple-modules-last-wins. Verified with a five-case smoke test.

**Related memory:** [[bd-tool-and-helper-messages]] amended with all today's tool + workflow additions; [[deep-link-v2-moderation]] amended with the Player gate + URL strip; MEMORY.md index refreshed.

---

## 2026-07-16 — bd_tool.js + Helper Messages in DB (big infrastructure day)

**Landmark commits (chronological):**

- Chat polish: `3292412` (System card head = Root yellow #FFD700) → `1852f50` (accumulated card inserts get paragraph separators) → `ec7911b` (bot-context curator/user fork on chat side) → `df58afb` (card head labels: N=k → Local(k), Remote(k)) → `39cdc9f` (Remote label carries N.M inside brackets) → `d6695ad` (System → Helper (N.M))
- Onboarding text + helper text tweaks: `bd37458` (Helper 0.1 rewrite mentioning Helper/Remote roles) → `7235349` (dropped boot Helper 0.2 status; added on-Join no-partner message) → `367c4fb` (on-pair "successfully partnered" helper) → `1dcfe67` (Helper 0.2 navigation gesture)
- Button label reframe: `7c62c7a` (Remote Chat / Local Only) → `260af48` (idle → Join Remote to match helper text) → `9ae3d39` (toggled → Say: Bye)
- Card placement: `06b1e85` (helper cards strict newest-on-top, drop the dock-below-local rule)
- Infrastructure: `eb2c337` (bd_tool.js CLI: read / read-id / labels / cypher / write-stub) → `40aa6ac` (write from .md patch; Settling text fix as proof) → `78b20bf` (sync-helpers subcommand: parse @hub/@helper blocks, auto-generate url, write back into .md) → `de2f7ef` (helper_messages.md source-of-truth) → `c7be29b` (first sync — 6 nodes + 5 edges + 6 urls back into .md) → `f65910e` (server integration: retired 4 hard-coded string constants, 7 send sites now sendHelperByName from DB-loaded cache) → `0147aed` (wording iteration proof — flatten paragraph break in no-partner-waiting) → `952ebc8` (backup subcommand — DUMP DATABASE → replayable .cypher)

**Chat panel polish (the visible bits):**

- **System card head colour** — was `#2a2a00` (dim yellow, easy to miss). Now `#FFD700` — the same gold used for the Root node in the graph, with `#1a1a20` near-black text so luminance contrast passes (`[[user-colour-vision]]`).
- **Paragraph separation for accumulated inserts** — multiple node-taps into one local card used to jam together with single-newline separators. Now `\n\n` between inserts, and any `%%bd_ai_read [ … %%bd_]` block inside the incoming content gets a blank line before and after so it reads as its own paragraph.
- **Bot-context curator/user fork** — chat-side inserts now respect the same rule as `setSystemText` on the (dormant) default panel: with `#dev-code` non-empty, `%%bd_ai_read [ … %%bd_]` un-normalises to `[ … ]`; without it, the block is stripped entirely. Ordering (paragraph-normalise FIRST, then apply fork) matters.
- **Card head labels reframed** — `N=1` / `N=2` → `Local (1)` / `Local (2)`; partner cards `1.1` / `2.3` → `Remote (1.1)` / `Remote (2.3)` (N.M inside brackets preserves the compose-card association from the old `communications.md §4.1` scheme); system cards → `Helper`, then `Helper (N.M)` matching Remote's scheme (0.1 / 0.2 for boot-time messages that arrive before Local (1) exists).
- **Helper cards strict newest-on-top** — dropped `top.el.after(sys.el)` docking rule; helpers now prepend at the top like Local and Remote. `[[system-card-placement]]` memory marked superseded.

**Onboarding text tweaks:**

- Helper (0.1) rewrite mentioning both Helper and Remote roles
- Boot-time "Partner not available — please wait." card removed (was firing unconditionally to every arrival before they'd expressed pair intent)
- New helper: NAV_HINT ("Remember one click…") as Helper (0.2)
- New helper: NO_PARTNER_WAITING when user presses Join with no one waiting
- New helper: PAIRED sent to both sides on pair completion

**Button labels reframed:**

- Idle: `Chat` → `Join` → `Remote Chat` → **`Join Remote`** (final; kept for consistency with NO_PARTNER_WAITING helper text referencing "if someone remote presses Join")
- Toggled (waiting/paired): `Leave` → `Local Only` → **`Say: Bye`** (final; farewell framing)

**bd_tool.js — new CLI at repo root:**

```
node bd_tool.js read <name>
node bd_tool.js read-id <elementId>
node bd_tool.js labels
node bd_tool.js cypher <query> [<paramsJSON>]
node bd_tool.js write <patch.md> [--dry-run]
node bd_tool.js sync-helpers <helpers.md> [--dry-run]
node bd_tool.js backup [<outPath>]
```

Talks Bolt to localhost:7687 (same as server.js). JSON on stdout, progress/errors on stderr. `disableLosslessIntegers: true` so Integer values arrive as plain JS numbers.

`write` patch format: `@match url|name: <value>` picks target (url preferred), `@set <prop>: <value>` writes (inline or multi-line up to next `@` / EOF). Prose ignored — reads as a normal .md doc. Refuses ambiguous @match, no-match. Proof: `patch_settling_text_fix.md` fixed `tbottom` → `bottom` and stray spaces in the Settling Entry node.

**Helper Messages architecture (the big one):**

- New node kinds: `:HelperHub` (one, `name: 'Helper Messages'`), `:HelperMessage` (one per helper, `{ name, title, trigger, text, url }`)
- New edge type: `:CONTAINS_HELPER` from hub to each message
- New source-of-truth file: `helper_messages.md` at repo root — one hub declaration + N helper blocks separated by `---`
- `sync-helpers` subcommand parses the .md, upserts nodes (identity by url, then name), ensures edges, auto-generates urls on create and writes them back into the .md so the file becomes durable-identity source of truth
- Server side (`server.js`): new `helpersByName` cache Map, `loadHelpers()` reads all HelperMessages at boot chained after `pingMemgraph`, `sendHelperByName(userId, key)` replaces the old `sendSystemCard(userId, HOW_TO_TEXT)` pattern at 7 send sites
- Retired 4 hard-coded string constants + 2 inline `'Partner disconnected.'` literals
- Wording iteration is now: edit .md → sync-helpers → restart server. No code changes for wording tweaks.

Current 5 helpers: `helper-how-to`, `helper-nav-hint`, `helper-no-partner-waiting`, `helper-paired-success`, `helper-partner-disconnected`.

**Backup:**

`node bd_tool.js backup` dumps whole graph via Memgraph's `DUMP DATABASE` → `backups/memgraph_YYYY-MM-DD_HHMMSS.cypher`. First backup 3037 statements, ~810 KB. `backups/` in .gitignore.

Restore recipe: `mgconsole … < backups/memgraph_….cypher` against an empty Memgraph.

**Related memory:** [[bd-tool-and-helper-messages]] (new comprehensive doc); [[system-card-placement]] flagged SUPERSEDED.

---

## 2026-07-15 (part 2) — Deep link generation + content-moderation ops

**Landmark commits:** `9c9c5fd` (BD-self Copy Link + action bar reshape) → `7003273` (add node_id — WRONG identity choice) → `e75af6e` (revert; node_url is the durable UUID) → `4d57e71` (Op 1: receiver-gate payload.script on isModuleTarget) → `c88c9f1` (Op 2: EV textarea readonly) → `c63529c` (deep-link arrival breadcrumb seed Root→target) → `2029353` (chip font 9→8) → `3b5cf70` (chip width +5% + Back / Root exit Player mode) → `9deb2a3` (EV "Should I update the script?" dialog) → `ca73e74` (Op 3: EV sliders no longer auto-write textarea) → `dc4f034` (dialog extended to BD's three Player-mode share buttons) → `bffacaf` (wording: "settings may have changed", not "drifted").

**What shipped — three connected threads:**

### 1. BD-self Copy Link button + action-bar layout squeeze

New `#copy-link-btn` on BD's action bar generates a URL back to BD itself (`window.location.origin + "/?data=..."`) carrying the same payload shape as the EV Copy Link. Same three-rung clipboard fallback (async → execCommand → visible textarea). Old New Card lost `margin-left: auto` and moved next to ↑; both New Card and the new Copy Link use two-line labels (`New<br>Card`, `Copy<br>Link`) so each stays narrow enough for the iPhone action bar.

Receiver flow uses `handleReturnFromStandalone` — same code path that already handles EV → BD arrivals.

### 2. Deep-link identity: `node_url` (UUID-based), not Neo4j elementId

Tried using Neo4j's elementId as a "stable id" (commit 7003273). Reverted the next commit — the project already has a durable UUID-based identity: `node.data('url')` = `'butterflydreaming.org/n/<uuid>'`, set at node creation via `crypto.randomUUID()` in the MM1+ migration scripts. Neo4j elementId is DB-instance-scoped and regenerates on reimport — wrong tool for durable share links.

Coverage gap flagged: legacy corpus TextNodes predate the UUID convention and have no `url`. BD-self deep links to those fall through and no-op. Backfilling `url` on the legacy corpus is a data-side migration task, not yet scoped.

### 3. Content-moderation architecture (Ops 1-3 + confirm dialog)

Threat model: users typing free-form text into producer surfaces → Copy Link → receiver applies content as if authoritative. Not a code-injection concern (no eval / DOM injection) but a **content-curation** one — the corpus is curated; chat cards and scripts shouldn't leak arbitrary text through shared URLs. User's framing: "layered security screen will filter engineered URLs anyway; this is more because editing belongs in BD not EV" — the fix here is separation of concerns.

**Op 1** — BD's `handleReturnFromStandalone` computes `isModuleTarget = !!(target.data('hasModuleScript') || parseModuleId(target.data('text')))` and branches:
- **Module target** → payload.script is trusted (producer's UI, post-Ops-2/3, ensures it's slider-derived). Full existing flow: shadow node.text, original DB script on N=1, payload script on N=2, auto-Player.
- **Normal target** → payload.script is IGNORED. Navigate to node, populate top card with node's OWN DB text (mirrors a manual tap). Stay in Nodes mode. Sender's typed chat drops on floor.

**Op 2** — EV's script textarea gets `readonly` attribute. Keyboard editing rejected. Sliders write to `.value` programmatically (`readonly` doesn't block JS assignments). Color slightly desaturated + `cursor: default` as read-only cues.

**Op 3** — EV sliders no longer auto-write the textarea. Previously `stepControl` did `textarea.value = writeDirective(textarea.value, ...)` making the textarea a live mirror (Op 1/2's protection would have been hollow). Now sliders update `currentScript` (module-scope mirror) and post that to the module; textarea holds only the LAST COMMITTED script (from loadScript, ↑ Receive, or ↓ Send). User commits accumulated slider + drift state to the textarea by pressing ↑ or accepting the update-script dialog.

**Update-script dialog** — fires from both EV Copy-Link buttons AND (in Player mode) all three BD share buttons (`#jump-to-ext-btn`, `#copy-link-to-ext-btn`, `#copy-link-btn`). Same wording, same shape, same `localStorage.bd_ev_copylink_updatemode` key (BD + EV share an origin, one preference applies). "Yes, update" fires `bd_script_request` to the module, awaits `bd_script_response` (500ms timeout), then runs the copy — existing top-level handler updates textarea (EV) / focused card (BD), promise resolves, copy fires with fresh source. Non-Player-mode BD Copy Link skips the dialog entirely (normal-node share, receiver ignores script anyway).

### Receiver arrival UX polish

- **Breadcrumb seed** — after `enterNode(target)`, `#cy-you` gets two chips: `Root` and target, connected by an amber curved edge (`.deep-link-hop`, `curve-style: unbundled-bezier`, control-point-distance -11px). Signals "we jumped here, we didn't walk step by step". Required exposing `addYouChip` from setupInteractions.
- **Chip typography** — width 60 → 63 (+5%), font 9 → 8 (~10% smaller). Edge characters no longer clip.
- **Back button + Root chip exit Player mode** — two supplementary listeners in init(). Without them, `restoreState()` / `expandToNode(root)` fired correctly but the graph update happened UNDER the module iframe — user saw nothing. Now Back and Root taps surface the graph.

### Wording note

Dialog body originally said "The visual may have drifted…". User pushed back — "drifted" is jargon tied to the specific angle-drift feature. Changed to "The settings may have changed since the last sync…" in both origins.

**Files touched:**

- `viewer.js`: `buildBdSelfUrl`, `isModuleTarget` branching, breadcrumb seed, Back/Root mode exits, `withUpdatePrompt` + `requestModuleSyncBD`, dialog wiring for 3 buttons, `addYouChip` exposed
- `index.html`: action bar reshape, `#copy-link-btn` new, radios `disabled` attr removed, dialog markup
- `style.css`: two-line button styling, `.modal-*` rules, chip width/font tweak
- `V_Kolam/preview.html`: `<textarea readonly>` + colour/cursor cue, `stepControl` uses `currentScript`, `bd_script_response` + `sendBtn` also update `currentScript`, dialog markup + CSS + JS, `withUpdatePrompt` + `requestModuleSync`, dialog wiring for 2 buttons, header comment updated

**Deferred:**

- Backfill `url` property on legacy corpus TextNodes (data-side migration)
- Wrap EV's `#bd-enter-btn` (Jump to BD, same-tab) in the update-script dialog — semantics of dialog-on-navigation weren't obvious enough to just do
- ESC / click-outside dismiss on both dialogs
- UI-visible "reset preference" (currently DevTools-only via `localStorage.removeItem`)

**Related memory:** [[deep-link-v2-moderation]] (new comprehensive doc); [[mm1-amendment]] updated with second-amendment note; [[always-on-chat]] unchanged but interacts (unlocking Player at boot is what made step 6's auto-Player always-fire, which Op 1 then re-gated).

---

## 2026-07-15 — Chat always on; Chat button → Join / Leave

**Landmark commits:** `893e9af` (UX simplification) → `fd43b45` (onboarding line).

**What shipped:**

- **Chat panel is now permanently active from page load.** Previously the user arrived in a "browse-only" state; the Chat button gated chat mode, Player mode, and pair queue simultaneously — meaning users couldn't try Player or see chat panel until they entered the pair queue with a curation code. Now the panel is visible immediately, populated with the how-to + status system cards, ready for a real N=1 local card to compose in.
- **Nodes / Player radios enabled from boot;** EV "Extend / Jump to / Copy Link to External Website" invite panel appears the moment a user picks Player — no pair required.
- **Chat button renamed Join / Leave** and only manages pair state. Label flips based on `pairingState.active || pairingState.waiting`. Curation code still required for arriver; same-device refusal still enforced (MM3 mechanics untouched).
- **No auto-requeue when buddy leaves.** Previously, on `buddy_disconnected`, client auto-re-emitted `ready_to_pair`. Now the button reverts to Join and the user must press again to try another partner. Matches the opt-in-both-directions model.
- **N=0 hidden ghost card removed.** Server's `chat_ready` still fires (once, right after boot-time `enter_chat`); client's `handleChatReady` still runs and creates the visible N=1 directly. No more hidden serial-0 placeholder.
- **Onboarding demoed live.** `HOW_TO_TEXT` in server.js gains "Try it out now — select and copy this line!" — turns the how-to card itself into the demo target for the OS-copy card-lift mechanism (which was already wired but invisible to new users).

**Files touched:**

- `viewer.js`: `chatModeActive` initial `true`; `pairingState.waiting` added; boot activation block after ws connect (chat panel active, enter_chat emit, radios/Copy Down unlocked, Join label, positionCyEl rAF); `toggleChatMode` (~60 lines) replaced by `togglePair` + `updateJoinButtonLabel` (~30 lines); all four pair-state handlers now sync button label; `handleReturnFromStandalone` step 4 removed; step 5 (`handleChatReady` force-call) preserved.
- `index.html`: `#chat-btn` label `Chat` → `Join`; `disabled` attr removed from radios + `#copy-down-btn` (JS boot still enables them; removing from HTML prevents flash). Cache-bust `viewer.js?v=401`.
- `server.js`: `HOW_TO_TEXT` extended with the try-it-now sentence. No behaviour change to any handler.

**Discovered but deferred:**

- **OS-copy card-lift mechanism was already wired but invisible.** Every card body listens for `copy` (via `handleCardCopy`), and any copied text auto-appends into the top local card. Users didn't discover this — hence the new demo line. Considered adding a visible per-card lift button; user preferred to leave the wire alone and add the invitation line to onboarding first.
- **Dead code left in place** for now: `ensureLocalCard` function + destructure slot; stale comments referencing `toggleChatMode`; `#default-panel` in HTML (always hidden via sibling selector). All safe to prune in a follow-up once the new UX is settled.

**Behaviour verification:**

Test flow on reload — page loads → chat panel visible with system cards → Player radio works → EV invite panel appears in Player mode → Join button queues for pair (with optional curation code) → Leave button unpairs / walks out of queue → buddy disconnect returns solo user to Join without auto-requeue → same-device refusal keeps chat panel active (was already the case pre-2026-07-15, now the same is true for `code_required` too).

**Related memory:** [[always-on-chat]] (new); [[project-pairing]] amended for opt-in / no-auto-requeue; [[chat-panel-state]] chat-toggle sections marked superseded; [[n0-ghost-protocol]] marked superseded; [[mm1-amendment]] "Pair button removed" note flagged as reversed.

---

## 2026-07-12 — MM3 amendment: BD invite panel + cross-tab kick

**Landmark commits:** `5ba9550` (part 1 scaffolding) → `4ad6b8d` → `72f3c64` → `9375167` (part 2 button wiring) → `e2aa7ec` (BroadcastChannel kick — later reverted) → `e864288` (cookie-based kick, final).

**What shipped:**

- **BD viewer now has its own invite panel** — reciprocal of the EV's "Butterfly Dreaming" panel. When you enter Player mode on a media node, a small panel materialises to the right of the module's stepper column:
  ```
  Explore
  [ Jump to ]
  [ Copy Link to ]
     *External*
     *Website*
  ```
- **Jump to** opens the standalone EV in a **new tab**, carrying the current node's script + node_url + source_text + title as a `?data=` payload. BD tab lives on so the chat/pair session isn't lost.
- **Copy Link to** writes the same URL to the clipboard with the three-rung fallback (async → execCommand → visible textarea).
- The action-bar's old `#copy-link-btn` was **removed** — that action moved into the invite panel. `buildExternalWebsiteUrl()` in `viewer.js` is now the single URL builder for both buttons.
- Canvas inside the module iframe **snugs against the left of the module column** on desktop (previously there was a huge gap between the square canvas and the 220-px control column). Achieved with `justify-content: flex-end` on `.canvas-wrapper`.
- **Media player** now appears immediately when the file list arrives from the server — no longer gated on navigating to the "Settling" node.

**Cross-tab kick — anti-gaming:**

Discovered mid-session that when a user does Jump-to → EV → Jump-in-back, the returning tab is a *new* BD WebSocket, and their original BD tab is still alive. That's two BD sessions on one device, enough to pair with yourself and defeat the two-user chat/save premise.

Fix: server-side `bd_device_id` cookie (per browser, 7-day Max-Age, UUID, only issued on GET / or /index.html to avoid asset-request races). Server tracks `deviceIdToWs: Map<deviceId, ws>`. On any new WebSocket connection whose device_id matches an existing entry, server sends `{type: 'kicked_by_newer_tab'}` to the old ws then closes it. The kicked client shows a specific session-expired overlay.

Initial attempt (commit `e2aa7ec`) used `BroadcastChannel` — worked but is same-origin only, so would break the moment the EV moves to GitHub Pages. Reverted and replaced with the cookie approach (`e864288`), which is origin-agnostic (cookie belongs to BD's origin regardless of where the browser navigated from).

**"Some trouble" bypass:** clear cookies, use incognito, or a second browser. Per user's explicit acceptance bar — same-device gaming becomes annoying enough not to be trivial, no tighter than that.

**Non-obvious gotcha:** `ws.on('close')` must **identity-check** the map entry before deleting (`if (deviceIdToWs.get(ws.deviceId) === ws) delete`). Without this, a fast kick+reconnect race can have the kicked-ws's later close event clobber the newer replacement entry.

---

## 2026-07-11 — MM2 amendment: hasModuleScript + EV button strip

**Landmark commits:** `a44a751` (plumbing) → `fdd2a7a` (EV button strip) → `9e466a1` (TDZ fix) → `cae1bb5` (virtual position) → `dd57ddd` (chat two-card) → `3dce0b5` (media player always-on) → `a207e50` → `77f932f` → `f57b270` → `ee56425` (EV invite-panel iterations).

**What shipped:**

- **DB migration** via new `migrate_mm2.js` (user-run, same pattern as `migrate_mm1.js`): renamed `bd_V_Kolam_1` → `bd_V_Kolam_001`, `bd_V_Kolam_2` → `bd_V_Kolam_002` (3-digit zero-padded convention). Set `hasModuleScript = 'bd_V_Kolam'` on both. Created two Memgraph indexes: `:TextNode(hasModuleScript)` and `:TextNode(created_at)`.
- **Two new HTTP endpoints** in `server.js` (the first HTTP routes in the codebase — everything else was WebSocket):
  - `GET /api/module-default?module=<id>` — returns the first content node by min(seq), plus `isFirst` (always true) and `isLast` (true iff module has one node).
  - `GET /api/module-sibling?node_url=<url>&direction=next|prev` — returns adjacent sibling under the same `hasModuleScript`. Uses a LIMIT 2 idiom in the Cypher: 1 row back means we're at the boundary in that direction, 2 rows means there's more beyond.
- **`bd_param_update` message type** added to `V_Kolam/visual_module.html` — lets a host harness set a single directive value directly instead of rewriting the whole script. Used by the EV's Freeze button (angle_drift → 0 and back). Adds a `<name>-slider` id lookup with an `input` event dispatch so `handleControlChange` fires unchanged.
- **External Viewer basic mode.** `preview.html` now starts with `body.ev-basic` — side panel (textarea + steppers) hidden by default. Bottom bar shows only:
  ```
  [Freeze] [Edit] [◀] [▶]   <source context>
  ```
- **Freeze**: `bd_param_update {angle_drift: 0}`, stores prior drift for restore, silently clears on any script swap.
- **Edit**: toggles `body.ev-basic` — side panel materialises with textarea + steppers.
- **◀ / ▶**: fetch `/api/module-sibling`, load response, `updateEvNavState(isFirst, isLast)` disables the boundary button.
- **Virtual "position 0" for `?data=` arrivals.** When EV loads with a `?data=` payload, that payload is cached as `virtualStart` and treated as slot 0 of the navigation list. DB siblings occupy slots 1, 2, 3, ... ◀ from the first DB sibling returns to virtual (so a user's edited-script arrival state stays reachable after browsing away).
- **Chat panel dual-card on `?data=` return.** When BD viewer receives a `?data=` return-from-standalone, the chat panel now shows **two** cards: the original DB script on N=1, the incoming (edited) payload script on N=2 (newest on top). Skipped when the two scripts are identical.
- **Media player always visible** — no longer gated on navigating to Settling. Opens immediately when the file list arrives.
- **`loadScript(script, meta?)` central function** in `preview.html` — used by initial-load, ?data= decode, Prev/Next, Copy Down. Central place for future script-application changes.
- **BD viewer default-node fallback rewritten structurally** — `handleReturnFromStandalone`'s fallback for missing `node_url` now uses `hasModuleScript + min(seq)` rather than a `moduleId + '_1'` name match. Robust to any naming change (was going to silently break the moment `_1 → _001` happened).

**EV invite panel iterations** (afternoon session): initially had "Jump In" alone → then added Copy Link → then removed Copy Link (redundant with URL bar) → then restored Copy Link with new naming ("Jump to Butterfly Dreaming" / "Copy Link to Butterfly Dreaming") so the italic "Butterfly Dreaming" line below acts as a shared object of both verb-buttons. Muted amber palette instead of bright gold. Text shortened from "You can use our Butterfly Dreaming Platform to explore context, collaborate and save" → "You can use our Platform to explore, collaborate and save".

**Non-obvious gotcha (worth remembering):** A `function` declaration hoists but its **body** doesn't. `updateEvNavState` closed over `evPrevBtn` / `evNextBtn` `const`s declared later in the file. When `loadInitialScript`'s `?data=` branch called it synchronously, the `const`s were still in TDZ → ReferenceError. The surrounding `try/catch` swallowed it and logged (misleading) `preview: failed to decode ?data param`. Actual decode had succeeded; the throw only interrupted the nav-state update, but the flow then fell through to `loadModuleDefault` which overwrote the payload with `bd_V_Kolam_001`. Fix: `updateEvNavState` now looks buttons up via `getElementById` at call time (no closure). See `feedback_tdz_destructure.md` for the general pattern.

---

## 2026-07-10 — server + tunnel restart after machine shutdown

No code changes. Helped restart local `node server.js` (killed a ghost process holding port 8080) and `cloudflared tunnel run` after machine reboot. Config at `~/.cloudflared/config.yml` unchanged; tunnel maps `graph.virtualfictions.uk` → `http://localhost:8080`.

---

## 2026-07-05 — MM1 amendment: media-module naming + return-from-standalone

**Landmark commits:** `588846e` (registry + URL rename `/visual1` → `/bd_V_Kolam`) → `5ee507d` (Copy Up enables on auto-load) → `bc2cf3c` (initial return-from-standalone) → `a3b577c` → `ebf4f15` → `1938a6e` (return-flow race-condition fixes) → `0ddc8b4` → `09ba3c5` (default-node fallback).

**What shipped:**

- **Module identifier convention** — every module now has a stable text id like `bd_V_Kolam` (BD platform prefix + type + module name). `%%bd_module bd_V_Kolam` in scripts.
- **`MODULE_REGISTRY`** in `viewer.js` maps id → iframe URL. Enables future multi-module support.
- **Strategy B auto-load** — entering Player mode on a media node auto-loads its script into the iframe (fast-path if same module, src-swap + await BD_READY if different). No need to press ↓ manually.
- **Full URL rename** `/visual1/` → `/bd_V_Kolam/` in the Express mount, the iframe src, and the Copy Link URL constructor. On-disk `V_Kolam/` directory unchanged.
- **Return-from-standalone flow.** When BD viewer opens with `?data=<base64 JSON>` in the URL (produced by the standalone player's "Enter ButterflyDreaming" button), viewer.js:
  1. Decodes the payload `{script, node_url, source_text, title}`.
  2. Finds the originating node by URL match.
  3. Locally overwrites `node.data('text')` with the payload script (so Player-mode auto-load uses the edited version, not the DB copy — not persisted).
  4. Engages Chat mode + populates the local card with the payload script.
  5. Engages Player mode → visual plays.
  6. Strips `?data=` from URL bar so a refresh doesn't re-fire (later reverted in dd57ddd to enable two-card chat display).
- **Pair button removed** — Chat button now toggles pair + chat + unpair as one action.
- **Curation-code gate** on pair completion (not on Chat press). Server: if `waitingUser` exists, arriver must send a valid code; otherwise queue silently. Solo dev testing works without a code.
- **`migrate_mm1.js`** — one-shot DB script for the initial `bd_V_Kolam` renames and CHILD/CLUSTER_REL setup.

**Non-obvious gotchas:**
- `V_Kolam/index.html` (thin relay) had `RELAY_UP` deliberately excluding `BD_READY` — fine when the viewer never needed BD_READY, broke silently under MM1.6's src-swap-and-wait path. Added `BD_READY` to `RELAY_UP`.
- `positionCyEl` was stamping `#visual-iframe` with `#cy.getBoundingClientRect()` — but in Player mode #cy is `.hidden` (display: none), so the rect is zero. Iframe collapsed to 0×0, module rendered blank. Guarded the stamp to skip on zero rect.
- `handleChatReady()` must be called synchronously in the return-flow before `setChatText` — the async chat_ready message from server hasn't arrived yet, so setChatText would land in the hidden N=0 ghost card instead of a visible N=1.

---

## 2026-07-04 — pair button rework, CHILD arrow symmetry fix, TextNode label priority

Merged into the MM1 arc. See `project_pairing.md` + `project_mm1_amendment.md` for the pair rework detail; `project_a42_visual_module.md` for the CHILD-symmetry fix (was: `handleGatewayClick` excluded CHILD edges from its show-set); label-priority fix (`name` wins over `source_text`, so `Kolam_1` renders as "Kolam_1" not "Visual Tests"). Also: attempted TextNode dedup by url (`95acef7`), reverted (`60eda62`) — dedup broke `handleGatewayClick`'s raw-elementId lookup. `cy` exposed on `window` for browser-console debugging.

---

## 2026-07-03 — Copy Link cross-app flow + standalone bd_bar

`3fef0b7` (Copy Link button in BD viewer) → `c6bd547` (preview.html decodes `?data=` envelope) → `6828974` (URL targets preview.html) → `6773772` (relocate button to #action-bar) → `779378c` (percent-encode base64 in URLs — silent `+ → space` bug) → `ef8ea01` → `3058633` (Copy Link prefers lastReadNodeId over activeNodeId) → `62ddef5` (standalone `#bd-bar` with source context + Enter BD) → `c8d809a` (Copy BD Link) → `7ff2131` → `3651ca1` → `c4a4d84` (three-rung clipboard: async → legacy execCommand → visible textarea).

Established the cross-app return-trip protocol and the three-rung clipboard strategy that lets Copy Link work on plain-HTTP LAN.

---

## Older work

Pre-2026-07-01 work — the initial A42 visual-module integration, the card-stack design, the chat panel — see the memory files in `~/.claude/projects/.../memory/`:
- `project_a42_visual_module.md`
- `project_a42_card_stack_design.md`
- `project_chat_panel.md`
- `project_layout_topology.md`

Or `git log --before='2026-07-01'` for the commit-level detail.
