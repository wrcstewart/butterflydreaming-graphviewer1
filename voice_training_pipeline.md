# Voice training — the pipeline, as built and as proven

**2026-09-06.** A fine-tuned Piper voice now runs in BD, trained on the author's
own reading. This is the as-built record: what exists, what broke, how to run it
again, and what to do differently when the real recording happens.

Companion documents: `speech_plan.md` (the staged plan), `session_notes_2026-09-03…05.md`
(how the engine was chosen), `voice_prompts_basic.md` and `voice_prompts_tao.md`
(the two prompt sets and their reasoning).

---

## 1. Why the voice is synthesised on the device

BD derives every high-data presentation **on the client**. The only exception is
one-off `.mp3` files for the HTML player. The system is designed to scale to
thousands of readers, and speech for a growing corpus would otherwise become a
permanent, centralised bandwidth cost.

This is a hard rule, not a preference: **if it cannot run in the browser it is
not viable.** Server pre-computation was considered and rejected — caching fixes
CPU, not the bandwidth of shipping audio to everyone.

The consequence that makes it work: **the model never sees words, only phoneme
ids that espeak derives from spelling.** So a voice trained on six minutes of
audio can read a corpus of any size, and the corpus can grow without retraining.

---

## 2. What now exists

| piece | where | what it does |
|---|---|---|
| `voice_record.html` | repo root | recording rig — AudioWorklet direct PCM, resumable, warns on clipping/quiet/short |
| `voice_prompts_basic.json` / `.md` | repo root | **Basic** — 63 plain sentences, 45 phonemes, none below five |
| `voice_prompts_tao.json` / `.md` | repo root | **Tao Te Ching** — 125 utterances from chapters 1–19, complete at 73 |
| `/api/prompt-sets`, `/api/prompts` | `server.js` | lists the sets for the rig's dropdown; serves one in full |
| `/api/voice-session{,s}`, `/api/voice-clip`, `/api/voice-status` | `server.js` | opens and lists sessions; writes each take into the named one |
| `voice_sessions/<session>/` | repo root, gitignored | `wav/NNNN.wav` + `metadata.csv` in LJSpeech layout, **one directory per speaker** |
| `~/bd_voice_train/venv` | outside the repo | Python 3.12, torch 2.14 + MPS, piper-tts 1.8 |
| `~/bd_voice_train/train_bd.py` | outside the repo | training launcher — see §5.5 |
| `~/bd_voice_train/export_bd.py` | outside the repo | ONNX export — see §5.6 |
| `voices/<name>.onnx{,.json}` | repo root, gitignored | what BD loads via `?voice=local/<name>` |

**Nothing voice-related is committed.** `voice_sessions/`, `voice_dataset*/`,
`voices/`, `*.wav` are gitignored. The repository is public, and a fine-tune
*is* someone's voice.

### Prompt set v3 — Tao Te Ching chapters 1–19 (2026-10-28)

**Why change the text at all.** v2's 63 prompts were plain modern narrative,
chosen to dodge espeak traps and cover phonemes evenly. They would train a plain
reading, and **a fine-tune learns delivery most stubbornly of all.** BD wants an
unhurried voice, so the text has to be unhurried itself. The author's proposal.

**Why this text survives the standing objection.** "Literary source texts are
the worst candidates" because espeak mispronounces archaic and foreign words,
pairing the reader's audio with the wrong phonemes. Measured, not assumed:
**every distinct word in chapters 1–19 passes the ratio test.** The McDonald
translation is plain modern English and contains no Chinese term but *Tao*.

**The one pronunciation that must be settled before recording, and it is the
reverse of the obvious.** espeak says **`tˈaʊ` — "TOW", rhyming with *now*, hard
T.** A reader who knows the authentic "DOW" pairs their [d] with espeak's /t/,
and /t/ recurs throughout English. Either read it espeak's way, or add a lexicon
entry. "Tao" appears 5 times in chapters 1–12.

**Three phonemes are absent from this text at any length.** `ɔɪ` (*voice,
choice, point*), `ʒ` (*vision, measure*) and `ɪə` (*here, near, clear*) are
still below five occurrences at chapter 25 — 12.3 minutes of text. `ʒ` occurs in
only **six sentences in all 81 chapters**. Utterances carrying the three were
drawn from later chapters and placed **inside the first 73**, so stopping early
never costs coverage.

