# Session notes — 2026-10-28

The voice-recording rig made safe for a second reader, a new training text, and
the pipeline run end to end on fourteen clips to prove the mechanism before the
real session.

Ended at **`viewer.js?v=891`**, `style.css?v=536`, canary **`--bd-css-build:
"2026-10-28a"`** (unchanged — `style.css` was not touched).

Rig: `http://localhost:8080/voice_record.html` · Listening:
`http://localhost:8080/voice_compare.html`

---

## 1. One directory per speaker

`VOICE_DIR = './voice_dataset'` was a single hardcoded path with no concept of a
speaker, and the prompt ids are fixed `0001`…`0063`. **A second reader would
have written over the first reader's set filename for filename, silently** — and
a voice dataset is the one artefact in the speech work that cannot be
regenerated. The author saw it before I did:

> *"Would it not be better if each session ended up in its own file with say a
> time stamp in the name — then we can test again and be absolutely sure my
> wife's ends up in a file of its own?"*

Clips now go to `voice_sessions/<YYYY-MM-DD_HHMM_label>/`. `/api/voice-clip` and
`/api/voice-status` **require** a valid session and refuse without one;
`/api/voice-session{,s}` open and list. **The refusal is the feature.**

**A session is a speaker's SET, not a sitting.** Resume finds the first prompt
*without* audio, so splitting one speaker across two directories would make both
halves restart from the beginning. Hence the rig remembers the open session in
`localStorage`, resuming is the default, and starting a new one is a deliberate
press.

Migrated in: `voice_dataset_will_01/` → `2026-09-06_1209_will` (the 63 takes of
the first fine-tune) and `voice_dataset/` → `2026-10-28_1103_will-mictest`.
`.gitignore` gained `voice_sessions/` and `voice_dataset*/` — the archive had
been resting on the `*.wav` line alone, which left its transcripts visible.

## 2. The permission dialog inside the hold

Testing the session bar, the author: *"the first record asks for microphone
permission but is actually recording during that time."* Worse than mistimed.

`startRec` **awaited** `ensureMic()`. The dialog opened inside the hold; he
released the button to answer it; `stopRec` ran while `recording` was still
`false` and returned having done nothing; the await then resumed and set
`recording = true` with the release already spent. **The first take ran away and
nothing could stop it** — his `0001` was 8.39 s holding about three seconds of
speech.

Two fixes, the second covering what the first does not:

- **The microphone is acquired when the session opens**, so permission is
  settled before any hold. His suggestion, and the right primary fix.
- **`holdActive`** records whether the button is still down. `stopRec` clears it
  first and unconditionally; `startRec` checks it after every await. A release
  during *any* slow await now says "hold the button again" rather than starting
  a recording that cannot end. `pointerleave` became unconditional.

Tested by slicing the real `startRec`/`stopRec` out of the page and driving them
through four orderings with a stubbed `ensureMic`. The same harness against the
pre-fix backup fails three of seven assertions, **so the test is not vacuous.**

## 3. A level threshold does not find speech — my own error, twice

Having asked for half a second of silence at each end, I measured the next takes
and reported the head silence as unchanged at 0.00–0.04 s. The author said he
*was* pausing. He was right, and every figure I had given him on that column
was wrong.

**The detector was "the first sample above 2% of the file's peak".** At a 40%
peak that sits at −42 dB, while the room floor is near −60 dB — so it was
finding the start of the **file**, not the start of the **voice**.

| | reported | actually |
|---|---|---|
| mic test | head 0.03–0.05 s | **0.75–1.06 s** |
| `1156_bill 0002` | tail 0.00 s, "last word cut off" | **0.92 s** |
| `1208_bill`, all six | head 0.00–0.04 s | **0.75–1.10 s** |

One clip in eleven was ever genuinely short. **Use sustained energy**: 10 ms RMS
windows, a threshold relative to the loudest window, ~50 ms of consecutive
windows required, run reversed for the tail — roughly what the Silero trimmer
does, so it answers the question actually being asked.

