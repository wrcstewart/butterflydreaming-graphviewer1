# Session notes — 2026-11-01

The day the new microphone arrived, and the day the rig learned to say whether a
take is good. Fourteen commits. Also four Methods nodes, a backup disc, and a
new 128-utterance training set.

Most of what follows is measurement. Several of the measurements were wrong
first, and those are written down too, because in every case the wrong reading
was *confident* and the author is the one who caught it.

---

## 1. Methods — four node changes, and a label that needs two lines

`Chat-counselling` → `Chat` → **`Chat (In Pairs)`**, `Local AI` →
**`Only Local AI`**, and two new Entries, `Peer Counselling` and
`Toxicity Screening`. Methods now has thirteen children.

**A multi-line label goes in `display_name`, never in `name`.** For an Entry the
`name` is both the rendered label *and* the lookup key: style selectors match on
it, every Cypher query finds the node by it, and it appears in breadcrumbs and
chips. A newline inside it breaks all of that silently while the label still
looks right. So `name` stays flat and the breaks live in `display_name`;
`buildNodeData`'s Entry branch was taught to prefer it, as the Cluster branch
already did.

`bd_tool.js cypher` does **not** auto-backup. Both edits took a manual `backup`
first.

---

## 2. The backup disc

*"my backup disc is still chuntering even though it shows ejected"*.

A **WD My Passport 2 TB**, USB bus-powered. The volume was unmounted and I/O was
zero across two rounds of sampling, so nothing was at risk — but the device
stayed enumerated, because the WD bridge does not drop off on eject and, being
bus-powered, the platters keep turning while the cable is in. `diskutil eject
disk4` reported success and the node persisted; pulling the cable is the answer.

**SMART is unreadable over this bridge.** `smartctl --scan` sees only the
internal NVMe and `/dev/disk4` returns *"Operation not supported by device"* —
a macOS platform limit, not permissions. WD Drive Utilities or DriveDx can read
it. Worth doing: the backup that preceded this had collapsed to a crawl, which
is a classic bad-sector signature, though **the system log showed no `I/O error`
entries at all in three hours** and four backups had completed normally earlier
the same day.

**Standing finding:** `~/bd_voice_train` is 16 GB and **46,669 files**, all
included in Time Machine, and most of it regenerable — 13 GB of training
checkpoints, 1.3 GB venv, 1.0 GB base model, 530 MB caches. The irreplaceable
part is about 700 MB. Offered, not applied; the decision is the author's.

**One correction.** I first attributed the slow backup to those checkpoints. They
are dated 29 October and were already in the store, so they cannot have been
that backup's delta. Cause unestablished.

---

## 3. The Rode NT1 — the measurement that justified the purchase

### Noise

| | Rode NT1 | prev mics (28 Oct) | her ringlet set |
|---|---|---|---|
| A-weighted SNR, lead-in | **41.2** | 29.5 *(18.3–32.1)* | 25.9 *(21.1–29.6)* |
| 200–1000 Hz SNR | **44.3** | 32.0 *(25.9–33.7)* | 25.8 *(21.2–31.0)* |

**It beat the single best of all 144 previous clips by 8.0 dB**, which matters
because the ~4 dB measurability floor in that room had made every earlier
comparison inconclusive.

**The confound was killed by a control, not by assertion.** The clip was 8.5 dB
hotter than the old ones, which would inflate SNR if any of the noise were fixed
post-gain. Across 64 clips spanning 24.3 dB of recording level: **SNR slope
+0.13 dB/dB (r² = 0.02), absolute floor slope +0.87 dB/dB (r = 0.70).** The floor
tracks gain nearly 1:1 while SNR stays flat — pre-gain noise, so SNR is
gain-invariant and level explains at most 1.1 dB of the 8.0.

Octave bands, each clip normalised to its own speech (positive = Rode cleaner):

```
  band Hz      31.5    63   125   250   500    1k    2k    4k    8k
  vs prev      -7.8   8.4  17.5  12.3  12.4  14.5  13.7  10.0  10.1
  vs hers      -7.5  12.7  26.6  19.8  13.3  15.9  21.1  14.0  17.2
```

**The 200–1000 Hz whirr that could not be filtered is 12–16 dB down against the
old mic and 13–21 dB against her set.** Removed at source. The single regression
is 31.5 Hz, inaudible (A-weighting −39.5 dB there) and explained by the NT1 being
flat to 20 Hz where the old mic rolled off.

### Quality

