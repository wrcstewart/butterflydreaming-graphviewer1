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

### The whole 1D-distribution family was wrong — skeleton terrain (2026-11-06)

The author on mesh v2: *"its like it is stiched together in patches - if the
fractal cannot be distibuted across the patchwork so as to render them
invisible then i dont think the whole method works"*. Measured: the
high-curvature cells were enriched **3.5–4.1×** on the subdivision's own
triangle lattice. The patches were the triangles, and he was right.

**And the whole family was wrong, by a counting argument rather than a
measurement.** A 1D sequence has one linear order; a 2D domain has no
canonical linear order. So any map from a string to a heightfield must either
**cut the string up and lay the pieces out** — patches, with seams where
unrelated stretches abut — or **use a translation-invariant function of
position**, whose terms have exactly straight level sets and so give ruled
lines. Six methods, two failure modes, one cause. That is why separable,
projection, Hilbert and three subdivisions all produced linear artefacts: it
was never six bugs.

**The escape: a path is a 1D object embedded in the plane**, so a sequence lays
along it with no mismatch to pay. The grammar draws a branching **crest
network**; the same grammar's walk sets the height **along** the crest; the
surface is the upper envelope of roofs sloping away. The only ridges in the
picture are ones the grammar drew, and there is no partition to have
boundaries. This is also what every paper cited above actually does —
Prusinkiewicz & Hammel's squig is a river *curve*, Kelley/Malin/Nielson build
around a drainage *network*, Genevaux from a river *network*. None projects or
partitions; I quoted them and missed what they had in common.

**Cheap by a substitution.** The surface wanted is
`h = max_s (H_s − slope·dist(p,s))` — every crest a roof, the terrain their
upper envelope, so valleys fall out where two roofs meet, which is what a
valley geologically is. Substituting `D = (Hmax − h)/slope` turns it into
`D = min_s ((Hmax − H_s)/slope + dist(p,s))`: a multi-source **weighted
distance transform**, computable by a chamfer sweep in O(N²) however much the
grammar draws.

**Meander is the parameter that matters.** A fixed turn angle gives only a few
headings, so every crest is straight and the field reads as ruled — stripe
index 6.43 against a random field's 1.12. Letting the heading *integrate* the
grammar's own sequence makes headings continuous and the meander fractal.

| | stripe | isotropy | lattice | summits | curvature |
|---|---|---|---|---|---|
| RANDOM control | **1.12** | 1.39 | — | **22** | **3.7** |
| mesh v2 (patches) | — | 2.11 | **4.06** | 8 | 9.4 |
| skeleton, fixed turn | 6.43 | 1.22 | 1.21 | 11 | 22.7 |
| **skeleton, meandering** | **3.22** | **1.47** | **1.21** | 10 | 15.8 |

The patchwork is gone (1.21 against 4.06) and isotropy matches the control.
**Honest remainder:** stripe is still ~3× a random field's and curvature ~4×.
Both are inherent to roofs-and-slopes — a crest is a polyline so it is straight
between its vertices, and the valleys are creases where two roofs meet.

**Metric lesson, the fifth instance.** Six proxies for "straight lines"
disagreed across this work. Ratios of percentiles (fringe = p99.9/median) are
confounded by smoothness; counts-on-the-best-line are confounded by population
size. The two that held up are both ratios **against a matched control**:
lattice enrichment (curved cells on a lattice vs random cells) and the
magnitude-weighted gradient-direction peak/mean. Prefer a measure with a
control built into it.

---

## The triangle scan — the author's own construction (2026-11-07)

After six liftings had all failed in one of two ways, the author set the
approach aside and specified his own, on the grounds that he wanted something
*"i find easier to understand"*. It is. Two pages, one shared scan:

| file | what it is |
|---|---|
| `trianglescan_scan.js` | **the scan, in one place** — plus six self-tests |
| `trianglescan_terrain.html` | the fractal version |
| `constdelta_terrain.html` | a constant delta, in real metres, six controls |