I then made the same mistake again, pointing at a "click" at the start of every
take from 20 ms *peak* readings. Measured properly, the first 50 ms of every
clip sits within ±2 dB of the rest of its own lead-in: **room tone, no click.**
The file edges land at or below the room floor, so starting capture mid-stream
leaves nothing audible either.

**The control was available all along.** The runaway clip's 2.5 s of real
silence read −78 dB where I was quoting −58 dB elsewhere. A 20 dB gap between
two clips recorded minutes apart in the same room was the measurement reporting
its own fault, and I explained it away instead.

## 4. Prompt set v3 — the Tao Te Ching

> *"maybe if they covered all the phonemes they could be used instead of the
> current set as they are more likely to elicit a generally relaxing voice"*

The register argument is the strongest available: a fine-tune learns **delivery**
more stubbornly than timbre, and v2's 63 prompts are plain narrative that would
train a plain reading. The standing objection — literary sources are the *worst*
candidates because espeak mispronounces archaic and foreign words — **does not
apply to this text**: all 210 distinct words in chapters 1–12 pass the ratio
test. The rule is about espeak, not about literature, so it must be tested
rather than invoked.

**Chapters 1–5 alone fail twice:** 2.2 min of speech against the 4.7 that
trained a usable voice, and five phonemes under the floor including `ʊ`, the
vowel in *book, put, could*.

**Three phonemes are absent at any length.** Chapters 1–25 — 12.3 minutes — still
leave `ɔɪ`, `ʒ` and `ɪə` thin. `ʒ` occurs in **six sentences in all 81
chapters**. So the gap-fillers were drawn from **later chapters** rather than
written, which keeps her from reading invented pseudo-scripture, and were
filtered for register too — half the `ʒ`/`ɔɪ` candidates are about weapons.

**The structure trap turned out to be a chunking problem.** Epigram rate is 51%
against v2's 54%, no worse. But chapter 2 has five consecutive *"X and Y … each
other"* lines and chapter 15 five one-clause similes, each one contour. Merging
consecutive short sentences breaks the uniform rhythm, keeps the text intact,
and removes clips too short to train on. The five-fold run became three
utterances of 81, 65 and 116 characters.

**Verified complete at three cut points**, because the author asked for a long
set he could end early:

| stopping at | utterances | speech | below 5 occurrences |
|---|---|---|---|
| **73** | 73 | 5.4 min | none — complete |
| 90 | 90 | 6.5 min | none |
| all | 125 | 9.0 min | none |

Lengths 45–131 characters, 2.7–7.8 s at his measured **16.7 chars/s** —
calibrated from his own takes, not guessed.

## 5. A dropdown, and the session bound to its choice

Files renamed so each set has a name rather than a version:
`voice_prompts_basic.*` (63) and `voice_prompts_tao.*` (125). `/api/prompt-sets`
feeds the dropdown; `/api/prompts?set=<id>` serves one in full.

**The choice is made when the session opens and the session is then bound to
it** — a prompt id is a POSITION, so resuming against the other text would offer
prompt 42 of one while the directory already holds prompt 42 of the other. The
dropdown is live until a session exists (switching it reloads the text, so both
can be read before committing) and disabled afterwards; **resume loads the set
the session names**. A session with no set, or naming one no longer on disk, is
refused for further recording rather than guessed at.

This replaced a mismatch *warning* added earlier the same day. The warning was
the right diagnosis and the wrong remedy.

## 6. The lexicon — a word in the training set

The author asked the question that had not arisen before: *"if a lexicon entry
appears in the training set, what happens?"*

**The two paths never meet.** Verified: piper's loader imports
`EspeakPhonemizer` and is handed only `espeak_voice` (`vits/dataset.py:25,172`),
with no lexicon parameter, and the phonemes cached by the completed run match
raw `espeak-ng` character for character. Training pairs the reader's audio with
**espeak's** phonemes; the lexicon governs only what BD *says*.

> **A training set is read the way ESPEAK says, never the way the LEXICON says.**

Then the author's rule retired the problem for this word:

