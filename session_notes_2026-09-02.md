# Session notes — 2026-09-02

Speech. A design conversation that reversed one assumption, settled the tone
question, and ended with the plumbing built and working on a throwaway voice.

Ended at **`viewer.js?v=764`, `style.css?v=445`**, canary **blue**.

Full plan: `speech_plan.md`. Memory: `project-speech`.

---

## 1. The assumption that got corrected

The opening question was whether BD could speak in the author's wife's voice. My
first answer split the work into recorded playback for the nav layer and
synthesis for the corpus — and was told, correctly, that **there was no point
measuring the corpus because it is going to expand greatly.**

That single fact removes the recorded-playback half entirely: anything requiring
a human to record each node is a dead end by construction. Everything below
follows from taking that seriously.

The user's own framing of the mechanism was right and I had muddled it by
leading with playback — you record someone reading prepared passages, then the
model synthesises new text. That is fine-tuning, and it is the mainstream route.

## 2. Tones — asked, answered, dropped

**Does IPA cope with the five Mandarin tones?** The notation does: Chao tone
letters ˥˦˧˨˩, so ˥ / ˧˥ / ˨˩˦ / ˥˩ and neutral. espeak-ng handles Mandarin too.

**But the pipeline does not.** An English TTS model has no tone dimension in its
phoneme inventory — it never learned one, its pitch comes from English sentence
prosody. Feed it a tone letter and it drops the character. A fine-tune of an
English voice cannot produce tones whatever the lexicon says.

The user's own instinct settled it: going tonal mid-English-sentence sounds
affected. The corpus is English translations, and if she is not a Mandarin
speaker the reference recordings would be an anglicisation regardless.

**The real risk is different from the one being guarded against.** It is not
missing tones, it is the model reading "Zhuangzi" as *zwang-zee* — a
spelling-rules failure, fixed by an ordinary English-phoneme lexicon entry.
**Teach pronunciation with a dictionary you can inspect and correct, not by
hoping a fine-tune absorbed it from a handful of examples.**

## 3. Staging, and why stage 0 uses the wrong voice deliberately

Agreed staging: prove the wiring with a supplied voice, then an hour of her
reading unproblematic text, then careful pronunciation work.

Stage 0 went one below that — macOS `say`, already on the machine, zero install.
It sounds like a satnav, which is the point: it proves the pipes before anyone
spends an hour recording.

Two things about the recording session that matter more than its length, and
belong on the record now rather than on the day:

- **The fine-tune learns delivery, not just timbre.** If she reads briskly, the
  whole corpus is read briskly forever. "Non-problematic text" must still be
  literary prose at the register BD wants.
- **Conditions beat quantity.** One room, one mic position, 3 × 20 min with
  breaks. Inconsistent conditions poison a fine-tune, because the model learns
  the room as part of the voice.

## 4. Stage 0, built (`2b9785c`)

    POST /api/speak {text} -> m4a, keyed on sha1(voice + text)

Text-keyed rather than node-keyed: an unchanged node is never re-spoken, an
edited one regenerates itself, and the voice in the key stops a voice change
serving stale audio. **320 ms cold, 0.9 ms cached.**

`speechTextFrom` is a **third representation** of node text, after the renderer
and Sv's inverse — the same lesson as the previous day's Sv bug, that every
representation needs its own deliberate conversion and skipping one fails
silently. `%%bd_center` and `%%bd_hint` are layout, `<<yellow>>` is a colour.
`%%bd_module` is a **hard stop, not a line filter**: everything after it is a
script, and reading a Kolam program aloud would be alarming rather than merely
useless. Verified against real corpus text before shipping.

A node tap **interrupts** — you have moved on. An arriving card **queues** —
cutting off a partner's message to start another would lose it. A generation
counter discards a fetch landing after an interrupt.

The control is a **checkbox, not a radio**: it is not a view mode, it rides
alongside whichever is selected. Ticking it is also the user gesture iOS requires
before audio may play, so the control that enables speech is the one that
unlocks it.

**Payload ratio, measured: 57 characters of text became 50 KB of audio, ~880×.**
Lazy per-node fetch is mandatory, not an optimisation — the scaling brief already
has transfer binding ~10× before memory.

## 5. What stage 0 did NOT prove

`say` is system TTS, not a neural engine. Untested: model install, inference
speed on this hardware, the phoneme front end, lexicon overrides, output format,
total cache size across the corpus. **Those are the things that could make the
plan unworkable, and none of them need her voice to test** — which is what
stage 1 is for.
