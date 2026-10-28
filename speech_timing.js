// speech_timing.js — HOW BD DELIVERS SPEECH: pace, gaps, and where a sentence breaks.
//
// 2026-10-28 — extracted from viewer.js so that voice_compare.html can play a
// fine-tuned voice the way BD actually plays it. The author asked for the
// comparison page to use "the same pace as BD and put in the end sentence pause
// and comma pauses. That will make comparison better later" — and "later" is
// the operative word: a comparison is only worth keeping if the thing being
// compared is delivered the same way each time.
//
// COPIED RATHER THAN SHARED, THESE WOULD DRIFT. Every number here was tuned BY
// EAR against the others — SPEAK_VERSE_SCALE is derived from SPEAK_LENGTH_SCALE
// precisely so that one dial moves both, and the gaps were set against the pace
// because a slower delivery asks for a longer pause. A second copy would be
// adjusted once and then quietly disagree, which is this project's recorded
// failure mode for a limit written twice.
//
// Nothing here synthesises or plays. It decides pace, where to break, and how
// long to wait — and the comments are the record of how each number was chosen.

// length_scale > 1 is SLOWER, so a "rate of 0.8" is 1/0.8. This is the model's
// own timing parameter, not a time-stretch: the delivery changes rather than the
// audio being slowed after the fact.
//
// A SECOND REASON USED TO BE CLAIMED HERE AND IT IS NOT TRUE (2026-10-08):
// "it also buys synthesis more time to stay ahead of playback". It does not.
// length_scale makes the model generate MORE AUDIO, so the synthesis work
// scales with the time available and the ratio barely moves. Measured on the
// shipped voice, same sentence:
//
//   length_scale   synth    audio    synth/audio
//   1.4286         1.014 s  6.432 s  0.158
//   1.5714         1.101 s  7.175 s  0.153
//
// Three per cent, which is not headroom. What it DOES do is raise the absolute
// cost of every utterance by about 9%, so the slowdown is paid for in
// synthesis time as well as in delivery. That is a fair price for sounding
// better — which is the real and sufficient reason — but nobody should slow it
// further expecting the prefetch to benefit.
// 2026-10-02 — 10% slower again, by ear: "it sounds a little rushed".
// 1/0.7 = 1.4286 became 1.5714, i.e. an effective rate of 0.636.
// SPEAK_VERSE_SCALE is derived from this, so verse stays 8% slower than prose
// and both move together — which is what you want from one dial.
const SPEAK_LENGTH_SCALE = (1 / 0.7) * 1.10;
// 2026-09-04 — an explicit gap between utterances.
//
// Each sentence is synthesised separately, so the only pause between them was
// whatever the audio element took to load the next clip. Double-buffering
// removed that latency — correctly, since it was also causing a long stall at
// paragraph breaks — and took the sentence pause with it, because the two were
// the same accident. What was left ran sentences together.
//
// So the gap is deliberate now rather than a side effect of buffering. 420ms is
// about what an unhurried reader leaves at a full stop; it wants tuning by ear
// against SPEAK_LENGTH_SCALE, since a slower delivery asks for a longer pause.
// 2026-10-02 — 20% longer, 420 -> 504, for the same report. Note this is NOT
// just the same change twice: the length scale slows the DELIVERY of words and
// the gap lengthens the SILENCE between sentences, and "rushed" can be either.
// The comment above predicted this coupling — a slower delivery asks for a
// longer pause — so the two moving together is the expected direction.
const SPEAK_GAP_MS = 504;
// 2026-09-30 — a LINE end is not a sentence end.
//
// Reported: the Tao Te Ching, Zhuangzi and Grimm's read well; Hardy and Whitman
// do not, because a verse line break invokes a short pause when a person reads
// and nothing at all here. espeak turns `,` and `.` into pause phonemes, which
// is why prose works — a newline is only whitespace, so it produces silence of
// zero length.
//
// 180ms against 420: enough to hear the line turn, not enough to sound like a
// full stop. Tune by ear against SPEAK_LENGTH_SCALE like its neighbour.
// LEFT AT 180 on 2026-10-02 while SPEAK_GAP_MS went to 504. The report was that
// sentences sounded rushed, not lines, and the point of this value is that a
// line turn is audibly SHORTER than a full stop. Raising both would have kept
// the ratio and lost the distinction; the gap between them is now 180:504
// rather than 180:420, which strengthens it.
const SPEAK_LINE_GAP_MS = 180;

