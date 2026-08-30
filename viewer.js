// viewer.js — ButterflyDreaming Graph Viewer

// 2026-08-15 — Speech-recognition module (Whisper + AudioWorklet + biasing).
// Ported from sr_editor.html; used in Edit mode. See sr_module.js.
import {
  createEngine       as createSREngine,
  buildBiasPrompt    as srBuildBiasPrompt,
  stripDirectiveBlocks as srStripDirectives,
  tokenise             as srTokenise,
  alignLocal           as srAlignLocal,
  extendBoundaries     as srExtendBoundaries,
  applySubstitutions   as srApplySubstitutions,
  stripTentativeMarkers as srStripTentative,
} from './sr_module.js';

// ── Client → server log forwarding (2026-07-12) ──────────────────────
// Copy every console.log/info/warn/error and uncaught error / unhandled
// promise rejection to the server terminal via Socket.IO, so we don't
// need to cable an iPhone to a Mac to open Web Inspector during dyad
// testing. DevTools still receives everything as normal — the wrapper
// calls the original console method first, then forwards.
let __clientLogSocket = null;
const __clientLogBuffer = [];
function __serialiseLogArg(a) {
  if (a instanceof Error) return `${a.name}: ${a.message}` + (a.stack ? '\n' + a.stack : '');
  if (typeof a === 'string') return a;
  try { return JSON.stringify(a); } catch { return String(a); }
}
function __forwardClientLog(level, args) {
  const line = args.map(__serialiseLogArg).join(' ');
  const rec = { type: 'client_log', level, line };
  if (__clientLogSocket && __clientLogSocket.connected) {
    try { __clientLogSocket.emit('msg', rec); } catch {}
  } else {
    __clientLogBuffer.push(rec);
    if (__clientLogBuffer.length > 500) __clientLogBuffer.shift();
  }
}
function attachClientLogSocket(ws) {
  __clientLogSocket = ws;
  while (__clientLogBuffer.length) {
    try { ws.emit('msg', __clientLogBuffer.shift()); } catch { break; }
  }
}
for (const level of ['log', 'info', 'warn', 'error']) {
  const orig = console[level].bind(console);
  console[level] = (...args) => {
    orig(...args);
    try { __forwardClientLog(level, args); } catch {}
  };
}
window.addEventListener('error', ev => {
  __forwardClientLog('error', [`Uncaught ${(ev.error && ev.error.stack) || ev.message}`]);
});
window.addEventListener('unhandledrejection', ev => {
  const r = ev.reason;
  __forwardClientLog('error', [`Unhandled rejection: ${(r && r.stack) || r}`]);
});

const DWELL_MS   = 200;   // ms before tooltip displays
const DWELL_FIRE = 300;   // ms before DWELL_MS to fire prefetch query

// Vertical top of main graph canvas — tooltips must not appear above this line
const BARS_BOTTOM = 80;  // title(~21) + bc-spacer(50) + a few px — breadcrumbs moved to bottom in A51; cy.top is now set dynamically and is the real ceiling for tooltips

const isTouchDevice = navigator.maxTouchPoints > 0;
let mediaFilesList = [];  // disk files from server, populated via WebSocket on connect
// Session-scoped audio tracks produced by media modules (e.g. bd_M_ABC bake-to-mp3).
// Each entry: { name, url (blob URL), sizeBytes }. Capped to last 5 — oldest URL
// revoked when a 6th arrives so memory doesn't grow unbounded across a long session.
let sessionTracksList = [];
const SESSION_TRACK_CAP = 5;
const helpText = isTouchDevice
  ? 'Tap to read — double tap to navigate.'
  : 'Click to read — double click to navigate.';

// 2026-08-27 — saturation CAPPED at 32 per cent; hue and lightness untouched.
//
// Designer feedback: the scheme reads as overbearing. These six are the root of
// it — every Cluster and TextNode colour is blended down from them by
// computeBlendedColours — so calming them calms the whole graph from one place.
//
// A CAP rather than a multiplier, because the six were never equally saturated.
// Symbolic sat at 54 and was doing most of the shouting; Spirit was already 19
// and a uniform cut would have pushed it toward grey. Capping takes the loud
// ones down and leaves the quiet ones alone — which also EVENS the palette, and
// that unevenness was probably part of what read as overbearing.
//
// Was: Nature #4A8C4F 31 · Emotion #C0504D 48 · Reason #4A7BC0 48
//      Spirit #9B6B9B 19 · Symbolic #C09A3A 54 · Arts #C47A5A 47
const FAMILY_COLOURS = {
  Nature:   '#4A8C4F',   /* 31, unchanged */
  Emotion:  '#AD6260',   /* was 48 */
  Reason:   '#5E7EAC',   /* was 48 */
  Spirit:   '#9B6B9B',   /* 19, unchanged */
  Symbolic: '#A58E55',   /* was 54 */
  Arts:     '#B3816B',   /* was 47 */
};

// 2026-08-25 — the local mark colour lives at MODULE scope because buildStyle
// needs it too: the reading-spine arrow and the successor's outline are the
// same signal as the selection ring and must not drift from it.
// 2026-08-27 — brightened from #8d7900 so the CURRENT node separates clearly
// from the PREVIOUS one, now that both are amber. Hue preserved exactly (51.5°)
// — the pair differ in luminance alone, which is the channel to rely on.
// 2026-08-29 — PALE amber, not the old dark gold #b79d00.
//
// The muddiness was compositing, not the colour. A halo at 0.5 opacity over a
// near-black canvas averages HALFWAY TO BLACK, so a dark gold arrived as
// #615408 — a 2.6:1 olive-brown, which is what read as depressing. The same
// opacity on a pale amber lands at #85724C, 4.2:1: still clearly amber, and
// bright enough to look deliberate.
//
// So the fix is a LIGHTER base, not a higher opacity — the low opacity is doing
// wanted work, keeping the local channel quiet enough for blue to sit beside it.
//
//   composited over the canvas   @0.85     @0.5      @0.3
//   old  #b79d00                 #9D8702   #615408   #3F370A
//   new  #FFD98A                 #DABA78   #85724C   #544934
//
// Paler still (#FFE7B0, #FFF0CC) lifts luminance further but drains the hue —
// at 0.3 they arrive as warm greys. This keeps the amber.
const MARK_LOCAL     = '#FFD98A';   // the node you have selected NOW
// The node you were on BEFORE this one. Same hue, well below MARK_LOCAL, so the
// pair reads as one signal at two depths rather than as two colours.
//
// Colour carries HISTORY and identity here (local / previous / remote / agreed);
// arrows and edges carry constructed relationships. Keeping those two channels
// apart is why the successor's amber border was removed.
const MARK_PREV      = '#6a5b00';

// 2026-08-29 — THE LOCAL HALO. Every node in your own view wears a bright-amber
// outline, and the OPACITY says how it stands to where you are: the node you are
// on, the one you came from, and the rest of your view.
//
// This is the amber third of the amber / blue / green state vocabulary the
// remote-graph work needs — "mine" as a property of the whole VIEW rather than
// of one node. It only becomes readable once the bodies are black, which is why
// the colour scheme had to come first.
//
// outline-* rather than border-*: an outline is stroked entirely OUTSIDE the
// shape, so it never eats into a tight label the way a border does, and it
// leaves border-* free for the ring vocabulary the marks already use.
//
// Extent and the three opacities are the whole tuning surface.
// 2026-08-29 — 5 -> 3. Every node in the view carries one of these, so the
// extent is paid on the whole screen rather than on a handful of marks, and the
// blue remote channel still has to fit beside it. Cheaper to be thin now than to
// discover the ceiling once two channels are drawing.
const LOCAL_HALO_W       = 3;      // px
// 2026-08-29 — TWO TIERS, not three. The predecessor is no longer signalled at
// all: with amber and blue both carrying a scale, three levels in two colours
// was six things to tell apart, and the middle one earned the least. What is
// left answers one question — is this the node you are on, or not.
//
// The rest rises 0.2 -> 0.5 as a consequence: it no longer has to leave room
// beneath a middle tier, so it can simply be visible.
const LOCAL_HALO_CURRENT = 0.85;   // the node you are on
const LOCAL_HALO_REST    = 0.5;    // everything else in your view

// 2026-08-29 — the REMOTE resting tier is separately settable, and quieter.
// The overlap covers a lot of nodes at once — every node you and your partner
// both happen to be looking at — so at the local value it reads as a second
// full-strength scheme competing with your own rather than as an annotation on
// it. Their CURRENT node keeps the same prominence as yours; it is the one
// piece of remote information worth as much as a local one.
const REMOTE_HALO_CURRENT = LOCAL_HALO_CURRENT;
const REMOTE_HALO_REST    = 0.3;

const EDGE_COLOURS = {
  CHILD:         '#4A8C4F',
  CONTAINS:      '#444444',
  DESCENDS_FROM: '#444444',
};

let editModeUnlocked      = false;
let editModeActive        = false;
let editSelectedClusterId  = null;
let editSelectedTextNodeId = null;
let chipGridParams         = null;
let chatModeActive         = true;   // 2026-07-15 — always on; chat panel is a permanent communication window. Kept as a variable for existing gates (routeNodeText, positionCyEl fallback, etc.); no longer toggled.

// 2026-07-23 — boot-helper sequence gate. RETIRED 2026-07-25 as part of
// the chunked-UX consolidation. Root's own text (via %%bd_chunk directives)
// now handles onboarding directly. The server-side queue is still in place
// but its call from enter_chat is commented out; this client flag was
// referenced by routeNodeText's Root-tap override and by the buddy_card
// receiver. Both branches now dead-simple since the flag is always false.
// See CHANGELOG 2026-07-25 for the retirement rationale.
// let bootHelperMoreAvailable = false;   // removed

// 2026-07-24 — one-gesture UX. Node text is split into chunks on lines that
// contain exactly `%%bd_chunk`; each single tap on the main canvas reveals
// the next chunk. Switching to a different node resets the sequence. Past
// the last chunk, the tap navigates into the node (or reshows the last
// chunk if the node has no descendants). Double-tap is retired.
//
// readingState = { nodeId, chunkIndex, chunks, hasDescendants } while a
// node's chunk sequence is being read. Cleared when the sequence completes
// (navigate) or when a different node is tapped (fresh sequence starts).
let readingState = null;

// 2026-08-16 — Unified Focus Model (see unified_focus_spec.md). When on, ONE
// tap on a non-Root node reveals its text card AND expands its neighbourhood
// together, instead of the tap-through-chunks-then-navigate rhythm. Root is
// always excluded — it runs the staged boot (message 0 → message 1 + Settling)
// regardless of this flag.
//
// Migration step 7 (2026-08-16) — now ON by default for everyone. Unified
// one-tap is behaviourally the same outputs the old two-tap flow produced
// (fresh tap's text card + past-last tap's navigateInto), collapsed into one
// tap with a single breadcrumb. Escape hatch: append ?uf=0 to fall back to
// the legacy tap-through-chunks-then-navigate behaviour if anything misbehaves.
const UNIFIED_FOCUS = (() => {
  try { return new URLSearchParams(location.search).get('uf') !== '0'; }
  catch (_) { return true; }
})();

// 2026-08-20 — Cluster-assign (the grey snake-section tap → cluster chips →
// editor bar flow) behind an internal flag, because this kind of curation work
// is moving out of BD into the curator tool.
//
// Default OFF. Only the author knows the curation code, so nobody else can
// reach the flow anyway, and with the code entered in several windows for
// pairing tests a grey-node tap would otherwise keep opening the assign
// layout. `?ca=1` turns it back on per window when the flow IS wanted —
// inverted from the `?uf=0` precedent because the default is inverted too.
//
// The machinery below it (applyEditTextSelection, the chip grid, the editor
// bar, the clone panel) is untouched and inert — this hides the entry, which
// keeps the flag cheap to reverse. Deleting it properly is a bigger job than
// removing the two `CLUSTER_ASSIGN` guards.
const CLUSTER_ASSIGN = (() => {
  try { return new URLSearchParams(location.search).get('ca') === '1'; }
  catch (_) { return false; }
})();

// The cluster-assign FLAVOUR of edit mode. Guarding the two tap handlers was
// not enough: handleTitlePageTap also branches on editModeActive to lay the
// snake tableau out dense-and-tiny with CLUSTER_REL highlighting — the "cluster
// tableau" that kept appearing on a grey title-node tap with the flag off.
// Everything else the Edit radio does (compose posture, Send/New, the mic) is
// untouched and still keys off editModeActive directly.
function clusterEditActive() { return CLUSTER_ASSIGN && editModeActive; }

const CHUNK_HINT_MORE     = 'Tap for next message from me.';
const CHUNK_HINT_NAVIGATE = 'Tap once more to see connected nodes.';
const CHUNK_HINT_NO_MORE  = 'There are not yet further descendants.';

function splitNodeChunks(text) {
  if (!text || typeof text !== 'string') return [];
  // Split on lines that are EXACTLY the marker (optional trailing whitespace).
  // Multiline flag needed; escape carefully. Empty chunks (marker at start/end
  // or double-marker) are filtered out.
  const parts = text.split(/^%%bd_chunk[ \t]*$/m).map(s => s.trim()).filter(s => s.length > 0);
  return parts.map(extractChunkHint);
}

// Pull the `%%bd_hint <text>` directive out of a chunk (if present) and
// return { body, hint }. The directive line is one-line: everything after
// `%%bd_hint ` up to end of line becomes the hint. Anywhere in the chunk;
// removed from the body when found. If absent, hint is null and the caller
// falls back to the default auto-hint (Tap for next / Tap once more / No
// further descendants).
function extractChunkHint(chunk) {
  // `%%bd_hint <text>` → hint = <text>
  // `%%bd_hint` (no body) → hint = '' (empty string, signals "suppress
  //   the auto-hint here" — used on content chunks like poem stanzas
  //   where the tap-hint would be misleading)
  // no directive       → hint = null (caller falls back to getChunkHint)
  const match = chunk.match(/^%%bd_hint(?:[ \t]+(.+))?[ \t]*$/m);
  if (!match) return { body: chunk.trim(), hint: null };
  const hint = match[1] ? match[1].trim() : '';
  const body = chunk.replace(match[0], '').replace(/\n{3,}/g, '\n\n').trim();
  return { body, hint };
}

// Does tapping through this node's last chunk lead to a meaningful expand?
//   Cluster        → has any CONTAINS_CLUSTER connection (gateway TextNode)
//   TextNode       → has any CHILD connection (further verses)
//   Root/Entry/Fam → has any DESCENDS_FROM or CONTAINS connection
// If false, the last chunk's hint says "no further descendants" and taps
// past it are silent no-ops.
//
// Direction-agnostic (`connectedEdges`, not `outgoers`) because the CF/SF
// replacement loops in the graph load path force edge source/target to a
// canonical side regardless of DB storage direction. E.g. for a SubFamily,
// ALL its DESCENDS_FROM edges come out as incoming (Cluster→SubFamily via
// CF, top-Family→SubFamily via SF) — `outgoers` would report zero and
// wrongly fire "no further descendants".
// 2026-08-27 — whether a tap should NAVIGATE, which is not the same question as
// whether the node has descendants.
//
// A Cluster with no gateways has no descendants, so the tap used to insert its
// text card and stop. That left it as the one node kind you could read without
// visiting: no expand, so no saveState, so no history entry, so nothing in the
// back stack and nothing on the PN control — the panel showed text that Back
// could not get you back to. The user found it precisely because the new corner
// control made the gap visible.
//
// Navigating is already the right thing and already implemented: expandToCluster
// shows the cluster's FAMILY PARENTS (and any gateways), so a childless cluster
// gets a view of what contains it. Upward instead of downward, which is the only
// direction left.
// 2026-08-27 — BREADCRUMB BARS RETIRED (corner_controls_plan.md §6).
//
// The user chose to sacrifice the bars' PARALLEL view of the trail — "Nature →
// Emotion → Loss" at a glance — for simplicity, and to reclaim the ~53px the two
// strips cost at the bottom of every screen. The three corner controls carry the
// same information one entry at a time, and they carry LABELS, which the chips
// could not fit.
//
// The code is KEPT WHOLE and merely not called, so the parallel view can come
// back by flipping this one constant if it turns out to be missed. Every entry
// point is gated at its top rather than at its call sites, because the call
// sites are many and scattered and a missed one would half-build a bar nobody
// can see.
//
// KNOWN LOSS, recorded in the plan: the remote strip's chips NAVIGATE, so it was
// the only route to a position your partner has already left. With it gone the
// BN is a live pointer with no history behind it anywhere. If that bites, the
// honest fix is to reconsider the BN stack, not to restore the strip.
const BREADCRUMB_BARS = false;

// The control panel's depth, and the canvas's distance from the bottom of the
// window. 46 is what the two retired strips occupied (23 + 23); 37 is where the
// local strip's bottom edge was, which is as far down as the canvas can go
// without touching #media-bar. Both are mirrored in style.css as fallbacks.
const TOP_PANEL_H = 50;
const CY_BOTTOM   = 37;

function navigatesOnTap(node, hasDesc) {
  return hasDesc || node.data('type') === 'Cluster';
}

function hasNavDescendants(node) {
  const type = node.data('type');
  if (type === 'Cluster') {
    return node.connectedEdges('[type="CONTAINS_CLUSTER"]').length > 0;
  }
  if (type === 'TextNode') {
    return node.connectedEdges('[type="CHILD"]').length > 0;
  }
  return node.connectedEdges('[type="DESCENDS_FROM"], edge[type="CONTAINS"]').length > 0;
}

// Inline colour-marker parser (2026-07-28). Curators can wrap short spans
// in `<<yellow>>…<</>>` or `<<bread>>…<</>>` inside node text to paint
// them the same colour as the UI element they refer to (Back button, local
// breadcrumb strip). Renders as safe span elements — no innerHTML — so
// arbitrary curator text can never inject markup.
//
// Extend by adding more names to HIGHLIGHT_ALLOWED + a CSS `.hi-<name>`
// rule. Unknown names are left as literal text so a typo is visible, not
// silently stripped.
const HIGHLIGHT_ALLOWED = new Set(['yellow', 'bread']);
const HIGHLIGHT_RE = /<<([a-z]+)>>([\s\S]*?)<<\/>>/g;
function renderTextWithHighlights(container, text) {
  if (!text) return;
  HIGHLIGHT_RE.lastIndex = 0;
  let cursor = 0;
  let m;
  while ((m = HIGHLIGHT_RE.exec(text)) !== null) {
    if (m.index > cursor) {
      container.appendChild(document.createTextNode(text.slice(cursor, m.index)));
    }
    const name = m[1];
    const inner = m[2];
    if (HIGHLIGHT_ALLOWED.has(name)) {
      const span = document.createElement('span');
      span.className = 'hi-' + name;
      span.textContent = inner;
      container.appendChild(span);
    } else {
      // Unknown colour name — surface it literally so the curator notices.
      container.appendChild(document.createTextNode(m[0]));
    }
    cursor = m.index + m[0].length;
  }
  if (cursor < text.length) {
    container.appendChild(document.createTextNode(text.slice(cursor)));
  }
}

function getChunkHint(isLast, hasDescendants, node) {
  if (!isLast) return CHUNK_HINT_MORE;
  if (hasDescendants) {
    // bd_V* TextNodes (visual-module preview nodes like bd_V_Kolam_1) get
    // a nudge toward the Player toggle since that's the whole point of
    // arriving here. The standard "Tap once more..." hint alone hides the
    // fact that a live module is waiting to be tried.
    if (node && node.data) {
      const type = node.data('type');
      const name = node.data('name') || '';
      if (type === 'TextNode' && name.startsWith('bd_V')) {
        return 'Try the Player (below right) or tap once more to see connected nodes.';
      }
    }
    return CHUNK_HINT_NAVIGATE;
  }
  return CHUNK_HINT_NO_MORE;
}
let chatStackEl            = null;    // #chat-stack — History panel (older cards)
let currentStackEl         = null;    // #current-stack — Current panel (single newest card); 2026-08-14 split

// 2026-08-14 — initial-root zoom-down factor. cy.fit on a single 76 px root
// in an ~800 px canvas zooms in aggressively (~5×) so root ends up filling
// half the viewport. We halve-plus-a-bit so root reads as a comfortable
// medium-sized node, not the visual focus of the whole page. Applied at both
// the initial (pre-boot-settled) fit and the authoritative post-rAF re-fit.
// Only affects the one-node initial view; multi-node fits (nav, back-button)
// land at a natural comfortable zoom without needing this clamp.
const ROOT_INITIAL_ZOOM_FACTOR = 0.7;
let cards                  = [];      // ordered bottom-up; cards[length-1] is the top
let nextCardSerial         = 1;     // unique id counter across all kinds
let nextLocalSerial        = 1;     // "Local (k)" label counter — only locals consume it
let defaultStackEl         = null;    // #default-stack — central system-message hub

// 2026-08-14 — promote whatever card is currently in #current-stack down to
// the top of #chat-stack (History). Called from createCard() before inserting
// a fresh card, and from enterNode() so a pure node-tap navigation also clears
// Current even when no new card follows. No-op if Current is empty.
function promoteCurrentToHistory() {
  if (!currentStackEl || !chatStackEl) return;
  const top = currentStackEl.firstElementChild;
  if (!top) return;
  chatStackEl.prepend(top);              // moves the DOM node atomically; keeps cards[] intact (cards[] tracks logical state, not DOM parent)
  chatStackEl.scrollTop = 0;             // freshly-arrived history card is what the eye expects to see
}

function createSystemCardEl(label) {
  const el = document.createElement('div');
  el.className = 'card system';
  const head = document.createElement('div');
  head.className = 'card-head';
  head.textContent = label || 'System';
  const body = document.createElement('div');
  body.className = 'card-body';
  body.contentEditable = 'false';
  el.append(head, body);
  return el;
}

// cy.fit() takes absolute pixel padding, which eats a much larger viewport
// fraction on phones than on desktop. Compute padding as a fraction of the
// smaller canvas dimension, with a floor (so things don't touch the edge) and
// a cap (so desktop doesn't waste space). Caller passes the original "ideal"
// padding as the cap.
function fitPadding(cy, maxPad) {
  // 2026-08-23 — fraction cut 0.08 -> 0.03, floor 20 -> 10.
  //
  // At 0.08 the padding was 14% of the width and 16% of the height on a phone,
  // which is the "about 15% of the area unused, horizontally AND vertically"
  // that was reported. Symmetric unused margin can only be padding: a correct
  // fit pegs one dimension at 100%, so slack on BOTH means the fit was never
  // given the room. Tightening the content cannot touch it.
  //
  // Now ~5% of width and ~6% of height on a phone, ~4/6% on desktop.
  //
  // Note `maxPad` is effectively dead and has been for some time — the
  // computed value is always smaller than the 40-120 callers pass, so it never
  // binds. Left in place rather than removed, because it is the only record of
  // what each caller INTENDED, and a future change to the fraction could make
  // it live again.
  const dim = Math.min(cy.width(), cy.height());
  return Math.max(10, Math.min(maxPad, dim * 0.03));
}

// ── Bot-context (bd_ai_read) helpers ─────────────────────────────────────────
// Curators author bot-only context in square brackets [ … ] inside nav-node
// text. On Save the bracket form is normalised to %%bd_ai_read [ … %%bd_] for
// storage (one-canonical-form, parseable). On render the inverse applies:
// curator view (#dev-code non-empty) un-normalises back to [ … ]; ordinary
// user view strips the directive entirely. bdbot reads the raw stored text
// straight from memgraph and bypasses this layer.
//
// Round-trip contract: content between [ and ] is placed VERBATIM between
// %%bd_ai_read [ and %%bd_]. No whitespace added or stripped. Known limitation
// — bracket content containing the literal substrings "[", "]", or "%%bd_]"
// is not supported.
function normalizeBotBlocks(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/\[([^\[\]]*)\]/g, '%%bd_ai_read [$1%%bd_]');
}
function unnormalizeBotBlocks(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/%%bd_ai_read \[([\s\S]*?)%%bd_\]/g, '[$1]');
}
function stripBotBlocks(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/%%bd_ai_read \[[\s\S]*?%%bd_\]/g, '');
}

function setSystemText(content, meta) {
  if (!defaultStackEl) return;
  let topEl = defaultStackEl.firstElementChild;
  if (!topEl) {
    topEl = createSystemCardEl();
    defaultStackEl.prepend(topEl);
  }
  const body = topEl.querySelector('.card-body');
  if (!body) return;

  // meta = { label, name } marks the card as a save-target for a navigation
  // node. The whole body is replaced (not appended) and becomes editable so
  // the user can rewrite the text before pressing Save.
  if (meta) {
    body.textContent = '';
    body.contentEditable = 'true';
    topEl.dataset.bdLabel = meta.label;
    topEl.dataset.bdName  = meta.name;
    // bot-context display fork (see bot_context.md §4.1): curator view
    // un-normalises %%bd_ai_read blocks back to [ … ]; ordinary user view
    // strips them entirely. Render-time evaluation against #dev-code per §4.3.
    const devCodeEl = document.getElementById('dev-code');
    const curatorView = !!(devCodeEl && devCodeEl.value.trim());
    const displayContent = curatorView
      ? unnormalizeBotBlocks(content)
      : stripBotBlocks(content);
    const block = document.createElement('div');
    block.className = 'system-insert';
    block.textContent = displayContent;
    body.appendChild(block);
    requestAnimationFrame(() => {
      body.scrollTop = 0;
      defaultStackEl.scrollTop = 0;
    });
    updateSaveButtonState();
    return;
  }

  // No meta — non-editable append (buddy chip tooltips, TextNode details, …).
  body.contentEditable = 'false';
  delete topEl.dataset.bdLabel;
  delete topEl.dataset.bdName;

  // Remove any prior trailing spacer before measuring / appending.
  const oldSpacer = body.querySelector('.system-spacer');
  if (oldSpacer) oldSpacer.remove();

  // Wrap each insert in a block <div> so its offsetTop / offsetHeight are
  // unambiguous (inline span.offsetTop returns the line box top, which can
  // be misleading) and so each insert starts on its own line.
  const block = document.createElement('div');
  block.className = 'system-insert';
  block.textContent = content;
  body.appendChild(block);

  // Trail with a spacer the FULL visible height so scrollHeight - clientHeight
  // is always >= block.offsetTop with slack to spare. With a "just enough"
  // spacer (= visibleH - insertHeight) the desired scrollTop lands exactly at
  // max and any sub-pixel rounding clamps it down, leaving short inserts at
  // the bottom of the panel.
  const spacer = document.createElement('div');
  spacer.className = 'system-spacer';
  spacer.style.height = body.clientHeight + 'px';
  body.appendChild(spacer);

  // Defer one frame so the spacer is fully laid out before we read offsetTop
  // and assign scrollTop — otherwise the assignment may use a stale, pre-
  // spacer scrollHeight and be clamped.
  requestAnimationFrame(() => {
    body.scrollTop = block.offsetTop;
    defaultStackEl.scrollTop = 0;
  });
  updateSaveButtonState();
}

// Forward declared — assigned inside setupInteractions once the dev-code
// element and save button are wired. Safe to call before assignment.
let updateSaveButtonState = () => {};

function hslDistance(hsl1, hsl2) {
  let dh = Math.abs(hsl1.h - hsl2.h);
  if (dh > 180) dh = 360 - dh;
  return (dh / 180) * 0.6 + Math.abs(hsl1.s - hsl2.s) * 0.2 + Math.abs(hsl1.l - hsl2.l) * 0.2;
}

function sortClustersByColour(clusters) {
  if (!clusters.length) return clusters;
  const byId = new Map(clusters.map(c => [c.id(), c]));
  const unvisited = new Set(clusters.map(c => c.id()));
  const result = [];
  let current = clusters[0];
  unvisited.delete(current.id());
  result.push(current);
  while (unvisited.size > 0) {
    let nearest = null, minDist = Infinity;
    for (const id of unvisited) {
      const dist = hslDistance(hexToHsl(current.data('colour')), hexToHsl(byId.get(id).data('colour')));
      if (dist < minDist) { minDist = dist; nearest = byId.get(id); }
    }
    unvisited.delete(nearest.id());
    result.push(nearest);
    current = nearest;
  }
  return result;
}

// --- RGB nearest-neighbour sort (alternative to HSL above) ---
// Cosine similarity: dot product of unit-length RGB vectors (range 0–1, higher = more similar).
// Normalising removes the effect of brightness so only the direction (hue/saturation ratio)
// determines the score. Black (magnitude 0) returns 0 against everything.

function rgbDotProduct(hex1, hex2) {
  function toRgb(h) {
    h = h.replace('#', '');
    return { r: parseInt(h.slice(0,2),16)/255, g: parseInt(h.slice(2,4),16)/255, b: parseInt(h.slice(4,6),16)/255 };
  }
  const a = toRgb(hex1), b = toRgb(hex2);
  const magA = Math.sqrt(a.r*a.r + a.g*a.g + a.b*a.b);
  const magB = Math.sqrt(b.r*b.r + b.g*b.g + b.b*b.b);
  if (magA === 0 || magB === 0) return 0;
  return (a.r*b.r + a.g*b.g + a.b*b.b) / (magA * magB);
}

function sortClustersByRgb(clusters, startCluster) {
  if (!clusters.length) return clusters;
  const byId = new Map(clusters.map(c => [c.id(), c]));

  function greedyChain(start) {
    const unvisited = new Set(clusters.map(c => c.id()));
    const chain = [];
    let cur = start;
    unvisited.delete(cur.id());
    chain.push(cur);
    while (unvisited.size > 0) {
      let nearest = null, maxDot = -Infinity;
      for (const id of unvisited) {
        const dot = rgbDotProduct(cur.data('colour'), byId.get(id).data('colour'));
        if (dot > maxDot) { maxDot = dot; nearest = byId.get(id); }
      }
      unvisited.delete(nearest.id());
      chain.push(nearest);
      cur = nearest;
    }
    return chain;
  }

  function chainScore(chain) {
    let s = 0;
    for (let i = 0; i < chain.length - 1; i++)
      s += rgbDotProduct(chain[i].data('colour'), chain[i+1].data('colour'));
    // Close the loop so we score a cycle, not a path
    s += rgbDotProduct(chain[chain.length-1].data('colour'), chain[0].data('colour'));
    return s;
  }

  // Try every starting cluster, keep the highest-scoring chain
  let best = null, bestScore = -Infinity;
  for (const c of clusters) {
    const chain = greedyChain(c);
    const score = chainScore(chain);
    if (score > bestScore) { bestScore = score; best = chain; }
  }

  // Rotate so startCluster appears first
  if (startCluster && byId.has(startCluster.id())) {
    const idx = best.findIndex(c => c.id() === startCluster.id());
    if (idx > 0) best = [...best.slice(idx), ...best.slice(0, idx)];
  }

  return best;
}

// --- Helpers ---

function desaturate(hex, amount) {
  amount = (amount !== undefined) ? amount : 0.45;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0, h = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const ns = s * (1 - amount);
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  let nr, ng, nb;
  if (ns === 0) {
    nr = ng = nb = l;
  } else {
    const q = l < 0.5 ? l * (1 + ns) : l + ns - l * ns;
    const p = 2 * l - q;
    nr = hue2rgb(p, q, h + 1 / 3);
    ng = hue2rgb(p, q, h);
    nb = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return '#' + toHex(nr) + toHex(ng) + toHex(nb);
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToHex(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255).toString(16).padStart(2, '0');
    return `#${v}${v}${v}`;
  }
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
  h /= 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return '#' + toHex(hue2rgb(p, q, h + 1/3)) + toHex(hue2rgb(p, q, h)) + toHex(hue2rgb(p, q, h - 1/3));
}

function blendColours(parents) {
  // parents: [{ hex, weight }] — weights normalised to sum 1.0
  // Hue: weighted circular mean via sin/cos vectors
  // Saturation scaled by vector magnitude — opposing hues reduce toward grey
  // rather than tipping randomly to one side of the colour wheel
  let sinSum = 0, cosSum = 0, sSum = 0, lSum = 0;
  parents.forEach(p => {
    const hsl = hexToHsl(p.hex);
    const hRad = hsl.h * Math.PI / 180;
    sinSum += p.weight * Math.sin(hRad);
    cosSum += p.weight * Math.cos(hRad);
    sSum   += p.weight * hsl.s;
    lSum   += p.weight * hsl.l;
  });
  const magnitude = Math.sqrt(sinSum * sinSum + cosSum * cosSum);
  let h = Math.atan2(sinSum, cosSum) * 180 / Math.PI;
  if (h < 0) h += 360;
  return hslToHex(h, sSum * magnitude, lSum);
}

function computeBlendedColours(cy) {
  // SubFamily nodes: Family nodes whose name is NOT in the top-level FAMILY_COLOURS palette.
  // Top-level Family nodes are identified by FAMILY_COLOURS[name] — they are never blended,
  // regardless of what DESCENDS_FROM edges exist (DB direction for SubFamily edges may vary).
  cy.nodes('[type="Family"]').forEach(node => {
    if (FAMILY_COLOURS[node.data('name')]) return; // top-level Family — preserve its colour

    // Use direction-agnostic connected-edge lookup so DB edge direction doesn't matter
    const descEdges = node.connectedEdges('[type="DESCENDS_FROM"]');
    const parents = descEdges.connectedNodes().filter(p =>
      p.data('type') === 'Family' && FAMILY_COLOURS[p.data('name')]
    );
    if (parents.length === 0) return;

    node.addClass('subfamily');

    const rawInputs = parents.map(p => {
      const edge = descEdges.filter(e =>
        e.source().id() === p.id() || e.target().id() === p.id()
      ).first();
      return { hex: p.data('colour'), weight: edge.data('weight') || 1 };
    });
    const total = rawInputs.reduce((s, p) => s + p.weight, 0);
    const blendInputs = rawInputs.map(p => ({ ...p, weight: p.weight / total }));
    const colour = blendColours(blendInputs);
    node.data('colour', colour);
    node.data('blendedColour', colour);
    // 2026-08-29 — how much single-family identity survives the blend. Recorded
    // HERE because this is the only place that knows the parentage; a colour on
    // its own cannot tell a six-way blend from a family that happens to be
    // muted, which is exactly the mistake that made Spirit dim.
    // 1/sqrt(n): two parents keep most of their identity, six keep little.
    node.data('inkPurity', 1 / Math.sqrt(parents.length));
  });

  // Bud/Cluster nodes — direction-agnostic lookup for parent Family nodes
  cy.nodes('[type="Cluster"]').forEach(node => {
    const descEdges = node.connectedEdges('[type="DESCENDS_FROM"]');
    const parents = descEdges.connectedNodes().filter(p => p.data('type') === 'Family');
    if (parents.length === 0) return;

    const rawInputs = parents.map(p => {
      const edge = descEdges.filter(e =>
        e.source().id() === p.id() || e.target().id() === p.id()
      ).first();
      return { hex: p.data('colour'), weight: edge.data('weight') || 1 };
    });
    const total = rawInputs.reduce((s, p) => s + p.weight, 0);
    const blendInputs = rawInputs.map(p => ({ ...p, weight: p.weight / total }));
    const colour = blendColours(blendInputs);
    node.data('colour', colour);
    node.data('blendedColour', colour);
    // Purity CASCADES: a cluster hanging off one sub-family is no purer than
    // that sub-family. Seasons/Cycles has a single parent, Living World, which
    // is itself a four-way blend — which is why it read as a strong colour.
    const pp = parents.map(p => (typeof p.data('inkPurity') === 'number' ? p.data('inkPurity') : 1));
    node.data('inkPurity', (pp.reduce((s, x) => s + x, 0) / pp.length) / Math.sqrt(parents.length));
  });

  // Colour DESCENDS_FROM edges — find the top-level Family endpoint (direction-agnostic)
  cy.edges('[type="DESCENDS_FROM"]').forEach(edge => {
    const src = edge.source(), tgt = edge.target();
    const topFamily = FAMILY_COLOURS[src.data('name')] ? src
                    : FAMILY_COLOURS[tgt.data('name')] ? tgt
                    : (src.data('type') === 'Family' ? src : tgt);
    const parentColour = topFamily.data('colour') || '#444444';
    edge.style('line-color', parentColour);
  });

  // Colour CLUSTER_REL edges from their target Cluster's blended colour
  cy.edges('[type="CLUSTER_REL"]').forEach(edge => {
    const cluster = edge.target();
    const colour = cluster.data('blendedColour') || cluster.data('colour') || '#666666';
    edge.data('colour', colour);
  });

}

function toPlain(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && typeof val.toNumber === 'function') return val.toNumber();
  if (typeof val === 'object' && val.constructor &&
      ['DateTime', 'LocalDateTime', 'Date', 'Time', 'LocalTime', 'Duration'].includes(val.constructor.name)) {
    return val.toString();
  }
  return val;
}

function getElementId(entity) {
  return (entity.elementId !== undefined) ? entity.elementId : entity.identity.toString();
}

// stable_id_spec.md — the cytoscape id for a NODE is its durable `url`, a UUID
// property written once at creation and identical in every client, forever.
//
// getElementId() is Memgraph's own handle: not stored, and documented in this
// file as returning DIFFERENT values for the same Cluster or Family in
// different query contexts. That instability is what forced the name-based
// dedup (now deleted) and what let a partner's crumb point at nothing.
//
// The rule for this pass: no site may mint a NODE id from getElementId. It
// remains correct for EDGES, whose ids never cross clients.
// The fallback is defensive only — every labelled node has a url (verified:
// 393 of 393, all distinct).
function nodeId(entity) {
  const url = entity && entity.properties && entity.properties.url;
  return (typeof url === 'string' && url) ? url : getElementId(entity);
}

function flattenProps(props) {
  const out = {};
  for (const k in props) out[k] = toPlain(props[k]);
  return out;
}

// --- MM1.6 (2026-07-05) Media-module registry ---
// Maps the `%%bd_module <id>` identifier to the iframe URL. Identifier and
// URL are decoupled deliberately — the identifier is the user-facing name
// (bd_V_Kolam), the URL is an implementation detail (/bd_V_Kolam/index.html
// after the 2026-07-05 full URL rename — path was /visual1/ before).
// Module registry (2026-08-05 v16) — consolidated from separate
// MODULE_REGISTRY + hardcoded standaloneBaseUrl into one object with both
// URLs per module. Keys match the `%%bd_module <id>` directive. Values:
//   embedded   — served under BD (iframe src for Player mode)
//   standalone — external stand-alone player (target for "Copy Link to")
// Extendable in-place; when this grows past ~5 modules consider promoting
// to a JSON manifest served from /api/modules.
const MODULES = {
  'bd_V_Kolam': {
    embedded:   '/bd_V_Kolam/index.html',
    standalone: 'https://wrcstewart.github.io/bd_V_Kolam/preview.html',
  },
  'bd_M_ABC': {
    embedded:   '/bd_M_ABC/index.html',
    standalone: 'https://wrcstewart.github.io/bd_M_ABC/preview.html',
  },
  'bd_M_Fractal': {
    embedded:   '/bd_M_Fractal/index.html',
    standalone: 'https://wrcstewart.github.io/bd_M_Fractal/preview.html',
  },
};

function getModuleUrl(moduleId) {
  return (MODULES[moduleId] && MODULES[moduleId].embedded) || null;
}

function getStandaloneUrl(moduleId) {
  return (MODULES[moduleId] && MODULES[moduleId].standalone) || null;
}

// Extract the module identifier from a node's text: first line matching
// `%%bd_module <id>` wins. Returns null when no such line is present
// (i.e., not a media node) or on non-string input.
function parseModuleId(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(/^%%bd_module\s+(\S+)/m);
  return match ? match[1] : null;
}

// 2026-07-17 — extract the MOST RECENT module-script from a card's
// accumulated text. Chat cards can gather many node-taps + prose;
// only the module block belongs in a deep-link URL, the rest is
// prior browsing noise.
//
// Algorithm — line-walk from the LAST `%%bd_module <id>` line, no
// paragraph-boundary requirement:
//   1. Find the last line matching `%%bd_module <id>`.
//   2. From that line forward, keep every line while:
//        - It starts with `%%bd_` (any directive), OR
//        - We're inside a `%%bd_score [ … %%bd_]` block (blank lines
//          allowed; block closes on the `%%bd_]` line).
//   3. Stop at the first line that's neither a `%%bd_` directive nor
//      inside an open score block. That line marks non-module text.
// The module's own syntax is the boundary — no need for a blank line
// above the %%bd_module marker.
function extractLatestModuleScript(text) {
  if (typeof text !== 'string' || !text.includes('%%bd_module')) return null;
  const lines = text.split('\n');
  let startIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^%%bd_module\s+\S+/.test(lines[i])) { startIdx = i; break; }
  }
  if (startIdx < 0) return null;
  const out = [];
  let inScoreBlock = false;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (inScoreBlock) {
      out.push(line);
      if (/^%%bd_\]/.test(line)) inScoreBlock = false;
      continue;
    }
    if (/^%%bd_score\s*\[/.test(line)) { out.push(line); inScoreBlock = true; continue; }
    if (/^%%bd_/.test(line))           { out.push(line);                      continue; }
    break;   // non-directive line + not inside a score → module block ends here
  }
  return out.join('\n').trim();
}

// --- Neo4j → Cytoscape element builders ---

function shortText(text, wordCount) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  return words.length <= wordCount
    ? words.join(' ')
    : words.slice(0, wordCount).join(' ') + '…';
}

// TextNode label priority (2026-07-04):
//   0. Gateway TextNodes (work "title cards") — return source_text (the work
//      name) directly. Structural exception, kept unchanged.
//   1. seq AND title both present → "seq: title" (numbered verses / sections).
//   2. name present → name. Wins over source_text so Kolam_1 shows as
//      "Kolam_1" instead of its parent work ("Visual Tests").
//   3. source_text present → first 4 words of source_text.
//   4. Fallback → first 4 words of text.
function getTextNodeLabel(props) {
  if (props.gateway) return props.source_text || shortText(props.text, 4);
  if (props.seq !== undefined && props.seq !== null && props.title) {
    return `${props.seq}: ${props.title}`;
  }
  if (props.name) return props.name;
  if (props.source_text) return shortText(props.source_text, 4);
  return shortText(props.text, 4);
}

function buildNodeData(n) {
  const labels = n.labels || [];
  const props = flattenProps(n.properties || {});
  const id = nodeId(n);

  if (labels.includes('Family')) {
    const familyColour = FAMILY_COLOURS[props.name] || '#aaaaaa';
    return Object.assign({}, props, {
      id, type: 'Family',
      display_name: props.name || '',
      colour: familyColour,
      hex: familyColour,
    });
  }
  if (labels.includes('Cluster')) {
    return Object.assign({}, props, {
      id, type: 'Cluster',
      display_name: props.display_name || props.name || '',
      colour: '#666666',
    });
  }
  if (labels.includes('TextNode')) {
    return Object.assign({}, props, {
      id, type: 'TextNode',
      display_name: getTextNodeLabel(props),
      colour: '#111111',
    });
  }
  if (labels.includes('Entry')) {
    return Object.assign({}, props, {
      id, type: 'Entry',
      display_name: props.name || '',
      colour: props.colour || '#888888',
    });
  }
  if (labels.includes('Root')) {
    return Object.assign({}, props, {
      id, type: 'root',
      display_name: props.name || 'ButterflyDreaming',
      colour: '#FFD700',
    });
  }
  return Object.assign({}, props, { id, type: 'Unknown', display_name: '', colour: '#555555' });
}

function buildEdgeData(r, n, m) {
  const type = r.type;
  const props = flattenProps(r.properties || {});
  // Neo4j props first — Cytoscape-required fields override last.
  // Necessary because CHILD relationships have a 'source' property ('sequence'/'dyad'/etc.)
  // that would otherwise overwrite the source node ID.
  return Object.assign({}, props, {
    id: getElementId(r),
    raw_rel_id: getElementId(r),  // preserved after ed.id is overwritten with cf_/sf_/r_ prefix
    // Endpoints are NODE references, so they take node ids. The edge's own id
    // stays elementId-based — edge ids never cross clients.
    source: nodeId(n),
    target: nodeId(m),
    // 2026-08-16 — endpoint names carried on the edge so stylesheet selectors
    // can single out specific hops (e.g. the faint Gateways nav-aid edge)
    // without a post-load tagging pass. Cytoscape selectors can't reach into
    // an edge's endpoint node data, so we denormalise the names here.
    source_name: (n.properties && n.properties.name) || '',
    target_name: (m.properties && m.properties.name) || '',
    rel_source: props.source,  // preserve Neo4j 'source' prop ('seed'/'dyad') before Cytoscape overwrites it
    type,
    colour: EDGE_COLOURS[type] || '#666666',
  });
}

function getClusterRelWidth(edge) {
  const w = Math.max(
    edge.data('tagged_as')      || 0,
    edge.data('resonates_with') || 0,
    edge.data('bridges_to')     || 0,
    edge.data('echoes')         || 0,
    edge.data('gives')          || 0
  );
  return Math.max(1.0, w * 2.5);
}

// 2026-08-28 — INK MODE, an experiment on the `remote-graph-view` branch.
// Off by default; turn on with ?ink=1.
//
// WHY, and it is not a tidy-up. Colour currently encodes CONTENT — which family
// a node belongs to — and the plan for showing your partner's whole graph needs
// colour to encode STATE: yours, theirs, shared. One channel cannot carry both,
// and the halos already compete with the fills on a busy screen.
//
// So: every node body goes BLACK and the identity moves to the LABEL. That
// frees the fill and the outline for state, which is the precondition for the
// remote-graph idea rather than a separate cosmetic change.
const INK_MODE = new URLSearchParams(location.search).get('ink') === '1';
const INK_BG   = '#0b0b0f';

// 2026-08-29 — the bodies are TRANSPARENT, not black.
//
// Painting them black made every node an occluder: an overlapping neighbour was
// simply hidden, and dense cluster views lose nodes to each other routinely.
// With no fill the labels and halos show through one another, so an overlap
// costs legibility rather than costing a node.
//
// background-opacity, not opacity — the latter would take the label and the
// halo with it, and would stop the node receiving taps. This one only affects
// the fill, so a transparent node is still fully hittable across its shape.
//
// Raise it if the bodies turn out to be wanted as a faint ground; INK_BG is
// still the colour they would be painted in.
const INK_BODY_OPACITY = 0;

// 2026-08-28 — the LABEL palette, "swatch B", chosen from ink_palette_swatch.html.
//
// The first attempt normalised every family to one HSL lightness, reasoning that
// this made them all equally legible. It did — and equally legible turned out to
// mean equally INDISTINGUISHABLE. The user could not separate Nature from
// Symbolic, and the numbers said why: 9% apart in luminance, with Reason and
// Spirit 1% apart. For a reading that does not lean on hue, that removes the
// only channel that works.
//
// So luminance is now ASSIGNED, in even steps of roughly 1.2x-1.4x, with the
// widest separation given to the four hues in the red-green confusable band
// (red, orange, gold, green). Hues are untouched: same palette, re-spaced.
//
//   Symbolic  14.2:1      Nature   7.6:1
//   Spirit    11.5:1      Reason   6.0:1
//   Arts       9.6:1      Emotion  4.5:1
//
// Driven by HUE rather than by family name, which is the part that matters:
// cluster colours are BLENDS computed at load time from FAMILY_COLOURS, so a
// six-entry table would have fixed the six families and left all 126 clusters
// on the old flat lightness — the great majority of what is on screen. A blend
// lands between its neighbours' targets, so the spread holds across the corpus.
//
// The trade, stated rather than hidden: reaching a high luminance forces
// desaturation, so the top two are pastel. That is why swatch B puts the deep
// saturated green at 7.6 and not at the top.
const INK_BG_LUM = 0.0045;                 // relative luminance of INK_BG

// [hue°, target contrast against INK_BG]. Sorted by hue; the curve wraps.
const INK_ANCHORS = [[2, 4.5], [18, 9.6], [43, 14.2], [125, 7.6], [215, 6.0], [300, 11.5]];
const INK_SATS    = [0.75, 0.68, 0.60, 0.52, 0.45];   // tried in order; first that reaches the target wins

// 2026-08-29 — PURITY. The user noticed that sub-families inheriting from five
// or six families came out brighter than a pure family — Symbolic Action, a
// six-way blend, was reaching 9.9:1 against Nature's 7.7:1.
//
// The cause was that inkify forced EVERY colour to the same saturation and took
// its luminance from hue alone. A six-family blend is 9% saturated — very nearly
// grey — so its hue is residual noise, and pushing it to 75% invented a strong
// identity that the node does not have.
//
// That low saturation is INFORMATION: it means "belongs to many families". So
// both saturation and target luminance are now scaled by how PURE the source
// colour is. A single family is unchanged; a heavily blended one recedes toward
// a quiet neutral instead of shouting on an arbitrary hue.
//
// The gradient is the point — a two-family blend keeps most of its identity, a
// six-family one keeps almost none, which is exactly what those numbers mean.
// Purity arrives from the node (data('inkPurity')), computed where the blend is,
// because a colour alone cannot distinguish a six-way blend from a family that
// happens to be muted — Spirit is only 19% saturated and was wrongly dimmed by a
// saturation-based guess.
const INK_NEUTRAL_C   = 4.0;    // contrast a fully-blended colour lands at
const INK_NEUTRAL_SAT = 0.10;   // and its saturation
const _inkCache   = new Map();

function _srgbToLin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function _lumOf(r, g, b) { return 0.2126 * _srgbToLin(r * 255) + 0.7152 * _srgbToLin(g * 255) + 0.0722 * _srgbToLin(b * 255); }
function _hslToRgb(h, l, s) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = tt => {
    if (tt < 0) tt += 1; if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
function _targetContrast(hueDeg) {
  const a = INK_ANCHORS;
  if (hueDeg < a[0][0]) {                       // wrap: below the first anchor
    const span = 360 - a[a.length - 1][0] + a[0][0];
    const tpos = (hueDeg + 360 - a[a.length - 1][0]) / span;
    return a[a.length - 1][1] + (a[0][1] - a[a.length - 1][1]) * tpos;
  }
  for (let i = 0; i < a.length - 1; i++) {
    if (hueDeg >= a[i][0] && hueDeg <= a[i + 1][0]) {
      const tpos = (hueDeg - a[i][0]) / (a[i + 1][0] - a[i][0]);
      return a[i][1] + (a[i + 1][1] - a[i][1]) * tpos;
    }
  }
  const span = 360 - a[a.length - 1][0] + a[0][0];
  const tpos = (hueDeg - a[a.length - 1][0]) / span;
  return a[a.length - 1][1] + (a[0][1] - a[a.length - 1][1]) * tpos;
}
function inkify(hex, purity) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return '#c8c8cc';
  const pur = Math.max(0, Math.min(1, typeof purity === 'number' ? purity : 1));
  const key = m[1].toLowerCase() + '@' + pur.toFixed(3);
  if (_inkCache.has(key)) return _inkCache.get(key);

  const v = parseInt(key, 16);
  const r = ((v >> 16) & 255) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if      (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else                h = ((r - g) / d + 4) / 6;
  }
  const wantC  = INK_NEUTRAL_C   + (_targetContrast(h * 360) - INK_NEUTRAL_C)   * pur;
  const satTop = INK_NEUTRAL_SAT + (INK_SATS[0]              - INK_NEUTRAL_SAT) * pur;
  const targetLum = wantC * (INK_BG_LUM + 0.05) - 0.05;

  // Solve lightness for that luminance, most saturated first. Twenty halvings
  // is exact to well under one 8-bit step.
  let best = null;
  for (const s of INK_SATS.map(x => Math.min(x, satTop))) {
    let lo = 0, hi = 1, mid = 0.5;
    for (let k = 0; k < 20; k++) {
      mid = (lo + hi) / 2;
      const [rr, gg, bb] = _hslToRgb(h, mid, s);
      if (_lumOf(rr, gg, bb) < targetLum) lo = mid; else hi = mid;
    }
    const [rr, gg, bb] = _hslToRgb(h, (lo + hi) / 2, s);
    const got = (_lumOf(rr, gg, bb) + 0.05) / (INK_BG_LUM + 0.05);
    if (best === null) best = [rr, gg, bb];
    if (Math.abs(got - wantC) / wantC < 0.06) { best = [rr, gg, bb]; break; }
  }
  const to = x => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0');
  const out = '#' + to(best[0]) + to(best[1]) + to(best[2]);
  _inkCache.set(key, out);
  return out;
}

function inkModeOverrides() {
  return [
    {
      // Body black, identity moved to the label.
      selector: 'node',
      style: {
        'background-color': INK_BG,
        'background-opacity': INK_BODY_OPACITY,
        'color': function(node) { return inkify(node.data('colour'), node.data('inkPurity')); },
      }
    },
    {
      // Family colours are computed, not stored — same source the fill used.
      selector: 'node[type="Family"]',
      style: {
        'background-color': INK_BG,
        'background-opacity': INK_BODY_OPACITY,
        'color': function(node) {
          // A top-level family is pure by definition; a sub-family carries the
          // purity recorded when its colour was blended.
          const own = FAMILY_COLOURS[node.data('name')];
          return own ? inkify(own, 1) : inkify(node.data('colour') || '#aaaaaa', node.data('inkPurity'));
        },
      }
    },
    // Text nodes read as body text rather than as category: light grey. They are
    // the great majority of nodes, so this is what decides whether the scheme
    // reads calm or noisy.
    { selector: 'node[type="TextNode"]',                 style: { 'color': '#c8c8cc' } },
    { selector: 'node[type="TextNode"][?section_title]', style: { 'color': '#e6e6ea', 'background-opacity': INK_BODY_OPACITY } },
    // These three set their own opaque fills in the base sheet (white, gold,
    // white), which would survive the rule above and go on occluding. Cleared
    // explicitly rather than relying on the generic node rule.
    { selector: 'node[type="TextNode"][?gateway]',       style: { 'color': '#ffffff', 'background-opacity': INK_BODY_OPACITY } },
    // These carried literal fills rather than data(colour), so the old fill
    // becomes the label colour and their identity survives the change.
    { selector: 'node[type="root"]',                     style: { 'color': '#FFD700', 'background-opacity': INK_BODY_OPACITY } },
    { selector: 'node[type="Entry"][name="Gateways"]',   style: { 'color': '#ffffff', 'background-opacity': INK_BODY_OPACITY } },
    { selector: 'node[type="Cluster"]', style: { 'color': function(node) { return inkify(node.data('colour'), node.data('inkPurity')); } } },
  ];
}

// --- Cytoscape stylesheet ---

function buildStyle() {
  const base = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(colour)',
        'background-opacity': 0.7,
        'label': 'data(display_name)',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'font-size': '11px',
        'color': '#ffffff',
        'border-width': 0,
        // The resting tier of the local halo. Deliberately in the STYLESHEET
        // rather than painted per node: clearMarksFrom strips inline outline-*,
        // so a node that stops being marked falls back to this by itself
        // instead of needing to be repainted.
        'outline-width': LOCAL_HALO_W,
        'outline-color': MARK_LOCAL,
        'outline-opacity': LOCAL_HALO_REST,
        'outline-offset': 0,
        'overlay-padding': 10,
      }
    },
    {
      selector: 'node[type="root"]',
      style: {
        'width': 76,
        'height': 76,
        'background-color': '#FFD700',
        'color': '#000000',
        'font-size': '4px',
        'text-max-width': '70px',
        'border-width': 5,
        'border-color': '#90EE90',
      }
    },
    {
      selector: 'node[type="Entry"]',
      style: {
        'width': 68,
        'height': 68,
        'font-size': '10px',
        'text-max-width': '62px',
      }
    },
    {
      selector: 'node[type="Entry"][name="Settling"]',
      style: {
        'width': 76,
        'height': 76,
        'shape': 'round-triangle',
        'text-max-width': '70px',
        'border-width': 2,
        'border-color': function(node) {
          const hex = (node.data('colour') || '#666666').replace('#', '');
          const r = Math.round(parseInt(hex.slice(0,2), 16) / 3).toString(16).padStart(2,'0');
          const g = Math.round(parseInt(hex.slice(2,4), 16) / 3).toString(16).padStart(2,'0');
          const b = Math.round(parseInt(hex.slice(4,6), 16) / 3).toString(16).padStart(2,'0');
          return `#${r}${g}${b}`;
        },
        'border-opacity': 0.5,
      }
    },
    {
      // 2026-08-16 — Gateways navigation-aid node. White square, black
      // font. Size 42 (+10 % per user 2026-08-16, was 38). Font 9 (bigger
      // box, small text) so the "Gateways" label fits without truncating.
      // Still compact (~55 % of the Conversations node's 76 px).
      selector: 'node[type="Entry"][name="Gateways"]',
      style: {
        'shape': 'square',
        'width': 42,
        'height': 42,
        'background-color': '#ffffff',
        'background-opacity': 1,
        'color': '#000000',
        'font-size': '9px',
        'text-max-width': '40px',
        'border-width': 1,
        'border-color': '#000000',
        'border-opacity': 1,
      }
    },
    {
      selector: 'node[type="Entry"][name="Conversations"]',
      style: {
        'width': 88,
        'height': 76,
        'shape': 'hexagon',
        'text-max-width': '72px',
        'border-width': 2,
        'border-color': function(node) {
          const hex = (node.data('colour') || '#666666').replace('#', '');
          const r = Math.round(parseInt(hex.slice(0,2), 16) / 3).toString(16).padStart(2,'0');
          const g = Math.round(parseInt(hex.slice(2,4), 16) / 3).toString(16).padStart(2,'0');
          const b = Math.round(parseInt(hex.slice(4,6), 16) / 3).toString(16).padStart(2,'0');
          return `#${r}${g}${b}`;
        },
        'border-opacity': 0.5,
      }
    },
    {
      selector: 'node[type="Family"]',
      style: {
        'width': 60,
        'height': 60,
        'background-color': function(node) {
          const name = node.data('name');
          return FAMILY_COLOURS[name] || node.data('colour') || '#aaaaaa';
        },
        'background-opacity': 1,
        'font-size': '10px',
        'text-max-width': '54px',
        'border-width': 2,
        'border-color': function(node) {
          const hex = (FAMILY_COLOURS[node.data('name')] || node.data('colour') || '#666666').replace('#', '');
          const r = Math.round(parseInt(hex.slice(0,2), 16) / 3).toString(16).padStart(2,'0');
          const g = Math.round(parseInt(hex.slice(2,4), 16) / 3).toString(16).padStart(2,'0');
          const b = Math.round(parseInt(hex.slice(4,6), 16) / 3).toString(16).padStart(2,'0');
          return `#${r}${g}${b}`;
        },
        'border-opacity': 0.5,
      }
    },
    {
      selector: 'node[type="Family"].subfamily',
      style: {
        'width': 56,            // 2026-08-17 — +5% (was 53) so labels fit; also offsets the
                                // 5px central-node border which straddles the edge (~2.5px inward)
        'height': 22,
        'font-size': '6.8px',   // 2026-08-17 — −8% then −8% again (8→7.4→6.8) so SubFamily labels fit the node
        'text-max-width': '52px',
      }
    },
    {
      selector: 'node[type="Cluster"]',
      style: {
        'width': 70,
        'height': 34,
        'shape': 'round-rectangle',
        'text-max-width': '63px',
        'font-size': '10px',
        'text-margin-y': -3,
        'border-width': 2,
        'border-color': function(node) {
          const hex = (node.data('colour') || '#666666').replace('#', '');
          const r = Math.round(parseInt(hex.slice(0,2), 16) / 3).toString(16).padStart(2,'0');
          const g = Math.round(parseInt(hex.slice(2,4), 16) / 3).toString(16).padStart(2,'0');
          const b = Math.round(parseInt(hex.slice(4,6), 16) / 3).toString(16).padStart(2,'0');
          return `#${r}${g}${b}`;
        },
        'border-opacity': 0.5,
      }
    },
    {
      selector: 'node[type="Cluster"].active-cluster',
      style: {
        'width': 98,
        'height': 48,
        'text-max-width': '91px',
        'font-size': '11px',
      }
    },
    {
      selector: 'node[type="TextNode"]',
      style: {
        'width': 120,
        'height': 34,
        'background-color': '#1a1a2e',
        'color': '#ffffff',
        'shape': 'round-rectangle',
        'text-max-width': '113px',
        'font-size': '10px',
        'border-width': function(node) {
          if (node.data('source') === 'seed') return 0.5;
          return 0.3;
        },
        'border-color': '#888888',
      }
    },
    {
      selector: 'edge',
      style: {
        'line-color': 'data(colour)',
        'width': function(edge) { return Math.max(0.5, (edge.data('weight') || 0) * 2.5); },
        'curve-style': 'bezier',
        'opacity': 0.7,
        'target-arrow-shape': 'none',
      }
    },
    {
      // 2026-07-15 — deep-link arrival breadcrumb hop. Handles the Root→target
      // edge added in handleReturnFromStandalone: renders as a modest upward
      // arc, distinguishing it from the straight chip-to-chip edges the user
      // builds by tapping. Signals "we jumped here, didn't walk step by step",
      // without going so far as to obscure the chip labels on the 23px bar.
      selector: 'edge.deep-link-hop',
      style: {
        'curve-style': 'unbundled-bezier',
        'control-point-distances': [-11],   // px above the straight line (neg = up)
        'control-point-weights':  [0.5],    // midpoint
        'line-color': '#a07820',            // amber — pairs with #chat-btn / action bar
        'opacity': 0.9,
        'width': 1.5,
      }
    },
    {
      selector: 'edge[type="CHILD"]',
      style: {
        'target-arrow-shape': 'triangle',
        // 2026-08-14 — softened for all reading-sequence CHILD edges
        // (any TextNode-sourced CHILD — covers gateway→title, title→text-
        // node, AND text-node→text-node hops). Opacity 0.5 + arrow-scale
        // 0.6 across the board so the descendant graph inside a work reads
        // as a calm sequence rather than a forbidding directed graph with
        // bright bulky arrows. Non-TextNode-sourced CHILD edges (if any)
        // keep the 0.7 / 1.2 defaults.
        'arrow-scale': function(edge) {
          return edge.source().data('type') === 'TextNode' ? 0.6 : 1.2;
        },
        'opacity': function(edge) {
          return edge.source().data('type') === 'TextNode' ? 0.5 : 0.7;
        },
        'width': function(edge) {
          const isGateway = edge.source().data('gateway');
          const rs = edge.data('rel_source');
          if (isGateway && rs === 'sequence') return 1.0;
          if (rs === 'dyad') return 0.6;
          return 0.7;
        },
        'line-color': function(edge) {
          const rs = edge.data('rel_source');
          if (rs === 'dyad') return '#888888';
          if (edge.source().data('gateway')) return '#ffffff';
          return '#cccccc';
        },
        'target-arrow-color': function(edge) {
          const rs = edge.data('rel_source');
          if (rs === 'dyad') return '#888888';
          if (edge.source().data('gateway')) return '#ffffff';
          return '#cccccc';
        },
      }
    },
    {
      // 2026-08-16 — reading-spine signalling (see applySeqSignals). ONLY the
      // central (just-tapped) node's forward hop to its successor gets a bold
      // amber edge + double-size arrowhead (tap 19 → arrow 19→20), pointing
      // the way to the next node. Class applied at layout time; placed after
      // the CHILD rule so it wins.
      selector: 'edge.seq-edge',
      style: {
        'line-color': MARK_LOCAL,
        'target-arrow-color': MARK_LOCAL,
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.44,         // 2026-08-27 — +20%. The arrow is now the
                                     // ONLY successor signal, so it carries
                                     // alone what it used to share with a
                                     // border.  (~2x the softened 0.6
                                     // TextNode-CHILD arrow before the bump.)
        'width': 2.5,                // thicker than the ~0.6 default hop
        'opacity': 0.95,
        'z-index': 15,
      }
    },
    {
      // The successor node itself — 2x-ish border in amber so the "next" node
      // reads as the target of the amber arrow. The central (just-tapped) node
      // gets its own thicker amber border via markReadNode (inline → wins).
      selector: 'node.seq-successor',
      style: {
        // 2026-08-27 — border REMOVED. The successor is signalled by the arrow
        // alone now; a second mark on the node competed with the local ring
        // for the same meaning. The class is kept so applySeqSignals still has
        // something to target, and so the successor can be styled again
        // without re-deriving which node it is.
        'border-width': 0,
      }
    },
    {
      // Synthetic root→family edges: invisible but present for fCoSE layout
      selector: 'edge[type="__root_edge__"]',
      style: {
        'opacity': 0,
        'events': 'no',
      }
    },
    {
      selector: 'edge[type="CONTAINS_CLUSTER"]',
      style: { 'opacity': 0, 'events': 'no' }
    },
    {
      selector: 'edge[type="DESCENDS_FROM"]',
      style: { 'opacity': 0.7, 'target-arrow-shape': 'none' }
    },
    {
      // 2026-08-16 — Main route highlight. CONTAINS is used ONLY for the
      // primary spine Root → Settling → Conversations (verified: exactly
      // two CONTAINS edges in the DB). Render it bright with a small arrow
      // so the eye reads it as THE way in, distinct from the many faint
      // descent / nav-aid edges. Luminance-forward (not hue) for reduced-
      // colour-vision legibility.
      selector: 'edge[type="CONTAINS"]',
      style: {
        'line-color': '#e0e0e0',
        'target-arrow-color': '#e0e0e0',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.65,
        'opacity': 0.95,
        'width': 1.8,
        'curve-style': 'bezier',
      }
    },
    {
      // 2026-08-16 — the Settling ↔ Gateways nav-aid hop (Gateways
      // DESCENDS_FROM Settling). Deliberately faint and arrowless so it
      // reads as an optional side-door, NOT part of the bright main spine.
      // More specific than the generic DESCENDS_FROM rule above, so it wins.
      selector: 'edge[type="DESCENDS_FROM"][source_name="Gateways"]',
      style: {
        'line-color': '#5a5a5a',
        'opacity': 0.28,
        'width': 0.6,
        'target-arrow-shape': 'none',
      }
    },
    {
      // 2026-08-16 — GATEWAY_LINK: navigation-aid edges from each
      // gateway TextNode to the Gateways Entry node. Subtle so a fan
      // of many edges radiating from Gateways doesn't dominate the
      // canvas visually. Distinct edge type so upstream views can
      // filter these out later ("show me only 'real' descent edges").
      selector: 'edge[type="GATEWAY_LINK"]',
      style: {
        'width': 0.6,
        'opacity': 0.4,
        'line-color': '#888888',
        'target-arrow-shape': 'none',
      }
    },
    {
      selector: 'edge[type="CLUSTER_REL"]',
      style: {
        'width': function(edge) { return getClusterRelWidth(edge); },
        'line-color': 'data(colour)',
        'opacity': 0.7,
        'target-arrow-shape': 'none',
      }
    },
    {
      // 2026-08-29 — THE NEXT STEP toward your partner. Blue because it points at
      // them, dotted because it is guidance rather than part of your view, and
      // arrowed because unlike every other signal here it has a DIRECTION: this
      // way, not merely "these are related".
      selector: 'edge.route-step',
      style: {
        'line-style': 'dotted',
        'width': 3,
        'line-color': '#4a9bff',
        'opacity': 0.9,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#4a9bff',
        'source-arrow-shape': 'none',
        'z-index': 30,
      }
    },
    {
      // A step BACKWARDS down the reading spine — they are behind you in the same
      // work. Hollow head and dimmer: still available, but not urging you on.
      // Drawn after .route-step so it wins on the properties it restates.
      selector: 'edge.route-step.route-back',
      style: {
        'target-arrow-shape': 'triangle-tee',
        'opacity': 0.55,
        'width': 2,
      }
    },
    {
      // 2026-08-29 — a REVEALED path. These are real corpus edges, not drawn
      // connections; the dotting is a provenance signal, saying "shown to
      // explain how their node reaches yours" rather than "part of your
      // neighbourhood". Solid would claim it was already in your view.
      selector: 'edge.bridge-edge',
      style: {
        'line-style': 'dotted',
        'width': 2,
        'line-color': '#8b95a6',
        'opacity': 0.75,
        'target-arrow-shape': 'none',
        'source-arrow-shape': 'none',
      }
    },
    {
      selector: 'edge[type="PART_OF"]',
      style: { 'opacity': 0.55, 'target-arrow-shape': 'none' }
    },
    {
      selector: 'node[type="TextNode"][?section_title]',
      style: {
        'background-color': '#cccccc',
        'color': '#1a1a1a',
        // 2026-08-16 — keep the pinned title fully tappable even in a dense
        // work. Tao Te Ching has 82 content nodes; fcose lays some of them
        // over the title, and the overlapping (later-drawn) node was stealing
        // the tap so only the title's exposed top edge fired. z-index draws
        // the title on top so it wins the hit-test; text-events makes the
        // whole label (not just the small node box) a tap target. Sparse
        // works never overlapped, which is why only Tao Te Ching showed it.
        'z-index': 20,
        'text-events': 'yes',
      }
    },
    {
      selector: 'node[type="TextNode"][?gateway]',
      style: {
        'text-transform': 'uppercase',
        'background-color': '#ffffff',
        'background-opacity': 0.85,
        'color': '#000000',
      }
    },
    {
      selector: 'node[type="TextNode"].abbreviated',
      style: {
        'width': 40,
        'height': 34,
        'text-max-width': '34px',
      }
    },
    {
      selector: 'node.buddy-gone',
      style: { 'opacity': 0.3 }
    },
    {
      selector: 'node.family-view',
      style: { 'background-opacity': 0.35, 'text-opacity': 0.6 }
    },
    {
      selector: 'node.snake-section',
      style: {
        'width': 70,
        'height': 40,
        'label': 'data(seq)',
        'text-max-width': '64px',
        'font-size': '12px',
      }
    },
    {
      selector: 'node.latest',
      style: {
        'border-width': 2,
        'border-color': '#ffffff',
        'border-opacity': 1,
      }
    },
    {
      selector: 'node[type="ClusterEditChip"]',
      style: {
        'width': 53,
        'height': 21,
        'shape': 'round-rectangle',
        'background-color': 'data(colour)',
        'background-opacity': 0.85,
        'color': '#ffffff',
        'label': 'data(display_name)',
        'font-size': '7px',
        'text-max-width': '48px',
        'border-width': 0,
        'overlay-padding': 4,
      }
    },
    // Breadcrumb chip override — applied in addYouChip / appendBuddyChip via
    // addClass('breadcrumb-chip'). Defined AFTER all per-type rules so it
    // wins on specificity ties. The bar is 23px tall; chips need to fit
    // inside that with a small margin. Width kept generous-ish so labels
    // aren't truncated too aggressively — pinch-zoom is enabled if more
    // reading room is needed.
    {
      // §4 — an edge from the Blue Node to something already on screen. Thin
      // and blue so it reads as the partner's connection rather than part of
      // the local structure.
      selector: 'edge.bn-edge',
      style: {
        'line-color': '#4a9bff',
        'width': 1,
        'opacity': 0.75,
        'line-style': 'solid',
      }
    },
    {
      selector: 'node.breadcrumb-chip',
      style: {
        'width': 63,                           /* 2026-07-15 — +5% from 60 so
                                                  edge characters clear the chip
                                                  border with headroom. Kept
                                                  under the pinch-zoom trigger. */
        'height': 18,
        'font-size': '8px',                    /* 2026-07-15 — dropped from 9px
                                                  (~10% smaller) so first/last
                                                  characters of labels no longer
                                                  clip inside the chip. */
        'text-max-width': '59px',              /* proportional to width bump
                                                  (was 56/60 = 0.93; now 59/63). */
        /* 2026-08-20 — TRUNCATE, don't wrap. The base `node` selector sets
           text-wrap:'wrap' (b61364e, for in-node labels on the main canvas),
           which inside an 18px chip pushed long names onto a second and third
           line that overlapped each other — the squashed look. 'ellipsis' cuts
           at text-max-width and adds "…" on one line instead. Long-standing;
           only became conspicuous once the trail was right-aligned and the
           newest chip stopped drifting. */
        'text-wrap': 'ellipsis',
        'text-margin-y': 0,
        /* 2026-08-25 — a 1px black hairline round every chip.
           The chips take their colour from the node palette, which spans the
           whole luminance range, so the STRIP behind them was having to carry
           all the separation — and that forced it darker than every chip,
           which is what kept it from matching the selection ring. With each
           chip carrying its own edge, the strip colour is free.
           border-position OUTSIDE so the hairline does not eat the interior:
           these are 63x18 and their labels already clip. */
        'border-width': 1,
        'border-color': '#000000',
        'border-opacity': 1,
        'border-position': 'outside',
      }
    },
    {
      /* The newest chip keeps its WHITE edge. This rule sits after the one
         above, so the colour must be restated — inheriting would leave the
         latest chip black and lose the marker entirely. */
      selector: 'node.breadcrumb-chip.latest',
      style: { 'border-width': 1.5, 'border-color': '#ffffff', 'border-opacity': 1 }
    },
  ];
  // Later rules win in cytoscape, so the experiment is an APPEND and touches
  // none of the above. Switching it off is switching off one flag.
  return INK_MODE ? base.concat(inkModeOverrides()) : base;
}

// --- Layout ---

// 2026-08-16 — reading-spine signalling. Mark ONLY the single forward hop from
// the CENTRAL (just-tapped) node to its successor, e.g. tap 19 → amber arrow
// 19→20 and only node 20 bordered. NOT the backward 18→19 hop, NOT any other
// node's hops. `centralNode` is runLayout's parentNode (what expandToNode
// passes = the tapped node). Cleared first so a prior view's mark doesn't
// linger. No-op unless the central node is a content TextNode (not a gateway).
function applySeqSignals(cy, centralNode) {
  cy.edges('.seq-edge').removeClass('seq-edge');
  cy.nodes('.seq-successor').removeClass('seq-successor');
  if (!centralNode || !centralNode.length) return;
  if (centralNode.data('type') !== 'TextNode' || centralNode.data('gateway')) return;
  const fwd = centralNode.connectedEdges('edge[type="CHILD"]').filter(e =>
    e.source().id() === centralNode.id() &&
    e.target().data('type') === 'TextNode' &&
    e.visible() && e.target().visible()
  );
  fwd.addClass('seq-edge');
  fwd.targets().addClass('seq-successor');
}

// fCoSE cannot separate nodes that begin at EXACTLY the same point: the
// repulsion between two bodies at zero distance has no direction, so a
// coincident pair stays welded together for the whole simulation. Seeding the
// un-hinted children on a ring (below) fixed the case where WE stacked them,
// but any node can arrive coincident — nodes revealed by a view are not all
// children of its parent (expandToFamily shows the grandparent and siblings
// too), so they are neither pinned nor seeded and keep stale positions from
// wherever they last were.
//
// So nudge duplicates apart just before the simulation, whatever put them
// there. Golden-angle spiral: deterministic, so a view resolves the same way
// every visit, and successive duplicates spread instead of forming a line.
// `skipIds` protects pinned nodes, whose positions are curated.
function separateCoincidentNodes(nodes, skipIds) {
  const seen = new Map();
  nodes.forEach(n => {
    if (skipIds && skipIds.has(n.id())) return;
    const p = n.position();
    const key = Math.round(p.x * 100) + ',' + Math.round(p.y * 100);
    const prior = seen.get(key) || 0;
    if (prior > 0) {
      // 70 is node-scale (a SubFamily is 56x22, a Family 60 across). Breaking
      // the degeneracy needs only a hair, but if fCoSE then barely moves them
      // — and with most nodes pinned it often does not — a hair still reads as
      // overlapping. Separate them properly here and let the simulation refine.
      const a = 2.399963229 * prior;        // golden angle in radians
      const r = 70 * Math.sqrt(prior);
      n.position({ x: p.x + r * Math.cos(a), y: p.y + r * Math.sin(a) });
    }
    seen.set(key, prior + 1);
  });
}

function runLayout(cy, parentNode = null) {
  const visible = cy.elements(':visible');
  applySeqSignals(cy, parentNode);
  if (visible.nodes().length <= 1) {
    cy.fit(visible.not('.parked-mark, .imported-mark'), fitPadding(cy, 120));
    return;
  }

  // Scan DESCENDS_FROM edges for hint_x/hint_y when a parent context is known.
  // Edge direction is inconsistent in the DB (some stored child→parent, some parent→child),
  // so match on EITHER endpoint being the parent.  The "neighbour" end of each edge is
  // whichever endpoint is NOT the parent.
  //
  // 2026-07-23 — view-scoped hints. Each edge can carry MULTIPLE hint sets,
  // keyed by the URL-UUID of the "viewing" parent that captured them:
  //   hint_x_<uuid> / hint_y_<uuid> / hint_scale_<uuid>
  // Same edge participates in ≥2 views (e.g. Nature→Animals is in both
  // Nature's view AND Animals's view), and each view now stores its own
  // hint set — no more clobbering. Bare hint_x/y/scale from before this
  // change serve as fallback so old edges still restore.
  let hintMode    = 'force';
  let childEdges  = null;
  let hintedEdges = null;
  let getHintX    = e => e.data('hint_x');
  let getHintY    = e => e.data('hint_y');
  let getHintScale = e => e.data('hint_scale');
  if (parentNode) {
    const pid = parentNode.id();
    const parentUuid = (parentNode.data('url') || '').split('/').pop();
    if (parentUuid) {
      const kx = `hint_x_${parentUuid}`;
      const ky = `hint_y_${parentUuid}`;
      const ks = `hint_scale_${parentUuid}`;
      // Prefer view-scoped values; fall back to bare keys for pre-scoping edges
      // — EXCEPT under a Cluster parent.
      //
      // 2026-08-22. A bare hint is a pre-2026-07-23 single-slot value, written
      // by whichever view happened to save last. For a Cluster that is never
      // the cluster's own arrangement: measured across all 126 clusters, not
      // one has hints scoped to itself, while 59 were being dragged out of the
      // clean grid path into hybrid mode by a stale bare value left behind by
      // a Family view. The effect was one node pinned at a meaningless
      // coordinate and the rest scattered around it — the clusters that
      // "don't work", against Garden/Wild which has no bare hints and does.
      //
      // Using one view's coordinates in another is precisely the clobbering
      // view-scoping was introduced to stop; the fallback just predates it.
      // Restricted rather than removed, because Family views legitimately
      // still rely on it. Once a curator runs Write in a cluster view the
      // hints are stored scoped, and that view moves to the preset path with
      // real curation behind it.
      const allowBare = parentNode.data('type') !== 'Cluster';
      getHintX     = e => e.data(kx) != null ? e.data(kx) : (allowBare ? e.data('hint_x')     : null);
      getHintY     = e => e.data(ky) != null ? e.data(ky) : (allowBare ? e.data('hint_y')     : null);
      getHintScale = e => e.data(ks) != null ? e.data(ks) : (allowBare ? e.data('hint_scale') : null);
    }
    childEdges  = visible.edges().filter(
      e => e.source().id() === pid || e.target().id() === pid
    );
    hintedEdges = childEdges.filter(e => getHintX(e) != null && getHintY(e) != null);
    const total = childEdges.length;
    hintMode = total === 0 || hintedEdges.length === 0 ? 'force'
             : hintedEdges.length === total             ? 'preset'
             :                                            'hybrid';
    const storedScaleLog = hintedEdges.length ? getHintScale(hintedEdges[0]) : null;
    const formulaScaleLog = 100 * Math.sqrt((total || 1) + 1);
    console.log(`[BD] hint scan: parent=${parentNode.data('name')} uuid=${parentUuid || '(none)'} total=${total} hinted=${hintedEdges.length} mode=${hintMode} hint_scale=${storedScaleLog?.toFixed(1)} formula_scale=${formulaScaleLog.toFixed(1)}`);
  }

  // 2026-08-17 — title-at-top pinning DISABLED. It used to place section-title
  // nodes at y = centre − 100·√(nodeCount). In the now-primary text-node views
  // the title (linked to the central node via PART_OF, so it's in the view)
  // sat far above everything, inflating the cy.fit bounds so the rest of the
  // graph zoomed down to tiny. With titlePins left empty, fcose places the
  // title naturally beside its content and the view scales tightly. The
  // seq-grid (gateway) branch below positions titles itself (titleY =
  // clusterY − 150) and is unaffected. To restore the old behaviour,
  // repopulate titlePins from titleNodes here.
  const titleNodes = visible.nodes().filter(n => !!n.data('section_title'));
  const titlePins  = [];

  // Seq-grid: detect gateway view with un-curated TextNodes that carry seq numbers.
  // section_title nodes are excluded — they go to the top via titlePins.
  const gridNodes = (hintMode === 'force' && parentNode && parentNode.data('type') === 'Cluster')
    ? visible.nodes().filter(n => n.data('type') === 'TextNode' && !n.data('section_title') && n.data('seq') != null)
    : cy.collection();

  const hasRoot = visible.nodes().filter(n => n.data('type') === 'root').length > 0;
  // Distinguish the root SPLASH (parent is the root itself) from a nav-layer
  // view that merely keeps root visible as a neighbour — e.g. the Settling
  // view (parent = Settling, an Entry) still shows ButterflyDreaming above it.
  // 2026-08-16 — the hardcoded hasRoot layout below used to fire for BOTH,
  // silently discarding curated hints in the Settling view (Write saved the
  // hints to the DB fine, but re-entry overwrote them with an even spread).
  // Now the fixed nav layout only owns the splash, or an un-curated view with
  // no hints; once a view carries hints (preset/hybrid) we honour them even
  // when root is on screen.
  const parentIsRoot = !parentNode || parentNode.data('type') === 'root';

  if (hasRoot && (parentIsRoot || hintMode === 'force')) {
    // Nav-layer view: use preset layout so nodes hold exact computed positions.
    // Positions are derived from the graph container (not the window) so the
    // arrangement stays correct if a sidebar shrinks the available area.
    // fit: false on the layout prevents auto-centering that would override
    // placement; we do a single cy.fit() afterwards to frame the two nodes.
    const rect = cy.container().getBoundingClientRect();
    const cx   = rect.width  / 2;
    const positions = {};
    const nonRoot = visible.nodes().filter(n => n.data('type') !== 'root');
    visible.nodes().filter(n => n.data('type') === 'root').forEach(n => {
      positions[n.id()] = { x: cx, y: rect.height * 0.15 };
    });
    nonRoot.forEach((n, i) => {
      const spread = Math.min(180, rect.width / (nonRoot.length + 1));
      positions[n.id()] = {
        x: cx + (i - (nonRoot.length - 1) / 2) * spread,
        y: rect.height * 0.40,
      };
    });
    visible.layout({ name: 'preset', positions, fit: false }).run();
    cy.fit(visible.not('.parked-mark, .imported-mark'), fitPadding(cy, 80));

  } else if (hintMode === 'preset' || hintMode === 'hybrid') {
    // Recover hinted children from stored offsets, pin them, and run fCoSE so any
    // un-hinted nodes (grandparent Family, un-hinted children in hybrid) settle
    // naturally via edge attraction rather than sitting at stale off-screen positions.
    //
    // renderScale must be in graph coordinate units (not screen pixels), so divide
    // by the current zoom.  Parent is placed at the graph-space centre of the
    // viewport so cy.fit() frames it correctly after the layout.
    const area        = cy.container().getBoundingClientRect();
    // renderScale: use the stored capture scale if available (exact match to what the
    // user arranged). Fall back to sqrt formula for old hints that predate hint_scale.
    // Uses the view-scoped getter so we pick the current view's scale, not
    // whichever view happened to Write last.
    const storedScale = hintedEdges.length ? getHintScale(hintedEdges[0]) : null;
    const renderScale = storedScale != null ? storedScale
                      : 100 * Math.sqrt((childEdges.length || 1) + 1);
    // Centre the parent at the current viewport centre in graph space.
    const curZoom = cy.zoom() || 1;
    const graphCx = (area.width  / 2 - cy.pan().x) / curZoom;
    const graphCy = (area.height / 2 - cy.pan().y) / curZoom;

    const pid = parentNode.id();
    parentNode.position({ x: graphCx, y: graphCy });
    const pins = [{ nodeId: pid, position: { x: graphCx, y: graphCy } }];
    let sumX = 0, sumY = 0;
    hintedEdges.forEach(e => {
      const child = e.source().id() === pid ? e.target() : e.source();
      const pos = {
        x: graphCx + getHintX(e) * renderScale,
        y: graphCy + getHintY(e) * renderScale,
      };
      child.position(pos);
      pins.push({ nodeId: child.id(), position: { ...pos } });
      sumX += pos.x;
      sumY += pos.y;
    });
    if (hintMode === 'hybrid') {
      // 2026-08-22 — seed un-hinted children on a RING around the centroid,
      // not all at the centroid itself.
      //
      // They used to be given identical coordinates, and fCoSE runs with
      // randomize:false so it starts from exactly those. Repulsion between two
      // nodes at ZERO distance has no direction — the separation force is
      // degenerate — so coincident nodes can stay welded together for the
      // whole simulation. That is what hid subfamilies behind one another:
      // the lower one was there, exactly underneath, with no way to know.
      //
      // A ring is a non-degenerate start, and deterministic — the same view
      // always seeds the same way, so positions do not jitter between visits
      // the way a random scatter would. fCoSE then settles them properly.
      const centroid = { x: sumX / hintedEdges.length, y: sumY / hintedEdges.length };
      const unhinted = childEdges.filter(e => getHintX(e) == null || getHintY(e) == null);
      const ringR    = Math.max(60, renderScale * 0.35);
      unhinted.forEach((e, i) => {
        const c = e.source().id() === pid ? e.target() : e.source();
        const a = (2 * Math.PI * i) / Math.max(1, unhinted.length) - Math.PI / 2;
        c.position({ x: centroid.x + ringR * Math.cos(a),
                     y: centroid.y + ringR * Math.sin(a) });
      });
    }
    separateCoincidentNodes(visible.nodes(), new Set(pins.map(p => p.nodeId)));

    visible.layout({
      name: 'fcose',
      animate: true,
      animationDuration: 450,
      randomize: false,
      fit: true,
      padding: 8,
      nodeSeparation: 75,
      idealEdgeLength: 100,
      nodeRepulsion: 4500,
      gravity: 0.25,
      fixedNodeConstraint: [...pins, ...titlePins],
    }).run();

  } else if (gridNodes.length > 0) {
    // Seq-grid mode — gateway view, no stored hints.
    // Sort TextNodes by seq rank and place on a ceil(√n)-column grid.
    // Pure preset layout: all positions computed, no simulation needed.
    const sorted  = gridNodes.toArray().sort((a, b) => (a.data('seq') || 0) - (b.data('seq') || 0));
    const n       = sorted.length;

    // 2026-08-22 — the grid used ONE spacing of 120 for both axes while the
    // node is 120 x 34. That was wrong in both directions at once: a 0px gap
    // horizontally (the nodes touched) and 86px wasted vertically on every
    // row. Give each axis a cell matched to the node.
    // 2026-08-23 — cells and gaps tightened ~15%. These are shared by the
    // optimiser below AND by the seeding code further down: if they ever
    // disagree, the optimiser is choosing a shape for a layout that is not the
    // one drawn, so keep them in one place.
    const cellW = 136, cellH = 56;          // gateway 120 x 34, so 16 / 22 clear
    const FAM_W = 112, FAM_H = 70;          // family   56 x 22, so 56 / 48 clear
    const GAP_BELOW = 60, GAP_ABOVE = 60;   // cluster -> gateway / family blocks

    // Seed shape: aim for a SQUARE block, and cap by what the canvas can hold.
    //
    // 2026-08-23 — this rule was `sqrt(n * 1.6)`, which deliberately aims WIDER
    // than tall. That is right for the small Family nodes and exactly wrong
    // here: a gateway is 120 x 34, so a cell is 148 x 62 and any column-heavy
    // arrangement is nearly a line before the simulation even runs. Measured:
    // the seed for 5 gateways was 416 x 96 — aspect 4.3 — which is what was
    // being seen briefly and then reported as "floating down into a row".
    //
    // fCoSE was NOT the culprit; it only widened 4.8 to 5.1. No parameter
    // tuning helped (every variant landed between 4.0 and 5.7) because the
    // seed it starts from was already flat. Fix the seed, not the simulation.
    //
    // 0.7*sqrt(n) balances the 148x62 cell into a square-ish block: 5 gateways
    // become 268 x 158 instead of 416 x 96, and 12 become 268 x 344 instead of
    // 712 x 158 — which is the width that was setting the scale for the whole
    // view. Floor of 2 columns so it can never become a single stack; the cap
    // stops a narrow phone being handed a block it cannot show.
    // 2026-08-23 — choose the gateway columns by minimising how far cy.fit must
    // zoom OUT for the WHOLE VIEW, not for the gateway block alone.
    //
    // Measured before this: the view filled 100% of the canvas height and only
    // 50-70% of its width, so height bound the fit and all the slack was
    // horizontal — "the views only occupy the central half". Optimising the
    // gateway block in isolation cannot see that, because the binding
    // dimension is the total stack: families + cluster + gateways.
    const gArea  = cy.container().getBoundingClientRect();
    const availW = Math.max(200, gArea.width);
    const availH = Math.max(200, gArea.height);
    // Everything that is neither the cluster, a gateway, nor a section title is
    // a Family parent. Both blocks are shaped together below, because they
    // share one bounding box and cy.fit sees only that.
    const gridIds  = new Set(sorted.map(nd => nd.id()));
    const titleIds = new Set(titleNodes.map(nd => nd.id()));
    const famCount = visible.nodes().filter(nd =>
      nd.id() !== parentNode.id() && !gridIds.has(nd.id()) && !titleIds.has(nd.id())
    ).length;

    // Choose BOTH column counts together, minimising how far cy.fit must zoom
    // out. Shaping either block alone cannot see the binding dimension, which
    // is the total stack: families + cluster + gateways.
    //
    // No cap on columns by canvas width — that cap blocked options the
    // optimiser would have rejected anyway on their own merits, while
    // forbidding ones that cost nothing because the OTHER block was already
    // that wide.
    let cols = 2, famCols = 2, bestFit = Infinity;
    for (let gc = 1; gc <= Math.max(1, n); gc++) {
      const gr = Math.ceil(n / gc);
      const gW = (gc - 1) * cellW + 120, gH = (gr - 1) * cellH + 34;
      for (let fc = 1; fc <= Math.max(1, famCount); fc++) {
        const fr = Math.ceil(famCount / fc) || 0;
        const fW = famCount ? (fc - 1) * FAM_W + 56 : 0;
        const fH = famCount ? (fr - 1) * FAM_H + 22 : 0;
        const totalW = Math.max(gW, fW, 70);
        const totalH = GAP_ABOVE + fH + 34 + GAP_BELOW + gH;
        const s = Math.max(totalW / availW, totalH / availH);
        if (s < bestFit - 1e-9) { bestFit = s; cols = gc; famCols = fc; }
      }
    }
    const gridW = (cols - 1) * cellW;
    const rows  = Math.ceil(n / cols);

    // Work from a fixed origin — cy.fit() normalises to the viewport afterwards.
    const ox = 0, oy = 0;
    const clusterY  = oy - 100;
    // 2026-08-23 — gaps cut from 180/170 to 110. They were pure empty edge:
    // 180 between the cluster's centre and the first gateway row is ~146px of
    // nothing once both node heights are taken off. That extra height was what
    // bound the fit and shrank everything, which is the "edges are quite long,
    // the diagram is bigger than it needs to be" observation. Compacting and
    // scaling up were the same fix, as suspected.
    const gridTopY  = clusterY + GAP_BELOW;
    const titleY    = clusterY - GAP_ABOVE;

    const positions = {};
    positions[parentNode.id()] = { x: ox, y: clusterY };

    // 2026-08-23 — the gateways are SEEDED below the cluster, not pinned into a
    // grid. Any fixed shape is chosen for today's counts and stops being right
    // as works are added: the row was setting the width of the whole view, and
    // that only gets worse. Seeding a compact block and letting fCoSE arrange
    // it — a cloud constrained to stay below the cluster — degrades gracefully
    // instead, because the simulation re-solves for whatever n happens to be.
    //
    // Nothing is lost by dropping the grid order: every gateway carries
    // seq = -1, so the sort above is a no-op on them. It still applies if this
    // branch ever sees TextNodes with real seq values.
    const gwSeedIds = new Set();
    const gwPins = [];
    sorted.forEach((node, rank) => {
      const row  = Math.floor(rank / cols);
      const col  = rank % cols;
      const rowN = Math.min(cols, n - row * cols);
      const seat = {
        x: ox + (col - (rowN - 1) / 2) * cellW,
        y: gridTopY + row * cellH,
      };
      node.position(seat);
      gwSeedIds.add(node.id());
      // Pin from the COMPUTED values, never from node.position(): that getter
      // returns cytoscape's live internal position object, not a copy — so the
      // pin would be the very object the layout mutates, and would follow the
      // node instead of holding it. Verified: read a position, move the node,
      // and the captured "value" has changed. That silent no-op is why the
      // block kept floating back into a line despite being pinned.
      gwPins.push({ nodeId: node.id(), position: { x: seat.x, y: seat.y } });
    });

    const tCount = titleNodes.length;
    const tSep   = Math.min(200, Math.max(120, gridW / Math.max(1, tCount - 1)));
    titleNodes.forEach((node, i) => {
      positions[node.id()] = {
        x: ox + (i - (tCount - 1) / 2) * tSep,
        y: titleY,
      };
    });

    // 2026-08-22 — the cluster's Family parents go ABOVE it, but are NUDGED
    // there rather than pinned into a line.
    //
    // A single row was the wrong answer. Eight subfamilies at row spacing is
    // ~840px wide, so cy.fit zooms the whole view down until nothing is
    // legible — worst on iOS, bad enough on desktop. It also throws away the
    // vertical dimension, which is most of the point of a graph layout.
    //
    // So: seed them in a compact staggered block above the cluster and let
    // fCoSE arrange them, with the deterministic part of the view PINNED
    // (cluster, gateway grid, section titles) so the grid survives exactly as
    // before. relativePlacementConstraint then guarantees "above" as a
    // property of the layout rather than something the seeding merely hopes
    // for. Sorted by name so the seed is stable between visits.
    const famNodes = visible.nodes()
      .filter(n2 => !positions[n2.id()] && !gwSeedIds.has(n2.id()))
      .sort((a, b) => String(a.data('name') || a.data('title') || '')
        .localeCompare(String(b.data('name') || b.data('title') || '')));

    // Anchor the pinned part first — fCoSE runs with randomize:false, so it
    // starts from whatever is on the nodes now, not from `positions`.
    Object.keys(positions).forEach(id => {
      const n = cy.getElementById(id);
      if (n.length) n.position(positions[id]);
    });

    if (famNodes.length) {
      // Wider than tall: ~1.6 aspect keeps the block from becoming a column,
      // which would fight the vertical space the gateway grid needs below.
      const fCols  = Math.max(1, Math.min(famCols, famNodes.length));
      const fSepX  = FAM_W, fSepY = FAM_H;
      const fBaseY = (titleNodes.length ? titleY : clusterY) - GAP_ABOVE;
      famNodes.forEach((n, i) => {
        const row  = Math.floor(i / fCols);
        const col  = i % fCols;
        const rowN = Math.min(fCols, famNodes.length - row * fCols);
        n.position({
          x: ox + (col - (rowN - 1) / 2) * fSepX,
          y: fBaseY - row * fSepY,          // rows stack UPWARD, away from the cluster
        });
      });
    }

    const layout = visible.layout({
      name: 'fcose',
      // 2026-08-23 — animate:false. With the gateways pinned, the only nodes
      // that move are the families, and the animation bought a race instead of
      // a flourish: layoutstop lost to a 700ms backstop, so the fit was framing
      // MID-animation. Synchronous completion means run() returns with final
      // positions and the fit can simply follow it — no events, no timer.
      animate: false,
      randomize: false,
      fit: true,
      padding: 60,
      nodeSeparation: 75,
      idealEdgeLength: 100,
      nodeRepulsion: 4500,
      gravity: 0.25,
      // Gateways are PINNED at their seed, not arranged by the simulation.
      //
      // 2026-08-23 — a force layout cannot give a compact cloud from this
      // topology, and the reason is structural rather than a tuning problem.
      // Every gateway attaches to the ONE cluster node, which sits above them,
      // so attraction to a single fixed point plus mutual repulsion settles
      // them on an arc at roughly constant distance — and an arc below a point
      // is inherently wide and shallow. Measured: a compact 148x124 seed came
      // out of fCoSE at 405x101. That is the "floats down into a line".
      //
      // The seed is already the shape wanted, so keep it. It is also
      // deterministic, which means a cluster looks the same every visit —
      // the spatial-memory argument in the scaling brief §3.5.
      fixedNodeConstraint: Object.keys(positions).map(id => ({
        nodeId: id, position: positions[id],
      })).concat(gwPins),
      // NO relativePlacementConstraint. It enforces an EXACT offset, so every
      // node sharing an anchor collapses onto one line — measured headlessly
      // against this exact case: all 5 gateways at the same y, and all 8
      // families too. That was the reported row, and it was this.
      //
      // Staggering the gaps per row was tried and is worse: it holds the sides
      // but pins y while leaving x free to compress, giving 5 overlapping
      // pairs at 12 gateways and 44 at 40. Unconstrained gives a real cloud
      // with none. The sides are kept below instead, by moving each group
      // whole.
    });

    // Keep the two halves on their own sides WITHOUT distorting either.
    // Unconstrained, a gateway can drift past the cluster once there are
    // enough of them (measured: fine at 5, crosses at 12+). Shifting the whole
    // group rigidly preserves the arrangement fCoSE found — every relative
    // position within the cloud is untouched — where a per-node constraint
    // flattens or overlaps it.
    const finish = () => {
      try {
        const anchorY = parentNode.position().y;
        const shift = (coll, below) => {
          if (!coll || !coll.length) return;
          let worst = 0;
          coll.forEach(nd => {
            const dy = nd.position().y - anchorY;
            // Threshold matched to the gap it protects. It was a hardcoded 90
          // against a 60px gap, so it pushed the families 30px further out on
          // every view — measured as 362px of content where 336 was intended.
          const need = below ? (GAP_BELOW - dy) : (dy + GAP_ABOVE);
            if (need > worst) worst = need;
          });
          if (worst > 0) {
            const d = below ? worst : -worst;
            coll.forEach(nd => {
              const q = nd.position();
              nd.position({ x: q.x, y: q.y + d });
            });
          }
        };
        // The gateways are pinned below the cluster by construction — only
        // the families are free to drift across it.
        shift(famNodes, false);
        cy.fit(visible.not('.parked-mark, .imported-mark'), fitPadding(cy, 60));
      } catch (err) { console.warn('[BD] side-shift failed', err); }
    };
    layout.run();
    finish();          // synchronous: run() has returned with final positions

    // No separateCoincidentNodes and no cy.fit here any more. Every node in
    // this view is now either pinned or seeded, so nothing arrives coincident;
    // and fCoSE animates with fit:true, so an immediate cy.fit would frame the
    // pre-animation positions and fight it.

  } else {
    // force mode — fCoSE from scratch.  If title nodes are present, pin them at
    // the top (and anchor the parent at centre) so they don't drift randomly.
    const forceConstraint = titlePins.length > 0 && parentNode
      ? [...titlePins, { nodeId: parentNode.id(),
                         position: (() => {
                           const a = cy.container().getBoundingClientRect();
                           const z = cy.zoom() || 1;
                           return { x: (a.width/2 - cy.pan().x)/z, y: (a.height/2 - cy.pan().y)/z };
                         })() }]
      : [];
    // 2026-08-23 — padding was a hardcoded 60, and fcose's own fit:true is the
    // only fit this branch performs. On a 430x381 phone canvas that gave away
    // 28% of the width and 31% of the height as margin — worse than the
    // cluster view, and this is the branch a TextNode view uses.
    //
    // fitPadding scales with the canvas, so the same call is ~11 on a phone and
    // ~19 on a desktop. Passed INTO fcose rather than followed by a cy.fit,
    // deliberately: a post-layout fit races the animation, which is exactly
    // what framed the cluster view mid-flight.
    const forcePad = fitPadding(cy, 60);
    visible.layout({
      name: 'fcose',
      animate: true,
      animationDuration: 450,
      randomize: true,
      fit: true,
      padding: forcePad,
      nodeSeparation: 75,
      idealEdgeLength: 100,
      nodeRepulsion: 4500,
      gravity: 0.25,
      ...(forceConstraint.length ? { fixedNodeConstraint: forceConstraint } : {}),
    }).run();
  }
}

// --- Interactions ---

function isTouchEvent(evt) {
  const orig = evt.originalEvent;
  if (!orig) return false;
  if (orig.pointerType === 'touch') return true;
  if (typeof TouchEvent !== 'undefined' && orig instanceof TouchEvent) return true;
  if (orig.touches && orig.touches.length > 0) return true;
  if (orig.changedTouches && orig.changedTouches.length > 0) return true;
  return false;
}

function showSessionExpired(message) {
  const overlay = document.getElementById('session-expired');
  if (message) {
    const p = overlay.querySelector('p');
    if (p) p.textContent = message;
  }
  overlay.classList.add('active');
}

function setupInteractions(cy, wsRef, addBadge, youCy, buddyCy, pairingState) {

  async function safeQuery(type, query, params = {}) {
    // Once expired, stay expired. Without this the reconnect below would
    // silently re-establish the session the idle timer just ended.
    if (wsRef.expired) throw new Error('session_expired');
    if (!wsRef.current || !wsRef.current.connected) {
      if (Date.now() - wsRef.lastActivity > wsRef.maxIdleMs) {
        // Truly idle for > 60 min — session ended
        throw new Error('session_expired');
      }
      // Socket dropped (e.g. mobile background/screen lock) but within session window
      // — reconnect transparently so the user can continue without interruption
      wsRef.current = await connectWS();
      attachClientLogSocket(wsRef.current);
    }
    return queryWS(wsRef.current, type, query, params);
  }
  const tooltip = document.getElementById('label-tooltip');
  let dwellTimer = null;
  const history = [];
  let activeNodeId = null;
  // 2026-07-24 — double-tap detection retired for main canvas. These
  // pending/timer slots used to hold the deferred routeNodeText state;
  // under the one-gesture chunk UX every tap fires immediately, so the
  // slots are gone. Breadcrumb tap handlers (buddyCy/youCy) keep their
  // own separate youDesktopTimer/youDesktopPending because breadcrumbs
  // still use the single-tap-defers-then-double-tap-navigates model.
  let tooltipNodeId = null;
  let recentTouch = false;
  let recentTouchTimer = null;
  let lastClusterNode = null;
  // Fires the first time the user drills past a gateway TextNode into
  // the title-node + text-node layout (see handleGatewayClick). One-shot
  // per session — flip to false to re-arm, or drop the flag entirely to
  // make the helper fire on every gateway click.
  let gatewayHelperShown = false;
  let currentClusterColour = null;
  let lastParentNode = null;
  let lastReadNodeId = null;
  let lastReadNodeCy = null;

  function markReadNode(cytoNode, instanceCy) {
    if (lastReadNodeId && lastReadNodeCy) {
      // Clear BOTH ring properties from the node we are leaving — a stale
      // outline would otherwise persist there — then let renderMarks() below
      // put the partner's mark back if it still belongs to that node.
      try { clearMarksFrom(lastReadNodeCy.getElementById(lastReadNodeId)); } catch (_) {}
    }
    // 2026-08-16 — the central (just-tapped) node on the MAIN canvas gets a
    // thick WHITE border ("you are here"); only the successor is amber, so the
    // white central vs amber next reads as a clear non-hue (colour + luminance)
    // distinction. Breadcrumb trail chips (youCy/buddyCy) keep the original
    // subtle 2px grey so the small chips don't get heavy.
    const central = instanceCy === cy;
    // 2026-08-27 — remember where we came FROM. Only on the main canvas, and
    // only on a real change: re-marking the same node must not push it into its
    // own history.
    if (central && lastReadNodeCy === cy && lastReadNodeId &&
        lastReadNodeId !== cytoNode.id()) {
      clearPrevVisuals();              // BEFORE the id moves on — it needs it
      prevReadNodeId = lastReadNodeId;
    }
    lastReadNodeId = cytoNode.id();
    lastReadNodeCy = instanceCy;
    if (central) {
      // 2026-08-21 — the white mark is now stamped by renderMarks(), which also
      // knows about the partner's blue one. Arriving on a node the partner is
      // already on means WHITE arrived last, so white takes the outer ring
      // (§1.2 case B, "I went to them").
      if (bnNodeId && bnNodeId === cytoNode.id()) bnOuter = 'white';
      renderMarks();
    } else {
      cytoNode.style({ 'border-width': 2, 'border-color': '#cccccc', 'border-opacity': 1 });
    }
  }

  // ══ Blue Node (blue_node_spec.md) ═══════════════════════════════════════
  //
  // TWO INDEPENDENT MARKS, never a combined "agreed" state (§1.2.1). The local
  // user's white mark and the partner's blue mark are tracked separately and
  // rendered by ONE function that reads both. Agreement is emergent: when the
  // two land on the same node it wears two rings, and when either party moves
  // its own mark moves with it — nothing to assemble, nothing to tear down.
  //
  // renderMarks() is a pure function of that state, so it is safe to call after
  // every navigation (§5) — the same inputs always give the same result. The
  // 2026-08-20 pane/anchor runaway is what happens when a re-asserted thing is
  // not idempotent.
  let bnNodeId  = null;   // node carrying the partner's mark
  let bnOuter   = null;   // 'blue' | 'white' — which ring is OUTER when both coincide
  let bnGone    = false;  // partner left: dim, do not remove (§2)
  let prevReadNodeId = null;   // the node selected before the current one
  // --- Explore sessions (editing_spec.md) --------------------------------
  // 'none' | 'offered' (we asked) | 'invited' (they asked) | 'active'

  // 2026-08-27 — the GN STACK (corner_controls_plan.md step 4b/5). The BNs you
  // actually CLICKED: a record of your own choices, not of your partner's
  // wanderings. Their trail is already browsable in the remote breadcrumb strip
  // and does not need a second, worse copy here.
  //
  // It CYCLES rather than pops — a record must survive being visited, unlike
  // the back stack, where consuming the entry is the point.
  const GN_CAP  = 3;
  const gnStack = [];

  // 2026-08-27 — the BN STACK. Reopened at the user's request after being
  // deferred: their argument is that it makes BN and PN behave SYMMETRICALLY,
  // which helps understanding and may simplify both, and is quasi-symmetrical
  // with GN too. The symptom that reopened it is the argument making itself —
  // once you have jumped, the button names the node you are standing on and
  // there is nowhere further to go.
  //
  // A CURSOR, not a rotation. The stack is newest-first and the halo always
  // tracks bnStack[0] — where your partner IS — while the cursor is where your
  // browsing has got to. Rotating the array would make "their current position"
  // wander, and that is the one thing the BN must never lie about.
  //
  // Any move by your partner resets the cursor to 0. They moved; that is news,
  // and it outranks a tour of where they have been.
  const BN_CAP  = 3;
  const bnStack = [];
  let   bnCursor = 0;

  // 2026-08-29 — REMOTE VIEW, slice 1 of remote_view_spec.md. Received and
  // stored; nothing is drawn from it yet. Their STRUCTURAL view only — what
  // arrives is expand(their current node), never anything they merged from us,
  // or the union would grow every time it crossed the wire.
  // 2026-08-29 — held as a SET and consulted LIVE. Their view is no longer
  // merged wholesale: a node of theirs lights blue only if it is ALREADY in your
  // view, so consulting this costs nothing and moves nothing.
  let remoteViewIds   = new Set();
  let remoteCurrentId = null;   // the node they are on
  let remotePrevId    = null;   // the node they came from

  // 2026-08-29 — slice 2a. The merged snapshot of their view, and YOUR OWN set
  // recorded separately, because once merging exists the two can no longer be
  // read off what is on screen (remote_view_spec.md §4).
  const mergedRemoteIds = new Set();
  let   localViewIds    = new Set();
  // Nodes on a revealed shortest path. Declared HERE, with the other view sets,
  // rather than beside findBridge — applyMergedView reads it, and a const
  // declared further down would be a temporal-dead-zone throw waiting for the
  // first caller that runs early enough.
  const bridgeIds       = new Set();
  // 2026-08-29 — raised 3 -> 5. The route is now shown INSTEAD of your view
  // rather than added to it, so a longer chain costs nothing: five nodes alone
  // on the canvas is still a simpler picture than any ordinary cluster view.
  const BRIDGE_MAX      = 5;      // intermediate nodes; beyond this there is no route to show
  let   routeActive     = false;

  // Snapshot what is yours, THEN reveal what is theirs. The order is the whole
  // correctness of it: a navigation hides everything and shows its own expand
  // set, so at this moment "visible" means exactly "mine" — and after the merged
  // nodes are shown it never does again.
  function applyMergedView() {
    localViewIds = new Set(cy.nodes(':visible').map(n => n.id()));
    if (!mergedRemoteIds.size) return;
    mergedRemoteIds.forEach(id => {
      const n = cy.getElementById(id);
      if (n.length) n.show();
    });
    // Bridge nodes are LOCAL — they are on your screen, so they wear amber like
    // everything else and are re-shown with the rest of your view.
    bridgeIds.forEach(id => {
      const n = cy.getElementById(id);
      if (n.length) n.show();
    });
    // Same rule the expands use: an edge shows when both its endpoints do. So
    // the merged nodes bring their own structure without being sent any of it.
    cy.edges().filter(e => e.source().visible() && e.target().visible()).show();
  }

  // 2026-08-29 — SIMPLIFIED, at the user's judgement that the full union is more
  // than a reader can hold. Their whole view is no longer pulled across; only
  // their CURRENT node is, and only if it is not already yours.
  //
  // Everything else they are looking at still shows — but only where it overlaps
  // what you are already looking at, and that overlap is painted live by
  // renderMembership without adding a node or moving one. So the picture answers
  // "which of these are we both seeing?" rather than "what is everything either
  // of us can see?", which is the question a person can actually hold.
  //
  // The button therefore adds at most ONE node. That is also why the layout-churn
  // argument no longer applies to the overlap: recolouring a halo moves nothing.
  // 2026-08-29 — placeImportedNodes is GONE. It existed to park a structurally
  // disconnected node just outside your content, because dropping it into an
  // existing view left the layout free to pack it against the window edge. The
  // route view replaced that case entirely: nothing is ever added to a view any
  // more, the view is replaced by the route, and every node in a route is
  // connected to the next. Its .imported-mark class is still cleared on exit in
  // case an older session left one behind.

  // 2026-08-29 — the shortest path from where you are to where they are.
  //
  // Entirely local: the whole corpus is resident, so this is a Dijkstra in
  // memory — no query, and nothing asked of the partner, which is the principle
  // that these controls never touch remote structure.
  //
  // HUBS EXCLUDED — root, the Entry nodes, and __root_edge__. They connect
  // broadly, so paths would route up through the hierarchy and back down, and if
  // everything is four hops from everything by way of the root then the answer
  // carries no information. Excluding them forces the path through the
  // meaningful channel: shared clusters, which is what the corpus's 1,640
  // CLUSTER_REL edges are.
  function findBridge(fromNode, toNode) {
    if (!fromNode || !fromNode.length || !toNode || !toNode.length) return null;
    try {
      // 2026-08-29 — GATEWAYS excluded too. The user found routes "commoning out
      // on the gateways, which leaves a lot unsaid", and that is exactly right:
      // a gateway carries up to 48 CONTAINS_CLUSTER edges, so it is as much a hub
      // as the root. A route through one says only "these are both in the
      // corpus". Excluded as INTERMEDIATES; still reachable as an endpoint.
      const hubs = cy.nodes().filter(n => {
        const ty = n.data('type');
        return ty === 'root' || ty === 'Entry' || (ty === 'TextNode' && n.data('gateway'));
      });
      // Never exclude the two ENDS, whatever they are. Dijkstra needs its root
      // in the collection, and the partner may legitimately be standing on an
      // Entry node — excluding it would fail every route to them.
      const drop = hubs.difference(fromNode).difference(toNode);
      const searchable = cy.elements()
        .difference(drop)
        .difference(drop.connectedEdges())
        .difference(cy.edges('[type="__root_edge__"]'));
      const path = searchable.dijkstra({ root: fromNode, directed: false }).pathTo(toNode);
      if (!path || !path.length) return null;              // unreachable without hubs
      const hops = path.nodes().length - 2;                // exclude both endpoints
      if (hops > BRIDGE_MAX) {
        console.log('[bridge] nearest route is', hops, 'nodes — beyond the cap of', BRIDGE_MAX);
        return null;
      }
      return path;
    } catch (err) {
      console.warn('[bridge] failed:', err && err.message);
      return null;
    }
  }

  // 2026-08-29 — THE NEXT STEP. Recomputed whenever either of you moves, and
  // drawn as a dotted blue arrow from where you are to the first node on the way
  // to your partner.
  //
  // The whole route was too much to read; one step is not. And it costs almost
  // nothing on screen, because the first hop from your current node is a DIRECT
  // NEIGHBOUR — usually already visible, so the arrow points at something you can
  // already tap and no new node appears at all.
  //
  // Follow it and it recomputes from where you land. If your partner is doing the
  // same, the two of you close on each other without either having to know where
  // the other is going.
  let stepEdgeId = null, stepNodeId = null, hopDistance = null;
  // 2026-08-29 — where they are IN THE WORK, when that is a meaningful thing to
  // say: same work, and a route that never leaves it. Within a work the route
  // runs along CHILD, which IS the seq order, so the hop count already equals the
  // gap — what it cannot say is which SIDE of you they are on, and that is the
  // whole difference. Four verses forward is an invitation; four verses back is
  // asking you to un-read something.
  let remoteSeq = null, remoteAhead = false;

  function clearNextStep() {
    hopDistance = null; remoteSeq = null; remoteAhead = false;
    if (stepEdgeId) {
      const e = cy.getElementById(stepEdgeId);
      if (e.length) e.removeClass('route-step route-back');
    }
    stepEdgeId = null; stepNodeId = null;
  }

  function updateNextStep() {
    clearNextStep();
    if (routeActive) return;                 // the full route is already on screen
    if (!remoteCurrentId || !pairingState || !pairingState.active) return;
    const from = (lastReadNodeId && lastReadNodeCy === cy) ? cy.getElementById(lastReadNodeId) : null;
    const to   = cy.getElementById(remoteCurrentId);
    if (!from || !from.length || !to.length) return;
    if (from.id() === to.id()) return;        // you are there — the Snap ring says so

    const path = findBridge(from, to);
    if (!path) return;
    const nodes = path.nodes();
    if (nodes.length < 2) return;
    const next = nodes[1];

    // Adjacent by construction, so a REAL edge always exists — nothing synthetic
    // is drawn, and the arrow is the corpus's own relationship, marked.
    hopDistance = nodes.length - 1;   // the count stands whether or not an arrow is drawn

    // Their position in the work, computed BEFORE any early return: the readout
    // is wanted even when the arrow is not, and it is the countdown that makes
    // waiting for someone legible.
    const work = from.data('source_text');
    const inWork = !!work && to.data('source_text') === work &&
                   nodes.every(nd => nd.data('source_text') === work);
    if (inWork) {
      const mySeq = from.data('seq'), theirSeq = to.data('seq');
      if (typeof mySeq === 'number' && typeof theirSeq === 'number') {
        remoteSeq = theirSeq; remoteAhead = theirSeq > mySeq;
      }
    }

    // 2026-08-29 — DRAW NOTHING WHEN THE OVERLAP ALREADY SAYS IT.
    //
    // In a TextNode view your linked Clusters are on screen, so when you share a
    // cluster with your partner — which is 80% of pairs, at two hops — that
    // cluster is ALREADY visible on both screens wearing a blue ring. The route
    // system would be pointing at something the halos have already answered.
    //
    // Worse than redundant: at two hops EVERY shared cluster is an equally short
    // way to them, so an arrow picks one arbitrarily and implies it is the way.
    // Saying nothing is more honest — tap any blue node.
    //
    // The test is on the node itself rather than on the distance, so it adjusts
    // to the view: a Cluster view does not show one-hop neighbours, and there the
    // arrow is still needed at the same distance.
    if (next.visible() && remoteViewIds.has(next.id())) return;

    const link = from.edgesWith(next).first();
    if (!link || !link.length) return;

    if (!next.visible()) next.show();
    link.show().addClass('route-step');
    stepEdgeId = link.id();
    stepNodeId = next.id();

    // A step BACKWARDS down the reading spine is a different act from a step
    // onward, so it is drawn differently — an invitation to return, not to
    // continue. Only ever a probably: they may not be "behind" at all, just
    // elsewhere in the text. So it flags, and never forbids.
    if (remoteSeq !== null && !remoteAhead) link.addClass('route-back');
  }

  // 2026-08-29 — THE ROUTE VIEW. Pressing Remote replaces your view with just
  // the chain of nodes from where you are to where your partner is.
  //
  // Adding their node to your existing view produced a graph too complicated to
  // read — the user's judgement twice over, and the second time the bridge made
  // it worse rather than better, because a path drawn THROUGH a full cluster
  // view is one more thing on top rather than an explanation.
  //
  // Shown ALONE it is an explanation: five nodes and the edges between them,
  // answering "how do I get from here to there" and nothing else. Your ordinary
  // view comes back with the Local control, which is the existing Back — the
  // route is an ordinary view change, so saveState already covers it.
  function showRouteToPartner() {
    if (!remoteCurrentId) return;
    const target = cy.getElementById(remoteCurrentId);
    if (!target.length) return;
    const from = (lastReadNodeId && lastReadNodeCy === cy) ? cy.getElementById(lastReadNodeId) : null;
    if (!from || !from.length) {
      console.log('[route] nowhere to route FROM — select a node first');
      return;
    }
    if (from.id() === remoteCurrentId) {
      console.log('[route] you are already on their node');
      return;
    }

    saveState();                      // Local/Back restores your view
    const path = findBridge(from, target);
    mergedRemoteIds.clear();
    bridgeIds.clear();
    cy.elements().hide();

    if (path) {
      path.nodes().show();
      path.edges().show().addClass('bridge-edge');
      path.nodes().forEach(pn => { if (pn.id() !== from.id()) bridgeIds.add(pn.id()); });
      console.log('[route] showing', path.nodes().length, 'nodes,', path.nodes().length - 1, 'hops');
    } else {
      // No route within the cap. Show the two ends anyway and let the absence of
      // a line between them say it — that is a fact about the corpus, and more
      // useful than refusing to do anything.
      from.show();
      target.show();
      console.log('[route] no near route — showing both ends, unconnected');
    }

    mergedRemoteIds.add(remoteCurrentId);
    routeActive  = true;
    localViewIds = new Set(cy.nodes(':visible').map(n => n.id()));
    runLayout(cy, from);
  }

  // The route is transient: it must not be re-shown after the view it replaced
  // comes back, which is what applyMergedView would otherwise do on every
  // navigation. Emptying the sets is what stops that.
  function exitRouteView() {
    if (!routeActive) return;
    routeActive = false;
    clearNextStep();
    cy.edges('.bridge-edge').removeClass('bridge-edge');
    cy.nodes('.imported-mark').removeClass('imported-mark');
    mergedRemoteIds.clear();
    bridgeIds.clear();
  }

  // The ✕ leaves the route, exactly as the Local control does. Kept as a second
  // way out because Local also unwinds your navigation history, and someone who
  // only wants their view back should not have to think about which.
  function clearMergedView() {
    if (!routeActive) return;
    if (!restoreState()) exitRouteView();
    console.log('[route] left');
  }

  function receiveRemoteView(data) {
    if (!data) return;
    remoteViewIds   = new Set(Array.isArray(data.ids) ? data.ids : []);
    remoteCurrentId = data.url || null;
    remotePrevId    = data.previous || null;
    // Resolvable HERE, not merely received: an id that names nothing in this
    // graph is useless later, and counting now is what makes a mismatch visible
    // while it is still cheap to explain.
    let known = 0;
    remoteViewIds.forEach(id => { if (cy.getElementById(id).length) known++; });
    console.log('[remote-view] received', remoteViewIds.size, 'ids,',
                known, 'resolvable | current=', remoteCurrentId, '| prev=', remotePrevId);
    renderMarks();     // the overlap re-lights immediately — nothing moves
    updateNextStep();  // they moved: the way to them changed
  }

  function pushBn(id) {
    const i = bnStack.indexOf(id);
    if (i !== -1) bnStack.splice(i, 1);        // revisiting moves it to the top
    bnStack.unshift(id);
    while (bnStack.length > BN_CAP) bnStack.pop();
    bnCursor = 0;                              // their move resets your browsing
  }

  // The ONE place a GN is minted: a click on the LIVE BN. That is what makes
  // this cheap — your marker lands on their screen on the node they are
  // standing on, so both sides record the same moment with no protocol at all.
  // A click on a stale remote breadcrumb chip navigates but mints NOTHING:
  // there is no convergence to record, and a green mark for a node your partner
  // has already left would be a fiction.
  function pushGn(id) {
    const i = gnStack.indexOf(id);
    if (i !== -1) gnStack.splice(i, 1);      // revisiting moves it to the top
    gnStack.unshift(id);
    while (gnStack.length > GN_CAP) gnStack.pop();
    updateGnBtn();
  }
  let snapNodeId    = null;   // node currently carrying BOTH marks, or null
  // Did WE reveal this node, or was it already part of the user's view? Only a
  // node we revealed may be hidden again when the BN moves on — hiding one the
  // user had navigated to would delete part of their own view.
  let bnWasRevealed = false;
  // Edges WE revealed, so retiring can put exactly those back. Same rule as
  // the node: never hide an edge the view itself had shown.
  let bnShownEdges = null;
  // Types the design draws at opacity 0 on purpose — structural links that
  // exist for derivation and layout, not for reading. edge.bn-edge sits LATER
  // in the stylesheet than their rules, so for equal specificity it wins and
  // marking one would override that zero, drawing a line the graph is meant
  // never to show.
  const BN_EDGE_SKIP = new Set(['CONTAINS_CLUSTER', '__root_edge__']);
  // 2026-08-22 — the high-level navigation views. There the graph is a few
  // large hub nodes spread wide, and a BN sized to whatever peer happens to be
  // on screen, dropped at a fraction of the extent, lands at a scale that
  // makes no sense. Suppress it on the main canvas entirely; the breadcrumb
  // trail still carries the partner's position, so nothing is lost.
  //
  // The test is which node is CENTRED, not which are on screen. Those are
  // very different: selecting a Family leaves Conversations sitting in the
  // view, and an on-screen test wrongly suppressed the whole Family level.
  //
  // lastParentNode is the right signal of the three available. activeNodeId is
  // nulled by restoreState, and lastReadNodeId is never re-set by it — both go
  // wrong on Back, the navigation most likely to return you to the top, which
  // is exactly when this must be right. lastParentNode is set by every expand
  // AND restored from the saved state on Back.
  const BN_SUPPRESS_HUBS = new Set(['Settling', 'Gateways', 'Conversations']);
  function bnViewSuppressed() {
    const centre = lastParentNode;
    if (!centre || !centre.length) return true;     // boot, and the root view
    const type = centre.data('type');
    if (type === 'root') return true;
    return type === 'Entry' && BN_SUPPRESS_HUBS.has(centre.data('name'));
  }

  // Put the BN out of sight WITHOUT forgetting it — bnNodeId and bnOuter
  // survive, so navigating down to an ordinary view brings it straight back
  // via the re-assert. Distinct from retireBlueNode, which forgets.
  function hideBlueVisualsForView() {
    clearBlueEdges();
    if (!bnNodeId) return;
    const n = cy.getElementById(bnNodeId);
    if (!n.length) return;
    if (isExploreAnchor(bnNodeId)) {
      // Green is NOT suppressed at the top-level views (§10) — it is the way
      // back. So leave the node alone and let renderMarks repaint it green.
      gnWasRevealed = gnWasRevealed || bnWasRevealed;
    } else {
      clearMarksFrom(n);
      const isLocalCentral = (lastReadNodeId === bnNodeId && lastReadNodeCy === cy);
      n.removeStyle('opacity');      // unconditional: it may survive on screen
      if (bnWasRevealed && !isLocalCentral) { n.removeStyle(BN_SIZE_KEYS); n.hide(); }
    }
    bnWasRevealed = false;
    renderMarks();          // restore the local white mark clearMarksFrom stripped
  }

  // 2026-08-25 — the local mark is AMBER, not white: the same #7f6d00 as
  // #cy-you, .card.local .card-head and .hi-bread. That makes the three marks
  // read as one scheme — local amber, remote blue, agreed green — and green
  // then sits between the two it is made of.
  //
  // Named for its ROLE rather than its colour, because "MARK_WHITE = amber"
  // is exactly the sort of stale name that misleads a future reader.
  //
// MARK_LOCAL / MARK_SUCCESSOR are declared at module scope — see there.
  const MARK_BLUE  = '#4a9bff';
  // §5 — the agreed node's ring, DERIVED from the two breadcrumb colours rather
  // than picked: hue 134° sits midway between local gold (51°) and remote navy
  // (216°). Agreed is made from local and remote, and now says so.
  //
  // Mixing the two literally does NOT work — averaging or adding them lands on
  // olive at hue 68-69°, barely 17° from the gold and 1.4:1 from it in
  // luminance. Additive yellow + blue gives grey-olive on a screen; the pigment
  // intuition does not transfer. Only the hue midpoint gives an actual green.
  //
  // 6.8:1 against the canvas, 1.7:1 from the gold ([[user-colour-vision]] —
  // never hue alone, so the luminance gap matters).
  const MARK_GREEN = '#1bbb40';
  let   gnWasRevealed = false;

  function clearMarksFrom(node) {
    if (!node || !node.length) return;
    try { node.stop(true); } catch (_) {}   // cancel a pulse still in flight
    node.removeStyle('border-width border-color border-opacity border-position ' +
                     'outline-width outline-color outline-opacity outline-offset ' +
                     'background-fill background-gradient-stop-colors ' +
                     'background-gradient-stop-positions');
  }

  // The RIM glows, not the core. A radial gradient is the obvious way to make
  // a node conspicuous, but the LABEL sits in the middle — a bright centre
  // fights it for contrast, on nodes whose labels are already tight. Holding
  // the node's own colour across the middle and running it out to a blue rim
  // keeps the text on its normal background and reinforces the halo instead
  // of competing with it.
  //
  // THE STOP POSITIONS ARE NOT INTUITIVE. Cytoscape builds a node's radial
  // gradient as createRadialGradient(cx, cy, 0, cx, cy, max(paddedWidth,
  // paddedHeight)) — the radius is the node's FULL long dimension, not half
  // of it. So the node's own edge sits at 50% along the gradient, and
  // everything from 50% to 100% is painted outside the shape where it can
  // never be seen. A stop at 100% therefore does nothing at all, which is
  // exactly how the first attempt failed: it looked like the property was
  // unsupported when in fact the blue was landing off the node.
  //
  // Hence blue by 50%. On a wide node the short axis reaches only
  // (height/2)/width along the radius, so the glow lands on the long-axis
  // ends and the corners rather than evenly all round — inherent to putting
  // a circular gradient on a rectangle, and acceptable: it reads as the node
  // being lit from its edges.
  function applyBlueFill(node) {
    const base = bnBaseColour(node);
    node.style({
      'background-fill': 'radial-gradient',
      'background-gradient-stop-colors': base + ' ' + base + ' ' + MARK_BLUE,
      'background-gradient-stop-positions': '0% 30% 50%',
    });
  }

  // The gradient must start from what the node ACTUALLY renders as, which is
  // not data('colour'). Several types set background-color literally in the
  // stylesheet and never touch that data field: gateway TextNodes are white
  // with black text and carry colour:null in the DB, so reading the data field
  // gave the grey fallback and painted a dark core under black text —
  // unreadable, and the opposite of the node's real appearance. The root node,
  // the Gateways square and the snake view's inline fills are all the same.
  //
  // The result is then normalised to a SPACE-FREE hex string. Cytoscape splits
  // multi-value properties on whitespace, so an "rgb(255, 255, 255)" returned
  // by the style getter would be torn into three broken tokens.
  function bnBaseColour(node) {
    // In INK MODE every body is black, so the rendered background no longer
    // identifies anything — the label does. Without this the three corner
    // controls would all come out black and the blue radial fill would have no
    // base to grow from. Falls back to the label colour for the types that
    // carry no stored colour (gateways, the Gateways square, the root).
    const raw = INK_MODE
      ? (node.data('colour') || node.style('color'))
      : (node.style('background-color') || node.data('colour'));
    const hex = v => '#' + v.map(n =>
      Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
    if (Array.isArray(raw)) return hex(raw.slice(0, 3));
    if (typeof raw === 'string') {
      const m = raw.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
      if (m) return hex([+m[1], +m[2], +m[3]]);
      const s = raw.replace(/\s+/g, '');
      if (s) return s;
    }
    return '#666666';
  }

  // Arrival pulse. The static marks say WHERE the partner is; nothing said
  // WHEN they moved — which is why an arrival on a node already on screen was
  // so easy to miss: it simply gained a thin ring, with no perceptible moment
  // of change. Motion is detected pre-attentively and does not depend on
  // telling two blues apart, so it carries where a colour cue would not.
  //
  // The RING pulses, never the body: an outline draws entirely outside the
  // shape, so the label is untouched throughout.
  //
  // Rest values are READ, not assumed — solo and Snap use different widths,
  // and hardcoding either would leave the other wrong when it settles.
  // 6 cycles at 560ms each ~= 3.4s. Doubled from 3 on 2026-08-22: the rhythm
  // was right, only the duration was short. Extended by adding CYCLES rather
  // than slowing each one, so the beat the user approved is unchanged.
  function pulseBlueNode(node, cycles = 6) {
    if (!node || !node.length) return;
    try { node.stop(true); } catch (_) {}
    const restW = node.numericStyle('outline-width');
    const restO = node.numericStyle('outline-opacity');
    if (!restW) return;                        // nothing drawn to pulse
    let done = 0;
    const settle  = () => node.style({ 'outline-width': restW, 'outline-opacity': restO });
    const outward = () => {
      if (done++ >= cycles) { settle(); return; }
      node.animate({
        style: { 'outline-width': restW * 3, 'outline-opacity': Math.max(0.05, restO * 0.2) },
        duration: 300, complete: inward,
      });
    };
    const inward = () => node.animate({
      style: { 'outline-width': restW, 'outline-opacity': restO },
      duration: 260, complete: outward,
    });
    outward();
  }

  // THE RULE (§1.2): the OUTER ring is whoever arrived last. Rings accrete
  // outward, like tree rings. Whichever mark belongs inside is drawn as the
  // BORDER, whichever outside as the OUTLINE — the pairing is not fixed.
  // An outline draws entirely outside the shape, so it never eats the node's
  // interior the way a border does (which is what nibbles tight labels).
  // 2026-08-29 — AMBER IS NOT A CATEGORY, IT IS THE GROUND. Everything on your
  // screen is your view, so every visible node wears amber; blue is an
  // ANNOTATION on top of it, saying "and your partner is looking at this too".
  //
  // The user's correction, and it is better than the model it replaces. Their
  // node, once fetched onto your graph, IS yours — it simply arrived by
  // computation rather than by navigation. There was never a third kind of node,
  // only a leftover from the design where whole views were merged: with the
  // overlap model, nothing on your screen is non-local by definition.
  //
  // It also dissolves a problem rather than solving one — bridge nodes on a
  // computed path need no state of their own, because they are local like
  // everything else that is here.
  //
  // Ring geometry is unchanged and deliberately so: amber occupies [0,W] beyond
  // the body whether it is drawn as the outline (alone) or the border (with blue
  // outside it), so gaining a blue ring does not make the amber one move.
  //
  // Painted INLINE in one pass rather than by classes. The class argument was
  // that clearMarksFrom strips inline styles, which is true but only matters if
  // membership is painted somewhere other than here. This function owns every
  // visible node and runs on every change, so a stripped style is restored
  // immediately — and a class scheme would have needed a rule for every
  // local-tier x remote-tier combination.
  function renderMembership(centralNode, prevId, isGreen) {
    const centralId = (centralNode && centralNode.length) ? centralNode.id() : null;
    const rCur = remoteCurrentId, rPrev = remotePrevId;
    const dim = bnGone ? 0.4 : 1;          // §2 — partner left: dim, never remove

    const tier       = (id, cur) => id === cur ? LOCAL_HALO_CURRENT  : LOCAL_HALO_REST;
    const remoteTier = (id, cur) => id === cur ? REMOTE_HALO_CURRENT : REMOTE_HALO_REST;

    cy.batch(() => {
      cy.nodes(':visible').forEach(n => {
        if (isGreen(n)) return;            // a recorded convergence keeps its own ring
        const id  = n.id();
        // It is visible, so it is yours. Their view is consulted only to decide
        // whether to ADD the blue ring.
        const isR = remoteViewIds.has(id) || mergedRemoteIds.has(id) || id === rCur;

        const lOp = tier(id, centralId);
        const rOp = remoteTier(id, rCur) * dim;

        // The Snap: you are both ON this node. ONE green ring, not two — two
        // rings say "two marks that coincide", one says "a shared position".
        if (isR && id === centralId && id === rCur) {
          n.style({ 'border-width': 0, 'outline-width': 8, 'outline-color': MARK_GREEN,
                    'outline-opacity': 0.9, 'outline-offset': 0 });
          return;
        }

        if (isR) {
          // Two bands, and they must OVERLAP rather than abut: where two
          // separately-stroked paths merely touch, antialiasing leaves a
          // hairline of canvas between them and the eye reads three bands.
          n.style({
            'border-width': LOCAL_HALO_W, 'border-position': 'outside',
            'border-color': MARK_LOCAL, 'border-opacity': lOp,
            'outline-width': LOCAL_HALO_W, 'outline-color': MARK_BLUE,
            'outline-opacity': rOp, 'outline-offset': LOCAL_HALO_W - 1,
          });
          return;
        }

        // Local only: one amber ring, in the same place the border would have
        // been. Every branch sets every property it depends on — .style() is
        // inline and persists, so a node that has been through the branch above
        // keeps its border until something explicitly clears it.
        n.style({
          'border-width': 0,
          'outline-width': LOCAL_HALO_W,
          'outline-color': MARK_LOCAL,
          'outline-opacity': lOp,
          'outline-offset': 0,
        });
      });
    });
  }

  function renderMarks() {
    // Central node: white, unless the BN shares it (handled below).
    const centralNode = (lastReadNodeId && lastReadNodeCy === cy)
      ? cy.getElementById(lastReadNodeId) : null;
    const bn = (bnNodeId && !bnViewSuppressed()) ? cy.getElementById(bnNodeId) : null;
    const together = !!(centralNode && bn && centralNode.length && bn.length &&
                        centralNode.id() === bn.id());

    // §2 — the Snap IS the trigger for Explore, and it is already computed
    // here as an emergent property of two independent marks. Publishing it
    // rather than recomputing keeps one definition of "we are both here", and
    // it decomposes by itself the moment either user navigates away.
    const prevSnap = snapNodeId;
    snapNodeId = together ? bn.id() : null;
    // 2026-08-28 — snapNodeId is still PUBLISHED (it is the definition of "we
    // are both here" and is cheap), but nothing acts on the transition any
    // more. The offer that used to lapse here no longer exists.

    // §5 — the agreed node wears ONE green ring, and it replaces whatever else
    // would have been drawn there. Two rings mean "two independent marks that
    // happen to coincide"; one means "a shared commitment", and the difference
    // reads without a legend.
    const green   = greenNodeEl();
    const greenId = green ? green.id() : null;
    const greenIdOf = g => (g && g.length ? g.id() : null);
    const isGreen = n => !!(n && n.length && greenId && n.id() === greenId);

    const prevN  = prevNodeEl();
    const prevId = prevN ? prevN.id() : null;

    if (green) {
      // border-width 0 for the same reason as the solo blue ring: a Cluster's
      // own darkened border would otherwise draw over the ring's inner pixels.
      green.style({
        'border-width': 0,
        'outline-width': 6,
        'outline-color': MARK_GREEN,
        // §6 — partner left, we did not. Dim, never remove: the anchor is
        // still ours and still tappable.
        'outline-opacity': 0.85,
        'outline-offset': 0,
      });
    }

    // 2026-08-29 — ONE membership pass over every visible node, replacing the
    // four branches that painted the current node, the predecessor and the
    // partner's position separately (remote_view_spec.md §1).
    //
    // It HAS to be one pass: a node can now be in both views at once, and each
    // of those branches assumed it owned the node it painted, so your current
    // node and the partner's position could not both be true of one node
    // without one silently overwriting the other.
    renderMembership(centralNode, prevId, isGreen);

    if (bn && bn.length) applyBlueFill(bn);
    updateBnBtn();      // the corner controls track the same state as the halos
    updateGnBtn();
    const clearBtn = document.getElementById('clear-merge-btn');
    if (clearBtn) clearBtn.classList.toggle('visible', routeActive);
  }

  // 2026-08-28 — the EXPLORE CONTROL and its four-state label machine are gone,
  // along with the offer / accept / cancel / leave protocol behind them.
  //
  // A GN is minted by a deliberate arrival at your partner's position — the
  // Remote control or a tap on their haloed node — so there is nothing left for
  // a negotiation to settle. The button did a job nothing needed.
  //
  // KEPT DELIBERATELY, because a consent step IS wanted later for SAVING:
  //   - editing_spec.md §7, the rule that the exploratory and the write
  //     vocabularies must never share a control or a word, so nobody presses
  //     Save from muscle memory built on Explore;
  //   - showSnapDialog below, disabled but whole, as the nearest thing to a
  //     template for that dialog;
  //   - the server relay's shape — paired check, partner-online check, url
  //     only, never the sender's payload.
  // The removed code is recoverable from git if the save flow wants it, but it
  // should be re-derived rather than restored: it was built for a negotiation
  // over WHERE to work, and the save is a negotiation over WHAT to write.

  // Retained for gn_mark, which is the only partner-to-partner message this
  // module still sends. Name kept because the server relay and both whitelists
  // still speak of "explore" types.
  function sendExplore(type, url) {
    const ws = wsRef.current;
    if (!ws || !ws.connected) return false;
    ws.emit('msg', { type, url: url || null });
    return true;
  }

  // Incoming explore traffic. Exposed to init(), which owns the message
  // dispatch — the state it mutates lives in THIS scope, so it must be called
  // rather than assigned across the boundary.
  // 2026-08-28 — reduced to ONE message. The offer / accept / cancel / leave /
  // denied cases went with the protocol; gn_mark is all that crosses between
  // partners now, besides the position crumbs themselves.
  function handleExploreMsg(msg) {
    switch (msg.type) {
      case 'gn_mark': {
        // Your partner followed you here. Record it on this side too — by URL,
        // never by their cy id, which does not mean the same node in this graph.
        // Resolved through the shared helper, so a node newer than our graph
        // load is FETCHED rather than silently dropped.
        resolvePartnerNode(msg.url, null)
          .then(n => { if (n) { pushGn(n.id()); renderMarks(); } })
          .catch(err => console.warn('[gn_mark] resolve failed', err && err.message));
        break;
      }
      // The server still answers a send with explore_denied when the partner
      // is offline. Nothing to undo now — a gn_mark that did not arrive simply
      // means their side has no record of it — but say so rather than going
      // quiet, which was the failure mode all of this replaced.
      case 'explore_denied':
        if (msg.reason === 'partner_offline') {
          prependSystemCard('Your partner is not connected just now, so they have no record of that.');
        }
        break;
      default: return;
    }
  }

  // Show the partner's arrival as a node on OUR graph (§1, §2, §3, §4).
  // LATEST WINS (§2): a fast-moving partner would otherwise back up a queue of
  // stale positions; the question this answers is "where are they NOW".
  // 2026-08-28 — resolve a url sent by the partner to a node in OUR graph,
  // fetching it if it post-dates our load (§7.3).
  //
  // EXTRACTED because showBlueNode had this fallback and the gn_mark handler did
  // not: that one did a bare nodeByUrl and gave up in silence. So for any node
  // newer than the receiver's graph load, the BLUE mark appeared — fetched —
  // while the GREEN one did not, on that side only and with nothing said. That
  // is precisely the shape of an intermittent "green on one side" fault, and one
  // copy of the logic stops the two drifting apart again.
  async function resolvePartnerNode(url, mainId) {
    let node = url ? nodeByUrl(url) : null;
    if (!node && mainId) {
      const byId = cy.getElementById(mainId);            // pre-url crumbs
      if (byId.length) node = byId;
    }
    if (!node && url) {
      try {
        const ws = wsRef.current;
        if (ws && ws.connected) {
          const rows = await fetchNodeByUrl(ws, url);
          if (rows && rows.length) { addFetchedRows(cy, rows); node = nodeByUrl(url); }
        }
      } catch (err) {
        console.warn('[partner-node] fetch failed for', url, err && err.message);
      }
    }
    return (node && node.length) ? node : null;
  }

  async function showBlueNode(data) {
    const node = await resolvePartnerNode(data && data.url, data && data.mainId);

    if (!node) {
      // §8.3 — show NOTHING rather than a provisional node that could not
      // honestly become your central node when tapped. But SAY so: silence is
      // the failure mode this replaces.
      prependSystemCard('Your partner has moved to somewhere this graph does not have yet. Reload to catch up.');
      return;
    }

    // Retire the previous BN before adopting the new one. Clearing its STYLE
    // is not enough: a node we revealed stays on the canvas, so successive
    // arrivals pile up on top of one another. Put it back out of sight —
    // unless the user has since made it their own central node, in which case
    // it is part of their view now and not ours to remove.
    if (bnNodeId && bnNodeId !== node.id()) retireBlueNode();

    bnNodeId = node.id();
    pushBn(bnNodeId);
    bnGone   = false;
    // Blue arrived last. If we are already standing here, that is §1.2 case A
    // ("they came to me") — white stays inside, blue takes the outer ring.
    bnOuter  = 'blue';

    if (bnViewSuppressed()) { hideBlueVisualsForView(); flashBnBtn(); return; }
    placeBlueNode(node);
    renderMarks();
    markBlueEdges(node);
    // No halo to tap means the button is the only route — say so. Checked AFTER
    // renderMarks, since that is what decides whether the node is on screen.
    if (!node.visible()) flashBnBtn();
    else pulseBlueNode(node);
  }

  // Undo everything showBlueNode did to the previous node.
  // True when the node the Blue Node is leaving is ALSO the agreed node. Then
  // it is not ours to strip or hide — the green anchor owns it now.
  function isExploreAnchor(id) {
    return gnStack.indexOf(id) !== -1;            // a recorded convergence
  }

  function retireBlueNode() {
    if (!bnNodeId) return;
    const prev = cy.getElementById(bnNodeId);
    if (prev.length) {
      clearBlueEdges();
      if (isExploreAnchor(bnNodeId)) {
        // 2026-08-24 — the partner has moved off the node you both agreed on.
        // Retiring the Blue Node used to clear that node's marks and hide it,
        // which took the GREEN anchor with it: A navigating away made B's green
        // mark disappear. The reveal transfers to green rather than being undone,
        // so whoever revealed it, green is now responsible for putting it back.
        gnWasRevealed = gnWasRevealed || bnWasRevealed;
        // If it was PARKED, it is sitting in the Blue Node's bottom-right
        // corner — where the partner's new position is about to be drawn.
        // Move it to green's own corner so the two never overlap.
        if (gnWasRevealed) prev.position(markCorner(prev, 'green'));
      } else {
        clearMarksFrom(prev);
        const isLocalCentral = (lastReadNodeId === bnNodeId && lastReadNodeCy === cy);
        prev.removeStyle('opacity');   // unconditional: it may survive on screen
        if (bnWasRevealed && !isLocalCentral) { prev.removeStyle(BN_SIZE_KEYS); prev.hide(); }
      }
    }
    bnNodeId = null; bnOuter = null; bnWasRevealed = false;
  }

  // Some views lay out their own grid and set width/height/font-size INLINE,
  // computed from the live canvas — the snake view does, clamped [46,120]. A
  // node WE revealed never went through that layout, so it keeps its type
  // default (a TextNode is 120 wide) and towers over neighbours the layout has
  // shrunk to fit. How badly depends on the canvas: a phone's narrow column
  // lands near the top of the clamp and the mismatch does not show, while a
  // desktop's wider grid sizes nodes down and the default looks twice too big.
  // Copy the size the view is actually using rather than re-deriving it.
  const BN_SIZE_KEYS = 'width height font-size';
  // 2026-08-22 — a BN we REVEALED is drawn translucent: it is not part of the
  // view the user built, it is news from elsewhere, and the whole node says so
  // — body, halo and label together. Cytoscape's element-level `opacity`
  // multiplies the lot, which is why it is one property rather than
  // background-/outline-/text-opacity set separately.
  //
  // A BN that was ALREADY on screen stays fully opaque: it is a node of the
  // user's own view and dimming it would degrade what they are reading.
  const BN_REVEAL_OPACITY = 0.75;
  function sizeBlueNodeToView(node) {
    node.removeStyle(BN_SIZE_KEYS);          // back to the type default first
    const peer = cy.nodes('.snake-section').filter(n => n.visible() && n.id() !== node.id()).first();
    if (!peer.length) return;                // ordinary view: the default IS right
    node.style({
      'width':     peer.numericStyle('width'),
      'height':    peer.numericStyle('height'),
      'font-size': peer.style('font-size'),
    });
  }

  // The agreed node, parked top-left when it is not part of the current view.
  // Same treatment as the Blue Node: reveal it rather than lose the anchor,
  // and remember that WE revealed it so it can be put back.
  // 2026-08-27 — not parked any more, for the third and last time: a cytoscape
  // node has ONE position. The corner is #gn-btn. The green halo still paints
  // wherever a recorded node is genuinely in your view.
  function placeGreenNode(_node) { /* the corner is a DOM button now */ }

  // Undo everything the previous-node mark did, before the id moves on. Same
  // asymmetry as the Blue Node: revealing and marking are separate effects, so
  // clearing the style without un-revealing leaves a node on the canvas that
  // nothing owns.
  function clearPrevVisuals() {
    if (!prevReadNodeId) return;
    const n = cy.getElementById(prevReadNodeId);
    if (!n || !n.length) return;
    clearMarksFrom(n);
  }

  function prevNodeEl() {
    if (!prevReadNodeId || prevReadNodeId === lastReadNodeId) return null;
    const n = cy.getElementById(prevReadNodeId);
    return n && n.length ? n : null;
  }

  // 2026-08-27 — the previous node is marked IN PLACE and never parked.
  //
  // It was briefly parked top-right as a graph node (d8141fc), before the
  // corner marks were redesigned as DOM controls — see editing_spec.md §v0.2
  // and corner_controls_plan.md. A parked graph node in the corner is the thing
  // being retired, so it goes now rather than sitting on screen as a leftover
  // of a superseded design.
  //
  // The faint amber halo stays: where the node IS structurally present, that is
  // the honest signal, and the corner control will be additional rather than a
  // replacement for it.
  function reassertPrevNode() { /* nothing to re-park */ }

  // 2026-08-28 — the green mark is now driven by the GN STACK rather than by an
  // "active session". The top of the stack is the most recent convergence, and
  // that is what wears the ring; every other recorded node still counts as an
  // anchor (isExploreAnchor) so its halo survives a view change.
  function greenNodeEl() {
    if (!gnStack.length) return null;
    const n = cy.getElementById(gnStack[0]);
    return n && n.length ? n : null;
  }

  // §10 — the green mark is an ANCHOR, not information: it is how the user
  // gets back. Unlike the Blue Node it is NOT suppressed at the top-level
  // views, because that would remove the way home exactly when someone is
  // deepest in the graph.
  function reassertGreenNode() {
    const node = greenNodeEl();
    if (!node) return;
    if (lastReadNodeId === node.id() && lastReadNodeCy === cy) {
      gnWasRevealed = false; node.removeStyle('opacity'); node.removeClass('parked-mark');
    } else placeGreenNode(node);
  }

  // §3 — bottom-right of the current view. If the node is already on screen it
  // is left exactly where it is: moving a node the user is looking at would be
  // worse than not hinting at all.
  // 2026-08-24 — ALWAYS park a mark at its own corner: blue bottom-right, green
  // top-left. Previously a marked node was only moved when it was NOT part of
  // the current view; when it happened to be a visible neighbour it sat
  // wherever the layout put it, so the marks wandered and the user had to hunt
  // for them. A fixed seat means you always know where to look.
  //
  // Returns true if the node had to be REVEALED (it was hidden), which is what
  // decides whether teardown should hide it again. Moving a node that was
  // already on screen is not something to undo.
  function parkMark(node, which) {
    const wasHidden = !node.visible();
    sizeBlueNodeToView(node);          // size FIRST — the corner inset depends on it
    node.position(markCorner(node, which));
    node.style('opacity', BN_REVEAL_OPACITY);
    if (wasHidden) node.show();
    // 2026-08-25 — a PARKED node has been moved out of its structural position,
    // so its edges no longer describe the graph: they run from a viewport
    // corner to whatever is in the middle, and the larger the window the longer
    // they get. That is the "long diagonals mistaken for real topology" the
    // scaling brief warns about in §4. Hide them; the next navigation
    // recomputes the view and shows whatever genuinely belongs.
    node.connectedEdges().hide();
    // 2026-08-25 — tag it so fits can EXCLUDE it. Including a parked mark in
    // cy.fit is a feedback loop: the fit zooms out to reach the corner, which
    // widens the extent, which pushes the next park further out, which widens
    // the next fit. Left alone the marks end up several graph-widths away.
    node.addClass('parked-mark');
    return wasHidden;
  }

  // 2026-08-27 — the BN is NO LONGER PARKED, for the reason PN stopped being
  // parked: a cytoscape node has one position, so it cannot be both in the
  // graph and in a corner. The corner is now #bn-btn, a DOM control.
  //
  // The in-graph blue halo stays wherever the partner's node is genuinely in
  // your view — that is the honest signal, and the control is additional. What
  // goes is the pretence, and with it the edge-hiding, the size-to-view and the
  // .parked-mark exclusion this used to need.
  function placeBlueNode(_node) { /* the corner is a DOM button now */ }

  // The partner's node as a corner control. Unlike the halo it is NEVER
  // suppressed at the top-level views: bnViewSuppressed exists because a graph
  // node drawn at Root or Gateways scale looked absurd, and a fixed-size button
  // has no such problem. Suppressing the way to your partner exactly when you
  // are furthest from them was always the wrong behaviour; it was a workaround
  // for the representation, not a decision.
  // 2026-08-28 — an ORPHAN BN: your partner's node is not in your view, so
  // pressing this is the only way to get it onto your graph. Flash to say there
  // is something new to fetch.
  //
  // 2026-08-29 — ~2.4s total, half the original, but the pulse RATE is 50%
  // quicker. The overlap carries most of the signal now, so the flash is
  // shorter; but what is left is routing the user cannot get any other way, so
  // while it lasts it should be hard to look past. Shorter and more insistent,
  // which are not in tension — a slow pulse is exactly what gets missed.
  //
  // The cue is a spreading ring, not a colour change: it reads as motion and
  // luminance rather than hue, which is the channel to rely on here.
  let bnFlashTimer = null;
  function flashBnBtn() {
    const btn = document.getElementById('bn-btn');
    if (!btn) return;
    btn.classList.remove('bn-alert');
    void btn.offsetWidth;                 // reflow, so a repeat arrival restarts it
    btn.classList.add('bn-alert');
    clearTimeout(bnFlashTimer);
    bnFlashTimer = setTimeout(() => btn.classList.remove('bn-alert'), 2350);
  }

  function updateBnBtn() {
    // Looked up per call, NOT held in a closure const. renderMarks calls this
    // and runs earlier in setupInteractions' body than any const declared here
    // would initialise — a temporal-dead-zone throw that would kill the rest of
    // renderMarks and take the halos with it. Same trap as the init() destructure.
    const bnBtn = document.getElementById('bn-btn');
    if (!bnBtn) return;
    const targetId = bnStack.length ? bnStack[Math.min(bnCursor, bnStack.length - 1)] : bnNodeId;
    const n = targetId ? cy.getElementById(targetId) : null;
    const show = !!(n && n.length && pairingState && pairingState.active);
    bnBtn.classList.toggle('visible', show);
    if (!show) return;
    // A number when you are browsing BACK through their trail: 1 = one position
    // ago. Blank at the cursor's home, where the button means "where they are".
    // The hop count, when there is one and you are not already adjacent. It
    // turns the control into a distance readout — the thing that makes following
    // the arrow feel like closing on someone rather than just navigating.
    // Their position in the work when that means something, the hop count
    // otherwise. The arrow tells you which way; this tells you how far, and the
    // number COUNTS DOWN as they close on you — which is what waiting for
    // someone to catch up actually looks like.
    const suffix = (remoteSeq !== null)
      ? (remoteAhead ? '\u2191' : '\u2193') + remoteSeq
      : ((hopDistance && hopDistance > 1) ? String(hopDistance) : '');
    paintNodeButton(bnBtn, n, suffix, 'Remote:');
    bnBtn.style.borderColor = MARK_BLUE;      // remote, in the mark vocabulary
    // §2 — the partner left: dim, do not remove. They are still where they were.
    // And dim when you are ALREADY on their node: clicking then jumps you to
    // where you already stand, which is correctly a no-op but was a silent one,
    // and a silent no-op reads as a broken button.
    const here = (lastReadNodeId === targetId && lastReadNodeCy === cy);
    bnBtn.style.opacity = (bnGone || here) ? '0.45' : '';
    bnBtn.style.cursor  = here ? 'default' : 'pointer';
  }

  // Following your partner. This is the act corner_controls_plan.md step 4
  // makes the ONLY way a GN is created — a deliberate choice rather than the
  // coincidence of a Snap, which is what deletes the offer/accept/lapse
  // machinery. The GN itself lands in the next slice; the jump comes first.
  //
  // Dispatches by type exactly as the tap handler does, so a jump is an
  // ordinary navigation in every respect — including saveState, which all three
  // expand functions call. That is what lets Back return you across the jump,
  // and it is the whole reason the corner control was wanted: the destination
  // may have no structural path back to where you were.
  // Dispatches by type exactly as the tap handler does, so a jump is an ordinary
  // navigation in every respect — including saveState, which all three expand
  // functions call. That is what lets Back return you across a jump whose
  // destination has no structural path back.
  function jumpToNode(n) {
    markReadNode(n, cy);
    // navigateInto, NOT a second hand-rolled dispatch. It already routes
    // gateways and section-title pages to their own handlers, and duplicating
    // the branch list here sent a jump to a partner's GATEWAY through
    // expandToNode — the whole-neighbourhood path, i.e. exactly the 70-cluster
    // tableau, every single time.
    navigateInto(n);
    addYouChip(n);
    renderMarks();
  }

  function jumpToPartner() {
    const atHead   = (bnCursor === 0);
    const targetId = bnStack.length ? bnStack[Math.min(bnCursor, bnStack.length - 1)] : bnNodeId;
    if (!targetId) return;
    const n = cy.getElementById(targetId);
    if (!n.length) return;

    // Advance BEFORE navigating, so a second press goes one further back rather
    // than sticking on the node you have just arrived at — which is the whole
    // complaint this stack answers. Wraps, so the tour returns to their current
    // position rather than dead-ending.
    if (bnStack.length > 1) bnCursor = (bnCursor + 1) % bnStack.length;

    // A GN is minted ONLY from their CURRENT position. Following them to where
    // they have already been is not a convergence — they are not there, so a
    // green mark saying "we were both here" would be a fiction, and the
    // gn_mark would land on their screen for a node neither of you occupies.
    if (!atHead) { jumpToNode(n); return; }

    pushGn(targetId);          // following your partner IS the record
    // 2026-08-27 — and TELL them, so the record lands on both sides.
    //
    // The plan expected this to be symmetric "for free" — you arrive on the
    // node they are standing on, so they could notice the convergence
    // themselves. They cannot: nothing about your arrival changes their state,
    // because your position reaches them as an ordinary crumb they were already
    // receiving. The convergence is only an event for the side that CHOSE it,
    // so the choice is what has to be sent. One message, no negotiation.
    sendExplore('gn_mark', n.data('url') || null);
    jumpToNode(n);
  }

  // Visiting a snap must not destroy it, so the top rotates to the back rather
  // than being consumed. Repeated presses walk the record and return to where
  // they started — the opposite of the Back button, deliberately.
  function cycleGn() {
    if (!gnStack.length) return;
    const id = gnStack[0];
    const n  = cy.getElementById(id);
    if (!n.length) { gnStack.shift(); updateGnBtn(); return; }   // node went away
    gnStack.push(gnStack.shift());
    jumpToNode(n);
    updateGnBtn();
  }

  function updateGnBtn() {
    const btn = document.getElementById('gn-btn');   // per call — see updateBnBtn
    if (!btn) return;
    const n = gnStack.length ? cy.getElementById(gnStack[0]) : null;
    const show = !!(n && n.length);
    btn.classList.toggle('visible', show);
    if (!show) return;
    paintNodeButton(btn, n, gnStack.length > 1 ? String(gnStack.length) : '', 'Common:');
    btn.style.borderColor = MARK_GREEN;
  }
  const gnBtnEl = document.getElementById('gn-btn');
  if (gnBtnEl) gnBtnEl.addEventListener('click', cycleGn);
  // 2026-08-29 — the Remote control MERGES rather than jumps
  // (remote_view_spec.md §5). Jumping destroyed your context, which is why it
  // needed Back to survive it; merging keeps your context and adds theirs, and
  // their node is then on screen to tap if you do want to go there.
  //
  // jumpToPartner and the BN cursor are left in place but unbound: the retrace
  // stack is PARKED, not deleted, because it may prove unnecessary once you can
  // see where they have been.
  const bnBtnEl = document.getElementById('bn-btn');
  if (bnBtnEl) bnBtnEl.addEventListener('click', showRouteToPartner);
  const clearBtnEl = document.getElementById('clear-merge-btn');
  if (clearBtnEl) clearBtnEl.addEventListener('click', clearMergedView);

  // ALWAYS the bottom-right corner, never a searched-for gap. A node that
  // moves about to dodge obstacles makes the user hunt for it on every
  // arrival; one that is always in the same place can be found without
  // looking. Predictability beats optimality here, so collisions are accepted.
  //
  // In practice it collides LESS than the old 78%/80% did: the layout fits
  // with padding, so the true corner is usually the emptiest part of the
  // canvas, while 78%/80% sat just inside where the content actually is.
  //
  // Inset by the node's own half-size plus air for the halo (the outline
  // reaches 10 beyond the body), so it sits hard in the corner without any
  // part of it running off the canvas.
  //
  // Model coordinates — cy.extent(), width() and height() are all model space,
  // unlike renderedBoundingBox(). Mixing those is a silent zoom-dependent bug;
  // it is the trap that displaced the n_r badge.
  // 2026-08-25 — park against the CONTENT, not the canvas.
  //
  // A cluster view lays its content to roughly the panel width and centres it,
  // while the canvas is the full window. Parking at cy.extent() therefore put
  // the mark hard against the screen edge with the graph in a narrow column in
  // the middle — a long way from anything, which is what made the marks look
  // detached and their edges enormous.
  //
  // So: the corner of what the layout actually occupies, a short gap beyond
  // it, then CLAMPED into the viewport so it can never be pushed off-screen
  // when the content already fills the window. Small diagram -> the mark sits
  // just outside it; full-width diagram -> the old behaviour, at the edge.
  function markCorner(node, which) {
    const halfW = (node.width()  || 40) / 2 + 14;
    const halfH = (node.height() || 30) / 2 + 14;
    const ext   = cy.extent();
    const body  = cy.elements(':visible').not('.parked-mark, .imported-mark');
    const bb    = body.length ? body.boundingBox() : ext;
    const gap   = 26;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const left  = clamp(bb.x1 - gap - halfW, ext.x1 + halfW, ext.x2 - halfW);
    const right = clamp(bb.x2 + gap + halfW, ext.x1 + halfW, ext.x2 - halfW);
    const top   = clamp(bb.y1 - gap - halfH, ext.y1 + halfH, ext.y2 - halfH);
    const bot   = clamp(bb.y2 + gap + halfH, ext.y1 + halfH, ext.y2 - halfH);
    // Agreed top-left, partner bottom-right. ('prev' was here too until
    // 2026-08-27 — it is marked in place now, pending its DOM control.)
    if (which === 'green') return { x: left, y: top };
    return { x: right, y: bot };
  }
  function blueNodeCorner(node) { return markCorner(node, 'blue'); }

  // §4 — thin blue edges to nodes ALREADY on screen. The edges already exist in
  // cy, so this is a class change, not a graph change. Edges to nodes that are
  // not visible are simply not drawn.
  // §5 — every local navigation does cy.elements().hide() and shows a computed
  // set, which would take the BN with it. Re-assert after each. renderMarks()
  // is a pure function of state, and this shows the node again rather than
  // toggling anything, so calling it repeatedly is safe — the property that
  // the 2026-08-20 pane/anchor runaway lacked.
  // Scheduled, not immediate: each navigation calls hide() FIRST and then shows
  // its computed set, so re-asserting inline would be undone a few lines later.
  // A single rAF puts it after that synchronous work. The pending flag makes
  // repeated calls in one frame collapse to one.
  let blueReassertPending = false;
  // Re-asserts BOTH marks after a view change. It used to bail when there was
  // no Blue Node, which would have left the green anchor behind on every
  // navigation — the one thing it must survive.
  function scheduleBlueReassert() {
    if (blueReassertPending) return;
    const wantGreen = gnStack.length > 0;
    // Sticky merge: the merged set is re-shown after every navigation, so this
    // must run even when there is no mark to re-assert.
    if (!bnNodeId && !wantGreen && !prevReadNodeId && !mergedRemoteIds.size) return;
    blueReassertPending = true;
    requestAnimationFrame(() => {
      blueReassertPending = false;
      applyMergedView();          // re-show the route, and re-snapshot what is yours
      updateNextStep();           // you moved: recompute the way to them
      reassertBlueNode();
      reassertGreenNode();
      reassertPrevNode();
      renderMarks();
    });
  }

  // 2026-08-24 — re-park after EVERY layout completes.
  //
  // scheduleBlueReassert parks on the next animation frame, but a navigation
  // then runs a layout, and the fCoSE branches animate for ~450ms afterwards
  // and reposition whatever they are given. So the layout won the race and the
  // mark landed wherever the simulation put it — reported as the green node
  // drawing north-east instead of top-left whenever its node happened to be
  // part of the view.
  //
  // layoutstop is the honest moment: positions are final and nothing else is
  // going to move them. Parking a node emits no layout, so this cannot recurse.
  cy.on('layoutstop', () => {
    try {
      reassertBlueNode();
      reassertGreenNode();
      reassertPrevNode();
      renderMarks();
    } catch (err) { console.warn('[marks] re-park after layout failed', err); }
  });

  // 2026-08-25 — the Snap dialog. Shown when you and your partner first land on
  // the same node, BEFORE any green state exists, to explain what the buttons
  // are for. Session-only suppression: a plain variable, so it resets on reload
  // and never becomes a setting nobody remembers turning on.
  // 2026-08-27 — DISABLED for now, at the user's request: it explains more than
  // is wanted, and it describes the offer/accept flow that the corner-controls
  // redesign is in the middle of retiring (the GN is minted by a BN click now,
  // not by agreeing to anything). Kept whole rather than deleted, because some
  // one-time explanation of the green mark will probably still be wanted once
  // the new model has settled — and it will need rewriting, not restoring.
  const SNAP_DIALOG_ENABLED = false;
  let snapDialogSuppressed = false;
  let snapDialogOpen       = false;
  function showSnapDialog() {
    if (!SNAP_DIALOG_ENABLED) return;
    if (snapDialogSuppressed || snapDialogOpen) return;
    snapDialogOpen = true;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';
    const card = document.createElement('div');
    card.style.cssText = 'background:#1a1a2e;color:#eee;border:1px solid #555;border-radius:6px;padding:16px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;font-family:sans-serif;font-size:14px;line-height:1.5;box-sizing:border-box;';
    card.innerHTML =
      '<p style="margin:0 0 12px;">You are now viewing the same node as your partner.</p>' +
      '<p style="margin:0 0 12px;">You can agree, if you wish, to explore this node further \u2014 perhaps with a view to saving your thoughts. To do this press the red <b>Explore</b> button, or the amber <b>Accept</b> button if your partner has already asked.</p>' +
      '<p style="margin:0 0 14px;">The node will then show a <b style="color:#1bbb40;">green halo</b> to bookmark itself. You can safely go off and gather text from other nodes, and find your way back.</p>' +
      '<label style="display:flex;align-items:center;gap:8px;margin:0 0 14px;font-size:13px;color:#bbb;cursor:pointer;">' +
        '<input type="checkbox" id="snap-noshow" style="width:18px;height:18px;"> Don\u2019t show this again this session</label>' +
      '<div style="display:flex;justify-content:flex-end;">' +
        '<button id="snap-ok" type="button" style="padding:10px 18px;background:#4080ff;color:#fff;border:none;border-radius:4px;font-size:14px;font-family:sans-serif;font-weight:bold;cursor:pointer;">Got it</button>' +
      '</div>';
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    const close = () => {
      const box = document.getElementById('snap-noshow');
      if (box && box.checked) snapDialogSuppressed = true;
      snapDialogOpen = false;
      overlay.remove();
    };
    document.getElementById('snap-ok').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
  }

  // Both breadcrumb bars, re-synced and re-anchored. Exposed for the same
  // reason as reassertMarks: init() owns the resize handler, these live here.
  function refitBars() {
    if (!BREADCRUMB_BARS) return;
    try { panYouCyToLatest();   } catch (_) {}
    try { panBuddyCyToLatest(); } catch (_) {}
  }

  // Both marks, re-parked. Exposed because init() owns the resize handler and
  // the marks live here — the same boundary that silently half-broke unpair.
  function reassertMarks() {
    try {
      reassertBlueNode();
      reassertGreenNode();
      reassertPrevNode();
      renderMarks();
    } catch (err) { console.warn('[marks] re-assert failed', err); }
  }

  function reassertBlueNode() {
    if (!bnNodeId) return;
    const node = cy.getElementById(bnNodeId);
    if (!node.length) { bnNodeId = null; return; }
    if (bnViewSuppressed()) { hideBlueVisualsForView(); return; }
    // The exception to parking: if this is the node you are standing on, it
    // belongs in the middle. You do not need a corner to find what is already
    // in front of you.
    if (lastReadNodeId === bnNodeId && lastReadNodeCy === cy) {
      bnWasRevealed = false; node.removeStyle('opacity'); node.removeClass('parked-mark');
    } else placeBlueNode(node);
    renderMarks();
    markBlueEdges(node);
  }

  function clearBlueEdges() {
    if (bnShownEdges) { bnShownEdges.hide(); bnShownEdges = null; }
    cy.edges('.bn-edge').removeClass('bn-edge');
  }

  function markBlueEdges(node) {
    clearBlueEdges();
    if (!node || !node.length) return;
    // Only when the Blue Node sits where it actually belongs. Parked in a
    // corner, these would be the long diagonals parkMark just suppressed —
    // drawing them again here would undo that in the same frame.
    if (bnWasRevealed) return;
    const eligible = node.connectedEdges().filter(e =>
      !BN_EDGE_SKIP.has(e.data('type')) &&
      e.source().visible() && e.target().visible());

    // The edges are resident but hidden. Every navigation does
    // cy.elements().hide() and shows only what the view computed, and the BN
    // was not in that set — placeBlueNode shows the NODE alone. A class sets
    // line-color and opacity; it cannot undo display:none. So marking without
    // showing drew nothing whatsoever, which is what made this look built.
    //
    // Split before showing, so we hide back exactly what we revealed and
    // leave the view's own edges alone.
    const hidden = eligible.filter(e => !e.visible());
    hidden.show();
    bnShownEdges = hidden.length ? hidden : null;
    eligible.addClass('bn-edge');
  }

  function clearReadMark() {
    if (lastReadNodeId && lastReadNodeCy) {
      try {
        clearMarksFrom(lastReadNodeCy.getElementById(lastReadNodeId));
      } catch (_) {}
      lastReadNodeId = null;
      lastReadNodeCy = null;
      // The node may still carry the partner's blue mark — clearing OUR mark
      // must not take theirs with it. Re-render from the remaining state.
      try { renderMarks(); } catch (_) {}
    }
  }

  // --- Help text with downloading indicator ---
  // #help-bar / #help-text was removed in A50; setHelpText / setDownloading
  // are kept as silent no-ops so the many call sites don't all need editing.
  const helpEl = document.getElementById('help-text');
  let currentHelpText = helpEl ? helpEl.textContent : '';
  let isDownloading = false;

  function setHelpText(text) {
    currentHelpText = text;
    if (helpEl) helpEl.textContent = isDownloading ? text + ' — downloading' : text;
  }

  function setDownloading(active) {
    isDownloading = active;
    if (helpEl) helpEl.textContent = isDownloading ? currentHelpText + ' — downloading' : currentHelpText;
  }

  // --- You breadcrumb chips ---
  let youChipCount = 0;
  let youChipX = 0;
  let lastYouChipId = null;
  let lastYouSourceText = null;

  // 2026-08-27 — TELLING YOUR PARTNER WHERE YOU ARE is not part of drawing the
  // breadcrumb strip, and must outlive it. It lived inside addYouChip, so
  // gating that function for the strip's retirement silently stopped our
  // position reaching the partner — which killed their Blue Node, and ours (no
  // crumbs coming back), and every green mark, since a GN is minted from a BN
  // click. One gate, three features, and no error anywhere.
  //
  // The lesson is not "check the gates": it is that a transport concern was
  // sitting inside a rendering function, where nobody would look for it.
  // 2026-08-29 — YOUR STRUCTURAL VIEW: what you are actually exploring, which
  // is not the same as what is on screen once merging exists. Today they are
  // identical because nothing merges yet; slice 2 subtracts mergedRemoteIds
  // here, and this is the ONE place that has to change for it.
  //
  // Never send the merged remainder. A merges B's view, sends it all back, B
  // merges that — and the union grows every round trip until both screens are
  // the same blob and the remote channel means nothing.
  function currentLocalViewIds() {
    return cy.nodes(':visible').map(n => n.id()).filter(id => !mergedRemoteIds.has(id) || localViewIds.has(id));
  }

  // 2026-08-29 — DEFERRED BY ONE FRAME, and this is not an optimisation.
  //
  // addYouChip — and so this — runs at the TOP of the fresh-tap branch, before
  // navigateInto expands the view at the bottom of it. So reading the visible
  // set here described the view you were LEAVING: `current` named the node you
  // had just tapped while `ids` still held the previous view. Pressing the
  // partner's button merged a graph one navigation out of date, which is
  // exactly how the user described it.
  //
  // A frame later the expand has run. Only the show/hide matters — the id set is
  // settled synchronously, well before the layout animates positions.
  //
  // COALESCED, because deferring alone would have swapped one mismatch for
  // another: two navigations inside one frame would fire two callbacks that
  // both read the final view, so the first message would carry the second's
  // ids. Keeping only the latest pending node sends one message describing the
  // state actually arrived at — the intermediate one was never occupied.
  let pendingPublishNode = null, publishScheduled = false;

  function publishPosition(node) {
    if (!pairingState.active) return;
    pendingPublishNode = node;
    if (publishScheduled) return;
    publishScheduled = true;
    requestAnimationFrame(() => {
      publishScheduled = false;
      const n = pendingPublishNode;
      pendingPublishNode = null;
      if (n && n.length) emitPosition(n);
    });
  }

  function emitPosition(node) {
    if (!pairingState.active) return;
    const sendWs = wsRef.current;
    if (!sendWs || !sendWs.connected) return;
    sendWs.emit('msg', {
      type: 'breadcrumb',
      data: {
        type:          node.data('type'),
        display_name:  node.data('display_name') || node.data('name') || '',
        colour:        node.data('colour') || '#444444',
        name:          node.data('name') || '',
        mainId:        node.id(),
        url:           node.data('url') || null,   // the stable id (2026-08-21)
        source_text:   node.data('source_text') || null,
        seq:           node.data('seq') ?? null,
        gateway:        node.data('gateway') || false,
        section_title:  node.data('section_title') || false,
        subfamily:      node.hasClass('subfamily'),
        clusterNodeId:  lastClusterNode ? lastClusterNode.id() : null,
        // 2026-08-29 — the view rides on the EXISTING crumb. server.js forwards
        // msg.data wholesale, so these fields need no server change and no
        // whitelist entries; a new message type would need three sites, and two
        // of three fails silently.
        //
        // One message carries both the label and the set, so the button cannot
        // name one view while merging another.
        ids:            currentLocalViewIds(),
        // null when it equals `current` — a re-tap on the same node leaves
        // prevReadNodeId pointing at it, and "you came from where you are" is
        // not a previous node. prevNodeEl() already guards this locally; the
        // payload has to as well, or the 0.65 tier would fight the 0.85 one.
        previous:       (prevReadNodeId && prevReadNodeId !== lastReadNodeId) ? prevReadNodeId : null,
      }
    });
  }

  function addYouChip(node) {
    publishPosition(node);       // ALWAYS — never gated on the strip
    if (!BREADCRUMB_BARS) return;
    const type        = node.data('type');
    const sourceText  = type === 'TextNode' ? (node.data('source_text') || null) : null;
    const seq         = node.data('seq') ?? null;
    const abbreviated = type === 'TextNode' && !node.data('gateway') && !node.data('section_title') && sourceText !== null && sourceText === lastYouSourceText;
    const isSubfamily = node.hasClass('subfamily');
    const displayName = abbreviated ? String(seq ?? '?')
                       : truncateChipLabel(node.data('display_name') || node.data('name') || '');

    const id = 'you_' + (youChipCount++);
    if (lastYouChipId) {
      const prev = youCy.getElementById(lastYouChipId);
      if (prev.length) prev.removeClass('latest');
    }
    youCy.add({
      group: 'nodes',
      data: {
        id,
        type,
        display_name:  displayName,
        colour:        node.data('colour') || '#444444',
        name:          node.data('name') || '',
        url:           node.data('url') || null,
        mainId:        node.id(),
        source_text:   sourceText,
        seq,
        clusterNodeId:  lastClusterNode ? lastClusterNode.id() : null,
        gateway:        node.data('gateway') || false,
        section_title:  node.data('section_title') || false,
        subfamily:      isSubfamily,
      },
      position: { x: 0, y: 11 }              // centre of 23px bar
    });
    const chip = youCy.getElementById(id);
    chip.addClass('breadcrumb-chip');         // override per-type size to fit bar
    if (abbreviated)  chip.addClass('abbreviated');
    if (isSubfamily)  chip.addClass('subfamily');
    const w = chip.width();
    chip.position({ x: youChipX + w / 2, y: 11 });

    lastYouSourceText = type === 'TextNode' ? sourceText : null;
    if (lastYouChipId) {
      youCy.add({
        group: 'edges',
        data: {
          id: 'you_e_' + id,
          source: lastYouChipId,
          target: id,
          colour: '#333333',
          weight: 0.2,
        }
      });
    }
    chip.addClass('latest');
    youChipX    += w + 7;
    lastYouChipId = id;
    panYouCyToLatest();
    saveYouBreadcrumbs();                       // 2026-08-16 — cache after every hop
  }

  // 2026-08-16 — breadcrumb persistence. Save on every hop + every 5 s
  // + on beforeunload; restore at boot. Kills the "blank breadcrumb bar
  // after reload → have to re-navigate to test" friction. Only the local
  // "you" chips are persisted — buddy chips are tied to a pair session
  // and mean nothing after the WS drops.
  const BD_YOU_CRUMBS_KEY   = 'bd_you_breadcrumbs';
  const BD_YOU_CRUMBS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days
  let   restoringYouCrumbs  = false;            // guard: don't re-save while restore is in flight

  function saveYouBreadcrumbs() {
    if (!BREADCRUMB_BARS) return;
    if (restoringYouCrumbs) return;
    try {
      const chips = youCy.nodes().map(n => n.data());
      if (!chips.length) {
        localStorage.removeItem(BD_YOU_CRUMBS_KEY);
        return;
      }
      const payload = { savedAt: Date.now(), chips };
      localStorage.setItem(BD_YOU_CRUMBS_KEY, JSON.stringify(payload));
    } catch (_) { /* quota / disabled — silent */ }
  }

  function addYouChipFromData(d) {
    if (!BREADCRUMB_BARS) return;
    // Chip-render logic mirrors addYouChip's, but works off a saved
    // data dict (from localStorage) instead of a live main-graph node.
    // Skips the pair-broadcast (restore fires pre-pair).
    const type = d.type;
    const isSubfamily = !!d.subfamily;
    const abbreviated = type === 'TextNode' && !d.gateway && !d.section_title &&
                        d.source_text && d.source_text === lastYouSourceText;
    const id = 'you_' + (youChipCount++);
    if (lastYouChipId) {
      const prev = youCy.getElementById(lastYouChipId);
      if (prev.length) prev.removeClass('latest');
    }
    youCy.add({
      group: 'nodes',
      data: {
        id, type,
        // 2026-08-25 — truncateChipLabel here too. This is the RESTORE-from-cache
        // builder, and it was rendering the stored name in full while the live
        // builder truncated to 13 — so long cluster titles came back mangled
        // after a reload and were fine before one. Idempotent: truncating an
        // already-short label is a no-op, so it does not matter whether the
        // cache holds the full name or the trimmed one.
        display_name:   abbreviated ? String(d.seq ?? '?')
                                    : truncateChipLabel(d.display_name || d.name || ''),
        colour:         d.colour || '#444444',
        name:           d.name || '',
        url:            d.url || null,
        mainId:         d.mainId,
        source_text:    d.source_text || null,
        seq:            d.seq ?? null,
        clusterNodeId:  d.clusterNodeId || null,
        gateway:        !!d.gateway,
        section_title:  !!d.section_title,
        subfamily:      isSubfamily,
      },
      position: { x: 0, y: 11 }
    });
    const chip = youCy.getElementById(id);
    chip.addClass('breadcrumb-chip');
    if (abbreviated) chip.addClass('abbreviated');
    if (isSubfamily) chip.addClass('subfamily');
    const w = chip.width();
    chip.position({ x: youChipX + w / 2, y: 11 });
    lastYouSourceText = type === 'TextNode' ? (d.source_text || null) : null;
    if (lastYouChipId) {
      youCy.add({
        group: 'edges',
        data: {
          id: 'you_e_' + id,
          source: lastYouChipId, target: id,
          colour: '#333333', weight: 0.2,
        }
      });
    }
    chip.addClass('latest');
    youChipX += w + 7;
    lastYouChipId = id;
  }

  function restoreYouBreadcrumbs() {
    if (!BREADCRUMB_BARS) return;
    let raw;
    try { raw = localStorage.getItem(BD_YOU_CRUMBS_KEY); } catch (_) { return; }
    if (!raw) return;
    let payload;
    try { payload = JSON.parse(raw); } catch (_) { return; }
    if (!payload || !Array.isArray(payload.chips) || !payload.chips.length) return;
    if (payload.savedAt && (Date.now() - payload.savedAt) > BD_YOU_CRUMBS_MAX_AGE_MS) {
      try { localStorage.removeItem(BD_YOU_CRUMBS_KEY); } catch (_) {}
      return;
    }
    restoringYouCrumbs = true;
    try {
      for (const chipData of payload.chips) addYouChipFromData(chipData);
      panYouCyToLatest();
      console.log(`[BD] restored ${payload.chips.length} breadcrumb chip(s) from cache`);
    } finally {
      restoringYouCrumbs = false;
    }
  }

  // 2026-08-25 — every chip sits at model y = 11, which is the centre of the
  // 23px bar ONLY at zoom 1. Screen y is model_y * zoom + pan_y, so at zoom 2
  // the chips render at 22px and at zoom 3 at 33px — off the bottom of the bar
  // entirely. The bars are zoomable, which is the whole point of them being
  // cytoscape instances, so the pan has to carry the correction.
  const BAR_CHIP_Y = 11;
  function barPanY(barCy, containerId) {
    const el = document.getElementById(containerId);
    const h  = (el && el.offsetHeight) || 23;
    return h / 2 - BAR_CHIP_Y * barCy.zoom();
  }
  // 2026-08-25 — on zoom, RE-ANCHOR the whole trail rather than only fixing the
  // vertical. Correcting y alone left the horizontal pan wherever the pinch had
  // put it, so the chips could slide out of the bar sideways with no way to get
  // them back — the strip went blank and stayed blank. Re-anchoring keeps the
  // newest chip in its usual place at every zoom, which is the invariant the
  // bar is built around.
  youCy.on('zoom',   () => { try { panYouCyToLatest();   } catch (_) {} });
  buddyCy.on('zoom', () => { try { panBuddyCyToLatest(); } catch (_) {} });

  function panYouCyToLatest() {
    if (!BREADCRUMB_BARS) return;
    if (youChipCount === 0) return;
    youCy.resize();   // 2026-08-18 — sync canvas to the (possibly narrowed) container before panning
    const containerWidth = document.getElementById('cy-you').offsetWidth;
    const rightEdge = youChipX - 7;
    // 2026-08-20 — right-ALIGNED at every length. The old Math.min(0, …) clamp
    // pinned a short trail to the left edge and only started scrolling once it
    // overflowed, so the newest chip moved rightwards as you went and only
    // settled at the right end when the bar filled. Without the clamp the trail
    // hangs from the right: newest always in the same place, older ones running
    // off to the left — which is also where the enlarged copy now sits.
    const panX = containerWidth - rightEdge - 12;
    youCy.pan({ x: panX, y: barPanY(youCy, 'cy-you') });
  }

  window.addEventListener('resize', panYouCyToLatest);

  // 2026-08-21 — resolve a node by its DURABLE url, not by cytoscape's id.
  //
  // cy ids are Memgraph elementIds, and viewer.js:4460 documents that the same
  // Cluster or Family comes back with DIFFERENT elementIds in different query
  // contexts — the client works around it by deduplicating on name and keeping
  // whichever it saw first. "First seen" depends on result ordering, which is
  // not guaranteed to match between two browsers. So a crumb saying "I am at
  // node 89" can mean different nodes on the two machines.
  //
  // `url` is a stored property (a UUID, written once at creation), identical
  // everywhere and forever. It is the platform's stable id and the only safe
  // thing to send across the wire.
  function nodeByUrl(url) {
    if (!url) return null;
    const hit = cy.nodes().filter(n => n.data('url') === url);
    return hit.length ? hit.first() : null;
  }

  // Resolve a chip to its main-graph node: durable url first, cy id as the
  // legacy fallback for chips that predate the url being sent.
  function resolveChipNode(chip) {
    return nodeByUrl(chip.data('url')) || cy.getElementById(chip.data('mainId'));
  }

  // 2026-08-20 — chip labels are truncated HERE, not left to the renderer.
  // text-max-width + text-wrap:'ellipsis' was not constraining them: labels ran
  // wider than the 63px chip, spilled both sides, and the neighbouring chips —
  // drawn afterwards — painted over the spill, so only the middle survived
  // ("arden Wi" for "Garden Wild"). Cutting the string is deterministic and
  // cannot be defeated by style precedence or an unsupported text-wrap value.
  // 13 chars ≈ 55px at the chip's 8px font, inside the 63px node with margin.
  // The ENLARGED copy is unaffected: appendBuddyChip passes it the untruncated
  // data.display_name separately, which is that panel's whole purpose.
  const CHIP_LABEL_MAX = 13;
  // 2026-08-25 — FLATTEN first, then truncate.
  //
  // Cluster display_name carries an embedded NEWLINE by design — "Loss\nLonging",
  // "Garden\nWild", "Naming\nBecoming" — which is right for the main graph,
  // where the node is tall enough for two lines. A breadcrumb chip is 18px and
  // cannot take it: the label rendered wrong and dropped characters, so "Loss"
  // appeared as "oss" and "Garden Wild" as "arden Wi".
  //
  // It also defeated the length check: "Loss\nLonging" is 12 characters, under
  // the 13 limit, so it was passed through untouched — the truncation looked
  // like it was working precisely because it did nothing.
  function truncateChipLabel(s) {
    // Collapse every run of whitespace — newlines included — to one space,
    // BEFORE measuring. Measuring first would let a two-line name slip under
    // the limit and reach the chip with its newline intact.
    const str = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    return str.length <= CHIP_LABEL_MAX ? str
         : str.slice(0, CHIP_LABEL_MAX - 1).trimEnd() + '\u2026';
  }

  // --- buddyCy chip trail ---

  let buddyChipCount = 0;
  let buddyChipX = 0;
  let lastBuddyChipId = null;
  let lastBuddySourceText = null;

  function appendBuddyChip(data) {
    // The Blue Node is driven from here and must run whether or not the strip
    // does — same fault as publishPosition above, on the receiving side. Moved
    // to the TOP so the gate below cannot reach past it; it depends on nothing
    // the chip builds.
    showBlueNode(data).catch(err => console.warn('[BN] showBlueNode failed', err));
    receiveRemoteView(data);   // slice 1 — stored, not drawn
    if (!BREADCRUMB_BARS) return;
    const type        = data.type;
    const sourceText  = type === 'TextNode' ? (data.source_text || null) : null;
    const seq         = data.seq ?? null;
    const abbreviated = type === 'TextNode' && !data.gateway && !data.section_title && sourceText !== null && sourceText === lastBuddySourceText;
    const isSubfamily = data.subfamily || false;
    const displayName = abbreviated ? String(seq ?? '?')
                       : truncateChipLabel(data.display_name || data.name || '');

    const id = 'buddy_' + (buddyChipCount++);
    if (lastBuddyChipId) {
      const prev = buddyCy.getElementById(lastBuddyChipId);
      if (prev.length) prev.removeClass('latest');
    }
    buddyCy.add({
      group: 'nodes',
      data: {
        id,
        type,
        display_name:  displayName,
        colour:        data.colour || '#444444',
        name:          data.name || '',
        mainId:        data.mainId || null,
        url:           data.url || null,
        source_text:   sourceText,
        seq,
        gateway:        data.gateway || false,
        section_title:  data.section_title || false,
        subfamily:      isSubfamily,
        clusterNodeId:  data.clusterNodeId || null,
      },
      position: { x: 0, y: 11 }              // centre of 23px bar
    });
    const chip = buddyCy.getElementById(id);
    chip.addClass('breadcrumb-chip');         // override per-type size to fit bar
    if (abbreviated)  chip.addClass('abbreviated');
    if (isSubfamily)  chip.addClass('subfamily');
    const w = chip.width();
    chip.position({ x: buddyChipX + w / 2, y: 11 });

    if (lastBuddyChipId) {
      buddyCy.add({
        group: 'edges',
        data: { id: 'buddy_e_' + id, source: lastBuddyChipId, target: id, colour: '#333333', weight: 0.2 }
      });
    }
    chip.addClass('latest');
    lastBuddySourceText = type === 'TextNode' ? sourceText : null;
    buddyChipX    += w + 7;
    lastBuddyChipId = id;
    panBuddyCyToLatest();
  }

  // 2026-08-21 — the enlarged-copy panel (#buddy-latest / buddyLatestCy, built
  // 2026-08-20) is RETIRED. The partner's position is now a node on the user's
  // own graph — see showBlueNode above and blue_node_spec.md §6. Its unresolved
  // problem went with it: circular types fitted badly into a fixed panel, and a
  // real graph node has none.

  function panBuddyCyToLatest() {
    if (!BREADCRUMB_BARS) return;
    if (buddyChipCount === 0) return;
    buddyCy.resize();   // 2026-08-18 — sync canvas to the (possibly narrowed) container before panning
    const containerWidth = document.getElementById('cy-buddy').offsetWidth;
    const rightEdge = buddyChipX - 7;
    // 2026-08-20 — right-ALIGNED at every length. The old Math.min(0, …) clamp
    // pinned a short trail to the left edge and only started scrolling once it
    // overflowed, so the newest chip moved rightwards as you went and only
    // settled at the right end when the bar filled. Without the clamp the trail
    // hangs from the right: newest always in the same place, older ones running
    // off to the left — which is also where the enlarged copy now sits.
    const panX = containerWidth - rightEdge - 12;
    buddyCy.pan({ x: panX, y: barPanY(buddyCy, 'cy-buddy') });
  }

  function resetBuddyBar() {
    // §2 — a new pair clears the partner's MARK as well as their trail, and the
    // mark outlives the strip. Third function today whose gate would have
    // reached past a rendering concern into a live one: without this, pairing
    // with someone new leaves the previous partner's Blue Node on your graph.
    retireBlueNode();
    bnStack.length = 0;      // a new partner does not inherit the last one's trail
    bnCursor = 0;
    bnGone = false;
    try { renderMarks(); } catch (_) {}
    if (!BREADCRUMB_BARS) return;
    buddyCy.elements().remove();
    buddyChipCount      = 0;
    buddyChipX          = 0;
    lastBuddyChipId     = null;
    lastBuddySourceText = null;
    buddyCy.pan({ x: 0, y: barPanY(buddyCy, 'cy-buddy') });
  }

  window.addEventListener('resize', panBuddyCyToLatest);

  // --- buddyCy chip interactions ---
  //
  // 2026-07-24 — single-tap navigates. Same one-gesture model as the main
  // canvas: no defer windows, no double-tap detection. Tapping a chip
  // re-enters that node's view (chip becomes the centre) via handleNodeTap,
  // which dispatches to the right expand function per node type. The old
  // buddyTouchPending / buddyDesktopPending timer state is retired.

  const buddyContainer = document.getElementById('cy-buddy');

  buddyCy.on('tap', 'node', evt => {
    const chip = evt.target;
    // url first — the partner's cy id may not mean the same node here (see
    // nodeByUrl). This is why tapping a remote Cluster or Family chip could
    // already do nothing at all: the lookup missed and this guard returned
    // silently, with no error and no explanation.
    const main = resolveChipNode(chip);
    if (!main || !main.length) return;
    if (isTouchEvent(evt)) markRecentTouch();
    hideTooltip();
    markReadNode(chip, buddyCy);
    handleNodeTap(main);
  });

  // --- youCy chip interactions ---

  const youContainer = document.getElementById('cy-you');

  youCy.on('tap', 'node', evt => {
    const chip = evt.target;
    // url first — the partner's cy id may not mean the same node here (see
    // nodeByUrl). This is why tapping a remote Cluster or Family chip could
    // already do nothing at all: the lookup missed and this guard returned
    // silently, with no error and no explanation.
    const main = resolveChipNode(chip);
    if (!main || !main.length) return;
    if (isTouchEvent(evt)) markRecentTouch();
    hideTooltip();
    markReadNode(chip, youCy);
    handleNodeTap(main);
  });

  function markRecentTouch() {
    recentTouch = true;
    clearTimeout(recentTouchTimer);
    recentTouchTimer = setTimeout(() => { recentTouch = false; }, 600);
  }

  // Tooltip

  // Returns { label, name } for navigation nodes (Root/Entry/Family/Cluster),
  // null otherwise. The label is the memgraph DB label so the server can match
  // `$label IN labels(n)`. Sub-families are :Family nodes with a non-palette
  // name — they share the Family label, distinguished by name alone.
  function navNodeMeta(node) {
    const type = node.data('type');
    const name = node.data('name');
    if (!name) return null;
    const labelByType = { root: 'Root', Entry: 'Entry', Family: 'Family', Cluster: 'Cluster' };
    const label = labelByType[type];
    return label ? { label, name } : null;
  }

  // Routes a node-click insert to either the chat panel (Copy-collage workflow,
  // when chat mode is active) or the default panel (editable system card with
  // Save button). The "Node: <name>\n" header added by buildTooltipContent is
  // stripped on chat inserts, then a compact inline `<name>: ` prefix is
  // prepended after text processing so the reader sees which node the excerpt
  // came from (e.g. "Conversations: Some areas for ...").
  //
  // Boot-helper sequence override (2026-07-23): while onboarding cards are
  // still queued, a single tap on Root triggers the next helper INSTEAD of
  // inserting Root's welcome text. Once the queue drains (server sends the
  // last card with bootHelperMoreAvailable=false), Root taps revert to
  // normal text-insert behaviour.
  // insertNodeChunkAsCard — display one chunk as a system-kind card in the
  // chat stack. Body is a div, so it can hold two children: a chunk-text
  // paragraph and a centred chunk-hint below it (styled via .chunk-hint CSS).
  // Card head shows the numbered source label "<name> (N)". Prepended per
  // BD's newest-on-top convention — a fresh card per chunk, not accumulated
  // into a textarea, because textareas can't centre-align inline text.
  //
  // TextNode chunks get an extra `.text-reading` class on the card element
  // so CSS can dim the head + hint to 0.5 opacity — the actual verse/text
  // content is the star; the metadata is distraction when reading.
  // Which part of its section a content TextNode is. Returns null for
  // anything that should not carry one — non-TextNodes, the section titles
  // themselves, gateways, and nodes with no seq or no reachable title.
  //
  // PART_OF is matched direction-agnostically: edge direction in this DB is
  // not reliable, and the title is simply whichever endpoint is the
  // section_title one.
  function textNodePartNumber(node) {
    if (!node || !node.data) return null;
    if (node.data('type') !== 'TextNode') return null;
    if (node.data('section_title') || node.data('gateway')) return null;
    const seq = node.data('seq');
    if (seq == null) return null;
    const title = node.connectedEdges('[type="PART_OF"]')
      .connectedNodes()
      .filter(n => !!n.data('section_title'))
      .first();
    if (!title || !title.length) return null;
    const titleSeq = title.data('seq');
    if (titleSeq == null) return null;
    const part = seq - titleSeq;
    return part >= 1 ? part : null;
  }

  function insertNodeChunkAsCard(chunkBody, hint, node, chunkIndex) {
    let text = chunkBody;
    // Bot-context handling — paragraph-normalise, then strip/unnormalise
    // per curator vs ordinary view. Same rules as the old routeNodeText
    // chat-mode branch (see bot_context.md §4.1/§4.3).
    text = text.replace(/(\s*)(%%bd_ai_read \[[\s\S]*?%%bd_\])(\s*)/g, '\n\n$2\n\n');
    const devCodeEl = document.getElementById('dev-code');
    const curatorView = !!(devCodeEl && devCodeEl.value.trim());
    text = curatorView ? unnormalizeBotBlocks(text) : stripBotBlocks(text);
    text = text.replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');

    // Sensible head label per node type. TextNodes use title/source_text
    // since they typically have no `name` property; nav nodes use `name`.
    const nodeType = node && node.data ? node.data('type') : null;
    const nodeName = (node && node.data)
      ? (node.data('name') || node.data('title') || node.data('source_text') || 'TextNode')
      : '(node)';
    // Part number for content TextNodes: THIS node's seq minus its SECTION
    // TITLE's seq. Verified against all 10 sections in the corpus — every one
    // is contiguous and starts at part 1.
    //
    // Subtracting the TITLE's seq, rather than using seq raw, is what makes
    // the Hardy poems right: they share one seq space across the work, so His
    // Visitor's first part is seq 6 and The Walk's is seq 11. Raw seq would
    // label them "(part 6)" and "(part 11)".
    //
    // Skipped when the name already carries one — Snow White's parts have
    // "(part N)" hand-authored into their title property, and this must not
    // produce "Snow White (part 1) (part 1)".
    const partNo = textNodePartNumber(node);
    const hasAuthoredPart = /\(\s*part\b/i.test(nodeName);
    const namePlusPart = (partNo != null && !hasAuthoredPart)
      ? `${nodeName} (part ${partNo})`
      : nodeName;

    // Show a chunk position ONLY when there is more than one chunk. Today
    // every node is a single chunk — nothing in the corpus carries
    // %%bd_chunk — and Unified Focus retires chunk-advance for non-root nodes
    // anyway, so this suffix read "(0)" on every card everywhere and told the
    // reader nothing. Worse, a bare "0" invites reading it as a count.
    //
    // If multi-chunk text returns, it shows "(2/5)": 1-based, with the total,
    // so the number says where you are AND how much is left.
    const chunkTotal = (readingState && readingState.chunks)
      ? readingState.chunks.length : 1;
    const label = (chunkIndex != null && chunkTotal > 1)
      ? `${namePlusPart} (${chunkIndex + 1}/${chunkTotal})`
      : namePlusPart;

    const card = createCard({ kind: 'system', label });
    if (!card || !card.body) return;
    // Tag every chunk card so it stands out in DOM inspection. Uniform
    // stack contrast (top = 1.0, others = 0.7) is now handled by
    // refreshCardOpacities in createCard — no per-chunk override needed.
    if (card.el && card.el.classList) {
      card.el.classList.add('chunk-card');
      if (nodeType === 'TextNode') card.el.classList.add('text-reading');
    }

    const body = card.body;
    body.textContent = '';
    // %%bd_center on its own line splits the chunk: everything before is
    // left-aligned (default), everything after is centre-aligned. Simple
    // author-controlled layout knob for call-to-action tails without
    // needing a whole new chunk. Directive line is stripped.
    if (text) {
      const centerRE = /^%%bd_center[ \t]*$/m;
      const cm = text.match(centerRE);
      const preText  = cm ? text.slice(0, cm.index).replace(/\s+$/, '') : text;
      const postText = cm ? text.slice(cm.index + cm[0].length).replace(/^\s+/, '') : '';
      if (preText) {
        const el = document.createElement('div');
        el.className = 'chunk-text';
        renderTextWithHighlights(el, preText);
        body.appendChild(el);
      }
      if (postText) {
        const el = document.createElement('div');
        el.className = 'chunk-text chunk-text--center';
        renderTextWithHighlights(el, postText);
        body.appendChild(el);
      }
    }
    if (hint) {
      const hintEl = document.createElement('div');
      hintEl.className = 'chunk-hint';
      renderTextWithHighlights(hintEl, hint);
      body.appendChild(hintEl);
    }
    card.text = text + (hint ? '\n' + hint : '');
    // Scroll the chat stack to the top so the newly-inserted chunk is in
    // view. Without this, if the user has scrolled down to read a long
    // earlier chunk, tapping to the next chunk (or into a new node) leaves
    // the new card off-screen above the scroll position.
    if (chatStackEl) chatStackEl.scrollTop = 0;
    return card;
  }

  // advanceOrNavigate — the one-gesture UX entry point. Every tap on a
  // main-canvas node routes here:
  //   • Fresh node (readingState mismatch)  → set state, show chunk 0
  //   • Same node, chunks remaining          → advance to next chunk
  //   • Same node, past last chunk + descendants  → navigate into node
  //   • Same node, past last chunk + no descendants → silent no-op
  //   • No text at all                       → navigate immediately
  function advanceOrNavigate(node) {
    if (!node || !node.length) return;
    const meta = navNodeMeta(node);
    const nid = node.id();
    // Root is the one node that keeps chunk-advance (the staged boot: message
    // 0 → tap → message 1 + Settling revealed). So the unified one-tap expand
    // never applies to Root, even when UNIFIED_FOCUS is on.
    const isRoot = node.data('type') === 'root';

    // Different node → reset reading state to fresh chunks of the new node.
    if (!readingState || readingState.nodeId !== nid) {
      // Breadcrumb chip: add once per node visited, on the FRESH tap only —
      // subsequent chunk-advance taps on the same node don't duplicate the chip.
      const type = node.data('type');
      if (type === 'Entry' || type === 'Family' || type === 'Cluster' || type === 'TextNode') {
        addYouChip(node);
      }
      const rawText = node.data('text') || '';
      const chunks = splitNodeChunks(rawText);   // → [{body, hint}, …]
      const desc   = hasNavDescendants(node);
      // `nav` drives the tap AND the hint together, so a childless cluster
      // cannot navigate while its card still says there is nowhere to go.
      const nav    = navigatesOnTap(node, desc);
      if (chunks.length === 0) {
        // No text at all → still show a single placeholder chunk (hint
        // only, empty body) so EVERY node follows the same "tap to read,
        // tap again to advance" rhythm. Without this, empty-text nodes
        // navigated on a single tap and inconsistency bit users who had
        // learned to double-tap. The `desc` flag steers getChunkHint to
        // the right message ("Tap once more..." vs "no further descendants").
        readingState = { nodeId: nid, chunkIndex: 0, chunks: [{body: '', hint: null}], hasDescendants: nav, cardsByIdx: {} };
        const emptyCard = insertNodeChunkAsCard('', getChunkHint(true, nav, node), node, 0);
        if (emptyCard) readingState.cardsByIdx[0] = emptyCard;
        // Unified focus: reveal the neighbourhood on the SAME fresh tap.
        if (UNIFIED_FOCUS && nav && !isRoot) navigateInto(node);
        return;
      }
      readingState = { nodeId: nid, chunkIndex: 0, chunks, hasDescendants: nav, cardsByIdx: {} };
      const isLast = chunks.length === 1;
      const c0     = chunks[0];
      const c0Card = insertNodeChunkAsCard(c0.body, c0.hint || getChunkHint(isLast, nav, node), node, 0);
      if (c0Card) readingState.cardsByIdx[0] = c0Card;
      // Unified focus: text + neighbourhood together, one tap (spec §3).
      if (UNIFIED_FOCUS && nav && !isRoot) navigateInto(node);
      return;
    }

    // Unified focus (non-Root): the node is already focused + expanded from
    // the fresh tap, so re-tapping it is a no-op. Chunk-advance and past-last
    // navigation are retired here. Keeps 1 click = 1 breadcrumb (spec §3, D4).
    // Root falls through to the chunk path below so its staged boot still runs.
    if (UNIFIED_FOCUS && !isRoot) return;

    // Same node, past-last tap → navigate or no-op.
    const nextIdx = readingState.chunkIndex + 1;
    if (nextIdx >= readingState.chunks.length) {
      if (readingState.hasDescendants) {
        const target = node; // preserve variable for clarity
        readingState = null;
        navigateInto(target);
      }
      // else: silent no-op — user reads the last chunk again or moves on
      return;
    }

    // Same node, more chunks → advance.
    readingState.chunkIndex = nextIdx;
    const isLast = nextIdx === readingState.chunks.length - 1;
    const cn = readingState.chunks[nextIdx];
    const cnCard = insertNodeChunkAsCard(
      cn.body,
      cn.hint || getChunkHint(isLast, readingState.hasDescendants, node),
      node,
      nextIdx
    );
    if (cnCard) {
      readingState.cardsByIdx = readingState.cardsByIdx || {};
      readingState.cardsByIdx[nextIdx] = cnCard;
    }

    // Root boot (unconditional, both modes): on reaching the last message,
    // reveal Settling — Root's sole neighbour — so the user can tap straight
    // into it, matching the "Tap the Settling node to advance" CTA. No extra
    // "navigate" tap needed. navigateInto → expandToNode(root) shows
    // root + Settling and runs the parentIsRoot nav layout.
    if (isRoot && isLast && hasNavDescendants(node)) navigateInto(node);
  }

  // navigateInto — the pure "expand into this node" branch, extracted from
  // handleNodeTap. Called by advanceOrNavigate when the user has tapped
  // past the last chunk of a node that has descendants.
  function navigateInto(node) {
    const type = node.data('type');
    if (type === 'Cluster') {
      const target = (clusterEditActive() && editSelectedClusterId && editSelectedClusterId !== node.id())
        ? cy.getElementById(editSelectedClusterId)
        : node;
      expandToCluster(target);
    } else if (type === 'Family') {
      expandToFamily(node);
    } else if (type === 'TextNode' && node.data('gateway')) {
      handleGatewayClick(node);
    } else if (type === 'TextNode' && node.data('section_title')) {
      handleTitlePageTap(node);
    } else {
      expandToNode(node);
    }
  }

  // Legacy routeNodeText — the pre-chunked-UX tap-inserts-text-into-chat
  // path. All main-canvas + breadcrumb taps now go through
  // advanceOrNavigate / insertNodeChunkAsCard instead. Kept only as a
  // safety belt for any residual callsite; the Root-tap boot-helper
  // override that was here is retired.
  function routeNodeText(content, meta) {
    if (chatModeActive) {
      let text = content;
      if (meta && meta.name) {
        const prefix = `Node: ${meta.name}\n`;
        if (text.startsWith(prefix)) text = text.slice(prefix.length);
      }
      // 2026-07-16 — bot-context handling on chat inserts, mirroring
      // setSystemText's default-panel fork (bot_context.md §4.1):
      //   - Paragraph-normalise the block FIRST (works on the canonical
      //     %%bd_ai_read [ … %%bd_] form). Blank lines added before AND
      //     after so the block reads as its own paragraph when it lands
      //     in a chat card.
      //   - THEN apply the curator/user fork against #dev-code (§4.3):
      //       curator view → unnormalizeBotBlocks → block stays as [ … ]
      //       ordinary view → stripBotBlocks → block removed entirely
      //   - Collapse any 3+ run of newlines that either transformation
      //     may leave behind (e.g. strip leaves the blank lines where
      //     the block used to be) and trim edges.
      text = text.replace(/(\s*)(%%bd_ai_read \[[\s\S]*?%%bd_\])(\s*)/g, '\n\n$2\n\n');
      const devCodeEl = document.getElementById('dev-code');
      const curatorView = !!(devCodeEl && devCodeEl.value.trim());
      text = curatorView ? unnormalizeBotBlocks(text) : stripBotBlocks(text);
      text = text.replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');
      if (meta && meta.name) {
        text = text ? `${meta.name}: ${text}` : `${meta.name}:`;
      }
      setChatText(text);
    } else {
      setSystemText(content, meta);
    }
    // MM1.6 Strategy B — notify the outer scope that a node has been read-
    // tapped. If Player mode is active, the outer handler auto-loads the
    // node's module into the iframe. lastReadNodeId is already up to date
    // (set by markReadNode earlier in the tap chain), so no need to pass id.
    document.dispatchEvent(new Event('bd:node-read'));
  }

  function buildTooltipContent(node) {
    const type = node.data('type');
    const navHeader = name => `Node: ${name}\n`;
    if (type === 'root') {
      const name = node.data('name') || 'ButterflyDreaming';
      return navHeader(name) + (node.data('text') || '');
    }
    if (type === 'Entry' || type === 'Family' || type === 'Cluster') {
      const name = node.data('name') || node.data('label') || '';
      return navHeader(name) + (node.data('text') || '');
    }
    if (type === 'TextNode') {
      const title = node.data('title') || '';
      const work  = node.data('source_text') || '';
      const seq   = node.data('seq');
      const text  = node.data('text') || '';
      const body  = text.split('\n').filter(l => l.trim()).join('\n');
      const showSeq = !node.data('gateway') && !node.data('section_title');
      let header  = title;
      if (work)              header += (header ? ' : ' : '') + work;
      if (showSeq && seq != null) header += (header ? ' : ' : '') + seq;
      return header ? `${header}\n${body}` : body;
    }
    return '';
  }

  function topCard() {
    return cards.length ? cards[cards.length - 1] : null;
  }

  // Most recent local card — chat-side destinations (node-click inserts, copy
  // appends) always target the newest *editable* card, never a system/received
  // card sitting on top of the stack.
  function topLocalCard() {
    for (let i = cards.length - 1; i >= 0; i--) {
      if (cards[i].kind === 'local') return cards[i];
    }
    return null;
  }

  // Post-2026-07-25: no more N=0 ghost. topLocalCard() alone suffices;
  // callers just null-check.

  function createCard({ kind = 'local', label, toHistory = false } = {}) {
    if (!chatStackEl) return null;
    const id        = 'card_' + nextCardSerial;
    nextCardSerial++;
    const serial    = kind === 'local' ? nextLocalSerial++ : null;
    const card      = { id, kind, serial, volume: 0.85, text: '' };

    const el = document.createElement('div');
    el.className          = 'card ' + kind;
    el.dataset.cardId     = id;
    el.style.opacity      = card.volume;

    const head = document.createElement('div');
    head.className   = 'card-head';
    const headLabel = document.createElement('span');
    headLabel.className = 'card-head-label';
    headLabel.textContent = label !== undefined
      ? label
      : kind === 'local'  ? ('Local (' + serial + ')')
      : kind === 'system' ? 'Helper'
      :                     'Remote';
    head.appendChild(headLabel);

    const body = kind === 'local'
      ? document.createElement('textarea')
      : document.createElement('div');
    body.className = 'card-body';
    if (kind === 'local') {
      body.value = '';
    } else {
      // 2026-07-25 — all card bodies editable by default. Edits are DOM-
      // only (no DB write) so nothing bad happens; the user can rework
      // wording for reading clarity or select-and-copy fragments cleanly.
      // Was contentEditable = 'false' — that blocked in-panel edits on
      // system/received cards, including chunk cards under the new UX.
      body.contentEditable = 'true';
      body.textContent = '';
    }

    el.append(head, body);
    // 2026-08-14 — split-panel insertion: promote the previous "current"
    // card down into History, then land the new card in the empty Current
    // slot. Guard for boot ordering (currentStackEl may not yet be bound
    // if createCard is somehow called before init runs).
    if (toHistory && chatStackEl) {
      // 2026-08-17 — land straight in History (older slot) WITHOUT displacing
      // whatever is in Current. Used for the Player helper card so the node's
      // script card keeps the Current pane.
      chatStackEl.prepend(el);
    } else if (currentStackEl) {
      // 2026-08-17 — Nodes mode is a single scrollable pane: every card stays
      // in #current-stack (no promotion to History). Edit/Player keep the
      // split (newest in Current, previous promoted to History).
      const singlePane = !document.body.classList.contains('edit-active') &&
                         !document.body.classList.contains('player-active');
      if (!singlePane) promoteCurrentToHistory();
      currentStackEl.prepend(el);
      currentStackEl.scrollTop = 0;
    } else {
      chatStackEl.prepend(el);              // fallback to legacy single-stack behaviour
    }
    card.el   = el;
    card.body = body;
    cards.push(card);

    // Local cards drive the Send button's enable state (communications.md §6.1).
    if (kind === 'local') {
      body.addEventListener('input', updateSendBtn);
    }
    updateSendBtn();
    refreshCardOpacities();

    return card;
  }

  // Uniform stack contrast (2026-07-25): whichever card is visually on top
  // (last-pushed to `cards`, which is the DOM's firstElementChild after
  // chatStackEl.prepend) reads at full brightness; every card beneath it
  // reads dimmer, regardless of kind. Called after any card insertion so
  // the previous top demotes automatically.
  function refreshCardOpacities() {
    // 2026-08-17 — opacity is determined by the PANE, not insertion order:
    // History pane (#chat-stack) is always the dimmer version; Current pane
    // (and the Nodes single pane) is always full white. Previously the
    // last-inserted card was bright regardless of pane, which lit the History
    // helper while dimming the Current script.
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (!c.el) continue;
      const inHistory = !!(chatStackEl && chatStackEl.contains(c.el));
      c.el.style.opacity = inHistory ? '0.6' : '1';
    }
  }

  function setCardText(card, content) {
    if (!card) return;
    if (card.kind === 'local') {
      card.body.value = content;
      try { card.body.setSelectionRange(0, 0); } catch (_) {}
      card.body.scrollTop = 0;
    } else {
      card.body.textContent = content;
    }
    card.text = content;
    // Programmatic value assignment doesn't fire 'input' — re-evaluate Send.
    updateSendBtn();
  }

  function scrollTextareaToInsertPoint(textarea, insertAt) {
    // Use a hidden mirror div to measure the actual rendered y-position of insertAt
    // including wrapped lines (split('\n') alone undercounts when text wraps).
    const style         = getComputedStyle(textarea);
    const lineHeight    = parseFloat(style.lineHeight) || 26;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;

    const mirror = document.createElement('div');
    Object.assign(mirror.style, {
      position:      'absolute',
      visibility:    'hidden',
      top:           '-9999px',
      left:          '0',
      whiteSpace:    'pre-wrap',
      wordWrap:      'break-word',
      overflowWrap:  'break-word',
      boxSizing:     'border-box',
      width:         textarea.clientWidth + 'px',
      paddingTop:    style.paddingTop,
      paddingBottom: style.paddingBottom,
      paddingLeft:   style.paddingLeft,
      paddingRight:  style.paddingRight,
      fontFamily:    style.fontFamily,
      fontSize:      style.fontSize,
      fontWeight:    style.fontWeight,
      fontStyle:     style.fontStyle,
      lineHeight:    style.lineHeight,
      letterSpacing: style.letterSpacing,
    });
    mirror.textContent = textarea.value.substring(0, insertAt);
    document.body.appendChild(mirror);
    const scrollTo = Math.max(0, mirror.offsetHeight - paddingBottom - lineHeight);
    document.body.removeChild(mirror);
    textarea.scrollTop = scrollTo;
  }

  function appendToCard(card, content) {
    if (!card) return;
    // 2026-07-16 — separator between accumulated inserts is now a blank
    // line (\n\n) not a single newline. Strict-append with no delimiter
    // was hard to read when multiple node-taps piled up in one card;
    // paragraph breaks make each insert scannable. Trailing newlines on
    // the previous content are trimmed so the separator is clean.
    const separator = '\n\n';
    if (card.kind === 'local') {
      const current  = card.body.value.replace(/\n+$/, '');
      const prefix   = current.length > 0 ? current + separator : '';
      const insertAt = prefix.length;
      card.body.value = prefix + content;
      card.text = card.body.value;
      // Cursor at the start of the inserted text. No focus() — that would
      // pop up the iOS keyboard on every node click.
      try { card.body.setSelectionRange(insertAt, insertAt); } catch (_) {}
      scrollTextareaToInsertPoint(card.body, insertAt);
    } else {
      const current = card.body.textContent.replace(/\n+$/, '');
      const prefix  = current.length > 0 ? current + separator : '';
      card.body.textContent = prefix + content;
      card.text = card.body.textContent;
    }
    // Programmatic value assignment doesn't fire 'input' — re-evaluate Send.
    updateSendBtn();
  }

  function setChatText(content) {
    const dest = topLocalCard() || createCard({ kind: 'local' });
    if (dest.text) {
      appendToCard(dest, content);
    } else {
      setCardText(dest, content);
    }
  }

  // Per-local-card counter for inbound helper (system) messages —
  // mirrors receivedCountByN for Remote cards. Frozen at receipt:
  // numbering reflects the top local at the moment the message arrived,
  // not whatever the top local is now.
  const helperCountByN = new Map();

  // Inbound helper card (server-emitted). Strict newest-on-top, same as
  // Local and Remote cards — createCard's prepend puts the new helper at
  // the top of the stack.
  //
  // Head label "Helper (N.M)": N = top-local serial at receipt (0 for
  // boot-time messages that arrive before Local (1) exists), M = per-N
  // counter. Same scheme as Remote (N.M) — see prependPartnerCard.
  //
  // 2026-07-16 (late) — dropped the previous "dock below top local"
  // rule. That was legacy A/B-symmetry logic from when helpers were a
  // narrow status-notification channel; under the newer advisory /
  // AI-bot role a helper arriving now IS the most relevant card and
  // should read where the user's eye naturally lands (top). Also
  // matches user's mental model — "newer messages float up".
  // Helper label: 'Helper (N.M)' when a Local exists (N=top local serial,
  // M=count of helpers arrived during Local N's compose window); plain
  // 'Helper' before any Local exists. Post-2026-07-25 no auto-Local at
  // boot, so pre-Local helpers are the norm during the initial batch.
  function prependSystemCard(text, { toHistory = false } = {}) {
    const top = topLocalCard();
    let label;
    if (top) {
      const parentN = top.serial;
      const m = (helperCountByN.get(parentN) || 0) + 1;
      helperCountByN.set(parentN, m);
      label = 'Helper (' + parentN + '.' + m + ')';
    } else {
      label = 'Helper';
    }
    const sys = createCard({ kind: 'system', label, toHistory });
    if (!sys) return;
    if (sys.body) {
      sys.body.textContent = text;
      sys.text = text;
    }
  }

  // Server's chat_ready signal: initial system batch is in. Post-2026-07-25
  // no auto-Local — the stack starts with just helper cards, and the user
  // creates a Local themselves via New/Edit when they want to compose. Still
  // kick off Root's chunk-0 as the pre-tap onboarding card so the first
  // tap gesture is teachable without any Local present.
  function handleChatReady() {
    if (!readingState) primeRootReading();
  }

  function primeRootReading() {
    const rootNode = cy.nodes('[type="root"]').first();
    if (rootNode && rootNode.length) advanceOrNavigate(rootNode);
  }

  // Per-local-card counter for inbound partner messages
  // (communications.md §4.1). Frozen at receipt: numbering reflects the
  // top local at the moment the message arrived, not whatever the top
  // local is now.
  const receivedCountByN = new Map();

  // Inbound partner card (server-relayed). Teal, non-editable. Head label
  // "Remote (N.M)" — N is the top-local serial at the moment of receipt,
  // M is the per-N counter, so e.g. Remote (2.1) reads as "1st remote
  // message that arrived while Local (2) was on top". Preserves the
  // compose-card association that plain linear numbering lost.
  // Newest on top — createCard's prepend puts it at the absolute top.
  // Partner label: 'Remote (N.M)' when a Local exists (N=top local serial,
  // M=count of Remotes arrived during Local N's compose window); plain
  // 'Remote' before any Local exists. Under the new no-auto-Local model,
  // a paired user who never composes will just see 'Remote' cards.
  function prependPartnerCard(text) {
    const top = topLocalCard();
    let label;
    if (top) {
      const parentN = top.serial;
      const m = (receivedCountByN.get(parentN) || 0) + 1;
      receivedCountByN.set(parentN, m);
      label = 'Remote (' + parentN + '.' + m + ')';
    } else {
      label = 'Remote';
    }
    const rcv = createCard({ kind: 'received', label });
    if (!rcv) return;
    if (rcv.body) {
      rcv.body.textContent = text;
      rcv.text = text;
    }
  }

  // ── Send / ack plumbing (communications.md §6) ────────────────────────────
  const pendingSends = new Map(); // sendId → card object
  let nextSendId = 1;
  let sendBtnEl = null;

  function setSendBtn(el) { sendBtnEl = el; updateSendBtn(); }

  // Auto-Player bookkeeping (2026-08-09, reworked 2026-08-19). The original
  // `prevHasModule` was a single sticky boolean, and that was the bug: once a
  // module script reached the top Current card — exactly what the ↓ arrow does
  // — hasModule stayed true for the rest of the session, the false→true edge
  // never came round again, and no later module node ever auto-engaged Player.
  // Key off the module NODE instead, and track the top-card path separately.
  let lastAutoPlayerNodeId = null;   // node we last auto-switched for
  let prevCardHasModule    = false;  // top-card path only (pasted script)
  function updateSendBtn() {
    const top = topLocalCard();
    const text = top && top.body ? top.body.value : '';
    if (sendBtnEl) sendBtnEl.disabled = !pairingState.active || !text.trim();

    // Player radio visibility. Two paths:
    //  1. Legacy: user pasted / typed a module script into the top local
    //     textarea — check `text` above.
    //  2. Chunked UX (2026-07-24): user tapped a module TextNode; its
    //     full text lives on node.data('text') via readingState.nodeId,
    //     not in any editable card. Check the node text directly.
    // If either path finds a %%bd_module directive, show + enable Player.
    // If neither, hide + disable; if we're currently in Player mode when
    // the module disappears, force back to Nodes via bd:force-nodes-mode.
    const playerRadio = document.querySelector('#view-mode-toggle input[value="player"]');
    const playerLabel = playerRadio ? playerRadio.closest('label') : null;
    if (playerRadio && playerLabel) {
      const MODULE_RE = /^%%bd_module\s+\S+/m;
      // Two independent sources, kept apart so the auto-switch can key off the
      // node while the enable/disable state still honours a pasted script.
      const cardHasModule = MODULE_RE.test(text);
      let nodeHasModule = false;
      let moduleNodeId  = null;
      if (readingState && readingState.nodeId) {
        const rn = cy.getElementById(readingState.nodeId);
        if (rn && rn.length && MODULE_RE.test(rn.data('text') || '')) {
          nodeHasModule = true;
          moduleNodeId  = readingState.nodeId;
        }
      }
      const hasModule = cardHasModule || nodeHasModule;
      playerRadio.disabled = !hasModule;
      // 2026-08-14 — Player label always visible now (part of the yellow
      // top-row radio group alongside Nodes + Edit). Only the disabled
      // attribute is contextual; visibility isn't. Clicking the disabled
      // radio will surface an explanatory message (TBD).
      if (!hasModule && playerRadio.checked) {
        const nodesRadio = document.querySelector('#view-mode-toggle input[value="nodes"]');
        if (nodesRadio) nodesRadio.checked = true;
        playerRadio.checked = false;
        document.dispatchEvent(new CustomEvent('bd:force-nodes-mode'));
      }
      // Auto-switch to Player when a module script "lands". Two ways:
      //   · the user read-taps a module NODE we haven't auto-switched for yet
      //     (keyed by node id, so a second module node fires again, and so
      //     does returning to the first one after reading something else);
      //   · a script is pasted into the top card while no module node is in
      //     play — the original false→true edge, kept for that path only.
      // Manual Nodes selection is still respected: while the reading node is
      // unchanged its id already equals lastAutoPlayerNodeId, so the repeated
      // updateSendBtn calls can't drag the user back into Player.
      const landedOnModuleNode = nodeHasModule && moduleNodeId !== lastAutoPlayerNodeId;
      const pastedIntoTopCard  = !nodeHasModule && cardHasModule && !prevCardHasModule;
      if ((landedOnModuleNode || pastedIntoTopCard) && !playerRadio.checked) {
        console.log('[auto-player] engaging Player for',
                    moduleNodeId ? ('node ' + moduleNodeId) : 'pasted script');
        playerRadio.checked = true;
        playerRadio.dispatchEvent(new Event('change'));
      }
      // Remember what we acted on. Reading a NON-module node clears the key, so
      // coming back to a module node counts as a fresh landing.
      lastAutoPlayerNodeId = nodeHasModule ? moduleNodeId : null;
      prevCardHasModule    = cardHasModule;
    }
  }

  // Click-time send: read the *current* textarea value (card.text isn't synced
  // on direct user typing). Returns true if the WS frame went out.
  function sendTopLocalCard() {
    const top = topLocalCard();
    if (!top || !top.body) return false;
    const text = top.body.value;
    if (!text.trim()) return false;
    const wsNow = wsRef.current;
    if (!wsNow || !wsNow.connected) return false;
    const sendId = 'send_' + (nextSendId++);
    pendingSends.set(sendId, top);
    wsNow.emit('msg', { type: 'buddy_card', sendId, text });
    return true;
  }

  function fmtDeliveredAt(iso) {
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return 'delivered ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  // Stamp the matching card on `buddy_card_ack`. Overwrites any prior stamp
  // so a re-sent card shows only the most recent delivery time (§6.5).
  function handleBuddyCardAck(msg) {
    const card = pendingSends.get(msg.sendId);
    if (!card) return;
    pendingSends.delete(msg.sendId);
    if (!card.el) return;
    const head = card.el.querySelector('.card-head');
    if (!head) return;
    let stamp = head.querySelector('.card-delivered');
    if (!stamp) {
      stamp = document.createElement('span');
      stamp.className = 'card-delivered';
      head.appendChild(stamp);
    }
    stamp.textContent = fmtDeliveredAt(msg.deliveredAt);
  }

  function positionTooltip(x, y) {
    const pad = 14;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    let left = x + pad;
    let top  = y + pad;
    if (left + tw > window.innerWidth  - pad) left = x - tw - pad;
    if (left < pad) left = pad;
    if (top  + th > window.innerHeight - pad) top  = y - th - pad;
    if (top < BARS_BOTTOM) top = BARS_BOTTOM;
    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
  }

  function positionTooltipTouch(node) {
    const pos = node.renderedPosition();
    const th = tooltip.offsetHeight;
    let top = pos.y - 80;
    if (top < BARS_BOTTOM) top = pos.y + 80;
    if (top + th > window.innerHeight - 10) top = window.innerHeight - th - 10;
    tooltip.style.left = '14px';
    tooltip.style.top  = top + 'px';
  }

  function showTooltip(node, x, y, isTouch) {
    const content = buildTooltipContent(node);
    if (!content) return;
    tooltip.textContent = content;
    tooltip.style.display = 'block';
    tooltipNodeId = node.id();
    if (isTouch) positionTooltipTouch(node);
    else positionTooltip(x, y);
  }

  function hideTooltip() {
    clearTimeout(dwellTimer);
    dwellTimer = null;
    tooltip.style.display = 'none';
    tooltipNodeId = null;
  }

  function startDwell(node, x, y, isTouch) {
    clearTimeout(dwellTimer);
    dwellTimer = setTimeout(() => showTooltip(node, x, y, isTouch), DWELL_MS);
  }

  function cancelDwell() {
    clearTimeout(dwellTimer);
    dwellTimer = null;
  }

  // Touch hold dwell (tapstart held 400ms without move)
  cy.on('tapstart', 'node', evt => {
    if (!isTouchEvent(evt)) return;
    markRecentTouch();
    if (!buildTooltipContent(evt.target)) return;
    const rp = evt.renderedPosition;
    startDwell(evt.target, rp.x, rp.y, true);
  });

  cy.on('tapend', 'node', evt => {
    if (isTouchEvent(evt)) cancelDwell();
  });

  cy.on('tapdrag', evt => { if (isTouchEvent(evt)) cancelDwell(); });

  // History (for collapse)

  const backBtn = document.getElementById('back-btn');

  // 2026-08-27 — the Back button now WEARS the node it will return you to.
  //
  // This is the PN control of corner_controls_plan.md step 2. The plan had it
  // as a NEW DOM control with its own stack, until the user asked whether the
  // PN is simply this button carrying the previous node's style. It is — and
  // this button's stack already POPS (saveState/restoreState), which the
  // parallel `prevReadNodeId` history built beside it did not, and that missing
  // pop was the whole of the A->B->A->B oscillation.
  //
  // So step 2 is APPEARANCE ONLY. No new stack, no new click handler, no
  // recording. The button already went to the right place; it just never said
  // where that was.

  // Black or white ink, chosen by measured luminance rather than by eye. The
  // family palette spans a wide lightness range, so no single ink works for all
  // of it — and the user relies on luminance contrast rather than hue, which
  // makes guessing this the wrong move specifically here.
  const INK_DARK = '#1a1a20', INK_DARK_L = 0.0106;   // relative luminance of INK_DARK
  function readableInk(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return INK_DARK;
    const v = parseInt(m[1], 16);
    const lin = c => (c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const L = 0.2126 * lin((v >> 16) & 255) + 0.7152 * lin((v >> 8) & 255) + 0.0722 * lin(v & 255);
    const vsWhite = 1.05 / (L + 0.05);
    const vsDark  = (L + 0.05) / (INK_DARK_L + 0.05);
    return vsWhite > vsDark ? '#ffffff' : INK_DARK;
  }

  function updateBackBtn() {
    const has = history.length > 0;
    backBtn.classList.toggle('visible', has);
    if (!has) return;

    const dest = history[history.length - 1].chipNode;
    if (!dest || !dest.length) {           // parentless view — plain arrow, as before
      // Clear only what the DESTINATION set, not the whole style attribute.
      // (This guarded a placement written by JS; the buttons are flex children
      // of #bd-toppanel now, so nothing else lives in their inline style — but
      // targeted clearing is still the correct habit.)
      backBtn.textContent = '\u2190';   // clears both spans as well
      backBtn.style.background = backBtn.style.color = backBtn.style.borderColor = '';
      backBtn.style.borderRadius = '';
      backBtn.removeAttribute('title');
      return;
    }

    paintNodeButton(backBtn, dest, '\u2190', 'Local:');
    backBtn.style.borderColor = 'rgba(0,0,0,0.55)';
  }

  // Shared by every corner control, so PN, BN and GN cannot drift apart in
  // appearance. `suffix` is an optional glyph placed AFTER the label — the
  // user's rule, and it is a good one: a left-pointing arrow after the word
  // points AT the word, reading "go to this", where leading it points away
  // from the name and reads as a description of where you already are.
  function paintNodeButton(btn, node, suffix, role) {
    // bnBaseColour, NOT data('colour') — the same distinction the blue radial
    // fill already had to make. Several node types set background-color
    // literally in the stylesheet and never touch the data field: gateway
    // TextNodes render WHITE with black text but carry colour:null, so reading
    // the data field painted the button the dark fallback instead. The root
    // node, the Gateways square and the snake view's inline fills are all the
    // same, and a control that stands for a node must wear what that node
    // actually looks like or it stops being recognisable — which is the whole
    // job it has.
    const colour = bnBaseColour(node);
    const full   = String(node.data('display_name') || node.data('name') || '');
    // truncateChipLabel FLATTENS whitespace before measuring — load-bearing,
    // since Cluster display_name carries real newlines ("Loss\nLonging") and a
    // length test on the raw string passes while the render is wrong.
    const label  = truncateChipLabel(full);

    // Two lines: a quiet role prefix over the node's name. Built as DOM nodes,
    // not innerHTML — display_name comes from the database and is not ours to
    // trust with markup, and textContent needs no escaping to be safe.
    btn.textContent = '';
    const roleEl = document.createElement('span');
    roleEl.className = 'btn-role';
    roleEl.textContent = role || '';
    const nameEl = document.createElement('span');
    nameEl.className = 'btn-name';
    nameEl.textContent = label ? (suffix ? label + ' ' + suffix : label) : (suffix || '');
    btn.append(roleEl, nameEl);
    btn.style.background = colour;
    btn.style.color      = readableInk(colour);
    // Gateways is the corpus's one square node. Everything else that can reach
    // a corner is round-rectangle, hexagon or round-triangle, none of which
    // survive being drawn 20px high — rounding is the honest half of the shape
    // signal, and the colour carries the rest.
    btn.style.borderRadius =
      (node.data('type') === 'Entry' && node.data('name') === 'Gateways') ? '2px' : '6px';
    btn.title = full.replace(/\s+/g, ' ');   // the untruncated name, on hover
  }

  function saveState() {
    const focusEl = activeNodeId ? cy.getElementById(activeNodeId) : null;
    const chipNode = (focusEl && focusEl.length) ? focusEl : lastParentNode;
    history.push({ ids: cy.elements(':visible').map(el => el.id()), parent: lastParentNode, chipNode });
    updateBackBtn();
  }

  function restoreState() {
    if (history.length === 0) return false;
    exitSnakeView();
    exitRouteView();
    const state = history.pop();
    const ids = new Set(state.ids);
    lastParentNode = state.parent;
    activeNodeId = null;
    cy.elements().hide();
    scheduleBlueReassert();   // §5 — survive this view change
    cy.elements().filter(el => ids.has(el.id())).show();
    runLayout(cy, lastParentNode);
    updateBackBtn();
    const dest = state.chipNode || state.parent;
    if (dest && dest.length) {
      const ptype = dest.data('type');
      if (ptype === 'Entry' || ptype === 'Family' || ptype === 'Cluster' || ptype === 'TextNode') addYouChip(dest);
      // 2026-08-27 — restore the SELECTION too, not only the view. Back used to
      // null activeNodeId, which was tolerable while Back only ever meant
      // "collapse to the parent": there was no particular node to come back to.
      // Returning across a BN jump is different — you were reading something
      // specific — and arriving with nothing selected loses the amber ring and
      // leaves Unified Focus with nothing to focus. Guarded on visible() so a
      // node the restored view does not show cannot become the selection.
      if (dest.visible()) { activeNodeId = dest.id(); markReadNode(dest, cy); }
    }
    return true;
  }

  backBtn.addEventListener('click', () => { restoreState(); });

  // Expand

  function clearFamilyView() {
    cy.$('.family-view').removeClass('family-view');
  }

  function expandToNode(node) {
    clearFamilyView();
    exitSnakeView();
    saveState();
    activeNodeId = node.id();
    // Make every expand a first-class hint context: track the node as
    // lastParentNode AND pass it to runLayout. Previously this was only
    // set on Family/Cluster expand — so clicking Root/Entry (e.g.
    // Conversations) or a TextNode left lastParentNode either null
    // ("tap a family first" on Write) or stale from a prior Family view
    // (Write silently captured against edges that aren't even visible).
    // Passing the node into runLayout also enables hint restore on
    // reload for these tiers, symmetric with the Cluster-expand fix.
    lastParentNode = node;
    cy.elements().hide();
    scheduleBlueReassert();   // §5 — survive this view change

    if (node.data('type') === 'root') {
      // Root click: show root + its real Neo4j neighbours (Family nodes + invisible edges)
      node.closedNeighborhood().show();
    } else {
      // One-hop rule: show node + immediate neighbours
      node.show();
      node.closedNeighborhood()
        .filter(el => el.data('type') !== '__root_edge__')
        .show();
    }

    runLayout(cy, node);
  }

  function expandToFamily(familyNode) {
    clearFamilyView();
    saveState();
    lastParentNode = familyNode;
    activeNodeId = familyNode.id();
    cy.elements().hide();
    scheduleBlueReassert();   // §5 — survive this view change
    familyNode.show();

    // Show all DESCENDS_FROM edges connected to this family (both directions)
    // and their neighbouring nodes — gives Conversations context above and Buds below
    const descEdges = familyNode.connectedEdges('[type="DESCENDS_FROM"]');
    descEdges.show();
    descEdges.connectedNodes().show();

    runLayout(cy, familyNode);
  }

  function expandChildLevel() {
    // For a TextNode repeated click: reveal one more level of CHILD relationships
    saveState();
    cy.nodes('[type="TextNode"]:visible').forEach(tn => {
      const childEdges = tn.connectedEdges('[type="CHILD"]');
      childEdges.show();
      childEdges.connectedNodes().show();
    });
    runLayout(cy);
  }

  function expandToCluster(clusterNode) {
    clearFamilyView();
    exitSnakeView();
    cy.$('node[type="Cluster"].active-cluster').removeClass('active-cluster');
    clusterNode.addClass('active-cluster');
    lastClusterNode = clusterNode;
    // The dev-write button captures hint_x/hint_y for lastParentNode's child
    // edges. Cluster expand IS a first-class hint context (its gateways and
    // Family parents are the "children" to arrange), so lastParentNode has
    // to be the cluster — otherwise Write would silently record positions
    // against whatever previous parent was set (e.g. the containing Family).
    lastParentNode = clusterNode;
    currentClusterColour = clusterNode.data('colour');
    saveState();
    activeNodeId = clusterNode.id();
    cy.elements().hide();
    scheduleBlueReassert();   // §5 — survive this view change

    clusterNode.show();
    clusterNode.connectedEdges().forEach(edge => {
      const other = edge.source().id() === clusterNode.id() ? edge.target() : edge.source();
      if (other.data('type') === 'Family') { edge.show(); other.show(); }
    });

    // Show gateway nodes connected via CONTAINS_CLUSTER, with chapter counts as badges
    const gwEdges = clusterNode.incomers('edge[type="CONTAINS_CLUSTER"]');
    gwEdges.forEach(edge => {
      const gw = edge.source();
      gw.show();
      gw.data('n_r', edge.data('count') || 0);
      addBadge(gw);
    });

    cy.edges().filter(e =>
      e.source().visible() && e.target().visible() && e.data('type') !== 'CHILD'
    ).show();

    // Pass the cluster as parentNode so runLayout's hint scan finds edges
    // touching it and can restore hint-based positions (previously null, so
    // hint mode was always 'force' on cluster expand — no restore).
    runLayout(cy, clusterNode);

    // 2026-08-17 — re-apply the white active-node border. The tap handler runs
    // markReadNode(cluster) BEFORE this expand, but exitSnakeView() above wipes
    // border styles off ALL Cluster nodes — so the just-set border was lost on
    // the first tap (a second, no-op same-node tap re-set it). Re-mark here so
    // the border lands on the very first cluster tap.
    markReadNode(clusterNode, cy);

    // 2026-08-23 — REMOVED: a deferred fallback that put every gateway in a
    // single row at clusterY + 150, 500ms after this function returned.
    //
    // It dated from before runLayout placed gateways at all, and it was the
    // real cause of "the block floats down into a line": the seq-grid branch
    // laid out a compact block, and half a second later this silently
    // overwrote it. Every attempt to fix the block — reshaping the seed,
    // retuning fCoSE, pinning the nodes — was being undone by a second writer
    // nobody was looking at.
    //
    // Its own guard could never fire: it skipped only when a gateway edge
    // carried a bare hint_x/hint_y, and CONTAINS_CLUSTER edges carry no hints
    // at all. So the row was applied on EVERY cluster expand, unconditionally.
    //
    // runLayout's seq-grid branch now seeds the gateways in a square-ish block
    // and pins them, so there is nothing left for a fallback to fall back to.
    // The cy.fit it also did is covered by the layout's own fit:true and the
    // layoutstop handler.
  }

  async function handleGatewayClick(node) {
    // 2026-08-27 — this used to read `if (!lastClusterNode)`, and that one
    // condition carried two faults the user found as "sometimes clicking a
    // gateway shows a tableau of 70+ clusters".
    //
    // lastClusterNode is written ONLY by expandToCluster and never cleared, so:
    //
    //  1. Cold — before any cluster has been visited it is null, and the click
    //     fell through to expandToNode, whose one-hop rule shows the gateway's
    //     ENTIRE neighbourhood: up to 48 clusters plus every chunk TextNode.
    //     Hence "sometimes", and hence "not usually" — normally you have been
    //     through a cluster first.
    //  2. Stale — it is whatever cluster you saw LAST, which may belong to a
    //     different work. The query then finds no chunk of THIS work in THAT
    //     cluster, and the focused view collapses to two nodes with no
    //     explanation. Quieter than fault 1 and probably read as "did nothing".
    //
    // So the context is now VALIDATED rather than assumed: use it only when
    // this gateway actually contains it.
    const ctxValid = !!(lastClusterNode && lastClusterNode.length &&
      node.outgoers('edge[type="CONTAINS_CLUSTER"]').targets()
          .some(c => c.id() === lastClusterNode.id()));

    if (!ctxValid) {
      // No cluster context: show the work's THEMES — the gateway and the
      // clusters it contains — rather than its whole neighbourhood. Still a
      // large view for a big work, but a deliberate and meaningful one, and
      // without the chunk TextNodes that made it a wall.
      exitSnakeView();
      saveState();
      activeNodeId = node.id();
      lastParentNode = node;
      cy.elements().hide();
      scheduleBlueReassert();
      node.show();
      const themes = node.outgoers('edge[type="CONTAINS_CLUSTER"]');
      themes.show();
      themes.targets().show();
      cy.edges().filter(e => e.source().visible() && e.target().visible()).show();
      runLayout(cy, node);
      markReadNode(node, cy);
      return;
    }

    const work = node.data('source_text');
    const clusterName = lastClusterNode.data('name');
    let records;
    try {
      records = await safeQuery('gwClick',
        'MATCH (n:TextNode {source_text: $work, gateway: false})-[r]->(c:Cluster {name: $clusterName}) ' +
        'RETURN n, r',
        { work, clusterName }
      );
    } catch (err) {
      if (err.message === 'session_expired') showSessionExpired();
      else console.error('[BD] Gateway click error:', err);
      return;
    }

    const showIds = new Set([lastClusterNode.id(), node.id()]);
    for (const rec of records) {
      if (!rec.n) continue;
      // stable_id_spec.md §6 — THE site the July 2026 attempt got wrong. It
      // canonicalised at load time only, leaving this follow-up query speaking
      // elementIds, so the two sources stopped agreeing. Using nodeId() here
      // means load and follow-up mint the same identifier by construction.
      const id = nodeId(rec.n);
      showIds.add(id);
      // Also include the title page (section_title node) connected via PART_OF
      // so the user can tap it to enter snake view
      const contentNode = cy.getElementById(id);
      if (contentNode.length) {
        contentNode.connectedEdges('[type="PART_OF"]').targets().forEach(tp => showIds.add(tp.id()));
      }
    }

    exitSnakeView();
    saveState();
    activeNodeId = node.id();
    cy.elements().hide();
    scheduleBlueReassert();   // §5 — survive this view change
    showIds.forEach(id => { const el = cy.getElementById(id); if (el.length) el.show(); });
    // Show every edge whose both endpoints are visible. Previously excluded
    // CHILD explicitly — that created the "click gateway shows no arrow to
    // its TextNodes but click a TextNode shows the arrow to its gateway"
    // asymmetry. Consistent rule: if the relationship exists, show it.
    cy.edges().filter(e =>
      e.source().visible() && e.target().visible()
    ).show();
    lastParentNode = lastClusterNode;
    runLayout(cy, lastClusterNode);

    // 2026-07-31 — first-time helper: user just arrived at the title-node
    // + text-node layout for the first time this session; orient them.
    if (!gatewayHelperShown) {
      prependSystemCard(
        'The grey nodes are title nodes — click once to see any ' +
        'comments on the particular work and again to see the complete ' +
        'work divided into parts. Or click the black text node directly ' +
        'to view a particularly relevant section.'
      );
      gatewayHelperShown = true;
    }
  }

  function exitSnakeView() {
    cy.$('.snake-section').forEach(n => {
      n.removeClass('snake-section');
      n.removeStyle('background-color background-opacity width height font-size text-valign text-margin-y border-width border-color border-opacity');
    });
    cy.nodes('[type="Cluster"]').removeStyle('width height text-max-width background-color label border-width border-color border-opacity');
    cy.nodes('[type="ClusterEditChip"]').remove();
    // Restore lastClusterNode badge to its own n_r in case a temporary-swap left it
    // showing a different cluster's count during edit mode
    if (lastClusterNode && lastClusterNode.length) addBadge(lastClusterNode);
    editSelectedClusterId  = null;
    editSelectedTextNodeId = null;
    chipGridParams         = null;
    document.getElementById('cluster-editor-bar').style.display = 'none';
    document.getElementById('clone-panel').style.display = 'none';
  }

  function positionEditorBar() {
    const bar = document.getElementById('cluster-editor-bar');
    if (bar.style.display === 'none') return;
    if (!lastClusterNode || !lastClusterNode.length || !lastClusterNode.visible()) return;
    try {
      const bb            = lastClusterNode.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
      const containerRect = cy.container().getBoundingClientRect();
      const nodeRightX    = Math.round(containerRect.left + bb.x2);
      const nodeScreenY   = Math.round(containerRect.top  + (bb.y1 + bb.y2) / 2);
      bar.style.left      = (nodeRightX + 8) + 'px';
      bar.style.top       = nodeScreenY + 'px';
      bar.style.transform = 'translateY(-50%)';
    } catch (_) {}
  }

  function updateEditorBar() {
    const bar       = document.getElementById('cluster-editor-bar');
    const deleteBtn = document.getElementById('editor-delete-btn');
    const cloneBtn  = document.getElementById('editor-clone-btn');
    const saveBtn   = document.getElementById('editor-save-btn');
    const spinners  = bar.querySelectorAll('.spinner-group');

    if (!editSelectedClusterId) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';
    cloneBtn.style.display = 'inline-block';
    positionEditorBar();

    if (!editSelectedTextNodeId) {
      spinners.forEach(s => { s.style.display = 'none'; });
      saveBtn.style.display  = 'none';
      deleteBtn.style.display = 'none';
      return;
    }
    const textNode = cy.getElementById(editSelectedTextNodeId);
    if (!textNode.length) {
      spinners.forEach(s => { s.style.display = 'none'; });
      saveBtn.style.display   = 'none';
      deleteBtn.style.display = 'none';
      return;
    }

    spinners.forEach(s => { s.style.display = 'flex'; });
    saveBtn.style.display = 'inline-block';

    const edge = textNode.outgoers('edge[type="CLUSTER_REL"]')
      .filter(e => e.target().id() === editSelectedClusterId)
      .first();
    if (edge.length) {
      document.getElementById('sp-tagged-as').value      = edge.data('tagged_as')      ?? 0.0;
      document.getElementById('sp-resonates-with').value = edge.data('resonates_with') ?? 0.0;
      document.getElementById('sp-bridges-to').value     = edge.data('bridges_to')     ?? 0.0;
      document.getElementById('sp-echoes').value         = edge.data('echoes')         ?? 0.0;
      document.getElementById('sp-gives').value          = edge.data('gives')          ?? 0.0;
      deleteBtn.style.display = 'inline-block';
    } else {
      document.getElementById('sp-tagged-as').value      = 0.5;
      document.getElementById('sp-resonates-with').value = 0.0;
      document.getElementById('sp-bridges-to').value     = 0.0;
      document.getElementById('sp-echoes').value         = 0.0;
      document.getElementById('sp-gives').value          = 0.0;
      deleteBtn.style.display = 'none';
    }
  }

  function clearEditSelection() {
    if (editSelectedTextNodeId) {
      const tn = cy.getElementById(editSelectedTextNodeId);
      if (tn.length) tn.removeStyle('border-width border-color border-opacity');
    }
    const chipW = 53, chipH = 21;
    cy.nodes('[type="ClusterEditChip"]').forEach(chip => {
      chip.style({ 'width': chipW, 'height': chipH, 'border-width': 0 });
    });
    // Keep editSelectedClusterId so the next text-node tap reopens the bar immediately
    editSelectedTextNodeId = null;
    document.getElementById('clone-panel').style.display = 'none';
    updateEditorBar();
  }

  function applyEditChipSelection(selectedClusterId) {
    editSelectedClusterId = selectedClusterId;
    document.getElementById('clone-panel').style.display = 'none';
    const selectedCluster = cy.getElementById(selectedClusterId);
    const selectedColour  = selectedCluster.data('colour');
    const selectedName    = selectedCluster.data('display_name') || selectedCluster.data('name') || '';

    const chipW = 53, chipH = 21;

    // Chips are unbordered by default — selection shown only via the cluster node above the grid
    cy.nodes('[type="ClusterEditChip"]').forEach(chip => {
      chip.style({ 'opacity': 1.0, 'width': chipW, 'height': chipH, 'border-width': 0 });
    });

    // Update the current cluster node above the text grid to reflect the selection.
    // Its badge is wired to its own n_r data; temporarily swap that data to show
    // the selected cluster's count, then restore so underlying data stays correct.
    if (lastClusterNode && lastClusterNode.length) {
      lastClusterNode.style({
        'background-color': selectedColour,
        'label':            selectedName,
      });
      const origN_r = lastClusterNode.data('n_r');
      lastClusterNode.data('n_r', selectedCluster.data('n_r') ?? 0);
      addBadge(lastClusterNode);
      lastClusterNode.data('n_r', origN_r);
    }

    // Highlight text nodes belonging to the selected cluster
    cy.$('.snake-section').forEach(n => {
      const linked = n.outgoers('edge[type="CLUSTER_REL"]')
        .filter(e => e.target().id() === selectedClusterId).length > 0;
      n.style({
        'background-color':   linked && selectedColour ? selectedColour : '#1a1a1a',
        'background-opacity': linked ? 0.9 : 0.35,
      });
    });

    // Re-apply grey exterior borders if a text node is currently selected
    if (editSelectedTextNodeId) {
      const textNode = cy.getElementById(editSelectedTextNodeId);
      if (textNode.length) {
        const linkedClusterIds = new Set(
          textNode.outgoers('edge[type="CLUSTER_REL"]').targets().map(c => c.id())
        );
        cy.nodes('[type="ClusterEditChip"]').forEach(chip => {
          const linked = linkedClusterIds.has(chip.data('mainClusterId'));
          chip.style({
            'width':          linked ? chipW + 4 : chipW,
            'height':         linked ? chipH + 4 : chipH,
            'border-width':   linked ? 2 : 0,
            'border-color':   '#888888',
            'border-opacity': linked ? 1.0 : 0,
          });
        });
      }
    }
    updateEditorBar();
  }

  function applyEditTextSelection(node) {
    const chipW = 53, chipH = 21;

    // Clear border from previously selected text node
    if (editSelectedTextNodeId && editSelectedTextNodeId !== node.id()) {
      cy.getElementById(editSelectedTextNodeId).removeStyle('border-width border-color border-opacity');
    }
    editSelectedTextNodeId = node.id();

    // White border on the selected text node
    node.style({ 'border-width': 2, 'border-color': '#ffffff', 'border-opacity': 1 });

    // Find all clusters this text node belongs to
    const linkedClusterIds = new Set(
      node.outgoers('edge[type="CLUSTER_REL"]').targets().map(c => c.id())
    );

    // Grey exterior (+4px) border on all related chips, unbordered otherwise
    cy.nodes('[type="ClusterEditChip"]').forEach(chip => {
      const linked = linkedClusterIds.has(chip.data('mainClusterId'));
      chip.style({
        'width':          linked ? chipW + 4 : chipW,
        'height':         linked ? chipH + 4 : chipH,
        'border-width':   linked ? 2 : 0,
        'border-color':   '#888888',
        'border-opacity': linked ? 1.0 : 0,
      });
    });
    updateEditorBar();
  }

  function handleTitlePageTap(titlePage) {
    const clusterNode   = lastClusterNode;
    const clusterColour = currentClusterColour;

    // Get all content parts that belong to this title page via PART_OF
    const parts = titlePage.connectedEdges('[type="PART_OF"]')
      .connectedNodes()
      .filter(n => n.data('type') === 'TextNode' && !n.data('section_title') && !n.data('gateway'))
      .sort((a, b) => (a.data('seq') ?? 0) - (b.data('seq') ?? 0));

    if (!parts.length) {
      expandToNode(titlePage);
      return;
    }

    exitSnakeView();
    saveState();
    activeNodeId = titlePage.id();
    cy.elements().hide();
    scheduleBlueReassert();   // §5 — survive this view change

    if (clusterNode && clusterNode.length) clusterNode.show();
    titlePage.show();
    // 2026-08-14 — also surface the gateway node for this work. It's the
    // upstream link between Cluster and Title in the reading breadcrumb;
    // hiding it here forced the user to mentally interpolate the connection.
    // Match by source_text (both gateway and title carry the work name).
    const workText = titlePage.data('source_text');
    const gatewayNode = workText
      ? cy.nodes('[type="TextNode"][?gateway]').filter(n => n.data('source_text') === workText).first()
      : null;
    if (gatewayNode && gatewayNode.length) gatewayNode.show();

    const count    = parts.length;
    const cols     = Math.min(15, Math.max(5, Math.round(Math.sqrt(count))));
    const gapX     = 10;
    const gapY     = 10;
    const originX  = 50;
    const clusterX = 0;
    // A52c: adaptive sizing — make the grid fill the available canvas width
    // after the layout's fit padding so each device gets the right tap-target
    // size for its CSS viewport. iPhone Mini gets smaller cells than Pro Max,
    // desktop gets larger; all fill the available horizontal space.
    // Clamped [46, 120]: 46 = Apple-recommended minimum tap target;
    // 120 stops desktop / wide viewports going overboard.
    //
    // layoutPad MUST be the same number passed to cy.layout({ padding: ... })
    // below — that padding is what eats the canvas around the fit. Shrunk on
    // small canvases so phones don't lose half their width to padding.
    const canvasW  = (cy.width()  && cy.width()  > 100) ? cy.width()  : window.innerWidth;
    const canvasH  = (cy.height() && cy.height() > 100) ? cy.height() : window.innerHeight;
    const layoutPad = Math.max(20, Math.min(50, Math.min(canvasW, canvasH) * 0.06));
    const availW   = canvasW - 2 * layoutPad;
    const nodeW    = Math.max(46, Math.min(120,
      Math.floor((availW - (cols - 1) * gapX) / cols)
    ));
    const nodeH    = Math.round(nodeW * 0.57);
    const fontSize = nodeW >= 60 ? 12 : nodeW >= 50 ? 11 : 10;
    const headerY  = 30;

    // Edit mode: text nodes 50% of base size, doubled columns, grid at bottom
    const dispCols  = clusterEditActive() ? Math.min(30, Math.max(10, cols * 2)) : cols;
    const dispNodeW = clusterEditActive() ? Math.round(nodeW * 0.5) : nodeW;
    const dispNodeH = clusterEditActive() ? Math.round(dispNodeW * 0.57) : nodeH;
    const dispFont  = clusterEditActive() ? 7 : fontSize;
    const stepX     = dispNodeW + gapX;
    const stepY     = dispNodeH + gapY;

    parts.forEach(n => {
      n.show();
      n.addClass('snake-section');
      const linked = clusterNode &&
        n.outgoers('edge[type="CLUSTER_REL"]')
         .filter(e => e.target().id() === clusterNode.id()).length > 0;
      n.style({
        'width':              dispNodeW,
        'height':             dispNodeH,
        'font-size':          dispFont + 'px',
        'background-color':   linked && clusterColour ? clusterColour : '#1a1a1a',
        'background-opacity': 0.7,
        'text-valign':        'center',
        'text-margin-y':      clusterEditActive() ? -Math.round(dispNodeH / 4) : 0,
      });
    });

    const positions = {};

    if (!clusterEditActive()) {
      // Non-edit reading-mode layout (rev 2026-08-16):
      //   [Cluster]   [Gateway]   [Title]      ← ONE row, spanning grid width
      //        ↓ 5 px gap                       ← gap between header row and grid
      //   [ text-node snake grid ]
      //
      // Cluster's LEFT edge = grid's left edge; Title's RIGHT edge = grid's
      // right edge; Gateway centred between them. Row bottom sits 5 px
      // above the grid top. Cluster row absent-gateway falls back to a
      // two-node distribution (Cluster left, Title right).
      // Node dimensions used are the CSS defaults from the style block:
      //   active-cluster: 98 × 48; TextNode (gateway/title): 120 × 34.
      const CLUSTER_W = 98,  CLUSTER_H = 48;
      const NODE_W    = 120, NODE_H    = 34;
      const rowH      = Math.max(CLUSTER_H, NODE_H);
      const HEADER_GAP = 5;

      const gridLeftEdge  = originX - dispNodeW / 2;
      const gridRightEdge = originX + (dispCols - 1) * stepX + dispNodeW / 2;
      const clusterCenterX = gridLeftEdge  + CLUSTER_W / 2;
      const titleCenterX   = gridRightEdge - NODE_W    / 2;
      const gatewayCenterX = (clusterCenterX + titleCenterX) / 2;

      const rowCenterY = 0;   // arbitrary reference; cy.fit re-frames anyway
      const gridY = rowCenterY + rowH / 2 + HEADER_GAP + dispNodeH / 2;

      if (clusterNode && clusterNode.length)
        positions[clusterNode.id()] = { x: clusterCenterX, y: rowCenterY };
      if (gatewayNode && gatewayNode.length)
        positions[gatewayNode.id()] = { x: gatewayCenterX, y: rowCenterY };
      positions[titlePage.id()]     = { x: titleCenterX,   y: rowCenterY };

      parts.forEach((n, i) => {
        const row      = Math.floor(i / dispCols);
        const col      = i % dispCols;
        const snakeCol = (row % 2 === 0) ? col : (dispCols - 1 - col);
        positions[n.id()] = { x: originX + snakeCol * stepX, y: gridY + row * stepY };
      });
    } else {
      // Edit mode: chip grid at top, title+cluster immediately above text grid
      const titleW       = 120;
      const titleH       = 34;
      const editClusterW = Math.round(titleH * 37 / 16);  // chip aspect ratio, title height

      const chipW = 53, chipH = 21, chipGapX = 5, chipGapY = 5;
      const chipStepX  = chipW + chipGapX;
      const chipStepY  = chipH + chipGapY;
      // alignX = left edge of text grid (node centres are at originX, so left edge is half a node left)
      const alignX     = originX - dispNodeW / 2;
      const chipStartX = alignX;
      const canvasRight = originX + (dispCols - 1) * stepX + dispNodeW / 2;
      const chipsPerRow = Math.max(1, Math.floor((canvasRight - alignX) / chipStepX));
      // const sortedClusters = sortClustersByColour(cy.nodes('[type="Cluster"]').toArray());
      const sortedClusters = sortClustersByRgb(cy.nodes('[type="Cluster"]').toArray(), clusterNode);
      const chipRows    = Math.ceil(sortedClusters.length / chipsPerRow);

      // Y layout: chips → gap → title+cluster → gap → text grid
      const chipBlockTop  = 0;
      const editHeaderY   = chipBlockTop + chipRows * chipStepY + 15 + titleH / 2;
      const editGridY     = editHeaderY + titleH / 2 + 10 + dispNodeH / 2;

      // Selected cluster defaults to the current cluster on entry
      if (!editSelectedClusterId)
        editSelectedClusterId = clusterNode ? clusterNode.id() : (sortedClusters[0]?.id() || null);

      // Store layout params so rebuildClusterEditGrid can re-render chips after clone
      chipGridParams = { chipW, chipH, chipStepX, chipStepY, chipStartX, chipBlockTop, chipsPerRow };

      // Chip grid
      cy.nodes('[type="ClusterEditChip"]').remove();
      sortedClusters.forEach((cluster, i) => {
        const row = Math.floor(i / chipsPerRow);
        const col = i % chipsPerRow;
        const chipId = 'cec_' + cluster.id();
        cy.add({
          group: 'nodes',
          data: {
            id: chipId,
            type: 'ClusterEditChip',
            mainClusterId: cluster.id(),
            colour: cluster.data('colour'),
            display_name: cluster.data('display_name') || cluster.data('name') || '',
          }
        });
        positions[chipId] = {
          x: chipStartX + col * chipStepX + chipW / 2,
          y: chipBlockTop + row * chipStepY + chipH / 2,
        };
      });

      // Title: left edge aligned with text grid left edge
      const titleCenterX = alignX + titleW / 2;
      positions[titlePage.id()] = { x: titleCenterX, y: editHeaderY };

      // Cluster: to the right of title, resized to chip aspect ratio at title height
      // +4 to width/height expands the 2px white border outward without reducing content area
      if (clusterNode && clusterNode.length) {
        clusterNode.style({
          'width':          editClusterW + 4,
          'height':         titleH + 4,
          'text-max-width': (editClusterW - 6) + 'px',
          'border-width':   2,
          'border-color':   '#ffffff',
          'border-opacity': 1,
        });
        positions[clusterNode.id()] = {
          x: titleCenterX + titleW / 2 + 8 + editClusterW / 2,
          y: editHeaderY,
        };
      }

      // Text grid
      parts.forEach((n, i) => {
        const row      = Math.floor(i / dispCols);
        const col      = i % dispCols;
        const snakeCol = (row % 2 === 0) ? col : (dispCols - 1 - col);
        positions[n.id()] = { x: originX + snakeCol * stepX, y: editGridY + row * stepY };
      });

      // Apply initial chip selection state
      applyEditChipSelection(editSelectedClusterId);
    }

    cy.layout({
      name: 'preset',
      positions,
      animate: true,
      animationDuration: 400,
      fit: true,
      padding: layoutPad,                /* A52c: was hardcoded 50 — now matches the nodeW math above */
    }).run();
  }

  // Media bar

  const mediaBar = document.getElementById('media-bar');

  // 2026-08-20 — stop BD's own track. Jump-to-external uses window.open, so
  // this tab stays alive and its audio carried on playing into the standalone;
  // with the ↻ loop on it never even ended. Worse, arriving back via the
  // standalone's "Jump to BD" navigates THAT tab, creating a second BD page —
  // so the still-playing one was a tab behind, with no visible transport, and
  // quitting Safari was the only way to silence it.
  // pagehide covers same-tab exits; the jump handler calls this directly,
  // because window.open does not fire pagehide here.
  function stopMediaPlayback() {
    const a = mediaBar && mediaBar.querySelector('audio');
    if (!a) return;
    if (!a.paused) a.pause();
    try { a.currentTime = 0; } catch (_) { /* not seekable yet */ }
    const b = mediaBar.querySelector('.mp-btn');
    if (b) b.textContent = '▶';
  }
  window.addEventListener('pagehide', stopMediaPlayback);
  // Published for init(): the media bar lives in setupInteractions()'s scope,
  // init() cannot see it. Mirrors window.bdStopMedia in the standalone.
  window.bdStopMedia = stopMediaPlayback;

  function fmtTime(s) {
    if (!isFinite(s)) return '–:––';
    const m = Math.floor(s / 60);
    return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  }

  function displayName(filename) {
    return filename.replace(/^[DA]_/i, '').replace(/\.mp3$/i, '').slice(0, 12);
  }

  function formatOption(file) {
    const name = displayName(file.name);
    const mb = Math.round(file.size / (1024 * 1024));
    return `${name}: ${mb < 1 ? '<1' : mb} MB`;
  }

  function loadMediaTrack(audio, btn, src) {
    const wasPlaying = !audio.paused;
    if (wasPlaying) audio.pause();
    audio.src = src;
    btn.textContent = '▶';
    setDownloading(true);
    if (wasPlaying) audio.play().then(() => { btn.textContent = '⏸'; }).catch(() => {});
  }

  // Build the media-bar's <select> HTML combining disk files + session tracks
  // (with an <optgroup> divider when both are present so the source is clear).
  function buildMediaSelectHtml(selectedValue) {
    let html = `<select class="mp-select">`;
    const useGroups = mediaFilesList.length > 0 && sessionTracksList.length > 0;
    if (mediaFilesList.length > 0) {
      if (useGroups) html += `<optgroup label="Files">`;
      for (const f of mediaFilesList) {
        const sel = f.name === selectedValue ? ' selected' : '';
        html += `<option value="${f.name}"${sel}>${formatOption(f)}</option>`;
      }
      if (useGroups) html += `</optgroup>`;
    }
    if (sessionTracksList.length > 0) {
      if (useGroups) html += `<optgroup label="Session">`;
      for (const t of sessionTracksList) {
        const sel = t.url === selectedValue ? ' selected' : '';
        const mb  = (t.sizeBytes / (1024 * 1024)).toFixed(1);
        html += `<option value="${t.url}"${sel}>${t.name}: ${mb} MB</option>`;
      }
      if (useGroups) html += `</optgroup>`;
    }
    html += `</select>`;
    return html;
  }

  // Loop preference persists within the session — once the user turns loop on
  // for one track, it stays on for the next auto-opened track.
  let mediaLoopOn = false;

  function toggleMediaBar(label, audioSrc) {
    if (mediaBar.classList.contains('active') && mediaBar.dataset.node === label) {
      return;
    }
    const existingAudio = mediaBar.querySelector('audio');
    if (existingAudio) { existingAudio.pause(); existingAudio.src = ''; }

    // Close (✕) button dropped 2026-08-05: once the bar has a track it stays
    // put, and the space matters more than the ability to hide it.
    // Loop (↻) toggle added: browsers give <audio loop> for free; the button
    // just flips audio.loop and keeps its own visual on/off state.
    mediaBar.innerHTML =
      buildMediaSelectHtml(audioSrc) +
      `<button class="mp-btn" aria-label="play">▶</button>` +
      `<button class="mp-loop" aria-label="loop" title="Loop this track">↻</button>` +
      `<audio src="${audioSrc}"${mediaLoopOn ? ' loop' : ''}></audio>`;

    mediaBar.dataset.node = label;
    mediaBar.classList.add('active');

    const audio    = mediaBar.querySelector('audio');
    const btn      = mediaBar.querySelector('.mp-btn');
    const loopBtn  = mediaBar.querySelector('.mp-loop');
    const select   = mediaBar.querySelector('.mp-select');

    audio.loop = mediaLoopOn;
    loopBtn.classList.toggle('on', mediaLoopOn);

    btn.addEventListener('click', () => {
      if (audio.paused) { audio.play(); btn.textContent = '⏸'; }
      else              { audio.pause(); btn.textContent = '▶'; }
    });
    loopBtn.addEventListener('click', () => {
      mediaLoopOn = !mediaLoopOn;
      audio.loop  = mediaLoopOn;
      loopBtn.classList.toggle('on', mediaLoopOn);
    });
    audio.addEventListener('ended', () => { if (!audio.loop) btn.textContent = '▶'; });
    audio.addEventListener('loadstart', () => setDownloading(true));
    audio.addEventListener('canplay', () => setDownloading(false));
    select.addEventListener('change', () => loadMediaTrack(audio, btn, select.value));
  }

  mediaBar.addEventListener('click', evt => {
    if (evt.target.classList.contains('media-close')) {
      setDownloading(false);
      mediaBar.classList.remove('active');
      mediaBar.dataset.node = '';
      mediaBar.innerHTML = '';
    }
  });

  // Accept an in-memory audio blob from a media module (e.g. bd_M_ABC's
  // Create-mp3 bake), register it as a session track, and open the media bar
  // with it selected. Capped to SESSION_TRACK_CAP most recent; oldest URL is
  // revoked when a new one pushes it out.
  function addSessionTrack({ label, audioData, mime, sizeBytes }) {
    if (!audioData) {
      console.warn('[addSessionTrack] no audioData — bail');
      return;
    }
    const blob = new Blob([audioData], { type: mime || 'audio/wav' });
    const url  = URL.createObjectURL(blob);
    sessionTracksList.push({ name: label || 'session', url, sizeBytes: sizeBytes || audioData.byteLength });
    while (sessionTracksList.length > SESSION_TRACK_CAP) {
      const oldest = sessionTracksList.shift();
      try { URL.revokeObjectURL(oldest.url); } catch (_) {}
    }
    console.log('[addSessionTrack] added', { label, url, sessionCount: sessionTracksList.length });
    // Force a rebuild — if the bar is already open we still want the new option
    // to appear and be selected. Clearing dataset.node bypasses the same-node
    // early-return in toggleMediaBar.
    mediaBar.dataset.node = '';
    toggleMediaBar(label, url);
  }

  // Tap handler

  // 2026-08-28 — WARNING: this function is currently DEAD. Its only callers were
  // the youCy and buddyCy chip tap handlers, and both breadcrumb bars are
  // retired (BREADCRUMB_BARS). It is kept whole with them, and comes back if
  // that constant is flipped.
  //
  // It reads like the obvious home for anything tap-related and IS NOT: the
  // live path is cy.on('tap','node'), which calls markReadNode and
  // advanceOrNavigate directly. Adding the haloed-node GN mint here cost a
  // round of testing before that was noticed.
  function handleNodeTap(node, addChip = true) {
    wsRef.lastActivity = Date.now();
    const type = node.data('type');

    if (CLUSTER_ASSIGN && type === 'ClusterEditChip') {
      applyEditChipSelection(node.data('mainClusterId'));
      return;
    }

    if (clusterEditActive() && node.hasClass('snake-section')) {
      applyEditTextSelection(node);
      return;
    }

    if (addChip && (type === 'Entry' || type === 'Family' || type === 'Cluster' || type === 'TextNode')) {
      addYouChip(node);
    }


    if (node.id() === activeNodeId) {
      if (type === 'TextNode') {
        if (node.data('gateway')) {
          handleGatewayClick(node);
        } else if (node.data('section_title')) {
          handleTitlePageTap(node);
        } else {
          expandToNode(node);
        }
      } else if (type === 'Family') {
        expandToFamily(node);
      } else {
        restoreState();
        activeNodeId = null;
      }
    } else {
      if (type === 'Cluster') {
        // In snake edit mode the displayed cluster node is visually repurposed to
        // show the selected chip. Navigate to the chip's actual cluster instead.
        const target = (clusterEditActive() && editSelectedClusterId && editSelectedClusterId !== node.id())
          ? cy.getElementById(editSelectedClusterId)
          : node;
        expandToCluster(target);
      } else if (type === 'Family') {
        expandToFamily(node);
      } else if (type === 'TextNode' && node.data('gateway')) {
        handleGatewayClick(node);
      } else if (type === 'TextNode' && node.data('section_title')) {
        handleTitlePageTap(node);
      } else {
        expandToNode(node);
      }
    }

    // Media bar is now persistently open — no per-node auto-open. See the
    // media_files handler in init for the initial toggleMediaBar call.
    if (type === 'Cluster') {
      setHelpText('Enter one of the Works shown');
    } else if (type === 'TextNode' && node.data('section_title')) {
      setHelpText('To return enter a text node, search rectangle or breadcrumb');
    } else if (type === 'TextNode' && node.data('gateway')) {
      setHelpText(isTouchDevice ? 'Double tap a node for further context' : 'Double click a node for further context');
    } else if (type === 'TextNode' && !node.data('gateway')) {
      setHelpText('Enter the grey section title to see the whole story/poem etc');
    } else if (type === 'Family' && node.hasClass('subfamily')) {
      setHelpText('Keep browsing or, enter a rectangle.');
    } else if (type === 'Family') {
      setHelpText('Choose a sub family or a search term (rectangle)');
    } else {
      setHelpText(helpText);
    }
  }

  // 2026-07-24 — one-gesture UX. Every tap on a main-canvas node routes
  // through advanceOrNavigate, which either shows the next chunk of the
  // node's text OR navigates into the node (if past its last chunk with
  // descendants). Double-tap detection retired: no more 320/560 ms defer
  // window, no more touchPendingNodeId / tapResetTimer state — every tap
  // fires immediately. The message body itself tells the user what
  // tapping does next (Tap for next / Tap once more to choose / no
  // further descendants).
  // 2026-08-17 v2 — pinch guard. On mobile a two-finger pinch-zoom with a
  // finger on a node makes Cytoscape fire a spurious 'tap' on that node, which
  // creates a reading card mid-gesture and leaves the panes half-reverted (the
  // collapsed control bar flashing back with the text). v1 listened on
  // cy.container() with a fragile length===1 reset that could clear mid-pinch
  // (and the container may not even see the events during a captured pinch).
  // v2 tracks the LIVE global finger count on document (capture phase, so it
  // fires before Cytoscape): the moment ≥2 fingers are down we latch
  // multiTouchRecent, and only clear it 250 ms after ALL fingers lift — so any
  // tap during OR right after a pinch is dropped, while a later clean tap works.
  let activeTouches = 0;
  let multiTouchRecent = false;
  const trackTouches = (e) => {
    activeTouches = (e.touches && e.touches.length) || 0;
    if (activeTouches >= 2) {
      multiTouchRecent = true;
      // THE actual mobile Nodes-mode glitch: a finger resting on a node during
      // a pinch never fires tapdrag for itself, so its 400 ms dwell survives and
      // pops the node tooltip near the top (looked like the control bar coming
      // back with the node's text). Kill any pending dwell AND hide any tooltip
      // already showing the instant a second finger lands.
      cancelDwell();
      hideTooltip();
    } else if (activeTouches === 0) {
      setTimeout(() => { if (activeTouches === 0) multiTouchRecent = false; }, 250);
    }
  };
  document.addEventListener('touchstart',  trackTouches, { capture: true, passive: true });
  document.addEventListener('touchend',    trackTouches, { capture: true, passive: true });
  document.addEventListener('touchcancel', trackTouches, { capture: true, passive: true });

  cy.on('tap', 'node', evt => {
    const node = evt.target;
    const type = node.data('type');
    wsRef.lastActivity = Date.now();

    // Pinch guard: drop taps that fired during (or within 250 ms of) a
    // multi-touch pinch so brushing a node while zooming doesn't navigate.
    if (multiTouchRecent) return;

    // (The parked previous-node mark used to act as a Back button here. It is
    // marked in place now and is an ordinary node again, so an ordinary tap is
    // correct. The Back behaviour returns with its DOM control.)

    // Special cases with their own semantics, unchanged by the chunk UX.
    if (CLUSTER_ASSIGN && type === 'ClusterEditChip') {
      applyEditChipSelection(node.data('mainClusterId'));
      return;
    }
    if (clusterEditActive() && node.hasClass('snake-section')) {
      applyEditTextSelection(node);
      return;
    }

    if (isTouchEvent(evt)) {
      markRecentTouch();
      cancelDwell();
    }
    hideTooltip();
    // 2026-08-14 v2 — no promoteCurrentToHistory() here. Original spec
    // promoted on every node tap; in practice a same-node re-tap or a
    // pure-navigation tap doesn't create a card downstream, leaving the
    // Current pane visibly empty for no benefit. Promote only when new
    // content is actually arriving — that's inside createCard. Result:
    // Current stays populated with the last card until the NEXT tap
    // (on a new node) brings a new card that displaces it.
    markReadNode(node, cy);

    // 2026-08-28 (moved here 2026-08-28) — tapping your partner's HALOED node mints a GN, exactly as
    // pressing the Remote button does. The user's point, and it makes the rule
    // simpler rather than more complex: it is no longer "you pressed a
    // particular control" but "you deliberately arrived at where your partner
    // is". The halo means they are here; tapping it IS following them, and the
    // distinction between doing that on the graph and doing it on the chrome
    // was arbitrary.
    //
    // Guarded to their CURRENT position and to their still being present, which
    // is the same rule the button follows: arriving where they have already
    // been is not a convergence, and the gn_mark would land on their screen for
    // a node neither of you occupies.
    //
    // Accepting the false positive deliberately — you might tap a haloed node
    // because it is in your path rather than because you noticed the halo. It
    // costs one of three slots, and what it recorded was TRUE. A missed
    // convergence costs the record itself, so the asymmetry favours minting.
    if (bnNodeId && node.id() === bnNodeId && !bnGone && pairingState && pairingState.active) {
      pushGn(bnNodeId);
      sendExplore('gn_mark', node.data('url') || null);
    }
    advanceOrNavigate(node);
  });

  // Tap on empty canvas — just hide tooltip. Under the one-gesture model
  // there's no pending tap state to reset.
  cy.on('tap', evt => {
    if (evt.target !== cy) return;
    hideTooltip();
  });

  cy.on('render', positionEditorBar);

  // Keep butterfly cursor — Cytoscape resets it during its own mouseover pipeline,
  // so we re-apply on every mousemove, which fires after Cytoscape's handlers settle.
  const butterflyCursor = "url('cursor-wings.svg') 16 16, auto";
  cy.container().addEventListener('mousemove', () => {
    cy.container().querySelectorAll('canvas').forEach(c => {
      if (c.style.cursor !== butterflyCursor) c.style.cursor = butterflyCursor;
    });
  }, { passive: true });

  // --- Dev panel (position curation) ---
  const devCodeEl   = document.getElementById('dev-code');
  const devStatusEl = document.getElementById('dev-status');
  devCodeEl.addEventListener('input', () => rememberCurationCode(devCodeEl.value.trim()));

  function devStatus(msg) {
    devStatusEl.textContent = msg;
    clearTimeout(devStatus._t);
    devStatus._t = setTimeout(() => { devStatusEl.textContent = ''; }, 3000);
  }

  document.getElementById('dev-write').addEventListener('click', () => {
    if (!lastParentNode) { devStatus('tap a family first'); return; }
    const code = devCodeEl.value.trim();
    if (!code) { devStatus('enter code'); return; }

    // View-scoped property keys use the parent's URL-UUID as suffix so
    // the same edge can hold independent hint sets for each view it
    // participates in (e.g. Nature→Animals stores hint_x_<Nature_uuid>
    // and hint_x_<Animals_uuid> side-by-side).
    const parentUrl  = lastParentNode.data('url') || '';
    const parentUuid = parentUrl.split('/').pop();
    if (!parentUuid) { devStatus('parent has no URL — cannot save view-scoped hints'); return; }
    const kx = `hint_x_${parentUuid}`;
    const ky = `hint_y_${parentUuid}`;
    const ks = `hint_scale_${parentUuid}`;

    const vis = cy.elements(':visible');
    const ppid = lastParentNode.id();
    const childEdges = vis.edges().filter(
      e => e.source().id() === ppid || e.target().id() === ppid
    );
    if (!childEdges.length) { devStatus('no children'); return; }

    const parentPos = lastParentNode.position();
    const scale = Math.max(...childEdges.map(e => {
      const c = e.source().id() === ppid ? e.target() : e.source();
      return Math.hypot(c.position('x') - parentPos.x, c.position('y') - parentPos.y);
    })) || 1;

    const hints = [];
    childEdges.forEach(e => {
      const c = e.source().id() === ppid ? e.target() : e.source();
      const hx = (c.position('x') - parentPos.x) / scale;
      const hy = (c.position('y') - parentPos.y) / scale;
      hints.push({
        relId: e.data('raw_rel_id'),
        // View-scoped only: keys carry the parent's UUID. Legacy bare
        // hint_x/y/scale on this edge (if any) are left untouched — they
        // become dead history that the reader ignores in favour of the
        // view-scoped keys, but are still present for auditing.
        props: {
          [kx]: hx,
          [ky]: hy,
          [ks]: scale,
        },
      });
    });

    const wsNow = wsRef.current;
    if (!wsNow || !wsNow.connected) { devStatus('ws not open'); return; }
    wsNow.on('msg', function handler(msg) {
      if (!msg || msg.type !== 'write_hints') return;
      wsNow.off('msg', handler);
      if (msg.error) {
        if (msg.error === 'bad_code') forgetCurationCode();
        devStatus(msg.error); return;
      }
      // Reflect the same keys into Cytoscape edge data so Reset / re-entry
      // uses preset mode immediately (no reload required).
      const hintByRelId = new Map(hints.map(h => [h.relId, h]));
      childEdges.forEach(e => {
        const h = hintByRelId.get(e.data('raw_rel_id'));
        if (h) for (const [k, v] of Object.entries(h.props)) e.data(k, v);
      });
      editModeUnlocked = true;
      devStatus(`saved ${msg.count}`);
      // No layout re-run — positions are already correct on screen
    });
    wsNow.emit('msg', { type: 'write_hints', code, hints });
    devStatus('writing…');
  });

  document.getElementById('dev-reset').addEventListener('click', () => {
    if (!lastParentNode) { devStatus('tap a family first'); return; }
    runLayout(cy, lastParentNode);
    devStatus('reset');
  });

  // Sv (Save) — persist text edits from chunk cards of the currently-read
  // node to the DB via edit_node_text. Reads back the DOM content of each
  // chunk card (.chunk-text + .chunk-hint children), falls back to the
  // original chunk data in readingState for chunks the user hasn't yet
  // displayed. Reassembles the full text with %%bd_chunk between chunks
  // and %%bd_hint <text> before each chunk's marker.
  document.getElementById('dev-save').addEventListener('click', () => {
    if (!readingState || !readingState.nodeId) { devStatus('tap a node first'); return; }
    const code = document.getElementById('dev-code').value.trim();
    if (!code) { devStatus('enter code'); return; }
    const node = cy.getElementById(readingState.nodeId);
    if (!node.length) { devStatus('node not found'); return; }
    const type = node.data('type');
    const labelByType = { root: 'Root', Entry: 'Entry', Family: 'Family', Cluster: 'Cluster' };
    const label = labelByType[type];
    if (!label) { devStatus(`cannot save ${type} nodes`); return; }
    const name = node.data('name');
    if (!name) { devStatus('node has no name'); return; }

    const cardsByIdx = readingState.cardsByIdx || {};
    const parts = [];
    for (let i = 0; i < readingState.chunks.length; i++) {
      const cardRef = cardsByIdx[i];
      let body, hint;
      if (cardRef && cardRef.body) {
        // Live DOM read — user may have edited these.
        const textEl = cardRef.body.querySelector('.chunk-text');
        const hintEl = cardRef.body.querySelector('.chunk-hint');
        body = textEl ? textEl.textContent.trim() : '';
        hint = hintEl ? hintEl.textContent.trim() : null;
        // Only preserve author-supplied hints; strip auto-injected fallbacks
        // that we don't want round-tripped back into the DB as if authored.
        if (hint === CHUNK_HINT_MORE || hint === CHUNK_HINT_NAVIGATE || hint === CHUNK_HINT_NO_MORE) {
          hint = readingState.chunks[i].hint || null;
        }
      } else {
        const original = readingState.chunks[i];
        body = original.body;
        hint = original.hint;
      }
      let piece = body;
      if (hint) piece += (piece ? '\n' : '') + `%%bd_hint ${hint}`;
      parts.push(piece);
    }
    const text = parts.join('\n%%bd_chunk\n');

    const wsNow = wsRef.current;
    if (!wsNow || !wsNow.connected) { devStatus('ws not open'); return; }
    devStatus('saving…');
    wsNow.on('msg', function handler(m) {
      if (!m || m.type !== 'edit_node_text') return;
      wsNow.off('msg', handler);
      if (m.error) {
        if (m.error === 'bad_code') forgetCurationCode();
        devStatus(m.error); return;
      }
      devStatus(`saved ${name}`);
      // Update in-memory node text so next tap re-parses the fresh chunks.
      node.data('text', text);
      // Also refresh readingState.chunks so subsequent Sv rounds see the
      // committed content, not stale.
      readingState.chunks = splitNodeChunks(text);
    });
    wsNow.emit('msg', { type: 'edit_node_text', code, label, name, text });
  });

  // --- Default panel node-text Save --- RETIRED 2026-07-25
  //
  // The Save button was orphaned by always-on-chat (default panel never got
  // the bdName/bdLabel metadata Save required). Button removed from HTML
  // and CSS. Node text editing now goes through `bd_tool.js write` against
  // nav_nodes_text.md — that path is documented in BackupNotes.md and the
  // bd-tool-and-helper-messages memory. Server's edit_node_text handler is
  // still live in case any other client path uses it.

  // --- Cluster editor bar buttons ---

  document.getElementById('editor-save-btn').addEventListener('click', () => {
    if (!editSelectedClusterId || !editSelectedTextNodeId) return;
    const textNode    = cy.getElementById(editSelectedTextNodeId);
    const clusterNode = cy.getElementById(editSelectedClusterId);
    if (!textNode.length || !clusterNode.length) return;
    const wsNow = wsRef.current;
    if (!wsNow || !wsNow.connected) return;

    const ta = parseFloat(document.getElementById('sp-tagged-as').value);
    const rw = parseFloat(document.getElementById('sp-resonates-with').value);
    const bt = parseFloat(document.getElementById('sp-bridges-to').value);
    const ec = parseFloat(document.getElementById('sp-echoes').value);
    const gi = parseFloat(document.getElementById('sp-gives').value);
    const props = {};
    if (ta > 0) props.tagged_as      = ta;
    if (rw > 0) props.resonates_with = rw;
    if (bt > 0) props.bridges_to     = bt;
    if (ec > 0) props.echoes         = ec;
    if (gi > 0) props.gives          = gi;

    wsNow.emit('msg', {
      type:        'edit_save',
      textNodeUrl: textNode.data('url'),
      clusterName: clusterNode.data('name'),
      work:        textNode.data('source_text'),
      props,
    });
  });

  document.getElementById('editor-delete-btn').addEventListener('click', () => {
    if (!editSelectedClusterId || !editSelectedTextNodeId) return;
    const textNode    = cy.getElementById(editSelectedTextNodeId);
    const clusterNode = cy.getElementById(editSelectedClusterId);
    if (!textNode.length || !clusterNode.length) return;
    const wsNow = wsRef.current;
    if (!wsNow || !wsNow.connected) return;

    wsNow.emit('msg', {
      type:        'edit_delete',
      textNodeUrl: textNode.data('url'),
      clusterName: clusterNode.data('name'),
      work:        textNode.data('source_text'),
    });
  });

  function rebuildClusterEditGrid() {
    if (!chipGridParams) return;
    const { chipW, chipH, chipStepX, chipStepY, chipStartX, chipBlockTop, chipsPerRow } = chipGridParams;
    const startNode = editSelectedClusterId ? cy.getElementById(editSelectedClusterId) : null;
    const sortedClusters = sortClustersByRgb(cy.nodes('[type="Cluster"]').toArray(), startNode);
    cy.nodes('[type="ClusterEditChip"]').remove();
    sortedClusters.forEach((cluster, i) => {
      const row    = Math.floor(i / chipsPerRow);
      const col    = i % chipsPerRow;
      const chipId = 'cec_' + cluster.id();
      cy.add({
        group: 'nodes',
        data: {
          id:           chipId,
          type:         'ClusterEditChip',
          mainClusterId: cluster.id(),
          colour:       cluster.data('colour'),
          display_name: cluster.data('display_name') || cluster.data('name') || '',
        }
      });
      cy.getElementById(chipId).position({
        x: chipStartX + col * chipStepX + chipW / 2,
        y: chipBlockTop + row * chipStepY + chipH / 2,
      });
    });
    if (editSelectedClusterId) applyEditChipSelection(editSelectedClusterId);
  }

  document.getElementById('editor-clone-btn').addEventListener('click', () => {
    if (!editSelectedClusterId) return;
    const sourceCluster = cy.getElementById(editSelectedClusterId);
    const sourceName    = sourceCluster.data('name') || '';
    document.getElementById('clone-name-input').value = sourceName + ' (2)';
    const bar   = document.getElementById('cluster-editor-bar');
    const panel = document.getElementById('clone-panel');
    const rect  = bar.getBoundingClientRect();
    panel.style.left      = rect.left + 'px';
    panel.style.top       = (rect.bottom + 4) + 'px';
    panel.style.transform = 'none';
    panel.style.display   = 'flex';
  });

  document.getElementById('clone-cancel-btn').addEventListener('click', () => {
    document.getElementById('clone-panel').style.display = 'none';
  });

  document.getElementById('clone-confirm-btn').addEventListener('click', () => {
    const newName = document.getElementById('clone-name-input').value.trim();
    if (!newName || !editSelectedClusterId) return;
    const sourceCluster = cy.getElementById(editSelectedClusterId);
    const wsNow = wsRef.current;
    if (!wsNow || !wsNow.connected) return;
    wsNow.emit('msg', {
      type:       'edit_clone_cluster',
      sourceName: sourceCluster.data('name'),
      newName,
    });
    document.getElementById('clone-panel').style.display = 'none';
  });

  function handleClusterCloned(msg) {
    const sourceNode   = cy.nodes('[type="Cluster"]').filter(n => n.data('name') === msg.sourceName).first();
    const sourceColour = sourceNode.length ? sourceNode.data('colour') : '#666666';
    cy.add({
      group: 'nodes',
      data: {
        ...msg.newCluster,
        type:         'Cluster',
        colour:       sourceColour,
        display_name: msg.newCluster.display_name || msg.newCluster.name || '',
        n_r:          0,
      }
    });
    // Add DESCENDS_FROM edges so expandToCluster shows the correct Family parents.
    // Direction follows Cytoscape convention: source=Cluster, target=Family.
    if (msg.parents && msg.parents.length) {
      msg.parents.forEach(p => {
        const familyNode = cy.nodes('[type="Family"]').filter(n => n.data('name') === p.fname).first();
        if (familyNode.length) {
          cy.add({ group: 'edges', data: {
            type:   'DESCENDS_FROM',
            source: msg.newCluster.id,
            target: familyNode.id(),
            weight: p.weight ?? 1,
          }});
        }
      });
    }
    if (editSelectedClusterId) {
      // In snake edit view: hide the raw Cluster node (it's shown via a chip)
      // and rebuild the grid. Do NOT change the selection — the clone will appear
      // in its natural colour-sorted position adjacent to the source cluster.
      cy.getElementById(msg.newCluster.id).hide();
      rebuildClusterEditGrid();
    }
  }

  function handleClusterRelMsg(msg) {
    const clusterNode = cy.nodes('[type="Cluster"]')
      .filter(n => n.data('name') === msg.clusterName).first();

    if (msg.type === 'cluster_rel_saved') {
      const textNode = cy.nodes('[type="TextNode"]')
        .filter(n => n.data('url') === msg.textNodeUrl).first();
      if (textNode.length && clusterNode.length) {
        const existing = textNode.outgoers('edge[type="CLUSTER_REL"]')
          .filter(e => e.target().id() === clusterNode.id()).first();
        if (existing.length) {
          ['tagged_as', 'resonates_with', 'bridges_to', 'echoes', 'gives']
            .forEach(k => existing.removeData(k));
          if (msg.props) Object.keys(msg.props).forEach(k => existing.data(k, msg.props[k]));
        } else {
          const edgeData = {
            type:   'CLUSTER_REL',
            source: textNode.id(),
            target: clusterNode.id(),
          };
          if (msg.props) Object.assign(edgeData, msg.props);
          cy.add({ group: 'edges', data: edgeData });
        }
      }
    } else if (msg.type === 'cluster_rel_deleted') {
      const textNode = cy.nodes('[type="TextNode"]')
        .filter(n => n.data('url') === msg.textNodeUrl).first();
      if (textNode.length && clusterNode.length) {
        textNode.outgoers('edge[type="CLUSTER_REL"]')
          .filter(e => e.target().id() === clusterNode.id())
          .remove();
      }
    }

    // Refresh snake view text-node background colours with updated edge data
    if (editSelectedClusterId) applyEditChipSelection(editSelectedClusterId);

    // Update Cluster n_r badge
    if (clusterNode.length && msg.n_r !== undefined) {
      clusterNode.data('n_r', msg.n_r);
      addBadge(clusterNode);
      // lastClusterNode is the only visible Cluster node in snake view. It's visually
      // repurposed to show the selected cluster's colour/label (applyEditChipSelection),
      // so if it's a different node its badge also needs to reflect the saved count.
      if (lastClusterNode && lastClusterNode.length && lastClusterNode.id() !== clusterNode.id()) {
        const orig = lastClusterNode.data('n_r');
        lastClusterNode.data('n_r', msg.n_r);
        addBadge(lastClusterNode);
        lastClusterNode.data('n_r', orig);  // preserve actual data; exitSnakeView restores badge
      }
    }

    // Update CONTAINS_CLUSTER edge count and gateway badge (cluster view).
    // If no CONTAINS_CLUSTER edge exists yet (first association), create it in Cytoscape.
    if (clusterNode.length && msg.cc_count !== undefined) {
      let ccEdge = clusterNode.incomers('edge[type="CONTAINS_CLUSTER"]')
        .filter(e => e.source().data('source_text') === msg.work).first();
      if (!ccEdge.length) {
        const gwNode = cy.nodes('[type="TextNode"][?gateway]')
          .filter(n => n.data('source_text') === msg.work).first();
        if (gwNode.length) {
          cy.add({ group: 'edges', data: { type: 'CONTAINS_CLUSTER', source: gwNode.id(), target: clusterNode.id(), count: msg.cc_count } });
          ccEdge = clusterNode.incomers('edge[type="CONTAINS_CLUSTER"]')
            .filter(e => e.source().data('source_text') === msg.work).first();
        }
      }
      if (ccEdge.length) {
        ccEdge.data('count', msg.cc_count);
        const gw = ccEdge.source();
        gw.data('n_r', msg.cc_count);
        addBadge(gw);
      }
    }

    clearEditSelection();
  }

  // enterNode — programmatic "navigate to and read this node" used by the
  // return-from-standalone flow. Combines markReadNode (sets lastReadNodeId
  // + visual border) with expandToNode (sets activeNodeId, shows one-hop
  // neighbourhood). Matches what a manual read-tap achieves, minus the
  // read-tap's own tooltip/panel routing (caller handles that separately).
  function enterNode(node) {
    if (!node || !node.length) return;
    // 2026-08-14 v2 — no promote here either. Any card that follows this
    // programmatic navigation (return-from-standalone auto-loads a
    // system/local card) goes through createCard, which handles the
    // Current-slot rotation. Firing promote here as well was leaving
    // Current empty until the follow-up card arrived, which the user
    // read as a bug (see cy.on('tap','node') comment above).
    markReadNode(node, cy);
    expandToNode(node);
  }

  // §2 — the partner left: dim their marks, do not remove them. Exposed
  // because bnGone and renderMarks are setupInteractions' own state and init()
  // cannot reach them; assigning across that boundary threw a ReferenceError
  // under module strict mode and killed the rest of the handler.
  function markBuddyGone() {
    bnGone = true;
    renderMarks();
  }

  return { refitBars, reassertMarks, handleExploreMsg, markBuddyGone, appendBuddyChip, resetBuddyBar, handleClusterRelMsg, handleClusterCloned, createCard, setChatText, prependSystemCard, prependPartnerCard, handleChatReady, setSendBtn, updateSendBtn, sendTopLocalCard, handleBuddyCardAck, topLocalCard, getActiveNodeId: () => activeNodeId, getLastReadNodeId: () => lastReadNodeId, enterNode, addYouChip, toggleMediaBar, addSessionTrack, saveYouBreadcrumbs, restoreYouBreadcrumbs, refreshCardOpacities };

}

// --- n_r badge overlay ---

function setupNrBadges(cy) {
  const container = document.getElementById('cy');
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:1;';
  container.appendChild(overlay);

  const badges = new Map();

  cy.nodes().forEach(node => {
    const nr = node.data('n_r');
    if (!nr || nr <= 0) return;
    if (node.data('type') === 'root') return;
    const div = document.createElement('div');
    div.textContent = String(nr);
    div.style.cssText = 'position:absolute;font-size:9px;font-family:sans-serif;line-height:1;display:none;transform:translate(-50%,-100%);';
    div.style.color = node.data('gateway') ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.65)';
    overlay.appendChild(div);
    badges.set(node.id(), div);
  });

  function updatePositions() {
    const fontSize = Math.max(5, 9 * cy.zoom()) + 'px';
    badges.forEach((div, id) => {
      const node = cy.getElementById(id);
      if (!node.length || !node.visible()) { div.style.display = 'none'; return; }
      div.style.display = 'block';
      div.style.fontSize = fontSize;
      // 2026-08-21 — measure from the node BODY, never from the bounding box.
      // The box grows to enclose the OUTLINE as well as the border, and the
      // old formula subtracted only border-width — so every pixel of halo
      // pushed the badge outward. A Blue Node's 6px ring put it half outside
      // the fill; the Snap's two rings swallowed it whole. The body is the
      // thing the badge belongs to, and no outline can move it.
      //
      // Then step in past whatever border is drawn, which depends on
      // border-position: 'center' straddles (half inside), 'inside' is wholly
      // within, 'outside' takes nothing from the interior at all. Read it
      // rather than assume it — renderMarks writes 'outside' on marked nodes,
      // and the plain Cluster border is 'center'.
      const zoom  = cy.zoom();
      const rp    = node.renderedPosition();
      const bodyBottom = rp.y + node.renderedHeight() / 2;
      const bw    = (parseFloat(node.style('border-width')) || 0) * zoom;
      const bpos  = node.style('border-position') || 'center';
      const inset = bpos === 'inside' ? bw : bpos === 'outside' ? 0 : bw / 2;
      div.style.left = rp.x + 'px';
      div.style.top  = (bodyBottom - inset - 3) + 'px';
    });
  }

  cy.on('render', updatePositions);

  function addBadge(node) {
    const nr = node.data('n_r');
    if (badges.has(node.id())) {
      // Always update existing badge text — clears it (to '') when nr=0 so
      // the temp-swap in applyEditChipSelection doesn't leave stale counts visible
      badges.get(node.id()).textContent = (nr && nr > 0) ? String(nr) : '0';
      return;
    }
    if (!nr || nr <= 0) return;
    const div = document.createElement('div');
    div.textContent = String(nr);
    div.style.cssText = 'position:absolute;font-size:9px;font-family:sans-serif;line-height:1;display:none;transform:translate(-50%,-100%);';
    div.style.color = node.data('gateway') ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.65)';
    overlay.appendChild(div);
    badges.set(node.id(), div);
  }

  return { addBadge };
}

// --- Socket.IO connection helpers ---

// (2026-07-13) Migrated from raw WebSocket to Socket.IO. `io()` with no
// args uses same-origin auto-detected protocol. Server-side
// connectionStateRecovery (see server.js) gives us automatic session
// recovery on reconnection within 60 s — chat + pair state survive iOS
// tab-suspension events.
//
// The `ws` variable name is preserved throughout the client for minimal
// diff; despite the name it is now a Socket.IO Socket, not a raw
// WebSocket. Translations that applied globally:
//   ws.send(JSON.stringify(x))          →  ws.emit('msg', x)
//   ws.readyState === WebSocket.OPEN    →  ws.connected
//   ws.addEventListener('message', h)   →  ws.on('msg', h)
//     — h now takes the message object directly (no JSON.parse needed)
//   ws.removeEventListener('message', h)→  ws.off('msg', h)
//   ws.close()                          →  ws.disconnect()
function connectWS() {
  return new Promise((resolve, reject) => {
    const ws = io();
    ws.on('connect',       () => resolve(ws));
    ws.on('connect_error', () => reject(new Error('Socket.IO connection failed')));
  });
}

function queryWS(ws, type, query, params = {}) {
  return new Promise((resolve, reject) => {
    function handler(msg) {
      if (!msg || msg.type !== type) return;
      ws.off('msg', handler);
      if (msg.error) reject(new Error(msg.error));
      else resolve(msg.records);
    }
    ws.on('msg', handler);
    ws.emit('msg', { type, query, params });
  });
}

// ── Fetching nodes the client does not have (blue_node_spec.md §7.3) ──────
//
// A client that loaded before a node was created has no way to show it — today
// that fails silently (`if (!main.length) return;`). These two functions repair
// it on demand, over the SAME query channel the graph load already uses.
//
// LABEL-SCOPED BY NECESSITY. Memgraph 3.2.1 has no global property index, so
// `MATCH (n) WHERE n.updated_at > $t` is a full scan (verified by EXPLAIN:
// ScanAll + Filter, versus ScanAllByLabelProperties when a label is given).
// Eight indexed lookups cost nothing; the tempting one-liner silently does not
// scale — see spec §7.5.
const SYNC_LABELS = ['TextNode', 'Cluster', 'Family', 'SubFamily', 'Entry', 'Root'];

// queryWS resolves on the FIRST reply whose `type` matches, so two fetches in
// flight with the same type would resolve each other's promise — the second
// crumb's node landing in the first's caller. A counter makes every request
// its own conversation.
let syncReqSeq = 0;

// One node plus its immediate edges. The edges come back whole; the CALLER
// decides which to keep, because cytoscape cannot hold an edge whose other end
// is missing (spec §7.3).
function fetchNodeByUrl(ws, url) {
  return queryWS(ws, 'fetch_node_' + (++syncReqSeq),
    'MATCH (n {url: $url}) ' +
    'OPTIONAL MATCH (n)-[r]-(m) ' +
    'RETURN n, r, m',
    { url });
}

// Everything changed since `since` (ms UTC), one indexed query per label.
async function fetchNodesSince(ws, since) {
  const out = [];
  for (const label of SYNC_LABELS) {
    const rows = await queryWS(ws, 'fetch_since_' + label + '_' + (++syncReqSeq),
      'MATCH (n:' + label + ') WHERE n.updated_at > $since ' +
      'OPTIONAL MATCH (n)-[r]-(m) ' +
      'RETURN n, r, m',
      { since });
    out.push(...rows);
  }
  return out;
}

// Add fetched rows to the live graph. Returns the node ids actually added.
//
// Edges are added only where BOTH ends are present — deliberately, per spec §4:
// unknown neighbours are NOT imported, so the graph stays a record of where the
// pair has actually been rather than quietly growing.
function addFetchedRows(cy, rows) {
  const added = [];
  // Nodes first: an edge cannot be added before its endpoints exist.
  for (const rec of rows) {
    if (!rec || !rec.n) continue;
    const nd = buildNodeData(rec.n);
    if (!cy.getElementById(nd.id).length) { cy.add({ group: 'nodes', data: nd }); added.push(nd.id); }
  }
  for (const rec of rows) {
    if (!rec || !rec.r || !rec.m) continue;      // OPTIONAL MATCH gives null for an edgeless node
    const ed = buildEdgeData(rec.r, rec.n, rec.m);
    ed.id = 'r_' + ed.id;                        // same prefix rule as the graph load
    if (cy.getElementById(ed.id).length) continue;
    if (!cy.getElementById(ed.source).length || !cy.getElementById(ed.target).length) continue;
    cy.add({ group: 'edges', data: ed });
  }
  return added;
}

// --- Boot ---

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Curation code persistence (2026-08-22) ---
//
// Retyping the code into every browser on every debug cycle was the actual
// cost of pair testing. This remembers it PER BROWSER so it is typed once.
//
// It weakens nothing: the code is enforced server-side with timingSafeEqual
// against a gitignored config, and this stores it only where it was already
// typed. Deliberately NOT an IP-based grant — cloudflared runs on this host,
// so every public visitor reaches the server from 127.0.0.1 and a loopback
// check would have handed the code to the internet.
const CURATION_STORE_KEY = 'bd_curation_code';

// Storage throws in Safari Private mode and when cookies are blocked. Every
// path here degrades to "type it in", which is exactly the status quo, so
// failures are swallowed rather than surfaced.
function restoreCurationCode() {
  try {
    const el = document.getElementById('dev-code');
    if (!el || el.value.trim()) return;          // never overwrite live typing
    const saved = localStorage.getItem(CURATION_STORE_KEY);
    if (saved) el.value = saved;
  } catch (_) {}
}

function rememberCurationCode(code) {
  try {
    // Only a COMPLETE code is worth keeping. Persisting a half-typed one would
    // restore a value that puts the UI in curator view but can never validate.
    const el = document.getElementById('dev-code');
    const full = el && el.maxLength > 0 ? el.maxLength : 4;
    if (code && code.length >= full) localStorage.setItem(CURATION_STORE_KEY, code);
    else if (!code) localStorage.removeItem(CURATION_STORE_KEY);
  } catch (_) {}
}

// Called when the SERVER rejects the code. Clears the store but leaves the
// field as typed — the user may be mid-correction, and blanking it under them
// would drop them out of curator view mid-action.
function forgetCurationCode() {
  try { localStorage.removeItem(CURATION_STORE_KEY); } catch (_) {}
}


async function init() {
  // #help-text was removed in A50 — guard the legacy assignment so init() doesn't abort.
  const helpTextEl = document.getElementById('help-text');
  if (helpTextEl) helpTextEl.textContent = helpText;

  restoreCurationCode();   // before the first render reads #dev-code

  const overlay = document.getElementById('loading-overlay');
  const msgEl   = document.getElementById('loading-msg');
  const setMsg  = t => { msgEl.textContent = t; };

  overlay.classList.add('active');
  setMsg('Connecting…');

  // Retry loop — keeps trying until both the WebSocket and the graph queries
  // succeed. Handles cold Docker / Memgraph / Cloudflare start-up gracefully
  // without blocking alerts or silent reloads.
  let ws, records, cfRecords, sfRecords;
  for (let attempt = 1; ; attempt++) {
    // Connect (or reconnect) WebSocket
    while (true) {
      try { ws = await connectWS(); attachClientLogSocket(ws); break; }
      catch {
        setMsg(`Waiting for server… (${attempt})`);
        await sleep(3000);
      }
    }

    // Run queries with a 15-second timeout per attempt
    setMsg(attempt === 1 ? 'Loading graph…' : `Loading graph… (attempt ${attempt})`);
    try {
      [records, cfRecords, sfRecords] = await Promise.race([
        Promise.all([
          queryWS(ws, 'graph',
            'MATCH (n)-[r]->(m) RETURN n, r, m'),
          queryWS(ws, 'clusterFamily',
            'MATCH (c:Cluster)-[r]-(f:Family) RETURN c, r, f'),
          queryWS(ws, 'subfamilyLinks',
            'MATCH (sf:Family)-[r:DESCENDS_FROM]->(f:Family) RETURN sf, r, f'),
        ]),
        sleep(8000).then(() => { throw new Error('timeout'); }),
      ]);
      break; // success
    } catch (err) {
      console.warn('Load attempt', attempt, 'failed:', err.message);
      ws.disconnect(); // close so stale message listeners are dropped
      await sleep(2000);
    }
  }

  overlay.classList.remove('active');
  // Build element maps (deduplicate nodes and edges by ID)
  const nodesById = new Map();
  const edgesById = new Map();

  for (const rec of records) {
    const n = rec.n;
    const r = rec.r;
    const m = rec.m;
    const nId = nodeId(n);
    const mId = nodeId(m);
    // Prefix all relationship IDs with 'r_' to avoid Cytoscape silently dropping edges
    // whose integer ID happens to equal a node's integer ID (Memgraph shares the
    // integer namespace between nodes and relationships).
    const rId = 'r_' + getElementId(r);
    if (!nodesById.has(nId)) nodesById.set(nId, buildNodeData(n));
    if (!nodesById.has(mId)) nodesById.set(mId, buildNodeData(m));
    if (!edgesById.has(rId)) {
      const ed = buildEdgeData(r, n, m);
      ed.id = rId;
      edgesById.set(rId, ed);
    }
  }

  // 2026-08-21 (stable_id_spec.md §4.5) — the name-based deduplication that
  // used to sit here is GONE, along with clusterIdByName / familyIdByName /
  // canonicalNodeId and the edge-rewrite loop.
  //
  // It existed because the same Cluster or Family returned different Memgraph
  // elementIds in different query contexts, so one node could enter the graph
  // twice and TextNode→Cluster edges could land on the phantom — producing
  // disconnected components that fCoSE gridded into a "neat table".
  //
  // Node ids are now the durable `url`, so the two query contexts yield the
  // SAME id and `nodesById` (a Map keyed by that id) collapses them by itself.
  // Removing the cause removed the need for the treatment.
  //
  // The 2026-07-04 warning that lived here — that TextNode dedup was reverted
  // because handleGatewayClick's follow-up query still spoke elementIds — is
  // answered by construction now: every site mints ids the same way. It is
  // preserved in stable_id_spec.md §6 rather than deleted.

  for (const rec of cfRecords) {
    const c = rec.c, r = rec.r, f = rec.f;
    const cProps = flattenProps(c.properties || {});
    const fProps = flattenProps(f.properties || {});
    const rId = getElementId(r);
    const cId = nodeId(c);
    const fId = nodeId(f);
    if (!nodesById.has(cId)) nodesById.set(cId, buildNodeData(c));
    if (!nodesById.has(fId)) nodesById.set(fId, buildNodeData(f));
    // Prefix with 'cf_' to avoid ID collision: Memgraph shares the integer namespace
    // between nodes and relationships, so rId may equal an existing TextNode's id.
    // Nodes are added to Cytoscape first; without the prefix, Cytoscape silently
    // drops the edge because the ID is already taken by a node.
    const cfEdgeId = 'cf_' + rId;
    const ed = buildEdgeData(r, c, f);
    ed.id = cfEdgeId;
    ed.source = cId;
    ed.target = fId;
    edgesById.delete('r_' + rId);  // remove main-loop entry (r_-prefixed) if present
    edgesById.set(cfEdgeId, ed);
  }

  // Ensure all SubFamily→Family DESCENDS_FROM edges are present.
  // Same elementId inconsistency as Cluster-Family edges; resolve by name.
  for (const rec of sfRecords) {
    const sf = rec.sf, r = rec.r, f = rec.f;
    const sfProps = flattenProps(sf.properties || {});
    const fProps  = flattenProps(f.properties  || {});
    const rId  = getElementId(r);
    const sfId = nodeId(sf);
    const fId  = nodeId(f);
    if (!nodesById.has(sfId)) nodesById.set(sfId, buildNodeData(sf));
    if (!nodesById.has(fId))  nodesById.set(fId,  buildNodeData(f));
    const sfEdgeId = 'sf_' + rId;
    const ed = buildEdgeData(r, sf, f);
    ed.id = sfEdgeId;
    ed.source = sfId;
    ed.target = fId;
    edgesById.delete('r_' + rId);  // remove main-loop entry (r_-prefixed) if present
    edgesById.set(sfEdgeId, ed);
  }

  // Post-process edges
  edgesById.forEach(ed => {
    const src = nodesById.get(ed.source);
    const tgt = nodesById.get(ed.target);
    // Gateway TextNode↔Cluster edge widths
    const textNode    = (src && src.type === 'TextNode') ? src : (tgt && tgt.type === 'TextNode') ? tgt : null;
    const clusterNode = (src && src.type === 'Cluster')  ? src : (tgt && tgt.type === 'Cluster')  ? tgt : null;
    if (textNode && clusterNode) {
      ed.width = textNode.gateway ? 4 : 1;
    }
  });

  // Assemble Cytoscape elements from real Neo4j data only
  const elements = [];
  nodesById.forEach(nd => elements.push({ data: nd }));
  edgesById.forEach(ed => elements.push({ data: ed }));

  // Pin #cy's top to the bottom of the panel stack BEFORE cytoscape constructs,
  // so the initial cy.fit() uses the real canvas dimensions. If this runs after
  // init, the root ends up off-centre (mis-fit against the CSS fallback rect),
  // visible especially on iPhone after #default-panel grew to 34dvh.
  // 2026-08-14 v3 — panel split: #chat-panel (History) is now the last flow
  // element above #cy. #action-bar sits MID-STACK between #current-panel and
  // #chat-panel, so pinning cy.top to action-bar's bottom made cy overlap
  // History (root ended up rendered in the visible bottom half of an
  // over-tall canvas). Reference chat-panel here — same fix mirrors the
  // positionCyEl() reordering. default-panel is the pre-boot fallback for
  // the very-first-tap-not-yet-happened case; action-bar retained as a
  // last-resort defensive fallback.
  {
    const chatPanelEl = document.getElementById('chat-panel');
    const refEl = (chatPanelEl && chatPanelEl.getBoundingClientRect().height > 0 ? chatPanelEl : null)
              || document.getElementById('default-panel')
              || document.getElementById('action-bar')
              || document.getElementById('cy-you');
    const topPx = Math.ceil(refEl.getBoundingClientRect().bottom) + 'px';
    const cyEarly = document.getElementById('cy');
    cyEarly.style.top = topPx;
    // A42 §42.3 — iframe intrinsic default height (150 px per HTML spec)
    // overrides position: fixed with top+bottom on some browsers, so we
    // stamp width/height/top explicitly from #cy's measured rect.
    const iframeEl = document.getElementById('visual-iframe');
    if (iframeEl) {
      const cyRect = cyEarly.getBoundingClientRect();
      iframeEl.style.top    = cyRect.top    + 'px';
      iframeEl.style.left   = cyRect.left   + 'px';
      iframeEl.style.width  = cyRect.width  + 'px';
      iframeEl.style.height = cyRect.height + 'px';
    }
  }

  // Init Cytoscape
  const cy = cytoscape({
    container: document.getElementById('cy'),
    elements,
    style: buildStyle(),
    layout: { name: 'preset' },
    minZoom: 0.05,
    maxZoom: 8,
    wheelSensitivity: 0.3,
  });
  // Debug hook: viewer.js loads as a module so `cy` isn't automatically on
  // window. Expose the main cy instance for browser-console diagnostics.
  window.cy = cy;

  computeBlendedColours(cy);
  cy.elements().hide();
  const root = cy.nodes('[type="root"]').first();
  root.show();
  // Rough initial fit — cy container may still be resizing as boot
  // completes (chat-panel .active toggle at line ~5010 hides the taller
  // default-panel and reveals the shorter chat-panel, so cy grows). The
  // authoritative re-fit is scheduled below inside the boot's rAF.
  cy.fit(root, fitPadding(cy, 120));
  if (cy.zoom() > 1.5) {
    cy.zoom({ level: cy.zoom() * ROOT_INITIAL_ZOOM_FACTOR, position: root.position() });
    cy.center(root);
  }

  const MAX_IDLE_MS = 60 * 60 * 1000; // 60 min idle → session considered ended
  const wsRef = { current: ws, lastActivity: Date.now(), maxIdleMs: MAX_IDLE_MS };

  // MM3 revised (2026-07-12) — anti-self-pair, not cross-tab kick. Server
  // stamps ws.deviceId from the bd_device_id cookie on each connection and
  // refuses to pair two ws with the same deviceId (via pair_denied
  // {reason: 'same_device'} handled below). Multiple BD tabs per browser
  // are allowed — a user returning from EV via Jump-in doesn't lose their
  // still-alive paired BD session in a different tab. Only the specific
  // gaming moment (same device completing a pair with itself) is blocked.
  // Cookie mechanism is still origin-agnostic (bd_device_id belongs to
  // BD's origin, travels with every ws upgrade regardless of where the
  // navigation came from).

  // Idle-timeout check — runs every minute, shows session-expired overlay once the
  // user has been inactive for 60 min. Connection keepalive is now handled entirely
  // server-side via WebSocket protocol ping/pong (see server.js), which is more
  // reliable than a JS timer and works even when the browser throttles background tabs.
  const idleTimer = setInterval(() => {
    if (Date.now() - wsRef.lastActivity > MAX_IDLE_MS) {
      clearInterval(idleTimer);
      // 2026-08-22 — expiry must actually LEAVE. This used to show the overlay
      // and nothing else, so the socket stayed open and the server went on
      // counting the tab in sessions.size: that is how "7 connected" happened
      // with two people actually present. Every abandoned tab held a slot for
      // as long as the browser stayed open.
      //
      // disconnect() rather than close(): it also stops Socket.IO's automatic
      // reconnection, which would otherwise walk straight back in.
      //
      // Guarded so a failure here cannot cost the user the overlay — the
      // message is the part they must not miss.
      wsRef.expired = true;
      try { if (wsRef.current) wsRef.current.disconnect(); }
      catch (err) { console.warn('[BD] expiry disconnect failed', err); }
      showSessionExpired();
    }
  }, 60000);

  const youCy = cytoscape({
    container: document.getElementById('cy-you'),
    elements: [],
    style: buildStyle(),
    layout: { name: 'preset' },
    zoom: 1,
    userZoomingEnabled: true,            // pinch / wheel zoom enabled (2026-06-29)
    userPanningEnabled: true,            // drag pan along trail
    boxSelectionEnabled: false,
  });

  const buddyCy = cytoscape({
    container: document.getElementById('cy-buddy'),
    elements: [],
    style: buildStyle(),
    layout: { name: 'preset' },
    zoom: 1,
    userZoomingEnabled: true,
    userPanningEnabled: true,
    boxSelectionEnabled: false,
  });

  // After CSS sets the new 23px bar heights, sync cytoscape's internal size
  // and fit any existing chips. Empty on first load — these are no-ops then —
  // but harmless and gives a clean reset point if the bars are ever rebuilt.
  youCy.resize();   youCy.fit();
  buddyCy.resize(); buddyCy.fit();

  const pairingState = { active: false, waiting: false };

  const chatBtn   = document.getElementById('chat-btn');
  const chatPanel = document.getElementById('chat-panel');
  const cyEl      = document.getElementById('cy');

  // (Chat button was previously dev-code gated; that gating was removed when
  // Pair was folded into Chat — Chat is now the single pair+chat toggle,
  // pressable at any time.)

  function positionCyEl() {
    // 2026-08-14 — panel split changes what sits at the bottom of the
    // panel stack. Layout is now:
    //   #current-panel  →  #action-bar  →  #chat-panel  →  cy
    // so #chat-panel (History) is the last flow element above cy.
    // #action-bar is NO LONGER the correct pin — it's mid-stack now.
    // Fall back through the pre-split candidates for defensive safety.
    // 2026-08-17 — Nodes mode collapses to a single reading pane: History is
    // hidden and the action-bar strip is zero-height, so #current-panel is the
    // bottom-most visible flow element and must anchor #cy. Edit/Player keep
    // the split, where #chat-panel (History) is the bottom-most.
    const nodesMode = !document.body.classList.contains('edit-active') &&
                      !document.body.classList.contains('player-active');
    // 2026-08-20 — FEEDBACK LOOP FIX. In Player mode the anchor below is
    // #chat-panel (History), and the Kolam branch of positionExtendPanel grows
    // that pane down to the canvas top. So: grown pane → anchor lower → iframe
    // top pushed down → iframe shorter → canvas smaller and LOWER → pane grown
    // deeper still. One pass per event hid it; adding settle re-runs for the
    // rotation bug turned it into a runaway, which is why the pane kept the
    // screen and the square collapsed.
    //
    // Clearing the inline height here means the anchor is always measured
    // against the pane's NATURAL height, so every pass computes the same
    // geometry and positionExtendPanel re-grows from a stable canvas rect.
    // Idempotent, and the collapse-and-regrow happens within one frame.
    const histNatural = document.getElementById('chat-panel');
    if (histNatural) histNatural.style.height = '';
    const currentPanelEl = document.getElementById('current-panel');
    const refEl =
      (nodesMode && currentPanelEl && currentPanelEl.getBoundingClientRect().height > 0 ? currentPanelEl : null) ||
      (chatModeActive && chatPanel.getBoundingClientRect().height > 0 ? chatPanel : null) ||
      document.getElementById('default-panel') ||
      document.getElementById('action-bar') ||
      document.getElementById('cy-you');
    // 2026-08-27 — the CONTROL PANEL takes the anchor, and the canvas starts
    // below it. Both are driven from the same measurement so they cannot
    // separate; giving the panel its own would be a second writer, and this
    // file has been bitten by that three times.
    const anchorBottom = Math.ceil(refEl.getBoundingClientRect().bottom);
    const topPanel = document.getElementById('bd-toppanel');
    if (topPanel) topPanel.style.top = anchorBottom + 'px';
    const topPx = (anchorBottom + TOP_PANEL_H) + 'px';
    cyEl.style.top = topPx;
    // A42 §42.3 — #visual-iframe must share #cy's rect exactly. iframe
    // elements have an HTML intrinsic default height of 150 px that the
    // browser can honour even under position: fixed with top+bottom set,
    // so we stamp explicit width/height/top from #cy's bounding rect
    // rather than relying on CSS to derive them.
    const iframeEl = document.getElementById('visual-iframe');
    const GRID_MODULES = ['/bd_M_ABC/', '/bd_M_Fractal/'];   // modules on the panel-grid layout
    const isGridModule = !!(iframeEl && iframeEl.src &&
                            GRID_MODULES.some(u => iframeEl.src.indexOf(u) !== -1));
    if (isGridModule) {
      // 2026-08-18 — music-player grid module (music_player_layout_spec): the
      // iframe = the panel-width COLUMN. Match the bottom panel's left/width
      // (40% centred on desktop, 100% mobile), start 5px below it, fill down to
      // the breadcrumb clearance. Fractal joined the grid 2026-08-19; add any
      // further grid module to GRID_MODULES above.
      const rr = refEl.getBoundingClientRect();
      const top = Math.ceil(rr.bottom) + 5;
      iframeEl.style.top    = top + 'px';
      iframeEl.style.left   = Math.round(rr.left)  + 'px';
      iframeEl.style.width  = Math.round(rr.width) + 'px';
      iframeEl.style.height = Math.max(0, window.innerHeight - 90 - top) + 'px';
    } else if (iframeEl) {
      const cyRect = cyEl.getBoundingClientRect();
      // Only stamp when #cy has non-zero dimensions. In Player mode #cy has
      // `.hidden` (display: none) so its rect collapses to zeros — if we
      // stamped those zeros onto the iframe, its inner module would render
      // into a 0×0 viewport and appear blank. Skipping the stamp keeps the
      // most recent good rect (from the last un-hidden call) so the iframe
      // stays sized correctly across the toggleChatMode → setViewMode('player')
      // rAF sequence used by the ?data= return-from-standalone flow.
      if (cyRect.width > 0 && cyRect.height > 0) {
        // MM3 right-reserve for DESKTOP landscape (V_Kolam needs the 100 px
        // band for the invite panel on the right).
        //
        // v13 — MOBILE left-reserve REMOVED. Was globally shifting every
        // module iframe right by 88 px which caused unwanted crosstalk on
        // music_module (its top-row LH-actions + centred title + Play/Stop
        // all shifted right). Instead each module handles its own gutter
        // for BD's extend panel via its own CSS (V_Kolam adds padding-left
        // in its portrait media query; music_module accepts the panel
        // overlapping only its bottom stepper-band, which was invisible-
        // anyway on the leftmost steppers).
        const isDesktop     = window.innerWidth > 767;
        const reserveRight  = isDesktop ? 100 : 0;
        const stampedWidth  = Math.max(0, cyRect.width - reserveRight);
        iframeEl.style.top    = cyRect.top    + 'px';
        iframeEl.style.left   = cyRect.left   + 'px';
        iframeEl.style.width  = stampedWidth  + 'px';
        iframeEl.style.height = cyRect.height + 'px';
      } else if (iframeEl.classList.contains('active')) {
        // 2026-08-18 — #cy is hidden (Player mode) but the module iframe is
        // showing. Compute the rect from the intended #cy geometry (top =
        // refEl.bottom via topPx, CSS bottom:90px, full width) so the iframe
        // follows the CURRENT Player pane layout instead of a stale Nodes-mode
        // rect. Fixes the History pane overlapping the iframe top when Player is
        // entered straight from Nodes (Edit→Player already had the right rect).
        const top          = parseInt(topPx, 10) || 0;
        const isDesktop    = window.innerWidth > 767;
        const reserveRight = isDesktop ? 100 : 0;
        const w = Math.max(0, window.innerWidth  - reserveRight);
        // 90 was the old #cy bottom, clearing the two breadcrumb strips. They are
        // retired and the canvas now ends at CY_BOTTOM; the iframe shares #cy's
        // rect exactly (A42 §42.3), so it has to move with it or Player mode
        // keeps a 53px band of dead space the canvas no longer has.
        const h = Math.max(0, window.innerHeight - CY_BOTTOM - top);
        iframeEl.style.top    = top + 'px';
        iframeEl.style.left   = '0px';
        iframeEl.style.width  = w + 'px';
        iframeEl.style.height = h + 'px';
      }
    }
  }

  // Kept as named constants because THREE places have to agree about them: this
  // file's canvas placement, the iframe rect that mirrors it, and the CSS
  // fallbacks. They were literals (158 / 90) and drifted out of step with the
  // comments describing them.
  // A42 §42.3 — Nodes/Player view switch. Called by the radio change handler
  // and by toggleChatMode when chat closes (forces back to Nodes).
  const visualIframe = document.getElementById('visual-iframe');

  // MM1.6 (2026-07-05) — track the module currently loaded in the iframe so
  // navigating to another node using the same module is a cheap postMessage
  // rather than a full src reload. Starts null: the iframe has no src at
  // page load (see index.html comment), so the first loadModuleForNode call
  // takes the src-swap + BD_READY path. Same-module navigations thereafter
  // take the fast postMessage path.
  let currentModuleId = null;

  // MM1.6 loader — Strategy B (see amendment discussion). Called only from
  // Player-mode entry and from the bd:node-read handler when Player is
  // active. Same module → postMessage the script (fast). Different module
  // → swap src, await BD_READY, then postMessage script.
  function loadModuleForNode(nodeId) {
    if (!nodeId || !visualIframe) return;
    const node = cy.getElementById(nodeId);
    if (!node || node.length === 0) return;
    const text = node.data('text');
    const moduleId = parseModuleId(text);
    if (!moduleId) return;                                // not a media node
    const url = getModuleUrl(moduleId);
    if (!url) {
      console.warn(`[MM1.6] Unknown module id '${moduleId}' on node ${nodeId} — ignoring`);
      return;
    }
    // Enable Copy Up (↑) whenever a script actually reaches the iframe —
    // Player-mode auto-load counts as "there's a script playing" just as
    // much as a manual Copy Down (↓) does.
    const enableCopyUp = () => {
      const cuBtn = document.getElementById('copy-up-btn');
      if (cuBtn) cuBtn.disabled = false;
    };

    if (moduleId === currentModuleId) {
      // Same module already loaded — just push the script over.
      console.log('[MM1.6] loadModuleForNode: fast path, posting bd_script_update, script length=', text.length);
      try {
        visualIframe.contentWindow.postMessage({ type: 'bd_script_update', script: text }, '*');
        enableCopyUp();
      } catch (_) {}
      return;
    }
    // Different module — swap src, wait for BD_READY from the new module,
    // then send the script. Listener removes itself after firing so we
    // don't accumulate.
    console.log('[MM1.6] loadModuleForNode: swap path, setting src=', url, 'script length=', text.length);
    currentModuleId = moduleId;
    const onReady = (e) => {
      const d = e && e.data;
      if (!d || d.type !== 'BD_READY') return;
      console.log('[MM1.6] onReady: BD_READY received, source match=', e.source === visualIframe.contentWindow);
      window.removeEventListener('message', onReady);
      try {
        visualIframe.contentWindow.postMessage({ type: 'bd_script_update', script: text }, '*');
        enableCopyUp();
        console.log('[MM1.6] onReady: bd_script_update posted');
        // 2026-08-09 — module (and its abc-pane) is now up; re-anchor
        // the extend panel. Delay one frame so the abc-pane has done
        // its first layout pass.
        requestAnimationFrame(() => positionExtendPanel());
        setTimeout(() => positionExtendPanel(), 150);
      } catch (err) {
        console.warn('[MM1.6] onReady: postMessage failed', err);
      }
    };
    window.addEventListener('message', onReady);
    visualIframe.src = url;
  }

  // 2026-08-17 — merge/split the card DOM when the layout mode changes. Nodes
  // mode is one scrollable pane (all cards in #current-stack); Edit/Player show
  // the split (newest in #current-stack, the rest in #chat-stack/History). Only
  // DOM parentage moves — logical card state lives in cards[], untouched. The
  // single card whose home differs is really just "everything below the newest"
  // so this is cheap: merge appends History under the current card (newest-first
  // order preserved); split moves all-but-first back down to History.
  function reflowCardsForMode() {
    if (!currentStackEl || !chatStackEl) return;
    const singlePane = !document.body.classList.contains('edit-active') &&
                       !document.body.classList.contains('player-active');
    if (singlePane) {
      while (chatStackEl.firstChild) currentStackEl.appendChild(chatStackEl.firstChild);
    } else {
      const kids = Array.from(currentStackEl.children);
      for (let i = 1; i < kids.length; i++) chatStackEl.appendChild(kids[i]);
    }
    // 2026-08-17 — cards changed pane → re-evaluate pane-based opacity.
    refreshCardOpacities();
  }

  // 2026-08-17 — one-shot helper card on first Player entry (see below).
  let playerHelperShown = false;

  function setViewMode(mode) {
    if (mode === 'player') {
      // Refresh the iframe rect from #cy in case anything shifted since the
      // last chat toggle (window resize, etc.). Then swap visibility.
      positionCyEl();
      cyEl.classList.add('hidden');
      if (visualIframe) visualIframe.classList.add('active');
      // MM3 (2026-07-12) — body class so CSS can gate the invite panel
      // on Player mode. Hidden by default; visible while player-active.
      document.body.classList.add('player-active');
      document.body.classList.remove('edit-active');
      reflowCardsForMode();   // 2026-08-17 — leave the single-pane merge if coming from Nodes
      // 2026-08-17 — first Player entry this session: drop a Helper card into
      // HISTORY (toHistory) explaining the ↓↑ arrows and the Copy button, so the
      // node's script card keeps the Current pane. Once only (like
      // gatewayHelperShown) so it doesn't spam on every Player toggle.
      if (!playerHelperShown) {
        prependSystemCard('Use the up and down arrows to send information between steppers and the script. Use Copy to create a link to an external website - send your pattern to your friends - uses very little data.', { toHistory: true });
        playerHelperShown = true;
      }
      // 2026-08-18 — re-anchor the iframe now that player-active is set and the
      // panes are in Player layout (History pane shown). The positionCyEl() at
      // the top ran against the PREVIOUS layout (Nodes single pane sits higher),
      // which left the iframe top overlapped by the History pane. Re-run against
      // the real Player layout; rAF catches any post-class-swap reflow.
      positionCyEl();
      requestAnimationFrame(positionCyEl);
      // MM1.6 Strategy B — on entering Player mode, load the current node's
      // module so the user sees the visual immediately without having to
      // press Copy Down.
      const nodeId = (typeof getLastReadNodeId === 'function' && getLastReadNodeId()) ||
                     (typeof getActiveNodeId    === 'function' && getActiveNodeId());
      if (nodeId) loadModuleForNode(nodeId);
      // 2026-08-09 — position the extend panel now and again after a
      // paint so we catch the iframe layout stabilising.
      positionExtendPanel();
      requestAnimationFrame(() => positionExtendPanel());
    } else {
      // 'nodes' or 'edit' — both keep cy visible + hide iframe. The only
      // difference is body.edit-active, which CSS uses to surface the
      // compose controls (Send + New) that belong to Edit mode. Toggled
      // rather than blindly added/removed so 'nodes' explicitly clears it
      // (and 'edit' explicitly sets it).
      cyEl.classList.remove('hidden');
      if (visualIframe) visualIframe.classList.remove('active');
      document.body.classList.remove('player-active');
      const wasEdit = document.body.classList.contains('edit-active');
      document.body.classList.toggle('edit-active', mode === 'edit');
      // 2026-08-15 — first entry into Edit mode kicks off Whisper model
      // download in the background so the first mic press doesn't pay a
      // ~2 s cold-start. Fire-and-forget: async, non-blocking, idempotent
      // (subsequent enters return immediately if the pipeline is loaded).
      // Listeners in the SR wire-up further down in init() pick this up.
      if (mode === 'edit' && !wasEdit) {
        document.dispatchEvent(new CustomEvent('bd:edit-mode-enter'));
      }
      // 2026-08-17 — merge/split the card panes for the new mode, then re-anchor
      // #cy: Nodes hides History + collapses the bar, so #cy's top moves up.
      reflowCardsForMode();
      positionCyEl();
      // Cy's internal size may have gone stale while it was hidden (any
      // resize / rAF re-fit was skipped). Re-sync after a frame so the
      // container has real dimensions again, then re-fit to whatever
      // sub-graph is currently visible.
      requestAnimationFrame(() => {
        positionCyEl();
        cy.resize();
        cy.fit(cy.elements(':visible').not('.parked-mark, .imported-mark'), fitPadding(cy, 40));
      });
    }
  }

  // MM1.6 Strategy B — auto-load a module when the user read-taps a node
  // AND is currently in Player mode. In Nodes mode we don't touch the
  // iframe; the user's mental model is "browsing", not "previewing".
  document.addEventListener('bd:node-read', () => {
    if (!visualIframe || !visualIframe.classList.contains('active')) return;
    const nodeId = (typeof getLastReadNodeId === 'function' && getLastReadNodeId()) ||
                   (typeof getActiveNodeId    === 'function' && getActiveNodeId());
    if (nodeId) loadModuleForNode(nodeId);
  });
  // Window resize while Player is active — restamp the iframe rect from #cy.
  // 2026-08-20 — repositioning ONCE is not enough on an orientation change.
  // iOS fires resize while it is still reporting the old viewport, so the
  // single synchronous pass measured a half-rotated layout and nothing ran
  // afterwards to correct it. Re-run on the next frame and again after the
  // rotation animation, which is why leaving for the external player and
  // coming back "fixed" it — that path repositions from a settled layout.
  function repositionPlayer() {
    if (!visualIframe || !visualIframe.classList.contains('active')) return;
    positionCyEl();
    positionExtendPanel();
  }
  function repositionPlayerSettled() {
    repositionPlayer();
    requestAnimationFrame(repositionPlayer);
    setTimeout(repositionPlayer, 250);
    setTimeout(repositionPlayer, 600);   // iOS rotation animation is ~400ms
  }
  window.addEventListener('resize', repositionPlayerSettled);
  window.addEventListener('orientationchange', repositionPlayerSettled);

  // 2026-08-09 — JS-anchored extend-panel positioning. CSS-only rules
  // (media queries with vh offsets) couldn't reliably align the panel
  // with the module's #abc-pane across phone / iPad / desktop because
  // the two live in different coordinate systems: extend panel is in
  // BD's DOM (viewport-relative), abc-pane is inside the same-origin
  // module iframe. Formula: get iframe rect + abc-pane rect through
  // iframe.contentDocument, sum them, set panel's inline top/left to
  // align with abc-pane's top-left corner (offset a few px so the
  // panel sits *beside* it, not on top). Falls back to CSS defaults
  // when the loaded module has no #abc-pane (e.g. V_Kolam).
  function positionExtendPanel() {
    const panel = document.getElementById('bd-invite-panel-viewer');
    if (!panel) return;
    // 2026-08-17 — release any inline geometry we grew for the Kolam player
    // (History-pane height, ↓↑ arrow tops); the Kolam branch below re-applies
    // each call when applicable (mobile Player). Cleared here so leaving Kolam/
    // Player/desktop restores CSS defaults.
    const histReset = document.getElementById('chat-panel');
    if (histReset) histReset.style.height = '';
    // Release any inline geometry we stamp onto BD chrome for module docking
    // (↓↑ arrow position/size, ext-panel width) so leaving a module/Player
    // restores the CSS defaults. Re-applied below when applicable.
    ['copy-up-btn', 'copy-down-btn'].forEach((id) => {
      const b = document.getElementById(id);
      if (b) { b.style.position = ''; b.style.top = ''; b.style.left = ''; b.style.width = ''; b.style.height = ''; b.style.right = ''; b.style.zIndex = ''; }
    });
    panel.style.width = '';
    // 2026-08-18 — the desktop early-return moved into the LEGACY path below
    // (after the dock-slot check), so grid modules (ABC) dock their arrows +
    // Extension panel onto their slots on desktop too. Non-slot modules
    // (Kolam/Fractal) still fall back to the CSS default on desktop.
    if (!document.body.classList.contains('player-active')) return;
    const outerIframe = document.getElementById('visual-iframe');
    if (!outerIframe) return;

    // v2 (2026-08-09) — walk the iframe chain summing each level's rect
    // offsets, because getBoundingClientRect() is relative to the *own*
    // iframe's viewport, NOT the top-level document. First cut assumed
    // otherwise and stuck the panel at the top of the screen.
    let topPx  = null;
    let leftPx = null;
    let centerUnderCanvas = false;   // 2026-08-17 — Kolam mobile: horizontal bar centred under the canvas
    try {
      const outerRect = outerIframe.getBoundingClientRect();
      const outerDoc  = outerIframe.contentDocument;
      if (!outerDoc) throw new Error('no outer doc');

      // Module shapes:
      //  a) Relay wrapper (music modules): outer doc has #module-frame iframe
      //     → inner doc has #abc-pane.
      //  b) Single-iframe module: outer doc has #abc-pane directly.
      //  c) Kolam: relay wrapper → inner doc has #kolam-canvas (no abc-pane).
      const inner = outerDoc.getElementById('module-frame');
      let innerOffsetTop = 0, innerOffsetLeft = 0, innerDoc = null;
      if (inner) {
        const innerRect = inner.getBoundingClientRect();
        innerOffsetTop  = innerRect.top;   // relative to outerDoc's viewport
        innerOffsetLeft = innerRect.left;
        innerDoc        = inner.contentDocument;
      }
      // 2026-08-18 — dock-slot mechanism (music_player_layout_spec §3). If the
      // module reserves #bd-ext-slot / #bd-arrows-slot (ABC grid), mirror BD's
      // Extension panel + ↓↑ arrows onto those slots and we're done. Kolam /
      // Fractal keep the per-module fallbacks below.
      const extSlot    = innerDoc && innerDoc.getElementById('bd-ext-slot');
      const arrowsSlot = innerDoc && innerDoc.getElementById('bd-arrows-slot');
      if (extSlot || arrowsSlot) {
        if (extSlot) {
          const r = extSlot.getBoundingClientRect();
          // 2026-08-19 — `in-slot` distinguishes THIS placement (a tall grid
          // cell, buttons stacked and full-width) from Kolam's under-canvas
          // strip, which shares `under-canvas` only for the bare-buttons look.
          // Both used to ride on `under-canvas` alone, which is how 322ed49's
          // stacking silently made Kolam's horizontal bar vertical.
          panel.classList.add('under-canvas', 'in-slot');
          panel.style.top       = (outerRect.top  + innerOffsetTop  + r.top)  + 'px';
          panel.style.left      = (outerRect.left + innerOffsetLeft + r.left) + 'px';
          panel.style.width     = r.width + 'px';
          panel.style.right     = 'auto';
          panel.style.bottom    = 'auto';
          panel.style.transform = 'none';
        }
        if (arrowsSlot) {
          const r = arrowsSlot.getBoundingClientRect();
          const x = outerRect.left + innerOffsetLeft + r.left;
          const y = outerRect.top  + innerOffsetTop  + r.top;
          const half = Math.max(20, Math.round((r.height - 4) / 2));
          const dock = (btn, ty, h) => {
            if (!btn) return;
            btn.style.position = 'fixed';
            btn.style.left     = x + 'px';
            btn.style.top      = ty + 'px';
            btn.style.width    = r.width + 'px';
            btn.style.height   = h + 'px';
            btn.style.right    = 'auto';
            btn.style.zIndex   = '7';
          };
          dock(document.getElementById('copy-up-btn'),   y,             half);
          dock(document.getElementById('copy-down-btn'), y + half + 4,  half);
        }
        return;
      }

      // Legacy modules with no dock-slots: on desktop, clear inline overrides
      // and let the CSS default (right-side panel) win.
      // 2026-08-19 — EXCEPT Kolam. Its Extension panel belongs UNDER the canvas
      // at every size, and its arrows beside the stepper column at every size,
      // so it must reach the under-canvas branch below rather than returning
      // here. Returning was what flipped the panel to the vertical right-edge
      // default as soon as the window passed 1024.
      const kolamHere = innerDoc && innerDoc.getElementById('kolam-canvas');
      if (window.innerWidth > 1024 && !kolamHere) {
        panel.classList.remove('under-canvas', 'in-slot');
        panel.style.top = ''; panel.style.left = ''; panel.style.right = '';
        panel.style.bottom = ''; panel.style.transform = '';
        return;
      }

      const abcPane = (innerDoc && innerDoc.getElementById('abc-pane')) || outerDoc.getElementById('abc-pane');

      if (abcPane) {
        const abcRect = abcPane.getBoundingClientRect();
        // Sum: main-viewport-y-of-outer + outer-viewport-y-of-inner + inner-viewport-y-of-abc
        topPx  = outerRect.top  + innerOffsetTop  + abcRect.top;
        leftPx = outerRect.left + 8;                             // panel hugs left edge of iframe
      } else {
        // 2026-08-17 — under-square Extension bar for modules with a central
        // square: Kolam (#kolam-canvas) and ABC (#piece-title). Fractal keeps
        // the left-gutter #abc-pane path above. Horizontal strip centred just
        // BELOW the square.
        const kolamCanvas = innerDoc && innerDoc.getElementById('kolam-canvas');
        const abcSquare   = innerDoc && innerDoc.getElementById('piece-title');
        const square = kolamCanvas || abcSquare;
        if (square) {
          const cRect = square.getBoundingClientRect();
          // Vertical anchor: just below the square (Kolam) OR below the whole
          // ABC group (play/stop) so the bar doesn't wedge between them.
          let bottomRect = cRect;
          if (abcSquare && !kolamCanvas) {
            const pr = innerDoc.querySelector('.playback-row');
            if (pr) bottomRect = pr.getBoundingClientRect();
          }
          topPx  = outerRect.top  + innerOffsetTop  + bottomRect.bottom + 6;         // just under the square/group
          leftPx = outerRect.left + innerOffsetLeft + cRect.left + cRect.width / 2;  // square centre-x
          centerUnderCanvas = true;
          // Kolam-only extras: grow the History pane and stack the ↓↑ arrows to
          // the canvas top. ABC positions its own arrows separately (later).
          if (kolamCanvas) {
            const canvasTopVp = outerRect.top + innerOffsetTop + cRect.top;
            const onPhone = window.innerWidth <= 767;
            // Grow the History pane (#chat-panel) DOWN so its bottom sits just
            // above the canvas top. The module iframe is frozen + z-index 1 in
            // Player mode, so CSS layers #chat-panel above it and here we anchor
            // its height to the live canvas top. Mobile only.
            // 2026-08-20 — skip entirely while the rotate-to-portrait overlay
            // is up. In landscape the canvas rect is meaningless, and the
            // oversized height computed from it was being stamped and kept:
            // rotating back fired one resize, which recomputed from a viewport
            // iOS had not finished updating, so the bad value stuck and the
            // History pane covered the graphic. Reading the overlay's computed
            // display uses the same media query the CSS does, so the two can
            // never disagree. The reset at the top of this function has already
            // cleared the height, so skipping leaves the CSS default.
            const rotOverlay = document.getElementById('rotate-to-portrait');
            const rotated = rotOverlay &&
                            getComputedStyle(rotOverlay).display !== 'none';
            const histPane = document.getElementById('chat-panel');
            if (histPane && histPane.classList.contains('active') && onPhone && !rotated) {
              const h = Math.max(0, Math.round((canvasTopVp - 6) - histPane.getBoundingClientRect().top));
              if (h > 0) histPane.style.height = h + 'px';
            }
            // ↓↑ arrows stacked beside the stepper column, TOP arrow aligned
            // with the canvas top (= top stepper).
            //
            // 2026-08-19 — read the column's LIVE rect instead of trusting the
            // CSS `right: 116px`. That constant assumed the module's SMALL
            // layout (108px column), but the module switches layout on its own
            // iframe width (500px), not on the window: at a ~700px window the
            // iframe is above 500 so the column is 220px, and the arrows landed
            // on the steppers. Measuring can't disagree with the module.
            //
            // Side: prefer the band the module leaves BETWEEN the canvas and
            // the stepper column (the iOS placement) — but only when it is
            // really there. 2026-08-19: keying that on window width was wrong.
            // The band comes from the MODULE's layout, so at a ~700px window,
            // where the module is in its landscape layout, the arrows were
            // being put to the left of the column and landing on the graphic.
            // Measure the gap instead; if it can't hold them, use the 100px
            // band positionCyEl reserves to the RIGHT of the iframe (768+).
            const cUp   = document.getElementById('copy-up-btn');
            const cDown = document.getElementById('copy-down-btn');
            const cpEl  = innerDoc && innerDoc.querySelector('.control-panel');
            if (cUp && cDown && cpEl) {
              const cpRect = cpEl.getBoundingClientRect();
              const bw = Math.ceil(cUp.getBoundingClientRect().width) || 30;
              const colLeftVp  = outerRect.left + innerOffsetLeft + cpRect.left;
              const colRightVp = outerRect.left + innerOffsetLeft + cpRect.right;
              const innerGap   = cpRect.left - cRect.right;   // canvas → column
              const fitsInside = innerGap >= bw + 8;
              // 3px, not 6 — the arrows read as belonging to the column.
              const x = fitsInside ? Math.round(colLeftVp - bw - 3)
                                   : Math.round(colRightVp + 4);
              [[cUp, 0], [cDown, 26]].forEach(([b, dy]) => {
                b.style.position = 'fixed';
                b.style.left     = x + 'px';
                b.style.right    = 'auto';
                b.style.top      = Math.round(canvasTopVp + dy) + 'px';
                b.style.zIndex   = '7';
              });
            }
          }
        }
      }
    } catch (_) {
      // Cross-origin or DOM not ready — fall through to CSS defaults.
    }

    if (topPx === null) {
      // Clear inline overrides so the CSS media-query defaults win.
      panel.classList.remove('under-canvas', 'in-slot');
      panel.style.top = '';
      panel.style.left = '';
      panel.style.right = '';
      panel.style.bottom = '';
      panel.style.transform = '';
      return;
    }

    // .under-canvas drives the horizontal layout (buttons in a row, labels
    // hidden) for the Kolam under-canvas placement; music modules keep the
    // vertical left-gutter panel.
    panel.classList.toggle('under-canvas', centerUnderCanvas);
    panel.classList.remove('in-slot');   // this path is never a dock slot
    panel.style.left      = leftPx + 'px';
    panel.style.right     = 'auto';
    panel.style.bottom    = 'auto';
    panel.style.transform = centerUnderCanvas ? 'translateX(-50%)' : 'none';
    if (centerUnderCanvas) {
      // 2026-08-19 — the strip must live in the gap BETWEEN the canvas bottom
      // and the breadcrumbs, never over them. Classes and width are set above,
      // so the panel's real height can be measured now; clamp the top so its
      // bottom edge clears the breadcrumbs by 4px.
      // 2026-08-20 — take the HIGHER of the two strips rather than naming one.
      // This read #cy-you as "the upper breadcrumb strip", which stopped being
      // true when the two were swapped so the remote strip could sit under its
      // enlarged copy; the ext strip would then have been allowed 26px lower,
      // straight over the bar that had moved up.
      const barTop = ['cy-buddy', 'cy-you'].reduce((top, id) => {
        const el = document.getElementById(id);
        if (!el) return top;
        const r = el.getBoundingClientRect();
        return (r.height > 0 && r.top < top) ? r.top : top;
      }, window.innerHeight - 63);
      const limit = barTop - 4;
      const ph = panel.getBoundingClientRect().height || 36;
      topPx = Math.min(topPx, limit - ph);
    }
    panel.style.top       = topPx + 'px';
  }

  // 2026-07-15 — Chat is now always active from boot (no toggle). The
  // chat button is now the Join / Leave button: press Join to enter the
  // pair queue (curation-code-gated for the arriver), press Leave to
  // unpair or to walk out of the wait queue. Label reflects state.
  function updateJoinButtonLabel() {
    // 2026-08-14 — labels shortened to Pair / Unpair as part of the
    // button-rationalisation pass. Tightens visual footprint in the
    // top row and is more direct about what the button does (previously
    // "Join Remote" / "Say: Bye"). Server-side NO_PARTNER_WAITING_TEXT
    // helper copy still references the older "Join" verb; update there
    // if drift becomes confusing.
    chatBtn.textContent = (pairingState.active || pairingState.waiting) ? 'Unpair' : 'Pair';
  }

  function togglePair() {
    const wsNow = wsRef.current;
    if (!wsNow || !wsNow.connected) return;

    if (pairingState.active || pairingState.waiting) {
      // Leave — either walking out of the wait queue or unpairing from a
      // live partner. Server's unpair handler notifies the buddy via
      // buddy_disconnected (if paired) and drops "Partner disconnected."
      // in their chat log. This user does NOT auto re-queue.
      // 2026-08-15 — Unpair does NOT deactivate Edit mode. User's spec:
      // once Edit is engaged, only a radio press exits Edit. Unpair only
      // undoes the pair state, not the compose mode. So we deliberately
      // do not touch #view-mode-toggle or body.edit-active here.
      console.log('[pair-debug] Leave press → unpair (active=', pairingState.active, ', waiting=', pairingState.waiting, ')');
      wsNow.emit('msg', { type: 'unpair' });
      pairingState.active = false;
      pairingState.waiting = false;
      // Leaving must dim the partner's marks exactly as buddy_disconnected
      // does on the other side. This used to reset only the pair flags, so
      // the person who LEFT went on showing their ex-partner's trail and Blue
      // Node at full strength, as though the pair were still live — the two
      // screens disagreed about whether it existed.
      buddyCy.nodes().addClass('buddy-gone');
      try { markBuddyGone(); } catch (err) { console.warn('[BN] markBuddyGone failed', err); }
      const pairStatusEl = document.getElementById('pair-status');
      if (pairStatusEl) pairStatusEl.textContent = '';
      updateJoinButtonLabel();
      updateSendBtn();
      return;
    }

    // Join — enter the pair queue. Curation code from #dev-code is always
    // sent when present; server ignores it if no CURATION_CODE is
    // configured, gates on it (arriver only) if one is. Server responds
    // with wait_state, paired, or pair_denied; those flow through the
    // message dispatch below to update pairingState + label.
    const devCodeEl = document.getElementById('dev-code');
    const code = devCodeEl ? devCodeEl.value.trim() : '';
    console.log('[pair-debug] Join press → ready_to_pair (code:', code ? `"${code}"` : 'empty', ')');
    wsNow.emit('msg', { type: 'ready_to_pair', code });
    pairingState.waiting = true;
    updateJoinButtonLabel();
    // 2026-08-15 — pressing Pair also engages Edit mode (compose posture).
    // User's spec: Pair-and-Edit are entered together; Edit stays on after
    // Unpair; only the radios exit Edit. Idempotent if Edit is already
    // selected.
    const editRadio = document.querySelector('#view-mode-toggle input[value="edit"]');
    if (editRadio && !editRadio.checked) {
      editRadio.checked = true;
      setViewMode('edit');
    }
  }

  // A42 §42.3 — Nodes/Player radio change handler.
  document.querySelectorAll('#view-mode-toggle input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) setViewMode(radio.value);
    });
  });

  chatBtn.addEventListener('click', togglePair);

  chatStackEl    = document.getElementById('chat-stack');
  currentStackEl = document.getElementById('current-stack');   // 2026-08-14 split
  defaultStackEl = document.getElementById('default-stack');

  // ── SR (Speech Recognition) wire-up — 2026-08-15 ─────────────────────
  // MVP1 scope:
  //   - Mic button in action-bar (visible only in Edit mode)
  //   - Click "Use Mic" → grants browser permission (one-shot)
  //   - Press-and-hold once granted → capture PCM
  //   - Release → transcribe via Whisper (bias from visible History)
  //   - Final text lands in the top Local card in #current-stack
  // NOT YET (MVP2):
  //   - Alignment / {?…} substitution (sr_module.js exports available;
  //     just not called here yet)
  //   - Accept-{?…} button
  //   - Quality report banner
  const srMicBtn      = document.getElementById('sr-mic-btn');
  const srLevelMeter  = document.getElementById('sr-level-meter');
  const srMicPrimer   = document.getElementById('sr-mic-primer');
  const srLevelBar    = srLevelMeter ? srLevelMeter.querySelector('.bar') : null;
  let   srMicState    = 'need-permission';   // need-permission | ready | recording | processing | error
  let   srUseMic      = false;
  // 2026-08-15 MVP2 — snapshot captured at record-start of visible-History
  // text. Feeds BOTH the bias prompt (widens Whisper's vocab) AND the post-
  // hoc alignment (finds source spans and marks them {?…} in the output).
  let   srSourceSnapshot = '';
  // 2026-08-15 — caret snapshot for insertion targeting. Pressing-and-
  // holding the mic button transfers focus AWAY from any Current textarea,
  // wiping the visible caret. We track caret position on every relevant
  // interaction (focus/input/keyup/mouseup/focusout) with textareas inside
  // #current-stack, so at transcript-arrival time we know exactly where
  // the user was editing. Falls back to "append to end of top Local card"
  // if no valid caret snapshot exists (e.g. user hasn't touched Current
  // yet, or the tracked textarea has since moved to History).
  let   srCaretSnapshot = null;   // {textarea, selectionStart, selectionEnd}

  // Continuously track caret position in any Current textarea. Delegated
  // listeners so we don't have to re-attach when cards get created /
  // promoted. On focusout we snapshot the position of the element LOSING
  // focus (that's the useful moment: after this, activeElement moves to
  // the mic button and the natural cursor is gone).
  function captureCaretIfInCurrent(fromEl) {
    const el = fromEl || document.activeElement;
    if (el && el.tagName === 'TEXTAREA' && currentStackEl && currentStackEl.contains(el)) {
      srCaretSnapshot = {
        textarea:       el,
        selectionStart: el.selectionStart,
        selectionEnd:   el.selectionEnd,
      };
    }
    refreshWrapBtnEnabled();
  }
  // 2026-08-23 — {?} works across the whole editor, not just Current textareas.
  //
  // It was limited to <textarea> inside #current-stack, which is only the top
  // LOCAL card. Every other card body is a contenteditable div, and History is
  // editable too, so most of the editor could not be marked at all. {?} is
  // general editor vocabulary — "this bit is tentative" — so it should work
  // wherever the user can type.
  function inEditorStack(el) {
    return !!(el && ((currentStackEl && currentStackEl.contains(el)) ||
                     (chatStackEl    && chatStackEl.contains(el))));
  }

  // The live selection, whichever kind of editable it is in. Read at click
  // time rather than from a snapshot: the button suppresses its own
  // pointerdown, so focus and selection are still intact when it fires.
  function editorSelection() {
    const ae = document.activeElement;
    if (ae && ae.tagName === 'TEXTAREA' && inEditorStack(ae) &&
        ae.selectionStart !== ae.selectionEnd) {
      return { kind: 'ta', el: ae, start: ae.selectionStart, end: ae.selectionEnd };
    }
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const n = sel.anchorNode;
      const host = n && (n.nodeType === 1 ? n : n.parentElement);
      const ce = host && host.closest && host.closest('[contenteditable="true"]');
      if (ce && inEditorStack(ce)) return { kind: 'ce', el: ce, sel };
    }
    return null;
  }

  function refreshWrapBtnEnabled() {
    const btn = document.getElementById('sr-wrap-btn');
    if (!btn) return;
    btn.disabled = !editorSelection();
  }
  if (currentStackEl) {
    currentStackEl.addEventListener('focusin',  () => captureCaretIfInCurrent());
    currentStackEl.addEventListener('input',    () => captureCaretIfInCurrent());
    currentStackEl.addEventListener('keyup',    () => captureCaretIfInCurrent());
    currentStackEl.addEventListener('mouseup',  () => captureCaretIfInCurrent());
    currentStackEl.addEventListener('focusout', (e) => captureCaretIfInCurrent(e.target));
    // 2026-08-23 — touchend, because iOS does not fire mouseup. Selecting text
    // by long-press produced NONE of the five events above, so the snapshot
    // never updated, the {?} button stayed disabled, and a disabled button
    // does not even emit click. That is why it appeared dead on iOS.
    currentStackEl.addEventListener('touchend', () => captureCaretIfInCurrent());
  }
  // History is editable too, and {?} now works there. It does not feed the SR
  // insertion snapshot — that deliberately tracks Current only — so these just
  // refresh the button.
  if (chatStackEl) {
    ['mouseup', 'touchend', 'keyup', 'focusin', 'input']
      .forEach(ev => chatStackEl.addEventListener(ev, () => refreshWrapBtnEnabled()));
  }
  // selectionchange is the only event that reliably fires for EVERY way a
  // selection can be made — drag, long-press, double-tap, keyboard, and the
  // iOS selection handles being dragged after the initial press. It lives on
  // document rather than on the element, so it is guarded to textareas inside
  // Current.
  document.addEventListener('selectionchange', () => {
    const el = document.activeElement;
    if (el && el.tagName === 'TEXTAREA' && currentStackEl && currentStackEl.contains(el)) {
      captureCaretIfInCurrent(el);   // Current textarea: also feeds SR insertion
    } else {
      refreshWrapBtnEnabled();       // anywhere else in the editor: {?} only
    }
  });
  // selectionchange fires globally on the document — catches keyboard/
  // touch selection expansion inside textareas even between the events
  // above. Lightweight guard: only refresh Wrap-btn state (don't re-
  // snapshot the caret unless activeElement is a Current textarea).
  document.addEventListener('selectionchange', () => {
    const ae = document.activeElement;
    if (ae && ae.tagName === 'TEXTAREA' && currentStackEl && currentStackEl.contains(ae)) {
      srCaretSnapshot = {
        textarea:       ae,
        selectionStart: ae.selectionStart,
        selectionEnd:   ae.selectionEnd,
      };
    }
    refreshWrapBtnEnabled();
  });

  // Snapshot the alignment source at record-start. Per 2026-08-15 design
  // discussion: "passage being aligned needs to be deduced as a subset of
  // what is approximately visible on screen." Card counts as visible if
  // its bounding rect intersects #chat-stack's viewport rect. Bodies are
  // concatenated with single spaces (collage style — no paragraph
  // separators; user prefers contiguous stream). Directive blocks are
  // stripped so %%bd_module etc. don't corrupt the bias / (future)
  // alignment source.
  function snapshotVisibleHistorySource() {
    if (!chatStackEl) return '';
    const pane = chatStackEl.getBoundingClientRect();
    const parts = [];
    for (const cardEl of chatStackEl.querySelectorAll('.card')) {
      const r = cardEl.getBoundingClientRect();
      if (r.bottom <= pane.top || r.top >= pane.bottom) continue;
      const body = cardEl.querySelector('.card-body');
      if (!body) continue;
      const raw = (body.value !== undefined ? body.value : body.textContent) || '';
      parts.push(srStripDirectives(raw));
    }
    return parts.join(' ').trim();
  }

  function refreshSRMicUI() {
    if (!srMicBtn) return;
    srMicBtn.classList.remove('listening', 'processing');
    srMicBtn.disabled = false;
    // 2026-08-16 — icon-only across all states to save action-bar width.
    // State communicated via CSS class (colour) and the title attribute
    // (hover text on desktop, VoiceOver readout on iOS).
    srMicBtn.textContent = '🎤';
    switch (srMicState) {
      case 'need-permission':
        srMicBtn.title = 'Click to grant microphone permission';
        break;
      case 'ready':
        srMicBtn.title = 'Press and hold to record';
        break;
      case 'recording':
        srMicBtn.classList.add('listening');
        srMicBtn.title = 'Release to transcribe';
        break;
      case 'processing':
        srMicBtn.classList.add('processing');
        srMicBtn.disabled = true;
        srMicBtn.title = 'Transcribing…';
        break;
      case 'error':
        srMicBtn.title = 'Click to retry';
        break;
    }
  }

  const srEngine = createSREngine({
    onStatus: (msg, kind) => console.log('[SR status]', kind || 'info', msg),
    onLog:    (msg, kind) => console.log('[SR log]',    kind || 'info', msg),
    onLevel:  (peak) => {
      if (!srLevelBar) return;
      const dbfs = peak > 0 ? 20 * Math.log10(peak) : -60;
      const pct = Math.max(0, Math.min(100, ((dbfs + 60) / 60) * 100));
      srLevelBar.style.width = pct + '%';
      srLevelBar.classList.remove('mid', 'hot');
      if (dbfs > -3)       srLevelBar.classList.add('hot');
      else if (dbfs > -12) srLevelBar.classList.add('mid');
    },
    onFinal:  (text) => {
      // 2026-08-15 MVP2 — align transcription against the record-start
      // snapshot; wrap detected substitutions in {?…} markers with em-dash
      // boundaries at commentary/quote transitions. Falls back to raw text
      // if no significant match found (snapshot empty, no overlap, etc.).
      // Mode threads through to insertion so free-mode injections get
      // em-dash separators against adjacent existing content.
      const { text: marked, mode } = srAlignAndMark(text, srSourceSnapshot);
      insertTranscriptIntoCurrent(marked, mode);
      if (srMicState === 'processing') { srMicState = 'ready'; refreshSRMicUI(); }
    },
    onError:  (err) => {
      console.warn('[SR] engine error', err);
      if (srMicState === 'processing' || srMicState === 'recording') {
        srMicState = 'ready';
        refreshSRMicUI();
      }
    },
    compressionOn: true,
  });

  // Insert final Whisper text into a Current textarea.
  //
  // Priority order (2026-08-15):
  //   1. If srCaretSnapshot points to a textarea still in Current, insert
  //      at that saved caret position. Preserves the user's cursor after
  //      the mic-button focus grab wiped it. If the saved range was a
  //      selection, collapse to its end first (matches sr_editor's
  //      "append after previous auto-selection" rule — Delete first, then
  //      re-record, if you want to REPLACE the previous one).
  //   2. Else fall back to appending to the end of the top Local card in
  //      Current (creating one if none exists).
  //
  // Boundary separator between the new injection and adjacent existing
  // text depends on mode:
  //   mode='bound' → ' ' (space) — reading continues, no visual break
  //   mode='free'  → ' — ' — em-dash marks commentary against neighbouring text
  // Any adjacent whitespace on either side of the insertion point is
  // absorbed into the replaced range so we don't get double-spaces or
  // "space then em-dash" doubling.
  //
  // Inserted text (including any boundary marks) is auto-selected via
  // setRangeText 'select' so a single Delete wipes the whole insertion
  // for a redo. srCaretSnapshot is refreshed to the new selection so
  // consecutive recordings chain naturally.
  function insertTranscriptIntoCurrent(text, mode) {
    const clean = (text || '').trim();
    if (!clean) return;
    const isFree = (mode === 'free');

    // Helper: given the raw existing value and a [start, end] range for
    // insertion, compute the actual replacement range (absorbing adjacent
    // whitespace) and the composed insertText (with boundary marks
    // prepended/appended if adjacent non-whitespace exists).
    function composeInsertion(value, start, end) {
      // Collapse selection to its end (append after previous auto-select).
      if (start !== end) start = end;
      const beforeRaw = value.slice(0, start);
      const afterRaw  = value.slice(end);
      const beforeTrimmed = beforeRaw.replace(/\s+$/, '');
      const afterTrimmed  = afterRaw.replace(/^\s+/, '');
      const hasBefore = beforeTrimmed.length > 0;
      const hasAfter  = afterTrimmed.length > 0;
      // 2026-08-15 — mid-passage lowercase. If we're inserting after
      // existing non-terminal text (anything except . ! ?), lowercase
      // the FIRST alpha char of the new content. Whisper always emits
      // sentence-initial caps; makes no sense mid-sentence.
      let body = clean;
      if (hasBefore) {
        const lastChar = beforeTrimmed.slice(-1);
        if (!/[.!?]/.test(lastChar)) {
          // Find first letter and lowercase it. Skip over any {? marker
          // opening (e.g. "{?Foo}" → "{?foo}") for cleaner reading.
          body = body.replace(/^(\{\?)?([A-Z])/, (m, prefix, ch) => (prefix || '') + ch.toLowerCase());
        }
      }
      const sep = isFree ? ' — ' : ' ';
      let insertText = body;
      if (hasBefore) insertText = sep + insertText;
      if (hasAfter)  insertText = insertText + sep;
      // Absorb the adjacent whitespace we trimmed off so we replace it
      // rather than leaving it in place next to our new separator.
      const trailingWSLen = beforeRaw.length - beforeTrimmed.length;
      const leadingWSLen  = afterRaw.length  - afterTrimmed.length;
      return {
        insertText,
        replaceStart: start - trailingWSLen,
        replaceEnd:   end + leadingWSLen,
      };
    }

    // Path 1: use saved caret if valid
    if (srCaretSnapshot && srCaretSnapshot.textarea &&
        currentStackEl && currentStackEl.contains(srCaretSnapshot.textarea)) {
      const ta = srCaretSnapshot.textarea;
      const savedStart = Math.min(srCaretSnapshot.selectionStart, ta.value.length);
      const savedEnd   = Math.min(srCaretSnapshot.selectionEnd,   ta.value.length);
      const { insertText, replaceStart, replaceEnd } = composeInsertion(ta.value, savedStart, savedEnd);
      try {
        ta.focus({ preventScroll: true });
        ta.setRangeText(insertText, replaceStart, replaceEnd, 'select');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        srCaretSnapshot = {
          textarea:       ta,
          selectionStart: ta.selectionStart,
          selectionEnd:   ta.selectionEnd,
        };
      } catch (err) {
        console.warn('[SR] caret-anchored insert failed, falling back', err);
        srCaretSnapshot = null;
      }
      if (srCaretSnapshot) return;
    }

    // Path 2: fallback — append to end of top Local card in Current
    let top = topLocalCard();
    const topInCurrent = top && top.el && currentStackEl && currentStackEl.contains(top.el);
    if (!topInCurrent) top = createCard({ kind: 'local' });
    if (!top || !top.body) return;
    const body = top.body;
    const endPos = body.value.length;
    const { insertText, replaceStart, replaceEnd } = composeInsertion(body.value, endPos, endPos);
    try {
      body.focus({ preventScroll: true });
      body.setRangeText(insertText, replaceStart, replaceEnd, 'select');
      body.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (_) {}
    srCaretSnapshot = {
      textarea:       body,
      selectionStart: body.selectionStart,
      selectionEnd:   body.selectionEnd,
    };
  }

  // 2026-08-15 MVP2 — alignment + {?…} substitution wrapper. Uses the
  // Smith-Waterman aligner from sr_module.js. Same thresholds as sr_editor
  // defaults (minLen 3, minScore 4, phonWeight 0.5). Returns raw text
  // untouched if no match survives; otherwise returns text with sub/del/
  // ins spans wrapped in `{?…}` and em-dash boundaries where the quote
  // meets user commentary.
  // Returns { text, mode } where mode ∈ 'bound' | 'free'. Bound = the
  // utterance overwhelmingly aligned to source (≥ 70 %); Free = it did
  // not, so the transcription is treated as commentary. Insertion code
  // uses mode to pick the boundary separator (' ' vs ' — ') when
  // adjacent text exists.
  function srAlignAndMark(uttText, srcText) {
    // 2026-08-15 — strip leading/trailing quote marks from Whisper
    // output. Whisper sometimes wraps a recording it perceives as a
    // direct quotation / recitation in " " or ' ' (typical when the
    // speaker's cadence reads as "reading aloud"). Not user-spoken;
    // remove before alignment / insertion so we don't drag them into
    // the destination. Handles straight " ' plus curly " " ' '.
    const QUOTE_RE = /^["'“”‘’]+\s*|\s*["'“”‘’]+$/g;
    uttText = (uttText || '').replace(QUOTE_RE, '');
    if (!uttText || !srcText) return { text: uttText, mode: 'free' };
    try {
      const uttToks = srTokenise(uttText);
      const srcToks = srTokenise(srcText);
      let matches = srAlignLocal(uttToks, srcToks, { minLen: 3, minScore: 4, phonWeight: 0.5 });
      if (!matches.length) return { text: uttText, mode: 'free' };
      const preRatio = matches.reduce((s, m) => s + m.length, 0) / uttToks.length;
      const mode = preRatio >= 0.7 ? 'bound' : 'free';
      // Snapshot the primary match's boundaries BEFORE extension so we
      // can log what the extension added.
      const firstMatch = matches.reduce((f, m) => m.aStart < f.aStart ? m : f, matches[0]);
      const lastMatch  = matches.reduce((l, m) => m.aEnd   > l.aEnd   ? m : l, matches[0]);
      const preFirst = { aStart: firstMatch.aStart, bStart: firstMatch.bStart };
      const preLast  = { aEnd:   lastMatch.aEnd,   bEnd:   lastMatch.bEnd   };
      matches = srExtendBoundaries(matches, uttToks, srcToks, { boundThreshold: 0.7 });
      const { text: marked, subs } = srApplySubstitutions(uttText, uttToks, srcToks, matches, { mode });
      const postMatched = matches.reduce((s, m) => s + m.length, 0);
      console.log(`[SR] alignment: ${matches.length} match(es), pre-ratio ${(preRatio*100).toFixed(0)}% → ${mode} mode, ${postMatched}/${uttToks.length} tokens after extend, ${subs.length} edit(s)`);
      // Detail log: what the boundary extension paired up (2026-08-15
      // diagnostic — helps trace cases like Whisper condensing "of late
      // to" → "o" where positional 1:1 pairing can't fully recover).
      if (mode === 'bound') {
        const backAdded = preFirst.aStart - firstMatch.aStart;
        const fwdAdded  = lastMatch.aEnd - preLast.aEnd;
        if (backAdded) {
          const pairs = [];
          for (let k = 1; k <= backAdded; k++) {
            const aIdx = preFirst.aStart - k, bIdx = preFirst.bStart - k;
            if (aIdx < 0 || bIdx < 0) break;
            pairs.push(`utt[${aIdx}]"${uttToks[aIdx].surface}"→src[${bIdx}]"${srcToks[bIdx].surface}"`);
          }
          console.log(`[SR] extend backward (${backAdded}): ${pairs.join(', ')}`);
        }
        if (fwdAdded) {
          const pairs = [];
          for (let k = 1; k <= fwdAdded; k++) {
            const aIdx = preLast.aEnd + k, bIdx = preLast.bEnd + k;
            if (aIdx >= uttToks.length || bIdx >= srcToks.length) break;
            pairs.push(`utt[${aIdx}]"${uttToks[aIdx].surface}"→src[${bIdx}]"${srcToks[bIdx].surface}"`);
          }
          console.log(`[SR] extend forward  (${fwdAdded}): ${pairs.join(', ')}`);
        }
        if (!backAdded && !fwdAdded) {
          console.log(`[SR] no extension (match already spans utt[${firstMatch.aStart}..${lastMatch.aEnd}] of ${uttToks.length}, src[${firstMatch.bStart}..${lastMatch.bEnd}] of ${srcToks.length})`);
        }
      }
      return { text: marked, mode };
    } catch (err) {
      console.warn('[SR] alignment failed, using raw text', err);
      return { text: uttText, mode: 'free' };
    }
  }

  // Stale-event guard (sr_editor.html: filters Safari's dead-letter queue
  // of pointer events held behind the permission modal). If an event's
  // timestamp is > 500ms old, drop it.
  function srStaleEvent(evt) {
    return evt && typeof evt.timeStamp === 'number' &&
           (performance.now() - evt.timeStamp) > 500;
  }

  async function srGrantMic(evt) {
    if (srStaleEvent(evt)) return;
    if (srMicPrimer) srMicPrimer.hidden = false;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const t of s.getTracks()) t.stop();
      srUseMic  = true;
      srMicState = 'ready';
      refreshSRMicUI();
    } catch (err) {
      srMicState = 'error';
      refreshSRMicUI();
      console.warn('[SR] mic denied:', err.message);
    } finally {
      if (srMicPrimer) srMicPrimer.hidden = true;
    }
  }

  async function srStartRecording(evt) {
    if (srStaleEvent(evt)) return;
    if (srMicState !== 'ready') return;
    // 2026-08-15 — snapshot the alignment / bias source at pointerdown.
    // User can't scroll while holding mic; whatever is visible right now
    // is the reading source for the recording that's about to happen.
    srSourceSnapshot = snapshotVisibleHistorySource();
    srMicState = 'recording';
    refreshSRMicUI();
    try {
      await srEngine.start();
    } catch (err) {
      srMicState = 'ready';
      refreshSRMicUI();
      console.warn('[SR] start failed', err);
    }
  }

  async function srStopRecording() {
    if (srMicState !== 'recording') return;
    srMicState = 'processing';
    refreshSRMicUI();
    // Build bias prompt from the snapshot taken at pointerdown.
    let biasText = '';
    if (srSourceSnapshot) {
      const built = srBuildBiasPrompt(srSourceSnapshot, 4);
      biasText = built.text || '';
    }
    try {
      await srEngine.stop(biasText);
    } catch (err) {
      srMicState = 'ready';
      refreshSRMicUI();
      console.warn('[SR] stop failed', err);
    }
  }

  // 2026-08-15 — kick off Whisper model download on first entry to Edit
  // mode so first mic press doesn't pay a ~2 s cold-start. install() is
  // idempotent: returns immediately if pipeline already loaded, so
  // repeated Edit re-entries are cheap. Fire-and-forget (background).
  function srWarmUp() {
    srEngine.install().catch(err => {
      console.warn('[SR] pre-warm install failed', err);
    });
  }
  document.addEventListener('bd:edit-mode-enter', srWarmUp);
  // If Edit is already active at wire-up time (defensive — user pressing
  // Pair before this code runs), warm up now.
  if (document.body.classList.contains('edit-active')) srWarmUp();

  if (srMicBtn) {
    // State 1 (idle): click grants permission
    srMicBtn.addEventListener('click', (evt) => {
      if (srMicState === 'need-permission' || srMicState === 'error') {
        srGrantMic(evt);
      }
    });
    // States 3-4 (ready → recording): press-and-hold
    // Uses pointerdown/pointerup (unified across mouse+touch); passive
    // for scroll-perf (we're not preventing default anyway).
    srMicBtn.addEventListener('pointerdown', (evt) => {
      if (srMicState === 'ready') srStartRecording(evt);
    });
    srMicBtn.addEventListener('pointerup',     () => { if (srMicState === 'recording') srStopRecording(); });
    srMicBtn.addEventListener('pointercancel', () => { if (srMicState === 'recording') srStopRecording(); });
    srMicBtn.addEventListener('pointerleave',  () => { if (srMicState === 'recording') srStopRecording(); });
    refreshSRMicUI();
  }
  // 2026-08-15 MVP2 — Accept button: strip {?…} tentative markers
  // throughout the top card in Current. Em-dashes inside ins-wraps
  // survive as permanent literary asides (that's why they were placed
  // INSIDE the markers by applySubstitutions).
  // 2026-08-16 — broadened from topLocalCard() to "top card in Current,
  // whatever kind" so it also strips markers from a Received partner
  // card (arrives with {?…} from the sender's Wrap button below).
  // Textareas use setRangeText (preserves undo stack); received/system
  // cards are contenteditable divs — use .textContent.
  function topBodyInCurrent() {
    if (!currentStackEl) return null;
    const cardEl = currentStackEl.querySelector('.card');
    return cardEl ? cardEl.querySelector('.card-body') : null;
  }
  const srAcceptBtn = document.getElementById('sr-accept-btn');
  if (srAcceptBtn) {
    srAcceptBtn.addEventListener('click', () => {
      const body = topBodyInCurrent();
      if (!body) return;
      const isTextarea = body.tagName === 'TEXTAREA';
      const before = isTextarea ? (body.value || '') : (body.textContent || '');
      const after  = srStripTentative(before);
      if (before === after) {
        console.log('[SR] no {?…} markers to strip');
        return;
      }
      try {
        if (isTextarea) {
          body.focus({ preventScroll: true });
          body.setRangeText(after, 0, before.length, 'end');
          body.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          body.textContent = after;
        }
        const count = (before.match(/\{\?[^}]+\}/g) || []).length;
        console.log(`[SR] accepted ${count} tentative marker(s)`);
      } catch (err) {
        console.warn('[SR] accept failed', err);
      }
    });
  }

  // 2026-08-16 — Wrap-{?} button. Wraps the current selection in a
  // Current textarea with {?…} tentative-review markers. Sent verbatim
  // over the wire (sendTopLocalCard reads body.value as-is), so the
  // paired remote sees the markers and can Accept-strip them.
  // Enabled state managed by refreshWrapBtnEnabled above.
  const srWrapBtn = document.getElementById('sr-wrap-btn');
  if (srWrapBtn) {
    // Keep the selection alive while the button is pressed. Without this the
    // textarea blurs on pointer-down, and on some browsers that collapses the
    // selection before the click handler ever reads it — the button then acts
    // on nothing. preventDefault on pointerdown stops focus moving at all.
    srWrapBtn.addEventListener('pointerdown', (e) => e.preventDefault());
    srWrapBtn.addEventListener('mousedown',   (e) => e.preventDefault());
    srWrapBtn.addEventListener('click', () => {
      const s = editorSelection();
      if (!s) return;
      try {
        if (s.kind === 'ta') {
          const ta = s.el;
          const selected = ta.value.slice(s.start, s.end);
          ta.focus({ preventScroll: true });
          ta.setRangeText('{?' + selected + '}', s.start, s.end, 'select');
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          srCaretSnapshot = {
            textarea:       ta,
            selectionStart: ta.selectionStart,
            selectionEnd:   ta.selectionEnd,
          };
          console.log(`[BD] wrapped ${selected.length}-char selection in {?…}`);
        } else {
          // contenteditable. execCommand is deprecated but is the only way to
          // edit a contenteditable AND keep the browser's native undo stack, and
          // a Range splice would break Ctrl-Z on the card. Falls back to the
          // splice if it is ever refused.
          const text = s.sel.toString();
          const ok = document.execCommand('insertText', false, '{?' + text + '}');
          if (!ok) {
            const r = s.sel.getRangeAt(0);
            r.deleteContents();
            r.insertNode(document.createTextNode('{?' + text + '}'));
          }
          s.el.dispatchEvent(new Event('input', { bubbles: true }));
          console.log(`[BD] wrapped ${text.length}-char selection in {?…} (contenteditable)`);
        }
        refreshWrapBtnEnabled();
      } catch (err) {
        console.warn('[BD] {?} wrap failed', err);
      }
    });
  }
  // ── end SR wire-up ────────────────────────────────────────────────────

  const newCardBtn = document.getElementById('chat-new-card-btn');
  if (newCardBtn) {
    newCardBtn.addEventListener('click', () => {
      const card = createCard({ kind: 'local' });
      // 2026-08-14 — reset both panes' scroll positions after a new card
      // arrives (History freshly-topped by promotion; Current freshly-
      // populated). createCard already sets scrollTop=0 on both, but we
      // keep this line as a belt-and-braces for the "user clicked New
      // then scrolled" edge case.
      if (currentStackEl) currentStackEl.scrollTop = 0;
      if (chatStackEl)    chatStackEl.scrollTop    = 0;
      if (card && card.body && card.body.focus) {
        try { card.body.focus(); } catch (_) {}
      }
    });
  }

  // Pair button was removed 2026-07-04 — its function is now the first step
  // of the Chat toggle-on (see toggleChatMode). pairStatus span kept for
  // the Waiting.../Paired status messages routed through the message
  // handler below.
  const pairStatus = document.getElementById('pair-status');

  // 2026-07-25 — Edit checkbox retired. editModeActive is now derived
  // from "curation code field non-empty". Server-side code check still
  // happens at real-write time (write_hints, edit_node_text, cluster
  // edit save) — a wrong code silently unlocks edit mode client-side
  // but any DB-write attempt fails meaningfully. Simpler than the old
  // pre-validate-via-write_hints-ping dance.
  //
  // editModeUnlocked kept as a boolean, aliased to editModeActive here
  // so any pre-existing check that reads `editModeUnlocked` still works.
  (function wireEditModeToCodeField() {
    const codeEl = document.getElementById('dev-code');
    if (!codeEl) return;
    // Sv/Wr/Re are visible only when the code field is filled to its full
    // 4-char length — cuts clutter for ordinary readers who never touch it.
    // Server still enforces the actual code on any DB-write attempt.
    const devBtns = ['dev-save', 'dev-write', 'dev-reset']
      .map(id => document.getElementById(id))
      .filter(Boolean);
    const sync = () => {
      const val = codeEl.value.trim();
      const active = !!val;
      editModeActive = active;
      editModeUnlocked = active;
      const showBtns = val.length === 4;
      devBtns.forEach(b => { b.style.display = showBtns ? '' : 'none'; });
    };
    codeEl.addEventListener('input', sync);
    sync();
  })();

  const { addBadge }      = setupNrBadges(cy);
  const { refitBars, reassertMarks, handleExploreMsg, markBuddyGone, appendBuddyChip, resetBuddyBar, handleClusterRelMsg, handleClusterCloned, createCard, setChatText, prependSystemCard, prependPartnerCard, handleChatReady, setSendBtn, updateSendBtn, sendTopLocalCard, handleBuddyCardAck, topLocalCard, getActiveNodeId, getLastReadNodeId, enterNode, addYouChip, toggleMediaBar, addSessionTrack, saveYouBreadcrumbs, restoreYouBreadcrumbs, refreshCardOpacities } = setupInteractions(cy, wsRef, addBadge, youCy, buddyCy, pairingState);

  // 2026-08-25 — live resize. #cy had NO resize handler: only the two
  // breadcrumb bars and the media player listened, so the graph kept its old
  // dimensions and framing until the next navigation.
  //
  // Order matters. positionCyEl re-places the element, cy.resize() makes
  // cytoscape re-read it, cy.fit re-frames — and the marks are re-parked LAST,
  // because their corners are derived from cy.extent() and the fit is what
  // changes it. Skipping that step is worse than doing nothing: the canvas
  // would look correctly re-framed while the two corner marks sat at
  // coordinates from the old extent, which reads as a fresh bug rather than a
  // stale view. A plain cy.fit emits no layoutstop, so the re-park that
  // normally follows a layout never fires here.
  //
  // Debounced: resize fires continuously during a drag, and re-fitting on
  // every event is wasted work. 120ms is short enough to feel live.
  let cyResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(cyResizeTimer);
    cyResizeTimer = setTimeout(() => {
      try {
        positionCyEl();
        cy.resize();
        cy.fit(cy.elements(':visible').not('.parked-mark, .imported-mark'), fitPadding(cy, 60));
        reassertMarks();
        // The bars have their OWN resize listeners, but those fire immediately
        // while this one is debounced — so positionCyEl re-lays the panes
        // AFTER the bars have already corrected themselves, leaving them stale
        // again. Re-sync them last, once everything else has settled.
        refitBars();
      } catch (err) { console.warn('[BD] resize re-fit failed', err); }
    }, 120);
  });

  // 2026-08-16 — Breadcrumb persistence triggers.
  //   1. Restore right after setupInteractions returns (youCy is live;
  //      main cy graph is loaded; safe to reference mainIds).
  //   2. Save every 5 s as a safety net for hops that somehow bypass
  //      the addYouChip-tail save (shouldn't happen, but cheap insurance).
  //   3. Save on pagehide / beforeunload so a fresh reload always has
  //      the latest state.
  try { restoreYouBreadcrumbs(); } catch (err) { console.warn('[BD] breadcrumb restore threw', err); }
  setInterval(() => { try { saveYouBreadcrumbs(); } catch (_) {} }, 5000);
  window.addEventListener('pagehide',      () => { try { saveYouBreadcrumbs(); } catch (_) {} });
  window.addEventListener('beforeunload',  () => { try { saveYouBreadcrumbs(); } catch (_) {} });

  // Bind Send button — must run AFTER setupInteractions destructure because
  // setSendBtn is an immediate call (not deferred into a closure like newCard's
  // createCard reference). Hoisting only saves function declarations, not
  // const bindings from object destructuring.
  const sendBtn = document.getElementById('chat-send-btn');
  if (sendBtn) {
    setSendBtn(sendBtn);
    sendBtn.addEventListener('click', () => { sendTopLocalCard(); });
  }

  // 2026-07-15 — supplementary listeners: any graph-navigation action
  // (Back button, or tap on the Root breadcrumb chip) should also drop the
  // user out of Player mode so they actually see the graph they've just
  // navigated to. Without this, a user arriving via deep-link into Player
  // mode presses Back / taps Root chip and the graph updates correctly
  // underneath but stays hidden by the module iframe — looks like "nothing
  // happened". These listeners fire in addition to the setupInteractions
  // ones (restoreState / handleNodeTap); ordering doesn't matter as long
  // as setViewMode('nodes') runs somewhere. setViewMode is defined later
  // in init() as a `function` declaration and is hoisted, so this call
  // resolves at click time.
  const backBtnEl = document.getElementById('back-btn');
  if (backBtnEl) {
    backBtnEl.addEventListener('click', () => {
      if (document.body.classList.contains('player-active')) {
        const nodesRadio = document.querySelector('#view-mode-toggle input[value="nodes"]');
        if (nodesRadio) nodesRadio.checked = true;
        setViewMode('nodes');
      }
    });
  }
  youCy.on('tap', 'node', evt => {
    if (evt.target.data('type') !== 'root') return;
    if (!document.body.classList.contains('player-active')) return;
    const nodesRadio = document.querySelector('#view-mode-toggle input[value="nodes"]');
    if (nodesRadio) nodesRadio.checked = true;
    setViewMode('nodes');
  });

  // #cy top is pinned earlier — before cytoscape constructs — so init fits
  // the root correctly. No re-pin needed here; cy.resize on subsequent panel
  // toggles is handled by positionCyEl().

  // A42 §42.6 / §42.7 — Copy Down (card → iframe) and Copy Up (iframe → card).
  // Both are gated on chat being active (see toggleChatMode). Copy Up is also
  // gated on a successful Copy Down having happened first (§42.7).
  //
  // "Focused card" per the answer to Q3: whichever local card's textarea has
  // DOM focus; fallback = topLocalCard() (may be null if the user hasn't
  // pressed New/Edit yet — in which case there's no Local to copy into/out of).
  {
    const copyDownBtn = document.getElementById('copy-down-btn');
    const copyUpBtn   = document.getElementById('copy-up-btn');
    const iframeEl2   = document.getElementById('visual-iframe');

    // Read/write helpers so callers don't have to know whether a card body is
    // a textarea (Local cards) or a contentEditable div (system/received).
    function getCardText(body) {
      return body.tagName === 'TEXTAREA' ? body.value : body.textContent;
    }
    function setCardText(body, text) {
      if (body.tagName === 'TEXTAREA') body.value = text;
      else                              body.textContent = text;
      body.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Return the "current" card body — whichever card the user is engaged with.
    // 2026-08-05 v6 — widened from local-only to any card body (user report:
    // "it needs to work with the script as it is in the panel not to need a
    // new card"). Precedence:
    //   1. Any focused editable body inside .card  (textarea or contentEditable div)
    //   2. topLocalCard() body
    //   3. Topmost card of any kind (system/received cards use contentEditable
    //      divs; setCardText handles the type difference)
    function getFocusedCardBody() {
      const active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.isContentEditable)
                 && active.closest('.card')) {
        return active;
      }
      const top = topLocalCard();
      if (top && top.body) return top.body;
      // 2026-08-14 — panel split: the newest card lives in #current-stack
      // now, older cards in #chat-stack. Check both, current-first.
      const topEl =
        document.querySelector('#current-stack .card') ||
        document.querySelector('#chat-stack .card');
      if (topEl) {
        const body = topEl.querySelector('.card-body');
        if (body) return body;
      }
      return null;
    }

    if (copyDownBtn) {
      copyDownBtn.addEventListener('click', () => {
        if (!iframeEl2) {
          console.warn('[Copy Down] no visual iframe — bail');
          return;
        }
        const body = getFocusedCardBody();
        if (!body) {
          console.warn('[Copy Down] no card body found — panel empty?');
          return;
        }
        const script = getCardText(body) || '';
        console.log('[Copy Down] posting bd_script_update, len=', script.length);
        iframeEl2.contentWindow.postMessage(
          { type: 'bd_script_update', script },
          '*'
        );
        if (copyUpBtn) copyUpBtn.disabled = false;
      });
    }

    if (copyUpBtn) {
      copyUpBtn.addEventListener('click', () => {
        if (!iframeEl2) {
          console.warn('[Copy Up] no visual iframe — bail');
          return;
        }
        const body = getFocusedCardBody();
        if (!body) {
          console.warn('[Copy Up] no card body found — response would have nowhere to land');
          return;
        }
        console.log('[Copy Up] posting bd_script_request');
        iframeEl2.contentWindow.postMessage(
          { type: 'bd_script_request' },
          '*'
        );
      });
    }

    // §42.7 — inbound bd_script_response from the iframe writes into the
    // currently focused card body (2026-08-05 v6 — any kind, not just local).
    // setCardText handles the textarea-vs-contentEditable-div type split.
    window.addEventListener('message', (e) => {
      const d = e && e.data;
      if (!d || d.type !== 'bd_script_response') return;
      const body = getFocusedCardBody();
      if (!body || typeof d.script !== 'string') return;
      setCardText(body, d.script);
    });

    // 2026-08-09 — BD-level bake/save info dialog. Renders in BD's DOM
    // (not the module iframe) so it can overlay the extend panel and use
    // the full viewport height (button row was being clipped inside the
    // iframe on iPhone). Module posts BD_INFO_DIALOG_REQUEST; we show the
    // dialog and post BD_INFO_DIALOG_RESULT back with {action, dontShowAgain}.
    function showBakeInfoDialogInBD(actionLabel, respond) {
      const existing = document.getElementById('bake-info-modal');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.id = 'bake-info-modal';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';
      const card = document.createElement('div');
      card.style.cssText = 'background:#1a1a2e;color:#eee;border:1px solid #555;border-radius:6px;padding:16px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;font-family:sans-serif;font-size:14px;line-height:1.45;box-sizing:border-box;';
      const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      card.innerHTML =
        '<div style="font-weight:bold;font-size:16px;margin-bottom:10px;">About ' + esc(actionLabel) + '</div>' +
        '<div style="margin-bottom:10px;">' +
          '<strong>Bake</strong> renders the current fractal music offline into a WAV file and drops it into the audio player at the bottom of the screen — so you can play it back while browsing other nodes. ' +
          '<strong>Save wav</strong> downloads that same WAV file to your device.' +
        '</div>' +
        '<div style="margin-bottom:10px;color:#c9a227;">' +
          'Longer tunes take longer to bake — several seconds is normal.' +
        '</div>' +
        '<div style="margin-bottom:14px;color:#ff8080;">' +
          '<strong>Known limitation — Safari Private Browsing:</strong> Safari 17+ deliberately injects random noise into all Web Audio API output in Private mode as an anti-fingerprinting measure. The bake will sound like noise. Use a regular (non-private) Safari tab, or Chrome/Firefox (private tabs OK there).' +
        '</div>' +
        '<label style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:13px;cursor:pointer;">' +
          '<input type="checkbox" id="bake-info-noshow" style="width:18px;height:18px;"> Don’t show this again this session' +
        '</label>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button id="bake-info-cancel" type="button" style="padding:10px 18px;background:#4a4a4a;color:#eee;border:none;border-radius:4px;font-size:14px;font-family:sans-serif;cursor:pointer;">Cancel</button>' +
          '<button id="bake-info-ok"     type="button" style="padding:10px 18px;background:#4080ff;color:#fff;border:none;border-radius:4px;font-size:14px;font-family:sans-serif;font-weight:bold;cursor:pointer;">Continue</button>' +
        '</div>';
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      const finish = (action) => {
        const dontShowAgain = !!document.getElementById('bake-info-noshow').checked;
        overlay.remove();
        respond({ action, dontShowAgain });
      };
      document.getElementById('bake-info-ok').onclick     = () => finish('continue');
      document.getElementById('bake-info-cancel').onclick = () => finish('cancel');
    }

    window.addEventListener('message', (e) => {
      const d = e && e.data;
      if (!d || d.type !== 'BD_INFO_DIALOG_REQUEST') return;
      const iframeSrc = e.source;
      showBakeInfoDialogInBD(d.actionLabel || 'Bake', (result) => {
        try {
          if (iframeSrc && iframeSrc.postMessage) {
            iframeSrc.postMessage({ type: 'BD_INFO_DIALOG_RESULT', action: result.action, dontShowAgain: result.dontShowAgain }, '*');
          }
        } catch (_) {}
      });
    });

    // Media-module bake-to-mp3 payload → session-track ingestion.
    // Module produces a WAV in-memory via Tone.Offline, ships the raw bytes as
    // an ArrayBuffer through the iframe relay; here we wrap in a Blob, mint a
    // blob URL, and open the bottom-bar player with it selected.
    window.addEventListener('message', (e) => {
      const d = e && e.data;
      if (!d || d.type !== 'BD_MEDIA_BLOB') return;
      console.log('[BD_MEDIA_BLOB] received', {
        label: d.payload && d.payload.label,
        sizeBytes: d.payload && d.payload.sizeBytes,
        audioDataType: d.payload && d.payload.audioData &&
                       (d.payload.audioData.constructor && d.payload.audioData.constructor.name)
      });
      try {
        addSessionTrack(d.payload || {});
      } catch (err) {
        console.error('[BD_MEDIA_BLOB] addSessionTrack threw', err);
      }
    });

    // Media-module Deep Link request. Module has already pushed its live script
    // to the focused card via BD_UPDATE; simulate a click on the action-bar's
    // Copy Link button so the existing URL-build + clipboard flow runs unchanged.
    window.addEventListener('message', (e) => {
      const d = e && e.data;
      if (!d || d.type !== 'BD_MODULE_COPY_LINK_REQUEST') return;
      // First, mirror BD_UPDATE semantics — the module's payload.text should
      // land in the focused card so Copy Link picks it up. Guard on payload
      // shape since older modules may omit it.
      if (d.payload && typeof d.payload.text === 'string') {
        const body = getFocusedCardBody();
        if (body) setCardText(body, d.payload.text);
      }
      const copyLinkBtn = document.getElementById('copy-link-btn');
      if (copyLinkBtn) copyLinkBtn.click();
    });

    // BD_UPDATE from a media module — mirror its live script into the focused
    // card. Legacy music_1 semantic (Send Back). Modern modules use
    // bd_script_response, but this keeps drop-in compatibility.
    window.addEventListener('message', (e) => {
      const d = e && e.data;
      if (!d || d.type !== 'BD_UPDATE') return;
      const text = d.payload && d.payload.text;
      if (typeof text !== 'string') return;
      const body = getFocusedCardBody();
      if (!body) return;
      setCardText(body, text);
    });

    // ── External Website URL builder (MM3, 2026-07-12) ────────────────────
    // Assembles the standalone-player URL that both #jump-to-ext-btn and
    // #copy-link-to-ext-btn (in #bd-invite-panel-viewer) point at. Payload:
    //   { script, node_url, name, source_text, title }
    // - name added 2026-07-17: module nodes have names like
    //   "bd_V_Kolam_2"; EV's source-context display prefers name over
    //   source_text so the specific node identity survives the round-trip.
    // - script         = current panel/card text (see 4-tier precedence below)
    // - node_url et al = properties of the currently-visible-in-panel node,
    //   preferred by lastReadNodeId over activeNodeId (a user hitting these
    //   buttons wants a link to whatever they last READ, not to whatever
    //   Family/Cluster they'd double-tap-navigated into).
    // Base URL is the GitHub Pages deployment of the standalone EV
    // repo (github.com/wrcstewart/bd_V_Kolam) — moved from localhost
    // on 2026-07-17. Same file is still served locally at
    // http://<hostname>:8080/bd_V_Kolam/preview.html as a fallback,
    // but the shared Copy Link URL points at the public deployment.
    function buildExternalWebsiteUrl() {
      let currentNodeUrl = null, currentSourceText = null, currentTitle = null, currentName = null;
      let activeNode = null;
      const readId   = getLastReadNodeId && getLastReadNodeId();
      const activeId = getActiveNodeId   && getActiveNodeId();
      const nodeId   = readId || activeId;
      if (nodeId) {
        const n = cy.getElementById(nodeId);
        if (n && n.length > 0) {
          activeNode = n;
          currentNodeUrl    = n.data('url')         || null;
          currentName       = n.data('name')        || null;
          currentSourceText = n.data('source_text') || null;
          currentTitle      = n.data('title')       || null;
        }
      }

      // Panel text precedence (updated 2026-07-17):
      //   1. Focused local-card textarea — extract only the latest module
      //      script paragraph, not the whole card
      //   2. topLocalCard body — same extraction
      //   3. activeNode.data('text') — raw source of truth (already a
      //      clean module script for module nodes)
      //   4. #default-card-body textContent — last-ditch welcome-message
      // Reason for the extraction on tiers 1+2: cards accumulate
      // paragraphs from every node-tap. Baking the whole card into a
      // deep-link URL was including "text from previous browsing"
      // (unrelated tapped nodes, curator prose, chat). extractLatest
      // ModuleScript pulls just the last %%bd_module paragraph.
      // Use the SAME card getFocusedCardBody targets — the bd_script_response
      // handler writes there via setCardText, so this is the freshest source.
      // Previously this only checked topLocalCard (a textarea), but responses
      // often land in contentEditable DIVs (system/helper cards) — mismatch
      // caused stale DB text to be shipped in the URL after a successful pull.
      let currentPanelText = '';
      const focusedBody = getFocusedCardBody();
      let cardText = null;
      if (focusedBody) {
        cardText = getCardText(focusedBody);
      }
      const extracted = cardText !== null ? extractLatestModuleScript(cardText) : null;
      if (extracted) {
        currentPanelText = extracted;
      } else if (activeNode) {
        currentPanelText = activeNode.data('text') || '';
      } else {
        const defBody = document.getElementById('default-card-body');
        currentPanelText = defBody ? (defBody.textContent || '') : '';
      }

      const payload = {
        script:      currentPanelText,
        node_url:    currentNodeUrl,           // 'butterflydreaming.org/n/<uuid>' — the
                                               // project's durable UUID-based identity,
                                               // stable across DB reimports (unlike Neo4j
                                               // elementId). See migrate_mm1.js / apply_mm.js.
        name:        currentName,              // e.g. 'bd_V_Kolam_2' — module-node identity
                                               // shown by EV's source-context (2026-07-17).
        source_text: currentSourceText,
        title:       currentTitle
      };
      // Base64 → URL: must percent-encode. Raw base64 contains `+` `/` `=`
      // — all legal in URLs but `+` gets decoded as space by URLSearchParams
      // (application/x-www-form-urlencoded rules), which corrupts the round
      // trip and silently drops the standalone into DEFAULT_SCRIPT.
      // encodeURIComponent turns +→%2B, /→%2F, =→%3D.
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      // v16: module-aware standalone URL. Read the module id from the
      // current script (via %%bd_module directive) and route to the matching
      // standalone. Falls back to bd_V_Kolam if the current text has no
      // module directive — preserves the pre-v16 behaviour for unspecified /
      // legacy cases.
      const moduleId  = parseModuleId(payload.script) || 'bd_V_Kolam';
      const baseUrl   = getStandaloneUrl(moduleId) || getStandaloneUrl('bd_V_Kolam');
      const url = `${baseUrl}?data=${encodeURIComponent(encoded)}`;
      return { url, payload };
    }

    // ── Clipboard helpers ──────────────────────────────────────────────
    const copyLinkText = (text) => {
      console.log('External Website URL:', text);
      return navigator.clipboard && navigator.clipboard.writeText
        ? navigator.clipboard.writeText(text)
        : Promise.reject(new Error('clipboard API unavailable'));
    };

    const showFallback = (url) => {
      document.getElementById('copy-link-fallback')?.remove();
      const box = document.createElement('div');
      box.id = 'copy-link-fallback';
      const hint = document.createElement('div');
      hint.className = 'fb-hint';
      hint.textContent = 'Clipboard blocked on plain HTTP — copy manually:';
      const ta = document.createElement('textarea');
      ta.readOnly = true;
      ta.value = url;
      box.appendChild(hint);
      box.appendChild(ta);
      document.body.appendChild(box);
      ta.focus();
      ta.select();
      const dismiss = (ev) => {
        if (ev.target === ta || box.contains(ev.target)) return;
        box.remove();
        document.removeEventListener('mousedown', dismiss, true);
        document.removeEventListener('touchstart', dismiss, true);
      };
      setTimeout(() => {
        document.addEventListener('mousedown', dismiss, true);
        document.addEventListener('touchstart', dismiss, true);
      }, 0);
    };

    // ── Copy-Link update-script gate (2026-07-15) ─────────────────────
    // Mirrors preview.html's dialog. In Player mode, the visual iframe's
    // module may have drifted since the focused card was last synced
    // (Copy Up in BD = ↑ in EV: postMessage bd_script_request →
    // bd_script_response handler at §42.7 writes into the focused card).
    // The three Player-mode share buttons below (#jump-to-ext-btn,
    // #copy-link-to-ext-btn, #copy-link-btn) bake the focused card into
    // the outgoing URL — stale card means stale share. withUpdatePrompt
    // fires the dialog by default, honours the session-scoped
    // updateModePref if the user has ticked "Don't ask again this
    // session", and only fires when body.player-active — normal-node
    // BD-self Copy Links skip the gate entirely (payload is ignored by
    // the receiver anyway,
    // per Op 1).
    // 2026-07-15 (late) — session-scoped preference (in-memory). Was
    // briefly localStorage-backed but that caused "dialog rarely
    // appears" confusion when a stale preference from an earlier
    // session was silently suppressing it. Per-page-load feels right:
    // tick "Don't ask again this session", quiet for the rest of this
    // load; a browser refresh asks again. No diagnostic mystery.
    let updateModePref = 'ask';   // 'ask' | 'update' | 'skip'
    // Best-effort cleanup of the retired localStorage key so users
    // upgrading from the previous version don't carry an invisible
    // preference forward. Silent, one-shot, harmless if absent.
    try { localStorage.removeItem('bd_ev_copylink_updatemode'); } catch {}
    function requestModuleSyncBD(timeoutMs = 500) {
      return new Promise((resolve) => {
        if (!iframeEl2 || !iframeEl2.contentWindow) { resolve(false); return; }
        let done = false;
        function handler(event) {
          const d = event.data;
          if (!d || d.type !== 'bd_script_response') return;
          if (done) return;
          done = true;
          window.removeEventListener('message', handler);
          resolve(true);
        }
        window.addEventListener('message', handler);
        iframeEl2.contentWindow.postMessage({ type: 'bd_script_request' }, '*');
        setTimeout(() => {
          if (done) return;
          done = true;
          window.removeEventListener('message', handler);
          resolve(false);
        }, timeoutMs);
      });
    }
    function withUpdatePrompt(action) {
      // Skip gate entirely if the user isn't in Player mode — the module
      // isn't in play, drift isn't happening, and (for normal nodes) the
      // receiver's Op 1 code ignores payload.script anyway.
      if (!document.body.classList.contains('player-active')) { action(); return; }
      if (updateModePref === 'update') { requestModuleSyncBD().then(() => action()); return; }
      if (updateModePref === 'skip')   { action(); return; }
      const dialog = document.getElementById('update-script-dialog');
      if (!dialog) { action(); return; }
      const yesBtn = document.getElementById('update-script-yes');
      const noBtn  = document.getElementById('update-script-no');
      const cb     = document.getElementById('update-script-remember');
      cb.checked = false;
      dialog.hidden = false;
      function cleanup() {
        yesBtn.onclick = null;
        noBtn.onclick  = null;
        dialog.hidden = true;
      }
      yesBtn.onclick = () => {
        if (cb.checked) updateModePref = 'update';
        cleanup();
        requestModuleSyncBD().then(() => action());
      };
      noBtn.onclick = () => {
        if (cb.checked) updateModePref = 'skip';
        cleanup();
        action();
      };
    }

    // ── Jump to External Website (MM3) ─────────────────────────────────
    // Opens the standalone EV in a new tab (Q3 answer 2026-07-12: new tab
    // for now, preserves the BD chat/pair session).
    const jumpToBtn = document.getElementById('jump-to-ext-btn');
    if (jumpToBtn) {
      jumpToBtn.addEventListener('click', () => {
        withUpdatePrompt(() => {
          const { url } = buildExternalWebsiteUrl();
          console.log('Jump to External Website URL:', url);
          // Silence our own player before handing over — the standalone has
          // its own, and two tracks over each other is nobody's intention.
          // Guarded: a bare call here threw ReferenceError (the function is in
          // setupInteractions()'s scope, this is init()'s), and the enclosing
          // promise swallowed it, so the jump silently never happened.
          if (typeof window.bdStopMedia === 'function') window.bdStopMedia();
          window.open(url, '_blank');
        });
      });
    }

    // ── Copy Link to External Website (MM3) ────────────────────────────
    // Writes the same URL to the clipboard. Three-rung strategy (async
    // Clipboard API → error path → visible fallback textarea) preserved
    // from the previous #copy-link-btn (removed from #action-bar in the
    // same commit).
    const copyLinkToBtn = document.getElementById('copy-link-to-ext-btn');
    if (copyLinkToBtn) {
      copyLinkToBtn.addEventListener('click', () => {
        withUpdatePrompt(() => {
          const { url } = buildExternalWebsiteUrl();
          copyLinkText(url).then(() => {
            const original = copyLinkToBtn.textContent;
            copyLinkToBtn.textContent = 'Copied!';
            setTimeout(() => { copyLinkToBtn.textContent = original; }, 1500);
          }).catch((err) => {
            console.warn('Copy Link to External Website: clipboard write failed, showing fallback', err);
            showFallback(url);
          });
        });
      });
    }

    // ── BD-self Copy Link (2026-07-15) ─────────────────────────────────
    // Reuses the EV Copy Link payload shape { script, node_url,
    // source_text, title } but points the URL back at BD's own origin
    // ("/") instead of the standalone /bd_V_Kolam/preview.html. On the
    // receiving side, handleReturnFromStandalone decodes ?data=, finds
    // the node by node_url, overwrites its .text with the payload
    // script, force-creates a visible N=1 card populated with the
    // script, and (currently, always) engages Player mode via the
    // enabled Player radio. Auto-Player behaviour may want a smarter
    // gate later (only if parseModuleId(script) is non-null) — deferred.
    function buildBdSelfUrl() {
      // Reuse buildExternalWebsiteUrl's payload builder by extracting
      // just the payload, then re-encoding for the BD-origin URL.
      const { payload } = buildExternalWebsiteUrl();
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      const url = `${window.location.origin}/?data=${encodeURIComponent(encoded)}`;
      return { url, payload };
    }

    const copyLinkBtn = document.getElementById('copy-link-btn');
    if (copyLinkBtn) {
      // Cache the original innerHTML (contains <br>) so the "Copied!"
      // flash can restore it. textContent would collapse the <br> to a
      // space and break the two-line layout after the flash.
      const originalLabel = copyLinkBtn.innerHTML;
      copyLinkBtn.addEventListener('click', () => {
        withUpdatePrompt(() => {
          const { url } = buildBdSelfUrl();
          copyLinkText(url).then(() => {
            copyLinkBtn.textContent = 'Copied!';
            setTimeout(() => { copyLinkBtn.innerHTML = originalLabel; }, 1500);
          }).catch((err) => {
            console.warn('Copy Link (BD-self): clipboard write failed, showing fallback', err);
            showFallback(url);
          });
        });
      });
    }
  }

  const userCountPanel = document.getElementById('user-count-panel');

  // 2026-08-18 — general BD status pane. The "N connected" label area is
  // reused as a horizontally-scrollable status strip: the connection count
  // always shows FIRST (most important), then the latest relayed message
  // (module errors / progress). Modules post {type:'BD_STATUS', text} up
  // through the iframe-chain wrapper — retiring the unreadable in-module
  // corner text. Empty text clears the extra slot (connection stays).
  let bdConnStatus  = '';
  let bdExtraStatus = '';
  const renderBdStatus = () => {
    const parts = [];
    if (bdConnStatus)  parts.push(bdConnStatus);
    if (bdExtraStatus) parts.push(bdExtraStatus);
    userCountPanel.textContent = parts.join('    ·    ');
    userCountPanel.classList.toggle('active', parts.length > 0);
  };
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'BD_STATUS') return;
    bdExtraStatus = (typeof d.text === 'string') ? d.text.trim() : '';
    renderBdStatus();
    userCountPanel.scrollLeft = 0;   // keep the connection message in view
  });

  // Attach the 'msg' dispatch BEFORE firing the initial requests. Under
  // ws-based transport this ordering was tolerable because the browser
  // buffered incoming messages during script parsing; under Socket.IO,
  // events sent before a listener is attached are dropped by the client
  // socket. Server also broadcasts user_count on new connection, which
  // used to be lost the same way.
  ws.on('msg', msg => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'user_count') {
      bdConnStatus = `${msg.count} connected`;
      renderBdStatus();
      console.log('[pair-debug] user_count =', msg.count);
      return;
    }
    if (msg.type === 'media_files') {
      mediaFilesList = msg.files;
      // Media bar is now persistently open (not gated on Settling
      // navigation). User picks a track or dismisses via ✕ if they want
      // it out of the way; refreshing the page brings it back.
      if (mediaFilesList.length > 0) {
        const defaultTrack =
          mediaFilesList.find(f => /^D_/i.test(f.name))?.name ||
          mediaFilesList[0]?.name || '';
        if (defaultTrack) toggleMediaBar('media', defaultTrack);
      }
      return;
    }
    if (msg.type === 'wait_state') {
      console.log('[pair-debug] ← wait_state received');
      pairStatus.textContent = 'Waiting...';
      pairingState.waiting = true;
      updateJoinButtonLabel();
    } else if (msg.type === 'paired') {
      console.log('[pair-debug] ← paired received, buddyId=', msg.buddyId);
      resetBuddyBar();
      pairStatus.textContent = 'Paired';
      pairingState.active = true;
      pairingState.waiting = false;
      updateJoinButtonLabel();
      updateSendBtn();
    } else if (msg.type === 'gn_mark' || msg.type === 'explore_denied') {
      // A relayed message type needs THREE sites: the sender, the server relay
      // whitelist, and THIS receive whitelist. Missing this one dropped gn_mark
      // silently on arrival — the wire was fine, the relay logged delivery and
      // the handler was correct, so the only symptom was the mark appearing on
      // one side. Two of three fails without a word.
      try { handleExploreMsg(msg); } catch (err) { console.warn('[explore] handler failed', err); }
    } else if (msg.type === 'buddy_disconnected') {
      console.log('[pair-debug] ← buddy_disconnected received');
      // Partner left (either their WS closed or they pressed Leave). Under
      // the opt-in pairing model (2026-07-15) we do NOT auto re-queue —
      // user returns to solo state and must press Join again to look for
      // a new partner.
      pairingState.active = false;
      pairingState.waiting = false;
      // 2026-08-28 — nothing to stand down. There is no session to end: the GN
      // stack is a RECORD of convergences that happened, and those still
      // happened whether or not the partner is still connected. It survives the
      // pair ending, which is the point of a record.
      buddyCy.nodes().addClass('buddy-gone');
      // 2026-08-20 — the enlarged copy dims with the trail it mirrors rather
      // than vanishing; where they got to still matters after they leave.
      // §2 — the Blue Node dims with the trail rather than vanishing: where
      // they got to is still worth seeing, and still tappable.
      // bnGone and renderMarks belong to setupInteractions, NOT to init().
      // Assigning to them here threw a ReferenceError under module strict
      // mode, so everything below this line silently never ran — the Join
      // button stayed on "Leave" and the pair only half-dissolved on the
      // side that did not initiate it.
      try { markBuddyGone(); } catch (err) { console.warn('[BN] markBuddyGone failed', err); }
      pairStatus.textContent = '';
      updateJoinButtonLabel();
      updateSendBtn();
    } else if (msg.type === 'pair_denied') {
      // Server rejected pairing. Two known reasons today:
      //   code_required — arriver needs curation code entered in #dev-code.
      //                   User adjusts the code and presses Join again.
      //   same_device   — MM3 revised: another BD tab on this browser is
      //                   already in the wait queue. Server refuses to
      //                   pair two ws with the same bd_device_id cookie
      //                   (prevents same-device self-pair). User closes
      //                   the other tab / uses it instead, then presses
      //                   Join to retry.
      // Under the always-on chat model (2026-07-15) neither reason closes
      // chat — the panel stays active for solo composition / bot dialogue
      // / system status; only the pair state resets.
      if (msg.reason === 'code_required') forgetCurationCode();
      const reasonMessage =
          msg.reason === 'code_required' ? 'Code required to chat'
        : msg.reason === 'same_device'   ? 'Another BD tab on this device is already waiting to chat — close that tab or use it instead'
        :                                  `Pair denied: ${msg.reason || 'unknown'}`;
      pairStatus.textContent = reasonMessage;
      pairingState.active = false;
      pairingState.waiting = false;
      updateJoinButtonLabel();
      updateSendBtn();
    } else if (msg.type === 'buddy_breadcrumb') {
      appendBuddyChip(msg.data);
    } else if (msg.type === 'buddy_card') {
      // communications.md §1 — one inbound path, one rendering rule.
      if (typeof msg.text !== 'string') return;
      if (msg.channel === 'system') {
        prependSystemCard(msg.text);
      } else if (msg.channel === 'partner') {
        prependPartnerCard(msg.text);
      }
    } else if (msg.type === 'buddy_card_ack') {
      handleBuddyCardAck(msg);
    } else if (msg.type === 'chat_ready') {
      handleChatReady();
    } else if (msg.type === 'cluster_rel_saved' || msg.type === 'cluster_rel_deleted') {
      handleClusterRelMsg(msg);
    } else if (msg.type === 'cluster_cloned') {
      handleClusterCloned(msg);
    }
  });

  // Initial requests fire AFTER the 'msg' handler is attached above, so
  // the responses can be received. Under Socket.IO (unlike the ws layer)
  // events sent before a listener is attached are dropped by the client.
  ws.emit('msg', { type: 'get_user_count' });
  ws.emit('msg', { type: 'get_media_files' });

  // 2026-07-15 — Chat panel is always on from boot; user no longer has to
  // press Chat to enter chat mode. Human pairing is a separate opt-in via
  // the Join / Leave button (togglePair). This means:
  //   - chatPanel + chatBtn get the .active class immediately
  //   - enter_chat fires now (was previously on Chat press) → server
  //     sends how-to + status system cards + chat_ready; chat_ready
  //     handler creates the visible N=1 local card above them
  //   - Nodes / Player radios are enabled from the start (previously
  //     gated on chat-active); EV invite panel activates the moment
  //     the user picks Player, no pair needed
  //   - Copy Down is enabled from the start (Copy Up still waits for a
  //     Copy Down press — that gate is independent)
  //   - Pair-toggle button starts labelled "Pair"; togglePair + the
  //     pair-state message handlers below keep the label in sync
  //     (Pair ↔ Unpair, per updateJoinButtonLabel)
  chatPanel.classList.add('active');
  chatBtn.classList.add('active');
  chatBtn.textContent = 'Pair';
  // Enable the Nodes radio unconditionally; Player is gated by
  // updateSendBtn on top-card content (2026-07-17) — starts hidden
  // + disabled in the HTML, becomes visible only when a %%bd_module
  // directive appears in the top card.
  const nodesRadioBoot = document.querySelector('#view-mode-toggle input[value="nodes"]');
  if (nodesRadioBoot) nodesRadioBoot.disabled = false;
  // Listen for the bd:force-nodes-mode event that updateSendBtn
  // dispatches when the top card loses its module while Player is
  // active — setViewMode is in this scope, updateSendBtn isn't.
  document.addEventListener('bd:force-nodes-mode', () => setViewMode('nodes'));
  const copyDownBtnBoot = document.getElementById('copy-down-btn');
  if (copyDownBtnBoot) copyDownBtnBoot.disabled = false;
  ws.emit('msg', { type: 'enter_chat' });
  requestAnimationFrame(() => {
    positionCyEl();
    // 2026-08-14 v3 — authoritative post-boot re-fit for the initial-root
    // view. Necessary because:
    //   1) The synchronous cy.fit(root) up in setupCy ran BEFORE chat-panel
    //      became .active. At that point default-panel (34dvh) was the last
    //      visible panel; chat-panel (25dvh) took over during boot but
    //      cytoscape's internal container rect stayed cached at the taller
    //      pre-boot size, so root ended up placed in the lower portion of
    //      the settled cy area.
    //   2) positionCyEl above just stamped the correct cy.style.top for the
    //      settled layout — cy.resize() forces cytoscape to re-read.
    // Only re-fit if root is still the only visible node (very-first-view
    // state). If the user tapped something in the rAF window we don't want
    // to snap them back to root.
    const rootNode = cy.nodes('[type="root"]').first();
    const visibleCount = cy.nodes(':visible').length;
    if (rootNode && rootNode.length && rootNode.visible() && visibleCount === 1) {
      cy.resize();
      cy.fit(rootNode, fitPadding(cy, 120));
      if (cy.zoom() > 1.5) {
        cy.zoom({ level: cy.zoom() * ROOT_INITIAL_ZOOM_FACTOR, position: rootNode.position() });
        cy.center(rootNode);
      }
    }
  });

  // MM1 (2026-07-05) — Return-from-standalone flow. When the URL carries a
  // ?data=<base64 JSON> payload (produced by the standalone player's
  // "Enter ButterflyDreaming" / "Copy BD Link" buttons), decode it, find
  // the originating node by url match, engage Chat + Player modes, and
  // populate the top local card with the (possibly edited) script from the
  // payload. Locally overwriting node.data('text') means Player mode's
  // auto-load in setViewMode('player') will push the edited script (not
  // the DB copy) into the iframe.
  (function handleReturnFromStandalone() {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');
    if (!dataParam) return;

    // Strip ?data= from the URL bar unconditionally, even on failure paths,
    // so a browser refresh doesn't re-fire this flow.
    const cleanUrl = () => {
      try { history.replaceState({}, '', window.location.pathname); } catch (_) {}
    };

    let payload;
    try {
      payload = JSON.parse(decodeURIComponent(escape(atob(dataParam))));
    } catch (err) {
      console.warn('[MM1] return-from-standalone: failed to decode ?data payload:', err);
      cleanUrl();
      return;
    }
    if (!payload || typeof payload !== 'object') { cleanUrl(); return; }

    const nodeUrl = typeof payload.node_url === 'string' ? payload.node_url : null;
    const script  = typeof payload.script   === 'string' ? payload.script   : null;

    // Locate the target node — two fallbacks.
    //
    // Primary: match on node.data('url') === payload.node_url. `url` is
    // 'butterflydreaming.org/n/<uuid>' set at node creation (see
    // migrate_mm1.js / apply_mm.js) — the project's durable UUID-based
    // identity, stable across DB reimports. Node.js elementId is
    // DELIBERATELY NOT used as the identity — it's DB-instance-scoped
    // and regenerates on reimport.
    //
    // Fallback (MM2, 2026-07-11): structural default via hasModuleScript
    // + min(seq). Meaningful when there's no node_url AND the payload
    // script carries a %%bd_module directive — standalone was launched
    // from a direct URL, not from BD.
    //
    // KNOWN COVERAGE GAP: the `url` property is only present on nodes
    // created by the MM1+ migration scripts. Legacy corpus TextNodes
    // predate the UUID convention and have no url — BD-self deep links
    // to those nodes currently fail through to the module fallback and
    // often no-op. Backfilling url on the legacy corpus is a data-side
    // task (migration script), not a viewer.js change.
    let target = null;
    if (nodeUrl) {
      target = cy.nodes().filter(n => n.data('url') === nodeUrl).first();
      if (!target || !target.length) {
        console.warn('[MM1] return-from-standalone: no node matches url', nodeUrl);
        target = null;
      }
    }
    if (!target) {
      // MM2 (2026-07-11) — structural default lookup. Previously
      // `moduleId + '_1'` name-match; that broke the moment the DB naming
      // scheme changed (e.g. `_1` → `_001`). Structural rule: find any
      // TextNode carrying this module's script, pick the one with lowest
      // seq. Preferred key: `hasModuleScript` property (post-MM2 migration);
      // fallback: parse the module id from the node's text (pre-MM2 corpus).
      // Filters out gateway nodes so we land on a real content node.
      const moduleId = script ? parseModuleId(script) : null;
      if (moduleId) {
        const candidates = cy.nodes().filter(n => {
          if (n.data('type') !== 'TextNode' || n.data('gateway')) return false;
          if (n.data('hasModuleScript') === moduleId) return true;
          // Backward-compat pre-MM2: derive from text.
          return parseModuleId(n.data('text')) === moduleId;
        });
        if (candidates.length) {
          let winner = null;
          let winnerSeq = Infinity;
          candidates.forEach(n => {
            const s = n.data('seq');
            if (typeof s === 'number' && s < winnerSeq) {
              winner = n;
              winnerSeq = s;
            }
          });
          target = winner || candidates.first();
          if (target && target.length) {
            console.log(`[MM1] return-from-standalone: no node_url; using default via hasModuleScript+min(seq): ${target.data('name') || target.id()}`);
          }
        } else {
          console.warn(`[MM1] return-from-standalone: no TextNode found with hasModuleScript='${moduleId}' or %%bd_module ${moduleId}`);
          target = null;
        }
      } else {
        console.warn('[MM1] return-from-standalone: payload has no node_url and no parseable %%bd_module — nothing to navigate to');
      }
    }
    if (!target || !target.length) {
      cleanUrl();
      return;
    }

    // Is the target a module node? Determines whether we trust the
    // payload script at all.
    //
    // 2026-07-15 threat model: users typing free text into a producer
    // (BD chat card, EV script textarea before Op 2) → Copy Link →
    // receiver's cards populated with unchecked prose. Not a technical
    // security issue (no eval / no DOM injection), but a content-
    // moderation one: the corpus is curated, chat cards / scripts
    // should not leak arbitrary text through the link surface.
    //
    // Mitigation is asymmetric by target type:
    //   - MODULE targets  → payload.script is trusted. The producer's
    //     UI (EV, once Op 2 lands) constrains it to slider-derived
    //     changes to a %%bd_ directive template — structured, bounded,
    //     safe by construction. Shadow node.text, populate cards,
    //     auto-Player. This is the intended slider-tweak share flow.
    //   - NORMAL targets  → payload.script is IGNORED. BD's chat cards
    //     accept free-text typing (that's their whole point), so no
    //     equivalent producer-side constraint exists. Receiver falls
    //     back to the node's own DB text — same as if they'd tapped
    //     the node normally.
    //
    // Detection: `hasModuleScript` property (post-MM2 nodes) OR the
    // target's own text carries a `%%bd_module` directive (pre-MM2
    // backward compat).
    const isModuleTarget = !!(target.data('hasModuleScript') || parseModuleId(target.data('text')));

    // 1. Snapshot the target's current DB text BEFORE we (maybe) overwrite
    //    it, so we can also place that original on a chat card (see 5a).
    //    Also used as the card content for the normal-node case (5b non-
    //    module branch). The DB isn't touched by any of this —
    //    target.data('text', …) mutates only Cytoscape's local copy.
    const originalDbScript = target.data('text');

    // 2. (module-only) Shadow the local node's text so Player mode's
    //    auto-load sends the slider-tweaked script instead of the DB
    //    copy. Not persisted — a refresh without ?data= restores the
    //    DB text.
    if (isModuleTarget && script !== null) target.data('text', script);

    // 3. Navigate to the node (sets lastReadNodeId + activeNodeId + expands).
    enterNode(target);

    // 3a. Seed the breadcrumb bar (2026-07-15) with Root → target so a deep-
    //     link arrival doesn't leave the trail empty. The arriving user gets
    //     visible provenance (they're at `target` because they came in via
    //     the site's root) and a chip they can tap to jump back to Root.
    //     The Root→target edge gets the .deep-link-hop class → renders as a
    //     modest upward arc rather than a straight line, signalling "we
    //     jumped here, we didn't walk step by step". Subsequent chips added
    //     by normal tapping chain onto `target` with straight edges as usual.
    //     Skipped if Root isn't in cy for any reason (defensive).
    try {
      const rootNode = cy.nodes().filter(n => n.data('type') === 'root').first();
      if (rootNode && rootNode.length) {
        addYouChip(rootNode);
        addYouChip(target);
        const lastEdge = youCy.edges().last();
        if (lastEdge && lastEdge.length) lastEdge.addClass('deep-link-hop');
      }
    } catch (e) {
      console.warn('[MM1] return-from-standalone: breadcrumb seed failed', e);
    }

    // 4. (was: engage Chat mode) — 2026-07-15 removed. Chat is on from
    //    boot; no auto-Join. The user opts into pairing manually via the
    //    Join button after arriving.

    // 5. Force the visible N=1 local card into existence NOW — normally
    //    handleChatReady is deferred until the server's chat_ready message,
    //    but that's async and setChatText below would otherwise have no
    //    visible card to land in. Calling it here is idempotent — when
    //    the server's chat_ready later arrives, the same handler no-ops
    //    because top is already visible.
    if (typeof handleChatReady === 'function') handleChatReady();

    // 5a. (module-only) Preserve the original DB script on N=1 and
    //     create a fresh N=2 above it for the incoming payload script.
    //     Result (newest-on-top):
    //         N=2  ←  incoming (slider-tweaked) payload script
    //         N=1  ←  original DB script  (session-only access)
    //     Skipped when the two are identical (unedited return) to
    //     avoid a redundant duplicate card.
    //     Not run for normal-node arrivals — see 5b below.
    if (isModuleTarget) {
      const hasOriginal = typeof originalDbScript === 'string' && originalDbScript.length > 0;
      const originalDiffers = hasOriginal && originalDbScript !== script;
      if (originalDiffers && typeof setChatText === 'function') {
        setChatText(originalDbScript);
        if (typeof createCard === 'function') createCard({ kind: 'local' });
      }
    }

    // 5b. Populate the (now-topmost) local card.
    //   - MODULE target  → sender's payload script (slider-tweaked).
    //   - NORMAL target  → the node's OWN DB text. Mirrors the effect
    //     of a manual tap (routeNodeText → setChatText), so the
    //     arriving user sees the node's curated content in their chat
    //     panel without needing to tap. Sender's payload.script is
    //     deliberately NOT used here — see isModuleTarget block above.
    if (typeof setChatText === 'function') {
      if (isModuleTarget) {
        if (script !== null) setChatText(script);
      } else if (typeof originalDbScript === 'string' && originalDbScript.length > 0) {
        setChatText(originalDbScript);
      }
    }

    // 6. (module-only, 2026-07-15) Engage Player mode via the radio +
    //    setViewMode. setViewMode('player') calls loadModuleForNode
    //    (lastReadNodeId), which reads node.data('text') — now the payload
    //    script (shadowed in step 2) — and posts it to the iframe (fast
    //    path if same module, src swap + BD_READY otherwise).
    //    Non-module deep links stay in Nodes mode — no Player flash.
    if (isModuleTarget) {
      const playerRadio = document.querySelector('#view-mode-toggle input[value="player"]');
      const nodesRadio  = document.querySelector('#view-mode-toggle input[value="nodes"]');
      if (playerRadio && !playerRadio.disabled) {
        playerRadio.checked = true;
        if (nodesRadio) nodesRadio.checked = false;
        setViewMode('player');
      }
    }

    cleanUrl();
  })();
}

window.addEventListener('DOMContentLoaded', init);

// iOS Safari bfcache: when the user presses the browser back button, Safari may
// restore a frozen JS snapshot (an earlier graph state) rather than navigating away.
// Force a reload in that case so the browser back button behaves normally.
window.addEventListener('pageshow', event => {
  if (event.persisted) window.location.reload();
});
