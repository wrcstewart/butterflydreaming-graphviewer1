# FractalMusic — bd_M_Fractal implementation notes

*Originally a planning doc (2026-08-02). Rewritten 2026-08-08 to
document what was actually built. Original open-questions section
has been retired — decisions are captured in the "resolved" section
below.*

## Status

**Built and deployed** as a standalone at
[github.com/wrcstewart/bd_M_Fractal](https://github.com/wrcstewart/bd_M_Fractal).
Live at **`https://wrcstewart.github.io/bd_M_Fractal/preview.html`**.

**Not yet done:**
- Embedded copy at `graphviewer1/M_Fractal/` (mirror of the bd_M_ABC
  dev-sync pattern).
- MODULES registry entry in `viewer.js` (`bd_M_Fractal: { embedded,
  standalone }`).
- DB nodes: SubFamily M_Music already has bd_M_ABC; would add a
  parallel `bd_M_Fractal` Cluster + gateway + first content node via
  an ingest script analogous to `bd_m_abc_ingest.js`.
- Deep-link round-trip verification.
- Cosmetic ABC accidental cleanup (minor scales use `^D` for E♭ etc.
  Audio-correct via enharmonic equivalence, visually unconventional).

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
  └→ expandLSystem (DFS streaming, memory O(iter))
       ↓ symbols (up to MAX_TURTLE_INPUT_CHARS)
     turtleWalk
       ↓ segments with symIdx
     skip mechanism (slice past iter-(N-1) prefix)
       ↓ post-skip segments
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

- **DFS shared prefix**: iter N and iter (N-1) emit the same first
  L(N-1) symbols. Without the skip step, bumping iterations doesn't
  audibly change the piece's start.
- **Self-similar deltas**: even after skip, the local delta shape of
  Peano at high iterations mimics low-iteration structure. Fix:
  seed pitch reflection from raw-y (mod scaleLength) rather than 0
  so different absolute y positions → different scale degrees.
- **Tonic scan**: raw-y seed means iterations start on random scale
  degrees. Not musically satisfying. Scan forward to first horizontal
  at y ≡ 0 (tonic in some octave) so every iteration opens on the
  root.
- **Memory ceiling**: at very high iterations (Peano iter 9+) the
  skip-size alone can exceed JS heap. Effective-iter guard walks the
  requested iter down until skip fits under a 5M-symbol emission cap.
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
