# ButterflyDreaming — Colour Design Notes

## Requirement

The graph has a fixed set of top-level **Family** nodes, each with a distinct colour. Beneath them sit **Bud** nodes (called Cluster in code), each connected to one or more Family nodes via `DESCENDS_FROM` relationships. Each relationship carries a normalised weight (summing to 1.0 per Bud) that expresses how strongly the Bud belongs to each Family.

The requirement is that a Bud's displayed colour should reflect its Family membership in a visually meaningful way — a Bud that strongly belongs to one Family should look close to that Family's colour, while a Bud shared across multiple Families should show a blend that conveys the mix.

A secondary requirement is that `DESCENDS_FROM` edges arriving at a Bud should each be coloured with their respective parent Family's colour, so the user can see which influences are converging into the blended node.

---

## Family Colour Palette

| Family   | Hex       | Approx hue |
|----------|-----------|------------|
| Nature   | `#4A8C4F` | 125° green |
| Emotion  | `#C0504D` | 2° red/coral |
| Reason   | `#4A7BC0` | 215° blue |
| Spirit   | `#9B6B9B` | 300° purple |
| Symbolic | `#C09A3A` | 43° gold |
| Arts     | `#C47A5A` | 18° warm orange-brown |

These colours are defined in `FAMILY_COLOURS` in `viewer.js` and are the fixed reference point for all blending. Each Family node also carries a `hex` data property set to the same value so downstream blending functions can read it reliably.

---

## Approaches Tried

### 1. Desaturation (original, pre-Amendment 27)

Each Bud node had a `family_primary` DB property recording its dominant Family. At load time the viewer ran:

```javascript
const fc = FAMILY_COLOURS[props.family_primary];
colour: fc ? desaturate(fc) : '#666666'
```

`desaturate()` converted the Family colour to HSL and reduced saturation by 45%, then converted back to hex. A second query (`clusterColours`) fetched the highest-weighted Family per Bud to override this where needed.

**Problem:** Every single-parent Bud looked like a faded version of its Family colour regardless of weight. Multi-parent Buds had no visual distinction — they all looked like the same muted version of whichever Family happened to have the highest weight. The blending between parents was not represented at all.

---

### 2. RGB Weighted Arithmetic Mean (Amendment 27, first attempt)

Replaced desaturation with a true weighted blend:

```javascript
r += weight * rgb.r;
g += weight * rgb.g;
b += weight * rgb.b;
```

Weights were normalised to sum to 1.0 before blending to prevent RGB value overflow.

**Problem discovered:** Reason (`#4A7BC0`, blue) and Symbolic (`#C09A3A`, gold/yellow) are near-complementary on the colour wheel. Mixing them in RGB averages their *intensities*, which cancel to grey — `rgb(142, 131, 128)` = `#8e8380`. A Bud with 40% Reason, 30% Symbolic, 20% Arts, 10% Spirit produced a warm neutral grey with brightness 134. Semantically confusing: a Bud with four distinct Family influences looked indistinguishable from an unconnected node.

This is a fundamental property of RGB arithmetic: it mixes light intensities, not perceptual colours.

---

### 3. HSL Circular Mean (second attempt)

Moved blending into HSL space to separate hue from intensity:

- **Hue**: weighted circular mean using sin/cos vectors to handle the 0°/360° wraparound
- **Saturation, Lightness**: weighted arithmetic mean

```javascript
const hRad = hsl.h * Math.PI / 180;
sinSum += weight * Math.sin(hRad);
cosSum += weight * Math.cos(hRad);
let h = Math.atan2(sinSum, cosSum) * 180 / Math.PI;
if (h < 0) h += 360;
```

**Problem discovered:** When opposing-hue parents (e.g. Reason blue at 215° and warm Symbolic/Arts near 30°) partially cancel each other, the sin/cos vector has low magnitude but still points *somewhere*. In the Reason 0.4 / Symbolic 0.3 / Arts 0.2 / Spirit 0.1 example:

```
sinSum ≈ -0.050,  cosSum ≈ +0.131
h = atan2(-0.050, 0.131) = 339°  ← pink/magenta
```

The algorithm produced a vivid pink — a hue that none of the parents were near. This is worse than grey: grey at least signals "no dominant influence", whereas pink actively misleads.

---

### 4. HSL Circular Mean with Magnitude Saturation Scaling (current)

The magnitude of the `(sinSum, cosSum)` vector naturally encodes how much the parent hues **agree**:

- Magnitude = 1.0 → all parents have the same hue → saturation fully preserved
- Magnitude ≈ 0 → parents are evenly spread or opposing → saturation near zero (grey)

Applying this as a saturation multiplier:

```javascript
const magnitude = Math.sqrt(sinSum * sinSum + cosSum * cosSum);
return hslToHex(h, sSum * magnitude, lSum);
```

For the Reason/Symbolic/Arts/Spirit case:
```
magnitude = sqrt(0.050² + 0.131²) ≈ 0.14
→ saturation scaled to 14% of original — nearly grey, semantically honest
```

For a single-parent Bud: magnitude = 1.0, no saturation change.
For a clearly dominant parent: magnitude near 1.0, vivid blended colour.

**Result:** Buds with conflicting Family influences produce muted/grey colours that honestly represent the tension. Buds with coherent influences show clear, vivid blended hues. No unexpected artefact colours.

---

## Other Colour-Related Fixes Made During Development

**background-opacity: 0.8** — The base node stylesheet rule had `background-opacity: 0.8`, making all nodes semi-transparent. Changed to `1` when the opacity issue was noticed after A27 blending made node colours more vivid and the transparency more obvious.

**family-view CSS class** — `expandToFamily()` was adding `class="family-view"` to all visible Cluster/Bud nodes, which applied `background-opacity: 0.35`. This was dimming the very nodes being displayed. The `addClass` call was removed.

**DESCENDS_FROM edge opacity** — Initially set to `opacity: 0.5` in the stylesheet. Raised to `0.85` so edge colours (each carrying its parent Family's background colour) are clearly distinguishable from the darker node border tones.

**Edge colour source** — DESCENDS_FROM edge colours were first set to the child (Bud) node's colour, then changed to the parent Family's colour. The parent-colour approach is correct: it shows which Family is contributing, so the user can see the blend converging into the Bud.

---

## Current Implementation (viewer.js)

Functions: `hexToHsl`, `hslToHex`, `blendColours`, `computeBlendedColours`

Call site: `computeBlendedColours(cy)` is called once at load time, immediately after Cytoscape is initialised and before any elements are shown.

Processing order:
1. SubFamily nodes (Family nodes with a Family parent) — blended first so their colours are available as inputs for Bud blending
2. Bud (Cluster) nodes — blended using their immediate parent Family/SubFamily colours
3. DESCENDS_FROM edges — line-color set to `edge.target().data('hex') || edge.target().data('colour')` (the parent Family's background colour)

If a Bud has no DESCENDS_FROM edges in the DB, `computeBlendedColours` skips it and it retains the fallback `#666666`.

If DB weights are missing or unnormalised, the code normalises them before blending (divides each weight by the sum), so equal-weight averaging is the fallback.
