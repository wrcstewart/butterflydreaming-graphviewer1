# Recording prompts

62 sentences to be read aloud, one per clip, for fine-tuning a Piper voice.
Generated from `voice_prompts.json` — that file is the source, this is for reading.

**Read them at the pace you want the finished voice to read at.** A fine-tune
learns delivery more stubbornly than timbre: read briskly and everything the
voice ever says will be brisk, whatever is done to it afterwards.

## Shape

Most are plain declaratives that simply continue — warm in what they notice
rather than in how they are built. An earlier draft was mostly epigrams, two
members turning on a pivot, and that shape has one characteristic contour: a
model trained on it learns the contour as the default shape of a sentence and
imposes a knowing cadence on flat prose. A few epigrams are kept so the contour
is available without being the default.

Lengths are mixed on purpose — 25 short, 29 medium, 8 long. Prosody spans
clauses, and BD's own corpus is full of long sentences.

## Why no names and no archaic diction

The model never sees words, only phoneme ids espeak derives from the spelling —
which is why it can say words it has never heard. But where espeak mispronounces
one, the reader will not say what the label claims, and the model learns that
those phonemes sound like something else. They occur throughout ordinary
English, so it corrupts far more than the word itself. The lexicon handles the
Chinese names at synthesis time instead.

## Counted, not assumed

No word trips the spelling-out check. 44 distinct phonemes across 2,241 tokens,
**none below five occurrences**.

---

**1.**  The kettle was still warm when she came back down.

**2.**  There were three chairs by the window and nobody in them.

**3.**  He hung his coat on the hook and went through to the kitchen.

**4.**  The dog slept in the same square of sunlight all afternoon.

**5.**  Someone had left the gate open again.

**6.**  The bread was still warm from the oven.

**7.**  She wrote the address on the back of an envelope.

**8.**  It rained steadily from lunchtime until dark.

**9.**  The apples this year are small and very sweet.

**10.**  There is a footpath along the top of the hill.

**11.**  A blackbird was singing somewhere behind the shed.

**12.**  The bus comes twice a day and stops at the corner.

**13.**  She keeps her mother's photographs in a wooden box.

**14.**  The paint on the door has faded to a soft grey.

**15.**  He reads the same page over several times.

**16.**  Two boats were moored at the far end of the harbour.

**17.**  The children were playing in the field behind the church.

**18.**  Her voice on the telephone sounded a little tired.

**19.**  The floorboards creak in the same three places.

**20.**  We walked as far as the bridge and turned back.

**21.**  There was a smell of woodsmoke on the cold air.

**22.**  The lamp in the hall stays on all night.

**23.**  She has kept every letter he ever sent her.

**24.**  The garden wall is covered in moss and small ferns.

**25.**  A train went by while they were talking.

**26.**  He learned the names of all the birds that visit.

**27.**  The water in the bay was completely still this morning.

**28.**  She sat down and took her shoes off.

**29.**  The clock in the kitchen runs four minutes fast.

**30.**  The fire had gone out during the night.

**31.**  He waited at the window until the car appeared.

**32.**  A boy was throwing stones into the water.

**33.**  She could hear voices in the next room.

**34.**  He pointed at the far side of the field.

**35.**  The coins were still in his coat pocket.

**36.**  It was a pleasure to see them again after so long.

**37.**  The usual bus was late and nobody seemed to mind.

**38.**  She measured the flour into a blue bowl.

**39.**  There was a garage at the end of the lane.

**40.**  They watched television together until quite late.

**41.**  Some questions are better carried than answered.

**42.**  Joy is quieter than people expect.

**43.**  Who taught you to be gentle with yourself?

**44.**  What would you keep, if you could keep only one thing?

**45.**  She listened more than she spoke, and heard more than she said.

**46.**  He forgave himself slowly, the way frost leaves a field.

**47.**  The road bends, and the house is gone from view.

**48.**  The river is the same river, and never the same water.

**49.**  A small window is enough if the view is good.

**50.**  What would you keep, if you could keep only one thing?

**51.**  The bell sounds once, and the silence afterwards is larger.

**52.**  He wondered whether the answer had been there all along.

**53.**  The world asks very little, and gives a great deal.

**54.**  The chair by the window catches the last of the light.

**55.**  When the rain finally stopped, the whole valley seemed to be listening, and nobody in the house wanted to be the first to speak.

**56.**  She had meant to say something kinder, but the moment passed the way such moments do, quietly and without warning.

**57.**  There is a particular hour, late in the afternoon, when the light lies flat across the fields and everything looks older than it is.

**58.**  He kept the letter for years without reading it again, partly from respect and partly because he already knew what it would say.

**59.**  If you sit long enough beside any water, the noise in your head settles, and what remains is usually simpler than you feared.

**60.**  The old woman told the story slowly, stopping whenever she liked, and nobody thought to hurry her along.

**61.**  What we call patience is mostly a willingness to stay uncertain for longer than is comfortable, without pretending otherwise.

**62.**  Snow began before dawn and went on all morning, softening the roofs, the walls, and the long road out of the village.


---

If any of these fights you when read aloud, say so and it will be replaced. A
sentence that resists the reader produces a worse take than a duller one that
flows.
