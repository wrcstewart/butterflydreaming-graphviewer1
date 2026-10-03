#!/bin/sh
# Build the bundled drone pads from VCSL organ notes. REPRODUCIBLE ON PURPOSE:
# the pads are a derived work, and a derived work nobody can rebuild is a
# derived work whose provenance cannot be checked.
#
# WHY THESE EXIST. The two pads this module started with came from Sample
# Focus, whose Standard Licence permits use "as part of a new creative work"
# but forbids making the sound available "in a complete, archived, downloadable
# or readily extractable format" — which is exactly what serving a file from
# BD or committing it to a public repo does. BD publishes CC0 and cannot
# CC0 what it does not own. So the pads are rebuilt from material that CAN be
# redistributed.
#
# SOURCE: Versilian Community Sample Library (VCSL), github.com/sgossner/VCSL,
# CC0-1.0. The Renaissance Organ carries an explicit grant in its own Info.txt:
# "Bearer is granted right to redistribute this sample set by Versilian
# Studios LLC." Organ sampled by Simon Dalzell of Ivy Audio, Winter 2015-16.
#
# WHY AN ORGAN. Granular wants material with no transients and no decay, and
# an organ sustains mechanically — wind through a pipe does not fade. Measured
# on the raw note: 0.2 dB RMS spread across its sustain, against 4.1 dB for the
# pad it replaces.
#
# WHY A CHORD RATHER THAN A NOTE. A single organ note is one static pitch:
# granulating it gives texture but no journey. Several copies at slightly
# different tunings BEAT against each other, which supplies the slow internal
# movement a drone needs. The detunings are a few cents, so the beat period is
# seconds rather than milliseconds.
#
# WHY THE VOICES LOOP INDEPENDENTLY. Each is detuned, so each has a slightly
# different duration, so their loop points never coincide and the texture keeps
# evolving for as long as you let it run. Each voice is separately faded to zero
# at both ends — see voice() — because staggering the seams does not remove
# them.
#
# NOTE ON THE ORGAN'S OWN SCALE: the sampled pitches are C D E F# G# A# — a
# whole-tone set. There is NO perfect fifth anywhere in it. Hence an augmented
# triad for the bright pad (the only symmetrical triad available, and so the
# only one that sounds the same at every major-third transposition) and plain
# octaves for the deep one.
set -e
# REGISTRATION — the single most consequential choice here, far more than the
# octave. Measured on the same note (file C1), share of energy at or below C2:
#
#   Full    10.9%   centroid 337 Hz   a MIXTURE: upper ranks built in, bright
#   8foot   46.3%   centroid 203 Hz   the fundamental-pitch rank, dark
#   4foot    2.9%   centroid 261 Hz   sounds an OCTAVE UP, as 4' means
#
# The pads were first built on Full, and dropping their nominal octave barely
# changed what you heard — because Full's energy lives in partials well above
# its nominal pitch, so moving the fundamental moves little. 8' has four times
# the low-end weight. Switch this pair to go back to a brighter organ.
REG_DIR="8%27"
REG_PRE="RenOrgan_8foot_Room"
VCSL="https://raw.githubusercontent.com/sgossner/VCSL/master/Aerophones/Edge-blown%20Aerophones/Renaissance%20Organ/$REG_DIR"
WORK="${TMPDIR:-/tmp}/organ_pads.$$"
OUT="$(cd "$(dirname "$0")" && pwd)/sources"
mkdir -p "$WORK" "$OUT"
trap 'rm -rf "$WORK"' EXIT

SUSTAIN_FROM=0.30     # measured: the attack is over by here
SUSTAIN_LEN=4.90      # and the release has not begun by 5.2s
LENGTH=36             # seconds of finished pad

fetch() {                       # fetch <NoteName>
  n=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$1")
  [ -f "$WORK/$1.wav" ] || curl -sfL -o "$WORK/$1.wav" "$VCSL/${REG_PRE}_${n}_rr1.wav"
}


voice() {                       # voice <NoteName> <cents> <outfile>
  fetch "$1"
  ratio=$(python3 -c "print(2 ** ($2 / 1200.0))")
  # asetrate retunes by resampling, which also changes the duration — wanted
  # here, since it is what makes the voices drift out of step.
  ffmpeg -loglevel error -y -i "$WORK/$1.wav" \
    -af "atrim=start=$SUSTAIN_FROM:duration=$SUSTAIN_LEN,asetpts=N/SR,asetrate=44100*$ratio,aresample=44100" \
    -c:a pcm_s16le "$WORK/raw_$(basename "$3")"

  # ── MAKE IT LOOP WITHOUT A CLICK ────────────────────────────────────────
  # -stream_loop repeats a file by HARD SPLICE, and a step discontinuity in a
  # waveform is broadband: heard as a brief high-frequency tick, once per
  # repeat. With a 4.9 s voice that is a pop every few seconds, and four voices
  # give four of them at staggered times. (An earlier version of this script
  # claimed that staggering meant "no single seam to hear". The opposite:
  # staggering spreads the seams out, it does not remove them.)
  #
  # FADING BOTH ENDS TO ZERO makes the step impossible rather than unlikely —
  # both sides of the wrap are silence, so there is nothing to discontinue.
  # Measured: the step at the wrap falls from 998 to 8 of 32768, which is
  # -72 dBFS and 47 dB below the signal.
  #
  # A 0.6 s self-overlap crossfade was tried here first and REMOVED. It did
  # reduce the step (998 -> 392) but it also wrecked the level: only the
  # overlap window had both voices present, so the pad came out loud for 0.6 s
  # and 16 dB quieter for the remaining 3.7 s, over and over. It went unnoticed
  # because the seam was measured and the ENVELOPE was not — the lesson being
  # that a fix aimed at one property has to be checked against the others.
  #
  # The price of the fades is a 5 ms notch every 4.3 s in one of four staggered
  # voices: 0.1% duty on a quarter of the energy.
  ffmpeg -loglevel error -y -i "$WORK/raw_$(basename "$3")" \
    -af "afade=t=in:d=0.005,afade=t=out:st=$(python3 -c "print($SUSTAIN_LEN - 0.005)"):d=0.005" \
    -c:a pcm_s16le "$3"
}

