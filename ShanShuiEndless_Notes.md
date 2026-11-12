# Shan Shui Endless — notes (2026-11-11/12)

**Read this first after any break in the Shan Shui work.** It covers BOTH the
standalone page and the BD module made from it: what each is, every control,
how the sky is computed, why each choice was made (most were the author's
corrections), how to test headless, and what is open.

## Where things stand (end of 2026-11-12) — START HERE

**Two products, one landscape:**

| | Standalone page | BD module `bd_V_ShanShuiV1` |
|---|---|---|
| File | `Shan Shui Endless.html` (repo root) | `V_ShanShui/index.html` (relay) + `V_ShanShui/visual_module.html` |
| URL | `/Shan%20Shui%20Endless.html`, also https://butterflydreaming.net/Shan%20Shui%20Endless.html | `/bd_V_ShanShuiV1/` — loaded by BD in its player iframe |
| Controls | its own sidebar of sliders (Hide/Show) | BD stepper column, from `%%bd_p_` lines |
| Camera | drag to orbit (OrbitControls) | no drag: fixed at the page's opening offset |
| Status | the place to explore | **WORKING in BD, author: "very nice"** — tweaking next |

**In the graph:** Cluster **Mountain/Water** (under SubFamilies Graphics AND
Landscapes) → gateway **ShanShui** → node **ShanShui_001** (seq 1,
`hasModuleScript: bd_V_ShanShuiV1`), holding the agreed script (section
"Module script, agreed" near the end). Created by `bd_v_shanshui_ingest.js`.
No "Endless" in any graph name — the author's choice; it is a concept here.

**Canaries:** BD green (build 2026-11-12c). The module's own canary is its
stepper-button colour: GREEN, `SS_BUILD` 2026-11-12b. Rotate both on change.

**Next (the author, 2026-11-13):** tweaking in BD; then a "documentation and
ranging" section for the controls. Full open list: "Open" near the end.

**The scene code exists TWICE.** The module's landscape script is a copy of the
page's (up to its Travel section). A change to the landscape must be made in
both — or made in the page and the module re-assembled (see "The BD module").
The bob fix (below) was made in both by hand.

## History

| commit | what |
|---|---|
| `86a2245` | The original Claude chat artifact, as supplied by the author. Kept unmodified as the baseline. |
| `3dadf5a` | Palette drop-down with inverted schemes (ink, inkInv, blue, blueInv); opacity slider. |
| `441595a` | Sun and moon on a day cycle, cast shadows, controls. |
| `e2d8487` | "Natural" sun colour by elevation, made the default (it had been red at every height). |
| `f47be96` | Look up + field of view sliders; softer sun colour; specks round the sun removed. |
| `e3b87e1` | Setting sun only warm cream; moon phases from a lunar-month slider. |
| `0b7bd6d` | **Real night sky**: 2,887 catalogue stars, Milky Way, sun and moon from date and latitude. |

## What the author wants from it

An **aesthetic, possibly VR, experience**: swirling mist, a slowly moving sun and
moon, used at **low opacity in collage or over images**. Not cartography, not
photographic realism — but where the sky is shown it should be *right* (real
stars, real sun path), because that was asked for explicitly. The location
assumed is **medium mountains in south-west China, ~26°N** (Kunming 25°,
Lijiang 27°).

## How the page is built

**Terrain.** fBm (fractional Brownian motion — octaves of simplex noise, each
twice the frequency and 2^−H the amplitude of the last) as a pure function
`height01(x, z)` of world position and seed, so chunks generated independently
join exactly. 1 scene unit = 4 km. Chunks of 1 unit, 64 segments, kept within
radius 6 around the viewer, built 2 per frame. The viewer glides toward −z.

**Mist.** `THREE.Fog` whose colour is set every frame to the background colour,
so far ridges dissolve into the sky. It also hides the chunk edge.

**Lights.** A hemisphere light (even light from the whole sky, so shaded slopes
never go black) and ONE directional KEY light that is the sun by day and the
moon by night, so only one shadow map is drawn. Shadow camera covers a 26 km
square that travels with the view, snapped to whole shadow-map pixels in the
light's own frame (otherwise shadow edges shimmer while travelling). PCF
shadows; `shadow.radius` is the softness slider.

