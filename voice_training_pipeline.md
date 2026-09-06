# Voice training — the pipeline, as built and as proven

**2026-09-06.** A fine-tuned Piper voice now runs in BD, trained on the author's
own reading. This is the as-built record: what exists, what broke, how to run it
again, and what to do differently when the real recording happens.

Companion documents: `speech_plan.md` (the staged plan), `session_notes_2026-09-03…05.md`
(how the engine was chosen), `voice_prompts.md` (the prompt set and its reasoning).

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
| `voice_prompts.json` / `.md` | repo root | 63 prompts, 45 phonemes, none below five occurrences |
| `/api/voice-clip`, `/api/voice-status` | `server.js` | writes each take to disk; reports what is already recorded |
| `voice_dataset/` | repo root, gitignored | `wav/NNNN.wav` + `metadata.csv` in LJSpeech layout |
| `~/bd_voice_train/venv` | outside the repo | Python 3.12, torch 2.14 + MPS, piper-tts 1.8 |
| `~/bd_voice_train/train_bd.py` | outside the repo | training launcher — see §5.5 |
| `~/bd_voice_train/export_bd.py` | outside the repo | ONNX export — see §5.6 |
| `voices/<name>.onnx{,.json}` | repo root, gitignored | what BD loads via `?voice=local/<name>` |

**Nothing voice-related is committed.** `voice_dataset/`, `voices/`, `*.wav` are
gitignored. The repository is public, and a fine-tune *is* someone's voice.

---

## 3. The first fine-tune — what happened

**Recording.** 63 prompts in 14 minutes. 6.2 minutes of speech, 48 kHz mono
16-bit, mean 5.9 s, range 3.4–10.0 s. Nothing clipped, nothing silent, nothing
truncated. Median RMS 0.049.

**One clip excluded.** `0001` was a level-finding take at **0.35× the median
RMS** — a third the level of everything else. The author chose to exclude rather
than re-record.

> **Exclude in a staged copy, never in `voice_dataset/metadata.csv`.** The
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
grep -v '^0001|' ~/butterflydreaming_graphviewer1/voice_dataset/metadata.csv > dataset/metadata.csv
ln -sfn ~/butterflydreaming_graphviewer1/voice_dataset/wav dataset/wav

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
for the pipeline, is in `voice_prompts.md` under *Recording sessions, and taking
breaks* — that is the document the reader has in front of them, so it belongs
there too.

Six minutes gave something usable. An hour, recorded consistently, should give
something considerably better than "not bad considering".
