# BD viewer — session notes, 2026-08-16 → 2026-08-17

Summary of work done in this session. All commits pushed to `origin/main`
(tip: `7e011e4`). Companion design doc: [unified_focus_spec.md](unified_focus_spec.md).

## Gateways navigation-aid node
- Iterated the "Gateways" Entry node size to stop the label truncating: final
  **42 px square, font-size 9, text-max-width 40** (`viewer.js` node style).
  Commits `c830981`, `2e8c5ea`, `041777d`, `25d84c7`, `f7a5293`.
- Gave the node a `text` property ("Jump directly to the library of seed texts")
  and a durable `url` (`butterflydreaming.org/n/754235dd-…`) so its Settling-view
  layout could be saved (the Wr button needs the parent url for the hint key).

## Edge signalling (`3abadf1`)
- **Main route** Root → Settling → Conversations (the only two `CONTAINS`
  edges) rendered bright `#e0e0e0` + small triangle arrow.
- **Settling ↔ Gateways** (the `DESCENDS_FROM` hop from Gateways) faded to
  opacity 0.28, arrowless — an optional side-door.
- `buildEdgeData` now denormalises `source_name`/`target_name` onto edges so the
  stylesheet can single out a specific hop.

## Settling-view layout-hint restore fix (`3abadf1`)
- `runLayout`'s `hasRoot` branch used a hardcoded even-spread whenever the root
  node was visible — including the Settling view (which keeps ButterflyDreaming
  on screen), so **Wr saved hints to the DB fine but re-entry discarded them**.
- Now the fixed nav layout only owns the root **splash** (`parentIsRoot`) or an
  un-curated view; curated views honour their hints even with root visible.

## Node renames (DB only)
- SubFamily `M_Music` → **Music**, `V_Graphic` → **Graphics**.
- Cluster `bd_M_Fractal` → **Fractal**, `bd_M_ABC` → **Scores**,
  `bd_V_Kolam` → **Kolam**.
- **Gotcha:** Cluster nodes render `display_name || name` (+ a legacy `label`),
  so renaming needs `name` **and** `display_name` **and** `label` set. Module
  Clusters share a name with their gateway TextNode → target the Cluster by
  `url` and leave the TextNode (the module id) alone.

## Unified Focus Model (`f759953`, `c8349fb`, `2f18515`)
One tap on a non-Root node now reveals its **text card AND its neighbourhood**
together (was: tap through chunks, then tap again to navigate). Re-tapping the
focused node is a no-op → 1 click = 1 breadcrumb. Default ON; escape hatch
**`?uf=0`** restores the legacy behaviour. Full design: `unified_focus_spec.md`.
- **Root boot** (ships for all): B0 Root alone + message 0; tap Root → message 1
  and Settling revealed; tap Settling → its neighbours (Gateways/Conversations/
  Root). Root's two `%%bd_chunk` messages hold the copy; CTA "Tap the Settling
  node to advance".

## Reading-spine signalling (`8750dcc`, `a61d861`, `f3a13b9`)
- Only the **central (just-tapped) node's forward hop** to its successor gets a
  bold **amber** edge + double-size arrow (tap 19 → arrow 19→20 only, not 18→19).
- Successor node: 4 px amber border. Central node: **5 px white** border
  ("you are here"). Implemented via `applySeqSignals(centralNode)` in
  `runLayout` + `.seq-edge`/`.seq-successor` classes; central via `markReadNode`.

## Dense-work title tap target (`de232cb`)
- Tao Te Ching (82 chapter nodes) laid content over the pinned title so an
  overlapping node stole the tap. Section-title nodes now get `z-index: 20`
  (win the hit-test) + `text-events: 'yes'` (whole label tappable).

## Reclaiming graph (#cy) vertical space
- **Title-pin removed** (`74baebd`): titles were pinned at `y = centre −
  100·√nodeCount`, ballooning the fit bounds and shrinking text-node views.
  `titlePins` left empty → fcose places titles beside their content.
- **Reading text −20 %** (`320628d`): system/received card bodies 16 → 12.8 px.
  Editable local textarea kept 16 px (iOS <16 px auto-zoom rule).
- **History pane** 25dvh → 20dvh (`5a06abc`).
- **Nodes-mode single reading pane** (`efd1397`): in Nodes mode the History pane
  + dividing action-bar strip collapse and the Current pane expands to 34dvh
  holding every card (scrollable); reclaimed depth goes to `#cy`. Edit/Player
  restore the split. `reflowCardsForMode()` merges/splits card DOM on toggle
  (logical `cards[]` untouched); `positionCyEl()` anchors `#cy` to
  `#current-panel` in Nodes mode and is re-run on mode toggle.

## Mobile pinch glitch (`b2aec49` → `db4159a`, HUD removed `7e011e4`)
- Symptom: pinch-zoom with a finger on a node popped the node's text near the
  top ("control bar reappeared with the text"), cleared by the next tap.
- **Root cause** (found via a temporary `?dbg=1` on-screen HUD): NOT a mode or
  layout issue — it was the **long-press dwell tooltip**. A finger resting on a
  node during a pinch never fires `tapdrag` for itself, so its 400 ms dwell
  survived and `showTooltip` fired mid-pinch.
- **Fix:** a document-capture live finger-count latch (`multiTouchRecent`);
  when a 2nd finger lands, `cancelDwell()` + `hideTooltip()`. Also drops node
  taps that fire during/within 250 ms of a pinch. Debug HUD since removed.
