# Session notes — 2026-09-03

Speech stage 1. **Engine decided: Piper.** Six platform faults found and fixed
along the way, none of them a capability gap. Ends mid-investigation on the
pronunciation lexicon.

Bench: `speech_bench.html`, live at
`https://graph.virtualfictions.uk/speech_bench.html` (add `?iso=1` for
cross-origin isolation — **not needed**, see below). Results POST themselves to
`/private/tmp/bd_server.log` between `===== SPEECH BENCH =====` markers.

---

## 1. The decision

**Piper (vits-web, loaded from jsDelivr) on an iPhone 14 Pro Max, Safari 26.6.1:
RTF 0.17 isolated, 0.21 not.** Voice `en_GB-jenny_dioco-medium`, judged "fast and
just acceptable, hence useful". Confirmed working in Firefox.

**Kokoro is out.** Superb on desktop Chrome (RTF 0.06–0.08 at fp32) and 1.44–2.15
on the phone at every setting tried. The phone decides. Piper is also the
fine-tunable one, so the trade resolves twice over.

**Cross-origin isolation is NOT needed** — 0.21 unisolated against 0.17 isolated,
about 19%. This matters because isolation would block BD's embedded module
iframes (Kolam, music: GitHub Pages, whose CORP headers are not ours to set).
**Do not turn on COOP/COEP in BD.**

## 2. Six faults, none of them a platform limitation

Worth keeping, because each presented as "the platform cannot do this":

1. **phonemizer died at module evaluation** — `for await (c of readableStream)`.
   WebKit has never implemented `ReadableStream[Symbol.asyncIterator]`. Five-line
   polyfill, must run **before** the dynamic import.
2. **Kokoro fp16 distorted on Apple's WebGPU**; wasm clean at the same precision.
   **Distortion and slowness are different diagnoses.**
3. **vits-web threw `[unenv] fs.readFile is not implemented`** — on esm.sh only.
   Its piper chunk is Emscripten and picks its environment via
   `typeof process.versions.node == "string"`; **esm.sh shims `process`**, so the
   test passes in a browser and it takes the Node branch. **Use jsDelivr.** The
   same bundle fails in Chrome — never a Safari problem.
4. **Whole-passage synthesis froze the tab.** VITS generates an utterance in ONE
   pass. Split into sentences (cap 300 chars, clause fallback) and yield the main
   thread between them.
5. **Tab died at exactly 25 of 37, ten runs running.** A repeatable number is a
   limit, not a crash: synthesis runs ~5x faster than speech and each `predict()`
   grows the Emscripten heap, which never shrinks. **Backpressure** — wait until
   one utterance is pending before making the next.
6. **`await player.play()` on a zero-length silent WAV hung forever.** WebKit
   leaves the promise UNSETTLED rather than rejecting, so the catch never fires.
   Unlock by *calling* play() inside the gesture; never await it.

**Safari 18.5 vs 26.6.1 is the whole "Safari is hostile" story.** 26.6.1 has
WebGPU, writable OPFS and cross-origin isolation; 18.5 had none of the three.
Check the browser version before concluding a platform lacks something.

**COEP must be `require-corp`, not `credentialless`** — Safari does not implement
credentialless, so the header was silently ignored on the very platform being
measured. require-corp works in all three browsers, so it needs no detection.

## 3. WHERE THIS STOPPED — the pronunciation lexicon

Every Chinese name is currently mangled. Measured with espeak-ng, **now installed
locally** (`brew install espeak-ng`) so this is ground truth rather than guesswork:

| word | as-is | wanted |
|---|---|---|
| Zhuangzi | ʒjˈuːæŋzɪ | dʒwˈɑːŋdzɐ |
| Laozi | lˈeɪɒzɪ | lˈaʊdzɐ |
| Li Bai | lˈaɪ bˈaɪ (*lie bye*) | lˈiː bˈaɪ |
| Khwan | kˌeɪˈeɪtʃwˈæn (*spelled out*) | kwˈɑːn |
| Phing | fˈɪŋ (*fing*) | pˈʌŋ |
| Tao Te Ching | tˈaʊ tˈiː tʃˈɪŋ | dˈaʊ dɐ dʒˈɪŋ |

**Two alphabets, and I confused them.** The MODEL consumes IPA — its
`phoneme_id_map` is full of IPA characters. But espeak, which produces that IPA,
takes its OWN ASCII mnemonics in `[[...]]`. IPA is not an input format.

**The open question.** `[[dZw'A:Ndz@]]` works perfectly in espeak-ng locally — and
so does the string I earlier called failed, `[[dZw'aNdz@]]` → dʒwˈæŋdzɐ. So espeak
is not the problem. In the browser the user heard it **read out letter by
letter**, which points at **Piper's own text normalisation stripping the brackets
before phonemising**. That is the next thing to confirm.

**Fallback if brackets are stripped:** plain respelling, which needs no syntax and
cannot be mis-parsed. Its weakness is that it is a guess at English orthography —
measured, `Tow` gives tˈəʊ but `Dow` gives dˈaʊ, which is exactly why the user
asked about IPA in the first place.

Verify the mechanism with the SHORT default passage, not the Peng Bird — the log
reports how many substitutions were applied, so you learn whether it fired before
judging whether it fired correctly.

## 4. Other open items

| item | note |
|---|---|
| Speaking rate | Slider uses `playbackRate` (a time-stretch). Piper's real `length_scale` lives in the VOICE CONFIG FILE, not `predict()` args, so it needs the stored OPFS config patched to do properly. |
| `cori-high` | 108.9 MB against 60.3 MB for the mediums. Untried. Expect RTF ~0.4–0.6. |
| BD integration | Not started. `/api/speak` and `speech_cache/` come out; `speechTextFrom`, the Speak checkbox, interrupt/queue and the gesture unlock all survive. |
| First-use download | ~60 MB. Must not start because a checkbox was ticked by accident. |
| Her voice vs stock | Undecided, and deferrable — a fine-tune drops into the same path with no rework. |