### The construction

A `u,v` grid is filled in **anti-diagonal order** from the origin: `(0,0)` takes
a start height, then every cell with `u+v = 1`, then `u+v = 2`, and so on. Each
new cell's base height is the **reciprocal-distance weighted average** of its
three already-established neighbours, and a `dH` is added on top:

| cell | distance | weight | diagonals back |
|---|---|---|---|
| `(u−1, v)` | 1 | 1 / 2.7071 = 0.3694 | 1 |
| `(u, v−1)` | 1 | 1 / 2.7071 = 0.3694 | 1 |
| `(u−1, v−1)` | √2 | (1/√2) / 2.7071 = 0.2612 | **2** |

Those three are the complete set of established neighbours within √2 — the
other two, `(u−1,v+1)` and `(u+1,v−1)`, lie on the *same* anti-diagonal and so
are not reliably available. On the axes the missing ones drop out and the
survivor renormalises to weight 1, making each axis a pure 1D walk.

**Serpentine, and it is the author's design.** Odd `k` runs from the u axis to
the v axis, even `k` back. Symbols are consumed in traversal order, so a raster
scan would put the last cell of line `k` and the first of line `k+1` at
opposite corners — consecutive symbols far apart, a seam down one edge. The
alternation removes it. I had mis-stated my own streaking prediction as being
about the scan when it is about the **stencil**, whose dependency runs outward
from the origin whatever order cells are visited in.

**What it is:** a causal autoregressive filter on the lattice, driven by the
fractal as its innovation stream. Weights sum to 1, so the base is a
unity-gain smoother and each cell integrates one more innovation. Unlike every
earlier attempt there is **no subdivision hierarchy** — all the multi-scale
structure comes from the fractal itself, which is what was being tested.

### THE CORRECTION THAT MATTERS: it is a RIDGE, not a valley

For several rounds I described a **valley along the main diagonal** and
measured it at 20.7% of the edge rise. The author: *"it seems there is no vally
on the main diag but in fact a ridge"*. He is right and I was wrong.

The error: I compared heights along **constant `k = u+v`**, which is *not*
constant distance from the origin. The midpoint of the line `k = 30` is
`(15,15)`, only **21.2** from the origin rather than 30 — so it was lower
simply because it was nearer. I read a parameterisation artefact as terrain.

Measured properly, height against **true Euclidean distance** by direction:

| radius | 0° (axis) | 15° | 30° | 45° (diagonal) |
|---|---|---|---|---|
| 20 | 20.00 | 22.35 | **23.20** | 23.10 |
| 40 | 40.00 | 44.70 | **46.36** | 45.81 |
| 60 | 60.00 | 67.05 | **69.54** | 68.45 |

The diagonal stands ~15% **higher** than the axes at the same radius. The axes
are the low ground.

What is actually there is a **double ridge**: the crest sits at about **30°**,
not 45°, so there are two crests roughly ±15° either side of the diagonal with
a shallow crease between them — 0.49% of local height at radius 20, 1.22% at
40, 1.59% at 60. That crease is presumably what reads as a faint diagonal line,
and it is two orders of magnitude smaller than the "valley" I described.

**Still to fix:** the pages' comments and hints state the valley claim in
several places, and the *"level the diagonal valley"* switch is misnamed — it
equalises the per-`k` rise, which flattens the surface into a plane under a
constant delta rather than removing a valley. The 20.7% figure itself is
correctly measured; it is the *deficit relative to the axis value at the same
k*, which is a real quantity and not a valley.

### What the constant-delta test established

`constdelta_terrain.html` exists because the author asked to test the code with
a fixed delta instead of the fractal. It pays for itself three times.

**The lag arithmetic, verified.** Each neighbour sits a number of diagonals
back, so a cell's base lags the current diagonal by `Σ wᵢ·lagᵢ` — interior
`1 + w_diag = 1.26120`, an axis cell exactly 1. Hence the axes rise at `delta`
per diagonal and the interior at `1/1.26120 = 0.792893`. Six self-tests, all
passing at N = 129, 257 and 513:

