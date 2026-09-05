# Recording prompts

54 sentences to be read aloud, one per clip, for fine-tuning a Piper voice.
Generated from `voice_prompts.json` — that file is the source, this is for reading.

**Read them at the pace you want the finished voice to read at.** A fine-tune
learns delivery more stubbornly than timbre: read briskly and everything the
voice ever says will be brisk, whatever is done to it afterwards.

Lengths are mixed on purpose — 36 short, 10 medium, 8 long. Prosody spans
clauses, and a voice trained only on short sentences has never had to sustain
one. BD's corpus is full of long sentences, so that would leave it least
practised at what it most often does.

## Why these and not a standard set

CMU Arctic and the Harvard Sentences have excellent coverage and no music. They
are plain narrative, and would train a plain reading. These are written to invite
an unhurried, attentive one, which for BD is the more consequential property.

## Why no names and no archaic diction

The model never sees words — only phoneme ids espeak derives from the spelling.
So it can say words it has never heard, which is why a short recording can read a
whole corpus. But where espeak mispronounces a word, the reader will not say what
the label claims, and the model learns that those phonemes sound like something
else. They occur throughout ordinary English, so it corrupts far more than the
word itself.

## Counted, not assumed

Every word checked against espeak for spelling-out — none. Every phoneme appears
at least five times bar one marginal vowel. ɔɪ was thin at two, so four
sentences were added for it: it carries *voice*, *choice*, *point*, *avoid*.

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

**43.**  Each choice closes one door and opens another.

**44.**  Her voice carried further than she meant it to.

**45.**  He avoided the point until it found him.

**46.**  The chair by the window catches the last of the light.

**47.**  When the rain finally stopped, the whole valley seemed to be listening, and nobody in the house wanted to be the first to speak.

**48.**  She had meant to say something kinder, but the moment passed the way such moments do, quietly and without warning.

**49.**  There is a particular hour, late in the afternoon, when the light lies flat across the fields and everything looks older than it is.

**50.**  He kept the letter for years without reading it again, partly from respect and partly because he already knew what it would say.

**51.**  If you sit long enough beside any water, the noise in your head settles, and what remains is usually simpler than you feared.

**52.**  The old woman told the story slowly, stopping whenever she liked, and nobody thought to hurry her along.

**53.**  What we call patience is mostly a willingness to stay uncertain for longer than is comfortable, without pretending otherwise.

**54.**  Snow began before dawn and went on all morning, softening the roofs, the walls, and the long road out of the village.


---

If any of these fights you when read aloud, say so and it will be replaced. A
sentence that resists the reader produces a worse take than a duller one that
flows.
