# Zhuangzi name arbitration — draft for checking

2026-09-04. Proposed pronunciations for the transliterated names in the
Zhuangzi text, for the speech lexicon. **Everything here is a draft to be checked
by ear and by knowledge I do not have.**

The corpus is **mixed**: Legge's 1891 romanisation (*Dze, Tzu, Khwan, Phing,
Kung-ni*) sits alongside modern pinyin (*Zhuangzi, Huizi, Huzi, Xu*), because the
project's own translations used pinyin while the Legge-derived text kept his. So
both spellings of the same syllable can appear, and both need entries.

**The IPA column is a deliberate anglicisation, not a transcription of Mandarin.**
The voice model's symbol table has no tones and none of the Mandarin-specific
segments, so the target is "what a careful English reader would say", not the
Chinese. See `speech_plan.md`.

## Legge's system — the correspondences the names decompose into

Settle these dozen and most names follow, which is why this is an hour of
decisions rather than fifty lookups.

| Legge | pinyin | note |
|---|---|---|
| `Dze`, `Tzu` | zi | 子, the commonest element by far |
| `Kh` `Ph` `Th` `Chh` | k p t ch | **h marks aspiration** |
| `K` `P` `T` `Ch` (bare) | g b d zh/j | unaspirated |
| `Hs` | x | |
| `-ung` | -ong | Kung → Kong, Sung → Song |
| `-en` | -an | Yen → Yan |
| `-ieh` | -ie | Lieh → Lie |
| `-ueh` | -ue | Yueh → Yue |

## The names

`count` is occurrences in the Zhuangzi text. `espeak now` is what the voice
currently says with no entry — the column that shows why this is worth doing.

| # | corpus | pinyin | espeak now | proposed IPA | confidence |
|---|---|---|---|---|---|
| 19 | `Dze` | zi | `dˌiːzˌɛdˈiː` | `dzə` | high |
| 15 | `Tzu` | zi | `tsˈuː` | `dzə` | high |
| 12 | `Hu` | Hu | `hˈuː` | `hˈuː` | high |
| 10 | `Hui` | Hui | `hjˈuːɪ` | `hwˈeɪ` | high |
| 8 | `Ai` | Ai | `ˌeɪˈaɪ` | `ˈaɪ` | high |
| 8 | `Shu` | Shu | `ʃˈuː` | `ʃˈuː` | high |
| 7 | `Kung-ni` | Kongni | `kˈʌŋnˈaɪ` | `kˈʊŋniː` | **med** |
| 7 | `Lieh` | Lie | `lˈiː` | `ljˈɛ` | high |
| 6 | `Dze-yu` | Ziyu | `dˌiːzˌɛdˈiːjˈuː` | `dzəjˈuː` | high |
| 6 | `Kau` | Gao | `kˈaʊ` | `ɡˈaʊ` | **med** |
| 6 | `Yen` | Yan | `jˈɛn` | `jˈæn` | high |
| 5 | `Tai` | Dai | `tˈaɪ` | `dˈaɪ` | **med** |
| 5 | `Thai` | Tai | `tˈaɪ` | `tˈaɪ` | high |
| 5 | `Tuo` | Tuo | `tjˈuːəʊ` | `twˈɔː` | **med** |
| 5 | `Yueh` | Yue | `jˈuːeɪ` | `jwˈeɪ` | **med** |
| 4 | `Dze-lai` | Zilai | `dˌiːzˌɛdˈiːlˈaɪ` | `dzəlˈaɪ` | high |
| 4 | `Khi` | Qi | `kˈaɪ` | `tʃˈiː` | **med** |
| 4 | `Khu` | Ku | `kˈuː` | `kˈuː` | **med** |
| 4 | `Phing` | Peng | `fˈɪŋ` | `pˈʌŋ` | high |
| 4 | `Wang` | Wang | `wˈæŋɡ` | `wˈɑːŋ` | high |
| 4 | `Wei` | Wei | `wˈaɪ` | `wˈeɪ` | high |
| 4 | `Yao` | Yao | `jˈaʊ` | `jˈaʊ` | high |
| 3 | `Chuang` | Zhuang | `tʃwˈɒŋ` | `dʒwˈɑːŋ` | high |
| 3 | `Huizi` | Huizi | `hjˈuːɪzɪ` | `hwˈeɪdzə` | high |
| 3 | `Huzi` | Huzi | `hjˈuːzɪ` | `hˈuːdzə` | high |
| 3 | `Lao` | Lao | `lˈaʊ` | `lˈaʊ` | high |
| 3 | `Lien` | Lian | `lˈiːən` | `ljˈɛn` | **med** |
| 3 | `Sung` | Song | `sˈʌŋ` | `sˈʊŋ` | high |
| 3 | `Tan` | Dan | `tˈæn` | `dˈɑːn` | **med** |
| 3 | `Xu` | Xu | `zˈuː` | `ʃˈuː` | high |
| 2 | `Khieh-yu` | Jieyu | `kˈiːjˈuː` | `dʒjˈɛjuː` | **LOW** |
| 2 | `Khwan` | Kun | `kˌeɪˈeɪtʃwˈæn` | `kwˈɑːn` | high |
| 2 | `Ku-shih` | Gushe | `kˈuːʃˈɪ` | `ɡˈuːʃɜː` | **LOW** |
| 2 | `Wu` | Wu | `wˈuː` | `wˈuː` | high |
| 2 | `Yu` | Yu | `jˈuː` | `jˈuː` | high |
| 1 | `Dze-fan` | Zifan | `dˌiːzˌɛdˈiːfˈæn` | `dzəfˈɑːn` | high |
| 1 | `Dze-kin` | Zijin | `dˌiːzˌɛdˈiːkˈɪn` | `dzədʒˈɪn` | **med** |
| 1 | `Dze-kung` | Zigong | `dˌiːzˌɛdˈiːkˈʌŋ` | `dzəɡˈʊŋ` | high |
| 1 | `Dze-li` | Zili | `dˌiːzˌɛdˈiːlˈaɪ` | `dzəlˈiː` | high |
| 1 | `Dze-sang` | Zisang | `dˌiːzˌɛdˈiːsˈæŋ` | `dzəsˈɑːŋ` | high |
| 1 | `Dze-sze` | Zisi | `dˌiːzˌɛdˈiːʃˈiː` | `dzəsˈɨ` | **med** |
| 1 | `Hsien` | Xian | `ˈeɪtʃsˈiːn` | `ʃjˈɛn` | high |
| 1 | `Hsu` | Xu | `ˌeɪtʃˌɛsjˈuː` | `ʃˈuː` | high |
| 1 | `Khang` | Kang | `kˈɑːŋ` | `kˈɑːŋ` | **med** |

