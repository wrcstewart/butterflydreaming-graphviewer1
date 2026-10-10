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

## 4. Open questions

To be filled in from the discussion.
