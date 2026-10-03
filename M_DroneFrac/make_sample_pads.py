#!/usr/bin/env python3
"""Build the drone pads that come from CC0 Freesound samples.

SOURCE: freesound.org/s/625157/ — "VOX Pad chord Dmin7" by voxlab,
**Creative Commons 0** (verified on the sound's page, not assumed). A synth pad
made by processing a male vocal recording through Steinberg HALion's grain
engine, Acustica Ultramarine and MTurboEQ; itself an edit of a vocal recording
by PerMagnusLindborg. 11.63 s, 96 kHz, 24-bit stereo.

WHY NOT JUST CUT AND LOOP. The file is a pad with a long swell and a long
decay: it rises from -38 dB to about -11 dB at 3.75 s and falls away to -43 dB.
Measured, the flattest 2 s window sits at 2.90 s with 4.4 dB of spread. Loop a
segment with a slow tilt in it and the tilt becomes a pulse — you hear the loop
as a breathing, which is worse than the click it replaced.

So the slow envelope is DIVIDED OUT before looping. The gain curve is smoothed
over 0.5 s, long enough to remove the swell and far too slow to touch the
texture, which is the thing worth keeping — this is a vocal chord and its fine
movement is why it sounds alive where four detuned organ notes do not.

Unlike the organ pads this source is ALREADY A CHORD (D minor 7), so no pitches
are stacked on top: the extra voices are detuned copies of the same material,
there to beat against each other and to stagger the loop seams.
"""
import math, os, struct, subprocess, sys, wave

HERE = os.path.dirname(os.path.abspath(__file__))
SRCDIR = os.path.join(HERE, 'sources')
TMP  = os.environ.get('TMPDIR', '/tmp')

END_FADE = 0.005      # both ends to zero — a step at the wrap is then impossible
LENGTH   = 36         # seconds of finished pad

# Each entry is one bundled pad. `win` is (start, length) in seconds of the
# section to take; `smooth` is the moving-RMS window used to divide out slow
# level drift; `transpose` and `voices` are cents; `target` is the per-VOICE RMS
# in dB, which the voice count then sums above (three voices ~ +5 dB).
PADS = [
    dict(
        out='vox_pad_Dmin7',
        src='625157__voxlab__vox-pad-chord-dmin7.wav',
        win=(2.75, 2.50),      # the loud central section of a long swell
        smooth=0.50,           # short, because the swell is steep
        transpose=-1200,
        voices=[0, 6, -6],
        target=-28.4,
    ),
    dict(
        out='j8_pad_Amin9',
        src='624728__voxlab__j8-jupiter-8-citylights-pd-amin9-chord.wav',
        # A LONG window, because this source needs no hunting: measured across
        # its whole 20.25 s it sits between -11.9 and -14.2 dB, a 2.3 dB range
        # with no swell and no decay. Sixteen seconds transposed down an octave
        # becomes a 32 s loop inside a 36 s pad — so it barely repeats at all,
        # which is the best answer to loop seams there is.
        win=(1.00, 16.00),
        # Long smoothing: there is almost no drift to remove, and a short window
        # here would flatten the pad's own slow movement, which is its character.
        smooth=2.00,
        # TWO octaves. At -1200 this patch still measured only 0.1% of its
        # energy below C2 with a centroid of 394 Hz — brighter than the vocal
        # pad, because an Amin9 voicing from three Jupiter-8 layers sits high.
        # -2400 brings it into the organ pads' register. It also slows the
        # patch's own chorus movement fourfold, which suits a drone, and
        # stretches the 16 s window to a 64 s loop — longer than the finished
        # pad, so the voices never wrap and there is no seam at all.
        transpose=-2400,
        voices=[0, 6, -6],
        # Quieter than the organ pads on purpose. This patch swings 11 dB
        # (its own chorus movement, slowed fourfold by the transposition), so
        # its peaks sit far above its average — matching the organ's LOUDNESS
        # would leave it peaking at -3.7 dB with nothing spare for grains to
        # sum into. Headroom is matched in preference to loudness throughout.
        target=-29.0,
    ),
    dict(
        out='aura_pad_Amin',
        src='697998__deleted_user_15018884__atm-aura-amin-135bpm.wav',
        # A SHORT WINDOW ON PURPOSE — see the note on loop length below. Taken
        # from 13-17 s, the fullest and flattest part of a long slow swell
        # (the file rises from -51 dB and falls back to -32 dB over 28 s).
        # "135BPM" in the filename is only a tempo label: checked for
        # transients and there are none, 0 of 1422 windows above 3x the median,
        # so it is a texture and not a rhythm.
        # TWO s and TWO octaves, chosen together. At -1200 this source still
        # measured only 2.9% of its energy below C2 (centroid 398 Hz), so it
        # needs -2400 like the J8. But transposing DOWN lengthens the loop
        # fourfold, and a 4 s window would have become a 16 s loop — long
        # enough to lose the repetition that makes a pad interesting. Halving
        # the window to 2 s gives an 8 s loop at the lower pitch: low AND
        # recognisable, which is the combination the two previous pads each got
        # only half of. 13.5-15.5 s is the flattest stretch of the swell.
        win=(13.50, 2.00),
        smooth=1.00,
        transpose=-2400,
        voices=[0, 6, -6],
        target=-28.0,
    ),
]

