// sr_module.js — Speech-Recognition module for BD viewer.
// Ported 2026-08-15 from sr_editor.html (see project_sr_editor memory).
// Exposes a UI-agnostic engine + biasing + alignment helpers so BD's
// viewer.js can wire them into the Edit-mode action-bar without pulling
// in the whole SR editor page. Two-copy convention (sr_editor.html vs
// bd_SR_Editor/index.html) continues; this module is the third copy but
// UI-decoupled so it can serve BD without further duplication.
//
// ── What lives here ──
//   createEngine(opts)  → WhisperEngine instance (audio + Whisper pipeline)
//   buildBiasPrompt(sourceText, boost) → { text, meta } for prompt_ids
//   stripDirectiveBlocks(text) → strips %%bd_… blocks from a copy
//   tokenise(text) → [{surface, phon, start, end}]  (used for alignment)
//   phoneticKey(word) → lightweight double-metaphone stub
//   alignLocal(aToks, bToks, opts) → Smith-Waterman matches
//   mergeChunkOutputs(parts) → joins overlapping own-chunk outputs
//
// MVP1 wire-up in viewer.js uses: createEngine, buildBiasPrompt,
// stripDirectiveBlocks, mergeChunkOutputs. Alignment stays dormant
// until MVP2 layers on {?…} substitution.

// ── Biasing: common-word set + tricky-word ×N scheme ─────────────────
const BIAS_COMMON_WORDS = new Set(
  ('the a an and or but if so as is was were been be am are has have had ' +
   'do does did will would could should may might must can shall to of ' +
   'in on at by for with from up out over under above below between ' +
   'again then once all any some no not yes only own same other ' +
   'i you he she it we they my your his her its our their me him us them ' +
   'this that these those here there when where why how what who which while ' +
   'about into onto upon through than though until after before because ' +
   'one two three four five six seven eight nine ten hundred thousand ' +
   'first last next new old good bad big little long short more most less least ' +
   'like just now still ever even never also very too rather quite ' +
   'day night morning evening year day time hour minute today yesterday ' +
   'come go went gone see saw seen say said know knew known think thought ' +
   'take took taken make made give gave given get got look looked ' +
   'want wanted need needed use used find found feel felt work worked ' +
   'call called seem seemed try tried ask asked leave left put ' +
   'man woman child man men women people boy girl thing things ' +
   'way ways part parts side sides place places case cases point points ' +
   'life world hand head eye eyes face body foot feet water fire earth air ' +
   'yes no okay ok').split(/\s+/)
);
const BIAS_MAX_TOKENS       = 200;
const APPROX_TOKENS_PER_WORD = 1.4;
const BIAS_MAX_WORDS = Math.floor(BIAS_MAX_TOKENS / APPROX_TOKENS_PER_WORD);   // ~142

function repetitionForBoost(boost) {
  if (boost >= 7) return 3;
  if (boost >= 4) return 2;
  return 1;
}
function scoreTrickiness(surface, isMidSentenceCap, isCommon) {
  let s = 0;
  if (!isCommon)                    s += 1;
  if (surface.length >= 8)          s += 1;
  if (surface.includes('-'))        s += 1;
  if (isMidSentenceCap)             s += 2;
  return s;
}
function analyseSourceWords(text) {
  const info = new Map();
  let sentenceStart = true;
  const tokRe = /\S+/g;
  let m;
  while ((m = tokRe.exec(text)) !== null) {
    const raw   = m[0];
    const clean = raw.replace(/^[^\w'-]+|[^\w'-]+$/g, '');
    const lc    = clean.toLowerCase();
    const trailingTerminator = /[.!?]$/.test(raw);
    if (lc) {
      const isCommon = BIAS_COMMON_WORDS.has(lc);
      const isMidCap = !sentenceStart && /^[A-Z]/.test(clean);
      let entry = info.get(lc);
      if (!entry) {
        entry = { surface: clean, isCommon, midCap: isMidCap, score: 0, count: 0 };
        info.set(lc, entry);
      }
      entry.count++;
      if (isMidCap) entry.midCap = true;
      entry.score = scoreTrickiness(entry.surface, entry.midCap, entry.isCommon);
    }
    sentenceStart = trailingTerminator;
  }
  return info;
}

