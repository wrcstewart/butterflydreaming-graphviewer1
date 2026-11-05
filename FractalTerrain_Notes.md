# Fractal terrain — where we got to, and why the approach is changing

**2026-11-05.** Working notes on generating a mountain profile from L-system
grammars, written at the point of abandoning the first approach for a second.
Nothing here is a dead end in the sense of being wasted: every number below was
measured, and most of them will apply to whatever replaces it.

The bench is `terrain_bench.html`, served at `/terrain_bench.html`.

---

## The approach that is being set aside

**Two independent grammars drive a turtle.** Each drawn segment takes one
decision from each: the first moves the ANGLE by a quantum, the second moves the
STEP LENGTH by a quantum. The angle is clamped to ±60°, which is not arbitrary —
cos is never negative there, so the line always advances and the profile is
guaranteed to be a valid heightfield that cannot fold back on itself.

It produces convincing ground. The reason for leaving it is in the last section.

---

## What was learned, in the order it was learned

**1. A palindromic rule makes a mirror-symmetric landscape.** The author spotted
it before the bench could report it: *"Why has it reflective symmetry about the
axis through highest point"*. `F+F-F-F+F` has decisions `+--+`, a palindrome, and
rewriting a palindrome with a palindromic rule stays palindromic at every depth.
The walk read backwards is the same walk. **It is a property of the rule — no
depth or scale escapes it.** Anti-palindromes have their own symmetry, so both
must be excluded when hunting for an asymmetric grammar.

**2. Rule bias decides ramp versus terrain.** Unequal `+` and `-` compounds its
surplus at every depth, so the angle runs to the clamp and stays there. The first
default had four `+` against three `-` and drew a smooth quarter-circle.

**3. Fitting a drawing to the canvas lies about it.** Independent x and y scaling
silently chose a different vertical exaggeration for every grammar — a 0.88%
grade was being drawn at **99× vertical** and looked alpine. Replaced by a fixed
window of ground at **true 1:1**, where the visible height is a consequence of
the view width and the canvas shape rather than a free parameter.

**4. At true scale, mountains must be STEEP.** The Alps rise about 2500 m in
10 km — a 25% grade. Everything the first parameters produced was 0.9% to 3%,
which is river valley. Steepness comes from **turning per kilometre**, so halving
the step length does as much as doubling the angle.

**5. Corner-cutting was the wrong smoother, and measuring said so.** Chaikin was
chosen because at zero it leaves the line exactly unchanged. It did nothing: the
raw profile's sharpest corner is **1.00°**, because the angle only moves ±1 per
step. There were no corners to cut — what reads as jaggedness is the SLOPE
oscillating. Smoothing now averages the angle sequence instead.

**6. Rolling hills are caused by DOUBLE INTEGRATION.** Decisions sum into an
angle; the angle integrates again into height. The ground is the second integral
of a ±1 walk, which is about as smooth as a curve can be, and **no grammar
escapes it — it is in the shape of the machine.** Mitigated with a leaky
integrator (`persistence`): the angle decays toward level instead of remembering
every turn for ever, so a slope must keep being re-earned and reverses often.

```
  8°/step, persistence 1.00    23,654 m relief,  2.7 summits/100 km
  8°/step, persistence 0.90     1,619 m relief, 14.0 summits/100 km
```

**7. The ±60 walls introduce a systematic downhill lean.** With a perfectly
balanced grammar — decisions summing to exactly zero — the mean angle came out
at **−7.76°**. It appears only once the limit is being hit:

```
  °/step   limit hits   mean angle   net over 17 km
     8         0%         0.00°          -9 m
    20         0%         0.01°         -38 m
    45        19%        -7.76°       -2434 m
```

A zero-mean input through a non-linear fold does not come out zero-mean.
Reflection is worse than clamping here (−7.76 against −3.23), which is the price
of rebounding at the limits rather than sticking to them.

**8. Correct the result, not the process.** The first fix added a constant to the
angle before the leaky integrator. It fought the fractal rather than correcting
it: the slope was pinned uphill, swung less, and the ground became a rising
serrated ramp. **Summits over 100 m prominence fell from 11 to 1.** The author
found it immediately: *"There is no summit at or near 1.5 or anywhere else i can
find"*. Replaced by tilting the finished angle sequence — subtract its mean, add
the target — which leaves the dynamics untouched and every summit intact.

A consequence worth keeping: **once the trend is removed afterwards, the grammar
no longer has to be balanced**, which makes lopsided rules usable.

**9. Irregularity needs more than one rule.** One symbol with one rule expands
the same motif at every scale, so the ground repeats however deep it goes.
Searching 2,500 random three-symbol grammars, scored on the variation of summit
spacing plus the variation of summit prominence:

```
  one rule                     irregularity 0.63
  three symbols, chosen                     2.31   (30 summits over 49 km)
  best found                                2.72   (13 summits over 39 km — sparse)
```

---

## Why it is being set aside

**The balance of slow and fast structure is hard to control.** The two are not
independent in this model: `persistence` governs how long a slope is remembered,
and it moves relief, summit count and summit spacing all at once. Making the
ground peakier flattens it; steepening it drives the angle into the walls, which
introduces a lean that then has to be corrected separately. Every dial pulls two
or three things.

The root of it is **integration**. Height is twice-integrated from the decisions,
so the grammar's fast structure is smoothed away before it reaches the ground,
and the slow structure is whatever the integrator's memory happens to accumulate.
The controls are all working on the machine rather than on the landscape.

## The next approach

The author's proposal, and the reason it is worth trying: **let the symbols set
horizontal extent and height DIRECTLY, with no angle computed.** Draw flat tops
like a histogram, then join the midpoints of those tops to get ramps.

Height then comes from one integration instead of two, or from none at all —
which is exactly where the missing fast structure went. Slow and fast structure
become separable, because each is whatever its own grammar says rather than an
emergent property of a filter.

What should carry over: the true-1:1 view, the end-of-profile marker, the summit
count by prominence, and the measured fact that a landscape only looks like
mountains when it is steep.