Only one tonal difference is consistent across all three reference clips:
**+3.8 to +5.6 dB at 8 kHz and +7.1 to +9.3 dB at 16 kHz.** Genuine signal, not
self-noise (per-band SNR 34.3 and 28.7 dB). The midrange differences flip sign
between references and were **not** claimed. The 125 Hz fundamental sits within
0.6 dB across all four clips, so distance was comparable and this is not a
proximity effect.

**Piper trains at 22050 Hz, Nyquist 11.025 kHz**, so the 16 kHz gain — the
largest number in the table — is discarded entirely and never reaches the cloned
voice. The 8 kHz band mostly survives. The noise improvement is wholly inside
the band and reaches the model in full.

### Honest limit

*"I was just being more careful - moving about - waiting for no cars"*. So part
of the gain is the reader, and a new microphone makes anyone careful. What argues
for the mic carrying most of it is the *shape*: traffic is strongly
low-frequency weighted, yet 2 kHz improved 13.7 dB. Reported as "mostly the mic,
partly the room and the care".

### The chain, recorded

Rode NT1 5th Gen, **USB-C direct to the Mac** — no interface, the iTwo out of
the chain, the preamp and converter inside the microphone. SM6 shock mount, pop
screen, **system gain 50%**, 48 kHz mono written 16-bit. Reference numbers and
the fact that **the floor is the gain's fingerprint** (macOS does not report the
slider, so `floor ≈ −83 dB(A)` is the only cross-check) are in
`voice_training_pipeline.md`.

### float32

The author: *"i dont think it will clip as it makes a big thing of using
Float32"*. True of the microphone, and irrelevant to the file. `encodeWav`
clamps to ±1.0 and writes **16-bit PCM**, so **the ceiling is ours, not the
microphone's**. The level meter compounds it: `width = min(100, peak*130)%` pins
at 100% from **−2.3 dBFS** upward, so a take 0.3 dB from clipping looked
identical to a safe one.

---

## 4. The signal-to-noise readout — built, then corrected three times

The author, on being told a wandering floor is worse for training than a steady
one: ***"But we have seen that it learns the noise"***. Right, and it corrects
the priority: ringlet reproduced the whirr of its room, so the floor itself is
what matters. A number that appears only in offline analysis appears too late.

`voice_snr.js` measures every take on release and `voice_record.html` prints it.
Verified against the offline analysis before being wired in — it reproduces the
python figures to **0.05 dB** A-weighted and matches `bill/0001` exactly at 18.3.

Then three corrections, each from the author using it:

**(a) *"it seems sensitive to the overall level of my voice"*.** True — and it
flushed out a latent bug. The speech threshold was a fixed 30 dB below the
loudest frame, which put it **3 dB above the room floor**; the trigger impulse at
t=0 cleared it with **5 of the first 30 frames, and 5 consecutive is the
trigger**. It passed by luck. Three dB quieter and the detector locked onto the
button click and reported "no pause before speaking" — which is what every quiet
line of the Tao set would have done. Threshold now anchored to the measured floor
as well as the peak, and the first 300 ms excluded from both the onset search and
the noise window.

**(b) *"The absolute SNR must be the critical reading surely??"*.** Yes, and it
withdrew a more elaborate scheme I had just built. **Piper normalises every clip
before training, so absolute level is discarded and the voice-to-noise ratio is
exactly what survives into the model.** That also dissolves the apparent fault:
S/N falling on a quietly-read line is a *true* warning. Three plain bands, all
derived from measurement:

```
  YES       >= 45      the Rode takes: 46.7, 50.6, 51.9
  MARGINAL  40 to 44
  NO        <  40      her ringlet set topped out at 40.0
```

Across all 158 clips in the project, **every Rode take passes and nothing else
does**; her set reads NO on 112 of its 113 measurable clips.

**(c) *"This seems wrong"***, over
`S/N 38 dB — MARGINAL — louder, or closer ... — CLIPPED, move back from the mi`.
Three faults in one line: it **contradicted itself** (verdict on the raw value,
text rounded, so 37.6 printed as "38" beside MARGINAL); it gave **dangerous
advice** (told a clipped take to get louder); and the important part was **last
and truncated**. Now one headline, the most serious that applies, stated first,
numbers after — and clipping outranks everything, because the samples are
destroyed and no signal-to-noise redeems them.

**And a fourth correction, found while analysing a take rather than reported:**
a floor measured as the *mean* of the lead-in was inflated **12.0 dB by one
isolated 50 ms mouth click** 0.4 s before the first word, which **ranked the
quietest of three takes as the worst**. The floor is now the **25th percentile of
overlapping 100 ms windows** — the quieter quarter of the pause, which is the
room. Thresholds re-derived accordingly.