```
serpentine and raster agree under a constant delta   difference 0.00e+0
both axes rise at exactly delta per diagonal         1.000000000 each
field is symmetric about u = v                       asymmetry 0.00e+0
interior slope converges to 1/(1+w_diag)             .8069 > .7985 > .7970
lag compensation levels it                           1.000000000
every cell is visited exactly once                   66,048 for 66,049
```

**A false verification of my own, caught by the shared test.** I had claimed
the scan "reproduces the closed form to six decimal places in the far field".
It does not. That window started at an **odd** `k` and took `m = k/2`, and
because `m*N+m` is `m*(N+1)` with `N+1` even, a half-integer `m` still yields a
**valid integer index** — for a different cell. It was reading `(243,114)` and
never touched the diagonal. The true far-field slopes are 0.798681, 0.796964
and 0.795767 at N = 129, 257, 513: converging on 0.792893 roughly as `1/√N` and
still 0.4% short at 513. A finite grid does not reach the asymptote.

**The grammar is not balanced**, which the author had asked about. At depth 9 it
holds 6,764 `+` against 14,514 `-` — a mean of **−0.1438 per symbol**. The bias
is in the rules (`X` net +2.09, `Y` −1.09, `Z` −1.00) and compounds with depth
because `Z` triples itself: −0.032 at depth 6, −0.170 at depth 10. This is
almost certainly the cause of his *"everything is gradually downhill"*
complaint weeks earlier, and of why the 1D bench needed reflection at its
bounds. Raw, the partial sums grow with exponent **0.933** — linear drift.
De-meaned it is **0.597** against **0.442** for the same symbols shuffled, so
the ordering is *persistent* and reinforces the wander. Neither `√k` nor
bounded; I had floated both.

### Three faults of my own worth not repeating

1. **A test against a copy tests the copy.** I gave the constant-delta page its
   own duplicate of the scan, so it exercised the duplicate rather than the
   code the fractal page runs. Now one shared file. This repo already carried
   that scar in two divergent copies of `music_module.html`.
2. **"Provably cannot matter" is the hypothesis a test checks**, not grounds
   for deleting the control. I removed the serpentine switch from the test page
   for that reason. It is back, and asserted.
3. **Normalising to 0..1 divides the amplitude out.** With a constant delta the
   shape is identical and only the amplitude changes, so delta 1 and delta 100
   rendered identically to 1.1e−15 and the slider looked unwired — the author
   set it to 100 and rightly asked. All normalisation is now gone from both
   pages, and every threshold is a share of the actual relief.

### The metric record across this whole effort

Six proxies for "straight lines" disagreed with one another; two more were
plain wrong. The pattern, stated so it can be checked against in future:

- **Ratios of percentiles are confounded by smoothness.** `p99.9/median` rises
  when the median falls, so a smoother field scores *worse*. It read 25.6 at
  texture 0 and 7.6 at texture 0.12 — the exact opposite of the truth, and it
  sent me to a wrong default.
- **Counts are confounded by population size and by roughness.** A rough field
  has few strict maxima over a radius-4 disc; a smooth one has many.
- **A denominator that differs between the things being compared does the
  work.** The subword-complexity budget, and the constant-`k` comparison above.
- **What held up** were the two measures with a control built into them:
  lattice enrichment (curved cells on a lattice *vs* random cells) and the
  magnitude-weighted gradient-direction peak/mean.
- **And when proxies disagree, look for the property that can be derived.**
  The straight lines were settled by arithmetic — a sum of K one-dimensional
  functions has straight level sets — not by a seventh metric.

### Presentation findings, measured rather than chosen

- **The elevation spectrum needs its luminance solved.** A plain rainbow has
  luminance 0.202, 0.298, 0.615, 0.798, 0.704, 0.676, 0.685, 0.717, 0.482,
  0.166, 0.070 — it peaks at yellow-green and falls off a cliff into blue, so
  the *ordering* is unreadable. Lightness is now solved per hue to make
  luminance linear in elevation, 0.05 → 0.42, monotone over 256 entries,
  saturation 0.97 held through red, orange, yellow, green and cyan.
