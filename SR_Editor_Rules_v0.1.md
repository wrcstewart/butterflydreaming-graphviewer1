# SR Editor — Text/Dictation Interaction Rules

**Status:** current as of 2026-08-13. Companion to `BD_SR_Editor_Design_Notes_v0.1.md` (design intent). This document records the *implemented* behaviour after several iterations. Read the design notes first for the read-and-weave framing and constraints D1–D7.

**Prototype location:** `sr_editor.html` at BD repo root. All rules below live in that file.

---

## 1. Signal chain (mic → PCM → Whisper)

1. **`getUserMedia`** with `autoGainControl: true`, echo/noise-cancel on, requested 48 kHz.
2. **DynamicsCompressor** in the Web Audio graph (toggle-able via header checkbox, on by default).
   - `threshold: -12 dBFS`, `ratio: 4:1`, `knee: 6 dB`, `attack: 3 ms`, `release: 100 ms`
   - Tames peaks without touching normal speech. Fixes hot-mic problem inside the app rather than sending users to System Settings.
3. **AudioWorkletNode** captures PCM directly (128-frame Float32Array blocks, posted to main thread). No `MediaRecorder` — that was silently truncating recordings on Safari regardless of container format (webm and mp4 both lost ~35 % of duration).
4. On stop: concatenate all captured blocks, resample to 16 kHz mono via `OfflineAudioContext`, hand to Whisper. Mic is released immediately at this step so the browser's "in use" indicator disappears while transcription runs.
5. **Own-chunking** for audio > 26 s: pre-split into 25 s segments with 3 s overlap; each segment transcribed separately with the same bias prompt; results merged via longest-word-suffix n-gram overlap. Bypasses a transformers.js bug where `chunk_length_s` combined with `prompt_ids` drops tail chunks.

**Level meter** taps the post-compressor node and updates ~60 Hz. Green ≤ -12 dBFS, amber -12 → -3 dBFS, red > -3 dBFS. Post-utterance quality report in the transcript bar: `OK / WEAK / HOT / BAD` verdict with numbers.

---

## 2. Bias prompt (before Whisper decodes)

Whisper's decoder is primed with source-pane vocabulary so it favours the corpus's register.

### Prompt build

- Sources: source pane text + destination pane text (each toggleable via `src` / `dst` checkboxes; slider = 0 disables the whole prompt).
- Short source (≤ 150 words): whole text sent.
- Long source: opening 1–2 lines + distinctive vocabulary (any word not in a ~200-item common-words list) filling the remaining budget.
- Directive blocks (`%%bd_ … %%bd_]`) stripped before use (constraint D4).
- Capped at ~200 Whisper tokens (leaves ~248 in the 448-token decoder window for the transcription itself).

### Tricky-word repetition

For each unique source word, a "trickiness" score is computed:
- +1 if not in the common-words list
- +1 if length ≥ 8 characters
- +1 if hyphenated
- +2 if capitalised mid-sentence (proper-noun signal)

Words with score ≥ 2 are **tricky**. They're repeated in the prompt N times based on the bias slider:
- `boost 1–3` → 1× (baseline)
- `boost 4–6` → 2× (moderate priming)
- `boost 7–10` → 3× (strong — `huntsman huntsman huntsman`)

### Diagnostics

Each recording logs `bias prompt: N tokens · path=short|long · "..."` and `bias tricky ×N: word, word` so the reviewer can see what's being primed.

---

## 3. Alignment (Smith-Waterman over tokens)

Every transcription is compared against the source pane, regardless of active mode. Local alignment finds the passage(s) the user was reading from.

### Scoring
- Surface match (identical after lowercase, punct-stripped): +2
- Phonetic-only match (via lightweight Double-Metaphone key): `+2 × phonWeight` (default 0.5 → +1)
- Mismatch: −1
- Gap open: −2, gap extend: −1 (affine)