### The Keep button

*"Please colour the keep button with ok - green - warning or not found amber and
fail red"*. Done, with **hue as the last of three cues** because the author has
reduced colour vision: the grounds are separated by lightness (205 / 149 / 68 of
255 once hue is stripped, so they differ in greyscale), text polarity flips on
the dark one, and each state prefixes the label with its own shape (`✓ ! ? ✗`).
Keep stays **enabled** on red — a warning, not a lock. Cleared on a new
recording, a new prompt or a closed session.

---

## 5. The pop screen — the author's finding, measured

*"the pop screen seems to work better further from the mike ie nearer my
mouth"*. The opposite of how screens are usually mounted, and right.

**A screen does not absorb a plosive, it breaks the coherent jet into
fine-scale turbulence — and turbulence is itself a noise source**, so it should
happen as far from the diaphragm as possible. At 3 cm it was being manufactured
essentially at the capsule. The conventional "close to the mic" is about where
the clamp is, not acoustics.

Measured, screen close vs near the mouth:

| | close | far | difference |
|---|---|---|---|
| 20–120 Hz relative to the voice band | +27.5 | +21.1 | **−6.4 dB** |
| worst low-frequency transient | +43.4 | +36.2 | **−7.2 dB** |
| peak level reached | −2.6 dBFS | −9.9 dBFS | **−7.3 dB** |
| voice band level (the reference) | −53.8 | −53.2 | 0.5 dB — matched |

Three independent statistics within 1 dB. The peak figure owes nothing to the
band analysis and says the peaks had been set by the plosives, not the voice.

**The first attempt found +0.1 dB and the measure was at fault**: it normalised
pop energy by total speech RMS, and in blast-dominated takes the RMS *is* mostly
pop, so the pop was inflating its own reference. 300–3000 Hz is the correct
denominator.

**Context: normal reading does not pop at all** — 20–120 Hz sits 2.4 to 5.7 dB
*below* the voice band in ordinary takes against +21 to +28 in these deliberate
ones. The screen position is insurance, not a remedy for a present fault.

A comb-filter check at 3 cm (predicted notches 2.86 and 8.58 kHz) found dips
near both but **no deeper than the 7–10 dB dips at unpredicted frequencies**, so
it was recorded as a null result, not a finding.

---

## 6. Prompt set v4 — 128 utterances, mixed registers

*"we need a new training set so that her voice all suits the grimms stuff and
the poetry"*. 30 Tao, 30 Zhuangzi, 30 Grimm, 15 Hardy, 15 Whitman, plus eight
written sentences.

**Drawn from BD's own corpus by query**, not the internet: the licence is the
project's own public-domain text and the register is the register the voice will
have to read. Pools after filtering were 416 / 207 / 87 / 32 / 77 candidates,
taken from 30 / 30 / 28 / 14 / 10 distinct passages.