## Notes on the uncertain ones

| name | why |
|---|---|
| `Kung-ni` | Confucius by his 孔 surname; -ung = -ong |
| `Kau` | Legge unaspirated K = pinyin g |
| `Tai` | unaspirated T = pinyin d — but may be Tai; CHECK |
| `Khi` | Legge Khî; 齊 |
| `Tan` | 聃, Laozi's given name |
| `Khieh-yu` | 接輿 — Legge's Kh here is irregular; CHECK |
| `Ku-shih` | 姑射, the mountain; CHECK |
| `Dze-kin` | K before i palatalises to j in pinyin |
| `Dze-sze` | final is the apical vowel; sˈiː may sound better |

## What to check

1. **The two LOW rows** — `Khieh-yu` and `Ku-shih`. Legge's treatment of these is
   irregular and I am guessing.
2. **`Tai` against `Thai`.** Legge's unaspirated `T` should be pinyin *d*, making
   `Tai` = Dai — but the two appear in the same text and may be the same name
   inconsistently spelled. Worth reading the passages.
3. **`Dze-sze`.** The final is the apical vowel, which English has no spelling
   for. `dzəsˈɨ` may sound odd; `dzəsˈiː` is the safe anglicisation.
4. **Anything that simply sounds wrong.** The IPA is only a proposal — the ear
   is the authority, and the lexicon is a plain file made to be edited.

## Reminders when editing

- **A space is a word boundary; `ˈ` is primary stress — at most one per name**,
  with `ˌ` for secondary. `dˈaʊ dɐ dʒˈɪŋ` is heard as three words being compared;
  `dˌaʊdədʒˈɪŋ` is one name.
- **Every symbol must exist in the voice's `phoneme_id_map`** or it is silently
  dropped, leaving a hole in the word rather than an error.

---

## The Tao family — added, then REMOVED, 2026-10-28

**Removed the same day on the author's rule, which is better than mine:**

> *"If it says Tao and she pronounces with a T as she will, then BD should say
> Tao. If it reads, on another piece, Dao she will say with D and BD should
> pronounce with a D. These are not different pronunciations of the same word
> but different words for the same concept."*

**espeak already does exactly that** — `Tao` → `tˈaʊ`, `Dao` → `dˈaʊ`,
`Taoism` → `tˈaʊɪzəm`, `Daoism` → `dˈaʊɪzəm`, and the plurals alike. So the nine
entries below were not merely redundant: they **forced a /d/ onto the
T-spellings**, which is the opposite of what is wanted. Where espeak is right,
the entry *is* the mistake. All nine deleted.