### Thresholds (tunable at runtime)
- `minlen` — minimum matched span length (default 3 tokens)
- `score` — minimum accumulated score (default 4)
- `phon` — phonetic-match weight (default 0.6)

### Multi-span
After finding the best span, its utterance-token positions are masked and the aligner re-runs until nothing above threshold survives (up to 10 spans, safety cap).

### Directive protection
`%%bd_ … %%bd_]` regions are stripped from a copy of the source before tokenisation. Directives never contribute to alignment (D4).

### Log
Every found span logs `match len=N score=X.X utt:"..." src:"..."` regardless of alignment mode.

---

## 4. Alignment modes (Option 1–4)

Header `Align` dropdown chooses which transformation runs after alignment. All four modes see the same matches; only what happens next differs.

| Mode | Effect on destination |
|---|---|
| **1 · Keep all** | Utterance inserted verbatim. Substitutions logged but not applied. |
| **2 · Mark matches (preview)** | Utterance inserted verbatim; a read-only preview strip under the destination shows aligned spans tinted amber. |
| **3 · Drop matches (experimental)** | Aligned spans removed from the inserted text. Silently drops user speech that coincides with source — kept only for experimentation. |
| **4 · Substitute {?…}** *(default)* | Non-destructive tentative-suggestion markup — see §5. |

---

## 5. Substitution rules (mode 4, non-destructive)

The core transformation. Every change is **wrapped in `{?…}` markers** so the reviewer sees exactly what happened; nothing is ever destroyed.

### 5.1 Per-op behaviour

| Alignment op | What it means | What we do |
|---|---|---|
| **sub** | Utterance token accepted diagonally but surface differs from source (usually phonetic match — Whisper misheard) | Replace utterance token with source form, wrap `{?source}`. Example: Whisper "sped" → `{?spared}`. |
| **del** | Source has a word Whisper skipped (gap in utterance path) | Insert source form at position after previous matched/subbed utterance token, wrap `{?source}`. Consecutive dels grouped into one wrap `{?word1 word2}`. |
| **ins** | Utterance has a word not in source (gap in source path) — user aside OR Whisper hallucination, can't tell apart | Wrap the utterance word IN PLACE with `{?— original —}` — em-dashes INSIDE the markers. Consecutive ins ops grouped: `{?— word1 word2 —}`. **Nothing deleted.** |
| **outside any match** | User's own commentary, typed or spoken | Left completely alone. |

### 5.2 Em-dash inside `{?— … —}` (ins-wraps only)

The em-dashes are inside the tentative markers, so **after the Accept button strips `{?` and `}`, the dashes remain** as a permanent literary aside marker. Result reads as natural prose with em-dash asides.

- `sub` and `del` do NOT get em-dashes: they represent source content, not user additions
- Only `ins` gets em-dashes: they mark genuine additions/interjections

### 5.3 Grouping

Contiguous ops of the same "gap" type (multiple `ins` in a row, or multiple `del` in a row) are collapsed into ONE `{?…}` wrap. A two-word aside is one review point, not two.

### 5.4 Diagnostics

Each substitution edit logs `sub kind: from → to` in the alignment log:
- `sub sub: sped → spared`
- `sub del: (missing) → a stone`
- `sub ins-wrap: poor thing → {?— poor thing —}`
- `sub sep-before-repl: . → —` (em-dash boundary — see §6)

---

## 6. Em-dash boundaries between commentary and quote

When an aligned span has spoken/typed commentary immediately before or after it, an em-dash separator is inserted at the boundary. The user's commentary is thereby visually distinct from the aligned quotation.

### 6.1 Rules

- **Before match**: at position `uttTokens[aStart].start`, look at the last non-space char BEFORE.
  - If it's soft-sentence punctuation (`. , ; :`): **replace** with ` —` (avoids `. — ` doubling).
  - Otherwise: insert `— ` alongside.
  - If there's nothing before (match is at absolute start of utterance): skipped.
- **After match**: at position `uttTokens[aEnd].end`, look at the first non-space char AFTER.
  - Same replace-vs-insert logic in reverse.
  - Skipped at end of utterance.

