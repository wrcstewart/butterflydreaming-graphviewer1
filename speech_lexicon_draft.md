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