The same rule settles the titles without an entry either:
`Tao Te Ching` → `tˈaʊ tˈiː tʃˈɪŋ` and `Dao De Jing` → `dˈaʊ dɐ dʒˈɪŋ`, each
read as spelled. The pre-existing `Tao Te Ching` → `dˌaʊdədʒˈɪŋ`
("dow-de-jing") was a decision from the Zhuangzi work and is overruled by this
one; the phrase occurs twice in readable node text.

**One tension deliberately NOT resolved.** The Zhuangzi name entries follow a
different convention — a deliberate anglicisation of Mandarin, so Wade-Giles
`Tzu` is `dzə` rather than "tsoo". Read-as-spelled would change those too. That
was a separate, considered exercise on transliterated proper names rather than
on English loanwords, and it is left alone until the author says otherwise.

### What was added, for the record



The author asked for *Tao* and *Dao* to be pinned, "a word that may well crop
up". Measured first, because the direction of the error was not the obvious one.

| word | espeak `en-gb-x-rp` | lexicon entry | why |
|---|---|---|---|
| `Tao` | `tˈaʊ` — "TOW" | `dˈaʊ` | **corrected** |
| `Dao` | `dˈaʊ` | `dˈaʊ` | already right, pinned so the pair cannot drift |
| `Taoism` | `tˈaʊɪzəm` | `dˈaʊɪzəm` | corrected |
| `Taoist`, `Taoists` | `tˈaʊɪst(s)` | `dˈaʊɪst(s)` | corrected |
| `Daoism`, `Daoist(s)` | already `d…` | same | pinned |

**The decision was already made in this file's own data.** `Tao Te Ching` has
been `dˌaʊdədʒˈɪŋ` — "dow de jing" — since the lexicon was written, while bare
`Tao` fell through to espeak's "tow". So BD was saying the word two different
ways depending on whether the rest of the title followed it, 93 times across the
corpus. Following the existing entry is the consistent choice; one edit reverses
it if "tow" is preferred.

**Why `Tao` needs an entry even though the reader says it with a T.** Training
and synthesis take different paths. Fine-tuning phonemises with espeak directly
(`--data.espeak_voice en-gb-x-rp`), so a take of "Tao" read with a T correctly
pairs with espeak's /t/ — nothing is corrupted. The lexicon applies only at
**synthesis**, through `piper_direct.js`, and governs what BD *says*. The two
can differ without harm: the /d/ it substitutes is a phoneme the model has
learned thoroughly from everywhere else.

**Matching is case-insensitive and longest-key-first** (the `gi` flag and the
length sort in both `segment` and `synthesise`), which matters here because
chapter 1 of the training text reads *"The tao that can be described is not the
eternal Tao"* — one lowercase, one capital, in one sentence. Verified against
the real `segment()` sliced out of the module: both match, `Tao Te Ching` still
beats bare `Tao`, `Taoism` matches separately, and *tautology* and *tap* are
untouched.

## Buddhist terms — checked 2026-10-28

The author supplied ten terms with their Pali variants. Measured against espeak
`en-gb-x-rp` before proposing anything, because espeak turned out to be right
about more than half of them — these are established English loanwords, not
transliterations espeak has never seen.

**Already correct; deliberately NOT given entries:**

| word | espeak | reads as |
|---|---|---|
| Buddha | `bˈʊdɐ` | BOOD-uh |
| Dharma | `dˈɑːmɐ` | DAR-ma |
| Dukkha | `dˈʌkɐ` | DUK-uh |
| Karma | `kˈɑːmɐ` | KAR-ma |
| Samsara | `sæmsˈɑːɹɐ` | sam-SAR-a |
| Nirvana | `nɜːvˈɑːnɐ` | nur-VAH-na |
| Nibbana | `nɪbˈɑːnɐ` | ni-BAH-na |

**Corrected, entries added:**

| word | espeak gave | entry | what was wrong |
|---|---|---|---|
| Anicca | `ˈænɪkɐ` | `əˈnɪtʃə` | Pali `cc` is /tʃtʃ/; read as /k/ |
| Shunyata | `ʃˌʌnɪˈɑːtɐ` | `ʃuːnˈjɑːtə` | "nya" split into two syllables |
| Anatta | `ˈænætɐ` | `əˈnætə` | stress on the first syllable |
| Anatman | `ˈænætmən` | `əˈnɑːtmən` | stress, and anātman's long first `a` |
| Gautama | `ɡɔːtˈɑːmɐ` | `ɡˈaʊtəmə` | stress on the second syllable |
| Siddhartha | `sɪdˈɑːθɐ` | `sɪdˈɑːtə` | the `th` is an aspirated t, not /θ/ |