**Chunking, not raw sentences.** Two runs are the structure trap in pure form —
chapter 2's five consecutive *"X and Y … each other"* lines and chapter 15's
five one-clause similes. Merging consecutive short sentences into one take
breaks the uniform contour while leaving the text intact, and avoids
one-second clips too short to train on. A colon introducing a list is also a
break.

**Where it is safe to stop.** The author asked for a long set he could end
early. Verified at three cut points:

| stopping at | utterances | chars | speech | phonemes below 5 |
|---|---|---|---|---|
| **73** | 73 | 5,395 | **5.4 min** | none — complete |
| 90 | 90 | 6,517 | 6.5 min | none |
| all | 125 | 9,021 | 9.0 min | none |

Lengths run 45–131 characters, 2.7–7.8 s at the author's measured 16.7 chars/s.
The reader picks the set from a dropdown when the session opens, and the
session is then **bound** to it — see the next section.

### A LEXICON WORD IN THE TRAINING SET (2026-10-28)

The author asked the question, and it had not arisen before: *"if a lexicon
entry appears in the training set, what happens?"*

**The two paths never meet.** Verified rather than asserted: piper's loader
imports `EspeakPhonemizer` and is handed only `espeak_voice`
(`vits/dataset.py:25,172`) — there is no lexicon parameter anywhere in it, and
the phonemes cached by the completed run match raw `espeak-ng` output character
for character. So:

- **Training** pairs the reader's audio with **espeak's** phonemes.
- **Synthesis** applies the lexicon, through `piper_direct.js`, to decide what
  BD *says*.

**The basic set contains no lexicon word at all** — measured, zero of 63, which
is why this never came up. **The Tao set contains "Tao" 13 times across 10
prompts** (0001, 0022, 0033, 0039, 0073, 0089, 0090, 0109, 0110, 0117).

**That divergence has since been removed, by the author's rule:** *"These are
not different pronunciations of the same word but different words for the same
concept."* `Tao` is read with a T and `Dao` with a D, each as spelled — which is
what espeak does unaided, so the nine lexicon entries for the family were
deleted. Reading, training and synthesis now all agree, and the question below
is left standing because the RULE it produced outlives this particular word.

**The hazard is the REVERSE, and this is the rule to carry:**

> **A training set is read the way ESPEAK says, never the way the LEXICON says.**

If she reads it "DOW" — the pronunciation she knows — her [d] audio is paired
with espeak's /t/, and /t/ is everywhere in English. Those 13 instances are only
3.1% of the set's 417 /t/ tokens, so the damage would be small; but the rule
matters more as sets grow, and nothing about the spelling on screen warns a
reader which way to go.

**The MECHANISM for carrying such an instruction exists and is currently
unused.** A set may carry a `reading_notes` array (`match`, `say`, `why`);
`/api/prompts` passes it through; and the rig shows the note **above** the
sentence on exactly the prompts matching it — word-boundary and
case-insensitive, so "tao" and "Tao" in one sentence would both trigger while
*tautology* and *Taoism* would not.

**No set carries a note today.** One was added for "Tao" and withdrawn the same
day at the author's request — *"I don't want the warning about Tao, it's not
necessary"* — and he is right: once the lexicon entries went and `Tao` is read
as spelled by reader, trainer and synthesiser alike, there is no divergence to
warn about. The note was mitigating a hazard that the rule had already removed.

The mechanism is kept because **the rule above will recur**: any future set
containing a word espeak gets wrong, which the reader must nonetheless read
espeak's way, needs exactly this. An empty array shows nothing.

**When adding a lexicon entry, check both prompt sets for it.** One line:

```sh
python3 - <<'EOF'
import json, re
lex = json.load(open('speech_lexicon.json'))
for f in ['voice_prompts_basic.json', 'voice_prompts_tao.json']:
    for p in json.load(open(f))['prompts']:
        for k in lex:
            if re.search(r'\b' + re.escape(k) + r'\b', p['text'], re.I):
                print(f, p['id'], k, lex[k])
EOF
```

### Choosing a set, and the session being BOUND to it (2026-10-28)

The rig has a dropdown — **Basic** or **Tao Te Ching** — live until a session
opens, so the reader can look at both texts before committing. Switching it
reloads the prompts immediately.

