# Session notes — 2026-09-05

Onboarding. Speech is offered where everyone passes, the opening screen is
reduced to one choice, and the pairing story is split between the node that
introduces it and the node where the button lives.

Ended at **`viewer.js?v=788`, `style.css?v=468`**, canary **green**.

Test URL: `http://localhost:8080/?ink=1&intro=1` — grey rings, speech dialog
forced. Phone: same parameters on `https://graph.virtualfictions.uk/`.

---

## 1. The opening screen

**Root is alone on it.** Priming used to reveal Settling as a side effect of
`advanceOrNavigate`, which let a user click straight past Root and miss the
speech offer entirely. `bootPriming` suppresses that reveal.

**The boot card carries its own message**, not Root's text:

    Welcome to ButterflyDreaming. Click the node below for orientation.

No hint beneath it — the message IS the instruction, and a cue would repeat it.

**Why this took three attempts.** The card first showed Root's whole text, which
meant the tap instruction had to live in the node's body to appear on the opening
screen — and was then SPOKEN after the tap, telling the listener to do what they
had just done. I had argued one sentence could serve both positions. **That holds
while both are read, and fails the moment one is heard.** Two cards, two texts.

Root's stored text now starts `ButterflyDreaming is a free anonymous…` — the
greeting having been given — and ends `Tap the Settling node when you are ready.`

## 2. The speech offer

Fires on the **first click on Root**, not on the checkbox. A dialog raised by
ticking the box arrives too late to tell anyone the box exists; Root is the only
thing on the first screen, so this is the one moment the offer reaches everybody.

The dialog does the whole thing: ticks the box, downloads, speaks. Having asked
for one click, asking for a second would be a poor return on the interruption.
The pointerdown that opened it has already unlocked audio.

**Declining means declining** — it unticks the box and clears the stored
preference, since the box may have been on from a previous visit.

**Download progress goes where the Pair button will later sit** (`#pair-status`),
not in the reading panel: the user is still reading the message that prompted the
download. That required moving Pair's gate — it now waits for Conversations
rather than for the first tap, which is better anyway, since a Remote offered on
the opening screen is one the user has no position to share into.

## 3. Two bugs in the offer, both mine

**It spoke while the dialog was up.** `insertNodeChunkAsCard` speaks
unconditionally and runs BEFORE the intro check in the same function, so anyone
with the box already ticked heard the answer before being asked the question.
Whether the intro will show is now decided ahead of the card insertion, and
speech is muted across it.

**Two keys recorded one decision.** `bd_speech_intro` beside `bd_speak` could
disagree: clearing `bd_speak` turned the box off while the intro still counted
itself as asked, which is indistinguishable from the dialog being broken. Now one
key — a decision exists or it does not. **`?intro=1`** forces the dialog, clears
the checkbox too, and does not record the answer, so the wording can be iterated
on without clearing storage by hand.

## 4. Pairing, split three ways

Root said "press the Pair button" while that button was gated until Conversations
— my own inconsistency, introduced when the download note took its place.

- **Root**: the idea only. *"Later you can pair with another user and see each
  other's browsing…"*
- **Conversations**: why it matters — pairing follows exploration, is optional,
  and **paired users can save their conversation into the graph**. That last
  point is new to the onboarding and is the first time the text says why anyone
  would pair.
- **Conversations, then**: the button instruction.

Same shape as the speech dialog: **introduce where everyone passes, instruct
where the control exists.**

## 5. Audio ducking

`DUCK_LEVEL` **0.10** — a track is mastered loud and a TTS voice is not, so
"background" needs a far bigger gap than the numbers suggest. Ramped, not
stepped, and the user's own volume is remembered rather than assumed to be 1.

The player also checks the voice at **start-up** and comes in already low (30ms,
not the 250ms ramp — in that direction the ramp IS the problem). Asked at every
play, since a track can be started, paused and restarted.

## 6. A process failure, twice

Two edits in this session asserted on long prose anchors, the anchors had
drifted, python raised — and the `&&` chain committed and pushed anyway. Once it
left the database updated with the code unchanged, and a commit message
describing work that was not there.

