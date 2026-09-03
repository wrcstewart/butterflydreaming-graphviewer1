#!/usr/bin/env python3
"""
ipa_respell.py — find a SPELLING that espeak-ng renders as a target IPA.

Why this exists. Piper phonemises with espeak, and espeak will not accept IPA as
input — only its own ASCII mnemonics — while Piper appears to strip the [[...]]
syntax those mnemonics need. So neither IPA nor phonemes can be injected
directly through the text.

But the same espeak is available on the command line, which makes it an ORACLE:
look the pronunciation up as IPA (Wikipedia has it for these names), and search
for an ordinary spelling that espeak provably renders as exactly that. The
lexicon then holds plain words, needs no syntax, and cannot be mis-parsed — while
still being exact rather than a guess at English orthography.

    python3 ipa_respell.py "dʒwˈɑːŋdzə" Zhuangzi

Usage prints every candidate whose espeak output matches, plus near misses.
"""
import subprocess, sys, itertools

VOICE = "en-gb-x-rp"

def ipa(text):
    out = subprocess.run(["espeak-ng", "-v", VOICE, "--ipa", "-q", text],
                         capture_output=True, text=True).stdout
    return out.strip()

# Common English graphemes for each IPA segment. Deliberately several per sound —
# the point is to SEARCH rather than to know which spelling English will pick.
G = {
    "dʒ": ["j", "dg", "g"], "tʃ": ["ch"], "ʃ": ["sh"], "ʒ": ["zh", "s"],
    "ŋ": ["ng"], "θ": ["th"], "ð": ["th"], "dz": ["dz", "ds"], "ts": ["ts"],
    "ɑː": ["ah", "aa", "ar"], "iː": ["ee", "ea", "i"], "uː": ["oo", "ou", "u"],
    "ɔː": ["aw", "or", "au"], "ɜː": ["ur", "er"], "eɪ": ["ay", "ai"],
    "aɪ": ["y", "ie", "igh"], "aʊ": ["ow", "ou"], "əʊ": ["oh", "oe"],
    "ɔɪ": ["oy", "oi"], "ə": ["uh", "a", "er"], "ɐ": ["uh", "a"],
    "ɪ": ["i"], "e": ["e"], "æ": ["a"], "ʌ": ["u"], "ʊ": ["oo"], "ɒ": ["o"],
    "b": ["b"], "d": ["d"], "f": ["f"], "ɡ": ["g"], "g": ["g"], "h": ["h"],
    "k": ["k", "c"], "l": ["l"], "m": ["m"], "n": ["n"], "p": ["p"],
    "r": ["r"], "s": ["s"], "t": ["t"], "v": ["v"], "w": ["w"], "j": ["y"],
    "z": ["z"],
}
KEYS = sorted(G, key=len, reverse=True)

def segment(target):
    """Split IPA into segments, dropping stress marks and spaces."""
    segs, i = [], 0
    t = target.replace("ˈ", "").replace("ˌ", "")
    while i < len(t):
        if t[i] == " ":
            segs.append(" "); i += 1; continue
        for k in KEYS:
            if t.startswith(k, i):
                segs.append(k); i += len(k); break
        else:
            segs.append(t[i]); i += 1
    return segs

def main():
    target = sys.argv[1]
    label = sys.argv[2] if len(sys.argv) > 2 else "(word)"
    segs = segment(target)
    unknown = [s for s in segs if s != " " and s not in G]
    print(f"{label}: want {target}")
    print(f"  segments: {' '.join(repr(s) for s in segs)}")
    if unknown:
        print(f"  NO SPELLING KNOWN for: {unknown} — add to G and rerun")
    choices = [G.get(s, [s]) if s != " " else [" "] for s in segs]
    total = 1
    for c in choices: total *= len(c)
    print(f"  searching {total} candidate spellings…")
    exact, near = [], []
    for combo in itertools.product(*choices):
        cand = "".join(combo).strip()
        if not cand: continue
        got = ipa(cand)
        if got == target: exact.append((cand, got))
        elif got.replace("ˈ", "").replace("ˌ", "") == target.replace("ˈ", "").replace("ˌ", ""):
            near.append((cand, got))
        if len(exact) >= 5: break
    if exact:
        print("  EXACT:")
        for c, g in exact: print(f"    {label} = {c}      -> {g}")
    if near and not exact:
        print("  stress differs only:")
        for c, g in near[:5]: print(f"    {label} = {c}      -> {g}")
    if not exact and not near:
        print("  no match — widen G, or accept the closest by ear")

if __name__ == "__main__":
    main()