- **A low sun is the lever for shallow relief.** Lambert shading shifts a
  slope's brightness by about `grade × cot(elevation)`, so a 1% slope moves
  brightness 1.0% at 45°, 1.9% at 28° and 4.7% at 12°. The sun had been fixed
  at 28°. Azimuth 135°/315° cuts across the diagonal; 45°/225° is the blind
  direction.
- **White is not a safe marker colour.** The four scheme surfaces have
  luminances 0.609, 0.962, 0.954 and 0.299, so white vanishes on three of four.
  The grid lines at `u,v = 9` and `30` therefore pick white or near-black per
  cell against whatever is under them.
- **A working control that produces no visible change is indistinguishable from
  a broken one.** Both pages now print the relief as a share of the frame width
  at the current exaggeration, and warn below 5%. That single line is what
  would have prevented two rounds of "the slider isn't doing anything".

---

## Triangle scan, day two — and why it was set aside (2026-11-07)

### What was fixed, and it is real

**The diagonal weight is √2, not 1/√2.** The author, from the 10×10 table:
*"the rise should be more like 41% bigger on the diagonal but we are more like
60%"*. Both figures exact. Comparing `(n,n)` with `(n,0)`, the old weighting
gave `2 × 0.792893 = 1.5858` → 58.6%; if height tracked true distance it would
be `√2` → 41.4%. The interior slope is `1/(1 + w_diag)`, so isotropy needs
`w_diag = √2 − 1`, i.e. **unnormalised 1 : 1 : √2 over 2 + √2**. The diagonal
cell is √2 further (argues for less weight) but *two* diagonals back (argues
for more), and the second governs height. Gain per unit distance on the
diagonal: 1.130 → **1.010**.

**It is a RIDGE, not a valley** — see the previous section. Six rounds of a
parameterisation artefact described as terrain.

**The grammar is not balanced**: −0.1438 per symbol at depth 9, worsening with
depth because `Z` triples itself. Partial-sum exponent 0.933 raw, 0.597
de-meaned, 0.442 shuffled — so the ordering *reinforces* the wander.

**One shared scan.** `trianglescan_scan.js`, loaded by both pages, with six
self-tests. A constant delta is a sequence of length 1, so the test rig
exercises the production path rather than a copy.

### The mechanism of the streaking, which is the real result

The author asked the decisive question: why should delta variation give diagonal
structure, when on a long anti-diagonal the variations appear everywhere along
it and so cannot correlate between scan lines?

**He was right about the input.** On diagonal `k` the sequence index at the
start is ≈ `k²/2`, so a cell and its inward neighbour take symbols ≈ `k` apart —
independent once `k` exceeds the run length.

**So the anisotropy is the filter.** Inject one unit of dH at a single cell:

| cells along the diagonal | peak | width across | aspect |
|---|---|---|---|
| 10 | 0.232 | 5 | 2.0 |
| 40 | 0.117 | 7 | 5.7 |
| 100 | 0.074 | 13 | **7.7** |

A single dH makes a **plume**, not a point. In the rotated frame the sideways
component of a step is ±1/√2 for the two orthogonal cells and **exactly zero**
for the diagonal one, which carries the heaviest weight. Mean step straight
down the diagonal; sideways variance only 0.369 per step. Travel grows as `n`,
spread as `√(0.369 n)`. The field is a superposition of long thin plumes all
pointing the same way — diagonal structure from perfectly uncorrelated input.

Two things this accounts for that we had observed without explaining: a
**constant delta looks flat** because it excites only the DC response, which is
the smooth ramp, so the plume never shows; and the **√2 weighting made the
streaking worse** because it raised the weight of the one step with zero
sideways spread from 0.261 to 0.414 — the same coefficient acting in two places.

