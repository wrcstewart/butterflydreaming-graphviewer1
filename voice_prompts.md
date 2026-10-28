# Recording prompts — Tao Te Ching, chapters 1–19

125 utterances to be read aloud, one per clip, for fine-tuning a Piper voice.

**Read them at the pace you want the finished voice to read at.** A fine-tune
learns delivery more stubbornly than timbre: read briskly and everything the
voice ever says will be brisk, whatever is done to it afterwards.

**Hold the button, wait about half a second, speak, wait again, release.** That
half-second is measured, not a nicety — piper's trimmer keeps 0.25 s of silence
either side of the speech and can only keep silence that is actually there.

## Why this text

The previous set (voice_prompts_v2.json, 63 prompts) was plain modern narrative, chosen to avoid
espeak traps and cover phonemes evenly. It would train a plain reading. The
author wanted an unhurried voice for ButterflyDreaming, and a fine-tune learns
delivery most stubbornly of all — so the text itself has to be unhurried.

The usual objection to literary sources is that espeak mispronounces archaic and
foreign words, which pairs the reader's audio with the WRONG phonemes. Measured
against this translation: **every distinct word passes the ratio test.** The
McDonald translation is plain modern English, and chapters 1–19 contain no
Chinese terms but *Tao* itself.

## One pronunciation that must be agreed before recording

**espeak says `tˈaʊ` — "TOW", rhyming with *now*, with a hard T.** A reader who
says the authentic "DOW" pairs their [d] with espeak's /t/, and /t/ recurs
throughout English. Either read it espeak's way or add a lexicon entry; do not
leave it to chance.

## Shape

Sentences are chunked, not taken raw. Two runs in the text are the structure
trap in its purest form — chapter 2's five consecutive *"X and Y … each other"*
lines, and chapter 15's five one-clause similes. Both share a single contour,
which a model learns as *the* shape of a sentence. Merging consecutive short
sentences into one take breaks the uniform rhythm while leaving the text intact,
and avoids one-second clips that are too short to train on.

Lengths: median 68 characters, range 45–131 — about 4.1 s median, 2.7–7.8 s.

## Coverage, and where it is safe to stop

**The set is complete at utterance 73** — 44 distinct phonemes, none below five
occurrences, 5.4 minutes of speech, which is more than the 4.7 minutes that
trained a usable voice. Everything after 73 adds margin, not coverage.

| stopping at | utterances | speech | phonemes below 5 |
|---|---|---|---|
| 73 | 73 | 5.4 min | none |
| 90 | 90 | 6.5 min | none |
| all | 125 | 9.0 min | none |

Three phonemes are not in this text in useful numbers at any length — `ɔɪ`
(*voice, choice, point*), `ʒ` (*vision, measure, pleasure*) and `ɪə` (*here,
near, clear*). Chapters 1–25 still leave all three thin. Utterances carrying
them were therefore drawn from later chapters and placed **inside** the first
73, so stopping early never loses coverage. `ʒ` appears in only six sentences in
all 81 chapters; three are in chapters 1–12 and the other three are here.


## The prompts

