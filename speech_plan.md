# Speech in a personal voice — plan

**Goal.** BD reads node text aloud in a chosen personal voice (the author's
wife's), generated from arbitrary text rather than played back from recordings.

**The constraint that shapes everything: the corpus is expected to grow
greatly.** Any approach requiring a human to record each node is a dead end by
construction. So the target is a fine-tuned synthesiser: she reads a prepared
script once, and the model then speaks whatever the corpus becomes.

---

## Stage 0 — plumbing, throwaway voice · BUILT 2026-09-02 (`2b9785c`)

macOS `say`, deliberately the wrong voice. Everything around it is the part that
has to be right, and none of it cares whose voice comes out.

| piece | state |
|---|---|
| `POST /api/speak {text}` → m4a | built |
| cache keyed on `sha1(voice + text)` | built — 320 ms cold, 0.9 ms warm |
| `speechTextFrom` directive stripper | built, verified against real corpus text |
| Speak checkbox, persisted, iOS-gesture unlock | built |
| interrupt-on-tap / queue-on-arrival | built |
| `speech_cache/` gitignored | built |

**Measured payload ratio: 57 characters of text → 50 KB of audio, ~880×.** Lazy
per-node fetch is mandatory, not an optimisation.

### What stage 0 did NOT prove

`say` is system TTS, not a neural engine. **Untested: model install, inference
speed on this hardware, the phoneme front end, lexicon overrides, output
format, and total cache size across the corpus.** Those are exactly the things
that can make the plan unworkable, and none of them need her voice to test.

---

## Stage 1 — real engine, stock voice · NEXT

Same architecture, real synthesiser, one of **its own** supplied voices. This is
the test of the wiring that matters, and it is entirely independent of the
recording session.

**1. A backend seam in `server.js`.** The `say` exec is currently inline. Extract
it behind a small interface — `synthesise(text, outPath) → Promise` — selected by
`BD_SPEECH_ENGINE` (`say` | `piper` | …), with `say` retained as the fallback
that always works. The fine-tuned voice later is then a config change, not a code
change. **This seam is the whole point of stage 1**; the engine behind it is
replaceable, and will be replaced at least twice.

**2. Install one neural engine and run its stock en_GB voice through the seam.**
Candidate: **Piper** — CPU-fast, stock British voices, permissive licence,
espeak-ng front end (which is where lexicon overrides live), and a documented
fine-tune path from the same model family. *Verify currency before committing:
this field moves monthly and my knowledge has a cutoff.* The requirements to
check any candidate against are: runs locally (her voice never leaves the
machine), licence compatible with a free public site, stock voices now,
fine-tunable on ~1 hr later, and a pronunciation-override mechanism.

**3. Add the lexicon, and test it before it matters.** A small
`speech_lexicon.json` of word → phonemes, applied before synthesis. Seed it with
the corpus's actual hard cases — Zhuangzi, Laozi, Du Fu, Tao Te Ching. **Testing
this at stage 1 de-risks the thing most likely to embarrass the finished
system**, and it is testable with a stock voice.

**4. A corpus warm-up CLI.** Walk every node, generate, report total cache size
and wall-clock. That converts the storage question from an estimate into a
number, and gives the ingest-time generation hook its home. Run it against the
stock voice.

**Exit criterion for stage 1: a stock neural voice reads a Du Fu passage,
pronounces the names from the lexicon correctly, and the whole corpus generates
in a known time into a known number of megabytes.** Nothing about her voice is
needed to reach it — and if any of it fails, it fails before anyone has spent an
hour recording.

---

## Stage 2 — the recording session

Only after stage 1 passes.

- **Script**: a phonetically-balanced prompt set *plus* a couple of hundred lines
  drawn from the actual corpus. Standard sets do not cover archaic diction,
  poetry line breaks, or transliterated names, and those are exactly where a
  synthesised voice embarrasses itself.
- **Register is not a detail.** The fine-tune learns delivery, not just timbre.
  If she reads briskly, the corpus is read briskly forever. The script should be
  literary prose at the pace BD actually wants.
- **Conditions beat quantity.** One room, one mic position, 3 × 20 min with
  breaks, same day. Inconsistent conditions poison a fine-tune — the model learns
  the room as part of the voice.
- **The capture rig mostly exists**: the SR editor already does AudioWorklet
  direct-PCM capture, chosen because MediaRecorder truncated on Safari. Whisper
  is in there too — useful for *verifying* she read what the script said, not for
  generating transcripts, which are known in advance.

## Stage 3 — fine-tune, then lexicon refinement

Train, swap the engine config, listen. Then extend the lexicon for whatever it
says wrong — **which is fixable precisely because it is a dictionary and not a
hope about what the training absorbed.**

---

## Settled questions

**Mandarin tones: not pursued.** IPA has the notation (Chao letters), and
espeak-ng handles Mandarin, but an English TTS model has no tone dimension in its
phoneme inventory — the tones evaporate at the model whatever the lexicon says.
Going tonal mid-English-sentence would also sound affected, and the corpus is
English translations. The real risk is *zwang-zee*, a spelling-rules failure, and
that is what the English-phoneme lexicon fixes.

If authentic Mandarin is ever wanted, a multilingual model that can code-switch
is the route — **but that is a stage 1 model choice, not a stage 3 addition.**

## Open

| item | note |
|---|---|
| Engine choice | verify currency; check licence for a free public site |
| Total cache size | unknown until the warm-up CLI runs |
| Generation trigger | on-demand now; ingest-time hook wanted once the corpus grows |
| Speech vs music | speech uses a plain `Audio`, separate from `#media-bar` — they can overlap |
| Cache eviction | none. Fine while the corpus is small; needs a policy later |
