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

## 4. RESOLVED — the prosody faults

Both reported by ear, and both were the input doing exactly what it was told.
Neither was the model, the engine, or the dictionary mechanism.

**Fault A: a phrase break before "Te Ching" that nobody wrote, and the real comma
after "Laozi" going missing.** Cause: the first implementation split the text on
lexicon keys and phonemised each ordinary fragment separately. **espeak treats
every entry it is given as a COMPLETE UTTERANCE**, so each fragment got its own
intonation contour — a break at every segment boundary — while a comma sitting at
the START of a fragment (", and the ") was dropped as leading punctuation.
Splitting the text split the prosody with it.

Fix: swap each lexicon word for a pronounceable nonsense PLACEHOLDER, phonemise
the WHOLE sentence in one call with punctuation intact, then locate the
placeholder's phoneme run and replace it with the intended IPA. espeak computes
prosody over a real sentence and never sees the name. Verified before shipping:

    whole  : kəmpˈeə ðə zˈɔːbɪk ɐtɹˈɪbjuːtɪd tə vˈændɛks, ænd ðə plˈɪmʌk.
    after  : kəmpˈeə ðə dˈaʊ dɐ dʒˈɪŋ ɐtɹˈɪbjuːtɪd tə lˈaʊdzə, ænd ðə dʒwˈɑːŋdzə.

**Fault B: "Tao Te Ching" read as a series of words being compared, with "Te"
drifting toward "to".** Diagnosed by the user, and the IPA was the cause:
`dˈaʊ dɐ dʒˈɪŋ` contains SPACES — word boundaries in the phoneme stream — and TWO
primary stress marks. It said "three words, two of them stressed" and the model
obliged.

**The two rules for writing lexicon IPA:**

| | |
|---|---|
| A **space** is a word boundary | omit it to bind syllables into one word |
| `ˈ` is **primary stress** | at most one per name; `ˌ` for secondary |

    Tao Te Ching = dˌaʊdədʒˈɪŋ     one word, secondary + primary
    Li Bai       = lˌiː bˈaɪ       genuinely two words, not two stresses

Check every symbol against `phoneme_id_map` first, `ˌ` included — a missing
symbol is silently dropped, so the failure is a word with a hole in it.

**A diagnostic trap worth remembering:** the bench logged only the FIRST
utterance's phonemes, and the names were in the second, so every run had been
showing the uninteresting half.

Confirmed on the iPhone after both fixes: *"Perfect!"*

## 5. Also open

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

| item | note |
|---|---|
| `noise_scale` / `noise_w` | reachable now, untried — the expressiveness knobs |
| BD integration | not started; `/api/speak` and `speech_cache/` still to come out |
| First-use download | ~60 MB, must not start from an accidental checkbox tick |
| Her voice vs stock | undecided and deferrable — a fine-tune drops into this same path |
| `cori-high` | 108.9 MB, untried |

---

# Part 2 — Speech shipped into BD (same day, later)

Piper is in BD proper. `viewer.js` no longer touches the server for speech.
Ended at **`viewer.js?v=778`, `style.css?v=458`**, canary **red**.
Verified working on desktop; iOS to be retested.

## 6. The integration

`599efdb`. The Speak checkbox drives `piper_direct.js`; the `/api/speak` scaffold
is off the path entirely. Four pieces came over from the bench, each of which had
cost something to learn: the **ReadableStream polyfill** (at the top of the file,
before any dynamic import — WebKit dies at module evaluation without it),
`splitUtterances`, queueing utterances rather than passages, and synthesising one
ahead.

The ~60 MB download is gated behind a `confirm()` naming the size, asked once and
remembered. Blunt on purpose: unambiguous, works everywhere, cannot be dismissed
by accident. Worth redoing in BD's idiom later.

## 7. Ducking the media bar — and a platform rule I should have known

Text now has a sonic form, so music and voice compete. The default is to push the
music to the background rather than pause it.

**`HTMLMediaElement.volume` is READ-ONLY on iOS.** Assigning to it is silently
ignored — no error, no warning, no change. The first implementation was therefore
a no-op on precisely the device it was written for, and lowering the level would
not have helped at any value including zero. **Web Audio gain IS settable**, so
the element is routed once through a `GainNode`.

