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

## Open

| item | note |
|---|---|
| Achromatic promotion | plan in `ink_promotion_plan.md`, not started |
| `/api/speak`, `speech_cache/` | still in server.js, unused |
| Bench duplicates `speechTextFrom` | won't get the dash fix until reconciled |
| Paragraph vs sentence gap | both get `SPEAK_GAP_MS` 420 |
| `confirm()` in the checkbox path | the intro dialog is custom, the checkbox path still uses confirm() |
| Merge to main | 180+ commits; deliberately separate from the ink flip |