### 6.2 Design principle

Whisper's own dialogue punctuation is content — the huntsman's `"Away with you then, poor child."` inverted commas come from the source and are preserved. The em-dashes we add are structural signal: "the aligned quote starts / ends here". Different job.

---

## 7. Destination insertion + Accept

### 7.1 Insertion

- Uses `HTMLTextAreaElement.setRangeText(text, start, end, 'select')` to preserve the browser's native undo stack (constraint D5).
- **Auto-selects the just-inserted text** so a single Delete keystroke retries a bad recognition.
- If a selection is already active (typically our own previous auto-selection), it is collapsed to its END so a subsequent recognition APPENDS rather than replaces. Both are kept, only the newest is selected.
- Trailing space added for natural word separation.

### 7.2 Accept button

- Strips all `{?…}` markers throughout the destination in one action.
- Because em-dashes are INSIDE ins-wraps (`{?— … —}`), those dashes **survive Accept** as permanent aside markers.
- Because em-dashes at commentary/quote boundaries are OUTSIDE `{?}` (as literal chars added by §6), they too survive Accept.
- Uses `setRangeText` for undo preservation — you can Undo the Accept.
- Reports count in the status bar and log.

---

## 8. Round-trip considerations (BD integration, not yet built)

Every marker we add is one more thing that could double up as text circulates between local/remote users. Rules to keep the system stable across round-trips:

1. **`{?…}` markers**: Receiver's Accept button strips them. Simple, single-purpose, safe.
2. **Em-dash boundaries**: If receiver re-aligns and would add another em-dash next to an existing one, deduplicate — insert only if no em-dash present within a small window (say, ±2 chars around the boundary point).
3. **Ins-wrap em-dashes**: Once accepted (out of `{?}`), they're just prose. Re-alignment should not re-mark them.
4. **Source pane on load**: strip any `{?…}` markers on paste/load — they were tentative suggestions from a previous editor, not part of the corpus. Prevents re-marking on the receiver.
5. **Whisper's added punctuation** (dialogue quotes, sentence punctuation): CONTENT, not signal. Never touch these. They belong to the transcribed material.
6. **User's own speech**: **treated as conjectured final literature** — never wrapped, never quoted, never marked as "the user said". User speech is just text.

The last principle is the anchor: quotes/wraps/marks accumulate; content doesn't. The user's speech is content.

---

## 9. Boot & UX flow

Three-state hybrid model (settled 2026-08-13 after several iterations):

1. Page loads → button disabled, greyed **"Loading…"**. Whisper base.en (~74 MB, one-time) starts downloading.
2. Model ready → button blue, focused, labelled **"Use Mic"**. Status: `Model loaded. Click "Use Mic" to enable the microphone.`
3. **Single click on Use Mic** → browser permission prompt → grant → `useMic` flag set true, button turns amber labelled **"🎤 Press to Record"**, focused.
4. **Press and hold** on Press to Record → button turns red **"🎤 Recording…"** with pulsing level indicator. `recording` flag flips synchronously; `setPointerCapture` prevents finger-drift cancellations.
5. **Release** → button dims to **"🎤 Transcribing…"** (disabled) while Whisper runs on the captured PCM. Mic is released immediately so the browser's "in use" indicator disappears.
6. Transcription done → button returns to armed amber; recognised text (with §5/§6 markup) lands in the destination, auto-selected.

**Event routing:** state 1 (Use Mic) uses `click`; states 3–4 (record/stop) use `pointerdown`/`pointerup` for natural press-and-hold. The two event families never overlap on the same state so Safari can't confuse them.

**Stale-event guard:** every pointer/click event compares `performance.now() - event.timeStamp` against a 500 ms threshold. Safari holds pointer events behind modal permission dialogs and dispatches them all when the dialog closes; the queued events carry old timestamps and are dropped silently (`[mic pointerdown-STALE age=Xms — dropped]` in the console log). This eliminated the "needs two clicks" pattern that had plagued this UI across multiple redesign attempts.