**The choice is made when the session opens and cannot be changed afterwards.**
`/api/voice-session` takes `&set=<id>`, stamps it into `prompt_set.json`, and
the dropdown is then disabled. On resume the rig loads **the set the session is
bound to** rather than whatever the dropdown shows — which is the whole point:
otherwise prompt 42 of the new text would be offered to a session that already
holds prompt 42 of the old one.

A session carrying no set, or one naming a set no longer on disk, is **refused
for further recording** rather than guessed at: its clips stay safe and the
reader is told to start a new session. Sessions stamped before the sets were
named are read as `basic` (version 3 as `tao`) and the inference is logged.

### A prompt id is a POSITION, not a sentence (2026-10-28)

`0042` in v2 and `0042` in v3 are different sentences, so a session's clips only
mean anything alongside the set that produced them. `/api/voice-session` now
stamps `prompt_set.json` into each session directory, `/api/voice-status`
returns it beside the current one, and **the rig refuses to add to a session
whose set does not match**, saying which is which. Without that, resuming an
older session hands the reader the new text under the old numbers and the set
ends up half one text and half another, looking complete throughout.

The five pre-existing sessions were stamped `{"version":2,"count":63}` — checked
row by row against `voice_prompts_basic.json` first, 63/63 and 3/3 and so on, not
assumed from their dates.

### One directory per speaker (2026-10-28)

A session is named `YYYY-MM-DD_HHMM_<label>` — the label is whose voice it is —
and the rig **refuses to record until one is open**. Until this change there was
a single hardcoded `voice_dataset/`, so a second reader's takes would have
landed on the first reader's, filename for filename, without warning.

**A session is a speaker's set, not a sitting.** It is opened once and resumed
across as many sittings as the set takes; the rig remembers the open session in
`localStorage` and reopening the page continues it. That distinction is
load-bearing — resume works by finding the first prompt *without* audio, so
splitting one speaker across two directories would make both halves restart from
the beginning. "Start a new session" is therefore a deliberate act, and changing
session never touches a clip.

Existing sets were migrated into the scheme:

| was | is now |
|---|---|
| `voice_dataset_will_01/` | `voice_sessions/2026-09-06_1209_will/` (63 takes, the first fine-tune) |
| `voice_dataset/` | `voice_sessions/2026-10-28_1103_will-mictest/` (3 takes, a mic test) |

### The recording chain, and the gain (2026-11-01)

**The chain, as the author confirmed it:**

| | |
|---|---|
| microphone | **Rode NT1 5th Gen** |
| connection | **USB-C, direct to the Mac** — the preamp and converter are INSIDE the microphone |
| interface | **none.** The Focusrite iTwo is out of the chain entirely |
| mount | SM6 shock mount with its pop screen, on a tabletop stand |
| pop screen | started ~3 cm from the capsule; **moved TOWARDS THE MOUTH, which the author found works better** (2026-11-01, by ear) |
| system input gain | **50% on the macOS slider** |
| captured as | 48 kHz mono, written 16-bit PCM by `voice_record.html`'s `encodeWav` |

**Why the connection matters to the notes.** On USB-C there is no external
preamp to blame or to adjust: the gain slider is acting on Rode's own input
stage, and the improvement measured on 31 Oct over every earlier microphone is
that stage, not the iTwo's. It also locates the 32-bit float the author raised:
it exists in the microphone's USB path, but the rig clamps to +/-1.0 and writes
16-bit, so the ceiling in practice is **ours, not the microphone's**.

**Reference measurements.** All figures A-weighted, floor by the robust
percentile estimator (see `voice_snr.js`); S/N is gain-invariant, the floor is
not.

| clip | when | peak | speech RMS | floor dB(A) | S/N dB(A) | pause head/tail |
|---|---|---|---|---|---|---|
| `rode1/0001` | 31 Oct 18:04 | −0.3 dBFS | −16.3 | −77.6 | **51.9** | 2.21 / 8.86 s |
| `rode1/0002` | 1 Nov 10:09 | −5.0 dBFS | −20.9 | −75.7 | **46.7** | 2.55 / 5.19 s |
| `rode4/0001` | 1 Nov 11:48 | −10.7 dBFS | −26.4 | −83.1 | **50.6** | 1.35 / 0.91 s |

