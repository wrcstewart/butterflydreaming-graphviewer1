# Design Notes — Speech-Recognition-Enhanced Editor

## Standalone Test Page (v0.1)

**Document version:** 0.1
**Date:** August 2026
**Prepared by:** Claude (Anthropic) with William Stewart
**Scope:** Standalone prototype only — not platform integration
**Parent project:** ButterflyDreaming (BD) — see Graph Sub-Project Handover v1.0
**Licence:** AGPL-3.0 (consistent with the wider project)

---

## 1. Purpose

### 1.1 The facility within ButterflyDreaming

Speech recognition (SR) is proposed as a faster and more natural way of entering
text into node cards, particularly on mobile, where composing symbolic text with
an on-screen keyboard is slow and discouraging. The rest of the interface remains
click/tap driven.

The facility is envisaged as operating at a **pre-edit staging stage**: recognised
text lands in a local panel that the user reads before anything is committed to
the shared field. The human is therefore the first filter, and the existing
toxicity and anonymity screening applies unchanged to the resulting text, since
from the pipeline's point of view it is simply text that has arrived in the
editor.

The staging concept is not new to the session model. State S1 (Waiting) already
provides a private, non-persisted draft space; the proposal extends that idea
into S3 (Weaving) rather than introducing it.

### 1.2 The interaction model: read-and-weave

The user speaks a single flowing utterance that mixes reading aloud from existing
text with their own words, **in any proportion and any order** — own words first,
then a quoted line, then more own words, then a further fragment, and so on.
There is no fixed structure and no single transition point. This is a *weaving
gesture* rather than a text-manipulation operation: closer to oral transmission
than to editing, and more in keeping with the platform's use of poetry, myth and
folktale.

It requires no command vocabulary and no mode switching. This is not merely
convenient — it removes at a stroke the mode-confusion problem that any spoken
command layer would face, since corpus vocabulary and plausible command
vocabulary overlap heavily (*cut* belongs to the Wound/Healing cluster; *return*,
*offer*, *accept* and *yes* all occur naturally in the source material).