// Build a bias prompt from a single source-text string. In sr_editor.html
// the source came from two textareas gated by checkboxes; the BD side
// concatenates its own inputs (visible History + Current) and passes them
// as one blob. Boost = 0 disables biasing entirely.
export function buildBiasPrompt(sourceText, boost = 4) {
  if (boost <= 0) return { text: '', meta: null };
  const text = (sourceText || '').trim();
  if (!text) return { text: '', meta: null };

  const info = analyseSourceWords(text);
  const rep  = repetitionForBoost(boost);
  const tricky      = [];
  const distinctive = [];
  for (const [, e] of info) {
    if (e.isCommon) continue;
    if (e.score >= 2) tricky.push(e.surface);
    else              distinctive.push(e.surface);
  }

  const wholeWordCount = text.split(/\s+/).length;
  const shortSourcePath = wholeWordCount <= BIAS_MAX_WORDS - (tricky.length * rep);
  const promptChunks = [];
  let used = 0;

  if (shortSourcePath) {
    const trickyRepeated = tricky.flatMap(w => Array(rep).fill(w));
    if (trickyRepeated.length) {
      promptChunks.push(trickyRepeated.join(' '));
      used += trickyRepeated.length;
    }
    promptChunks.push(text);
    return { text: promptChunks.join('\n'), meta: { tricky, rep, path: 'short' } };
  }

  const trickyRepeated = tricky.flatMap(w => Array(rep).fill(w));
  if (trickyRepeated.length && used + trickyRepeated.length <= BIAS_MAX_WORDS) {
    promptChunks.push(trickyRepeated.join(' '));
    used += trickyRepeated.length;
  }
  const openingBudget = Math.floor(BIAS_MAX_WORDS / 3);
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let openingUsed = 0;
  for (const line of lines) {
    const lw = line.split(/\s+/).length;
    if (openingUsed + lw > openingBudget || used + lw > BIAS_MAX_WORDS) break;
    promptChunks.push(line);
    openingUsed += lw;
    used += lw;
  }
  for (const w of distinctive) {
    if (used >= BIAS_MAX_WORDS) break;
    promptChunks.push(w);
    used++;
  }
  return { text: promptChunks.join(' '), meta: { tricky, rep, path: 'long' } };
}

// ── Directive stripping ────────────────────────────────────────────────
// Removes %%bd_… blocks so alignment / biasing doesn't get poisoned by
// non-user content (bot-context, module directives, etc.).
export function stripDirectiveBlocks(text) {
  let out = '';
  let inBlock = false;
  for (const line of (text || '').split('\n')) {
    if (/^%%bd_[\w]+\s*\[/.test(line)) { inBlock = true;  out += '\n'; continue; }
    if (/^%%bd_\]/.test(line))         { inBlock = false; out += '\n'; continue; }
    if (inBlock)                        { out += '\n'; continue; }
    if (/^%%bd_/.test(line))            { out += '\n'; continue; }
    out += line + '\n';
  }
  return out;
}