> *"If it says Tao and she pronounces with a T as she will, then BD should say
> Tao. If it reads Dao she will say with D and BD should pronounce with a D.
> These are not different pronunciations of the same word but different words
> for the same concept."*

**espeak already does exactly that** — so the nine entries I had added were not
merely redundant, they **forced a /d/ onto the T-spellings**. All nine deleted,
including the pre-existing `Tao Te Ching` → `dˌaʊdədʒˈɪŋ`, which this rule
overrules. Where espeak is right, the entry *is* the mistake.

**Buddhist terms, from his list.** espeak is right about seven — *Buddha, Dharma,
Dukkha, Karma, Samsara, Nirvana, Nibbana* — which therefore get no entry. Six
were corrected: `Anicca` (Pali `cc` is /tʃtʃ/), `Shunyata` ("nya" split in two),
`Anatta` and `Anatman` (stress), `Gautama` (stress), `Siddhartha` (`th` as /θ/).

**Dictionaries settled two I had called matters of taste**, at his suggestion to
look them up. Wikipedia gives only Sanskrit and Pali transcriptions — and they
are unusable, since `[sɐŋɡʱɐ]` and `[d̪ʱɐm.mɐ]` contain `ʱ`, which the voice's
table lacks and `toIds` **drops**. The English dictionaries disagree with
espeak: `Sangha` has a hard **g** in OED, Collins and Merriam-Webster and an
`/h/` in none; `Dhamma` is OED `/ˈdɑːmə/` or `/ˈdʌmə/`, never espeak's `æ`.
`Kamma` has no English entry anywhere and is left open.

**Two constraints on any entry.** The phoneme map is **per character** —
`synthesise` spreads the IPA string, so `ɑː` enters as `ɑ` + `ː` — and a symbol
the table lacks is dropped silently, so every entry is checked against the
voice's `phoneme_id_map`. And there are only **ten placeholder slots**, which
wrap; but the ceiling is **per utterance**, and BD already splits per sentence,
so a glossary written one term per sentence peaks at 2 of 10 where the same
terms crammed into one sentence hit 13.

## 7. The mechanism run

Fourteen clips, 1.05 min of speech, 37–45 dB SNR, every text matching the set.

```
warmstart    784 parameters copied, 0 skipped
1000 epochs  39 minutes on MPS
best         epoch 449, val_mel 0.3537 — everything after scored worse
exported     61 MB, 0 missing phoneme symbols on both test sentences
```

**`val_mel` is not a progress bar, and the doc's warning earned itself twice.** I
read three rising values as overfitting; the fourth went on to the best score of
the run. I also declared the process dead when my own `pgrep` pattern used `\|`,
which is not alternation in that syntax.

**`voice_compare.html`** hears one voice on text it was trained on, text it was
not in the same register, text in a different register, and a long sentence that
splits at commas — because measurement showed the first three contain **no comma
pause at all**: BD breaks at a comma only past `maxLen` 150, and all three are
shorter.

**Pace and gaps are now shared, not copied.** `speech_timing.js` was extracted
from `viewer.js` and is imported by both — every number in it was tuned by ear
*against the others*, and a second copy would be adjusted once and then quietly
disagree. Extraction verified line by line: all 126 removed lines present
verbatim, the only additions the import and three pointers, imports matching
exports exactly.

## 8. THE REPO ROOT WAS PUBLIC — found at the end of the day

The author asked whether to give the voice a pseudonym. Checking what the files
actually carry led somewhere else entirely.

**`express.static('.')` serves the whole checkout.** Verified over the tunnel,
every one returning **200**:

| path | what it is |
|---|---|
| `/config.js` | **`CURATION_CODE`, `NEO4J_PASSWORD`, `PAIR_CODE`** |
| `/config.js.bak-20260908-091842` | the same secrets, older |
| `/voice_sessions/*/wav/*.wav` | every raw recording, 515 kB each |
| `/voice_sessions/*/metadata.csv` | the transcripts |
| `/backups/*.bak` | database dumps |
| `/MEMORY_SNAPSHOT.md` | the mirrored agent memory, 749 kB |