const SPEAK_VERSE_SCALE = SPEAK_LENGTH_SCALE * 1.08;

// ── maxLen IS A LATENCY BUDGET, NOT A TIDINESS RULE (2026-10-14) ──────────
// 400 -> 150, measured. Synthesis costs about **50 ms per character** on this
// machine, consistently: 41 chars in 2119 ms, and the 12-21 second waits in the
// log all turned out to be utterances of 240-410 characters — which is to say,
// maxLen-sized ones.
//
// Speech PLAYS at roughly 70 ms per character (~170 wpm), so synthesis is about
// 1.4x faster than playback. That is why the prefetch keeps up once reading has
// started, and why the only cost that cannot be hidden is the FIRST utterance —
// whose price is directly proportional to its length. So this constant sets the
// worst-case wait before anything is heard: 400 chars is ~20 s, 150 is ~7.5 s,
// 100 would be ~5 s.
//
// The author: *"reduce it down — I feel that is the change that was made
// earlier, effectively."* Which is exactly right: it is the same principle as
// splitting at all ("reading starts on the first sentence instead of after the
// last"), applied further into long prose. The short-first-fragment merge tried
// an hour earlier was that principle RUN BACKWARDS, which is why it made the
// start worse.
//
// What it costs: a long sentence is split at a comma or semicolon rather than
// read whole, so the reading gains a small breath where the author put none.
// The fragment then ends without terminal punctuation and so takes the SHORT
// gap (SPEAK_LINE_GAP_MS, 180 ms) rather than a full stop's — which is the
// behaviour wanted, and already built.
//
// VERSE IS UNAFFECTED: its units are lines, and a line under 150 characters is
// one fragment either way. Only long prose changes.
function splitUtterances(text, { verse = false, maxLen = 150 } = {}) {
  const out = [];
  const gapFor = (frag) => /[.!?]["'\u201d\u2019)\]]*$/.test(frag) ? SPEAK_GAP_MS : SPEAK_LINE_GAP_MS;
  const units = verse ? text.split('\n') : [text];
  for (const unit of units) {
  for (const s of (unit.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) || [unit])) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxLen) { out.push({ text: trimmed, gap: gapFor(trimmed) }); continue; }
    // Keep the delimiter attached to the chunk it closes, so a fragment ends
    // with its own punctuation rather than with nothing.
    const parts = trimmed.match(/[^;:,]+[;:,]?\s*/g) || [trimmed];
    let buf = '';
    for (const part of parts) {
      if ((buf + part).trim().length > maxLen && buf) {
        out.push({ text: buf.trim(), gap: gapFor(buf.trim()) }); buf = part;
      } else buf += part;
    }
    if (buf.trim()) out.push({ text: buf.trim(), gap: gapFor(buf.trim()) });
  }
  }
  // ── THE SHORT-FIRST-FRAGMENT MERGE IS REVERTED (2026-10-14) ────────────
  // It existed for about an hour. The diagnosis behind it was right — the gap
  // after "Chapter 11." is the prefetch of the next line not finishing, because
  // a one-second clip cannot cover two and a half seconds of synthesis — but
  // the remedy made the FIRST clip longer, and so made the start of every
  // reading two to three times slower. The author, having used it: *"reading
  // start is much slower than it used to be."*
  //
  // Which settles the trade that was genuinely open: **a gap in the middle is
  // cheaper than a delay at the beginning.** Silence before anything starts is
  // the only silence the listener is certain to notice, because it is the only
  // one they are waiting through with nothing to go on.
  //
  // So the title keeps its own clip and its own gap. If the gap is to go, it has
  // to go without lengthening the first clip — which means covering it from
  // somewhere else, such as pre-synthesising the next text step of a collage
  // during the current one, where there are thirty seconds of warning. Not this.
  return out;
}

export {
  SPEAK_LENGTH_SCALE,
  SPEAK_VERSE_SCALE,
  SPEAK_GAP_MS,
  SPEAK_LINE_GAP_MS,
  splitUtterances,
};