Confirmed independently by feeding the scan a square wave and then random runs:
elongation 6.7–107 from alternating runs and **9.6 at run length 5 from random
runs**, where a constant delta gives 1.0. Nothing periodic is involved, so it is
the scan. The 107 at run length 20 was a resonance — randomising the sign at
the same length gives 8.37.

### What did NOT work, and the metric that hid it

**Four-corner averaging symmetrises rather than removes.** Elongation 4.38 →
1.00, which looked like a cure. The 2D FFT says otherwise: one corner has one
streak family at 5× isotropic; four corners has **two**, one along each
diagonal, at ~3× each. Elongation is a *ratio of those two directions*, so when
they became equal it read 1.00 while both were three times isotropic.

**The sideways fan rotates the streaking rather than removing it.** Adding
cells further along diagonal k−1 — `(u−1−j, v+j)` and `(u+j, v−1−j)` — gives
real sideways reach and halves the plume aspect, 6.7 → 3.2 → 2.3. Elongation on
the fractal falls 3.57 → 1.13. But the directional power spectrum, calibrated
against known stripe fields first, says:

| fan | peak directional power | direction | elongation |
|---|---|---|---|
| 0 | 3.26 | 143° (a diagonal) | 1.00 |
| 1 | 3.41 | 8° | 1.00 |
| 2 | **4.49** | **8° (the u axis)** | 1.00 |
| 3 | 4.87 | 8° | 1.00 |

**The peak anisotropy rose.** No stencil setting removes the streaking; it only
chooses which direction it runs in. The author's verdict — *"still very
streaked along the diagonal"* — was right, and my "3.57 → 1.13" was measuring
a ratio between two quantities that were both moving.

### The metric lesson, fourth instance in this work

**Elongation — the along/across variogram ratio — is unusable here.** It reads
1.00 for a field streaked on both diagonals, and 1.00 again for one streaked on
the axes. Anything that is a ratio *between two of the directions in question*
goes blind the moment the structure leaves both.

What works is the **2D power spectrum binned by direction**, with two
conditions that were learned the hard way: calibrate the labelling on synthetic
fields of known stripe direction first (a wavevector at θ means crests at
θ+90, and reading one for the other is an easy mistake to make twice); and
compare each direction against the *isotropic mean*, not against another
direction.

### Status

Set aside by the author in favour of a different approach. The construction is
sound, cheap, and fully instrumented; what defeats it is that its two
organising directions are both diagonals — the anti-diagonal is the scan line,
where neighbouring cells take consecutive symbols, and the main diagonal is the
propagation direction. The u and v axes are special to nothing, which is why
the FFT showed them suppressed to 0.06–0.42 at fan 0. Any fix has to break that
organisation rather than reweight within it — scanning in shells of constant
Euclidean radius was the candidate, never built.

---

## The three methods from the new document (2026-11-08)

The author brought in `AV/fractal-terrain-methods.md`, written elsewhere, and
asked for a page per method: spectral first, then noise, then faults "if
feasible but this can come later if tricky". All three are built. None of them
uses the L-system at all, which is the point — every construction before this
one was an attempt to carry a 1D fractal's ordering into 2D, and every one
streaked.

| page | method | primitive | bounded? |
|---|---|---|---|
| `spectral_terrain.html` | B: spectral synthesis | a frequency | one periodic tile |
| `noise_terrain.html` | C: chunked seeded noise | a lattice sample | **unbounded** |
| `faults_terrain.html` | A: random faults | **a landform** — one scarp | one tile |

The modules `fbm2d.js`, `faults.js` and `noise.js` were extracted
**programmatically** from the document's §11.1–11.3 code fences rather than
retyped, so they cannot drift from it silently. All three reproduce the
document's own §8 test table. `terrain_metrics.js` holds every measure and
`terrain_view.js` the schemes, the elevation ramp, the camera and the legend —
one copy each, because this work has already paid twice for duplication.

### The spectral method answers the question the whole series was asking

