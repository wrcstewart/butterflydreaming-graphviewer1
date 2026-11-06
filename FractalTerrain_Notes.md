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

## Going to 3D — which lifting keeps the quasi-ordering (2026-11-06)

`terrain3d_bench.html`. The author asked how to generalise the 1D profile into
3D "in such a way as to maintain the quasi ordering you get with the L system".

**A walk cannot be generalised directly.** The 1D profile integrates decisions.
In 2D there are many paths from the origin to (x,y) and a walk gives a
different answer along each, so `h(x,y)` is not even a function. Every method
has to be *position-indexed* rather than cumulative. That is forced, not
chosen, and it is the real content of the generalisation.

**The literature.** Prusinkiewicz & Hammel, *A Fractal Model of Mountains with
Rivers*, Graphics Interface '93, pp. 174–180
(<https://algorithmicbotany.org/papers/mountains.gi93.pdf>). They rewrite the
**mesh**, not a string. Their central result is that midpoint displacement is
context-**sensitive**, not context-free as Carpenter and Mandelbrot had it: two
triangles sharing an edge must displace its midpoint identically, and the
pattern chosen for one triangle determines the pattern for every other
triangle in the mesh. They tie this to **Wang tiles** — labelled edges that
must match — which Wang proved can simulate any Turing machine, so
edge-matching is no weaker an ordering mechanism than a string. Their Figure 5
gives Smith's trick: hash an edge's endpoints into an index and look the
displacement up in a table, so both sides agree with no traversal.

**The ordering test: subword complexity.** Quantise to 8 levels and count the
distinct windows of length *n*. Polynomial growth means quasi-periodic,
exponential means noise. Budgets must be EQUAL — share-distinct falls as more
windows are sampled, so 32,500 windows cannot be compared against 1,993.

Measured at 257×257, 16,000 windows each, against a random diamond-square
control:

| method | isotropy | spectrum | distinct 8-windows | ordering carried |
|---|---|---|---|---|
| the 1D profile itself | — | — | 2.5% | (the target) |
| separable (outer product) | **1.61** | −1.71 | **3.0%** | 95% |
| projection, 5 directions | 1.36 | −1.58 | **5.5%** | **72%** |
| subdivision, row-major per level | 1.36 | −1.75 | 9.6% | 34% |
| subdivision, depth drives level | 1.27 | −1.83 | 10.5% | 25% |
| subdivision, one long string | 1.27 | −1.73 | 11.5% | 16% |
| RANDOM control | 1.15 | −1.44 | 13.2% | 0% |
| Hilbert-indexed | 1.31 | −1.67 | **36.5%** | worse than random |

Four findings, two of them against my own prior recommendation:

1. **Projection wins.** The cut-and-project construction of a quasicrystal
   (after de Bruijn for Penrose tilings): sum the sequence along several
   incommensurate directions. Each projection carries the whole sequence, so
   ordering is preserved by construction. It needs nothing the 1D bench does
   not already have.
2. **The subdivision route barely beats noise** — 25% against the random
   control, where I had recommended it. Midpoint displacement sets each new
   height to the *average* of its neighbours plus a displacement whose
   amplitude halves every level, so the averaging is a low-pass filter and the
   grammar enters only as a diminishing scalar perturbation. What survives is
   the averaging, which is identical whatever the displacement source. The
   paper's method is excellent for rivers and realism, its actual subject, but
   it is not a way to carry 1D quasi-ordering into 2D. Those are two different
   goals and I conflated them.
3. **Separable is the most ordered and the least usable** — 95% of the
   ordering carried, and the worst isotropy at 1.61, with ridges running
   exactly N–S and E–W. Proof that preserving the ordering is not sufficient.
4. **Hilbert indexing is actively harmful**, nearly three times worse than
   random. Locality *along the curve* is not locality along a row: the curve's
   returns put distant sequence positions side by side within a row.

## The straight lines, and why mesh rewriting is the answer (2026-11-06)

Four rounds were spent fixing *discontinuities* in the projection method — a
wrap seam, linear interpolation, C1→C2 — and the lines barely moved. They were
never discontinuities.

**The arithmetic.** `h(x,y) = Σ f(x·cos θₖ + y·sin θₖ)` is a sum of K
one-dimensional functions, and each term's level sets are *exactly straight
lines*. The field is a superposition of K perfectly smooth striped patterns.
Nothing about interpolation can remove a contour that is straight by
construction.

**The author's question settled it.** He asked whether the regularity came
from the fractal data itself. Measured, the decision sequence is **2.6×** more
spectrally concentrated than a shuffle of the same symbols in the 2–24 sample
band, with dominant periods near 2.9 and 18.3 samples — which at spread 16
predict fringes every ~46 and ~293 cells, the right order for what is visible.
Shuffling does *not* reliably remove the fringes (at K=5 the ordered sequence
scored between two shuffles), so the data is not the sole cause.

**The synthesis, by derivation rather than measurement.** A quasi-periodic
sequence is *defined* by having a discrete diffraction spectrum. A projection
that faithfully transmits the sequence necessarily transmits its Bragg peaks,
and peaks along a projected direction **are** regular fringes. So *preserving
the L-system's quasi-ordering through a projection* and *avoiding ruled lines*
are one property pulling two ways. That is why projection scored best on
ordering and worst on appearance — not a coincidence.

**The escape: carry the ordering combinatorially, not spectrally.** Which cell
neighbours which has no spectrum to project into fringes. That is
Prusinkiewicz & Hammel's mesh rewriting with the grammar on the **edge
labels** — and putting the label on the edge is stronger than their Figure 5
endpoint hash, because both triangles read the same label and derive the same
children, so consistency is structural with nothing to hash.

Identical measures, 257×257, worst fringe over 36 directions:

| method | fringe | ordering | isotropy | summits | curvature |
|---|---|---|---|---|---|
| RANDOM subdivision (control) | **57** | 10.55% | 1.39 | 22 | **3.7** |
| projection K=5 | **1975** | **1.81%** | 4.37 | 4 | 4.7 |
| projection K=20 | 1181 | 1.59% | 10.57 | 0 | 4.9 |
| **mesh rewriting `ZZZZZ`** | **330** | **2.50%** | **2.61** | **15** | 18.9 |
| mesh rewriting `XYZYX` | 637 | 6.29% | 1.94 | 9 | 5.0 |
| mesh rewriting `XYZXY` | 422 | 12.47% | 1.93 | 1 | 9.0 |

Projection's fringe is **35× the random control**. Mesh rewriting cuts it 6×,
keeps nearly all the ordering, and restores the summits the projection had lost
(15 against 4) — because the grammar acts on the topology, where the averaging
cannot reach it. That is precisely why the earlier displacement-table attempt
washed out.

**Open: triangle-edge faceting**, curvature 18.9 against the control's 3.7.
Post-smoothing is the wrong cure — it removes the high-frequency content the
median is computed from, so the fringe figure *rises* from 330 to 7258 while
the summits go to zero. The principled fix is a subdivision scheme with a C1
limit surface (four-point or butterfly) in place of plain midpoint averaging.

**A method note, against repeating it.** Five proxy metrics for "straight
lines" disagreed with one another; at least three were confounded — two by
comparing populations of different size, one by smoothness changing the median
a peak/median ratio divides by. The question was settled by a derivation. When
proxies disagree, look for the property that can be derived rather than
measured, and only compare proxy figures between fields of equal smoothness
and equal sample count.

### Mesh rewriting v2 — an edge owns a SLICE of the derivation (2026-11-06)

**Why v1 was no better, traced rather than guessed.** Each edge carried one
symbol and the children took the first three characters of its production. Two
faults compounded: terminals have no production so they bred only themselves
(absorbing states), and three of eight symbols discarded most of each rule —
`X: <>+>XYX+` begins `<>+`, all terminals, so `X` died in **one step**. By
level 8, 96% of edges carried `<` and only **two** displacement values existed,
both negative. A uniform sinking with the grammar burned out by level three.
The method had never been given a working grammar to run.

**v2.** An edge owns a half-open slice `[a,b)` of the fully derived string.
Subdividing splits it in three — first third to one half, last third to the
other, middle third to the new internal edge, which is where it belongs since
that edge lies between them. Nothing is discarded and nothing is absorbing.
Distinct displacement values per level now run 5, 15, 45, 115, 217, 281, 173,
69 (868 in total) instead of 2.

**Per-level normalisation, which the summits needed.** The slice sets the
*character* of a displacement, the amplitude schedule sets the *magnitude*.
Untangling them mattered: a level-0 slice is 10,654 symbols so its mean drift
is ~0, while a level-8 slice is under two symbols and gives a full step — so
the coarse levels, which should *be* the mountains, contributed almost nothing
and there were 2 summits. Dividing by each level's own mean |drift| restored 8.

Three normalisations were measured before settling: the raw **sum** is
catastrophic (curvature up to 735 — huge single-point spikes, 0 summits), and
`sum/√n` helps ordering but not summits.

| method | fringe | ordering | isotropy | summits | curvature |
|---|---|---|---|---|---|
| RANDOM subdivision (control) | **57** | 10.55% | 1.39 | **22** | **3.7** |
| projection K=5 | 1975 | **1.81%** | 4.37 | 4 | 4.7 |
| mesh v1, one symbol per edge | 330 | 2.50% | 2.61 | 15 | 18.9 |
| **mesh v2, slice per edge** | **203** | **5.16%** | **2.11** | **8** | 9.4 |

Ten times less fringing than the projection, twice its summits, and half v1's
faceting. Still short of the control on fringe (203 vs 57) and curvature
(9.4 vs 3.7).

**Still open: triangle-edge faceting.** The principled fix is a subdivision
with a C1 limit surface — four-point or butterfly — in place of plain midpoint
averaging. Post-smoothing is *not* the fix: it removes the high-frequency
content the median divides by, so the fringe figure rises to 7258 and the
summits go to zero.