# ── WHY THE 5 ms FADES, which look like a nothing and are the actual fix ────
# The crossfade above reduced the step at the wrap from 998 to 392 (of 32768)
# but could not remove it, because whether the two ends happen to meet at
# compatible points in the cycle is luck. A step of -38 dBFS against a -17 dBFS
# signal is still a broadband click, heard once per repeat — which is what the
# "higher frequencies come in briefly every few seconds and pop" report was.
#
# Fading both ends to ZERO makes the step impossible rather than unlikely: both
# sides of the wrap are silence, so there is nothing to discontinue. The price
# is a 5 ms notch every 4.3 s in ONE of four staggered voices — 0.1% duty on a
# quarter of the energy, against a click that was 21 dB below RMS and
# broadband. The measurement to trust here is the sample-level step at the
# wrap, not the high-band energy relative to a median: the median moves when
# you smooth the signal, which made a genuine 8 dB improvement read as a
# regression.

build() {                       # build <outname> <volume> <voice spec...>
  name=$1; vol=$2; shift 2
  i=0; args=""; mix=""
  for spec in "$@"; do
    note=${spec%%:*}; cents=${spec##*:}
    voice "$note" "$cents" "$WORK/v$i.wav"
    args="$args -stream_loop -1 -t $LENGTH -i $WORK/v$i.wav"
    mix="$mix[$i:a]"
    i=$((i+1))
  done
  # normalize=0 so amix does not divide by the voice count (which would make a
  # four-voice pad quieter than a one-voice one).
  #
  # HEADROOM IS THE POINT OF THE GAIN SETTING, not loudness. Granular SUMS
  # overlapping grains, so a source at full scale drives the module's own
  # Limiter(-1) continuously and squashes the beating that the detuned voices
  # exist to produce. The first build used volume=2.2 and landed at 0.0 dBFS;
  # 0.75 lands near -8, which leaves the grain summing somewhere to go.
  # The limiter is a safety net that should never engage, not a stage.
  ffmpeg -loglevel error -y $args \
    -filter_complex "${mix}amix=inputs=$i:normalize=0[m];[m]volume=$vol,alimiter=limit=0.7[o]" \
    -map "[o]" -c:a pcm_s16le "$WORK/$name.wav"
  ffmpeg -loglevel error -y -i "$WORK/$name.wav" -codec:a libmp3lame -b:a 128k "$OUT/$name.mp3"
  echo "  $name.mp3  $(($(stat -f%z "$OUT/$name.mp3") / 1024)) KB"
}

echo "building organ pads from VCSL (CC0) ..."
# The note names below are FILE names, and VCSL LABELS AN OCTAVE LOW: the file
# called C1 sounds 65.4 Hz, which is C2. So `C1:0` is a sounding C2. The pad
# names use the SOUNDING pitch, which is the useful one.
#
# Rebuilt from lower files rather than pitch-shifted down: VCSL samples every
# octave, so the low register is really recorded — the pipe's own character at
# that pitch instead of a stretched copy, and no shift artefacts for the
# granulation to magnify.
#
# Augmented triad + upper octave: bright, and symmetrical under transposition.
build organ_aug_C   1.10 C1:0 E1:5 G\#1:-5 C2:3
# Octaves only: deep and harmonically neutral, so the module's own scale
# quantisation supplies the harmony rather than fighting a baked-in chord.
#
# A LOWER GAIN THAN THE OTHER, and not by taste: octaves share harmonics, so
# they sum far more COHERENTLY than an augmented triad does — the same voice
# count and the same gain put this one 3 dB hotter. Measured, then set.
build organ_pedal_C 1.97 C1:0 C1:4 C1:-4 C2:2

# A SINGLE RAW NOTE, for comparison — the same C2 the aug pad is built on,
# trimmed, retuned by nothing and chorded with nothing. It is here so the
# chording and the beating can be heard as a CHOICE rather than assumed: A/B
# this against organ_aug_C and what you hear added is exactly what the recipe
# above contributes.
#
# Its gain is set to match the pads by RMS, not by peak. Peak-matching would
# mislead: a four-voice chord has a different peak-to-RMS ratio from one note,
# so equal peaks would put the single note audibly quieter and the comparison
# would be about loudness instead of texture. The figure below was measured,
# not guessed — build at 1.0, compare RMS, solve.
# GAINS RE-SOLVED AGAIN FOR THE 8' REGISTRATION, which is recorded far quieter
# than Full — the three needed +5.4, +10.9 and +14.7 dB respectively to reach
# the same loudness. Expect to re-solve after ANY change of note or stop; the
# numbers are derived from measurement, never carried over.
#
# (previously, for the Full registration:) Every one of the three moved: a low
# organ note carries more energy than the same note an octave up, so the gains
# that balanced the C3-based pads put the C2-based aug pad 2 dB hot. All three
# are now measured at a common RMS of about -17 dB.
# 1.10 for the single note — measured, not guessed.
# Note the consequence of RMS-matching rather than peak-matching: this file
# peaks at -7.9 dB where the pads peak at -4.5, because four voices
# occasionally align in phase and one note never does. Equal peaks would have
# meant unequal loudness.
build organ_single_C2 5.98 C1:0
echo "done — rerun make_manifest.py to list them"