// ── Phonetic key + tokeniser (alignment helpers) ───────────────────────
export function phoneticKey(word) {
  let w = (word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return '';
  w = w.replace(/^(kn|gn|pn|wr|ps)/, m => m[1]);
  w = w.replace(/^x/, 's');
  w = w.replace(/ph/g, 'F');
  w = w.replace(/th/g, '0');
  w = w.replace(/sh/g, 'S');
  w = w.replace(/ch/g, 'C');
  w = w.replace(/[cq]k?/g, 'K');
  w = w.replace(/gh/g, '');
  w = w.replace(/wh/g, 'W');
  w = w.replace(/(.)\1+/g, '$1');
  const leading = w[0] && /[aeiou]/.test(w[0]) ? w[0] : '';
  w = leading + w.slice(leading ? 1 : 0).replace(/[aeiou]/g, '');
  w = w.replace(/y/g, '');
  return w;
}
export function tokenise(text) {
  const tokens = [];
  const re = /\b[\w']+\b/g;
  let m;
  while ((m = re.exec(text || '')) !== null) {
    tokens.push({
      surface: m[0].toLowerCase(),
      phon: phoneticKey(m[0]),
      start: m.index,
      end: m.index + m[0].length
    });
  }
  return tokens;
}

// ── Smith-Waterman local alignment (for MVP2 substitution) ─────────────
export function alignLocal(aToks, bToks, opts) {
  const {
    minLen        = 3,
    minScore      = 4,
    phonWeight    = 0.5,
    matchScore    = 2,
    mismatchScore = -1,
    gapOpen       = -2,
    gapExtend     = -1
  } = opts || {};
  const n = aToks.length, m = bToks.length;
  if (!n || !m) return [];
  function score(a, b) {
    if (a.surface === b.surface) return matchScore;
    if (a.phon && b.phon && a.phon === b.phon) return matchScore * phonWeight;
    return mismatchScore;
  }
  const H = new Array(n + 1);
  const traceback = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    H[i] = new Float32Array(m + 1);
    traceback[i] = new Int8Array(m + 1);
  }
  const results = [];
  const usedA = new Uint8Array(n);
  for (let iter = 0; iter < 10; iter++) {
    for (let i = 0; i <= n; i++) { H[i].fill(0); traceback[i].fill(0); }
    let bestScore = 0, bestI = 0, bestJ = 0;
    for (let i = 1; i <= n; i++) {
      if (usedA[i - 1]) continue;
      for (let j = 1; j <= m; j++) {
        const diag = H[i - 1][j - 1] + score(aToks[i - 1], bToks[j - 1]);
        const up   = H[i - 1][j] + (traceback[i - 1][j] === 2 ? gapExtend : gapOpen);
        const left = H[i][j - 1] + (traceback[i][j - 1] === 3 ? gapExtend : gapOpen);
        let best = 0, tb = 0;
        if (diag > best) { best = diag; tb = 1; }
        if (up   > best) { best = up;   tb = 2; }
        if (left > best) { best = left; tb = 3; }
        H[i][j] = best;
        traceback[i][j] = tb;
        if (best > bestScore) { bestScore = best; bestI = i; bestJ = j; }
      }
    }
    if (bestScore < minScore) break;
    let i = bestI, j = bestJ;
    const aIdxs = [], bIdxs = [];
    const ops = [];
    while (i > 0 && j > 0 && H[i][j] > 0) {
      const tb = traceback[i][j];
      if (tb === 1) {
        const aTok = aToks[i - 1], bTok = bToks[j - 1];
        const kind = (aTok.surface === bTok.surface) ? 'match' : 'sub';
        ops.push({ type: kind, aIdx: i - 1, bIdx: j - 1 });
        aIdxs.push(i - 1); bIdxs.push(j - 1);
        i--; j--;
      } else if (tb === 2) { ops.push({ type: 'ins', aIdx: i - 1 }); i--; }
      else if (tb === 3)   { ops.push({ type: 'del', bIdx: j - 1 }); j--; }
      else break;
    }
    aIdxs.reverse(); bIdxs.reverse(); ops.reverse();
    if (aIdxs.length < minLen) break;
    for (const k of aIdxs) usedA[k] = 1;
    results.push({
      aStart: aIdxs[0], aEnd: aIdxs[aIdxs.length - 1],
      bStart: bIdxs[0], bEnd: bIdxs[bIdxs.length - 1],
      score: bestScore, length: aIdxs.length, ops
    });
  }
  return results;
}

// ── Bound-mode boundary extension (2026-08-15) ─────────────────────────
// When ≥ 70 % of the utterance already aligns to source, the user was
// almost certainly reading continuously and the unmatched leading /
// trailing tokens are Whisper misheard-openings, not free commentary.
// Extend the first match backward and the last match forward, pairing
// each extension step with the corresponding source token. Extension
// stops when EITHER the utterance OR the source runs out — the residual
// utterance tokens outside the extended range are then genuinely free.
//
// Extensions are added as synthetic 'sub' ops so the existing
// applySubstitutions renderer wraps them `{?source-word}` with no new
// rendering path. Also updates aStart/aEnd/bStart/bEnd/length in place
// so em-dash boundary logic in applySubstitutions still fires correctly
// (hasBefore / hasAfter checks use the extended boundaries).
//
// No manual override: auto-classify by match density only (user's 2026-
// 08-15 call: "auto is enough for now").
// No extension cap: read passages and free speech are short enough that
// walking all the way to the boundary is safe.
export function extendBoundaries(matches, uttToks, srcToks, opts = {}) {
  const { boundThreshold = 0.7 } = opts;
  if (!matches.length || !uttToks.length) return matches;
  const totalMatched = matches.reduce((sum, m) => sum + m.length, 0);
  const ratio = totalMatched / uttToks.length;
  if (ratio < boundThreshold) return matches;

  // Find first (smallest aStart) and last (largest aEnd). May be same match.
  let first = matches[0], last = matches[0];
  for (const m of matches) {
    if (m.aStart < first.aStart) first = m;
    if (m.aEnd   > last.aEnd)    last  = m;
  }

  // Extend backward from first match; stop when EITHER side runs out.
  while (first.aStart > 0 && first.bStart > 0) {
    const aIdx = first.aStart - 1;
    const bIdx = first.bStart - 1;
    first.ops.unshift({ type: 'sub', aIdx, bIdx });
    first.aStart = aIdx;
    first.bStart = bIdx;
    first.length++;
  }
  // Extend forward from last match; stop when EITHER side runs out.
  while (last.aEnd < uttToks.length - 1 && last.bEnd < srcToks.length - 1) {
    const aIdx = last.aEnd + 1;
    const bIdx = last.bEnd + 1;
    last.ops.push({ type: 'sub', aIdx, bIdx });
    last.aEnd = aIdx;
    last.bEnd = bIdx;
    last.length++;
  }
  return matches;
}

// ── Substitution renderer (alignment mode 4) ───────────────────────────
// Consume Smith-Waterman ops per matched span, produce a marked-up
// utterance string with `{?…}` around every stretch the reviewer should
// double-check. Nothing is ever deleted — the user hits Accept to strip
// markers when happy.
//
// Rules (settled 2026-08-13 for sr_editor; ported unchanged for BD):
//   sub  — Whisper misheard a source word. Substitute source form,
//          wrap `{?source}` — visible correction.
//   del  — Source has a word Whisper skipped. Insert `{?source}` at
//          the position after the previous matched utterance token.
//          Consecutive del ops group into one `{?word1 word2}`.
//   ins  — Whisper (or the reader) produced a word not in source.
//          Wrap `{?— extra —}` — em-dashes INSIDE the markers so that
//          when Accept strips `{?` and `}` the em-dashes remain as a
//          permanent literary aside marker. Consecutive ins ops group.
//   Text outside any matched span → left as-is. Em-dash separators are
//          inserted at the boundary between commentary and the aligned
//          quote; soft-sentence punctuation (. , ; :) at the boundary
//          is REPLACED with the em-dash to avoid ". — " doubling.
//
// Returns { text, subs } where subs is the per-edit log.
export function applySubstitutions(uttText, uttTokens, srcTokens, matches) {
  if (!matches.length) return { text: uttText, subs: [] };
  const edits = [];
  const SOFT_PUNCT_RE = /[.,;:]/;
  function findLastNonSpaceBeforePos(text, pos) {
    for (let i = pos - 1; i >= 0; i--) {
      if (!/\s/.test(text[i])) return { char: text[i], idx: i };
    }
    return null;
  }
  function findFirstNonSpaceFromPos(text, pos) {
    for (let i = pos; i < text.length; i++) {
      if (!/\s/.test(text[i])) return { char: text[i], idx: i };
    }
    return null;
  }
  for (const match of matches) {
    const hasBefore = match.aStart > 0;
    const hasAfter  = match.aEnd   < uttTokens.length - 1;
    if (hasBefore) {
      const pos  = uttTokens[match.aStart].start;
      const info = findLastNonSpaceBeforePos(uttText, pos);
      if (info) {
        if (SOFT_PUNCT_RE.test(info.char)) {
          edits.push({ start: info.idx, end: info.idx + 1, insert: ' —', kind: 'sep-before-repl', from: info.char, to: '—' });
        } else {
          edits.push({ start: pos, end: pos, insert: '— ', kind: 'sep-before', from: '', to: '—' });
        }
      }
    }
    if (hasAfter) {
      const pos  = uttTokens[match.aEnd].end;
      const info = findFirstNonSpaceFromPos(uttText, pos);
      if (info) {
        if (SOFT_PUNCT_RE.test(info.char)) {
          edits.push({ start: info.idx, end: info.idx + 1, insert: '— ', kind: 'sep-after-repl', from: info.char, to: '—' });
        } else {
          edits.push({ start: pos, end: pos, insert: ' —', kind: 'sep-after', from: '', to: '—' });
        }
      }
    }
  }
  for (const match of matches) {
    for (let opIdx = 0; opIdx < match.ops.length; opIdx++) {
      const op = match.ops[opIdx];
      if (op.type === 'sub') {
        const aTok = uttTokens[op.aIdx];
        const bTok = srcTokens[op.bIdx];
        edits.push({ start: aTok.start, end: aTok.end, insert: '{?' + bTok.surface + '}', kind: 'sub', from: aTok.surface, to: bTok.surface });
      } else if (op.type === 'ins') {
        const prev = opIdx > 0 ? match.ops[opIdx - 1] : null;
        if (prev && prev.type === 'ins') continue;
        let last = opIdx;
        while (last + 1 < match.ops.length && match.ops[last + 1].type === 'ins') last++;
        const firstTok = uttTokens[op.aIdx];
        const lastTok  = uttTokens[match.ops[last].aIdx];
        const original = uttText.slice(firstTok.start, lastTok.end);
        edits.push({ start: firstTok.start, end: lastTok.end, insert: '{?— ' + original + ' —}', kind: 'ins-wrap', from: original, to: '{?— ' + original + ' —}' });
      } else if (op.type === 'del') {
        const prev = opIdx > 0 ? match.ops[opIdx - 1] : null;
        if (prev && prev.type === 'del') continue;
        const bIdxs = [op.bIdx];
        let k = opIdx + 1;
        while (k < match.ops.length && match.ops[k].type === 'del') { bIdxs.push(match.ops[k].bIdx); k++; }
        const words = bIdxs.map(bi => srcTokens[bi].surface).join(' ');
        let anchorTok = null;
        for (let j = opIdx - 1; j >= 0; j--) {
          const p = match.ops[j];
          if (p.type === 'match' || p.type === 'sub') { anchorTok = uttTokens[p.aIdx]; break; }
        }
        const pos = anchorTok ? anchorTok.end : uttTokens[match.aStart].start;
        edits.push({ start: pos, end: pos, insert: ' {?' + words + '}', kind: 'del', from: '(missing)', to: words });
      }
    }
  }
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = uttText;
  for (const e of edits) out = out.slice(0, e.start) + e.insert + out.slice(e.end);
  return { text: out, subs: edits };
}

// Strip `{?…}` markers throughout a string. Em-dashes inside ins-wraps
// (`{?— word —}`) survive as permanent literary asides, per the design.
export function stripTentativeMarkers(text) {
  return (text || '').replace(/\{\?([^}]+)\}/g, '$1');
}