**Only `rode4/0001` is confirmed at 50%.** The author gave that figure after
that take. The two earlier clips were at an unknown, higher setting, and an
unkept take shortly before `rode4` clipped outright at peak 100% — so the
slider had been well above 50% and was brought down. The floors are consistent
with that: −83.1 at 50% against −75.7 and −77.6 earlier.

**THE FLOOR IS THE GAIN'S FINGERPRINT.** At a fixed slider position it is
reproducible, so `floor ≈ −83 dB(A)` is the marker for "the gain is where it was
when it worked". A reading of −75 means the slider has moved up by about 8 dB
whatever its position claims. This is the only cross-check available, because
macOS does not report the slider position to the page.

**Moving the slider cannot improve the signal-to-noise.** Measured across a
24.3 dB sweep of recording level on 64 clips: S/N slope **+0.13 dB/dB**
(r² = 0.02) while the absolute floor rose **+0.87 dB/dB** (r = 0.70, r² = 0.49). Gain
lifts voice and floor together. The slider buys **headroom only**; S/N comes
from proximity and projection. At 50% the peak sits at 29% of full scale, which
is ample headroom, so there is no reason to raise it.

**What the rig now says about a take**, with thresholds derived from every clip
in the project (`voice_record.html`, `SNR_YES` / `SNR_WARN`):

```
  YES       S/N >= 45      the three Rode takes: 46.7, 50.6, 51.9
  MARGINAL  40 to 44
  NO        S/N <  40      her ringlet set, which audibly learned the
                           whirr, topped out at 40.0
```

Across all 158 clips recorded here, every Rode take passes and nothing else
does; the ringlet set reads NO on 112 of its 113 measurable clips.

### The pop screen belongs near the MOUTH, not near the capsule (2026-11-01)

The author, after trying it: *"the pop screen seems to work better further from
the mike ie nearer my mouth"*. This is the opposite of how pop screens are
usually mounted, and he is right on the acoustics.

**A screen does not absorb a plosive, it breaks it up.** A pop is a JET of
moving air, and a diaphragm responds to air actually crossing it with a large
low-frequency excursion that has nothing to do with the acoustic signal. The
mesh converts that coherent jet into fine-scale turbulence — **and turbulence is
itself a noise source.** So the one thing you want is for it to happen as FAR
FROM THE DIAPHRAGM as possible, where it can decay and spread before arriving.
With the screen 3 cm from the capsule, the turbulence is being manufactured
essentially at the microphone.

Moving it towards the mouth also removes any screen-to-capsule reflection (the
comb filtering tested for below) and takes the screen out of the capsule's near
field. **The conventional "mount it close to the mic" is about mechanics, not
acoustics** — the clamp is on the mic stand, and on the SM6 the screen is part
of the shock mount. Nothing acoustic recommends that position.

Two costs to accept: a screen nearer the mouth collects more moisture, so it
wants airing between sessions; and it can sit between the reader and the text.

**WHATEVER POSITION IS CHOSEN, FIX IT AND DO NOT MOVE IT WITHIN A SET.** The
model learns whatever is consistent across the clips — that is the whole lesson
of the ringlet voice reproducing the whirr — so a screen that migrates between
takes puts a varying colouration into the training data. Uniform is worth more
than optimal.

**Not yet measured.** The finding is by ear and the experiments left no clips. To
confirm it: one plosive-heavy line recorded twice, screen near the capsule and
screen near the mouth, nothing else touched. The measure is peak 20–120 Hz
energy during speech relative to the speech level, where a pop appears as a
large low-frequency transient.

**The screen at 3 cm — checked for comb filtering, NOT FOUND.** A reflector
3 cm from the capsule gives a 6 cm extra path, a 0.175 ms delay, and therefore
cancellation notches at **2.86 kHz and 8.58 kHz**. That is a specific enough
prediction to test, so it was: the long-term speech spectrum of all three takes,
smoothed to ~55 Hz and expressed as deviation from its own ~1.4 kHz trend.

| take | near 2.86 kHz | near 8.58 kHz | worst dip anywhere 0.5–12 kHz |
|---|---|---|---|
| `rode4/0001` | −3.7 dB at 2684 Hz | −3.7 dB at 8602 Hz | −8.3 dB at 5373 Hz |
| `rode1/0002` | −5.6 dB at 2830 Hz | −6.2 dB at 8648 Hz | −7.2 dB at 1119 Hz |
| `rode1/0001` | −3.8 dB at 2783 Hz | −2.7 dB at 9627 Hz | −9.8 dB at 5959 Hz |

