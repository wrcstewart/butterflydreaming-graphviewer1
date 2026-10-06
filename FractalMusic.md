# FractalMusic — bd_M_Fractal implementation notes

*Originally a planning doc (2026-08-02). Rewritten 2026-08-08 to
document what was actually built. Original open-questions section
has been retired — decisions are captured in the "resolved" section
below.*

## Status

**Built and deployed** as a standalone at
[github.com/wrcstewart/bd_M_Fractal](https://github.com/wrcstewart/bd_M_Fractal).
Live at **`https://wrcstewart.github.io/bd_M_Fractal/preview.html`**.

**Done since (as of 2026-08-10):**
- Embedded copy at `graphviewer1/M_Fractal/` (mirrors the standalone
  music_module.html + samples, with a thin `index.html` relay).
- `MODULES` registry entry in `viewer.js`:
  `bd_M_Fractal: { embedded: '/bd_M_Fractal/index.html', standalone: 'https://wrcstewart.github.io/bd_M_Fractal/preview.html' }`.
- Server route: `/bd_M_Fractal` → `./M_Fractal` (HTML no-cache).
- DB: SubFamily M_Music → Cluster `bd_M_Fractal` → gateway TextNode
  `bd_M_Fractal` → content TextNode `bd_M_Fractal_001` via
  [bd_m_fractal_ingest.js](bd_m_fractal_ingest.js). URLs backfilled.
- Deep-link round-trip verified (BD → standalone with edited script,
  standalone → BD via node_url match).
- Save-wav / Save-midi work (sandbox now includes `allow-downloads`).
- Layout adapted for iPhone / iPad (breakpoint 500 → 1024; extend
  panel JS-anchored to abc-pane on ≤ 1024, CSS-default on desktop).
- min_pentatonic canonical scale name (alias: `minor_pentatonic`,
  `pentatonic`).
- Bake / Save wav first-tap info dialog surfaces the Safari Private
  Browsing caveat (see [[safari-private-bake]] memory note): Apple's
  Safari-17+ anti-fingerprinting noise on `getChannelData` breaks the
  bake in Private tabs; no code fix, users must use a regular tab or
  Chrome/Firefox. Dialog rendered at BD level via
  `BD_INFO_DIALOG_REQUEST`/`RESULT` postMessage (module iframe can't
  overlay BD chrome or fit iPhone viewport heights).

**Still deferred:**
- Cosmetic ABC accidental cleanup (minor scales use `^D` for E♭ etc.
  Audio-correct via enharmonic equivalence, visually unconventional).
- Standalone `preview.html` doesn't handle `BD_INFO_DIALOG_REQUEST`;
  module falls back to `window.confirm()` (native, ugly but works).

## What it does

L-system grammar in the script → interpret as a 2-D turtle path →
sonify horizontal segments as notes (y-coordinate maps to scale
degree, run length maps to duration) → build 3-note chords by
looking ahead at future notes in the sequence → emit as ABC →
play via Tone.js + bass-recorder sampler.

## Design decisions (resolved from the original planning doc)

The 2026-08-02 planning doc listed six open questions. Resolutions:

1. **Naming**: renamed from `bd_M_Hilbert` → `bd_M_Fractal`. The
   module handles any 90° L-system grammar; Hilbert is one example.
   Default demo is the Peano curve (denser, richer musically).
2. **Persistence**: **grammar canonical**. The script (persisted in
   BD/deep-links) contains only the grammar + params. The derived
   ABC is displayed in a read-only pane inside the module and is a
   computed artefact — never stored. Handoff to the ABC-editing world
   is via the "Copy for ABC Player" button that wraps the derived
   ABC in a `%%bd_module bd_M_ABC` script for pasting into any
   bd_M_ABC node.
3. **Repo strategy**: mirror the bd_V_Kolam pattern — separate
   public standalone repo, CC0. Two-copy dev-sync convention will
   apply when the embedded BD copy is added.
4. **Deterministic-only L-systems**: yes (v1). Stochastic /
   context-sensitive L-systems deferred.
5. **Alphabet mapping**: turtle-graphics style. Only F (draw
   forward), + (turn CCW), - (turn CW), and non-drawing recursive
   placeholders (any single letter with a rule). Angle configurable
   via `%%bd_angle` (default 90°).
6. **Additional score-side edits**: tempo via `%%bd_step_seconds`
   (real seconds per horizontal segment, cleaner than BPM for this
   domain). Meter and key are computed from `%%bd_scale` +
   `%%bd_root`. Effect params (reverb / vibrato / chorus / loop)
   are individual directives, script-editable and stepper-editable.

## Pipeline (canonical)

```
grammar (%%bd_ directives)
  ├→ parseGrammarFromScript
  ├→ sharedOpening (two expansions in lockstep; how much N repeats of N-1)
  └→ expandAndWalk (DFS streaming + turtle FUSED, memory O(iter))
       ↓ segments past the shared opening only — the prefix is WALKED
         (position and heading are needed) but never STORED
     collapseRuns (merge consecutive same-y horizontals)
       ↓ runs
     applyPitchReflection (bounce between ±scaleLength walls)
       ↓ runs with effective-y pitches
     tonic scan (slice to first horizontal at y ≡ 0 mod scaleLen)
       ↓ pitched runs
     chord voicing (base + offset2 note -12 + offset3 note +12)
       ↓ ABC string with chord brackets
     abcjs.parseOnly → extractNotes → Tone.Part → sampler + effects
       ↓ audio
```

## Key subtleties (would trip up a re-implementer)

- **DFS shared prefix — MEASURED, not assumed (2026-10-06)**: iteration
  N can open with the same symbols as iteration N-1, and without the
  skip, bumping iterations doesn't audibly change the piece's start.
  But *how much* is shared was hardwired to `L(N-1)`, and that is true
  only of a grammar whose rule for X **begins with X** — which the Peano
  rules did and which the default rules no longer do. The grammar lives
  in the script, so `sharedOpening()` now advances two expansions in
  lockstep and skips exactly what they share. For the Peano rules it
  returns the old value (verified byte-identical); for the current ones
  it returns about N.
- **Self-similar deltas**: even after skip, the local delta shape of
  Peano at high iterations mimics low-iteration structure. Fix:
  seed pitch reflection from raw-y (mod scaleLength) rather than 0
  so different absolute y positions → different scale degrees.
- **`iterations` IS NOT A VARIETY CONTROL, under any of these grammars**
  (measured 2026-10-06, and the sharp version of the bullet above).
  Distinct figures across the stepper's 5–20 range: **Peano 4, the
  current rules 3.** Iterations 6 and 8 are byte-identical under BOTH,
  because the curve is self-similar and `L(N-1)` lands on a self-similar
  boundary *by construction* — the skip aims at exactly the place where
  the material repeats its own shape. The current rules fail differently
  rather than better: their string opens with a run of N consecutive
  `F`s (the DFS descends the leftmost branch N levels, emitting one `F`
  per level), and after that run the figure depends only on the PARITY of
  N. So odd iterations give one piece and even ones its mirror.
  **What would give genuine variety is an independent `start_at` offset
  into the string** — one honest axis in place of a depth control that
  cannot hear itself. NOT BUILT; see `PLANNING_REGISTER.md`.
- **Tonic scan**: raw-y seed means iterations start on random scale
  degrees. Not musically satisfying. Scan forward to first horizontal
  at y ≡ 0 (tonic in some octave) so every iteration opens on the
  root.
- **The ceiling is now TIME, not memory (2026-10-06)**: `expandAndWalk`
  traverses the shared opening without storing it — the prefix only ever
  contributes the turtle's x, y and heading, three scalars — so memory
  stopped depending on the iteration. `MAX_TOTAL_EMISSION` (5M, memory)
  became `MAX_SYMBOLS_TRAVERSED` (20M, time): the prefix still has to be
  WALKED. The effective-iter guard remains, for the same reason.
  **The old 5M cap was doing real damage**: under the Peano rules it
  clamped every setting above 7, so thirteen of the `iterations`
  stepper's sixteen positions did nothing at all, silently.
- **Chord voice octave spread**: base note unchanged, offset2 voice
  −12 semitones, offset3 voice +12 semitones. Spreads chord ~3
  octaves. If a shift would push a note off the piano ([21, 108]),
  that voice keeps its original octave.

## Where things live

- **Repo root** (this project): planning + integration when it happens.
- **Standalone repo** [`bd_M_Fractal`](https://github.com/wrcstewart/bd_M_Fractal):
  the actual code. `music_module.html` (the generator + player),
  `preview.html` (standalone harness), `bass-recorder/*.mp3` (samples).
- **README** at the standalone repo has the developer-oriented docs:
  directive reference, pipeline diagram, extension recipes for
  AI-assisted forking. Point external devs there, not here.

## Related

- `bd_M_ABC` — sibling module for direct ABC playback
  (`github.com/wrcstewart/bd_M_ABC`). Chord-form ABC produced by
  bd_M_Fractal can be pasted straight into a bd_M_ABC node via the
  Copy for ABC Player button.
- `bd_V_Kolam` — visual L-system counterpart
  (`github.com/wrcstewart/bd_V_Kolam`). Same two-copy pattern.
- `Note on Cluster-Textnode edges.md` in this directory — CLUSTER_REL
  weight scheme that would apply when adding bd_M_Fractal content
  nodes to the graph.
- `du_fu_ingest.js` — template for the ingest script that will create
  the bd_M_Fractal DB nodes when we integrate.
