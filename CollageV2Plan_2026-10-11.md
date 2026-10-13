# Collage v2 — the COLLAGE BUTTON

Started 2026-10-11. The second approach to assembling a collage, and the one
that answers the gap v1 never closed: **v1 had no mechanism for PRODUCING a
collage script.** `bd_Collage_001` and `bd_Collage_002` are hand-built, and
every session's work went into adjusting and viewing them.

**v1 is not retired.** `bd_Collage_002` stays where it is, under the Kolam3D
cluster, as a working demonstration of the overlay approach — the three-layer
preview, the clipped overlay frame, the per-slot merge. Much of its machinery is
what v2 stands on; see §3.

Predecessors: `CollagePlanStarted_2026-09-22.md` §7–§16 (v1's design),
`PLANNING_REGISTER.md` **Added 2026-10-07 / 2026-10-10 / 2026-10-11** (what was
decided and what was built), `ThreeJS_and_VR_2026-09-28.md` §7 (the
iframes-versus-one-scene fork, still open).

---

## 0. How this document is written

**Paragraphs headed `WRCS note:` are the author's own.** They may appear
anywhere in this file, in any section.

The rule for anyone editing this document, me included: **a `WRCS note:`
paragraph is never reworded, never summarised, never moved out of the context it
was written beside, and never folded into surrounding prose.** Respond to one by
writing *after* it, or by adding to the section it sits in — not by editing it.
If a note turns out to be superseded, say so beneath it and leave it standing;
the record of what was thought at the time is worth more than a tidy page.

§1 below is the same principle applied to the notes this file started from:
quoted verbatim rather than absorbed.

## 1. The author's notes, verbatim (2026-10-11)

> Keep the collage 002 in Kolam3D —
>
> new development will use different method as outlined below. Next to View
> button is a Collage button.
>
> Every script has an associated module type TEXT MUSIC GRAPHIC at the moment.
> On collage button press — If collage script = empty then a collage module
> script is started and the current script gets a collage module header — if is
> a text node the text inserted into a text module content. If a graphic or
> music type then the module script is inserted like the Kolam3D collage script.
>
> If collage script already has that type it replaces whats there.
>
> Notice the module steppers are still on screen and they sync with the relevant
> entries in the collage script.
>
> User can press view to see result. If user copies to history the collage is no
> longer active because not in top pane. To start a new collage user presses the
> new card button.
>
> In other words user can edit current module. To edit previous module they
> simply find the relevant module — however the complication is that if the user
> presses collage button the last used collage script should appear when collage
> is pressed. It then replaces if necessary the module of that type that is
> there.
>
> Each collage script has not more than one each of the three types.

---

## 2. What the design says, restated

Offered back for correction, not as an addition:

- **The Collage button is an ACTION, not a mode.** "Add what I am looking at to
  the collage." The module stays on screen with its own steppers.
- **The collage lives in the TOP CARD**, not in a node. That is why copying to
  history deactivates it and why New starts a fresh one — both fall out of the
  card stack rather than needing rules of their own.
- **At most one TEXT, one MUSIC, one GRAPHIC.** Pressing Collage on a node whose
  type is already present REPLACES that slot.
- **The type is derivable from the script**, so nothing new has to be declared
  or stored — see §3.
- **One module is live at a time.** You adjust the module you are standing on;
  to adjust another you navigate to it and press Collage again. The composite is
  seen in View.

---

## 3. What v1 already built that v2 needs

Recorded so none of it is rebuilt by accident. All of this shipped 2026-10-08
to 2026-10-11 and is in use by `bd_Collage_002`:

| piece | what it does for v2 |
|---|---|
| `parseCollage` / `collageSlot` | reads a collage script into typed blocks with their order |
| **`collageMergeBySlot`** | merges one module's script into its OWN block and leaves every other line alone — the operation "replaces what's there" needs |
| `collagePreservingWrite` | a module's announcement UPDATES a collage card instead of replacing it |
| exploration accumulation | a collage's live state is the sum of its slots', not the last one to speak |
| `bdSameModule` collage-aware | a collage names several modules, so any slot's announcement belongs to it |
| Copy Down / `publishCard` per slot | an edited collage script reaches each module separately |
| View's three-layer render | the figure, the words, the transport, from one script |
| `getModuleKind` | the GRAPHIC / MUSIC half of the type test |

**"The module steppers sync with the relevant entries in the collage script" is
therefore already true** — it is what the whole of 2026-10-11 was spent making
work. That is the single biggest reason to think v2 is cheap.

---

## 4. Settled in discussion, 2026-10-11

### 4.1 Saving — DEFERRED, deliberately

Not saved automatically and not permanent. Paired users will save a collage the
same way as any other script, and the protocol comes after that. **The author's
reason is the useful part: "the idea is to creep up on exactly what data will
need to be saved."** Build the thing, see what it actually holds, then decide
what persistence means — rather than designing a format for data that does not
exist yet.

For development the author may ask for one or two test cases saved as specific
new nodes, as `bd_Collage_001` and `002` were.

**ONE SAFETY ITEM, AND I OVERSTATED IT — corrected 2026-10-11 after reading
the code.** I said a collage in the top card could be saved over a Tao Te Ching
passage by pressing `Sv`. **It cannot.** `dev-save` carries
`labelByType = { root, Entry, Family, Cluster }` and refuses anything else, so a
**TextNode cannot be saved by `Sv` at all** — the scenario I described is
impossible and was never a risk.

What remains is narrower and still worth a guard: standing on a **Cluster,
Entry, Family or root** node with a collage in the top card, `Sv` would write
the collage script onto that navigation node. One line, a refusal with a
reason.

### 4.2 The remembered collage — ONE authoritative string, a trail of snapshots

Confirmed by the author:

- As the user navigates, or creates a new card, **the collage card is relegated
  to history like any other** — nothing special happens, which is the point.
- **BD remembers the last collage script** and reinstates it as the TOP CARD
  when Collage is next pressed. The replacement of that node's type then happens
  on the reinstated copy.
- In the degenerate case the replacement is byte-identical — the user wandered
  without touching a stepper — and that is harmless.

So the shape is: **one authoritative "last collage" string held by BD, and the
cards in history are a trail of earlier versions.** Two consequences worth
stating because they are not obvious:

- The remembered string has to be kept current while the collage card is TOP —
  updated by stepper moves and hand edits, exactly as the card is — and frozen
  when it is relegated. The existing `collagePreservingWrite` path is where that
  happens.
- An edit made to a collage card that is already in HISTORY will not be
  remembered. That is consistent (history cards are a record, not the live
  document) but it will surprise someone eventually.

### 4.3 Stacking — order of appearance NOW, a directive LATER

Replacing a slot **replaces it in place**, keeping its position, so re-adding a
module cannot silently bring it to the front and change the composition.

The author's intent is **an `on_top` or `zorder` directive** in place of
order-of-appearance, deferred until the rest works and it can be judged in use.
Noted so that nothing is built which makes it awkward: block order remains the
stacking rule for now, and a directive would simply override it.

**AMENDED 2026-10-11, on testing — the EMITTED order is canonical.** The rule
stands, but v2 no longer lets press order into it. A v1 collage was written by
hand, so its block order was a decision; a v2 collage is assembled by pressing
buttons, and the order of those presses carries no intention at all. Build
text-then-graphic — which is what anyone does, because the passage is what you
start from — and the figure became the later block, drew over the words, and hid
them behind its own background. Reported as *"it's not yet overlaying the text on
the View"*.

So `collageAddOrReplace` emits **picture, sound, words**: words last, therefore
on top, which is the only arrangement legible by default. Nothing about the
stacking rule changes, and picture-over-text stays expressible — `bd_Collage_002`
still demonstrates it, because the canonical order is applied only on the v2
press path. What a v2 collage cannot yet do is ASK for it, and that is what the
`on_top` directive above is for. The honest trade until then: a default that
works, and no override.

### 4.4 The button says what it will do — ACCEPTED

Three states, because pressing it does one of three things: start a collage, add
this type, or replace this type. Plus a compact readout of which slots are
filled — `T G ·` for text and graphic present, music absent — so the user knows
what the collage contains without pressing anything. The author: *"you can put
that in and I can see if it feels necessary."*

**WITHDRAWN 2026-10-11, on testing.** The label is `Collage` and nothing else.
The author, having used it: *"the buttons labelled replace can just say
collage — the type may not be accurate and the type the user knows."* Both
halves of that are right, and the second is the stronger: the type is
**derived**, so a three-state label asserts something the code has worked out
and can get wrong, about a thing the user already knows — they chose the node.
A label that can be wrong about the obvious buys nothing and spends trust that
the readout needs.

The `T G M` readout earned its place by reporting a **fact** (which slots are
filled) rather than a prediction about what the next press will do, and it
follows the collage wherever the card lies, so relegating it does not blank the
display.

**But it has left the BAR, 2026-10-11, on the author's instruction:** *"Please
remove the TGM type label in the buttons bar. We will be struggling for space on
iOS when the pairing buttons (remote and coincident) are appearing."* Three
characters of status are the cheapest thing in that row to give up. The state is
not lost — it moved to the Collage button's own `title`, which costs no width at
all, and it is on every `[collage] btn:` line in the log.

Two more width savings in the same row, same request: `#jb-right`'s gap goes 8px
→ 4px, and the buttons' horizontal padding 10px → 7px, which is about 10% off
each button at these label lengths. Taken from the PADDING, not the font, so the
44px thumb target and the 10px type are untouched. The group was already
right-aligned by `margin-left: auto`, which takes every spare pixel in the flex
row; the tighter gap is what pushes it as far right as the row allows.

### 4.4a The collage must come BACK to the top card — ADDED 2026-10-11

A press reinstates the collage **as the top card in Current**, not wherever the
card happens to be. This was built as "write to a new top card unless the
collage is already there", and the test showed the condition was wrong:
`topLocalCard()` answers *the newest local card in the model*, while the user's
"top card" is a **place** — the first card in `#current-stack`. The two agree
until a wander relegates a card to History, after which the collage went on
being updated perfectly correctly several screens down, where the syncing it
exists to show could not be watched. The author: *"at this stage the collage
script should be back as the top card so we can see the syncing going on in the
script."*

`collageTopCard()` therefore reports **both** — the newest collage card wherever
it lies, and whether it is the one on screen. The press takes its base text from
either (so no edit is ever lost) but writes **in place only while the collage is
on screen**; once relegated, the update goes to a fresh top card and the
relegated copy stays as the snapshot it became. That also puts the live card
back under `topLocalCard()`, which is what the module's stepper announcements
write into — so the syncing lands where it can be seen without any change to
the auto-echo path.

### 4.4b The steppers sync with the card ON SCREEN — ADDED 2026-10-11

The same divergence as §4.4a, met on the write path. `getFocusedCardBody()` —
which the drift echo, Copy Down and `publishCard` all use — fell through to
`topLocalCard()`, so after one Collage press the collage was the echo's target
for good. Standing at a Kolam node and working its steppers wrote into the
relegated collage: `bdSameModule` accepted it (a collage legitimately receives
several modules' announcements), the per-slot merge found no block of that module
to put it in, and the no-op write was reported as **"card already equals the
script"** — the same reason as the previous skip, so the change-only log
suppressed it and the steppers appeared to sync with nothing whatever. The
author: *"the steppers should sync with the normal Kolam module."*

The card in **Current** now wins, with `topLocalCard()` kept as a late fallback
for an empty Current. In the ordinary case the two are the same element and
nothing changes. The rule that comes out of it is the one worth carrying: **the
write target is the card the user is looking at** — which is the node's own
reading card before a press and the collage after one, from a single rule rather
than a special case for each. A card in Current that must not receive the script
is still refused by `bdSameModule`, out loud, so the worst case is a logged
refusal and not a wrong write.

### 4.4c View GIVES BACK what it borrowed — ADDED 2026-10-11

There is one module frame, and a collage View points it at the collage's visual
slot. Leaving View put the classes back and nothing else, so the page returned
holding a state View had created: stand on a DroneFrac node, View the collage,
press Back, and the preview is the **Kolam** with **Kolam steppers** while the
card beside it is the plain DroneFrac script. The author: *"sort of a double
error"* — and it is exactly two, with one principle behind both. **View borrows
the page's state, so every exit restores it.**

So on the way out of a collage View:

1. **The frame goes back to the node's own module**, through
   `loadModuleForNode`, which also brings back that node's exploration rather
   than its saved default. Steppers belong to the node's own module in v2
   (§4.7), so this is where a slot is adjusted.
2. **The collage goes back on top**, through a shared `collageReinstate` that
   the button's press and this exit cannot disagree about. The collage is what
   the user was just working on, and with it on top the echo feeds it from the
   steppers restored in (1) — which is the whole reason for putting it back.

Neither half decides what the state ought to be: it asks the node and the card,
the two things that already know.

### 4.4d View shows what is ON SCREEN — CORRECTED 2026-10-11

The round above left View reading the collage from the card *wherever that card
lay*, on the reading of the author's *"a press of the view button could still
display it"*. That was wrong, and the author found it within the hour: **wander
to a new graphic node, press View before pressing Collage, and the old collage
appears instead of the node you are standing on.** The same place-versus-model
confusion as §4.4a and §4.4b, met a third time, on the third function that asked
`topLocalCard()` while meaning "the card on screen".

View now consults the card **only while the collage is the card on screen**, via
the same `collageCurrentText()` the button uses. The author's requirement is
still met, and more plainly: the press that displays a wandered-away collage is
**Collage**, which reinstates it as the top card; then View shows it. One rule
covers every case — **View shows what is on screen** — and it is the rule the
code's own comment had already argued for: *a View showing something other than
the current node is a surprise with nothing on screen to explain it.*

When a collage exists but is relegated, View says so in the log rather than
silently preferring the node, because "View is showing the node" and "View could
not find the collage" look identical on screen.

**The lesson, now that it has cost three rounds: every `topLocalCard()` in this
file is a claim about the MODEL, and almost every caller means the SCREEN.**
Three sites have now been corrected — the Collage press, `getFocusedCardBody()`
and `bdViewEnter`.

So the remaining callers were read rather than left to be found later. Six, of
which three are sound and three are worth watching:

- `prependSystemCard` and `prependPartnerCard` use it only to NUMBER a card
  ("Helper (3.1)"), where "the newest local card" is the meaning wanted. Sound.
- The SR fallback at ~12894 already tests `currentStackEl.contains(top.el)`
  before using it, and creates a card when it fails — someone got this right
  before the rule was named.
- `setChatText` writes arriving chat content into the top local card, and
  APPENDS when that card has text. With a collage relegated, that would append
  into the collage and silently corrupt it. **Unverified and untouched** — it
  needs its callers read first.
- `updateSendBtn` and `sendTopLocalCard` decide what Send enables and sends. A
  relegated collage would be sent in place of the card on screen. Pairing-path
  only, so left alone deliberately rather than changed while untestable.

None of these were touched in this round. They are recorded so the next person
to meet one knows it was seen and left, not missed.

### 4.4e The collage dims the picture for you — ADDED 2026-10-11

A figure at full opacity swamps the words over it, so every collage began with
the same chore: find the opacity stepper and wind it down. The author: *"The
user can do this manually but it's slightly annoying — it would be better if it
happened automatically when the user presses Collage, set it to 0.4."*

So a Collage press on a GRAPHIC writes the opacity directive into the block —
`COLLAGE_GRAPHIC_OPACITY`, **0.45** (the author's figure, revised from 0.4 on
seeing it), one constant, both visual modules taking the directive on 0..1 step
0.01 so no per-module table is needed.

**It did not work on the first attempt, and the way it failed is the lesson:
THE NAME IN THE SCRIPT IS NOT THE BARE NAME.** Every stepper-backed directive
carries the `p_` prefix — the real node says `%%bd_p_opacity 0.76` — so matching
`^%%bd_opacity` found nothing, INSERTED a second line, and left both in the
script; the module's parser reads both spellings into one key and took the LAST,
keeping 0.76. The symptom was the worst available: a log line saying the opacity
had been set, beside a figure that had not changed. (It was visible in the log
all the same — the module's own `script in:` dump listed `opacity=0.76` with the
key in the position our inserted line had created, which is what gave it away.)
`BD_BLOCK_OPEN_RE`, two lines above in the same file, already allowed for the
prefix. The match now accepts either spelling, the replacement KEEPS the one the
script was using, and an insertion takes its prefix from the block itself —
measured, because which directives have steppers is the module's business.

**And it is pushed to the MODULE, not only written to the card.** That is not a
nicety: the echo merges the module's announced values into the matching slot
about once a second, so a card-only change is undone before it can be read —
the module would go on saying `opacity 1` and win every time. Pushing the script
down sets the control, which is precisely what the author was doing by hand.
When the frame is not on this node the push is refused **out loud**, because the
card would then be right and the picture wrong, with the echo quietly undoing
the card.

0.4 is a starting point, not a verdict: the stepper still works and what it says
syncs back like any other value. A later press re-applies 0.4, since a press
means "take this module into the collage" and that is what a collage does to a
picture.

**SETTLED 2026-10-11 — apply it unconditionally.** I had offered the narrower
rule (dim only while the opacity is still 1, so a deliberate setting survives a
second press) and the author declined it, with the frequencies the right way
round: *"that is more unusual than wanting to change opacity virtually every
time from some high value … the user can always readjust back up if that is what
they have done."* The common case is the one worth automating, the rare case has
a one-stepper remedy, and the unconditional rule needs no explaining — which the
conditional one would have, every time it declined to act.

`collageSetDirective` does the edit by line-walking rather than a global regex,
so a `%%bd_score [ … %%bd_]` body containing something that looks like a
directive is not reached into. Verified on six cases including the REAL node
text: one opacity line out of it, prefix kept, `p_` inserted when the block uses
`p_` and bare when it does not, score block untouched, and idempotent.

### 4.4f Editing the TEXT slot in the card — FIXED 2026-10-13

Editing the words inside `%%bd_text [ … %%bd_]` worked, except that *"it
interprets a space as a newline, or some sort of end entry signal"*. The text
was never corrupted: **the caret was being taken away from it.**

`autoWrite` carried an exception — *"fromDrift:false means a person moved a
control, so they are demonstrably not typing in the card; take the caret out and
write"*. True when written, and falsified by `auto` itself: with the box ticked a
**hand edit causes a non-drift announcement**, because `publishCard` pushes the
card down and the module normalises it and announces back. So typing in the card
triggered the one path that assumes you are not typing in the card. A second
after you stopped — which is right after a space, where a typist pauses — the
echo blurred the card and replaced its value, and further typing landed at the
end of the script below `%%bd_]`.

The log named it without naming it: `[auto] writing 552 chars … len=552` — an
equal-length rewrite (the drift had moved `angle_minutes` by the same number of
digits), alternating with `skip: caret is in the target card` for the drift
writes that were correctly held back.

**Withdrawing the exception costs nothing, and that is provable rather than
hoped:** working a stepper necessarily moves focus to the stepper's button, so a
card that still holds focus cannot be a card whose owner has just reached for a
control. The case the exception was added for — *"editing a script then working
the steppers echoed nothing, for ever"* — is therefore unreachable, and is in any
event now covered by the focusout catch-up, which did not exist when it was
written.

It restores the rule the file states for itself: **recording is data and must
never stop; redrawing is presentation and must not happen under a live cursor.**

### 4.5 Browsing deactivates the collage — ACCEPTED as a consequence

Confirmed, and no attempt will be made to work around it. **See §5 for the one
part of this that is still open**: whether View follows the top card or prefers
the remembered collage.

### 4.6 Every type is admitted, including gateways and clusters — ACCEPTED

Anything without a module is TEXT, gateway and cluster blurbs included. A
gateway's text about a work might be exactly the right title for a collage.

**And the author's wider note: "later we may have further types that have their
own placement rules."** So the three types are not a closed set, and the type →
placement mapping should stay a lookup rather than a chain of conditionals.

### 4.7 THE COLLAGE PREVIEW IS NO LONGER NEEDED

The author's words. v2 shows one module at a time with its own steppers, and the
composite is seen in **View** — which is where v1's placement work is
repurposed. That removes the overlay, the clip-path, `bd_collage_layout`, the
`columnMaxHeight` lane sharing and all the transparency coordination from the v2
path.

**What it does NOT settle is whether that code is deleted** — see §5.

---

## 5. Still open

### 5.1 Does View follow the TOP CARD, or prefer the remembered collage?

The author, on browsing deactivating the collage: *"a press of the view button
could still display it …"* — left open.

The two readings differ in a way the user would feel:

- **View follows the top card.** On a text node after wandering, View shows that
  node. To see the collage you press Collage first (one tap), which reinstates
  it, then View. Predictable: View always shows what is in front of you.
- **View prefers the remembered collage.** One tap fewer, but View would
  sometimes show something other than the current context, with nothing on
  screen explaining why.

**ACCEPTED 2026-10-11: View follows the top card.** A View that shows something
other than the current node is the kind of surprise that is hard to attribute,
and the cost is a single tap on a button that is right beside it.

### 5.2 Is v1's preview code KEPT or DELETED?

`bd_Collage_002` stays as a demonstration — but the demonstration IS the
overlay preview. Deleting the preview path would leave 002 working in View only.

**ACCEPTED 2026-10-11: keep it until v2 is proven, then delete in one commit.**
Keeping it costs two code paths and no risk; deleting it now costs the
demonstration. The `collage-preview-working-2026-10-10` tag makes the removal
recoverable either way.

### 5.3 Smaller things, for when building starts

- Does the Collage button appear on every node, or only where it would do
  something? (Everything has a type, so it would always do something.)
- Is there a way to REMOVE a slot from the collage, or only replace it?
- `%%bd_collage 1` or a new version number for v2's conventions?

### 5.4 Centre the block being worked on — BUILT 2026-10-11

*"I'm wondering if a nice touch would be to autoscroll the collage to centre
whatever module is currently being worked on — not forgetting when returning
from View."*

**The TEXTAREA scrolls, not the panes** (the author: *"there would be no point
in scrolling the panes"*), which is also what the layout already wants: a local
card body is a fixed-height textarea (`min-height: 8.5em`, `resize: none`) with
its own overflow, so it is the scroll container and `#current-stack` is left
alone.

**TWO AND A HALF LINES DOWN, NOT CENTRED** (the author, on seeing it): *"Please
centre the text so that the top line of the relevant module is approximately two
or three lines below the top — this will enable the user to see where in the
whole script the module script fits."* Better on both counts. Centring a short
block put it in the middle of the window with nothing useful either side, and a
block taller than the window could not be centred at all and needed its own
case — which the lead removes, since a header two and a half lines down is
visible whatever the block's height. What the lead buys is CONTEXT: the tail of
the block above, so the position in the whole script is legible instead of
having to be remembered.

**Two triggers, both a CHANGE of which module is being worked on**: the Collage
press (scrolls to the block just written) and the return from View (centres the
node's own module, the one the frame has just been handed back to — `'text'` for
a text node). Explicitly **not** the drift echo, which writes several times a
minute and would pull the text out from under someone reading it. Nor under a
live caret: `collageCentreBlock` declines when the card has focus, the same
refusal `autoWrite` makes for the same reason.

**Measured, not computed.** Multiplying a line count by a line height is wrong
the moment a line wraps, and a collage's text block wraps constantly. A hidden
mirror div with the same content width, font metrics and wrapping gives the real
offset. Two details that are not obvious:

- **Not `setSelectionRange`/`focus`**, the obvious way to scroll a textarea to a
  position: it steals the caret and raises the iOS keyboard. Nothing in the
  measurement touches focus.
- A trailing newline's empty line box is **not rendered identically across
  engines**, so "measure everything above the line" is undependable. Measuring
  everything above *plus one real line* (a zero-width space) and subtracting a
  line whose height is also measured is exact — and `line-height` is not parsed,
  because it can be the keyword `normal`.

Verified in headless Chrome against a real textarea, three-block collage, 360px
wide: block tops came out 51 / 179 / 282 px against the arithmetic 51.2 / 179.2 /
281.6. With a 64px lead (2.5 × 25.6px) the scrollTops are 0 / 123 / 226, putting
each header exactly 2.5 lines below the top except the first, which clamps at
scrollTop 0 and lands at 2.3 lines — which is the clamp working, not a fault.

---

## 6. How v2 works — the specification

### 6.1 The model

A collage is a **script**, and it lives in a **card** — not in a node. It opens
`%%bd_collage 1` and holds one `%%bd_module` block per slot, **at most one of
each type**.

BD holds **one authoritative current-collage string**. The top card is its live
view; cards relegated to history are a trail of earlier versions.

### 6.2 The three types, derived and never declared

| the node's script | type |
|---|---|
| no `%%bd_module` line | **TEXT** |
| `%%bd_module X` where `MODULES[X].kind === 'visual'` | **GRAPHIC** |
| `%%bd_module X` where `MODULES[X].kind === 'music'` | **MUSIC** |

Nothing is stored and nothing can drift out of step. A collage script itself has
no type: it is a collage, not a slot. The mapping stays a **lookup**, because
further types with their own placement rules are expected.

### 6.3 The Collage button

Sits beside View. It is an **action, not a mode**: nothing navigates, and the
module stays on screen with its own steppers.

It shows what pressing it will do, and what the collage already holds:

| state | label | readout |
|---|---|---|
| no current collage | **Collage** | `. . .` |
| collage exists, this type absent | **+ Text** / **+ Graphic** / **+ Music** | e.g. `. G .` |
| collage exists, this type present | **Replace Text** / ... | e.g. `T G .` |

The readout names the slots that are filled — `T G .` is text and graphic
present, music absent.

### 6.4 What one press does

1. **Reinstate.** If the current collage is not the top card, put it there as a
   new top card from the remembered string. If there is no current collage,
   start one: `%%bd_collage 1`.
2. **Convert this node to a slot block.**
   - **TEXT** -> `%%bd_module text`, then the node's prose inside
     `%%bd_text [ ... %%bd_]`.
   - **GRAPHIC / MUSIC** -> the module's **live** script, headed by its own
     `%%bd_module <id>`. Live, not saved: the steppers you have just set are
     what goes in.
3. **Add or replace.** If a block of that type exists, **replace it in place**,
   keeping its position. Otherwise append.
4. **Commit.** The top card and the remembered string both become the new
   collage.
5. **Stay put.** No navigation, no mode change, no reload of the module.

Pressing it twice without touching anything replaces a block with an identical
one. That is harmless and needs no special case.

### 6.5 What stays in sync with what

All of this is already built and in use by v1:

| when | what happens |
|---|---|
| a stepper moves | the module announces; `collagePreservingWrite` merges it into **its own slot** of the card; the remembered string follows |
| the card is hand-edited | `publishCard` splits the collage and sends **each slot to its own module** |
| Copy Down is pressed | the same split |
| the collage card is relegated | the remembered string freezes at its last top-card state |

**Only the module you are standing on is loaded**, so only its slot can move.
That is what makes one-module-at-a-time simpler rather than poorer.

### 6.6 View

View **follows the top card**. If that card is a collage it renders the whole
thing; otherwise it behaves exactly as it does today.

| slot | placement |
|---|---|
| GRAPHIC | fills the square |
| TEXT | overlays it, in the same square |
| MUSIC | a 110px transport strip at the foot, the square shrinking to suit |

Placement comes from the type, not from a directive. **Stacking is block
order — a later block sits on top** — until an `on_top` / `zorder` directive
replaces it.

### 6.7 A walk-through

1. On a Tao Te Ching passage. Button reads **Collage**, `. . .`. Press.
   -> a collage with one TEXT slot; the card shows it.
2. Navigate to `bd_V_Kolam3D_001`. The collage drops into history. Button reads
   **+ Graphic**, `T . .`. Adjust the steppers until the figure is right. Press.
   -> the collage is reinstated as the top card with a GRAPHIC slot carrying the
   live stepper values.
3. Press **View** -> the figure with the words over it.
4. Navigate to `bd_M_DroneFrac_001`. Button reads **+ Music**, `T G .`. Press.
   -> MUSIC added. View now also has the transport at the foot.
5. Go back to the kolam, change `lightness`, press **Replace Graphic**.
   -> that slot alone is rewritten, in place, so the stacking does not change.
6. Press **New** -> the collage goes to history and the next Collage press
   starts a fresh one.

### 6.8 Invariants

The rules that must hold. **Each one is a thing that has already gone wrong
once in v1**, which is why they are worth stating rather than discovering
again:

1. **At most one slot per type.**
2. **Replacement is IN PLACE.** Block order is the stacking order, so moving a
   block to the end would silently change the composition.
3. **The remembered string is updated only while the collage is the top card.**
   History cards are a record, not the live document.
4. **Every merge into a collage is PER SLOT**, never by bare name across the
   whole text — two modules can use the same directive name, and
   `%%bd_p_angle` against `%%bd_angle` is a live example in `bd_Collage_002`.
5. **Only one module is live at a time** in the preview.
6. **`Sv` refuses while the top card is a collage**, with a reason.
7. **The Collage button never navigates** and never reloads a module.

### 6.9 What has to be written, and what is reused

| new | reused |
|---|---|
| the Collage button, its three states and its readout | `parseCollage`, `collageSlot` |
| `collageTypeOf(script)` — the 6.2 lookup | `collageMergeBySlot` |
| `collageBlockFor(node)` — node to slot block | `collagePreservingWrite` |
| add-or-replace-in-place | exploration accumulation |
| the remembered string, and reinstatement | `publishCard` / Copy Down per-slot split |
| the `Sv` guard | View's three-layer render |
| View following the top card rather than the node | `getModuleKind` |

### 6.10 Deliberately NOT in v2

- **No composite preview.** One module at a time; the composite is View's job.
- **Therefore no overlay, no clip-path, no `bd_collage_layout`, no lane
  sharing, no transparency coordination.** All of that is v1's, and stays with
  `bd_Collage_002`.
- **No persistence.** 4.1 — build it, see what it holds, then decide.
- **No slot removal yet.** 5.3.

---

## 7. Build order

Each step is independently testable and independently revertable, with the
canary rotating per step so there is never a question of whether what is on
screen is the current code. Tag before step 1: **`collage-v2-start`**.

### 7.1 Two findings from reading the code first

**The live script needs no async pull.** I expected a
`bd_script_request` / `bd_script_response` round trip, which would have made a
Collage press asynchronous for module nodes. It does not:
**`explorationByNode.get(nodeId)` IS the node's live script**, recorded from the
module's own announcements, falling back to `node.data('text')` when nothing has
been explored. Entirely synchronous, and it removes the only async risk from
step 5.

**v1's per-slot push targets FIXED FRAMES** — visual to `#visual-iframe`, music
to `#collage-playbar`. v2 has no overlay and therefore **one live module,
whichever the current node uses, always in `#visual-iframe`.** So the push must
select the slot matching `currentModuleId`, not the slot matching a frame. Missed,
it would post a music script into a kolam, which is the `%%bd_angle` collision
again by another route. Step 8.

### 7.2 The steps

| # | step | test |
|---|---|---|
| 1 | **`Sv` guard** | on a Cluster with a collage in the top card, `Sv` refuses with a reason |
| 2 | **View follows the top card** | tap `bd_Collage_002`, press View — unchanged, but arrived at via the card. A regression test that unblocks 4 onwards |
| 3 | **`collageTypeOf` + the button, INERT** | walk the graph; the label tracks the type of the node you are on |
| 4 | **Start a collage — TEXT** | press Collage on a Tao passage; the top card becomes a one-slot collage; View shows the words |
| 5 | **Add GRAPHIC** — reinstatement, live script, remembered string | set the kolam's steppers, press Collage; View shows figure AND words with the values set. **The riskiest step; stop here to test** |
| 6 | **Replace in place** | change `lightness`, press again; only that block changes and its position holds |
| 7 | **Add MUSIC** | DroneFrac; View shows all three layers |
| 8 | **Per-slot push to the LIVE module** (7.1) | hand-edit the card on a kolam node, press Down; the kolam follows and nothing reaches the wrong module |
| 9 | **The `T G .` readout** | cosmetic, last, so it can be judged against something working |

**Step 2 must come early**: until View reads the card there is no way to SEE the
result of steps 4 onwards. **Step 9 is deliberately last** — the author will
judge whether the readout is wanted at all, which is easier against a working
collage.

---

## 8. A PASTED SCRIPT IS AN INSTRUCTION TO MAKE A COLLAGE (2026-10-11)

### 8.1 The question, and why it was hard

*"What happens when a user pastes a module that is incompatible with the current
node?"* — the author, putting in one sentence what two rounds of discussion had
been circling.

It is hard because BD has **one** module frame and the node decides what is in
it. Making a pasted script load its module gives the CARD a second authority
over the screen, which is navigation without a navigation; leaving the paste
inert makes it dead text, since View's non-collage branch reads the NODE and
requires the frame to be loaded already. Both answers were unsatisfactory, and
the state before this round was worse than either: `pastedIntoTopCard` already
raised the module layout from a paste, so the layout changed and the frame went
on showing whatever the last node had left in it.

### 8.2 The resolution, and why it dissolves the question

The author's: **regard the paste as an instruction to create a collage.**

A collage is the one document in BD that is *allowed* to name a module the
current node does not have. So "is this paste compatible with the node?" stops
being a question rather than getting an answer. The frame stays the node's, the
pasted module becomes a slot, the card becomes the collage, and View is where it
is shown. Nothing autonavigates.

It also inherits everything already built: relegation on a wander and
reinstatement by the Collage button (§4.4a), the per-slot merge so each module
only ever updates its own block, `bdSameModule`'s collage-awareness so a card
legitimately receives several modules' announcements, the hand-back on View exit
(§4.4c), the 0.45 dimming (§4.4e) and the scroll-to-block (§5.4).

**The pasted slot is inert until the user wanders to a node with that module and
presses Collage.** That is not a gap — it is §4.4a's behaviour arriving for
free, and it is what the author meant by *"it will then pick up the editing of
collage after wandering behaviour"*. The slot is RECORDED at once and becomes
ADJUSTABLE when a module for it is in front of you.

**Do not special-case a paste that happens to match the current node.** Loading
it directly would be lighter and it reintroduces the compatibility test the
collage idea removes. Uniform is the entire benefit.

### 8.3 What it does

On a **paste** into a card body — the `paste` event, not `input`, so that typing
a script by hand is never rewritten under the keyboard mid-word:

1. If the pasted text is already a **collage**, it is adopted: remembered,
   button refreshed, scrolled. Nothing is rewritten.
2. Otherwise the **first properly parsed module block** is taken and everything
   outside it is ignored — the author's rule. "Properly parsed" is concrete: the
   `%%bd_module` id must resolve through `getModuleUrl`, so a header naming
   nothing is skipped rather than trusted.
3. **Prose is folded in as the text slot — the CARD's own words first, the
   node's second.** The author: *"I think it should fold it in — after all it can
   always be replaced."* Which is the argument: a slot is one press from being
   replaced, so presuming is cheap and leaving it empty costs a press every
   time.

   **Corrected 2026-10-13:** the first cut always took the node's prose. The
   author made a new card, typed *"This is my own text"*, pasted a Kolam script
   under it, and got the Tao passage in the text slot. Words typed into this
   card a moment ago are a deliberate act; the node's prose is only a sensible
   DEFAULT for a card that has none of its own. `nodeProse` is the reader for
   both — it strips `%%bd_` lines and bracket-block bodies, so what it returns
   from the card is exactly the prose `extractFirstModuleScript` ignored, which
   is a pleasing division of one text between two readers with no third rule to
   keep in step. The log says which source was used.

   Skipped when neither has prose.
4. **The graphic is dimmed to 0.45**, as on a button press (§4.4e) — and it
   matters MORE here, not less: the pasted module is not on screen, so there is
   no stepper to reach for, and an undimmed paste would give an unreadable View
   whose only remedy is editing the script by hand. Nothing is pushed to a
   module, because no module of that slot is loaded; there is therefore also
   nothing announcing over it. (A judgement call, taken rather than asked,
   because the alternative was to ship a known-unreadable result.)
5. The result is assembled through `collageAddOrReplace`, so it comes out in the
   canonical picture-sound-words order with the words on top (§4.3).

Verified against the parser, seven cases: prose either side of a script is
excluded; two headers give the FIRST; an unresolvable id is skipped and the
search continues; `%%bd_module text` is not a module; no module gives null; the
`%%bd_score [ … %%bd_]` block survives intact; and the assembled collage comes
out `visual,text` with the words on top.

**CORRECTED 2026-10-13, on the first real test.** The author pasted a Kolam
script into a text node and nothing happened — no conversion, and **no log line
either**, which is what made it diagnosable: the block had run at boot
(`v2 button found`) and the canary said both files were current, so the handler
was attached and had declined in silence. Two faults, both from assuming the
paste would land in a local card:

- **The guard tested the event target itself** (`classList.contains('card-body')`),
  which is right for a `<textarea>` and wrong for a contenteditable card, where
  the target is the inner `.chunk-text` div. Now `el.closest('.card-body')`, the
  same idiom `getFocusedCardBody` already uses for `.card`.
- **A paste into a BUILT card cannot be read back.** The log proved it
  independently: `[auto] focusout: not writing a bd_V_Kolam3D script into a
  bd_V_Kolam3D%%bd_p_symmetry card` — a module id with the next line welded onto
  it, because a browser paste into a contenteditable arrives as `<div>`/`<br>`
  markup and `getCardText`'s chunk reader knows nothing of it. This is the Sv
  lesson again: **a BUILT card must be read back, and a paste is not something
  it was built from.**

So the source of the text now depends on the body. A `<textarea>` is read from
the CARD, because a paste there keeps its newlines and may be one block among
others already present. A built card is read from the **clipboard** and never
read back at all — and the paste into it is **refused** (`preventDefault`), with
the collage written to a new local card, so the node's own reading text is left
intact. Which is also where §4.4a says a collage belongs.

And **a paste no longer raises the module layout**: `pastedIntoTopCard` is
suppressed when the card is a collage. A collage has no page preview in v2
(§4.7), so raising the layout showed something that was not the collage. This
also fixes a pre-existing misfire the log had been showing all along — pressing
Collage on a text passage logged `module layout for pasted script`, because BD's
own write into the card looks exactly like a paste to that test.

### 8.5 A module pasted INTO an existing collage is a slot for it

The obvious thing to try, and before 2026-10-13 it did nothing visible: the card
already held `%%bd_collage 1`, so the adopt branch claimed it and the pasted
module was left lying in the text as an unordered extra block. A paste is an
instruction, and the instruction into a collage that already exists is **"put
this module in it"** — which is `collageAddOrReplace`, so a slot of the same kind
is replaced IN PLACE and the result lands in canonical order.

The one subtlety: the merge base is the collage **as it stood when the paste
began**, captured synchronously in the `paste` handler. By the time the timeout
runs the card holds both, with the new block already appended by the browser, and
adding it again from there would leave two of it. Verified: pasting a music
module into a figure+words collage gives `visual, music, text` with the words
intact; pasting a different graphic replaces the visual slot, dims it to 0.45,
and leaves exactly one visual block.

### 8.6 ↑ and ↓ carry CARDS now, not scripts

The author, wanting to experiment with a second module: *"I think they were
supposed to copy a selected card in history up to the current top card (up) or
to create a new history card from the current card (down). I think the down
arrow may as well leave the current card content selected ready for a one key
delete if that is what the user wants."*

They were in fact Copy Down (card → module) and Copy Up (module → card) — but the
author had already observed that pair does nothing while `auto` is ticked, which
it is by default. So:

- **↓** keeps a copy of the top card in History (`toHistory`, so Current is not
  displaced) and leaves the top card's content **selected**, ready for one
  keystroke to clear it. Selected and not cleared: the decision stays the
  user's, and nothing is destroyed on their behalf. A textarea has `select()`; a
  built card is a div and needs a `Range`.
- **↑** copies the **picked** History card up — into the top card if it is
  empty, otherwise into a NEW top card, which relegates the current one rather
  than overwriting it. Bringing something up must not destroy what is there.

**The pick needs no new gesture**: you tap into the card you want in order to
read it, and that tap is the pick, recorded on `pointerdown` so it lands before
the arrow's own press moves focus. Marked with a brighter rim and full
brightness — luminance, not hue — using `outline` rather than `border`, so the
pane does not shift as the pick moves. ↑ is **never disabled** and says what it
decided, after the Collage button taught that lesson.

**What is given up, stated rather than discovered later:** the manual
card↔module route. `auto` covers both directions, so the only real loss is the
OVERRIDE for the two cases `publishCard` declines on purpose — a card with no
directives, and a directive whose value has been deleted mid-keystroke. With
`auto` unticked there is now no manual way across at all. A long-press is the
obvious home for it if it is ever wanted back.

**They were also almost always INVISIBLE, 2026-10-13.** Reported as *"no up down
buttons most of the time — occasionally appear after a back to browse then create
wander"*, which describes one CSS rule exactly:
`body:not(.player-active) #copy-down-btn { display: none }`. Right while the pair
meant card → module (with no module there was nothing to copy to), and wrong the
moment they carried cards — so they showed only when a wander happened to land on
a module node. The gate is now `body:not(.edit-active)`: **Create, where cards
are composed, and not Browse, which is reading and gains nothing from buttons
that rearrange the stack.**

Two things that had to move with it. The mobile rule stays keyed on
`player-active`, and must: it lifts the arrows out of the bar and stamps them
beside the STEPPER COLUMN, which exists only when a module does — without one
they belong in the bar's flow. And `positionExtendPanel`'s reset of their inline
geometry sat AFTER its `display: none` early return, which is the no-module case,
so a `position: fixed` plus coordinates stamped for the mobile player layout
survived into the next one. Invisible while the arrows were hidden without a
module; it would have floated them over the cards now. The reset runs before
every early return.

**`bd_script_request`/`bd_script_response` is untouched and still live** —
checked rather than assumed, since it would have been easy to call it dead along
with the button. The Copy-Link update gate and the first-push state query both
still send the request, so §42.7's response handler still writes into the focused
card. All that changed is that no BUTTON reaches it.

**One consequence of ↓ that had to be fixed with it:** `createCard` pushes the
snapshot onto `cards`, so the copy in History becomes the newest local card in
the MODEL. `collageTopCard()` therefore now asks **the card on screen first** —
otherwise it would answer with the snapshot while the live collage sat in
Current, and an edit made after the snapshot would be read back stale. The same
model-versus-screen distinction as §4.4a/b/d, met a fourth time, and this time
anticipated rather than reported.

### 8.4 The author's observation: this is becoming a PROTOCOL

*"I think we are circling round a protocol that might be useful for the
collaborative editing."*

Worth recording, because it is true and it was not the aim. What has accumulated
is not a file format — it is a set of rules for **one document assembled from
typed blocks with different owners**:

- **A block declares what it is and whose it is** (`%%bd_module <id>`,
  `%%bd_module text`). Nothing depends on where the text came from, which is why
  a paste can be an instruction at all.
- **Merge is PER OWNER, never across the document.** `collageMergeBySlot` keys
  every value by the block that owns it, which is what lets two producers use the
  same bare field name — Kolam3D's `angle` and DroneFrac's `angle` — without
  either corrupting the other. That bug cost a round to find (§the `_p_angle`
  report) and the fix is the protocol's central rule.
- **Updates replace IN PLACE.** A producer's update never changes the document's
  structure or the order of anything else, so concurrent updates cannot reorder
  the document.
- **The emitted order is CANONICAL**, so the document's form does not depend on
  the order edits arrived in (§4.3, amended).
- **One authoritative copy, plus a trail of snapshots** — `collageRemembered`
  and the relegated cards left in History.
- **Receivers first**: a producer that has not been taught a field degrades
  rather than breaking (the `bd_ui_config` discipline).

What is missing before it could carry two PEOPLE rather than two modules is
small and nameable: **identity per block** (today the owner is a module id, and
a person is not a module), **a clock or version per block** so two edits to the
same slot can be ordered, and **a rule for concurrent edits to the same slot** —
today the last announcement wins, which is correct for a module reporting its own
state and wrong for two people typing. BD already has the transport (the pair
relay) and the consent model, so what would be new is the ordering, not the
plumbing.

Not scheduled. Recorded because the next person to want collaborative editing
should start from here rather than from a blank page — and because the three
rules above were each paid for with a bug.