There are dips near both predicted frequencies, and two of the three land within
about 70 Hz of the second one, which is suggestive. **But it is not a finding:**
the deepest dips in each take are 7 to 10 dB and sit at frequencies the model
does not predict, so a 3–6 dB dip at a predicted frequency cannot be separated
from the ordinary lumpiness of a speech spectrum. The SM6's screen sits at that
distance by design, so nothing is recommended here.

If it ever matters, the clean test is an A/B: the same line twice, screen on and
screen off, nothing else touched. A real reflection would put a repeating notch
in one and not the other, and no amount of formant structure can imitate that.

**Two artefacts of the rig itself, both characterised and both handled:**

- **A trigger impulse at t=0 of every take** — the record button, through the
  desk and through the air: +6.2 and +6.6 dB of 20–90 Hz on two takes, −40 to
  −44 dBFS broadband over the first 100 ms against a settled floor of −57. The
  first 300 ms is excluded from both the speech search and the noise window. It
  sits ~2 s before the first word, so piper's 0.25 s keep discards it.
- **The reader's own breath and mouth clicks inside the pause** — one isolated
  50 ms burst at −62 dB, 0.4 s before the first word of `rode4/0001`, inflated
  a mean-based floor by 12.0 dB. Hence the percentile estimator.

---

---

## 3. The first fine-tune — what happened

**Recording.** 63 prompts in 14 minutes. 6.2 minutes of speech, 48 kHz mono
16-bit, mean 5.9 s, range 3.4–10.0 s. Nothing clipped, nothing silent, nothing
truncated. Median RMS 0.049.

> **48 kHz is correct, and `--model.sample_rate 22050` does not contradict it.**
> Checked 2026-10-28 when a mic test read 48000 and looked like a fault. The rig
> captures at whatever rate the device gives (it only warns *below* 22050), and
> piper's loader resamples on the way into the cache:
> `librosa.load(path, sr=self.sample_rate)` at `piper/train/vits/dataset.py:370`.
> Recording at 48 k and coming down beats capturing at 22 k. All 63 takes of the
> first fine-tune were 48 kHz.

> **Leave about half a second of silence at each end of a take.** The loader
> trims each clip with a Silero VAD and keeps `keep_seconds_before_silence =
> 0.25` / `..._after_silence = 0.25` (`dataset.py:70-71`), clamped by
> `max(0, …)` and `min(audio_seconds, …)`: it can only keep silence that is
> **actually there**. A full second is harmless — trimmed back to 0.25 s — just
> slower to record.

> **MEASURING that margin: a level threshold does not find speech.** On
> 2026-10-28 I reported a reader's takes as having 0.03–0.05 s of head silence
> and asked him to pause longer. He already was: remeasured, every take had
> **0.68–1.10 s**. The detector was "first sample above 2% of the file's peak",
> and at a 40% peak that threshold sits at −42 dB — which low-level room content
> in the first few hundredths of a second clears easily, while the room floor
> proper is around −60 dB. It was finding the start of the *file*, not the start
> of the *voice*.
>
> **Use sustained energy**: 10 ms RMS windows, a threshold relative to the
> loudest window, and require ~50 ms of consecutive windows above it. Run it
> over the reversed signal for the tail. That is also roughly what the Silero
> VAD does, so it answers the question actually being asked — what will the
> trimmer call speech.

**One clip excluded.** `0001` was a level-finding take at **0.35× the median
RMS** — a third the level of everything else. The author chose to exclude rather
than re-record.

> **Exclude in a staged copy, never in the session's own `metadata.csv`.** The
> recorder REWRITES that manifest on every Keep, so a filter applied there is
> silently undone by the next take. `~/bd_voice_train/dataset/metadata.csv` holds
> the filtered list; the WAV directory is symlinked so there is still one copy of
> the audio.

**Coverage survived the exclusion** — re-counted, not assumed: 62 lines, all
phonemising cleanly under `en-gb-x-rp`, 45 distinct phonemes, none below five
occurrences.

**Training.** 1000 epochs, batch 12, ~2.5 s/epoch on MPS, **42 minutes**.
Warmstarted from `en_GB-alba-medium`: 784 parameters copied, 0 skipped.
`val_mel` fell 0.523 → 0.41. Exported epoch 869.