**Sky frame — `buildSky(sunEq)`.** All sky positions are in the EQUATORIAL frame
(x → RA 0/dec 0, y → RA 90°, z → north celestial pole). `SKY` is the matrix
taking an equatorial vector to a scene direction:
1. local sidereal time θ = sun's RA + 15° × (time − 12) — the time slider IS
   local sun time, so the sun's hour angle is exactly 15°/hour from noon;
2. rotate by −θ about the pole;
3. tilt by latitude into (east, north, up);
4. rotate by the heading (Direction of travel) into the scene (+y up; heading 0
   puts north at −z, east at +x).

**Sun.** `sunLongitude(day)` = 360 × (day − 80) / 365.2422 along the ecliptic
(the sun's yearly path through the stars), converted by `eclipticToEq`. Uniform
motion: up to ~2° out, invisible here.

**Moon.** On the ecliptic at sun longitude + 360° × age / 29.53. Its real 5°
tilt is left out. Phase drawn by `drawMoonPhase()`: the disc is a ball lit from
the sun's direction, each pixel lit if its surface point faces the sun, built in
a frame from the moon's direction and the camera's right vector (sprites are
always screen-upright) — so the lit limb always points at the sun, even below
the horizon. Dark part alpha 0.06 (faint earthshine). Redrawn every frame (64×64)
AFTER the look-up tilt. Moonlight intensity and glow scale with the lit fraction.

**Stars.** `STARS` array in its own `<script>` block: RA, dec (J2000 degrees),
visual magnitude, B−V colour, rounded to 0.1, brightest first, 53 KB. Source:
**Yale Bright Star Catalogue 5th ed.**, table `heasarc_bsc5p` from NASA HEASARC
(`table_security = public`), cut at magnitude ≤ 5.5. (CDS/VizieR was
unreachable from this machine on 2026-11-11.) Drawn as `THREE.Points` with a
ShaderMaterial: size 1.5–4.5 px by brightness, colour gently tinted by B−V,
additive blending (shows on dark sky, vanishes on pale), faded within 15° of the
horizon (atmosphere, and it hides the gap beyond the last terrain chunk).
Uniforms: `uLim` faintest magnitude shown, `uFade`, `uScale`, `uPx`.

**Milky Way.** A BackSide sphere in the same equatorial frame, shader-only (no
image): galactic latitude b and longitude l from the galactic north pole and
centre vectors (J2000, checked by hand); Gaussian band 6°–14° wide, widest and
brightest toward the centre in Sagittarius; patchiness from two fbm scales; a
dark lane (Great Rift) north of the plane between l ≈ 0 and 80°, whose centre
wanders and depth comes and goes by noise (a fixed lane read as a ruler stripe).

**Night/moon interplay.** `dark = smooth(−3, −15, sunEl)` brings stars out as
the sun sinks 3–15° below the horizon. `wash = moonLit × smooth(−2, 10, moonEl)`
lowers the faintest magnitude from 6.0 to 3.8 and dims the Milky Way by 85%.
Stars and Milky Way are hidden entirely by day.

**Sun disc.** (Natural colouring only — the red and pale options were removed
2026-11-12.) Sprites with `fog: false`. Glow textures are built pixel by pixel
as a `DataTexture`, white with only alpha varying — **not on a canvas**: a canvas
stores colour premultiplied by alpha, and reading it back gave faint specks
round the sun and a dark ring. Disc colour "natural": near white `#fffaf0` high,
lerping to warm cream `#fff1cf` over the last `LOW_BAND = 10°`; sunlight warms
to the same cream over the same band.

**Sky colour.** Background (= fog) runs night (paper × 0.25 toward `#2a3446`) →
paper by day, with a dusk tint `#d8b49a` at 45% peaking when the sun is ~2° up.
**This dusk tint is untouched by the sun-colour work** and may be part of what
reads as "red" at sunset — a tuning candidate.

**Look up.** OrbitControls always aims at a ground target, so retreating cannot
raise the view. After `controls.update()` each frame, `camera.rotateX(lookUp)` —
re-applied fresh every frame, never accumulating.

## Reading the author's settings

**Send settings to Claude** (bottom of the panel) writes one line to
`/private/tmp/bd_server.log`: `SHANSHUI_SETTINGS {json}` — every `state` field
plus `camera` (offset of the camera from its orbit target, scene units). Read it
with `grep SHANSHUI /private/tmp/bd_server.log | tail -1`. It loads BD's own
`/socket.io/socket.io.min.js`, sends a `client_log` message, and disconnects
after 0.5 s (while connected it counts as one BD user). It also copies the line
and shows it in a box, for when the server cannot be reached.

## Sun and moon size (added 2026-11-12)

Two sliders, **Sun size** and **Moon size**, 0.3–3.0, default 1.0 = the sizes
first drawn (disc+glow sprites 1.6/9 and 1.1/5 at SKY_DIST 30). The label gives
the multiplier, the disc's width on the sky and its multiple of the real
~0.52°: moon 1.0 → 1.7° (3.2× real), 0.3 → 0.5° (true), 3.0 → 5.0° (9.7×);
sun 1.0 → 1.4° (2.7×). The author found the moon small at fov 80 on an iPad
(about 16 px); it was already 3× real — the small look is the wide field of view
and the moon illusion. `applySizes()`, `discDegrees(size, fill)`.

## Stars as points, not discs (2026-11-12)

The author: on iPad, especially landscape, "way too many big disks". Cause: at
Stars 250% every star was 2.4–7.1 CSS px with a flat bright core (the slider
also scaled size by its square root). Now: size 1.8–4.2 CSS px rising as
bright^1.5 (most of the ~2,000 stars fainter than mag 4.5 stay points), a
Gaussian profile, a minimum of 2 device px, and ×(innerHeight/1000) clamped to
0.6–1 so short (landscape) screens draw them smaller. **Stars** is now
brightness only; a new **Star size** slider (0.3–3, default 1) is size.
Judge star renders at 1:1 device pixels — a downscaled screenshot averages
points away and reads far too faint (cost one round).

## Mist slider (added 2026-11-12)

**Mist**, 0–3, default 1 = the original fog (begins 8.4 km, solid 22.8 km).
`applyMist()`: k > 1 → near = 2.1/k, far = 5.7/k^0.6 units (k = 3: 3 km / 12 km);
k < 1 → far stays 5.7 (it must hide the chunk edge) and near moves out to it
(k = 0: no mist until the edge). Label shows both distances in km.

## The sky does not follow dark mode (fixed 2026-11-12)

The original artifact took the daytime sky from `--paper`, which dark mode sets
to `#161a19`. An iPad that had switched to dark mode in the evening therefore
showed a **black sky at midday** — reported as "after night, the day sky stays
black" (the stars were correctly off). The scene now reads `--sky`, which no
theme overrides; the body background uses it too, so the opacity slider fades
toward the same colour on every device. The panel still follows dark mode.
**Test dark mode headless with** `--force-dark-mode
--blink-settings=preferredColorScheme=0`.

## Controls (defaults)

**In the BD module the controls are DIRECTIVES**, and the definitive list —
name, range, step, default — is the `CONTROLS` table at the top of the glue
script in `V_ShanShui/visual_module.html`. Names (the author's relabels):
travel_speed (0–4, 0.2; 0 is the pause) · smoothing (= H) · detail (= octaves)
· relief · widest_mountain · shadow_softness · fov · look_up · opacity · mist ·
time_of_day · minutes_per_second · stars · palette (a word: ink, inkInv, blue,
blueInv; an unknown word is ignored) · world_seed (1–100, default 42 — the
number IS the seed) · moon_phase · direction_of_travel · date (day of year) ·
latitude · sun_size · moon_size · star_size. The first fifteen are `_p_`
(stepper shown); the last seven are fixed by the script. No tick-box
directives: shadows and sun-&-moon are always on. Ranges are still the page's
slider ranges, pending the ranging section.

**The page's sliders and their defaults** (the author's own settings, sent
2026-11-12 10:53 with the Send settings button):
H 0.9 · Widest mountain 10 km · Octaves 9 · Relief 0.4 (1.6 km) · Palette ink ·
Opacity 100% · Mist 1 · Time 06:30 · Time flow 0 · Day of the lunar month 22.75
(waning half) · Date 15 Oct (day 288) · Latitude 26°N · Direction 0° (N) · Look
up 9° · Field of view 80° · Shadows on · Show sun & moon on · Sun size 1 · Moon
size 1 · Stars 2.5 (250%) · Star size 1 · Shadow softness 2 · Travel speed 0.2 ·
seed 42 · camera offset (−1.841, 0.526, 0.964) from the orbit target (off to
the west, a little raised). Mist, Sun/Moon size and Star size have their own
sections above. **The Sun disc selector was REMOVED 2026-11-12** (its red
"ink painting" sun is a Mao-era motif; the author asked for natural only).

**Why 15 Oct:** in SW China May–Oct is the monsoon (cloudy) and Nov–Apr is
clear, while the Milky Way's bright core is an evening sight in summer and a
pre-dawn one in late winter. Mid-October is the start of the dry season with
the core still low in the SW after dusk.

## The author's corrections, in order (each one is a rule now)

1. "The sun is bright red even at higher altitudes" → colour must depend on
   elevation.
2. "Too red and too red too low" → narrowed to the last 10°.
3. "Faint little dots round the sun" → canvas premultiplied-alpha noise; never
   draw sprite textures on a canvas here.
4. "Shouldn't I be able to retreat far enough to see higher?" → orbit controls
   can't; Look up + Field of view added.
5. "At 15:18 it is as red as it needs to be when it sinks" → the colour he saw
   at 15:18 (39° up) was the HIGH colour `#fff1cf`, so that became the SETTING
   colour; amber/orange removed entirely.
6. Define every term — in chat as well as in docs (see memory
   `feedback-define-signatures-first`).
7. No red sun at all — the red disc is a Mao-era motif → natural sun only, the
   selector removed.
8. Control names say what they do: H → **smoothing**, octaves → **detail**
   (the first proposals, Peakiness / Peak Smoothing, ran opposite to their names).
9. No "Endless" in any graph name; it is a concept for the documentation.
   Names short enough for a breadcrumb chip (~14 characters): `ShanShui_001`.
10. "Shui" is spoken "shway" — the speech lexicon has Shui / Shan Shui / ShanShui,
    and speech reads `_` between word characters as a space.
11. "The image bounces a little up and down as it travels … even the stars" →
    the aim point keeps a fixed height; the view's tilt never changes in flight.

## Verified (headless Chrome, swiftshader)

- Noon sun at 26°N: 21 Jun 87.4° (expect 87.5), 21 Dec 40.6° (40.6), 15 Oct
  54°; at 51°N 15 Oct 29.3° (≈30.4; uniform-motion approximation).
- Equinox: sun 0.0° at 06:00 and 18:00.
- Vega hand-checked: 15 Oct 20:30 at 26°N → 45° up in WNW, matches the real sky.
- Moon phases at ages 3, 7.4, 11, 15, 22, 26: crescent, straight-terminator half,
  gibbous, full, waning on the opposite side.
- **The half moon tips over through the night, and that is CORRECT** (checked
  2026-11-12 after the author asked). Its lit side faces the sun, so it is
  sideways at sunset (96° from straight up, 15 Oct 26°N) and turns toward the
  horizon as the sun sinks (130° at 20:00, 159° at 23:00; London only reaches
  ~130°). An independent Python calculation and page renders aimed at the moon
  agree. The author chose to keep it true rather than add a "stylised sideways"
  option.
- Full-moon night: only bright stars, no Milky Way. Inverted palette night:
  identical sky (night colour derives from paper either way).

**NOT verified:** frame rate on a phone (the Milky Way shader runs ~20 noise
lookups per pixel, at night only); motion in a real browser.

## How to test headless

Copy the page to the repo root as `zz_<name>.html` with a script appended
before `</body></html>` that sets controls after 300 ms, then screenshot it:

    set=(id,v)=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input'))}
    set('time',20.5);set('heading',225);set('lookUp',35);set('fov',90);
    document.getElementById('fly').click();                       // stop travelling
    document.getElementById('sheet').style.display='none';        // hide the panel

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
      --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1000,650 \
      --virtual-time-budget=5000 --screenshot=$PWD/out.png "http://localhost:8080/zz_name.html"

Then delete the `zz_` file. To read numbers, append a probe that writes
`sunEl`/`moonEl`/`state.day` into a `<p>` after 2.5 s and use `--dump-dom`.

**Traps:**
- **Some runs never draw a frame after the settings are applied** (rAF does not
  always fire headless). The state has changed but `sunEl` is stale and the status
  line shows the default 15:00 value (33.6°). **Echo `state.day`/`state.time` in the
  probe** so a stale run is recognisable; rerun it.
- The status line only refreshes when chunks build, so it is not a probe.
- Do not use `sed` with `#` as the delimiter on HTML containing `#fff` colours;
  use Python string replacement.
- Holes in the near terrain in screenshots are unbuilt chunks, not a fault.

**Regenerating `STARS`:** download
`https://heasarc.gsfc.nasa.gov/FTP/heasarc/dbase/tdat_files/heasarc_bsc5p.tdat.gz`,
split on `<DATA>`/`<END>`, fields are `|`-separated in the order of the
`line[1]` header; keep `ra`, `dec`, `vmag`, `bv_color` (default 0.6 if blank)
for vmag ≤ 5.5, sort by vmag, round to 0.1.

## Open (as of 2026-11-12, evening)

- **Tweaking in BD** — the author, from 2026-11-13. Unspecified.
- **Documentation and ranging** — the author's next section of these notes: what
  each control means, and its range. Ranges live in `CONTROLS` (module) and the
  slider attributes (page) — change both, or say why they differ.
- **Camera vs relief.** The camera flies at a fixed 0.676 units (2.7 km); peaks
  reach relief × 4 km, so above relief ≈ 0.65 it can fly THROUGH mountains (in
  both the page and the module — it always could). A camera that rises over high
  ground would bring back slow vertical movement; decide with the ranging.
- **Kolam3D squashes its figure** when height binds — found while building this
  (see "The BD module"). Not fixed; it would change how existing Kolam figures
  look, so it is the author's call. The 2D Kolam probably shares it.
- **Device (AV) for ShanShui** — needs a renderer entry in `AV/kolam.html` and
  the id in `AV_VIEWER_MODULES` (viewer.js). Until then Device falls back.
- **The glide is not in the script,** so two screens fly different stretches of
  land. Fine for now; matters only if Device / a partner should see the same.
- **A wider-than-square picture in a collage** would be a BD layout change
  (`--bd-collage-side` in style.css), not a module one.
- **Phone frame rate** — NOT measured, in View especially (full screen at up to
  2 device pixels per screen pixel).
- **Tuning candidates** (earlier list): dusk sky tint; star size/brightness;
  Milky Way strength and width; night-sky colour; moonlight wash.
- **Clouds** (agreed design, not built): a "Cloud cover" control — 0 clear, 1
  overcast, between = gaps with stars through them and the moon sliding in and
  out; a high drifting layer separate from the ground mist; silver edges where
  the moon or sun is behind (needs a shader).
- Offered earlier, not requested: soft ceiling for the flat black tops; lower
  gain for inverted palettes; Dropbox copy (needs internet for three.js).

## Migration to a BD module — the author's mappings (2026-11-12)

**MIGRATION MAPPINGS**
all begin %%bd unless stated otherwise
_p_ directives
Travel Speed  (let slider go to 0 theerfore no pause button, default 1)
Hurst Exponent H -> Peakiness
Octaves ->Peak Smoothing
Relief
Widest Mountain
Shadows Softness
FOV
Look Up
Opacity
Mist
Time of Day
Time Flow ->Minutes per Second
Stars
Palette
New World ->World Seed.  ( make integer 1 to 100 default 1)


 not _p_
 Day of the Lunar Month ->Moon Phase
 Direction of Travel
 Date
 Latitude
 Sun Size
 Moon Size

 No tick boxed - leave as currently defaulted.

 ------Claude's version ----

*(Where the agreed script below differs from the list above, the script wins:
smoothing / detail replaced Peakiness / Peak Smoothing; travel_speed defaults
to 0.2, as now; world_seed defaults to 42; star_size was added as a fixed
directive; palette stays a word, from a selector.)*

### Module script, agreed 2026-11-12

A `_p_` directive gets a control in BD (a
stepper — the +/− pair — for numbers, a selector box for words); one without
`_p_` is fixed by the script and has no control.

```
%%bd_module bd_V_ShanShuiV1
%%bd_p_travel_speed 0.2
%%bd_p_smoothing 0.9
%%bd_p_detail 9
%%bd_p_relief 0.4
%%bd_p_widest_mountain 10
%%bd_p_shadow_softness 2
%%bd_p_fov 80
%%bd_p_look_up 9
%%bd_p_opacity 1
%%bd_p_mist 1
%%bd_p_time_of_day 6.5
%%bd_p_minutes_per_second 0
%%bd_p_stars 2.5
%%bd_p_palette ink
%%bd_p_world_seed 42
%%bd_moon_phase 22.75
%%bd_direction_of_travel 0
%%bd_date 288
%%bd_latitude 26
%%bd_sun_size 1
%%bd_moon_size 1
%%bd_star_size 1
```

Decisions:
- **travel_speed** — default 0.2 (as now); range now starts at 0, so 0 is the
  pause and the Pause button goes.
- **smoothing** = H (Hurst exponent; higher = smoother land, fewer sharp peaks).
  **detail** = octaves (layers of detail; higher = more fine detail). Both now
  run the way their names say.
- **world_seed** 1–100, integer, default 42 — the seed the defaults were tuned
  on. The number IS the seed: no hidden mapping.
- **palette** stays a word, chosen from a selector: ink, inkInv, blue, blueInv.
  A word in the script that is not one of these is ignored and the palette
  keeps its current value.
- **star_size** fixed by the script (no control).
- Shadows and Show sun & moon: no directives, both stay on.
- No camera drag in BD for now; drag-style controls can be added later if
  wanted. The opening view is the page's default camera.

## The BD module — BUILT 2026-11-12

**Rebuilding it.** The module file was ASSEMBLED by a script (kept only in the
session scratchpad, so treat the module file as the source now): Kolam3D's
stylesheet (lines 33–690), its console forwarder, parser, `setDirectiveValue`
and stepper block, all with comments stripped; the page's lines from the STARS
script to just before "// ---------- Travel"; and the glue. To carry a landscape
change across, edit the same lines in the module's middle script by hand.

**Testing it headless.** BD's server serves the repo root, so a test page at
`/zz_<name>.html` can iframe `/V_ShanShui/index.html`, wait for `BD_READY`, and
post `{type: 'bd_script_update', script}` — NOT `BD_INIT`, which the relay does
not pass down. Listen for `bd_module_log`, `bd_av_state` and `BD_ERROR`. For View
send `{type: 'bd_ui_config', outputOnly: true, hideControls: true, hostChrome:
false}` first. In `--dump-dom` runs no animation frame fires: drive frames from
the test page with `w.eval('rafId=0; frame()')` on a timer. Delete `zz_` files.

### Details (`V_ShanShui/`, served at `/bd_V_ShanShuiV1/`)

- **`V_ShanShui/visual_module.html`** was ASSEMBLED, not hand-written: V_Kolam3D's
  stylesheet, `%%bd_` parser, `setDirectiveValue` and stepper machinery
  (comments stripped — read them in V_Kolam3D), plus this page's landscape code
  up to its Travel section, plus the module's own glue script. The scene code is
  therefore a COPY: a change to the landscape here must be carried across.
- **One table, `CONTROLS`,** in the glue: every directive's name, range, step and
  default. The stepper rows, the script reader and the script writer are all
  built from it — a range is written once.
- **Square in BD's preview, whole box in View/collage** (`outputOnly`). In a
  collage BD already sizes the picture's box above the 110px music strip.
- **Clock values (time, moon, date) are written back** into the script every
  200 ms while `minutes_per_second` > 0, labelled `fromDrift`, with the hand
  winning — Kolam3D's camera-clock pattern. The glide is not written back.
- **The loop stops when nothing moves** (travel and clock at 0, all land built).
- **No drag**: the camera sits at the page's opening offset, fixed height 0.676.
- **BD finds the square by `data-bd-square`** (`moduleSquareIn()` in viewer.js);
  Kolam's is still found by its id.
- **Found while building: V_Kolam3D squashes its figure** whenever height binds —
  it sizes the square to the wrapper INCLUDING its 44/52px padding, so a 760x520
  frame gave a 520x520 picture shown 520x468. Fixed in ShanShui only.
- **Not yet:** Device (AV) — needs an entry in `AV/kolam.html`'s renderers; no
  published Standalone page. The module's canary is its stepper colour (red,
  build 2026-11-12a).
- **The bob (fixed 2026-11-12, module build b + this page):** the point the camera
  looks at followed the ground while the camera's height stayed fixed, so the
  view tilted over every ridge, stars and all. The aim point now keeps a fixed
  height (0.15). MEASURED in the module: tilt −5.204° on every one of 30 frames
  over 5.6 km of travel.