**Prefer short, stable anchors — a constant name, not a comment.** My own note
already says this. Writing long anchors is the recurring mistake, not forgetting
the rule.

## 7. Audio balance — two knobs, and a fade

`MEDIA_BASE_GAIN` **0.7** (about -3 dB) is the music's own level;
`DUCK_LEVEL` **0.10** is how far it drops beneath the voice. They do different
jobs, and the distinction matters: the complaint was the dynamic RANGE, not the
duck depth. Unducked music sat far louder than the voice, so returning to full
after a sentence was a jump — **lowering the baseline narrows that gap, whereas
deepening the duck would have widened it.**

Both go through the same `GainNode`, because `element.volume` is read-only on iOS
and setting it there does nothing at all. The baseline is applied on the track's
own `play` event, so the level is right from the first note rather than being
discovered when the first sentence arrives.

**It is a fade, not a switch**: `linearRampToValueAtTime` over 250ms when the
voice arrives over playing music, and 30ms when music starts during speech —
short in that direction because a slow ramp there IS a burst of loud music over a
sentence.

If it still feels wide, lower the baseline. If the music disappears under the
voice, raise `DUCK_LEVEL`. If the transition itself draws attention, lengthen the
250ms.

## 8. The download note was measuring the wrong thing

`speakReady()` did only the cheap half — import the module, fetch the lexicon —
while the 60 MB model was fetched lazily inside `synthesise()` on the first
utterance. So the note flashed, cleared, and the real wait happened in silence.
**A function called "ready" that returned before the expensive part had started.**
It now awaits `loadVoice()` too.

On a warm cache the note still flashes, because the model comes from the Cache
API in milliseconds. That is correct, not a regression — clear it with
`caches.delete('bd-piper-v1')` to see the real first-visit behaviour.

## Open

| item | note |
|---|---|
| Achromatic promotion | plan in `ink_promotion_plan.md`, not started |
| `/api/speak`, `speech_cache/` | still in server.js, unused |
| Bench duplicates `speechTextFrom` | won't get the dash fix until reconciled |
| Paragraph vs sentence gap | both get `SPEAK_GAP_MS` 420 |
| `confirm()` in the checkbox path | the intro dialog is custom, the checkbox path still uses confirm() |
| Merge to main | 180+ commits; deliberately separate from the ink flip |

---

# Part 2 — Voice training: rehearsal set up, prompts designed

Plan: rehearse the whole pipeline with the author's own voice first, so any
snagging is found before his wife's time is spent. Same principle as using macOS
`say` for stage 0 — prove the plumbing with a throwaway.

## 9. Step 0 — the toolchain PASSES

`~/bd_voice_train/venv`, 1.3 GB, entirely removable. Nothing touched the repo.

| piece | state |
|---|---|
| Python 3.12 (brew) + isolated venv | ✓ |
| PyTorch 2.14, **MPS working** | ✓ 20 × 2048² matmuls in 0.10s — real GPU, not a flag |
| `piper.train` | ✓ runs (needed lightning, pysilero-vad, jsonargparse) |
| `piper.train.export_onnx` | ✓ runs — produces what BD loads |
| espeak phonemisation | ✓ bundled; `en-gb-x-rp` accepted, `en-gb` rejected |

**Two useful surprises.** Modern `piper-tts` bundles training AND phonemisation,
so the separate `piper-phonemize` package — which used to be the arm64
stumbling block — no longer exists. And `phoneme_ids` exports BOS/PAD/EOS,
**confirming the id convention reverse-engineered from the wasm build**. Our
pipeline and theirs agree, so a voice trained here should drop straight into
`piper_direct.js`.

Hardware: M4 Max, 16 cores, 128 GB, 3 TB free. Fine-tuning locally is realistic.

**A macOS "Python quit unexpectedly" dialog is expected and harmless** — when a
probe fails on a missing module, PyTorch's C++ layer aborts during teardown. Only
meaningful if it happens during an actual training run.

## 10. BD can load a local voice

`local/<name>` resolves against BD's own `voices/` directory instead of
HuggingFace; `?voice=` overrides without editing code. Done FIRST deliberately —
testable before there is anything to train, and the step most likely to surprise.
Proved with a stock voice: config 4,888 bytes, model 63 MB, both served locally
and spoken.

