// piper_direct.js — Piper synthesis with IPA injection and real rate control.
//
// WHY THIS EXISTS
//
// vits-web is a thin wrapper around the same two pieces used here: Piper's
// phonemiser (espeak-ng in wasm) and onnxruntime-web. It works, and it decided
// two things for us that we want back:
//
//   1. It sends `[{ text }]` to the phonemiser and nothing else, so pronunciation
//      is whatever espeak guesses. Every Chinese name in the corpus is mangled —
//      "Li Bai" reads as "lie bye", "Khwan" is spelled out letter by letter.
//   2. It reads length_scale from the voice's config file and passes it to the
//      model as a tensor. So the real speaking-rate control exists, one line
//      away, and is not exposed. The alternative is playbackRate, which is a
//      time-stretch rather than a change in delivery.
//
// Neither is a limitation of Piper or of espeak. Both are this wrapper's API.
//
// HOW THE PRONUNCIATION FIX WORKS
//
// espeak will NOT accept IPA — verified, `[[dʒwˈɑːŋdzə]]` yields "d" — and the
// phonemiser has no phonemes input mode; its options are only --language,
// --input, --json_input, --espeak_data, --allow_missing_phonemes and
// --tashkeel_model. So IPA cannot be pushed in at the text layer.
//
// But it does not have to be. The phonemiser returns the PHONEME ARRAY as well
// as the ids, and the ids are a pure function of that array plus the voice's
// phoneme_id_map. Verified against the real output, byte for byte:
//
//     ids = [ ^ , _ , p1 , _ , p2 , _ , … , $ ]
//
// So we phonemise ordinary text as usual, substitute our own IPA for the words
// we care about, and map the whole sequence to ids ourselves. espeak is never
// asked to understand IPA — it is simply not consulted for those words.
//
// The phonemiser takes an ARRAY of entries and returns one result per entry, so
// all the ordinary segments of an utterance go in a single call.
//
// STORAGE: the Cache API, not OPFS. vits-web uses OPFS, which Safari 18.5 could
// not write to — an entire evening was lost to a voice that downloaded into a
// zero-byte file while stored() reported it present. The Cache API works
// everywhere and reports failure honestly.

const HF = 'https://huggingface.co/diffusionstudio/piper-voices/resolve/main';
const ORT = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0';
const PIPER = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';
const CACHE = 'bd-piper-v1';

let ortMod = null, phonMod = null;
const voices = new Map();          // voiceId -> { cfg, session }

