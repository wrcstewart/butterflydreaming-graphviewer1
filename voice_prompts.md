# Recording prompts

42 sentences to be read aloud, one per clip, for fine-tuning a Piper voice.
Generated from `voice_prompts.json` — that file is the source, this one is for
reading.

**Read them at the pace you want the finished voice to read at.** A fine-tune
learns delivery more stubbornly than it learns timbre: read briskly and
everything the voice ever says will be brisk, whatever is done to it afterwards.

## Why these and not a standard set

The established phonetic sets — CMU Arctic, the Harvard Sentences — have
excellent coverage and no music. They are drawn from plain narrative, so they
would train a plain reading. These are written to invite an unhurried, attentive
one instead, which for BD is the more consequential property.

## Why no names and no archaic diction

Training pairs espeak's phonemes with the reader's audio. Where espeak
mispronounces a word the reader will not say what the label claims, and the model
learns that those phonemes sound like something else — and since they occur
throughout ordinary English, that corrupts far more than the word itself. Which
is why literary source texts are the worst candidates here rather than the best,
and why the Chinese names are absent: the lexicon handles those at synthesis
time, so the model only ever needs ordinary English sounds.

Verified rather than assumed: no word trips the spelling-out check, and all 38
phonemes appear at least three times across differing contexts.

---

**1.**  The light changes long before the day does.

**2.**  Sit with it a while; there is no hurry.

**3.**  What you noticed first is often what matters.

**4.**  Water finds its way without deciding.

**5.**  She listened more than she spoke, and heard more than she said.

**6.**  Some questions are better carried than answered.

**7.**  The garden does not mind being watched.

**8.**  He forgave himself slowly, the way frost leaves a field.

**9.**  Nothing is asked of you here.

**10.**  The road bends, and the house is gone from view.

**11.**  Warmth arrives before you notice the fire.

**12.**  Would you rather be understood, or left in peace?

**13.**  Old wood holds the shape of the weather.

**14.**  There is a kindness in not explaining everything.

**15.**  The river is the same river, and never the same water.

**16.**  Breathe out first, and the rest follows.

**17.**  A small window is enough if the view is good.

**18.**  Grief settles like snow, quietly and everywhere.

**19.**  What would you keep, if you could keep only one thing?

**20.**  The bell sounds once, and the silence afterwards is larger.

**21.**  Kindness costs attention, which is why it is rare.

**22.**  He wondered whether the answer had been there all along.

**23.**  Moss grows on the side that is patient.

**24.**  Say less, and mean it more.

**25.**  The child sleeps through the storm without knowing.

**26.**  Every ending is joined to something.

**27.**  Her hands remembered the work her mind had forgotten.

**28.**  Joy is quieter than people expect.

**29.**  The path was steep, but the walking was easy.

**30.**  Let the thought finish before you judge it.

**31.**  Autumn does not argue with summer.

**32.**  Who taught you to be gentle with yourself?

**33.**  The lamp burns lower, and the room grows kinder.

**34.**  Some things are understood only by waiting.

**35.**  A stranger's music carried across the field.

**36.**  He held the question rather than solving it.

**37.**  The morning was cold, bright, and entirely ordinary.

**38.**  Forgiveness is mostly a matter of time.

**39.**  What is enough, and how would you know?

**40.**  She walked home through the wet leaves, unhurried.

**41.**  Youth is generous with everything except patience.

**42.**  The world asks very little, and gives a great deal.


---

If any of these fights you when read aloud, say so and it will be replaced. A
sentence that resists the reader produces a worse take than a duller one that
flows.