> **Do not read `val_mel` as a progress bar.** piper's own source says mel L1
> saturates early in VITS while the adversarial losses keep removing audible
> artifacts. It is a checkpoint-selection key. The verdict is by ear.

**Result.** Judged "quite appropriate and intelligible and not too automated" —
from 6.2 minutes. The pipeline is proven end to end.

---

## 4. Running it again

Assumes the venv and the fixes in §5 are already in place.

```bash
cd ~/bd_voice_train

# 1. Stage the dataset (exclude any takes you do not want)
mkdir -p dataset
SESSION=2026-09-06_1209_will        # which speaker's set to train on
SRC=~/butterflydreaming_graphviewer1/voice_sessions/$SESSION
grep -v '^0001|' $SRC/metadata.csv > dataset/metadata.csv
ln -sfn $SRC/wav dataset/wav

# 2. Base checkpoint (846 MB, once)
mkdir -p base && cd base
B=https://huggingface.co/datasets/rhasspy/piper-checkpoints/resolve/main/en/en_GB/alba/medium
curl -sL "$B/config.json" -o alba.config.json
curl -sL "$B/epoch%3D4179-step%3D2101090.ckpt" -o alba.base.ckpt
cd ..

# 3. Fine-tune  (~2.5 s/epoch on MPS)
./venv/bin/python train_bd.py fit \
  --data.csv_path dataset/metadata.csv --data.audio_dir dataset/wav \
  --data.cache_dir cache --data.config_path base/alba.config.json \
  --data.espeak_voice en-gb-x-rp --data.voice_name <NAME> \
  --data.batch_size 12 --data.validation_split 0.1 \
  --data.num_test_examples 0 --data.num_workers 0 \
  --model.sample_rate 22050 --model.mos_metric none \
  --model.warmstart_ckpt base/alba.base.ckpt \
  --trainer.accelerator mps --trainer.devices 1 --trainer.precision 32 \
  --trainer.max_epochs 1000 --trainer.check_val_every_n_epoch 10 \
  --trainer.enable_progress_bar false --trainer.default_root_dir runs/<NAME>

# 4. Export the best checkpoint
./venv/bin/python export_bd.py \
  --checkpoint runs/<NAME>/lightning_logs/version_0/checkpoints/<best>.ckpt \
  --output-file export/<NAME>.onnx

# 5. Config beside the model, then install
python3 - <<'PY'
import json
c = json.load(open('base/alba.config.json'))
c['dataset'] = '<NAME>'; c['audio']['quality'] = 'medium'
json.dump(c, open('export/<NAME>.onnx.json','w'), indent=2, ensure_ascii=False)
PY
cp export/<NAME>.onnx* ~/butterflydreaming_graphviewer1/voices/
```

Then `?voice=local/<NAME>`.

**The `.onnx` and `.onnx.json` are inseparable.** The config carries
`phoneme_id_map`, without which BD cannot turn phonemes into ids at all. The
fine-tune never changes the phoneme inventory, so the config is alba's with the
identifying fields renamed.

**Verify before showing anyone.** Synthesise one sentence through the *same* id
convention `piper_direct.js` uses — `[^, _, p, _, …, $]` — and check for missing
symbols. A symbol absent from the map is **silently dropped**.

---

## 5. Seven things that broke, and why

None was a capability gap. Five were the installed toolchain disagreeing with
itself; two were version drift in PyTorch.

### 5.1 `pysilero-vad` violated piper's own pin
3.4.0 was installed where piper declares `<3,>=2.1`. The method was renamed
across the major (`process_array` → `process_samples`), so silence trimming died
on the first clip. **Fix:** `pip install "pysilero-vad<3,>=2.1"`.