**Focus restoration:** `window.focus` and `document.visibilitychange` handlers re-focus the mic button when tab regains focus and state is armed for a user gesture, so keyboard Space still fires the button.

---

## 10. Known Whisper accuracy ceiling (base.en)

On prepared literary text with the biasing prompt, base.en scores ~95 % word accuracy. Remaining error classes:
- Function-word insertions ("he thought that the" for "he thought the")
- Phonologically-close but semantically-different words ("ate it up" → "heated up")
- Homophones of proper nouns not in the prompt

Bumping to `whisper-small.en` (~244 MB) gains ~2 percentage points but costs ~6× transcription time (~18 s vs ~3 s for a 33 s recording). Decision (2026-08-13): stay on base.en; rely on the substitution logic in §5 to catch the most common misses. small.en can be swapped in with a two-string change if accuracy is preferred over speed.

---

## 11. Constraint compliance (from design doc)

- **D1 (audio never leaves device)**: Whisper runs entirely in-browser via transformers.js WASM/WebGPU. No network call after model load.
- **D2 (voice proposes, only touch disposes)**: nothing publishes/commits from voice; all UI actions require a manual tap.
- **D3 (no LLM cleanup)**: transcript is passed only through the deterministic §5/§6 rules, never an LLM rewrite.
- **D4 (`%%bd_` blocks protected)**: stripped from source before alignment (§3); would be refused in Insertion (currently no such node type in the SR editor's destination pane; will apply on BD integration).
- **D5 (native undo)**: all destination mutations via `setRangeText`; verified undo/redo works across insertion and Accept.
- **D6 (screening at utterance boundaries)**: transcription only runs on release; interim results (Whisper doesn't emit them anyway) would not fire screening. Deferred until BD integration.
- **D7 (no signal to remote)**: no remote in prototype. When integrated, the receiver will get final text — same as if it had been typed.

## 12. Browser stack — today's compromises, tomorrow's design (2026-08-13)

BD is a long-horizon project. It will spend years being built and, hopefully, more years being used. The stack under it — WebGPU, transformers.js, ONNX Runtime Web, iOS Safari's ML support — is currently unfinished. Design the module for the maturity we expect it to arrive at, not the state of things today. Note the compromises so future-you knows why the code looks the way it does and when it's safe to relax them.

### 12.1 Current situation (August 2026)

- **WebGPU on iOS Safari 26 silently crashes the tab** during `pipeline({device: 'webgpu'})` init, before any `.catch()` fallback runs. Not our bug — a known-broken upstream cluster (see below).
- **WASM path works** on iPhone Safari 26 for `whisper-base.en` (~74 MB). Slower than WebGPU would be, but stable.
- **WASM isn't universally safe on iOS either** — huggingface/transformers.js#1241 reports `whisper-base` crash-looping on iPad iOS 18.3.2 even on the WASM backend, no console output.
- Even on desktop, Safari has WebGPU off by default; users' desktops report `WebGPU=false` in the features log. So the WebGPU code path was buying us nothing on Safari desktop and crashing us on iOS.

### 12.2 What's in the code because of 12.1

- **`device: 'wasm'` is called with no fallback.** No try-WebGPU-then-WASM dance. See `install()` in both `sr_editor.html` and `bd_SR_Editor/index.html`. Mirroring policy: BD dev copy and standalone stay in sync; do not diverge just because "standalone is the iOS test bed."
- **Progress-checkpoint instrumentation.** `progress(step, detail)` writes to console + source pane + localStorage. `reportPreviousCrash()` IIFE surfaces the previous session's last-reached checkpoint at boot if the tab died. Keeps the silent-crash class of upstream bugs debuggable. Cheap; keep it.
- **Adapter interface has a second-engine slot** (`EngineAdapter` base class + registered engines dropdown). Currently only Whisper is implemented. sherpa-onnx or whisper-turbo can slot in without touching the app.

### 12.3 When to reconsider (and how to tell)

- **Re-enable WebGPU:** wait for a transformers.js release note that explicitly claims iOS-Safari-WebGPU-ready. Likely tied to ONNX Runtime Web landing the pending float16 PRs (iOS Safari WebGPU is float16-only; the current runtime tries float32). Don't re-enable on our own initiative from "it works on my desktop now" — the failure mode is a silent tab kill, which won't show up in any dev environment we control.
- **Model upgrade beyond base.en:** re-test on a real iPhone before shipping. 74 MB → 244 MB (`whisper-small.en`) roughly triples the WASM memory footprint; may push mid-tier phones over the safe budget even when it fits on the newest ones.
- **New engine (sherpa-onnx, whisper-turbo, whatever ships):** implement it behind the `EngineAdapter` interface; add to the dropdown; keep Whisper/transformers.js selectable so we can A/B rather than committing.

### 12.4 Forward-looking design stance

The point: BD is not a "ship this quarter" product. The right timescale for these bet-hedging decisions is *years*. That means:

- Don't hard-couple to any single engine. Adapter interface stays.
- Don't hard-code around today's specific bugs — comment them (as here) and code the fix cleanly, so the next stack refresh doesn't have to reverse-engineer why WebGPU was disabled.
- Keep the crash-diagnostics instrumentation on. It costs almost nothing and buys us the ability to debug a class of upstream bugs (silent tab kill) that will keep happening on new devices / new stack versions for years.
- Prefer standards-track APIs (Web Audio, Web Speech API where available, WebGPU when it stabilises) over vendor-specific paths, even when the vendor path is nicer today.
- Every time you touch this module, do a quick "is this still true?" pass on §12.1 — the situation IS drifting, just slowly. If the compromises above become unnecessary, delete the comments and simplify.

### 12.5 Upstream tracker (as of 2026-08-13)

Watch these for the situation improving:

- huggingface/transformers.js#973 — [safari] Unexpected restarts (float16 root cause suspected)
- huggingface/transformers.js#1242 — v3 crashes on iOS/macOS (memory growth)
- huggingface/transformers.js#1298 — Whisper web demo not working on iOS (Xenova's own demo)
- huggingface/transformers.js#1241 — whisper-base crashing on iPad WASM
- huggingface/transformers.js#1518 — Still crashing WebGPU translation pipeline
- huggingface/transformers.js#1424 — Problems with WebGPU on Apple M3 Pro

Alternative engines to keep on the radar:

- [whisper-turbo](https://github.com/FL33TW00D/whisper-turbo) — cited in #973 as a working mobile-WebGPU Whisper implementation on a different runtime
- [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) — already the intended second engine per Design Notes §3

## 13. BD integration (2026-08-15)

MVP shipped. The full read-and-weave loop is live inside the graph viewer's Edit mode. Ordered log of the decisions and their rationale:

### 13.1 Architecture

- **New file `sr_module.js`** at BD repo root. UI-agnostic ES module: `createEngine`, `buildBiasPrompt`, `stripDirectiveBlocks`, `tokenise`, `phoneticKey`, `alignLocal`, `extendBoundaries`, `applySubstitutions`, `stripTentativeMarkers`, `mergeChunkOutputs`. Third copy of the engine after standalone (`bd_SR_Editor/index.html`) and BD dev copy (`sr_editor.html`) — but this one is DOM-decoupled so BD can wire its own UI without pulling in the SR editor page. Callbacks (`onStatus / onLog / onLevel / onFinal / onError / onQuality`) let the caller route feedback to whatever UI slots make sense.
- **viewer.js imports** all exports and wires them into a ~350-line SR block near the end of `init()`. Mic button + level meter + Accept in the action-bar; primer floats over the top row while the browser permission dialog is up.

### 13.2 UI additions (Edit-mode-gated via `body.edit-active`)

- **🎤 Use Mic → Press to Record → Recording… → Transcribing…** three-state hybrid button (click-to-grant, press-hold-to-record). Stale-event guard against Safari's dead-letter queue from the modal permission dialog (ports the fix from sr_editor).
- **Level meter** — 60×8 px bar next to the mic; green normal, amber loud, red clipping.
- **Accept ✎ button** — strips `{?` and `}` throughout the top Local card via `setRangeText` (preserves browser undo stack).
- **Mic primer panel** — fixed centre-top, deep-blue translucent, text: "Dictate one sentence at a time. The pause between recordings lets you scroll the source or review what landed in the destination." Auto-hides on browser accept/deny.

### 13.3 Model pre-warm

Whisper's ~74 MB model downloads lazily on first mic press → user-visible ~2 s delay on that first press. Fix: `setViewMode('edit')` dispatches `bd:edit-mode-enter` on first entry; SR wire-up listens and calls `srEngine.install()` fire-and-forget. Model loads in parallel with everything else the user does in Edit mode. Idempotent — later re-entries are cheap.

### 13.4 Source snapshot (alignment + bias)

At **pointerdown** on the mic (not release), snapshot the alignment source:
- Walk `#chat-stack`'s cards, keep any whose bounding rect intersects the pane's viewport rect (partial visibility counts).
- Concatenate their `.card-body` values with **single-space separators** (collage-style, no paragraph markers — user's 2026-08-15 spec).
- Strip `%%bd_…` directive blocks.
- Store in `srSourceSnapshot` — used for BOTH the bias prompt (broader vocab priming) AND the post-hoc alignment (narrower, precise).

Rationale for snapshot-at-press: user can't scroll while holding mic (finger committed); whatever's visible at press-time IS the reading source; captured once, held for the recording's duration; robust against any layout shifts before Whisper returns.

### 13.5 Caret memory

Pressing the mic transfers focus AWAY from any Current textarea, wiping the visible caret. But the user's insertion intent was where they'd positioned the cursor.

Fix: delegated listeners on `#current-stack` for `focusin / input / keyup / mouseup / focusout` update a module-level `srCaretSnapshot` `{textarea, selectionStart, selectionEnd}` on every relevant interaction. Insertion prefers this saved position when the referenced textarea is still in Current; fallback to append-to-top-Local otherwise. Snapshot self-heals: refreshed after each insertion, invalidated when the tracked textarea moves to History.

### 13.6 Bound vs free mode auto-classification

`srAlignAndMark` computes `matched-tokens / utterance-tokens` from the raw `alignLocal` output. Threshold **0.7** (user's 2026-08-15 call, "system works quite well, be strict") → mode is **bound**; below → **free**. Returned alongside the marked text so downstream insertion knows what separator to use.

### 13.7 Bound-mode boundary extension

When bound-mode detected, extend the first match backward and the last match forward:
- **Backward** from `firstMatch`: pair `utt[aStart-k]` with `src[bStart-k]` as a synthetic `sub` op. Stop when EITHER side runs out (utterance-start or source-start reached).
- **Forward** from `lastMatch`: symmetric.

Extensions become plain `sub` ops so the existing `applySubstitutions` wraps them `{?source-word}` with no new rendering path. `aStart / aEnd / bStart / bEnd / length` all updated in place so the em-dash boundary check in `applySubstitutions` respects the extended span (no spurious "—" at the now-extended utterance-start).

No manual override (user: "auto is enough for now"). No extension cap (user: "read passages or free speech is fairly short"). 1:1 positional pairing has a known weakness: when Whisper condenses source words into fewer tokens (e.g. "of late to" → "o"), the paired source-word may be positionally-adjacent but semantically off (e.g. `{?to}` for the "o"). Live with it; user can review the `{?…}` markers before Accept.

### 13.8 Substitution renderer — mode-aware

`applySubstitutions(uttText, uttTokens, srcTokens, matches, {mode})`:

- `sub` → `{?source-form}` — plain wrap.
- `del` → `{?word}` inserted at anchor position; consecutive dels grouped as `{?word1 word2}`.
- `ins`:
  - **mode='bound'** → `{?word}` — plain wrap. In a reading, ins ops are almost always Whisper hallucinations, not literary asides — Accept strips cleanly and the word integrates as regular text.
  - **mode='free'** → `{?— word —}` — em-dashes INSIDE the markers so they survive Accept as permanent aside markers (2026-08-13 free-mode spec).
- Em-dash boundaries at commentary/quote transitions unchanged (soft punctuation `. , ; :` at boundary REPLACED with em-dash to avoid `. — ` doubling).

### 13.9 Inter-injection boundary marks

When inserting a fresh transcript adjacent to existing text in Current:
- **New = bound** → single-space separator (reading continues cleanly).
- **New = free** → `' — '` em-dash separator (marks commentary against surrounding text).
- Adjacent whitespace on either side is **absorbed into the replacement range** so we never get `'  '` doubling or `'. — '` after punctuation.
- Applied at BOTH ends if inserting mid-text; only leading side if at very end; empty pane, no separator.
- Decision uses mode of the NEW injection only — no tracking of past regions' modes. Simpler and reads well in practice.

### 13.10 Mid-passage lowercase

If inserting after non-terminal text (anything except `. ! ?`), lowercase the first alpha character of the new injection. Whisper always emits sentence-initial caps; makes no sense mid-sentence. Also handles `{?Foo}` → `{?foo}` by skipping the marker prefix.

### 13.11 Quote-strip

Whisper sometimes wraps a recording it perceives as a direct quotation / recitation in `"…"` or `'…'` (typical when the speaker's cadence reads as "reading aloud"). Strip leading/trailing quote characters at the top of `srAlignAndMark`. Handles straight `" '` plus curly `“ ” ‘ ’`.

### 13.12 Diagnostic logging

Every recording now emits a console line like:

```
[SR] alignment: 1 match(es), pre-ratio 87% → bound mode, 24/24 tokens after extend, 6 edit(s)
[SR] extend backward (1): utt[0]"o"→src[8]"to"
```

Or, if no extension happened:

```
[SR] no extension (match already spans utt[0..15] of 16, src[6..21] of 40)
```

Makes it easy to trace what a given utterance was classified as and what the extension paired up.

### 13.13 Known Whisper limits (no code fix)

- **Uncommon words with unusual stress get mis-decoded.** Snow White's "Huntsman" is a known win with bias; "Prologue" / "Epilogue" observed 2026-08-15 as "Pro-log" / "Happy log" (Hardy's poem, not in bias). User workaround: type tricky words into a Current or History card BEFORE recording so they enter the bias prompt.
- **Punctuation is Whisper's call**, not the source's — periods where the source has commas, quotes around recitation-cadence recordings (we strip those; see §13.11), unpredictable capitalisation.

### 13.14 NOT YET (future work, deferred)

- **Persistent tricky-vocabulary side panel.** A small always-visible pane where the user maintains a hand-curated list of tricky words (Prologue, Epilogue, proper nouns, technical terms, etc.). Words get **always** prepended to the bias prompt regardless of what's in History/Current. Would solve the Prologue/Epilogue class of misrecognition permanently for a given corpus without requiring the user to plant the words in a card before every recording. Idea only — not implemented 2026-08-15.
- **Compressor toggle** in the action-bar (default ON; toggle for A/B testing hot vs. dry mic).
- **Quality-report banner** on release (peak/mean dBFS, silence %, clip %, verdict OK / WEAK / HOT / BAD) — currently just logged to console.
- **Manual bound/free override** — user can hint the mode via a small "🎤 Reading" toggle. User's 2026-08-15 call: not yet.
- **Non-1:1 boundary extension** — handle Whisper's word-condensation cases ("of late to" → "o") where positional 1:1 pairing marks the wrong source-word. Would need fuzzy source-alignment with variable spans. Complex — defer until it hurts.