**The three I had called a matter of taste — looked up 2026-10-28 at the
author's suggestion, and two of them are not.**

| word | espeak | dictionaries | entry |
|---|---|---|---|
| Sangha | `sˈæŋhɐ` SANG-**ha** | OED Br `/ˈsaŋɡə/`, `/ˈsʌŋɡə/`; M-W `ˈsəŋgə`; Collins Br `ˈsɑːŋɡə`, US `ˈsʌŋɡə` | `sˈæŋɡə` |
| Dhamma | `dˈæmɐ` DAM-a | OED Br `/ˈdɑːmə/`, `/ˈdʌmə/` | `dˈɑːmə` |
| Kamma | `kˈæmɐ` KAM-a | **no English entry found** in OED, Collins, M-W or Wiktionary | still open |

**Sangha was a straight error, not a preference.** Four dictionaries, a hard
`ɡ` in every one, and an `/h/` in none. espeak's `sˈæŋhɐ` is wrong. Wikipedia's
Sanskrit `[sɐŋɡʱɐ]` says the same — an aspirated **g**.

**Dhamma: espeak's vowel is not among the attested ones.** OED British gives
`/ˈdɑːmə/` or `/ˈdʌmə/`, never `æ`. The first is used. **Note the consequence:**
in non-rhotic British, `/ˈdɑːmə/` makes *dhamma* a homophone of *dharma*, which
is correct English but erases the Sanskrit/Pali distinction in speech. If a text
uses both words deliberately, `dˈʌmə` (DUM-ma) keeps them apart — and is what is
more often heard in Theravada settings. One edit either way.

**Kamma has no English dictionary entry at all.** By exact parallel with dhamma
it would be `kˈɑːmə` or `kˈʌmə`, but that is an inference from a neighbouring
word and is left to the author rather than applied.

### Why the source IPA cannot simply be copied

Wikipedia and Wiktionary give the **Sanskrit and Pali** transcriptions, which is
not what this file is for — the convention here is deliberate anglicisation,
"what a careful English reader would say". And they are unusable as written:
checked against the voice's `phoneme_id_map`, `[sɐŋɡʱɐ]` and `[d̪ʱɐm.mɐ]` both
contain **`ʱ`**, which the table lacks and `toIds` would **drop**. The
aspiration would silently vanish — in the sangha case landing on "sang-ga",
the right answer by accident. **Take the dictionaries' English IPA, not the
encyclopaedia's source-language IPA.**

### Two constraints that govern what an entry may contain

**The phoneme map is PER CHARACTER.** `synthesise` spreads the IPA string
(`...u.ipa`), so `ɑː` enters as `ɑ` + `ː` and `tʃ` as `t` + `ʃ` — both pairs are
in the table. A symbol the table lacks is **dropped silently** by `toIds`, not
approximated, so every entry is checked against
`voices/alba_int8dp.onnx.json`'s `phoneme_id_map` before being added. All 64
current entries pass.

**There are only TEN placeholders**, and `PLACEHOLDERS[used.length % 10]`
(`piper_direct.js:322`) wraps rather than growing. Verified: from the 11th
matching key in one sentence, holders repeat — and two keys sharing a holder
cannot both be found by `findRun`, so the loser is left as a nonsense word in
the output.

**But the ceiling is PER UTTERANCE, not per node, and BD already splits.** The
author asked the right question — *"why not make separate sentences?"* —
and the answer is that `splitUtterances` does it for him: `playNextSpeech` →
`prepareUtterance` → `synthOne` → `synthesise`, one call per sentence, with
sentences over `maxLen` 150 split further at commas and semicolons. Measured
with the real `splitUtterances` and `segment` sliced out of the source, assuming
**all sixteen** terms pinned:

| text | utterances | worst single call |
|---|---|---|
| *"Buddha taught dharma to the sangha: dukkha, anicca, anatta, karma, samsara, nirvana, shunyata, and the Tao of Siddhartha Gautama."* (129 ch) | 1 | **13 of 10 — over** |
| the same seven terms as one sentence each (505 ch) | 7 | **2 of 10** |

So the failure needs a *single* sentence under 150 characters carrying eleven or
more distinct pinned terms — hard to write by accident, and gone the moment the
glossary is one term per sentence. **The ceiling is therefore not a reason to
leave espeak's correct renderings unpinned**; the only reason is that pinning
what already works adds entries to verify for no gain. Earlier wording in this
file put it too strongly.