### 5.2 The wheel ships `monotonic_align/setup.py` but not `core.pyx`
The Cython extension can therefore never be built from the installed package.
**Fix:** take `core.pyx` from `OHF-Voice/piper1-gpl` at the matching path, and
build it. `build_ext --inplace` compiles but then fails to *copy* — it infers a
full package path relative to the wrong root — so copy the `.so` by hand out of
`build/lib.*/`. Cython itself was also missing (part of piper's `train` extra).

**Prove it runs, not merely imports.** A compiled extension can import and still
be the wrong ABI.

### 5.3 The alba checkpoint pickles `PosixPath`
torch ≥2.6 refuses that under `weights_only=True`. Resaving a sanitised
checkpoint works but is unnecessary, and `--ckpt_path` additionally tries to
reconstruct CLI arguments from the old hyperparameters and fails on keys the new
CLI does not know.
**Fix:** use **`--model.warmstart_ckpt`** — the intended fine-tune entry point.
It copies matching-shape parameters into a *fresh* model, loads permissively, and
avoids resuming at the base model's epoch 4179.

### 5.4 `validation_split 0` writes no checkpoints at all
With no validation set the validation loop never runs, so `ModelCheckpoint` never
fires and nothing is written until fit ends. A 1000-epoch run would be
all-or-nothing with no way to stop early and listen.
**Fix:** `--data.validation_split 0.1`. Six held-out clips buy periodic
checkpoints and a loss curve. That is worth more than six extra training clips.

### 5.5 piper's second `ModelCheckpoint` monitors `val_mos` and raises
Its source comment says a missing MOS predictor is skipped harmlessly. This
Lightning version raises `MisconfigurationException` on the first validation
instead — which killed a run at epoch 10.

**`--trainer.callbacks` does not help: Lightning MERGES CLI callbacks with
`trainer_defaults` rather than replacing them**, producing three checkpointers
and a duplicate-`state_key` error.
**Fix:** `~/bd_voice_train/train_bd.py` — a launcher whose only job is to supply
`trainer_defaults` in code, the one place the list can actually be replaced.

### 5.6 `onnxscript` missing, then the dynamo exporter trips an assert
torch 2.14's `torch.onnx.export` defaults to the dynamo path, which traces into
the rational-quadratic spline in the duration predictor and trips
`assert (discriminant >= 0).all()`. The assertion is correct at run time; it is
the *symbolic* trace that cannot satisfy it.
**Fix:** `pip install onnxscript`, then export with **`dynamo=False`** —
`~/bd_voice_train/export_bd.py`.

### 5.7 `timeout` does not exist on macOS
Minor, but it silently changed a command's meaning. Use a background launch and
poll, or `gtimeout` from coreutils.

---

## 6. Also changed this session — the speech offer

Unrelated to training, but part of the same delivery.

**The speech dialog is now asked on every visit, and is identical every time.**
It used to remember the answer, so declining once removed the offer permanently;
the only route back was noticing the small Speak checkbox, which is the discovery
problem the dialog exists to solve.

That was the wrong *model*, not a missing escape hatch. **Whether you want sound
depends on where you are** — a train, an office, someone asleep next door, no
headphones. That is a property of the occasion, not of the person.

A first pass gave returning readers a shortened form. It was reverted the same
session: the variation cost two persisted flags, a branch in the builder, a
spacing rule and a genuine question about which flag the download warning should
key on. **One dialog, always the same, is simpler to reason about and simpler to
meet.**

`bd_speak` and `bd_speak_explained` are retired and cleared at boot. Nothing
seeds the checkbox, which makes "it began speaking while I was reading the
dialog" structurally impossible. `bd_speak_dl` survives but belongs only to the
checkbox path, stopping the download `confirm()` re-firing on every tick.

---

## 7. Next — recording the author's wife

Planned for the following two weeks. The author will supply prose she writes for
her online mindfulness group, to be chunked into a training set.

### Why her own writing is the right source

The register problem solves itself. The standard phonetic sets (CMU Arctic,
Harvard) are plain narrative and would train a plain reading **permanently** — a
fine-tune learns delivery most stubbornly of all. Prose she wrote to be read
aloud to a group, in her own voice, carries exactly the unhurried attentive tone
BD wants. It will beat anything invented for the purpose.

### Three checks before any of it is used

**1. Contemplative vocabulary is precisely the espeak trap.** Terms like *metta,
vipassana, samadhi, dukkha, sati, tonglen, pranayama, savasana, qi, tao* will be
mispronounced. Training then pairs the reader's audio with the WRONG phonemes,
and those phonemes recur throughout ordinary English — so one mangled word
corrupts far more than itself. This is the same reason literary source texts are
the worst candidates, not the best.

*Every such term must be run through espeak and either removed, replaced with an
everyday equivalent, or given a lexicon entry and checked.* Proper names —
teachers, authors — carry the same risk.

**2. Phoneme coverage must be measured, not assumed.** Counting beats scanning:
in the current set /z/ looked absent by eye and occurs 45 times. Her prose will
have its own gaps; top them up with a handful of extra sentences rather than
hoping.

**3. Structure and length distribution.** Check for homogeneity — an earlier
draft of the current prompts was ~58% two-member epigrams, a shape that trains
one characteristic contour and then imposes it on flat prose. Mixed lengths
matter because prosody spans clauses.

### The screening step, concretely

When the text arrives, before any chunking:

1. **Phonemise every line** with `EspeakPhonemizer().phonemize('en-gb-x-rp', text)`
   and flag any word espeak spells out letter by letter, plus every term from the
   list above. Do not eyeball this — the failure is silent.
2. For each flagged word, decide: **remove the sentence**, **replace the word**
   with an everyday equivalent, or **keep it and add a lexicon entry**, then
   re-check. Keeping a term is only worth it if BD will need to *say* it.
3. **Count phonemes across the whole set** and top up the gaps with extra
   sentences. Counting beats scanning.
4. **Report the length and structure distribution** before recording starts, not
   after — that is the last moment a homogeneity problem is cheap to fix.

### Chunking

One utterance per line, `NNNN|text`, ideally 3–12 seconds. Split on sentences;
keep clause punctuation attached.

### The thing that gets harder at this scale

An hour of speech is roughly **600 utterances**, or about **two and a quarter
hours of sitting** once holding, releasing and keeping are counted. Breaks are
therefore unavoidable, which makes the acoustic-consistency discipline essential
rather than optional:

- **Do not move the microphone between sittings.** Distance changes level and
  low-end; a few centimetres is audible. Mark the position.
- Short breaks are nearly free; overnight gaps effectively produce two datasets.
- **After any long break, re-record two or three kept sentences and compare by
  ear.** If they differ, that is found while it is still fixable.
- The recorder resumes at the first *gap*, not where you stopped — a skipped
  prompt sends you back to it next sitting. That is deliberate.

The same guidance, written for whoever is actually at the microphone rather than
for the pipeline, is in `voice_prompts_basic.md` under *Recording sessions, and taking
breaks* — that is the document the reader has in front of them, so it belongs
there too.

Six minutes gave something usable. An hour, recorded consistently, should give
something considerably better than "not bad considering".

---

## Where the trained voices live, and why they left `voices/` (2026-10-07)

**They are in `~/bd_voices_private/`, outside the checkout.** Moved there after
finding this:

```
https://graph.virtualfictions.uk/voices/bd_will_01.onnx   →  HTTP 200, 63,516,051 bytes
```

`.gitignore` keeps `voices/` out of the repo — and the comment there gives the
reason, *"a fine-tune IS someone's voice"* — but `server.js:144` is
`app.use(express.static('.'))`, so the repo **root** is served. The file was
excluded from one distribution channel and published through another.

Exactly the shape of the Sample Focus licence breach of 2026-10-02, and that
directory reached the conclusion this one needs: **there is no safe folder
inside the checkout.** Nor can the fix be a check on the requester — cloudflared
runs on this host, so every public visitor arrives from 127.0.0.1 and an IP
test would grant everyone.

So the only fix is for the file not to be there. Verified after moving:
`bd_will_01.onnx`, its `.json` and `testvoice.onnx` all return **404** from
outside, while `voices/alba_int8dp.onnx` — the quantised public voice BD now
speaks with — still returns 200.

### To hear your own voice in BD again

Copy it back for the session, and move it out afterwards:

```sh
cp ~/bd_voices_private/bd_will_01.onnx* voices/
#   open BD with ?voice=local/bd_will_01
mv voices/bd_will_01.onnx* ~/bd_voices_private/
```

Deliberately a manual copy rather than a second static route or an environment
flag. A route that is off by default is a route that can be left on, and the
failure would be silent and total — the voice public again with nothing to show
it. Two commands that leave no mechanism behind cannot be left on by mistake.

**What is safe to serve from `voices/`:** builds derived from *published*
voices, which is what `make_quantised_voice.py` produces. `alba_int8dp` exposes
nothing that HuggingFace does not already serve to anyone. A fine-tune is the
opposite case, and the distinction is the whole reason the directory is split.
