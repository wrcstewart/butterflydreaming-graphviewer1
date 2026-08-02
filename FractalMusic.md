# FractalMusic — planning notes for `bd_M_Hilbert` module

*Captured 2026-08-02 during exploratory discussion. No code changes made.
Notes to think through before committing to a direction.*

## Proposed placement in the graph

Mirrors the visual side (`V_Graphic → bd_V_Kolam → bd_V_Kolam_1 …`):

- **SubFamily**: `M_Music`
- **Cluster**: `bd_M_Hilbert`
- **Gateway TextNode**: `BD_M_HILBERT` (or `bd_M_Hilbert` — see naming decision below)
- **Content TextNodes**: `bd_M_Hilbert_001`, `bd_M_Hilbert_002`, …

Naming convention still needs deciding — user first wrote uppercase gateway; existing `bd_V_Kolam` corpus is lowercase throughout.

## What already exists

**Repo**: `github.com/wrcstewart/butterflydreaming_music_1`
**Live**: `wrcstewart.github.io/butterflydreaming_music_1/`

Extremely close in architecture to V_Kolam. Same shell pattern:

- `index.html` (~280 lines) — send-to-player shell with textarea + iframe container
- `music_module.html` (~410 lines) — the iframe module: Tone.js + abcjs, 4 external bass-recorder samples (F#2, C3, G#3, E4 mp3s)
- postMessage protocol identical: `BD_READY` / `BD_INIT` / `BD_UPDATE` / `BD_STOP` / `BD_ERROR`
- Score wrapped in `%%bd_score [ ... %%bd_]` (mirrors `%%bd_ai_read` bracket convention)

**Existing directives (already implemented in music_1):**

| Directive | Range |
|---|---|
| `%%bd_reverb_wet` | 0–1 |
| `%%bd_reverb_decay` | seconds |
| `%%bd_vibrato_frequency` | Hz (log 0.5–20) |
| `%%bd_vibrato_depth` | 0–1 |
| `%%bd_chorus_wet` | 0–1 |
| `%%bd_chorus_depth` | 0–1 |
| `%%bd_loop` | true/false |
| `%%bd_loop_gap` | seconds |
| `%%bd_score` | ABC block |

Audio chain: Sampler → Chorus → Vibrato → Reverb → Destination. Roughly 80% of what the new module needs is already there.

## The new design problem: two-stage generation

V_Kolam has one stage: **directives → visual**. User tweaks a slider, image redraws directly.

`bd_M_Hilbert` has two: **grammar → ABC → sound**. That intermediate ABC representation is what makes this genuinely new.

Three real UX questions fall out:

### 1. Which is the source of truth — grammar or ABC?

- **Grammar canonical** (recommended): ABC is a computed byproduct, always regenerated. User cannot hand-tweak ABC persistently. Cleanest, deterministic, best for pairing (both users see identical output).
- **Both editable**: needs a "which is stale" indicator + rules for what happens when both diverge. Adds cognitive load; makes pairing messier.
- **ABC canonical**: grammar is just a scratchpad; once ABC is generated, it's the source. Defeats most of the L-system point for later re-generation.

Working recommendation: **grammar is source of truth, ABC is a computed cache**.

### 2. When does grammar → ABC fire?

Options:

- **Explicit "Regenerate" button** in the module UI — fastest iteration during authoring.
- **Auto-regenerate on Copy Down (↓)** — safety net so preview always reflects current grammar.
- **Copy Up (↑) sends what's currently in module** — no auto-regen; user may have paused mid-edit.

Recommendation: **explicit Regenerate button + auto-regen on Copy Down**. Copy Up is passive (sends current state).

Not recommended: real-time regeneration on every keystroke in the grammar block — expensive and noisy for the reader/listener.

### 3. What ends up persisted in the node text?

Three viable answers — this is where user needs to decide:

**A. Grammar only.** Deterministic, no sync bugs, joint users always identical. Cannot hand-edit ABC persistently.

**B. Grammar + generated ABC together.** Both stored, ABC refreshed on regen. Larger nodes; risk of grammar/ABC drift if a curator manually edits only one.

**C. Grammar OR ABC (author picks).** New directive `%%bd_generator lsystem|abc` says which is canonical per-node. Both families coexist. Most flexible; more UX surface.

Working preference: **A** for a first pass; extend to C if authors ask for it.

## Proposed new directives (grammar side)

Sketch — subject to change:

- `%%bd_generator lsystem` — identifies the generator (absence → treat `%%bd_score` as canonical, existing behaviour)
- `%%bd_lsystem_axiom <string>` — starting symbol(s)
- `%%bd_lsystem_rule <symbol>: <expansion>` — one rule per line, repeatable
- `%%bd_lsystem_iterations <n>` — how many times to apply rules
- `%%bd_lsystem_alphabet [<mapping>]` — bracket block: symbol → ABC-fragment mapping (turtle-graphics style, e.g. `F` = note, `+` = up semitone, `-` = down, `[` `]` = save/restore state)

Alternative: bundle grammar into a single multi-line `%%bd_grammar [ … %%bd_]` block for authoring convenience (all L-system stuff visually contiguous in the panel).

## Repo layout options

**A. New repo `bd_M_Hilbert` (recommended)** — matches `bd_V_Kolam` pattern exactly. Standalone at `wrcstewart.github.io/bd_M_Hilbert/preview.html`. Two-copy dev-sync with BD-embedded copy at `M_Music/music_module.html` in `graphviewer1`. `music_1` stays as the "bass recorder exemplar" ancestor.

**B. Rename `music_1` → `bd_M_Hilbert`** — reuses existing repo + Pages URL. Cleaner history but breaks any existing links to `music_1`; loses the exemplar framing.

**C. Fork `music_1`, keep both** — duplicates code; risk of bug-fix drift between the two.

## Open decisions before starting

1. Naming: lowercase throughout (`bd_M_Hilbert` for both cluster and gateway) or uppercase gateway (`BD_M_HILBERT`)?
2. Persistence: grammar only, grammar+ABC, or author-picks?
3. Repo: new `bd_M_Hilbert`, rename `music_1`, or fork?
4. Deterministic-only L-systems for v1? (I'd say yes — stochastic complicates pairing.)
5. Turtle-graphics-style alphabet mapping, or direct symbol→pitch table?
6. Additional score-side edits: metre/key/tempo directives at grammar level, or leave those hardcoded in the alphabet expansion?

## Related notes

- [Note on Cluster-Textnode edges.md](Note%20on%20Cluster-Textnode%20edges.md) — how CLUSTER_REL weights work when adding this cluster
- [du_fu_plan.md](du_fu_plan.md) + [du_fu_ingest.js](du_fu_ingest.js) — ingestion pattern to follow when creating the first `bd_M_Hilbert_*` content node
- `MUSIC_MODULE_SPEC.md` in the music_1 repo — the module contract for future extensions
