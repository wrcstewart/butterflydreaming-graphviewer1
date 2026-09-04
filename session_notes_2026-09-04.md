# Session notes — 2026-09-04

**Piper DIRECT works.** Our own synthesis path replaces vits-web's `predict()`,
giving IPA pronunciation control and the model's real speaking-rate parameter.
Confirmed on the iPhone: *"It works very well."*

Code: `piper_direct.js` (~40 lines of substance). Driven by the
**Piper DIRECT — IPA + real rate** button in `speech_bench.html`.

---

## 1. What was wrong with going through vits-web

vits-web is a thin wrapper over the two hard parts — Piper's phonemiser
(espeak-ng in wasm) and `onnxruntime-web`. It works, and it fixes two things we
wanted back:

- It sends `[{ text }]` to the phonemiser and nothing else, so pronunciation is
  whatever espeak guesses. Every Chinese name in the corpus was mangled: **Li Bai
  read as "lie bye", Khwan was spelled out letter by letter, Phing became
  "fing".**
- It reads `length_scale` from the voice config and hands it to the model **as a
  tensor**. So the real rate control existed one line away and was not exposed;
  the alternative, `playbackRate`, is a time-stretch rather than a change of
  delivery.

Neither is a limitation of Piper or of espeak. Both are that wrapper's API.

## 2. How IPA gets in — and a claim of mine that was wrong

**espeak will not accept IPA.** Verified: `[[dʒwˈɑːŋdzə]]` yields `d`. And the
phonemiser has **no phonemes input mode** — its only options are `--language`,
`--input`, `--json_input`, `--espeak_data`, `--allow_missing_phonemes`,
`--tashkeel_model`.

**I claimed a `phonemes` input key existed because I found that string in the
binary. That string is the OUTPUT field name.** Finding a word in a binary is not
evidence that it is an input key, and I should have checked before building on
it.

**It does not need one.** The phonemiser returns the **phoneme array** as well as
the ids, and the ids are a pure function of that array plus the voice's
`phoneme_id_map`:

    ids = [ ^ , _ , p1 , _ , p2 , _ , … , $ ]

Reconstructed and matched against Piper's own output, byte for byte:

    theirs : [1,0,108,0,22,0,120,0,33,0,122,0,39,0,44,0,38,0,74,0,2]
    mine   : [1,0,108,0,22,0,120,0,33,0,122,0,39,0,44,0,38,0,74,0,2]

So ids can be built for **arbitrary IPA**, and espeak is simply never consulted
for those words. It is not asked to understand IPA; it is bypassed.

**The phonemiser takes an ARRAY and returns one result per entry**, so every
ordinary segment of an utterance goes through in a single call rather than one
instantiation per fragment.

## 3. What the path gives

| | |
|---|---|
| Pronunciation | IPA straight into the lexicon — look it up, paste it in. No respelling, no orthographic guessing, no Tow/Dow ambiguity |
| Rate | `length_scale` reaches the model as the tensor it always was, so slowing changes **delivery**, not stretched audio |
| Expressiveness | `noise_scale` and `noise_w` are now reachable too — untried |
| Storage | **Cache API, not OPFS** — removes the dependency that cost an evening when Safari 18.5 wrote voices into zero-byte files while `stored()` reported them present |

Seeded lexicon, every symbol validated against the voice's table:

    Zhuangzi = dʒwˈɑːŋdzə     Laozi = lˈaʊdzə      Li Bai = lˈiː bˈaɪ
    Li = lˈiː                  Khwan = kwˈɑːn       Phing = pˈʌŋ
    Tao Te Ching = dˈaʊ dɐ dʒˈɪŋ

That validation matters: **a symbol missing from `phoneme_id_map` is silently
dropped**, so the failure is a word with a hole in it rather than an error. The
code reports dropped symbols explicitly.

Zhuangzi is the true `dʒw` here. The earlier "joo-ahng" compromise existed only
because English spelling cannot write that onset — going in as phonemes, it
disappears.

## 4. OPEN — commas and the final phrase

Reported at the end of the session: **commas "seem to be going astray"**, and
something is off with the last phrase of the test passage. Not yet investigated.

Candidates worth checking first:

- `splitUtterances` splits on `[.!?]` and then on `,;:` for anything over 300
  chars. **A clause split mid-sentence loses the comma itself**, since the
  separator is consumed by `split()` — punctuation drives prosody in Piper, so a
  swallowed comma changes the reading.
- The lexicon substitution rebuilds text around matches; a key adjacent to
  punctuation could disturb spacing.
- The final utterance has no trailing sentence punctuation if the passage does
  not end in `.!?`, which may change how it is spoken.

## 5. Also open

| item | note |
|---|---|
| `noise_scale` / `noise_w` | reachable now, untried — the expressiveness knobs |
| BD integration | not started; `/api/speak` and `speech_cache/` still to come out |
| First-use download | ~60 MB, must not start from an accidental checkbox tick |
| Her voice vs stock | undecided and deferrable — a fine-tune drops into this same path |
| `cori-high` | 108.9 MB, untried |
