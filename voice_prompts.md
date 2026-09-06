# Recording prompts

63 sentences to be read aloud, one per clip, for fine-tuning a Piper voice.

**Read them at the pace you want the finished voice to read at.** A fine-tune
learns delivery more stubbornly than timbre: read briskly and everything the
voice ever says will be brisk, whatever is done to it afterwards.

Reworked by the author so they flow when spoken — which matters more than any
property measured below, because a sentence that fights the reader gives a worse
take than a duller one that flows.

## Shape

Mostly plain declaratives that continue rather than turn — warm in what they
notice rather than in how they are built. An earlier draft was mostly epigrams
pivoting on a contrast, and that shape has one characteristic contour a model
would learn as *the* shape of a sentence. A few are kept so the contour is
available without being the default.

Lengths: 3 short, 38 medium, 22 long. Prosody spans clauses, and BD's own
corpus is full of long sentences.

## Why no names and no archaic diction

The model never sees words, only phoneme ids espeak derives from the spelling —
which is why it can say words it has never heard. But where espeak mispronounces
one, you will not say what the label claims, and the model learns that those
phonemes sound like something else. They occur throughout ordinary English, so it
corrupts far more than the word itself.

## Counted, not assumed

No word trips the spelling-out check. 44 distinct phonemes across 2,977 tokens,
**none below five occurrences**. Longest utterance about ten seconds.

---

**1.**  The kettle was still warm when she came back down.

**2.**  There were three chairs by the window and nobody in them.

**3.**  He hung his coat on the hook and went through to the kitchen.

**4.**  The dog slept in the same square of sunlight all afternoon, you could hear him snoring.

**5.**  Someone had left the gate open again and the horses had gone missing.

**6.**  The bread was still warm from the oven, melting the golden yellow butter.

**7.**  She wrote the address on the back of an envelope, if only it were legible.

**8.**  It rained steadily from lunchtime until dark, then the clouds parted and the moon came out.

**9.**  Why are the apples so small and sweet this year?

**10.**  There is a footpath winding along the top of the hill.

**11.**  A blackbird was singing somewhere behind the shed.

**12.**  The bus comes twice a day and stops at the corner but today it didn't arrive.

**13.**  She keeps her mother's photographs in a wooden box but her father's she throws away.

**14.**  The paint on the door has faded to a soft grey tinged with vermillion.

**15.**  He reads the same page over several times someone should give him a book.

**16.**  Two boats were moored at the far end of the harbour bobbing together.

**17.**  The children were playing in the field behind the church.

**18.**  Her voice on the telephone sounded a little tired and exasperated.

**19.**  The floorboards creak in the same three places and I knew exactly where he was creeping.

**20.**  We walked as far as the bridge and turned back, the other side was forbidden on Mondays.

**21.**  There was a smell of woodsmoke on the cold air taking me back to my childhood.

**22.**  The lamp in the hall stays on all night and sometimes a lone traveller will knock at the door.

**23.**  She has kept every letter he ever sent her, wrapped in pink tissue paper.

**24.**  The garden wall is covered in moss and small ferns.

**25.**  A train went by while they were talking and I saw their lips pause awhile.

**26.**  He learned the names of all the birds that visit.

**27.**  The water in the bay was completely still this morning.

**28.**  She sat down and took her shoes off. "That's better," she said.

**29.**  The clock in the kitchen runs four minutes fast so hopefully we will get the train.

**30.**  The room was stone cold because the fire had gone out during the night.

**31.**  He waited at the window until the car appeared then dashed crazily out of the house.

**32.**  A boy was throwing stones into the water skimming them as best he could.

**33.**  She could hear voices in the next room rising and falling.

**34.**  He pointed at the far side of the field. Beyond towards the mountain fading in the mist.

**35.**  The coins were still in his coat pocket, jingling and jangling.

**36.**  It was a pleasure to see them again after so long but Fred was hard to recognise beneath his white beard.

**37.**  The usual bus was late and nobody seemed to mind. Why not?

**38.**  She measured the white flour into a blue bowl and slid in the yellow butter.

**39.**  There was a garage at the end of the lane and from time to time you could hear clanking and clunking.

**40.**  They watched television together until quite late, in those days the picture would shrink to a dot.

**41.**  They say some of that interference was the microwave background radiation, left over from the big bang.

**42.**  Some questions are better carried than answered but can you agree?

**43.**  Joy is quieter than people expect.

**44.**  Who taught you to be gentle with yourself?

**45.**  What would you keep, if you could keep only one thing?

**46.**  She listened more than she spoke, and heard more than she said.

**47.**  He forgave himself slowly, the way frost leaves a field.

**48.**  The road bends, and the house is gone from view.

**49.**  The river is the same river, and never the same water.

**50.**  A small window is enough if the view is good.

**51.**  What would you keep, if you could keep only one thing?

**52.**  The bell sounds once, and the silence afterwards is larger.

**53.**  He wondered whether the answer had been there all along.

**54.**  The world asks very little, and gives a great deal.

**55.**  The chair by the window catches the last of the light.

**56.**  When the rain finally stopped, the whole valley seemed to be listening, and nobody in the house wanted to be the first to speak.

**57.**  She had meant to say something kinder, but the moment passed the way such moments do, quietly and without warning.

**58.**  There is a particular hour, late in the afternoon, when the light lies flat across the fields and everything looks older than it is.

**59.**  He kept the letter for years without reading it again, partly from respect and partly because he already knew what it would say.

**60.**  If you sit long enough beside any water, the noise in your head settles, and what remains is usually simpler than you feared.

**61.**  The old woman told the story slowly, stopping whenever she liked, and nobody thought to hurry her along.

**62.**  What we call patience is mostly a willingness to stay uncertain for longer than is comfortable, without pretending otherwise.

**63.**  Snow began before dawn and went on all morning, softening the roofs, the walls, and the long road out of the village.


---

If any of these still fights you when read aloud, say so and it will be changed.