**Gitignoring protects the repository, not the server.** Every one of those is
in `.gitignore` and every one was being handed to anyone who asked. The two
lists are unrelated and must be maintained separately — that is the lesson, and
it is the same shape as *"no safe folder inside the checkout"* from the sample
pads, arriving from the other direction.

**And the voice API was an open write primitive.** Not supposed — proved: one
unauthenticated POST from the public internet to
`/api/voice-session?label=anonproof` created a directory on the machine, with
`/api/voice-clip` accepting 80 MB per request behind it. `/api/voice-sessions`
enumerated the directory names, so nothing had to be guessed. **My own
`/api/voice-sessions`, added this morning, is what removed the guessing.**

**Fixed in two parts.** A `PRIVATE_PATHS` deny list ahead of `express.static`
(deny rather than allow, because an allow list that misses an asset breaks the
site silently while a deny list that misses a file merely fails to protect it);
and `voiceGate` — `curationCodeOk()`, the project's one check, timing-safe — on
all eight voice endpoints. **Not an IP test: cloudflared makes every visitor
127.0.0.1, so a loopback check grants the whole internet.**

`voice_code.js` holds the code once in `localStorage` for both pages, never in
the URL. Verified: eight endpoints 403 from outside with nothing created, all
200 with the code, 403 on a wrong one, and BD itself — root, `viewer.js`,
`style.css`, `voices/`, a node URL, the Socket.IO handshake — untouched.

> **`voices/` is deliberately NOT denied.** The reader's browser does the
> synthesis, so the model must reach the client. That is the standing
> consequence recorded in §7 and below.

**The three secrets must be treated as compromised and changed.** They were
fetchable for as long as the tunnel has been up. Nothing suggests anyone looked
— the URL was not circulated and `/config.js` is not linked from anywhere — but
that is not evidence, and the `/n/` work exists precisely to start circulating
links.

## 9. "Is the never-heard card still never heard?" — 2026-10-29

The author, on first using the compare page against her trained voice:
*"Is the Never heard same text same register still 'never heard' — did you
invent it?"*

**No invention, and no excuse: it was prompts 0016–0017 of the real text.**
Unseen by `bd_mech_01`, which trained on 0001–0014 — and she recorded **125 of
125**, so for `ringlet` that card was reading back its own training data while
claiming the opposite. The one thing asserting otherwise was a label I wrote.

Replaced with chapters 20 and 22. **The prompt set stops at chapter 19**, so
anything beyond it is outside by construction, whatever a reader got through.

**Then the fix found a second instance I had missed.** The "different register"
card was two sentences spliced from the BASIC set — unseen by `ringlet`, who
never read it, but **training data for `bd_will_01` and `bd_mech_01`**. True for
one voice and false for another. Rewritten from scratch so it holds for all.

**A label is not a mechanism, so the page now checks its own claims.** On load
it fetches every prompt set and tests each card's sentences against them,
writing the verdict into the card: ✓ for the first card being *in* a set, ✓ for
the other three being outside one, ✗ and a log line otherwise. Verified against
the real sets — the old text fails, which is the proof the check works, and the
second instance is exactly what it caught.

## 10. What is still open

- **`Dhamma` now sounds identical to `dharma`** in non-rhotic British — correct
  English and OED's first form, but it erases the Sanskrit/Pali distinction.
  `dˈʌmə` keeps them apart. `Kamma` and `Sangha`'s vowel likewise await a
  decision.
- **A shipped voice is necessarily public.** Whatever BD ships as its default
  must reach the browser, so it is downloadable at a predictable URL. No way to
  gate it without gating speech. Raised before the recording; the author's to
  decide.
- **`make_quantised_voice.py` cannot quantise a local voice** — it is hardwired
  to download alba. A fine-tune exports at ~61 MB against the 19.4 MB default,
  and 60 MB was rejected once already.
- **Voice selection is one constant plus `?voice=`.** "Instead of alba" is a
  one-line change; "alongside" needs a picker built.
- Nothing supervises `node server.js` or `cloudflared`; neither survives a
  reboot. launchd jobs remain an open item.