Two constraints shape that: `createMediaElementSource` may be called only ONCE
per element, and the media bar rebuilds its `<audio>` via `innerHTML` on every
track change — so the wiring is keyed to the element. And once routed, audio
reaches the speakers only through the graph, so a failure would silence the music
entirely; hence the try/catch and the fallback to `element.volume`.

Level went 0.30 → 0.24 → **0.10**. A track is mastered loud and a TTS voice is
not, so "background" needs a far bigger gap than the numbers suggest.

**The mirror case was missing**: ducking only fired when SPEECH began, so starting
a track during a reading came in at full volume. The player now asks
`speechActive()` on its own `play` event — at every play, since a track can be
started, paused and restarted — and comes in already low (30ms, not the 250ms
ramp, which in that direction IS the problem).

## 8. Punctuation and pauses

**Spaced dashes.** Measured: `" — "` already becomes a semicolon in the
phonemiser, which is the "comma but a bit longer" the author wanted. `" - "`
became NOTHING, and the corpus had 70 of them. Spaced forms are normalised to the
em-dash — **whitespace on both sides is the entire safety of it**, because the
corpus also holds 223 word-internal hyphens (Kung-ni, Snow-white, Dze-yu) that
must stay joined.

**Clause splitting was destroying punctuation.** `split(/(?:;|:|,)\s+/)` CONSUMES
the delimiter, so a colon in an over-long sentence was replaced by an utterance
boundary — heard as a very long pause, with the following capital read as a fresh
sentence. Worse, the rejoin glued fragments with `", "`, so any colon or
semicolon that did NOT trigger a split silently became a comma. Every long
sentence in the corpus had been losing its punctuation hierarchy. Parts now keep
their trailing punctuation, and the cap went 300 → **400** so the offending
sentence is not split at all.

**Sentence pauses had to be added back.** They had only ever been the audio
element's load latency. Removing that latency — correctly — took the pause with
it, because the stall and the pause were the same accident. `SPEAK_GAP_MS = 420`
is deliberate now, and wants tuning alongside `SPEAK_LENGTH_SCALE` (currently
`1/0.7`).

## 9. THE ROOT CAUSE — inference was blocking the main thread

A sentence dropped out mid-word and resumed a few words later. Three theories
died before the diagnostics named it:

- **not a missing phoneme** — every symbol in that sentence is in the voice table
- **not an exception** — nothing thrown, nothing logged
- **not phonemiser instantiation** — measured at 9–24 ms, not seconds

The logs settled it:

    prefetched, waited 1640ms
    slow synth      1641ms          <- the same milliseconds
    audio WAITING / STALLED on that sentence

**An utterance reported as prefetched still waited the full synthesis time.**
That is only possible if the work was not progressing during playback — and it
was not, because **`session.run()` is synchronous WASM on the main thread.** It
blocks everything for its duration, including the audio element's own buffering.
So synthesising "ahead" bought nothing: the work could only happen when the main
thread was free, which is exactly when it was already needed.

Fixed with **`ort.env.wasm.proxy = true`**, which moves inference into a worker.
The prefetch also now starts on the element's `playing` event rather than
immediately before `play()`.

**A related but separate WebKit fault, found first**: pre-loading the next clip
into a second audio element stalls the playing one, because iOS restricts
concurrent media. Removing the load-ahead helped without curing it — the blocking
was underneath. Confirmed by the user: the fault appeared in Safari and iOS and
never in Firefox.

## 10. What made this findable

Nothing here was diagnosable by ear. Each round needed the run to report
something: whether the prefetch HIT, how long it waited, whether synthesis was
slow, whether the element stalled. **"Seems no different" and "not firing" are
indistinguishable without instrumentation**, and guessing between them cost the
most time in this session.

## Open

| item | note |
|---|---|
| iOS retest | desktop confirmed; the phone is the platform that decides |
| Root reads at boot without a gesture | `NotAllowedError` in the log — speech starts before any tap |
| `/api/speak`, `speech_cache/` | still present in server.js, unused. Phase 3 |
| Bench duplicates `speechTextFrom` | won't get the dash fix until reconciled — argues for one shared tokeniser |
| Paragraph vs sentence gap | `splitUtterances` discards paragraph structure, so both get 420ms |
| `confirm()` download prompt | works, not in BD's idiom |

