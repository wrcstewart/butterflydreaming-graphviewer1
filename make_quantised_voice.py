#!/usr/bin/env python3
"""Build a quantised Piper voice for BD.

    python3 make_quantised_voice.py                              # alba, from HuggingFace
    python3 make_quantised_voice.py voices/ringlet.onnx ringlet_int8dp

With no arguments this does what it always did: fetch en_GB-alba-medium and
write voices/alba_int8dp.onnx. Given a LOCAL source it quantises that instead,
which is how a fine-tuned voice gets the same treatment — 2026-11-02, with the
author's wife's voice (`ringlet`) about to become BD's default so that *"various
folks"* can hear it. A fine-tune is 60.3 MB like any other medium model, and the
download is the whole of a stranger's first visit.

The recipe is unchanged and is the point of reusing this rather than writing a
second script: the same int8-except-the-duration-predictor choice, measured and
chosen by ear on alba, applies to any voice of this architecture.

WHY THIS EXISTS. BD speaks with a Piper voice, and the published one is 60.3 MB.
That is a one-time download per device and then cached, so it costs nothing on a
machine that has already paid it — but it is the whole experience for a cold
first visit, and an unknown quantity on a headset. Quantising the weights to
int8 takes it to 19.4 MB with no retraining and no change of speaker: it is the
same alba, stored less precisely.

WHY THE DURATION PREDICTOR IS SPARED. Quantising everything gives 17.9 MB, and
the author's ear found it "loses something" — the full-precision voice is
"slightly more musical in intonation". Intonation is prosody, and prosody is
what the duration predictor (`dp`) decides, so it is the one component worth
keeping in full precision. It costs 1.5 MB and the musicality comes back.

Measured, which is how the choice was made:

    build                     size      utterance shift vs fp32
    all convs quantised       17.9 MB   -163 ms
    dp spared  (this one)     19.4 MB    -58 ms
    dp + decoder spared       22.2 MB    -58 ms

The long-term average spectrum differs by ~0.55 dB in ALL THREE, which is why
it is not the deciding number: an LTAS is an average over the whole utterance
and is structurally blind to intonation. Sparing the decoder as well measured
no better and cost another 2.8 MB, so it is not done. The ear decided this one.

WHY IT IS NOT IN THE REPO. `voices/` is gitignored, for a reason worth keeping:
a fine-tuned voice is someone's actual voice and does not belong in a public
repo. That applies to bd_will_01, not to this file — but the directory rule is
the simpler thing to hold, and a 19.4 MB binary in git is forever. So this is a
BUILD, like the sample pads in M_DroneFrac: the recipe is version-controlled and
the output is not. A derived work nobody can rebuild is one whose provenance
cannot be checked.

If the build is absent, `piper_direct.js` falls back to the published 60.3 MB
voice and logs why, so a fresh checkout still speaks.

REQUIRES onnx and onnxruntime, which BD does not otherwise need. Install them
somewhere disposable rather than system-wide:

    python3 -m venv /tmp/qvenv && /tmp/qvenv/bin/pip install onnx onnxruntime
    /tmp/qvenv/bin/python make_quantised_voice.py
"""

import json
import os
import sys
import urllib.request

VOICE = 'en_GB-alba-medium'
BASE  = ('https://huggingface.co/rhasspy/piper-voices/resolve/main/'
         'en/en_GB/alba/medium/' + VOICE)
# argv: [source.onnx [out_stem]]. A local source skips the fetch entirely; its
# config is copied beside the output, because piper_direct needs the pair and
# the config of a fine-tune is NOT the published voice's.
SRC_ARG = sys.argv[1] if len(sys.argv) > 1 else None
OUT = 'voices/' + (sys.argv[2] if len(sys.argv) > 2
                   else (os.path.basename(SRC_ARG).replace('.onnx', '') + '_int8dp'
                         if SRC_ARG else 'alba_int8dp'))

try:
    import onnx
    from onnxruntime.quantization import quantize_dynamic, QuantType
except ImportError:
    sys.exit(__doc__.rsplit('REQUIRES', 1)[1].strip().join(('REQUIRES ', '')))


def fetch(url, path):
    if os.path.exists(path):
        print('  have   %s' % path)
        return
    print('  fetch  %s' % url)
    urllib.request.urlretrieve(url, path)
    print('         -> %s (%.1f MB)' % (path, os.path.getsize(path) / 1048576))


def main():
    os.makedirs('voices', exist_ok=True)
    if SRC_ARG:
        src = SRC_ARG
        if not os.path.exists(src):
            sys.exit('no such source: ' + src)
        cfg_src = src + '.json'
        if not os.path.exists(cfg_src):
            sys.exit('a voice is a PAIR — missing ' + cfg_src)
        if os.path.abspath(cfg_src) != os.path.abspath(OUT + '.onnx.json'):
            with open(cfg_src, 'rb') as a, open(OUT + '.onnx.json', 'wb') as b:
                b.write(a.read())
        print('  source %s (%.1f MB), config copied' % (src, os.path.getsize(src) / 1048576))
    else:
        src = 'voices/_alba_fp32.onnx'
        fetch(BASE + '.onnx', src)
        fetch(BASE + '.onnx.json', OUT + '.onnx.json')

    model = onnx.load(src)
    init = {i.name for i in model.graph.initializer}

    # Every Conv/MatMul whose weight belongs to the duration predictor. Matching
    # on the WEIGHT name rather than the node name because the ONNX export does
    # not preserve node names for all of them — most of the flow layers come out
    # as `onnx::Conv_8959` and friends, with no module in the name at all.
    spare = sorted({n.name for n in model.graph.node
                    if n.op_type in ('Conv', 'MatMul')
                    and any(i in init and i.startswith('dp.') for i in n.input)})
    print('  sparing %d duration-predictor nodes from quantisation' % len(spare))

    quantize_dynamic(
        model_input=src,
        model_output=OUT + '.onnx',
        op_types_to_quantize=['Conv', 'MatMul'],
        weight_type=QuantType.QUInt8,
        per_channel=True,
        nodes_to_exclude=spare,
        # 95% of this model's weight is in Conv, not MatMul, so the default
        # MatMul-only quantisation would shrink it by almost nothing.
        extra_options={'MatMulConstBOnly': False},
    )
    print('  built  %s.onnx (%.1f MB, from %.1f MB)'
          % (OUT, os.path.getsize(OUT + '.onnx') / 1048576,
             os.path.getsize(src) / 1048576))
    if not SRC_ARG:
        print('  kept   %s — delete it to reclaim the space; it is only the input'
              % src)
    cfg = json.load(open(OUT + '.onnx.json'))
    print('  voice  %s, %s, %d Hz'
          % (cfg.get('dataset', '?'), cfg.get('audio', {}).get('quality', '?'),
             cfg.get('audio', {}).get('sample_rate', 0)))


if __name__ == '__main__':
    main()