Measured anisotropy excess against a matched null: **1.03 on average over seven
seeds**, i.e. no detectable direction. The triangle scan, whose streaking the
author could see plainly, reads **2.89 at 53°** — close to the 45° diagonal it
runs along. Removing the construction order removes the streaks. There was
never a weighting that would have fixed the scan.

### One divergence found inside the document

It carries **two different `fbm2d` implementations**: §11.1 takes `(n, H, seed)`
only, while the demo page later adds the `k0` Butterworth high-pass that §3
describes as one of the method's controls. Without that cutoff the widest
feature is always the whole grid — one tile-sized hump rather than a range — so
it is not optional in practice. `fbm2d.js` now carries it, copied from the
document's own demo version and defaulting to 0 so the test table is
unaffected. **The two implementations in the document should be made one.**

### Three figures the document does not state

Its test table checks the noise method for edge agreement only, so these are
additions rather than corrections.

**The noise method does not deliver the H it is asked for.** Asked 0.50 gives
0.47; asked 0.90 gives 0.72. Discrete octave spacing and simplex's own spectral
shape are not a true power law. The faults method is much closer — over six
seeds, 0.498 ± 0.022 at H = 0.50, 0.767 ± 0.037 at 0.80, 0.881 ± 0.039 at 0.95
— so **α + ½ is exact at 0.5 and runs modestly low above it**. The document
lists that relation as needing a check against its references [8] and [9]; this
is that check.

**`height01` clamps, and the clamp bites.** 0.1% to 2.4% of cells are pinned
dead flat at 0 or 1, worst at few octaves and high H, which caps summits and
floors valleys. Relief is therefore *always exactly 1.000*, so relief is not a
measure on that page at all. Separately checked: the clamp is **not** what
lowers H — unclamped and clamped fields agree to within 0.001.

**The fault method's cost is predictable.** About 2.6 ns per cell-fault at
α = 0 and 10.6 ns otherwise, the difference being one `Math.pow` per cell. The
model predicted the 256-grid, 4000-fault case at 2,779 ms against 2,788
measured, so the page shows the cost before it blocks and refuses to start
anything over 1.5 s unasked. The document's 1.9 s warning is for α ≠ 0; at
H = 0.5 the same job is 135 ms.

### Which H estimator, and why it is not the same one twice

This is worth keeping straight, because the right instrument is the opposite on
the spectral page from the other two.

- **Spectral fields are periodic** — they come out of an inverse FFT. No taper
  is needed, and a taper is what biases a spectral estimate, so an un-windowed
  spectral slope is near unbiased: a flat **−0.016** at n = 256 across the whole
  range of H. The variogram, meanwhile, reads **systematically low** there,
  because the wrap flattens the large lags: fine at H = 0.5 but 0.14 low by
  H = 0.95, with a spread of only ±0.01–0.04, so it is bias and not scatter.
  Reporting that against the H asked for would convict the generator of an error
  belonging to the measurement.
- **Noise and fault fields do not wrap.** Measured on a fault field, the mean
  step across the seam is 30.1 against 3.0 for an interior step — a factor of
  ten. There a spectral estimate needs a window, so the **variogram** is the
  sound instrument.
- The fit band must also **clear the cutoff**. Fitting straight through the
  Butterworth rolloff read H = **−0.149** for an asked 0.80. Starting at 3·k₀
  leaves a factor of 0.988, negligible; where that band would lie above Nyquist
  the page says H is not measurable rather than printing a number.

`hurstFromSpectrum` now **throws** on a non-power-of-two grid instead of
returning a quiet NaN. That is how the above was noticed at all: a 193-cell
grid — three 64-cell chunks plus a shared edge — had been printing NaN into a
readout.

### The direction measure needed a null, and three attempts were wrong

Fifth instance of the frame-of-reference lesson, and the most expensive.