# ── ON LOOP LENGTH, WHICH TURNS OUT TO BE A MUSICAL CHOICE ─────────────────
# The author noticed that the vox pad, cut from a 2.5 s window, was "more
# interesting musically" than the J8 pad cut from 16 s — which is the opposite
# of what the measurements predicted, the J8 being by far the steadier source.
#
# The reason is repetition. A 2.5 s window transposed down an octave gives a 5 s
# loop, so in a 36 s pad you hear the same phrase seven times, and each time the
# three detuned voices stand in a slightly different relation to one another —
# theme and variation, which the ear follows. The J8's 16 s window transposed
# two octaves gives a 64 s loop: longer than the pad itself, so it is heard once
# and never recurs. Nothing to recognise, so nothing develops. Formless drift.
#
# So the seam-free long loop, which cost three rounds to arrive at, is
# musically the WEAKER option. Steadiness is a suitability measure, not an
# interest measure, and `win` is the knob that trades one for the other:
# roughly 2-5 s to be recognisable, longer to be ambient and shapeless.

def read24(path):
    w = wave.open(path)
    n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
    assert sw == 3, 'expected 24-bit, got %d bytes/sample' % sw
    raw = w.readframes(n)
    chans = [[] for _ in range(ch)]
    for i in range(0, len(raw), 3 * ch):
        for c in range(ch):
            o = i + 3 * c
            x = raw[o] | (raw[o+1] << 8) | (raw[o+2] << 16)
            if x & 0x800000:
                x -= 0x1000000
            chans[c].append(x / 8388608.0)
    return chans, sr


def build(cfg):
    src = os.path.join(SRCDIR, cfg['src'])
    if not os.path.exists(src):
        print('  SKIP %s — source not found' % cfg['out']); return
    chans, sr = read24(src)
    a = int(cfg['win'][0] * sr)
    b = a + int(cfg['win'][1] * sr)
    seg = [c[a:b] for c in chans]
    N = len(seg[0])

    # ── divide out slow level drift ─────────────────────────────────────
    # A centred moving RMS, so the correction does not lag what it corrects.
    # Prefix sums make it O(N) rather than O(N * window).
    half = int(cfg['smooth'] * sr / 2)
    mono = [sum(ch[i] for ch in seg) / len(seg) for i in range(N)]
    ps = [0.0] * (N + 1)
    for i, x in enumerate(mono):
        ps[i+1] = ps[i] + x * x
    env = []
    for i in range(N):
        lo, hi = max(0, i - half), min(N, i + half)
        env.append(math.sqrt((ps[hi] - ps[lo]) / (hi - lo)) or 1e-9)
    mean_env = sum(env) / N
    for ch in seg:
        for i in range(N):
            ch[i] *= mean_env / env[i]

    # ── level, then fades to zero at both ends ──────────────────────────
    rms = math.sqrt(sum(x * x for ch in seg for x in ch) / (N * len(seg)))
    gain = (10 ** (cfg['target'] / 20)) / rms
    nf = int(END_FADE * sr)
    for ch in seg:
        for i in range(N):
            g = gain
            if i < nf:
                g *= math.sin(math.pi / 2 * i / nf)
            elif i > N - nf:
                g *= math.sin(math.pi / 2 * (N - i) / nf)
            ch[i] = max(-1.0, min(1.0, ch[i] * g))

    loop = os.path.join(TMP, '%s_loop.wav' % cfg['out'])
    w = wave.open(loop, 'wb')
    w.setnchannels(len(seg)); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes(b''.join(struct.pack('<%dh' % len(seg),
                  *[int(ch[i] * 32767) for ch in seg]) for i in range(N)))
    w.close()

    args, mix = [], ''
    for k, cents in enumerate(cfg['voices']):
        ratio = 2 ** ((cents + cfg['transpose']) / 1200.0)
        v = os.path.join(TMP, '%s_v%d.wav' % (cfg['out'], k))
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', loop,
                        '-af', 'asetrate=%d*%.9f,aresample=44100' % (sr, ratio),
                        '-c:a', 'pcm_s16le', v], check=True)
        args += ['-stream_loop', '-1', '-t', str(LENGTH), '-i', v]
        mix += '[%d:a]' % k
    wavout = os.path.join(TMP, '%s.wav' % cfg['out'])
    n = len(cfg['voices'])
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y'] + args +
                   ['-filter_complex',
                    '%samix=inputs=%d:normalize=0[m];[m]alimiter=limit=0.63[o]' % (mix, n),
                    '-map', '[o]', '-c:a', 'pcm_s16le', wavout], check=True)
    out = os.path.join(SRCDIR, '%s.mp3' % cfg['out'])
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wavout,
                    '-codec:a', 'libmp3lame', '-b:a', '128k', out], check=True)
    print('  %-18s loop %5.2f s x %d voices  ->  %d KB' % (
        cfg['out'] + '.mp3', N / sr * 2 ** (-cfg['transpose'] / 1200.0) if False else N / sr,
        n, os.path.getsize(out) // 1024))


def main():
    for cfg in PADS:
        build(cfg)


if __name__ == '__main__':
    main()