**A voice command layer is explicitly out of scope.** An earlier draft proposed a
second model in which spoken scope commands ("select the last line", "from *dawn*
to *threshold*") drove selection while taps performed the operation. It has been
dropped: too complicated to implement for the likely take-up, and mechanical in a
way that works against the flow the platform is trying to support. All operations
other than dictation remain click/tap driven.

**The real problem is therefore splicing.** With the command layer gone, the sole
technical challenge is detecting which spans of a spoken utterance derive from
existing text and integrating them intelligently with the spans that do not. The
system cannot assume a prefix match followed by novel text; it must treat the
utterance as an arbitrary sequence of spans, any of which may or may not
correspond to source material. This is the substance of the prototype — see §5.3.

### 1.3 The two-pane arrangement

A source pane and a destination pane still help, though less decisively than a
single-transition model would have allowed. Holding the read-from material in its
own buffer means any span-matching (§5.3) is run against a known, bounded text
rather than against the destination's own accumulating contents, which would
otherwise generate spurious self-matches as the draft grows.

The arrangement also sharpens vocabulary biasing (§4): the contents of the source
pane are known exactly, so the recogniser can be biased toward that text
throughout the utterance — not merely during some identifiable read portion,
since with interleaving there is no such portion to identify in advance.

In the platform, both panes are expected to sit **within node editing** — the
source pane holding a scrolled-away region of the current draft, not an arbitrary
node. Allowing an arbitrary ancestor as source would create an informal second
parent mechanism running alongside the formal Offer/Agree gates, admitting text
whose provenance the graph does not record. A browse-trail source pane remains
interesting for a much later stage (§8), potentially in combination with
cross-link tagging.

---

## 2. Design constraints

These derive from the platform's existing commitments and should hold in the
prototype so that findings transfer.

**D1 — Client-side only.** Audio must never leave the device. Voice is a hard
biometric identifier, and the platform's position is that no record capable of
linking content to a person is ever created [1]. This rules out the default
cloud-backed path of the Web Speech API, in which audio is transmitted to a
remote recognition service [2].

**D2 — Voice may propose; only touch may dispose.** Navigation, dictation and
cluster movement by voice are all reversible and acceptable. The consent gates —
Offer, Agree, Sign-off — remain manual. A misrecognition that fires Sign-off
would publish a permanent, unrecallable AGPL-licensed node on the strength of
something the user did not say, and there is no remedy for that.

**D3 — No LLM "cleanup" of the transcript.** A local model asked to polish
recognised text will normalise exactly the strange phrasings that are the point
of the corpus. Bias the decoder, or correct against a closed vocabulary list, but
never free-generate.

**D4 — `%%bd_` blocks are protected.** If the cursor falls inside a directive
block (opened `%%bd_`, closed `%%bd_]`), voice insertion is refused rather than
dropping recognised prose into a parameter list. Directives are not dictated;
they arrive by inheritance through merge-editing.

**D5 — Native undo must survive.** Use `setRangeText()` rather than assigning to
`.value`, which wipes the browser's undo stack. This matters far more with
dictation than with typing, because SR inserts many words at once and a bad
recognition must be undoable in a single gesture.

**D6 — Screening runs at utterance boundaries.** Dictation inserts a phrase at a
time, so screening wired to input events will fire on fragments — wasteful, and
prone to false positives on half-transcribed place names. Run on utterance end
and on pause, not on interim results. Client-side screening remains advisory; the
server layer stays authoritative at commit.

**D7 — No signal to the remote user.** Decided: the partner is not told whether
text was spoken or typed. A general presence indicator (composing / paused),
decoupled from content, remains desirable for the shared field but is out of
scope here.

---

## 3. Candidate speech recognition modules

### 3.1 Web Speech API, on-device — primary candidate

Chromium's on-device mode is the strongest fit. `processLocally: true` instructs
recognition to be performed on the device, addressing the privacy, latency and
offline drawbacks of cloud recognition [3]. Language packs are queried and
installed through `SpeechRecognition.available()` and `SpeechRecognition.install()`
[3].

Crucially, it also provides **native contextual biasing** — the mechanism this
project needs for matching recognition against the text being edited. A `phrases`
property accepts `SpeechRecognitionPhrase` objects, each pairing a phrase string
with a boost value in the range 0.0–10.0 [4]; the boost is approximately the
natural log of how much more likely the application believes the phrase to be
than the model's own prior [5]. The array is mutable like an ordinary JavaScript
array, so phrases can be pushed as the editing context changes [4].

Cautions for the prototype:

- Brave exposes the API surface while gating off the backing component, so
  feature detection passes but installation never completes [6]. Test the
  *installed* state, not merely the presence of the constructor.
- Chrome temporarily disabled on-device Web Speech until 142.0.7403.0 following a
  regression in language specification [7]. Availability must be treated as a
  runtime fact, re-checked each session.
- Chromium-family only. Firefox and Safari require a fallback.

### 3.2 sherpa-onnx WASM — fallback A

Emscripten-compiled modules with JavaScript bindings, running models locally in
the browser with no backend [8], including real-time streaming ASR (Zipformer,
Paraformer) and VAD-plus-ASR configurations using SenseVoice, Whisper or
Moonshine [9]. Genuinely streaming, which matters if continuous dictation is
tested. Apache-2.0, therefore compatible with AGPL-3.0.

No equivalent of the `phrases` biasing mechanism, so vocabulary matching must be
done post-hoc (§4.2).

### 3.3 transformers.js + Whisper — fallback B

Easiest to prototype. Version 4 uses WebGPU as its primary acceleration backend
with automatic WASM fallback [10]. Two caveats: Whisper is designed around
30-second windows rather than streaming, so continuous use requires chunking; and
it can generate repetitive nonsense at chunk boundaries and in silent regions
[11] — worse than a dropped word in a poetry editor.

Both are mitigated by the staging design. Push-to-talk into a buffer produces no
silent regions to decode and imposes no live-latency requirement, which makes
Whisper considerably more viable here than it would be in a shared live field.

On model size: a 76 MB hybrid-quantised build can outperform a full 300 MB q8
build, because quantisation noise in the encoder propagates through the entire
decoder stack [11]. Serve from Cloudflare R2, cache in OPFS or the Cache API.

### 3.4 Comparison

| | Web Speech (on-device) | sherpa-onnx WASM | transformers.js + Whisper |
|---|---|---|---|
| Browser support | Chromium only | Universal (WASM) | Universal (WebGPU→WASM) |
| Download | Language pack, browser-managed | Model bundle | 76–300 MB model |
| Streaming | Yes | Yes | No (chunked) |
| Native biasing | **Yes (`phrases`)** | No | Partial (prompt conditioning) |
| Licence | n/a (browser) | Apache-2.0 | Apache-2.0 / MIT models |
| Prototype effort | Low | Medium–high | Low–medium |

### 3.5 Ruled out

Cloud services (Deepgram, AssemblyAI and similar) breach D1. The default Web
Speech path without `processLocally` likewise transmits audio remotely [2].
Commercial on-device SDKs requiring an access key and validation call-home are
inconsistent with the anonymity architecture.

### 3.6 Speech synthesis

Low priority, as previously agreed. `speechSynthesis` is already available and
requires no additional library. Note only that some platform voices are
network-backed — check `voice.localService` before selecting one, or D1 is
silently breached at the output end.

---

## 4. Vocabulary biasing strategies

**B1 — Native phrase boosting (Web Speech only).** On entering edit mode,
tokenise the source pane, the destination pane and the ancestor chain; push
distinctive vocabulary as boosted phrases. Because reading and original speech
interleave arbitrarily, the boost must remain applied for the whole utterance —
there is no read portion to scope it to, and any scheme that decays the boost
partway through will degrade exactly the quoted spans that occur late in a long
utterance. Corpus vocabulary — Daoist terms, mythic and folktale registers,
proper nouns from translation chains — is exactly the acoustically-unusual
material this mechanism exists to serve.

**B2 — Post-hoc correction (all engines).** Fuzzy-match recognised output against
a closed vocabulary drawn from the node and its ancestors, using edit distance
plus a phonetic key (Double Metaphone). Replace only above a confidence
threshold. This is the only biasing route available for the WASM engines, and it
usefully constrains the correction to words already in the corpus.

**B3 — Two-pass settling.** Because the staging panel imposes no live-latency
requirement, a fast first result can be rendered and then quietly replaced by a
better one — re-decoded with fuller biasing, or B2-corrected. Text appears
immediately and settles a moment later. Worth testing for whether it reads as
polish or as instability.

**Explicitly not attempted:** an LLM rewrite pass (D3).

---

## 5. Test page specification

### 5.1 Layout

A single HTML page, no build step, consistent with the existing media modules.

```
┌─────────────────────────────────────────────┐
│ Engine: [Web Speech ▾] [status: ready]      │
│ Mode:   ( ) Push-to-talk  ( ) Continuous    │
│ Bias:   [x] source  [x] destination  [0-10] │
│ Splice: minlen[-] score[-] phonetic[-]      │
├──────────────────────┬──────────────────────┤
│ SOURCE               │ DESTINATION          │
│ (corpus fragment,    │ (edit target,        │
│  scrollable,         │  cursor marker       │
│  read-aloud from)    │  always visible)     │
│                      │                      │
│ <textarea>           │ <textarea>           │
├──────────────────────┴──────────────────────┤
│ Interim: "..."                              │
│ Final:   "..."                              │
├─────────────────────────────────────────────┤
│ [Mic] [Clear] [Copy →] [Undo]               │
├─────────────────────────────────────────────┤
│ LOG: alignment / latency / would-have-fired │
└─────────────────────────────────────────────┘
```

Two plain `<textarea>` elements are sufficient. Standard text editing gives
`selectionStart`, `selectionEnd` and `setSelectionRange()`, which covers line and
character scopes without any editor framework.

### 5.2 Source pane

Pre-loaded with corpus fragments from the existing graph — a Tao Te Ching
chapter, a Hardy poem, the Du Fu translation — with a selector to switch between
them. Made deliberately longer than the visible area so that scroll-away
behaviour is exercised.

### 5.3 Alignment handling

Since reading and original speech interleave freely, an utterance is an arbitrary
sequence of spans, each of which may or may not derive from the source. Prefix
matching is therefore insufficient; anything cleverer than option 1 requires
span-level alignment — a local-alignment pass over the utterance against the
source, marking matched regions above a length and similarity threshold.

Three options, selectable, to be compared:

1. **Keep everything.** The whole utterance lands in the destination exactly as
   recognised, quoted spans included; the user removes what they do not want.
   Crude, never guesses wrong. **Recommended default for the first build**, and
   more strongly so than under a single-transition model, because the
   segmentation problem it avoids is now genuinely hard.
2. **Mark matched spans.** Insert everything, but visually distinguish spans that
   matched the source — a background tint, or a marker on commit. The user
   decides what to do about them. Non-destructive, and it surfaces the alignment
   for inspection rather than acting on it.
3. **Drop matched spans.** Insert only the unmatched material, on the assumption
   that quoted text is being used to locate and connect rather than to duplicate.

A structural ambiguity to note: if a user's own words happen to coincide with
source text — likely enough, given they are working within one symbolic register
— there is no way to tell a deliberate quotation from a coincidence. Option 3
will therefore silently delete original speech some proportion of the time. That
is a strong argument for keeping it experimental.

Instrument option 1 so that 2 and 3 can be evaluated without being enabled: log
every span the aligner would have matched, its position, length and score, and
whether it would have been correct. Decide from data, not from intuition.

Note that option 2 cannot be implemented in a plain `<textarea>`, which supports
no inline styling. For the prototype, render the marking in a read-only preview
element beneath the destination pane rather than introducing a rich-text editor.

### 5.4 Splice detection — the core problem

With the command layer dropped (§1.2), this is the substance of the prototype.
The task: given a recognised utterance and a known source text, identify which
spans of the utterance derive from the source.

**Approach.** Local sequence alignment over token sequences — Smith-Waterman or
equivalent — rather than exact substring search, since recognition errors,
elisions and the reader's own small deviations mean quoted spans will rarely
match verbatim. Suggested pipeline:

1. Tokenise both utterance and source to lowercase words, stripping punctuation.
2. Normalise each token to a phonetic key (Double Metaphone) held alongside the
   surface form, so that recognition errors that sound right still align.
3. Run local alignment, scoring surface matches highest, phonetic matches lower,
   with affine gap penalties so that a single dropped word does not split one
   quoted span into two.
4. Accept matched spans above thresholds for minimum length and minimum score;
   reject everything else as original speech.
5. Map accepted spans back to character offsets in the source, for provenance and
   for the marking in option 2.

**Thresholds are the whole game and must be tunable at runtime.** The minimum
span length in particular: too low and every incidental *and the* aligns
spuriously; too high and short quoted phrases are missed. Expose length,
score and phonetic-weight as sliders on the test page and record the settings
alongside each logged utterance.

**Register-specific difficulty.** The corpus works against naive alignment in
three ways worth measuring separately. Tao Te Ching translations are short,
repetitive and formulaic, so false-positive alignment is likely. Hardy is
metrically regular with distinctive vocabulary, and should align well. Translated
Tang poetry has unusual proper nouns that recognition will mangle, making
phonetic matching carry most of the weight.

**Word-level timing helps if available.** Where the engine provides word
timestamps, a prosodic signal can supplement lexical alignment: reading aloud
tends to be more evenly paced than spontaneous speech, and there is often a
detectable pause at the seam. Worth logging, not worth depending on.

**Line remains the natural unit for anything user-facing.** Sentence segmentation
depends on terminal punctuation, which poetry frequently lacks — Hardy's stanzas
run across line breaks, most Tao Te Ching translations are aphoristic fragments,
and translated Du Fu is worse still. Where a matched span nearly fills a line,
snapping to the line boundary will usually match intent better than the raw
alignment.

**Directive blocks are excluded from matching.** Do not align against `%%bd_` …
`%%bd_]` regions; they are not read aloud, and their parameter tokens will
generate noise.

### 5.5 Engine adapter

Wrap each engine behind one interface so they can be swapped at runtime:

```js
// Minimal contract every engine adapter must satisfy
{
  async available(),           // -> 'available' | 'downloadable' | 'unavailable'
  async install(),             // -> boolean
  setPhrases(entries),         // [{phrase, boost}] — no-op where unsupported
  start(), stop(),
  onInterim(text),
  onFinal(text, confidence),
  onError(err)
}
```

`setPhrases` becoming a no-op on the WASM engines is the honest representation of
the capability gap and makes B2 fallback explicit.

### 5.6 Implementation notes

- Insert via `setRangeText()` to preserve undo (D5).
- Run inference in a Worker so the textarea never blocks.
- Maintain a **persistent visible cursor marker** in the destination. With
  continuous listening, the insertion point goes stale silently — the user
  scrolls, taps elsewhere, returns, speaks, and there is no immediately preceding
  gesture to re-anchor it.
- Test focus behaviour on iOS early: `setSelectionRange()` on an unfocused
  textarea behaves inconsistently in Safari, and starting a recognition session
  can disturb focus and the on-screen keyboard. Desktop will work first time;
  mobile is where the engineering actually is, and mobile is the likely majority
  case.

### 5.7 Questions the prototype should answer

1. Does read-and-weave survive contact with recognition errors, or does error
   correction become frustrating enough to drive users back to the keyboard?
2. How accurate are quoted spans under heavy phrase biasing, compared with
   original speech in the same utterance?
3. How often do users actually interleave, and at what granularity — whole lines,
   phrases, or single words? This determines whether span alignment is worth
   attempting at all.
4. What is the false-positive rate of span matching: how often does original
   speech coincide with source text closely enough to be marked as a quotation?
5. Which alignment option do users prefer once they have experienced all three?
6. Is two-pass settling (B3) perceived as polish or as instability?
7. Does the on-device Web Speech path install reliably across the target
   browser/OS matrix, and how gracefully does the WASM fallback degrade?
8. Is scroll-away in the source pane actually a problem in practice, or does
   reading aloud from a visible fragment cover most real use?
9. What is the practical word-error rate on the existing corpus registers —
   Daoist, Hardy, translated Tang poetry?

---

## 6. Out of scope for this prototype

- Any platform integration; no session states, no WebSocket, no partner.
- Presence signalling to a remote user (D7).
- The browse-trail source pane and cross-link tagging (§8).
- Speech synthesis beyond confirming `voice.localService` behaviour.
- Server-side screening; client-side screening may be stubbed.

---

## 7. Reference implementation notes for the graph side

Nothing in this prototype touches the graph. Should the facility proceed, two
schema questions follow:

- Whether a node records that any part of it was dictated. Current answer: no —
  D7 applies to the partner, and there is no obvious reason to record it
  permanently either.
- Whether the browse trail, if it later becomes a source, is captured at creation
  time. If cross-link tagging is ever wanted, the raw evidence must be recorded
  when the node is made, because nodes are immutable and the association cannot
  be reconstructed afterwards.

---

## 8. Longer-term possibilities noted, not designed

Free inclusion of text from earlier browsed nodes is interesting rather than
problematic: a lifted fragment is evidence of a resonance the user perceived
between two nodes, which cluster proximity alone cannot infer. The existing
`BRIDGE_TO` relationship is the natural home for such links.

A possible mechanism, well beyond current scope: record co-occurrence as a weak
edge, allow it to strengthen when the same pairing recurs across independent
dyads, and promote it to a full `BRIDGE_TO` only once several unrelated pairs
have found the same resonance. This is the strange-attractor principle operating
on links rather than nodes, and it self-cleans — an idiosyncratic one-off never
crosses the threshold.

---

## References

1. ButterflyDreaming. *Ethics Framework.* https://butterflydreaming.info/ethics.html
2. MDN Web Docs. *SpeechRecognition.* https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
3. WebAudio Community Group. *On-device speech recognition explainer.* https://github.com/WebAudio/web-speech-api/blob/main/explainers/on-device-speech-recognition.md
4. MDN Web Docs. *Using the Web Speech API.* https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
5. W3C WebAudio CG. *Web Speech API specification.* https://webaudio.github.io/web-speech-api/
6. Brave Browser issue #55414. *On-device SpeechRecognition silently hangs in "downloading" state.* https://github.com/brave/brave-browser/issues/55414
7. Chromium issue 444393111. *speechRecognition.available({processLocally:true}) broken in macOS.* https://issues.chromium.org/issues/444393111
8. k2-fsa. *sherpa-onnx — WebAssembly and Node.js API.* https://github.com/k2-fsa/sherpa-onnx
9. k2-fsa. *sherpa-onnx WebAssembly deployment / demo spaces.* https://k2-fsa.github.io/sherpa/onnx/index.html
10. LogRocket. *How to build a real-time voice AI agent in the browser.* https://blog.logrocket.com/voice-ai-agent-browser/
11. OfflineTTS. *Browser Speech Recognition in 2026: Whisper and the STT Landscape.* https://offlinetts.com/blog/browser-speech-recognition-whisper-comparison/
12. ButterflyDreaming. *Graph Sub-Project Handover v1.0*, May 2026.