The estimator **alone** is badly biased for a red spectrum. It reported the
spectral method — whose entire claim is isotropy — at 1.80 to 2.17. Broken down
by radius band the figure fell 2.71, 1.75, 1.34, 1.21, 1.10, 1.05 as the bins
per direction rose 3, 12, 50, 201, 804, 3084: a red spectrum puts nearly all
its power exactly where a discrete grid has fewest samples, so the average was
dominated by its noisiest bins.

Then three wrong fixes, each of which *looked* like success:

1. **Dividing each bin by its ring mean.** Read 1.07 at 83° for *every* H — the
   same answer white noise gives — and failed three of the four stripe
   calibrations, because the window's leakage cross divided by a near-zero ring
   mean swamps the signal. A measure that returns one figure whatever its input
   has gone blind, which is harder to spot than being wrong.
2. **Rotating each ring.** Subtler and worse. A rotation *preserves* a ring's
   angular profile and merely moves it, and max-over-mean is nearly rotation
   invariant, so the null became a near-copy of the measurement. It read 1.01 on
   isotropic fBm, which looks like a pass, while the triangle scan's real
   streaking fell from 2.17 to 1.47.
3. **Phase randomisation**, the textbook surrogate, is no use here either: it
   preserves the power spectrum *exactly*, angular structure included. It is a
   null for nonlinearity, not for anisotropy.

What works: synthesise a Gaussian field from the measurement's **own radial
profile**, isotropic by construction, and put it through the identical window.
The effective sample count, the redness and the leakage all carry over; only the
direction is gone. White noise 1.04, spectral fBm 1.03, faults 1.17, triangle
scan 2.89.

**The scatter is in the measurement, not the null**, so averaging more nulls
does not reduce it: one reading at n = 256 carries about ±0.4, and only an
excess past roughly 1.6 means anything on its own. Every page quotes that
uncertainty rather than two decimal places.

### And one false result caught before it was written up

Measured H appeared to rise and fall with the fault count — 0.859 at 500
faults, 0.683 at 4,000, 0.813 at 16,000 for an asked 0.80 — which reads as a
convergence curve and was very nearly reported as one. It is not. Across six
seeds the *mean* is 0.769 at 2,000 faults and 0.764 at 8,000: unchanged. Each
fault count is a different random field, not a further step in one. What the
count does set is the **relief**, which grows as √faults, as a sum of
independent steps must.

### Breaking the noise method's uniformity, and what zoom really costs (2026-11-08)

The author on the noise page: *"the noise idea is attractive given that it could
manage very big views i suppse that can zoomed in on potentially. Also noise
with different varaition on u v could be supimposed to braek up the noise
uniformity of the peaks"*. Both halves check out, and both have a measured
catch.

**Zoom has a hard ceiling.** The octave set is fixed, so detail stops at
`finestKm` — 62.5 m at widest 4 km over 7 octaves. Sampling one 200 m patch from
28.6 m spacing down to 0.8 m gives relief 0.1975, 0.1976, 0.1975: *no new
detail*, just a smoother interpolation of the same surface. The cure is to **add
octaves as you zoom**, which works precisely because `height01` is a pure
function — the coarse shape stays put to within half a percent (mean change
0.004 to 0.006 on a [0,1] field). That residue is `norm` depending on the octave
count; pinning the divisor to a fixed budget makes it exact, which the page
offers as "stable zoom". So the level-of-detail path is real: far chunks few
octaves, near chunks many, and nothing moves.

**The uniformity complaint is a real and known weakness.** Plain octave fBm is
statistically *homogeneous* — the same everywhere — so every patch is equally
rough and nothing separates a plain from a range. Measured as the coefficient of
variation of local relief over 16-cell windows, cv 0.20 at H = 0.5 rising to
0.32 at H = 0.9.

Three mechanisms are in `noise_variants.js`, and they break **different** things,
which is the part worth keeping straight:

| control | breaks | effect | isotropy |
|---|---|---|---|
| stretch u:v | isotropy | grain, ridge-and-valley country | **deliberately not** — 2.46 at 3:1 |
| warp | placement | sinuous ridges, uneven spacing | 1.40 mean, under the threshold |
| hetero | roughness | rough peaks over smooth plains | stays isotropic, 0.96 |