async function cached(url, onProgress) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(url);
  if (hit) return hit.arrayBuffer();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status} for ${url}`);
  // Clone before reading: a Response body can only be consumed once, and the
  // cache needs its own.
  await cache.put(url, res.clone());
  if (onProgress) onProgress(url);
  return res.arrayBuffer();
}

// PATH_MAP in vits-web is a full table; the layout is regular enough to derive.
// en_GB-jenny_dioco-medium -> en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium
function voicePath(voiceId) {
  const m = voiceId.match(/^([a-z]{2})_([A-Z]{2})-(.+)-([a-z_]+)$/);
  if (!m) throw new Error('unrecognised voice id: ' + voiceId);
  const [, lang, region, name, quality] = m;
  return `${lang}/${lang}_${region}/${name}/${quality}/${voiceId}`;
}

export async function loadVoice(voiceId, onProgress) {
  if (voices.has(voiceId)) return voices.get(voiceId);
  const path = voicePath(voiceId);

  ortMod = ortMod || await import(/* @vite-ignore */ `${ORT}/+esm`);
  ortMod.env.allowLocalModels = false;
  ortMod.env.wasm.wasmPaths = `${ORT}/dist/`;
  ortMod.env.wasm.numThreads = navigator.hardwareConcurrency || 4;

  const cfgBuf = await cached(`${HF}/${path}.onnx.json`, onProgress);
  const cfg = JSON.parse(new TextDecoder().decode(cfgBuf));
  const modelBuf = await cached(`${HF}/${path}.onnx`, onProgress);
  const session = await ortMod.InferenceSession.create(modelBuf);

  const v = { cfg, session };
  voices.set(voiceId, v);
  return v;
}

// One phonemiser instance per call — Emscripten's callMain is not re-entrant,
// which is why vits-web also builds a fresh one each time.
async function phonemise(entries, espeakVoice) {
  phonMod = phonMod || await import(/* @vite-ignore */
    'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/dist/piper-DeOu3H9E.js/+esm');
  const lines = [];
  const mod = await phonMod.createPiperPhonemize({
    print: (s) => lines.push(s),
    printErr: (s) => { throw new Error(String(s)); },
    locateFile: (f) => f.endsWith('.wasm') ? `${PIPER}.wasm`
                     : f.endsWith('.data') ? `${PIPER}.data` : f,
  });
  mod.callMain(['-l', espeakVoice, '--input', JSON.stringify(entries),
                '--espeak_data', '/espeak-ng-data']);
  return lines.map(l => JSON.parse(l).phonemes);
}

// Split on the lexicon keys, longest first so "Tao Te Ching" wins over "Tao".
function segment(text, lexicon) {
  const keys = Object.keys(lexicon).sort((a, b) => b.length - a.length);
  if (!keys.length) return [{ text }];
  const esc = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp('\\b(' + esc.join('|') + ')\\b', 'gi');
  const out = [];
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    const key = keys.find(k => k.toLowerCase() === m[1].toLowerCase());
    out.push({ ipa: lexicon[key] });
    last = m.index + m[1].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

function toIds(phonemes, map) {
  const ids = [];
  const push = (sym) => { const v = map[sym]; if (v) ids.push(...v); };
  push('^'); push('_');
  const missing = [];
  for (const p of phonemes) {
    if (!map[p]) { missing.push(p); continue; }   // drop, do not abort
    push(p); push('_');
  }
  push('$');
  return { ids, missing };
}

function toWav(pcm, rate) {
  const buf = new ArrayBuffer(44 + pcm.length * 2), dv = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true); dv.setUint32(24, rate, true);
  dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  str(36, 'data'); dv.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    dv.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

/**
 * Synthesise one utterance.
 *
 * lengthScale > 1 is SLOWER. This is the model's own timing parameter, so the
 * delivery changes rather than the audio being stretched afterwards.
 * lexicon maps a word to an IPA string, e.g. { 'Li Bai': 'lˈiː bˈaɪ' }.
 */
export async function synthesise({ voiceId, text, lengthScale, noiseScale, noiseW, lexicon = {} }) {
  const { cfg, session } = await loadVoice(voiceId);
  const segs = segment(text, lexicon);

  // Every ordinary segment in ONE phonemiser call; the IPA segments need none.
  const textSegs = segs.map((s, i) => ({ i, s })).filter(x => x.s.text != null && x.s.text.trim());
  const phonLists = textSegs.length
    ? await phonemise(textSegs.map(x => ({ text: x.s.text })), cfg.espeak.voice)
    : [];
  const byIndex = new Map();
  textSegs.forEach((x, n) => byIndex.set(x.i, phonLists[n] || []));

  const phonemes = [];
  segs.forEach((s, i) => {
    if (s.ipa != null) phonemes.push(...s.ipa);
    else phonemes.push(...(byIndex.get(i) || []));
  });

  const { ids, missing } = toIds(phonemes, cfg.phoneme_id_map);
  if (!ids.length) throw new Error('no phonemes produced');

  const inf = cfg.inference || {};
  const scales = Float32Array.from([
    noiseScale != null ? noiseScale : (inf.noise_scale ?? 0.667),
    lengthScale != null ? lengthScale : (inf.length_scale ?? 1),
    noiseW != null ? noiseW : (inf.noise_w ?? 0.8),
  ]);

  const feeds = {
    input: new ortMod.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    input_lengths: new ortMod.Tensor('int64', BigInt64Array.from([BigInt(ids.length)])),
    scales: new ortMod.Tensor('float32', scales),
  };
  if (cfg.speaker_id_map && Object.keys(cfg.speaker_id_map).length) {
    feeds.sid = new ortMod.Tensor('int64', BigInt64Array.from([0n]));
  }

  const out = await session.run(feeds);
  const pcm = out[Object.keys(out)[0]].data;
  const rate = cfg.audio?.sample_rate || 22050;
  return { blob: toWav(pcm, rate), seconds: pcm.length / rate, phonemes, missing };
}

export { segment as _segment, toIds as _toIds };