// ── Merge overlapping own-chunk outputs ────────────────────────────────
export function mergeChunkOutputs(parts) {
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0];
  const normWords = (s) => (s || '').toLowerCase()
    .replace(/[^\w\s']/g, ' ').split(/\s+/).filter(Boolean);
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const prev = normWords(out);
    const curr = normWords(parts[i]);
    let overlap = 0;
    const maxOverlap = Math.min(15, prev.length, curr.length);
    for (let n = maxOverlap; n >= 1; n--) {
      const prevTail = prev.slice(prev.length - n).join(' ');
      const currHead = curr.slice(0, n).join(' ');
      if (prevTail === currHead) { overlap = n; break; }
    }
    const currRaw = parts[i].trim().split(/\s+/);
    const tail    = currRaw.slice(overlap).join(' ');
    if (tail) out += ' ' + tail;
  }
  return out;
}

// ── Whisper engine ─────────────────────────────────────────────────────
// UI-agnostic wrapper. All UI feedback is via callbacks passed at
// creation time. Constructor mirrors sr_editor.html's WhisperEngine
// class 1:1 except:
//   - No direct DOM lookups. `setStatus` / `logEntry` replaced with
//     opts.onStatus / opts.onLog.
//   - `compressionOn` passed as opts instead of read from a checkbox.
//   - Bias-prompt building is the CALLER's job: pass the built prompt
//     text to engine.stop(bias) rather than have the engine reach
//     into DOM inputs. (BD's bias inputs are HistoryVisible + Current,
//     not two named textareas.)
//
// Lifecycle: install() → start() → stop(bias) → onFinal(text).