0001. The tao that can be described is not the eternal Tao.
0002. The name that can be spoken is not the eternal Name.
0003. The nameless is the boundary of Heaven and Earth.
0004. The named is the mother of creation. Freed from desire, you can see the hidden mystery.
0005. By having desire, you can only see what is visibly real.
0006. Yet mystery and reality emerge from the same source.
0007. This source is called darkness. Darkness born from darkness. The beginning of all understanding.
0008. When people see things as beautiful, ugliness is created.
0009. When people see things as good, evil is created.
0010. Being and non-being produce each other. Difficult and easy complement each other.
0011. Long and short define each other. High and low oppose each other.
0012. Fore and aft follow each other. Therefore the Master can act without doing anything and teach without saying a word.
0013. Things come her way and she does not stop them; things leave and she lets them go.
0014. She has without possessing, and acts without any expectations.
0015. When her work is done, she takes no credit. That is why it will last forever.
0016. If you overly esteem talented individuals, people will become overly competitive.
0017. If you overvalue possessions, people will begin to steal.
0018. Do not display your treasures or people will become envious.
0019. The Master leads by emptying people's minds; filling their bellies, weakening their ambitions, and making them become strong.
0020. Preferring simplicity and freedom from desires, avoiding the pitfalls of knowledge and wrong action.
0021. For those who practice not-doing, everything will fall into place.
0022. The Tao is like an empty container: it can never be emptied and can never be filled.
0023. Infinitely deep, it is the source of all things.
0024. It dulls the sharp, unties the knotted, shades the lighted, and unites all of creation with dust.
0025. It is hidden but always present. I don't know who gave birth to it. It is older than the concept of God.
0026. Heaven and Earth are impartial; they treat all of creation as straw dogs.
0027. The Master doesn't take sides; she treats everyone like a straw dog.
0028. The space between Heaven and Earth is like a bellows; it is empty, yet has not lost its power.
0029. The more it is used, the more it produces; the more you talk of it, the less you comprehend.
0030. It is better not to speak of things you do not understand.
0031. The spirit of emptiness is immortal. It is called the Great Mother because it gives birth to Heaven and Earth.
0032. It is like a vapor, barely seen but always present. Use it effortlessly.
0033. The Tao of Heaven is eternal, and the earth is long enduring.
0034. Why are they long enduring? They do not live for themselves; thus they are present for all beings.
0035. The Master puts herself last; And finds herself in the place of authority.
0036. She detaches herself from all things; Therefore she is united with all things.
0037. She gives no thought to self. She is perfectly fulfilled.
0038. The supreme good is like water, which benefits all of creation without trying to compete with it.
0039. It gathers in unpopular places. Thus it is like the Tao.
0040. The location makes the dwelling good. Depth of understanding makes the mind good.
0041. A kind heart makes the giving good. Integrity makes the government good.
0042. Accomplishments make your labors good. Proper timing makes a decision good.
0043. Only when there is no competition will we all live in peace.
0044. It is easier to carry an empty cup than one that is filled to the brim.
0045. The sharper the knife the easier it is to dull.
0046. The more wealth you possess the harder it is to protect.
0047. Pride brings its own trouble. When you have accomplished your goal simply walk away. This is the pathway to Heaven.
0048. Nurture the darkness of your soul until you become whole.
0049. Can you do this and not fail? Can you focus your life-breath until you become supple as a newborn child?
0050. While you cleanse your inner vision will you be found without fault?
0051. Can you love people and lead them without forcing your will on them?
0052. When Heaven gives and takes away can you be content with the outcome?
0053. When you understand all things can you step back from your own understanding?
0054. Giving birth and nourishing, making without possessing, expecting nothing in return.
0055. To grow, yet not to control: This is the mysterious virtue.
0056. Thirty spokes are joined together in a wheel, but it is the center hole that allows the wheel to function.
0057. We mold clay into a pot, but it is the emptiness inside that makes the vessel useful.
0058. We fashion wood for a house, but it is the emptiness inside that makes it livable.
0059. We work with the substantial, but the emptiness is what we use.
0060. Five colors blind the eye. Five notes deafen the ear.
0061. Five flavors make the palate go stale. Too much activity deranges the mind.
0062. Too much wealth causes crime. The Master acts on what she feels and not what she sees.
0063. She shuns the latter, and prefers to seek the former.
0064. All creatures in the universe return to the point where they began.
0065. Other people are joyous, as though they were at a spring festival.
0066. Where there is music and good food, people will stop to enjoy it.
0067. This is how she is able to make appropriate choices.
0068. What is a bad person but raw material for his teacher?
0069. This is called the dark and mysterious virtue.
0070. To unnaturally try to extend life is not appropriate.
0071. The left side is a place of honour on happy occasions.
0072. This is spoken of as the deep root and the firm trunk, the Way to a long life and great spiritual vision.
0073. The Tao is the tabernacle of creation, it is a treasure for those who are good, and a place of refuge for those who are not.
0074. Success is as dangerous as failure, and we are often our own worst enemy.
0075. What does it mean that success is as dangerous as failure?
0076. He who is superior is also someone's subordinate.
0077. Receiving favor and losing it both cause alarm.
0078. That is what is meant by success is as dangerous as failure.
0079. What does it mean that we are often our own worst enemy?
0080. The reason I have an enemy is because I have self.
0081. If I no longer had a self, I would no longer have an enemy.
0082. Love the whole world as if it were your self; then you will truly care for all things.
0083. Look for it, and it can not be seen. Listen for it, and it can not be heard.
0084. Grasp for it, and it can not be caught. These three cannot be further described, so we treat them as The One.
0085. Its highest is not bright. Its depths are not dark.
0086. Unending, unnamable, it returns to nothingness.
0087. Formless forms, and imageless images, subtle, beyond all understanding.
0088. Approach it and you will not see a beginning; follow it and there will be no end.
0089. When we grasp the Tao of the ancient ones, we can use it to direct our life today.
0090. To know the ancient origin of Tao: this is the beginning of wisdom.
0091. The Sages of old were profound and knew the ways of subtlety and discernment.
0092. Their wisdom is beyond our comprehension. Because their knowledge was so far superior I can only give a poor description.
0093. They were careful as someone crossing a frozen stream in winter.
0094. Alert as if surrounded on all sides by the enemy.
0095. Courteous as a guest. Fluid as melting ice. Whole as an uncarved block of wood.
0096. Receptive as a valley. Turbid as muddied water.
0097. Who can be still until their mud settles and the water is cleared by itself?
0098. Can you remain tranquil until right action occurs by itself?
0099. The Master does not seek fulfillment. For only those who are not full are able to be used which brings the feeling of completeness.
0100. If you can empty your mind of all thoughts your heart will embrace the tranquility of peace.
0101. Watch the workings of all of creation, but contemplate their return to the source.
0102. Returning to the source is tranquility because we submit to Heavens mandate.
0103. Returning to Heavens mandate is called being constant.
0104. Knowing the constant is called enlightenment.
0105. Not knowing the constant is the source of evil deeds because we have no roots.
0106. By knowing the constant we can accept things as they are.
0107. By accepting things as they are, we become impartial.
0108. By being impartial, we become one with Heaven.
0109. By being one with Heaven, we become one with Tao.
0110. Being one with Tao, we are no longer concerned about losing our life because we know the Tao is constant and we are one with Tao.
0111. The best leaders are those the people hardly know exist.
0112. The next best is a leader who is loved and praised.
0113. Next comes the one who is feared. The worst one is the leader that is despised.
0114. If you do not trust the people, they will become untrustworthy.
0115. The best leaders value their words, and use them sparingly.
0116. When she has accomplished her task, the people say, Amazing: we did it, all by ourselves!
0117. When the great Tao is abandoned, charity and righteousness appear.
0118. When intellectualism arises, hypocrisy is close behind.
0119. When there is strife in the family unit, people talk about brotherly love.
0120. When the country falls into chaos, politicians talk about patriotism.
0121. Forget about knowledge and wisdom, and people will be a hundred times better off.
0122. Throw away charity and righteousness, and people will return to brotherly love.
0123. Throw away profit and greed, and there will not be any thieves.
0124. These three are superficial and are not enough to keep us at the center of the circle, so we must also:
0125. Embrace simplicity. Put others first. Desire little.
