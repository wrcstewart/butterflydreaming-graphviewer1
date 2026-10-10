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

**BUT ONE SAFETY ITEM CANNOT WAIT, even though saving can.** `Sv` writes the top
card to the active node. With a collage in the top card, pressing `Sv` while
standing on a Tao Te Ching passage would overwrite the poem with a collage
script. This project has been bitten by that shape three times —
`%%bd_center` destroyed by a round-tripped card, and twice since. So `Sv` needs
a guard while the top card is a collage, before the Collage button ships, even
though what a *deliberate* collage save means is undecided. A refusal with a
reason is enough; it need not be a feature.

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

### 4.4 The button says what it will do — ACCEPTED

Three states, because pressing it does one of three things: start a collage, add
this type, or replace this type. Plus a compact readout of which slots are
filled — `T G ·` for text and graphic present, music absent — so the user knows
what the collage contains without pressing anything. The author: *"you can put
that in and I can see if it feels necessary."*

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