class WhisperEngine {
  constructor(opts = {}) {
    this.opts = opts;
    this.pipeline   = null;
    this.recorderNode = null;
    this.rawChunks    = [];
    this.recording    = false;
    this._workletRegistered = false;
    this.stream     = null;
    this.loading    = false;
    this.audioCtx   = null;
    this.analyser   = null;
    this.monitorSrc = null;
    this.rafId      = null;
    this.stats      = null;
  }
  _status(msg, kind) { try { this.opts.onStatus && this.opts.onStatus(msg, kind); } catch (_) {} }
  _log(msg, kind)    { try { this.opts.onLog    && this.opts.onLog(msg, kind);    } catch (_) {} }
  _err(err)          { try { this.opts.onError  && this.opts.onError(err);        } catch (_) {} }
  async available() {
    return this.pipeline ? 'available' : 'downloadable';
  }
  async install() {
    if (this.pipeline) return true;
    if (this.loading)  return false;
    this.loading = true;
    this._status('Loading Whisper base.en (~74 MB, one-time)…', '');
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');
      const { pipeline, env } = mod;
      env.allowLocalModels = false;
      env.useBrowserCache  = true;
      // Same WASM-only path as sr_editor.html — WebGPU is unshipped-quality
      // on iOS Safari 26 and its init crashes the tab. See [[sr-editor]].
      this.pipeline = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-base.en',
        { device: 'wasm' }
      );
      this._status('Whisper ready (WASM)', 'ok');
      this._log('Whisper loaded — WASM backend confirmed', 'info');
      return true;
    } catch (err) {
      console.error('Whisper install failed', err);
      this._status('Whisper load failed: ' + err.message, 'err');
      this._log('install error: ' + err.message, 'err');
      this._err(err);
      return false;
    } finally {
      this.loading = false;
    }
  }
  async start() {
    if (!this.pipeline) {
      const ok = await this.install();
      if (!ok) throw new Error('Whisper not available');
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
    } catch (err) {
      this._status('Microphone denied: ' + err.message, 'err');
      this._err(err);
      throw err;
    }
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new Ctx();
    }
    if (this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch (_) {}
    }
    if (!this._workletRegistered) {
      await this._registerRecordingWorklet();
      this._workletRegistered = true;
    }
    this.graphSource = this.audioCtx.createMediaStreamSource(this.stream);
    this.makeupGain  = this.audioCtx.createGain();
    this.makeupGain.gain.value = 1.0;
    const compressionOn = this.opts.compressionOn !== false;   // default ON
    this.compressor = null;
    if (compressionOn) {
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.value = -12;
      this.compressor.knee.value      = 6;
      this.compressor.ratio.value     = 4;
      this.compressor.attack.value    = 0.003;
      this.compressor.release.value   = 0.10;
      this.graphSource.connect(this.compressor);
      this.compressor.connect(this.makeupGain);
    } else {
      this.graphSource.connect(this.makeupGain);
    }
    this.rawChunks    = [];
    this.recorderNode = new AudioWorkletNode(this.audioCtx, 'pcm-recorder', { numberOfOutputs: 0 });
    this.recorderNode.port.onmessage = (e) => {
      if (e.data && e.data.length) this.rawChunks.push(e.data);
    };
    this.makeupGain.connect(this.recorderNode);
    this.recorderSampleRate = this.audioCtx.sampleRate;
    this._log(`recording start: compression=${compressionOn ? 'on' : 'off'} · srcRate=${this.recorderSampleRate}Hz · worklet=direct-PCM`, 'info');
    this._startMonitor();
    this.recording = true;
  }
  async _registerRecordingWorklet() {
    const code = `
      class PCMRecorder extends AudioWorkletProcessor {
        process(inputs) {
          const input = inputs[0];
          if (input && input.length > 0 && input[0]) {
            this.port.postMessage(new Float32Array(input[0]));
          }
          return true;
        }
      }
      registerProcessor('pcm-recorder', PCMRecorder);
    `;
    const blob = new Blob([code], { type: 'application/javascript' });
    const url  = URL.createObjectURL(blob);
    try { await this.audioCtx.audioWorklet.addModule(url); }
    finally { URL.revokeObjectURL(url); }
  }
  _disconnectGraph() {
    try { this.graphSource   && this.graphSource.disconnect(); }   catch (_) {}
    try { this.compressor    && this.compressor.disconnect(); }    catch (_) {}
    try { this.makeupGain    && this.makeupGain.disconnect(); }    catch (_) {}
    try { this.recorderNode  && this.recorderNode.disconnect(); }  catch (_) {}
    this.graphSource = this.compressor = this.makeupGain = this.recorderNode = null;
  }
  _startMonitor() {
    try {
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.1;
      this.makeupGain.connect(this.analyser);
      this.stats = {
        frames: 0, silentFrames: 0, clipFrames: 0,
        peakMax: 0, rmsSum: 0, startedAt: performance.now()
      };
      const buf = new Float32Array(this.analyser.fftSize);
      const CLIP_THRESHOLD = 0.99, SILENCE_THRESHOLD = 0.01;
      const loop = () => {
        if (!this.analyser) return;
        this.analyser.getFloatTimeDomainData(buf);
        let sumSq = 0, peak = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = buf[i];
          sumSq += v * v;
          const a = v < 0 ? -v : v;
          if (a > peak) peak = a;
        }
        const rms = Math.sqrt(sumSq / buf.length);
        this.stats.frames++;
        this.stats.rmsSum += rms;
        if (peak > this.stats.peakMax) this.stats.peakMax = peak;
        if (peak >= CLIP_THRESHOLD)     this.stats.clipFrames++;
        if (peak < SILENCE_THRESHOLD)   this.stats.silentFrames++;
        try { this.opts.onLevel && this.opts.onLevel(peak, rms); } catch (_) {}
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    } catch (err) {
      console.warn('audio monitor failed to start', err);
    }
  }
  _stopMonitor() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.analyser = null;
  }
  _finaliseReport() {
    const s = this.stats || {};
    const durSec = ((performance.now() - (s.startedAt || performance.now())) / 1000);
    const meanRms = s.frames ? (s.rmsSum / s.frames) : 0;
    const toDb = (v) => v > 0 ? 20 * Math.log10(v) : -Infinity;
    const peakDb  = toDb(s.peakMax || 0);
    const meanDb  = toDb(meanRms);
    const silentPct = s.frames ? (s.silentFrames / s.frames * 100) : 0;
    const clipPct   = s.frames ? (s.clipFrames   / s.frames * 100) : 0;
    let verdict = 'ok';
    const warnings = [];
    if (peakDb < -40) { verdict = 'bad';  warnings.push('very quiet — check mic permissions / distance'); }
    else if (peakDb < -25) { verdict = 'weak'; warnings.push('quiet — speak closer or louder'); }
    if (peakDb > -1)      { if (verdict === 'ok') verdict = 'hot'; warnings.push('very loud — samples on the edge of clipping'); }
    else if (peakDb > -3) { if (verdict === 'ok') verdict = 'hot'; warnings.push('loud — reduce mic gain for headroom'); }
    if (clipPct > 1)  { verdict = 'hot'; warnings.push(`${clipPct.toFixed(1)}% clipping — too loud / too close`); }
    if (silentPct > 90) { verdict = 'bad'; warnings.push('almost entirely silent'); }
    return { durSec, peakDb, meanDb, silentPct, clipPct, verdict, warnings };
  }
  // stop() receives a caller-built bias prompt (or null for no bias).
  // Caller is expected to have snapshotted the alignment source at start
  // time and now built the bias prompt from the appropriate BD text.
  async stop(biasPromptText = '') {
    if (!this.recording) return;
    this.recording = false;
    this._stopMonitor();
    const report = this._finaliseReport();
    try { this.opts.onQuality && this.opts.onQuality(report); } catch (_) {}
    const chunks = this.rawChunks || [];
    const srcRate = this.recorderSampleRate || (this.audioCtx && this.audioCtx.sampleRate) || 48000;
    this.rawChunks = [];
    this._disconnectGraph();
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    this._transcribeCapturedPCM(chunks, srcRate, biasPromptText).catch(err => {
      console.error('transcribe failed', err);
      this._status('Transcribe failed: ' + err.message, 'err');
      this._err(err);
    });
  }
  async _transcribeCapturedPCM(chunks, srcRate, biasPromptText) {
    if (!chunks.length) return;
    this._status('Transcribing…', '');
    try {
      let totalLen = 0;
      for (const c of chunks) totalLen += c.length;
      const combined = new Float32Array(totalLen);
      let off = 0;
      for (const c of chunks) { combined.set(c, off); off += c.length; }
      this._log(`captured ${chunks.length} PCM chunks · ${(combined.length / srcRate).toFixed(2)}s @ ${srcRate}Hz`, 'info');
      const audioData = await this._resamplePCMTo16k(combined, srcRate);

      const generate_kwargs = {};
      if (biasPromptText) {
        try {
          const promptIds = await this._tokenisePrompt(biasPromptText);
          if (promptIds && promptIds.length) {
            generate_kwargs.prompt_ids = promptIds;
            this._log(`bias: ${promptIds.length} tokens · "${biasPromptText.slice(0, 60).replace(/\s+/g, ' ')}${biasPromptText.length > 60 ? '…' : ''}"`, 'info');
          } else {
            this._log(`bias tokenise returned empty for ${biasPromptText.length}-char prompt`, 'err');
          }
        } catch (bpErr) {
          console.warn('bias prompt tokenise failed', bpErr);
          this._log('bias prompt error: ' + bpErr.message, 'err');
        }
      }

      const SR = 16000;
      const CHUNK_SEC = 25, OVERLAP_SEC = 3;
      const chunkSamples   = CHUNK_SEC   * SR;
      const overlapSamples = OVERLAP_SEC * SR;
      const stride         = chunkSamples - overlapSamples;
      const duration = audioData.length / SR;
      const t0 = performance.now();
      let text;

      if (duration <= CHUNK_SEC + 1) {
        const result = await this.pipeline(audioData, {
          return_timestamps: false, generate_kwargs
        });
        text = (result && result.text || '').trim();
      } else {
        const segs = [];
        for (let start = 0; start < audioData.length; start += stride) {
          const end = Math.min(start + chunkSamples, audioData.length);
          segs.push(audioData.subarray(start, end));
          if (end === audioData.length) break;
        }
        this._log(`own-chunk ${duration.toFixed(1)}s → ${segs.length} × ${CHUNK_SEC}s (overlap ${OVERLAP_SEC}s)`, 'info');
        const parts = [];
        for (let i = 0; i < segs.length; i++) {
          this._status(`Transcribing chunk ${i + 1}/${segs.length}…`, '');
          const r = await this.pipeline(segs[i], {
            return_timestamps: false, generate_kwargs
          });
          parts.push((r && r.text || '').trim());
        }
        text = mergeChunkOutputs(parts);
      }

      const dt = ((performance.now() - t0) / 1000).toFixed(1);
      this._status(`Transcribed in ${dt}s`, 'ok');
      this._log(`Whisper: "${text}" (${dt}s${generate_kwargs.prompt_ids ? ', biased' : ''})`, 'info');
      try { this.opts.onFinal && this.opts.onFinal(text, 1.0); } catch (_) {}
    } catch (err) {
      console.error('Whisper transcribe failed', err);
      this._status('Transcribe failed: ' + err.message, 'err');
      this._err(err);
    }
  }
  async _tokenisePrompt(text) {
    const tok = this.pipeline && this.pipeline.tokenizer;
    if (!tok) { this._log('bias tokenise: pipeline.tokenizer is undefined', 'err'); return null; }
    let ids = null;
    try {
      if (typeof tok === 'function' || typeof tok.__call__ === 'function') {
        const enc = await tok(' ' + text, { add_special_tokens: false });
        let raw = enc && (enc.input_ids || enc);
        if (raw && typeof raw.tolist === 'function') {
          const list = raw.tolist();
          ids = Array.isArray(list[0]) ? list[0] : list;
        } else if (raw && raw.data)   { ids = Array.from(raw.data); }
        else if (Array.isArray(raw))  { ids = raw; }
        else { this._log('bias tokenise: unrecognised enc shape · ' + typeof raw, 'err'); return null; }
      } else if (typeof tok.encode === 'function') {
        const enc = tok.encode(' ' + text);
        ids = Array.isArray(enc) ? enc : (enc?.tolist ? enc.tolist() : Array.from(enc));
      } else {
        this._log('bias tokenise: tokenizer has neither callable nor encode()', 'err');
        return null;
      }
    } catch (e) {
      console.warn('tokenizer call failed', e);
      this._log('bias tokenise threw: ' + e.message, 'err');
      return null;
    }
    if (!ids || !ids.length) { this._log('bias tokenise: got zero tokens', 'err'); return null; }
    const MAX_PROMPT_TOKENS = 200;
    if (ids.length > MAX_PROMPT_TOKENS) ids = ids.slice(0, MAX_PROMPT_TOKENS);
    return Array.from(ids, (v) => typeof v === 'bigint' ? Number(v) : Number(v));
  }
  async _resamplePCMTo16k(samples, srcRate) {
    const targetRate = 16000;
    if (srcRate === targetRate) return samples;
    const targetLen  = Math.ceil(samples.length * targetRate / srcRate);
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const offline = new OfflineCtx(1, targetLen, targetRate);
    const buffer = offline.createBuffer(1, samples.length, srcRate);
    buffer.copyToChannel(samples, 0);
    const src = offline.createBufferSource();
    src.buffer = buffer;
    src.connect(offline.destination);
    src.start(0);
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  }
}

export function createEngine(opts) { return new WhisperEngine(opts); }