**`speech_lexicon.json` IS the exclusion list.** It exists because espeak
mispronounces those words, and the reader is what makes that dangerous: she says
`Dze` correctly, espeak renders it **`dˌiːzˌɛdˈiː`, spelling the letters out**,
and the model attaches her audio to the wrong phonemes. All 58 excluded, plus
capitalised non-dictionary words, plus **Tao and Dao** (no longer in the lexicon,
so BD says them espeak's way while she says them the Chinese way). The model
never sees words, only phoneme ids, so dropping a word costs nothing.

### The error worth remembering: count what the model consumes

`phoneme_id_map` has exactly **five** multi-character keys — `aɪ aʊ ɔɪ eɪ oʊ`.
Everything else is a single character. So `/ʊə/`, `/ɪə/`, `/iə/` are not units
the model has, and **`/dʒ/` is `d`+`ʒ`**.

Counting the phonetician's inventory, `/ʒ/` looked critically scarce at 8 and a
whole selection pass was spent rescuing it. **In piper's terms it was already at
30**, because every *judge*, *gentle* and *age* supplies one — while the
genuinely thin phonemes went unnoticed against pool ceilings four to seven times
higher:

| phoneme | wrong-inventory pass | ceiling | corrected | final |
|---|---|---|---|---|
| `ɔɪ` | 17 | 41 | 41 | **67** |
| `ʒ` | 30 | 122 | 35 | **53** |
| `e` | 33 | 189 | 56 | 58 |
| `ɑ` | 35 | 244 | 60 | 60 |
| `aʊ` | 44 | 221 | 60 | 63 |
| `θ` | 48 | 251 | 54 | 64 |

Selection is **deficit-driven** against a target of 60 per phoneme, not greedy
on novelty — a novelty pass covered the whole inventory by utterance 9 while
leaving the table above. The set holds **8,058 phoneme instances and 804
diphones, rarest phoneme 53**, against 17 before the correction.

### Eight written sentences

*"If you think that any phonemes are a bit low you could make up sentences and
interleave them."* Only `/ɔɪ/` genuinely needed it: at 41 it was **every
instance in all five texts, the pool ceiling exactly**. Eight sentences were
written for `ɔɪ`, `ʒ` and `θ`, **kept in the register of the rest of the set** —
storytelling, not a phonetic drill, because she reads them as literature and the
delivery is itself what the model learns. Marked `"written": true`.

### Order — blocks of four

*"i think the whole sequence is a bit choppy — please arrange it so that there
are sequences of four TTC followed by for ZZ then the four grims and four
poetry... that way she will be able to settle a bit in each style."*

```
  cycle of 17:  TTC TTC TTC TTC  ZZ ZZ ZZ ZZ  GRM GRM GRM GRM  HDY WHT HDY WHT  written
  x7  ...........................................................................  119
  final cycle:  TTC TTC  ZZ ZZ  GRM GRM  HDY WHT  written  .....................    9
```

A voice that changes style every utterance is a voice reading a list. The cycle
repeats, so a prefix stays balanced: every 17 utterances holds all four styles
and one written line. Balanced stopping points **68** and **102**. Written
sentences at 17, 34, 51, 68, 85, 102, 119, 128.

**Reordering was safe only because no session had yet recorded against the set**,
which was checked first. A prompt id is a POSITION, not a sentence.

Registered as `mixed` / "Mixed registers". A temporary `check` set held the
eight written lines alone for review; the author read them, approved them, and
it was deleted the same day along with its registry entry. **The eight sentences
themselves remain in `mixed`.**

---

## 7. The overwrite hole, closed

*"correct the overwrite hole - make sure that if any mistakes of selection occur
then there a dialog warning and not a silent failure."*

`idx = firstGap === -1 ? 0 : firstGap;` aimed a **completed** session at prompt
`0001` with Keep armed. On 31 October that replaced the first clip of her set
with a room-tone recording, recovered only because a staged copy happened to
exist. Closed in three places:

**The server refuses by default.** `/api/voice-clip` now returns **409** if the
clip exists and `overwrite=1` was not sent, naming the size and timestamp of
what is already there. This is the guarantee, because a recording is the one
artefact here that cannot be regenerated and no page bug should be able to
destroy one. Tested end to end: first write 200 (16,044 bytes), second write
without the flag **409 with the file byte-for-byte untouched**, third write with
the flag 200 and replaced.

**A finished session points at no prompt.** `idx` goes to `prompts.length`,
which `render()` already shows as "All prompts recorded" — and that branch now
disarms Play and Keep and clears the take in hand, rather than returning early
with them live.

**Every selection mistake raises a dialog, not a log line.** Reopening a
complete session, a session whose prompt set no longer matches, a Keep onto a
prompt that already has a clip (quoting the id *and its text*, since "0005"
alone is not checkable), and a 409 from the server — which means the page and
the disk disagreed, exactly the condition that lost the clip. The Keep button
also relabels itself **`REPLACE 0005`** when that is what it will do.

Declining a replacement keeps the take in hand, so nothing is lost by saying no.

---

## Still open

- **THE THREE SECRETS IN `config.js` MUST BE TREATED AS COMPROMISED** —
  `CURATION_CODE`, `NEO4J_PASSWORD`, `PAIR_CODE` were publicly fetchable for as
  long as the tunnel had been up before 28 October. Change them, restart, delete
  the `.bak` copies.
- **Time Machine exclusions** for `~/bd_voice_train` — offered, the author's call.
- **Backup disc health** unread; needs WD Drive Utilities or DriveDx.
- `SPEAK_GAP_MS` / `SPEAK_LINE_GAP_MS` want raising once a voice without
  generated margins is in BD.
- Older: `spacing_probe.js` removal, launchd for `cloudflared` and `node
  server.js`, `GRACE_MS` 10 s → 65000 before pairing ships, iOS stepper runway.
- Empty throwaway sessions could be cleared: `newset1`, `tempset1`, and the six
  older test sessions, keeping `2026-09-06_1209_will`.