At the page's own default sampling, each raises cv by 27–30% and all three
together by **107%**. `hetero` — Musgrave's multifractal idea, each octave's
amplitude modulated by the previous one — is the direct answer to "uniformity of
the peaks", and the only one of the three that does not cost isotropy.

**Every variant keeps the chunk edges exact**, max difference 0 individually and
all three together. That was checked rather than assumed: a variant that broke
it would destroy the only reason to prefer this method. And with every control
off the output is **bit-identical** to `noise.js`, so the figures measured
against the document's own version still hold.

Two smaller corrections along the way. The anisotropy verdict had to learn that
**a direction can be asked for** — with stretch engaged, reporting the working
control as "the lattice is showing" would be worse than not measuring it. And a
hardcoded cv reference of 0.26 was wrong: cv depends on the grid and window as
well as the method, and at the page's default sampling plain noise reads 0.217,
so the constant dismissed hetero's real 28% gain as "still homogeneous". It now
builds a **matched baseline** at the same settings with the controls off — the
same lesson as the anisotropy null, one section up.

#### Both of the author's next two observations were faults (2026-11-08)

*"Two points the slider hetero seems to make it smoother. There are two stiches
lines down the centres - dividing scene into 4 parts"*. Both real.

**hetero was smoothing the terrain, and my own metric hid it.** The weight
`1 − h + h·(0.5 + 0.5n)` has expectation `1 − h/2`, because the noise is
zero-mean, so at hetero 1 every octave after the first carried half amplitude.
Measured: mean |laplacian| fell 7.24 to 4.48 and roughness 3.55 to 2.40. The
control was deleting detail, not redistributing it.

The metric failure is the worse half. **cv = sd/mean rises when the mean falls**,
so a uniformly smoother field scored as *more* heterogeneous — it reported +28%
for a field that was measurably flatter. This is the same defect as the
p99.9/median curvature ratio that inverted earlier in this work, and it is
written as a rule in `terrain_metrics.js`, which I then walked past anyway.
Replaced with the spread of local relief over the GLOBAL relief — a denominator
the numerator cannot drag down, and provably unchanged by a pure rescale.

Two consequences once the measure was honest. Dividing the weight by `1 − h/2`
restores unit mean, and then **modulating on accumulated elevation rather than
on the previous octave's sample** is three times better: +33% against +11% at
the same roughness, because the running sum is terrain-scale while a
single-octave lookahead is noise-scale. It also means roughness tracks height,
which is what "rough peaks over smooth plains" actually asks for.

And **stretch had the identical flaw**, which only showed once cv was gone:
one-sided stretching lowers the frequency along that axis with nothing to
compensate, so roughness fell 3.55 to 1.49 at 3:1 and the spread fell 6% while
cv had claimed +30%. Made area-preserving — √r on one axis, 1/√r on the other —
it keeps roughness at 2.33 and gains 8%, still strongly directional at 2.03.

**The stitch lines were normals, not heights.** The edge test reads max
difference 0, so the surfaces meet perfectly. Each tile is its own mesh, and
`computeVertexNormals()` averages only its own triangles — so a vertex on a
boundary takes its normal from one side while its twin in the next tile takes a
different one, and Lambert shading steps across the join. The 12° default sun
makes it as obvious as possible. Fixed by computing normals analytically from
the height gradient with a **one-cell apron** sampled across each boundary:
verified, the normals are now bit-identical at every shared vertex, on both
seams, plain and with all three variants. Possible only because `height01` is
defined everywhere — the same property the method rests on. Flat ground checks
out as straight up, which is the sign test.

One interaction worth keeping: **warp fights stretch**. Over four seeds, stretch
3:1 alone gives a grain of 2.15 and keeps it under hetero (2.01), but warp at
1.5 km randomises the direction and the grain falls to 1.43. At 0.5 km it
survives at 1.93.