**The pair is inseparable** — `<name>.onnx` and `<name>.onnx.json`. The config
carries `phoneme_id_map` and the inference scales, so a model without it cannot
be spoken at all. That is the shape training must produce.

`voices/` is gitignored: large, and a fine-tune IS someone's voice.

**Default voice changed to `en_GB-alba-medium`** (Scottish), preferred by ear over
jenny_dioco (Irish). `cori-high` judged "silly-wet", `alan` "aggressively precise
and artificial".

## 11. The recording rig

`voice_record.html` + `/api/voice-clip` + `/api/voice-status`. A separate page
from the bench on purpose: the bench is a measuring instrument that gets broken
while iterating, and this must be reliable while somebody is reading aloud, where
a lost take costs a person's time.

- **AudioWorklet direct-PCM**, not MediaRecorder, which truncates on Safari.
- **Echo cancellation, noise suppression and AGC all OFF** — they exist to make
  conference calls intelligible and all three alter the voice.
- **Warns at the moment of recording** — clipping, too quiet, too short — because
  that is the only point where a retake is free.
- **LJSpeech layout**, manifest REWRITTEN not appended, so a retake replaces its
  row rather than leaving two rows for one clip.
- Resumable, so a session can span sittings.

## 12. PROMPT DESIGN — the substantial part

Three constraints that pull against each other, and they interact: **any edit
needs the counts re-run, not eyeballed.**

**The model never sees words — only phoneme ids espeak derives from the
spelling.** That single fact explains everything else: it can say words it has
never heard (so a five-minute recording reads a whole corpus); the lexicon works
without retraining; and coverage is counted in phonemes, never words.

**NO NAMES, NO ARCHAIC DICTION — and this is the non-obvious one.** Training pairs
espeak's phonemes with the reader's audio. Where espeak mispronounces a word the
reader will not say what the label claims, so the model learns that **those
phonemes** sound like something else — and they occur throughout ordinary
English, so it corrupts far more than the word. **Literary source texts are
therefore the WORST candidates, not the best**, which is the opposite of the
natural instinct. Raiding Hardy or the Grimms was proposed and rejected on this.

**REGISTER.** A fine-tune learns delivery most stubbornly of all. CMU Arctic and
the Harvard Sentences have excellent coverage and no music — plain narrative
would train a plain reading, permanently.

**STRUCTURE — the author's catch, and the sharpest observation of the session.**
The first draft had 21 of 36 short sentences as two-member EPIGRAMS turning on a
pivot ("say less, and mean it more"). That shape has one characteristic contour,
and a model trained mostly on it learns the contour as *the shape of a sentence*,
then imposes a knowing sing-song cadence on flat prose. **Same error as the
register point one level down**: uniform register trains a flat reading, uniform
STRUCTURE trains a mannered one — both the set being homogeneous in a dimension
nobody was watching. Now 2 of 25. Test: remove the second half; does the first
still stand?

**LENGTH.** Also the author's catch. Prosody spans clauses — declination,
phrase-final lengthening, breath groups — and BD's corpus is full of long
sentences, so a voice trained only on short ones is least practised at what it
most often does. Checked: **the trainer imposes no utterance-length cap**
(`segment_size` is the discriminator's slice, `filter_length` the FFT window).

**COUNTING BEATS SCANNING.** /z/ looked absent by eye and occurs 45 times, because
English spells it "s" — *changes, does, is, leaves*. Meanwhile ɔɪ was genuinely
thin at 2, and it carries *voice, choice, point, avoid*. **Coverage is not
presence; it is repetition across contexts.**

Final: **62 sentences, 44 phonemes over 2,241 tokens, none below five, no word
tripping the spelling-out check.** 25 short / 29 medium / 8 long.

## Next

1. Record ~25 prompts (author's voice) at `/voice_record.html`
2. Preprocess → fine-tune a few hundred steps → export ONNX
3. Load as `?voice=local/<name>` and listen — badly, which is the point
4. Only then, the real session

