// viewer.js — ButterflyDreaming Graph Viewer

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
let mediaFilesList = [];  // populated via WebSocket on connect
const helpText = isTouchDevice
  ? 'Tap to read — double tap to navigate.'
  : 'Click to read — double click to navigate.';

const FAMILY_COLOURS = {
  Nature:   '#4A8C4F',
  Emotion:  '#C0504D',
  Reason:   '#4A7BC0',
  Spirit:   '#9B6B9B',
  Symbolic: '#C09A3A',
  Arts:     '#C47A5A',
};

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
let chatStackEl            = null;
let cards                  = [];      // ordered bottom-up; cards[length-1] is the top
let nextCardSerial         = 1;     // unique id counter across all kinds
let nextLocalSerial        = 1;     // N=k label counter — only locals consume it
let defaultStackEl         = null;    // #default-stack — central system-message hub
let currentCopyText        = null;    // most recently copied text — survives until next copy
let currentCopyRange       = null;    // { cardId, from, to } of the source range

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
  const dim = Math.min(cy.width(), cy.height());
  return Math.max(20, Math.min(maxPad, dim * 0.08));
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
const MODULE_REGISTRY = {
  'bd_V_Kolam': '/bd_V_Kolam/index.html',
  // future modules added here
};

function getModuleUrl(moduleId) {
  return MODULE_REGISTRY[moduleId] || null;
}

// Extract the module identifier from a node's text: first line matching
// `%%bd_module <id>` wins. Returns null when no such line is present
// (i.e., not a media node) or on non-string input.
function parseModuleId(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(/^%%bd_module\s+(\S+)/m);
  return match ? match[1] : null;
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
  const id = getElementId(n);

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
    source: getElementId(n),
    target: getElementId(m),
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

// --- Cytoscape stylesheet ---

function buildStyle() {
  return [
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
      selector: 'node[type="Entry"][name="Conversations"]',
      style: {
        'width': 68,
        'height': 68,
        'text-max-width': '62px',
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
        'width': 80,
        'height': 33,
        'background-color': function(node) {
          const name = node.data('name');
          return FAMILY_COLOURS[name] || node.data('colour') || '#aaaaaa';
        },
        'background-opacity': 1,
        'font-size': '10px',
        'text-max-width': '72px',
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
        'width': 53,
        'height': 22,
        'font-size': '8px',
        'text-max-width': '48px',
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
      selector: 'edge[type="CHILD"]',
      style: {
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.2,
        'opacity': 0.7,
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
      selector: 'edge[type="CLUSTER_REL"]',
      style: {
        'width': function(edge) { return getClusterRelWidth(edge); },
        'line-color': 'data(colour)',
        'opacity': 0.7,
        'target-arrow-shape': 'none',
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
      selector: 'node.breadcrumb-chip',
      style: {
        'width': 60,
        'height': 18,
        'font-size': '9px',
        'text-max-width': '54px',
        'text-margin-y': 0,
        'border-width': 0,
      }
    },
    {
      selector: 'node.breadcrumb-chip.latest',
      style: { 'border-width': 1.5 }
    },
  ];
}

// --- Layout ---

function runLayout(cy, parentNode = null) {
  const visible = cy.elements(':visible');
  if (visible.nodes().length <= 1) {
    cy.fit(visible, fitPadding(cy, 120));
    return;
  }

  // Scan DESCENDS_FROM edges for hint_x/hint_y when a parent context is known.
  // Edge direction is inconsistent in the DB (some stored child→parent, some parent→child),
  // so match on EITHER endpoint being the parent.  The "neighbour" end of each edge is
  // whichever endpoint is NOT the parent.
  let hintMode    = 'force';
  let childEdges  = null;
  let hintedEdges = null;
  if (parentNode) {
    const pid = parentNode.id();
    childEdges  = visible.edges().filter(
      e => e.source().id() === pid || e.target().id() === pid
    );
    hintedEdges = childEdges.filter(e => e.data('hint_x') != null && e.data('hint_y') != null);
    const total = childEdges.length;
    hintMode = total === 0 || hintedEdges.length === 0 ? 'force'
             : hintedEdges.length === total             ? 'preset'
             :                                            'hybrid';
    const storedScaleLog = hintedEdges.length ? hintedEdges[0].data('hint_scale') : null;
    const formulaScaleLog = 100 * Math.sqrt((total || 1) + 1);
    console.log(`[BD] hint scan: parent=${parentNode.data('name')} total=${total} hinted=${hintedEdges.length} mode=${hintMode} hint_scale=${storedScaleLog?.toFixed(1)} formula_scale=${formulaScaleLog.toFixed(1)}`);
  }

  // Pre-position and pin section_title nodes at the top of the graph area.
  // They connect to TextNodes via PART_OF (not to parentNode), so they never
  // appear in childEdges.  Pinning before layout avoids a post-layout jump.
  // Only active when parentNode is known (gateway and family views); not for
  // the root splash or restoreState paths.
  const titleNodes = visible.nodes().filter(n => !!n.data('section_title'));
  const titlePins  = [];
  if (titleNodes.length > 0 && parentNode) {
    const tArea  = cy.container().getBoundingClientRect();
    const tZoom  = cy.zoom() || 1;
    const gcx    = (tArea.width  / 2 - cy.pan().x) / tZoom;
    const gcy    = (tArea.height / 2 - cy.pan().y) / tZoom;
    const spread = 100 * Math.sqrt(visible.nodes().length);
    const sep    = Math.min(200, spread * 1.4 / Math.max(1, titleNodes.length));
    titleNodes.forEach((n, i) => {
      const pos = {
        x: gcx + (i - (titleNodes.length - 1) / 2) * sep,
        y: gcy - spread,
      };
      n.position(pos);
      titlePins.push({ nodeId: n.id(), position: { ...pos } });
    });
  }

  // Seq-grid: detect gateway view with un-curated TextNodes that carry seq numbers.
  // section_title nodes are excluded — they go to the top via titlePins.
  const gridNodes = (hintMode === 'force' && parentNode && parentNode.data('type') === 'Cluster')
    ? visible.nodes().filter(n => n.data('type') === 'TextNode' && !n.data('section_title') && n.data('seq') != null)
    : cy.collection();

  const hasRoot = visible.nodes().filter(n => n.data('type') === 'root').length > 0;

  if (hasRoot) {
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
    cy.fit(visible, fitPadding(cy, 80));

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
    const storedScale = hintedEdges.length ? hintedEdges[0].data('hint_scale') : null;
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
        x: graphCx + e.data('hint_x') * renderScale,
        y: graphCy + e.data('hint_y') * renderScale,
      };
      child.position(pos);
      pins.push({ nodeId: child.id(), position: { ...pos } });
      sumX += pos.x;
      sumY += pos.y;
    });
    if (hintMode === 'hybrid') {
      const centroid = { x: sumX / hintedEdges.length, y: sumY / hintedEdges.length };
      childEdges.filter(e => e.data('hint_x') == null || e.data('hint_y') == null).forEach(e => {
        const c = e.source().id() === pid ? e.target() : e.source();
        c.position({ ...centroid });
      });
    }
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
    const cols    = Math.ceil(Math.sqrt(n));
    const spacing = 120;
    const gridW   = (cols - 1) * spacing;
    const rows    = Math.ceil(n / cols);

    // Work from a fixed origin — cy.fit() normalises to the viewport afterwards.
    const ox = 0, oy = 0;
    const clusterY  = oy - 100;
    const gridTopY  = oy + 80;
    const titleY    = clusterY - 150;

    const positions = {};
    positions[parentNode.id()] = { x: ox, y: clusterY };

    sorted.forEach((node, rank) => {
      positions[node.id()] = {
        x: ox - gridW / 2 + (rank % cols) * spacing,
        y: gridTopY + Math.floor(rank / cols) * spacing,
      };
    });

    const tCount = titleNodes.length;
    const tSep   = Math.min(200, Math.max(120, gridW / Math.max(1, tCount - 1)));
    titleNodes.forEach((node, i) => {
      positions[node.id()] = {
        x: ox + (i - (tCount - 1) / 2) * tSep,
        y: titleY,
      };
    });

    visible.layout({ name: 'preset', positions, fit: false }).run();
    cy.fit(visible, fitPadding(cy, 80));

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
    visible.layout({
      name: 'fcose',
      animate: true,
      animationDuration: 450,
      randomize: true,
      fit: true,
      padding: 60,
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
  let touchPendingNodeId = null;
  let tapResetTimer = null;
  let tooltipNodeId = null;
  let recentTouch = false;
  let recentTouchTimer = null;
  let desktopPendingNodeId = null;
  let desktopClickTimer = null;
  let lastClusterNode = null;
  let currentClusterColour = null;
  let lastParentNode = null;
  let lastReadNodeId = null;
  let lastReadNodeCy = null;

  function markReadNode(cytoNode, instanceCy) {
    if (lastReadNodeId && lastReadNodeCy) {
      try { lastReadNodeCy.getElementById(lastReadNodeId).removeStyle('border-width border-color border-opacity'); } catch (_) {}
    }
    cytoNode.style({ 'border-width': 2, 'border-color': '#cccccc', 'border-opacity': 1 });
    lastReadNodeId = cytoNode.id();
    lastReadNodeCy = instanceCy;
  }

  function clearReadMark() {
    if (lastReadNodeId && lastReadNodeCy) {
      try { lastReadNodeCy.getElementById(lastReadNodeId).removeStyle('border-width border-color border-opacity'); } catch (_) {}
      lastReadNodeId = null;
      lastReadNodeCy = null;
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

  function addYouChip(node) {
    const type        = node.data('type');
    const sourceText  = type === 'TextNode' ? (node.data('source_text') || null) : null;
    const seq         = node.data('seq') ?? null;
    const abbreviated = type === 'TextNode' && !node.data('gateway') && !node.data('section_title') && sourceText !== null && sourceText === lastYouSourceText;
    const isSubfamily = node.hasClass('subfamily');
    const displayName = abbreviated ? String(seq ?? '?') : (node.data('display_name') || node.data('name') || '');

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
    if (pairingState.active) {
      const sendWs = wsRef.current;
      if (sendWs && sendWs.connected) {
        sendWs.emit('msg', {
          type: 'breadcrumb',
          data: {
            type,
            display_name:  node.data('display_name') || node.data('name') || '',
            colour:        node.data('colour') || '#444444',
            name:          node.data('name') || '',
            mainId:        node.id(),
            source_text:   node.data('source_text') || null,
            seq:           node.data('seq') ?? null,
            gateway:        node.data('gateway') || false,
            section_title:  node.data('section_title') || false,
            subfamily:      isSubfamily,
            clusterNodeId:  lastClusterNode ? lastClusterNode.id() : null,
          }
        });
      }
    }
    youChipX    += w + 7;
    lastYouChipId = id;
    panYouCyToLatest();
  }

  function panYouCyToLatest() {
    if (youChipCount === 0) return;
    const containerWidth = document.getElementById('cy-you').offsetWidth;
    const rightEdge = youChipX - 7;
    const panX = Math.min(0, containerWidth - rightEdge - 12);
    youCy.pan({ x: panX, y: 0 });
  }

  window.addEventListener('resize', panYouCyToLatest);

  // --- buddyCy chip trail ---

  let buddyChipCount = 0;
  let buddyChipX = 0;
  let lastBuddyChipId = null;
  let lastBuddySourceText = null;

  function appendBuddyChip(data) {
    const type        = data.type;
    const sourceText  = type === 'TextNode' ? (data.source_text || null) : null;
    const seq         = data.seq ?? null;
    const abbreviated = type === 'TextNode' && !data.gateway && !data.section_title && sourceText !== null && sourceText === lastBuddySourceText;
    const isSubfamily = data.subfamily || false;
    const displayName = abbreviated ? String(seq ?? '?') : (data.display_name || data.name || '');

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

  function panBuddyCyToLatest() {
    if (buddyChipCount === 0) return;
    const containerWidth = document.getElementById('cy-buddy').offsetWidth;
    const rightEdge = buddyChipX - 7;
    const panX = Math.min(0, containerWidth - rightEdge - 12);
    buddyCy.pan({ x: panX, y: 0 });
  }

  function resetBuddyBar() {
    buddyCy.elements().remove();
    buddyChipCount      = 0;
    buddyChipX          = 0;
    lastBuddyChipId     = null;
    lastBuddySourceText = null;
    buddyCy.pan({ x: 0, y: 0 });
  }

  window.addEventListener('resize', panBuddyCyToLatest);

  // --- buddyCy chip interactions ---

  const buddyContainer = document.getElementById('cy-buddy');
  let buddyTouchPending = null;
  let buddyTouchTimer   = null;

  function buildBuddyChipTooltip(chip) {
    const main = cy.getElementById(chip.data('mainId'));
    if (main.length) return buildTooltipContent(main);
    return chip.data('display_name') || chip.data('name') || '';
  }

  let buddyDesktopPending = null;
  let buddyDesktopTimer   = null;

  buddyCy.on('tap', 'node', evt => {
    const chip = evt.target;
    const main = cy.getElementById(chip.data('mainId'));

    if (isTouchEvent(evt)) {
      markRecentTouch();
      const same     = buddyTouchPending === chip.id();
      const inWindow = buddyTouchTimer !== null;
      clearTimeout(buddyTouchTimer);
      buddyTouchTimer = null;
      if (same && inWindow) {
        // Double tap — navigate; deferred routeNodeText cancelled.
        buddyTouchPending = null;
        hideTooltip();
        clearReadMark();
        if (main.length) handleNodeTap(main);
      } else {
        // Defer routeNodeText so a follow-up double-tap can pre-empt it.
        markReadNode(chip, buddyCy);
        const content = buildBuddyChipTooltip(chip);
        const meta    = main.length ? navNodeMeta(main) : null;
        buddyTouchPending = chip.id();
        buddyTouchTimer = setTimeout(() => {
          routeNodeText(content, meta);
          buddyTouchPending = null;
          buddyTouchTimer = null;
        }, 560);
      }
      return;
    }

    // Desktop: deferred routeNodeText — single click shows after the window;
    // double click cancels the deferred and navigates instead.
    if (buddyDesktopPending === chip.id() && buddyDesktopTimer !== null) {
      clearTimeout(buddyDesktopTimer);
      buddyDesktopTimer = null;
      buddyDesktopPending = null;
      hideTooltip();
      clearReadMark();
      if (main.length) handleNodeTap(main);
    } else {
      clearTimeout(buddyDesktopTimer);
      markReadNode(chip, buddyCy);
      const content = buildBuddyChipTooltip(chip);
      const meta    = main.length ? navNodeMeta(main) : null;
      buddyDesktopPending = chip.id();
      buddyDesktopTimer = setTimeout(() => {
        routeNodeText(content, meta);
        buddyDesktopTimer = null;
        buddyDesktopPending = null;
      }, 320);
    }
  });

  // --- youCy chip interactions ---

  const youContainer = document.getElementById('cy-you');
  let youTouchPending = null;
  let youTouchTimer   = null;

  let youDesktopPending = null;
  let youDesktopTimer   = null;

  youCy.on('tap', 'node', evt => {
    const chip = evt.target;
    const main = cy.getElementById(chip.data('mainId'));
    if (!main.length) return;

    if (isTouchEvent(evt)) {
      markRecentTouch();
      const same     = youTouchPending === chip.id();
      const inWindow = youTouchTimer !== null;
      clearTimeout(youTouchTimer);
      youTouchTimer = null;
      if (same && inWindow) {
        // Double tap — navigate; deferred routeNodeText cancelled.
        youTouchPending = null;
        hideTooltip();
        clearReadMark();
        handleNodeTap(main);
      } else {
        // Defer routeNodeText so a follow-up double-tap can pre-empt it.
        markReadNode(chip, youCy);
        const content = buildTooltipContent(main);
        const meta    = navNodeMeta(main);
        youTouchPending = chip.id();
        youTouchTimer = setTimeout(() => {
          routeNodeText(content, meta);
          youTouchPending = null;
          youTouchTimer = null;
        }, 560);
      }
      return;
    }

    // Desktop: deferred routeNodeText — single click shows after the window;
    // double click cancels the deferred and navigates instead.
    if (youDesktopPending === chip.id() && youDesktopTimer !== null) {
      clearTimeout(youDesktopTimer);
      youDesktopTimer = null;
      youDesktopPending = null;
      hideTooltip();
      clearReadMark();
      handleNodeTap(main);
    } else {
      clearTimeout(youDesktopTimer);
      markReadNode(chip, youCy);
      const content = buildTooltipContent(main);
      const meta    = navNodeMeta(main);
      youDesktopPending = chip.id();
      youDesktopTimer = setTimeout(() => {
        routeNodeText(content, meta);
        youDesktopTimer = null;
        youDesktopPending = null;
      }, 320);
    }
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
  // Save button). The "Node: <name>" header added by buildTooltipContent is
  // useful in the default panel as a save anchor, but it's noise in a chat
  // card — strip it on chat-side inserts.
  function routeNodeText(content, meta) {
    if (chatModeActive) {
      let text = content;
      if (meta && meta.name) {
        const prefix = `Node: ${meta.name}\n`;
        if (text.startsWith(prefix)) text = text.slice(prefix.length);
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

  // Most recent VISIBLE local — excludes the hidden N=0 ghost. Used by
  // prependSystemCard so new status notifications pin themselves below the
  // user's compose card instead of bumping it down the stack.
  function topVisibleLocalCard() {
    for (let i = cards.length - 1; i >= 0; i--) {
      if (cards[i].kind === 'local' && !cards[i].hidden) return cards[i];
    }
    return null;
  }

  function createCard({ kind = 'local', label, hidden = false } = {}) {
    if (!chatStackEl) return null;
    const id        = 'card_' + nextCardSerial;
    nextCardSerial++;
    // Hidden ghost local takes serial 0 explicitly so user-facing N=1 stays
    // the first visible serial. Visible locals consume nextLocalSerial.
    const serial    = kind === 'local'
      ? (hidden ? 0 : nextLocalSerial++)
      : null;
    const card      = { id, kind, serial, hidden, volume: 0.85, text: '' };

    const el = document.createElement('div');
    el.className          = 'card ' + kind + (hidden ? ' card-hidden' : '');
    el.dataset.cardId     = id;
    el.style.opacity      = card.volume;

    const head = document.createElement('div');
    head.className   = 'card-head';
    const headLabel = document.createElement('span');
    headLabel.className = 'card-head-label';
    headLabel.textContent = label !== undefined
      ? label
      : kind === 'local'  ? ('N=' + serial)
      : kind === 'system' ? 'System'
      :                     'C';
    head.appendChild(headLabel);

    const body = kind === 'local'
      ? document.createElement('textarea')
      : document.createElement('div');
    body.className = 'card-body';
    if (kind === 'local') {
      body.value = '';
    } else {
      body.contentEditable = 'false';
      body.textContent = '';
    }

    el.append(head, body);
    chatStackEl.prepend(el);                // newest card visually on top; older cards push down
    card.el   = el;
    card.body = body;
    cards.push(card);

    // Hook OS-native copy. We do NOT preventDefault — system clipboard still gets the text,
    // so the user can paste outside the app as a side effect.
    body.addEventListener('copy', e => handleCardCopy(e, card));

    // Local cards drive the Send button's enable state (communications.md §6.1).
    if (kind === 'local') {
      body.addEventListener('input', updateSendBtn);
    }
    updateSendBtn();

    return card;
  }

  function handleCardCopy(_e, card) {
    let from, to, text;
    if (card.kind === 'local') {
      from = card.body.selectionStart;
      to   = card.body.selectionEnd;
      text = card.body.value.slice(from, to);
    } else {
      const sel = window.getSelection();
      text = sel ? sel.toString() : '';
      if (text && sel.rangeCount) {
        const r   = sel.getRangeAt(0);
        const pre = r.cloneRange();
        pre.selectNodeContents(card.body);
        pre.setEnd(r.startContainer, r.startOffset);
        from = pre.toString().length;
        to   = from + r.toString().length;
      } else {
        from = to = 0;
      }
    }

    if (!text) return;   // empty selection — no-op

    currentCopyText  = text;
    currentCopyRange = { cardId: card.id, from, to };

    // Destination = top local card. If source IS the top local, grow the stack
    // with a new local above it. Copies from system/received cards land in the
    // existing top local (creating one if there isn't one yet).
    const dest = (card === topLocalCard())
      ? createCard({ kind: 'local' })
      : (topLocalCard() || createCard({ kind: 'local' }));
    appendToCard(dest, text);
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
    if (card.kind === 'local') {
      const current  = card.body.value.replace(/\n{2,}$/, '\n');
      const insertAt = current.length > 0 ? current.length + 1 : 0;
      card.body.value = current.length > 0 ? current + '\n' + content : content;
      card.text = card.body.value;
      // Cursor at the start of the inserted text. No focus() — that would
      // pop up the iOS keyboard on every node click.
      try { card.body.setSelectionRange(insertAt, insertAt); } catch (_) {}
      scrollTextareaToInsertPoint(card.body, insertAt);
    } else {
      const current = card.body.textContent.replace(/\n{2,}$/, '\n');
      card.body.textContent = current.length > 0 ? current + '\n' + content : content;
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

  // Inbound system card (server-emitted). Two-mode placement so A and B end
  // up with the same shape after first pair-up:
  //   - Initial batch (before chat_ready): no visible local exists yet, so
  //     createCard's prepend leaves the system card at the top of the stack.
  //     handleChatReady's N=1 then lands above it naturally.
  //   - Later batch (after chat_ready, e.g. "Partner joined chat"): a visible
  //     local exists, so we dock the new system card immediately below it.
  //     The user's compose card stays pinned at the top; status notifications
  //     accumulate beneath it (newest closest to N=k).
  // Partner cards (prependPartnerCard) keep strict newest-on-top.
  function prependSystemCard(text) {
    const sys = createCard({ kind: 'system' });
    if (!sys) return;
    if (sys.body) {
      sys.body.textContent = text;
      sys.text = text;
    }
    const top = topVisibleLocalCard();
    if (top && top.el && top.el !== sys.el) {
      top.el.after(sys.el);
    }
  }

  // Called on Chat press: drop in a hidden N=0 ghost so the user's first
  // visible card (N=1) lands above the server's initial how-to + status batch
  // when chat_ready fires. The ghost anchors partner-card labels too — it
  // gives topLocalCard().serial a defined value (0) in the brief window
  // between Chat press and chat_ready.
  function ensureLocalCard() {
    if (!topLocalCard()) createCard({ kind: 'local', hidden: true });
  }

  // Server's chat_ready signal: initial system batch is in. Promote the
  // chat panel by creating the user's first visible local card (N=1) on top.
  // Idempotent: if a visible local already exists, no-op.
  function handleChatReady() {
    const top = topLocalCard();
    if (top && !top.hidden) return;
    createCard({ kind: 'local' });
  }

  // Per-local-card counter for inbound partner messages (communications.md §4.1).
  // Frozen at receipt: numbering reflects the top local at the moment the message
  // arrived, not whatever the top local is now.
  const receivedCountByN = new Map();

  // Inbound partner card (server-relayed). Teal, non-editable, head label `N.M`.
  // Newest on top — createCard's prepend puts it at the absolute top of the
  // stack. N is the *label* (top local serial at receipt), not a positional
  // anchor (communications.md §4.1).
  function prependPartnerCard(text) {
    if (!topLocalCard()) {
      // ensureLocalCard makes this unreachable in practice, but degrade gracefully.
      createCard({ kind: 'local' });
    }
    const top = topLocalCard();
    const parentN = top ? top.serial : 0;
    const m = (receivedCountByN.get(parentN) || 0) + 1;
    receivedCountByN.set(parentN, m);
    const rcv = createCard({ kind: 'received', label: parentN + '.' + m });
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

  function updateSendBtn() {
    if (!sendBtnEl) return;
    const top = topLocalCard();
    // Hidden ghost (N=0) is never sendable — it has no body the user can fill.
    const text = top && !top.hidden && top.body ? top.body.value : '';
    sendBtnEl.disabled = !pairingState.active || !text.trim();
  }

  // Click-time send: read the *current* textarea value (card.text isn't synced
  // on direct user typing). Returns true if the WS frame went out.
  function sendTopLocalCard() {
    const top = topLocalCard();
    if (!top || top.hidden || !top.body) return false;
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

  function updateBackBtn() {
    backBtn.classList.toggle('visible', history.length > 0);
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
    const state = history.pop();
    const ids = new Set(state.ids);
    lastParentNode = state.parent;
    activeNodeId = null;
    cy.elements().hide();
    cy.elements().filter(el => ids.has(el.id())).show();
    runLayout(cy, lastParentNode);
    updateBackBtn();
    const dest = state.chipNode || state.parent;
    if (dest && dest.length) {
      const ptype = dest.data('type');
      if (ptype === 'Entry' || ptype === 'Family' || ptype === 'Cluster' || ptype === 'TextNode') addYouChip(dest);
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
    cy.elements().hide();

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

    runLayout(cy);
  }

  function expandToFamily(familyNode) {
    clearFamilyView();
    saveState();
    lastParentNode = familyNode;
    activeNodeId = familyNode.id();
    cy.elements().hide();
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
    currentClusterColour = clusterNode.data('colour');
    saveState();
    activeNodeId = clusterNode.id();
    cy.elements().hide();

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

    runLayout(cy);

    setTimeout(() => {
      const gws = gwEdges.sources().filter(':visible');
      if (!gws.length) return;
      const spacing = 130;
      const rowX = clusterNode.position().x - ((gws.length - 1) * spacing) / 2;
      const rowY = clusterNode.position().y + 150;
      gws.forEach((n, i) => n.position({ x: rowX + i * spacing, y: rowY }));
      cy.fit(cy.elements(':visible'), fitPadding(cy, 60));
    }, 500);
  }

  async function handleGatewayClick(node) {
    if (!lastClusterNode) {
      expandToNode(node);
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
      const id = getElementId(rec.n);
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

    if (clusterNode && clusterNode.length) clusterNode.show();
    titlePage.show();

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
    const dispCols  = editModeActive ? Math.min(30, Math.max(10, cols * 2)) : cols;
    const dispNodeW = editModeActive ? Math.round(nodeW * 0.5) : nodeW;
    const dispNodeH = editModeActive ? Math.round(dispNodeW * 0.57) : nodeH;
    const dispFont  = editModeActive ? 7 : fontSize;
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
        'text-margin-y':      editModeActive ? -Math.round(dispNodeH / 4) : 0,
      });
    });

    const positions = {};

    if (!editModeActive) {
      // Non-edit: cluster above title, title above grid
      if (clusterNode && clusterNode.length)
        positions[clusterNode.id()] = { x: clusterX, y: headerY };
      positions[titlePage.id()] = { x: clusterX, y: headerY + stepY };
      const gridY = headerY + stepY * 2;
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

  function toggleMediaBar(label, audioSrc) {
    if (mediaBar.classList.contains('active') && mediaBar.dataset.node === label) {
      return;  // already open — only ✕ closes the player
    }
    const existingAudio = mediaBar.querySelector('audio');
    if (existingAudio) { existingAudio.pause(); existingAudio.src = ''; }

    const selectHtml = `<select class="mp-select">` +
      mediaFilesList.map(f =>
        `<option value="${f.name}"${f.name === audioSrc ? ' selected' : ''}>${formatOption(f)}</option>`
      ).join('') +
      `</select>`;

    mediaBar.innerHTML =
      selectHtml +
      `<button class="mp-btn" aria-label="play">▶</button>` +
      `<audio src="${audioSrc}"></audio>` +
      `<button class="media-close" aria-label="close">✕</button>`;

    mediaBar.dataset.node = label;
    mediaBar.classList.add('active');

    const audio  = mediaBar.querySelector('audio');
    const btn    = mediaBar.querySelector('.mp-btn');
    const select = mediaBar.querySelector('.mp-select');

    btn.addEventListener('click', () => {
      if (audio.paused) { audio.play(); btn.textContent = '⏸'; }
      else              { audio.pause(); btn.textContent = '▶'; }
    });
    audio.addEventListener('ended', () => { btn.textContent = '▶'; });
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

  // Tap handler

  function handleNodeTap(node, addChip = true) {
    wsRef.lastActivity = Date.now();
    const type = node.data('type');

    if (type === 'ClusterEditChip') {
      applyEditChipSelection(node.data('mainClusterId'));
      return;
    }

    if (editModeActive && node.hasClass('snake-section')) {
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
        const target = (editModeActive && editSelectedClusterId && editSelectedClusterId !== node.id())
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

  cy.on('tap', 'node', evt => {
    const node = evt.target;

    if (isTouchEvent(evt)) {
      markRecentTouch();
      cancelDwell();

      // Nodes with no tooltip content: first touch is a silent no-op (like desktop hover),
      // second touch within 800ms navigates — same double-tap gate, no visible feedback
      if (!buildTooltipContent(node)) {
        const sameNode     = touchPendingNodeId === node.id();
        const withinWindow = tapResetTimer !== null;
        clearTimeout(tapResetTimer);
        tapResetTimer = null;
        if (sameNode && withinWindow) {
          touchPendingNodeId = null;
          handleNodeTap(node);
        } else {
          touchPendingNodeId = node.id();
          tapResetTimer = setTimeout(() => { touchPendingNodeId = null; tapResetTimer = null; }, 560);
        }
        return;
      }

      const sameNode    = touchPendingNodeId === node.id();
      const withinWindow = tapResetTimer !== null;
      clearTimeout(tapResetTimer);
      tapResetTimer = null;

      if (sameNode && withinWindow) {
        // Double tap (two taps within window) — navigate; deferred routeNodeText cancelled.
        hideTooltip();
        touchPendingNodeId = null;
        clearReadMark();
        handleNodeTap(node);
      } else if (tooltipNodeId === node.id()) {
        // Tap same node while its tooltip is showing — dismiss
        hideTooltip();
        touchPendingNodeId = node.id();
        tapResetTimer = setTimeout(() => { touchPendingNodeId = null; tapResetTimer = null; }, 560);
      } else {
        // Touch: defer routeNodeText so a follow-up double-tap can pre-empt it
        // (no text shown on double-tap, no flash).
        hideTooltip();
        markReadNode(node, cy);
        const content = buildTooltipContent(node);
        const meta    = navNodeMeta(node);
        touchPendingNodeId = node.id();
        tapResetTimer = setTimeout(() => {
          routeNodeText(content, meta);
          touchPendingNodeId = null;
          tapResetTimer = null;
        }, 560);
      }
      return;
    }

    // Desktop: single click defers routeNodeText so a double-click can cancel
    // it (no text shown on double-click). Double click navigates.
    if (desktopPendingNodeId === node.id() && desktopClickTimer !== null) {
      clearTimeout(desktopClickTimer);
      desktopClickTimer = null;
      desktopPendingNodeId = null;
      hideTooltip();
      clearReadMark();
      handleNodeTap(node);
    } else {
      clearTimeout(desktopClickTimer);
      markReadNode(node, cy);
      const content = buildTooltipContent(node);
      const meta    = navNodeMeta(node);
      desktopPendingNodeId = node.id();
      desktopClickTimer = setTimeout(() => {
        routeNodeText(content, meta);
        desktopClickTimer = null;
        desktopPendingNodeId = null;
      }, 320);
    }
  });

  // Tap on empty canvas — hide tooltip and reset state
  cy.on('tap', evt => {
    if (evt.target !== cy) return;
    hideTooltip();
    if (isTouchEvent(evt)) {
      clearTimeout(tapResetTimer);
      tapResetTimer = null;
      touchPendingNodeId = null;
    } else {
      clearTimeout(desktopClickTimer);
      desktopClickTimer = null;
      desktopPendingNodeId = null;
    }
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

  function devStatus(msg) {
    devStatusEl.textContent = msg;
    clearTimeout(devStatus._t);
    devStatus._t = setTimeout(() => { devStatusEl.textContent = ''; }, 3000);
  }

  document.getElementById('dev-write').addEventListener('click', () => {
    if (!lastParentNode) { devStatus('tap a family first'); return; }
    const code = devCodeEl.value.trim();
    if (!code) { devStatus('enter code'); return; }

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
      hints.push({
        relId:       e.data('raw_rel_id'),
        hint_x:      (c.position('x') - parentPos.x) / scale,
        hint_y:      (c.position('y') - parentPos.y) / scale,
        hint_scale:  scale,
      });
    });

    const wsNow = wsRef.current;
    if (!wsNow || !wsNow.connected) { devStatus('ws not open'); return; }
    wsNow.on('msg', function handler(msg) {
      if (!msg || msg.type !== 'write_hints') return;
      wsNow.off('msg', handler);
      if (msg.error) { devStatus(msg.error); return; }
      // Update in-memory edge data so Reset/re-entry uses preset mode immediately.
      // Match by raw_rel_id since childEdges and hints are built in the same order.
      const hintByRelId = new Map(hints.map(h => [h.relId, h]));
      childEdges.forEach(e => {
        const h = hintByRelId.get(e.data('raw_rel_id'));
        if (h) { e.data('hint_x', h.hint_x); e.data('hint_y', h.hint_y); e.data('hint_scale', h.hint_scale); }
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

  // --- Default panel node-text Save ---

  const defaultSaveBtn    = document.getElementById('default-save-btn');
  const defaultSaveStatus = document.getElementById('default-save-status');

  function setSaveStatus(msg) {
    if (!defaultSaveStatus) return;
    defaultSaveStatus.textContent = msg;
    clearTimeout(setSaveStatus._t);
    if (msg) setSaveStatus._t = setTimeout(() => { defaultSaveStatus.textContent = ''; }, 3000);
  }

  updateSaveButtonState = function () {
    if (!defaultSaveBtn) return;
    const topEl   = defaultStackEl && defaultStackEl.firstElementChild;
    const hasMeta = !!(topEl && topEl.dataset && topEl.dataset.bdName && topEl.dataset.bdLabel);
    const hasCode = !!(devCodeEl && devCodeEl.value.trim());
    defaultSaveBtn.disabled = !(hasMeta && hasCode);
  };

  if (devCodeEl) devCodeEl.addEventListener('input', updateSaveButtonState);

  defaultSaveBtn.addEventListener('click', () => {
    const topEl = defaultStackEl && defaultStackEl.firstElementChild;
    if (!topEl) { setSaveStatus('no node'); return; }
    const label = topEl.dataset.bdLabel;
    const name  = topEl.dataset.bdName;
    if (!label || !name) { setSaveStatus('no node'); return; }

    const body = topEl.querySelector('.card-body');
    if (!body) { setSaveStatus('no body'); return; }

    // innerText preserves line breaks across the child block <div>s; textContent
    // would smash them together. Trim a trailing newline so the saved text
    // doesn't grow a blank line each round-trip.
    const full     = (body.innerText || '').replace(/\n+$/, '');
    const newline  = full.indexOf('\n');
    const firstLine = newline === -1 ? full : full.slice(0, newline);
    const rest      = newline === -1 ? ''   : full.slice(newline + 1);

    const expected = `Node: ${name}`;
    if (firstLine.trim() !== expected) {
      setSaveStatus('first line must be "' + expected + '"');
      return;
    }

    const code = devCodeEl.value.trim();
    if (!code) { setSaveStatus('enter code'); return; }

    const wsNow = wsRef.current;
    if (!wsNow || !wsNow.connected) { setSaveStatus('ws not open'); return; }

    function handler(m) {
      if (!m || m.type !== 'edit_node_text') return;
      wsNow.off('msg', handler);
      if (m.error) { setSaveStatus(m.error); return; }
      setSaveStatus('saved');
    }
    wsNow.on('msg', handler);

    // Normalise curator-authored [ … ] blocks into canonical %%bd_ai_read
    // before persisting (bot_context.md §3). Server is a dumb store-and-forward.
    wsNow.emit('msg', {
      type:  'edit_node_text',
      code,
      label,
      name,
      text:  normalizeBotBlocks(rest),
    });
    setSaveStatus('saving…');
  });

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
    markReadNode(node, cy);
    expandToNode(node);
  }

  return { appendBuddyChip, resetBuddyBar, handleClusterRelMsg, handleClusterCloned, createCard, setChatText, prependSystemCard, prependPartnerCard, ensureLocalCard, handleChatReady, setSendBtn, updateSendBtn, sendTopLocalCard, handleBuddyCardAck, topLocalCard, getActiveNodeId: () => activeNodeId, getLastReadNodeId: () => lastReadNodeId, enterNode, toggleMediaBar };

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
      const bb = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
      div.style.display = 'block';
      div.style.fontSize = fontSize;
      const cx = (bb.x1 + bb.x2) / 2;
      div.style.left = cx + 'px';
      div.style.top  = (bb.y2 - 4) + 'px';
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

// --- Boot ---

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


async function init() {
  // #help-text was removed in A50 — guard the legacy assignment so init() doesn't abort.
  const helpTextEl = document.getElementById('help-text');
  if (helpTextEl) helpTextEl.textContent = helpText;

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
    const nId = getElementId(n);
    const mId = getElementId(m);
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

  // Memgraph elementId inconsistency: the same Cluster or Family node can return
  // different elementIds in different query contexts. Deduplicate by name (first-seen
  // wins), fix all edge source/target references to the canonical ID, and remove the
  // phantom duplicate nodes. Without this, TextNode→Cluster edges that landed on a
  // duplicate Cluster ID produce disconnected components in fCoSE, which grids them
  // into a "neat table" alongside the gateway.
  //
  // 2026-07-04: TextNode dedup was tried and reverted — it broke handleGatewayClick's
  // path, which uses raw DB elementIds from a follow-up Cypher query. Any future
  // TextNode dedup must also canonicalise IDs at every DB-query result site, not
  // just at graph-load time. Leaving as-is until we have concrete diagnostic data
  // showing duplicate TextNodes are the actual cause of the CHILD asymmetry.
  const clusterIdByName = new Map();
  const familyIdByName  = new Map();
  const canonicalNodeId = new Map(); // duplicateId → canonicalId
  nodesById.forEach(nd => {
    if (nd.type === 'Cluster') {
      if (clusterIdByName.has(nd.name)) canonicalNodeId.set(nd.id, clusterIdByName.get(nd.name));
      else clusterIdByName.set(nd.name, nd.id);
    }
    if (nd.type === 'Family') {
      if (familyIdByName.has(nd.name)) canonicalNodeId.set(nd.id, familyIdByName.get(nd.name));
      else familyIdByName.set(nd.name, nd.id);
    }
  });
  if (canonicalNodeId.size > 0) {
    edgesById.forEach(ed => {
      if (canonicalNodeId.has(ed.source)) ed.source = canonicalNodeId.get(ed.source);
      if (canonicalNodeId.has(ed.target)) ed.target = canonicalNodeId.get(ed.target);
    });
    canonicalNodeId.forEach((_, dupId) => nodesById.delete(dupId));
  }

  for (const rec of cfRecords) {
    const c = rec.c, r = rec.r, f = rec.f;
    const cProps = flattenProps(c.properties || {});
    const fProps = flattenProps(f.properties || {});
    const rId = getElementId(r);
    const cId = clusterIdByName.get(cProps.name) || getElementId(c);
    const fId = familyIdByName.get(fProps.name)  || getElementId(f);
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
    const sfId = familyIdByName.get(sfProps.name) || getElementId(sf);
    const fId  = familyIdByName.get(fProps.name)  || getElementId(f);
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

  // Pin #cy's top to the bottom of #default-panel BEFORE cytoscape constructs,
  // so the initial cy.fit() uses the real canvas dimensions. If this runs after
  // init, the root ends up off-centre (mis-fit against the CSS fallback rect),
  // visible especially on iPhone after #default-panel grew to 34dvh.
  {
    const refEl = document.getElementById('action-bar')
              || document.getElementById('default-panel')
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
  cy.fit(root, fitPadding(cy, 120));

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
    // A50j: #action-bar is always visible and sits below whichever panel
    // (chat or default) is showing in DOM flow — so cy always pins to its
    // bottom. Fall back to the active panel / breadcrumb if the bar is
    // missing for any reason.
    const refEl =
      document.getElementById('action-bar') ||
      (chatModeActive && chatPanel.getBoundingClientRect().height > 0 ? chatPanel : null) ||
      document.getElementById('default-panel') ||
      document.getElementById('cy-you');
    const topPx = Math.ceil(refEl.getBoundingClientRect().bottom) + 'px';
    cyEl.style.top = topPx;
    // A42 §42.3 — #visual-iframe must share #cy's rect exactly. iframe
    // elements have an HTML intrinsic default height of 150 px that the
    // browser can honour even under position: fixed with top+bottom set,
    // so we stamp explicit width/height/top from #cy's bounding rect
    // rather than relying on CSS to derive them.
    const iframeEl = document.getElementById('visual-iframe');
    if (iframeEl) {
      const cyRect = cyEl.getBoundingClientRect();
      // Only stamp when #cy has non-zero dimensions. In Player mode #cy has
      // `.hidden` (display: none) so its rect collapses to zeros — if we
      // stamped those zeros onto the iframe, its inner module would render
      // into a 0×0 viewport and appear blank. Skipping the stamp keeps the
      // most recent good rect (from the last un-hidden call) so the iframe
      // stays sized correctly across the toggleChatMode → setViewMode('player')
      // rAF sequence used by the ?data= return-from-standalone flow.
      if (cyRect.width > 0 && cyRect.height > 0) {
        // MM3 (2026-07-12) — reserve a band on the right of the iframe on
        // landscape viewports for #bd-invite-panel-viewer. Portrait
        // (aspect ratio ≤ 1) keeps the full-width iframe; the invite panel
        // there uses fixed positioning at bottom-right and overlays the
        // right edge of the visual.
        // Reserve width tracks the panel: max-width 76 + right 8 = 84,
        // rounded up to 100 for breathing room.
        const isLandscape   = window.innerWidth > window.innerHeight;
        const reserveRight  = isLandscape ? 100 : 0;
        const stampedWidth  = Math.max(0, cyRect.width - reserveRight);
        iframeEl.style.top    = cyRect.top    + 'px';
        iframeEl.style.left   = cyRect.left   + 'px';
        iframeEl.style.width  = stampedWidth  + 'px';
        iframeEl.style.height = cyRect.height + 'px';
      }
    }
  }

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
      } catch (err) {
        console.warn('[MM1.6] onReady: postMessage failed', err);
      }
    };
    window.addEventListener('message', onReady);
    visualIframe.src = url;
  }

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
      // MM1.6 Strategy B — on entering Player mode, load the current node's
      // module so the user sees the visual immediately without having to
      // press Copy Down.
      const nodeId = (typeof getLastReadNodeId === 'function' && getLastReadNodeId()) ||
                     (typeof getActiveNodeId    === 'function' && getActiveNodeId());
      if (nodeId) loadModuleForNode(nodeId);
    } else {
      cyEl.classList.remove('hidden');
      if (visualIframe) visualIframe.classList.remove('active');
      document.body.classList.remove('player-active');
      // Cy's internal size may have gone stale while it was hidden (any
      // resize / rAF re-fit was skipped). Re-sync after a frame so the
      // container has real dimensions again, then re-fit to whatever
      // sub-graph is currently visible.
      requestAnimationFrame(() => {
        cy.resize();
        cy.fit(cy.elements(':visible'), fitPadding(cy, 40));
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
  window.addEventListener('resize', () => {
    if (visualIframe && visualIframe.classList.contains('active')) {
      positionCyEl();
    }
  });

  // 2026-07-15 — Chat is now always active from boot (no toggle). The
  // chat button is now the Join / Leave button: press Join to enter the
  // pair queue (curation-code-gated for the arriver), press Leave to
  // unpair or to walk out of the wait queue. Label reflects state.
  function updateJoinButtonLabel() {
    chatBtn.textContent = (pairingState.active || pairingState.waiting) ? 'Leave' : 'Join';
  }

  function togglePair() {
    const wsNow = wsRef.current;
    if (!wsNow || !wsNow.connected) return;

    if (pairingState.active || pairingState.waiting) {
      // Leave — either walking out of the wait queue or unpairing from a
      // live partner. Server's unpair handler notifies the buddy via
      // buddy_disconnected (if paired) and drops "Partner disconnected."
      // in their chat log. This user does NOT auto re-queue.
      console.log('[pair-debug] Leave press → unpair (active=', pairingState.active, ', waiting=', pairingState.waiting, ')');
      wsNow.emit('msg', { type: 'unpair' });
      pairingState.active = false;
      pairingState.waiting = false;
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
  }

  // A42 §42.3 — Nodes/Player radio change handler.
  document.querySelectorAll('#view-mode-toggle input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) setViewMode(radio.value);
    });
  });

  chatBtn.addEventListener('click', togglePair);

  chatStackEl    = document.getElementById('chat-stack');
  defaultStackEl = document.getElementById('default-stack');

  const newCardBtn = document.getElementById('chat-new-card-btn');
  if (newCardBtn) {
    newCardBtn.addEventListener('click', () => {
      const card = createCard({ kind: 'local' });
      if (chatStackEl) chatStackEl.scrollTop = 0;
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

  document.getElementById('edit-mode-cb').addEventListener('change', e => {
    if (editModeUnlocked) {
      editModeActive = e.target.checked;
      return;
    }
    // Validate against server using the code already in the dev-code field
    const code = document.getElementById('dev-code').value.trim();
    if (!code) { e.target.checked = false; return; }
    const wsNow = wsRef.current;
    if (!wsNow || !wsNow.connected) { e.target.checked = false; return; }
    const devStatusEl = document.getElementById('dev-status');
    wsNow.on('msg', function handler(msg) {
      if (!msg || msg.type !== 'write_hints') return;
      wsNow.off('msg', handler);
      if (msg.ok) {
        editModeUnlocked = true;
        editModeActive = true;
        document.getElementById('edit-mode-cb').checked = true;
      } else {
        devStatusEl.textContent = msg.error || 'bad code';
        setTimeout(() => { devStatusEl.textContent = ''; }, 3000);
        document.getElementById('edit-mode-cb').checked = false;
        editModeActive = false;
      }
    });
    wsNow.emit('msg', { type: 'write_hints', code, hints: [] });
  });

  const { addBadge }      = setupNrBadges(cy);
  const { appendBuddyChip, resetBuddyBar, handleClusterRelMsg, handleClusterCloned, createCard, setChatText, prependSystemCard, prependPartnerCard, ensureLocalCard, handleChatReady, setSendBtn, updateSendBtn, sendTopLocalCard, handleBuddyCardAck, topLocalCard, getActiveNodeId, getLastReadNodeId, enterNode, toggleMediaBar } = setupInteractions(cy, wsRef, addBadge, youCy, buddyCy, pairingState);

  // Bind Send button — must run AFTER setupInteractions destructure because
  // setSendBtn is an immediate call (not deferred into a closure like newCard's
  // createCard reference). Hoisting only saves function declarations, not
  // const bindings from object destructuring.
  const sendBtn = document.getElementById('chat-send-btn');
  if (sendBtn) {
    setSendBtn(sendBtn);
    sendBtn.addEventListener('click', () => { sendTopLocalCard(); });
  }

  // #cy top is pinned earlier — before cytoscape constructs — so init fits
  // the root correctly. No re-pin needed here; cy.resize on subsequent panel
  // toggles is handled by positionCyEl().

  // A42 §42.6 / §42.7 — Copy Down (card → iframe) and Copy Up (iframe → card).
  // Both are gated on chat being active (see toggleChatMode). Copy Up is also
  // gated on a successful Copy Down having happened first (§42.7).
  //
  // "Focused card" per the answer to Q3: whichever local card's textarea has
  // DOM focus; fallback = topLocalCard() (which excludes the hidden ghost
  // via the top.hidden check).
  {
    const copyDownBtn = document.getElementById('copy-down-btn');
    const copyUpBtn   = document.getElementById('copy-up-btn');
    const iframeEl2   = document.getElementById('visual-iframe');

    function getFocusedCardBody() {
      const active = document.activeElement;
      if (active && active.tagName === 'TEXTAREA' && active.closest('.card.local')) {
        return active;
      }
      const top = topLocalCard();
      return (top && !top.hidden && top.body) ? top.body : null;
    }

    if (copyDownBtn) {
      copyDownBtn.addEventListener('click', () => {
        const body = getFocusedCardBody();
        if (!body || !iframeEl2) return;
        const script = body.value || '';
        iframeEl2.contentWindow.postMessage(
          { type: 'bd_script_update', script },
          '*'
        );
        // §42.6 — enable Copy Up once a script has been sent.
        if (copyUpBtn) copyUpBtn.disabled = false;
      });
    }

    if (copyUpBtn) {
      copyUpBtn.addEventListener('click', () => {
        if (!iframeEl2) return;
        iframeEl2.contentWindow.postMessage(
          { type: 'bd_script_request' },
          '*'
        );
      });
    }

    // §42.7 — inbound bd_script_response from the iframe writes into the
    // currently focused local card, mirroring the semantics of Copy Down's
    // destination. dispatchEvent('input') triggers updateSendBtn so the Send
    // button's enable state re-evaluates after the write.
    window.addEventListener('message', (e) => {
      const d = e && e.data;
      if (!d || d.type !== 'bd_script_response') return;
      const body = getFocusedCardBody();
      if (!body || typeof d.script !== 'string') return;
      body.value = d.script;
      body.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // ── External Website URL builder (MM3, 2026-07-12) ────────────────────
    // Assembles the standalone-player URL that both #jump-to-ext-btn and
    // #copy-link-to-ext-btn (in #bd-invite-panel-viewer) point at. Payload:
    //   { script, node_url, source_text, title }
    // - script         = current panel/card text (see 4-tier precedence below)
    // - node_url et al = properties of the currently-visible-in-panel node,
    //   preferred by lastReadNodeId over activeNodeId (a user hitting these
    //   buttons wants a link to whatever they last READ, not to whatever
    //   Family/Cluster they'd double-tap-navigated into).
    // Base URL is currently hardcoded to localhost:8080 for testing; once
    // the EV is being served from GitHub Pages the base can be updated to
    // that origin (see Q2 answer 2026-07-12).
    function buildExternalWebsiteUrl() {
      let currentNodeUrl = null, currentSourceText = null, currentTitle = null;
      let activeNode = null;
      const readId   = getLastReadNodeId && getLastReadNodeId();
      const activeId = getActiveNodeId   && getActiveNodeId();
      const nodeId   = readId || activeId;
      if (nodeId) {
        const n = cy.getElementById(nodeId);
        if (n && n.length > 0) {
          activeNode = n;
          currentNodeUrl    = n.data('url')         || null;
          currentSourceText = n.data('source_text') || null;
          currentTitle      = n.data('title')       || null;
        }
      }

      // Panel text precedence:
      //   1. Focused local-card textarea (chat mode, actively editing)
      //   2. topLocalCard body (chat mode, not focused)
      //   3. activeNode.data('text') — raw source of truth. This is what
      //      setSystemText renders for a TextNode click, minus the display
      //      header buildTooltipContent prepends. Reading the DOM instead
      //      would include the welcome prefix + header + spacer divs + any
      //      prior append (setSystemText never clears on no-meta inserts).
      //   4. #default-card-body textContent — last-ditch welcome-message.
      let currentPanelText = '';
      const active = document.activeElement;
      if (active && active.tagName === 'TEXTAREA' && active.closest('.card.local')) {
        currentPanelText = active.value || '';
      } else {
        const top = topLocalCard();
        if (top && !top.hidden && top.body) {
          currentPanelText = top.body.value || '';
        } else if (activeNode) {
          currentPanelText = activeNode.data('text') || '';
        } else {
          const defBody = document.getElementById('default-card-body');
          currentPanelText = defBody ? (defBody.textContent || '') : '';
        }
      }

      const payload = {
        script:      currentPanelText,
        node_url:    currentNodeUrl,           // 'butterflydreaming.org/n/<uuid>' — the
                                               // project's durable UUID-based identity,
                                               // stable across DB reimports (unlike Neo4j
                                               // elementId). See migrate_mm1.js / apply_mm.js.
        source_text: currentSourceText,
        title:       currentTitle
      };
      // Base64 → URL: must percent-encode. Raw base64 contains `+` `/` `=`
      // — all legal in URLs but `+` gets decoded as space by URLSearchParams
      // (application/x-www-form-urlencoded rules), which corrupts the round
      // trip and silently drops the standalone into DEFAULT_SCRIPT.
      // encodeURIComponent turns +→%2B, /→%2F, =→%3D.
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      const standaloneBaseUrl = `http://${window.location.hostname}:8080/bd_V_Kolam/preview.html`;
      const url = `${standaloneBaseUrl}?data=${encodeURIComponent(encoded)}`;
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

    // ── Jump to External Website (MM3) ─────────────────────────────────
    // Opens the standalone EV in a new tab (Q3 answer 2026-07-12: new tab
    // for now, preserves the BD chat/pair session). Wrapper is intentionally
    // one-line so a future alert/confirm can slot in as a pre-flight check.
    const jumpToBtn = document.getElementById('jump-to-ext-btn');
    if (jumpToBtn) {
      jumpToBtn.addEventListener('click', () => {
        const { url } = buildExternalWebsiteUrl();
        console.log('Jump to External Website URL:', url);
        window.open(url, '_blank');
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
        const { url } = buildBdSelfUrl();
        copyLinkText(url).then(() => {
          copyLinkBtn.textContent = 'Copied!';
          setTimeout(() => { copyLinkBtn.innerHTML = originalLabel; }, 1500);
        }).catch((err) => {
          console.warn('Copy Link (BD-self): clipboard write failed, showing fallback', err);
          showFallback(url);
        });
      });
    }
  }

  const userCountPanel = document.getElementById('user-count-panel');

  // Attach the 'msg' dispatch BEFORE firing the initial requests. Under
  // ws-based transport this ordering was tolerable because the browser
  // buffered incoming messages during script parsing; under Socket.IO,
  // events sent before a listener is attached are dropped by the client
  // socket. Server also broadcasts user_count on new connection, which
  // used to be lost the same way.
  ws.on('msg', msg => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'user_count') {
      userCountPanel.textContent = `${msg.count} connected`;
      userCountPanel.classList.add('active');
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
    } else if (msg.type === 'buddy_disconnected') {
      console.log('[pair-debug] ← buddy_disconnected received');
      // Partner left (either their WS closed or they pressed Leave). Under
      // the opt-in pairing model (2026-07-15) we do NOT auto re-queue —
      // user returns to solo state and must press Join again to look for
      // a new partner.
      pairingState.active = false;
      pairingState.waiting = false;
      buddyCy.nodes().addClass('buddy-gone');
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
  //   - Join button starts labelled "Join"; togglePair + the pair-state
  //     message handlers below keep the label in sync (Join ↔ Leave)
  chatPanel.classList.add('active');
  chatBtn.classList.add('active');
  chatBtn.textContent = 'Join';
  document.querySelectorAll('#view-mode-toggle input[type="radio"]')
    .forEach(r => { r.disabled = false; });
  const copyDownBtnBoot = document.getElementById('copy-down-btn');
  if (copyDownBtnBoot) copyDownBtnBoot.disabled = false;
  ws.emit('msg', { type: 'enter_chat' });
  requestAnimationFrame(() => positionCyEl());

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

    // Is the target a module node? Determines two later behaviours:
    //   - step 2  (shadow target.text with the payload script) — only for
    //     modules, so Player-mode auto-load sends the edited script rather
    //     than the DB copy. Shadowing a normal node's text would replace
    //     the reader's view with the sender's chat draft, which is wrong.
    //   - step 6  (auto-engage Player mode) — same reason: normal nodes
    //     have no module to play, so flipping into Player mode would
    //     flash a broken load. Land in Nodes mode instead.
    // Detection: `hasModuleScript` property (post-MM2 nodes) OR the target's
    // own text carries a `%%bd_module` directive (pre-MM2 backward compat).
    const isModuleTarget = !!(target.data('hasModuleScript') || parseModuleId(target.data('text')));

    // 1. Snapshot the target's current DB text BEFORE we (maybe) overwrite
    //    it, so we can also place that original on a chat card (see 5a).
    //    The DB isn't touched by any of this — target.data('text', …)
    //    mutates only Cytoscape's local copy.
    const originalDbScript = target.data('text');

    // 2. (module-only) Shadow the local node's text so Player mode's
    //    auto-load sends the edited script instead of the DB copy. Not
    //    persisted — a refresh without ?data= will restore the DB text.
    //    For non-module nodes we leave target.data('text') alone.
    if (isModuleTarget && script !== null) target.data('text', script);

    // 3. Navigate to the node (sets lastReadNodeId + activeNodeId + expands).
    enterNode(target);

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

    // 5a. Populate the current top card (N=1) with the ORIGINAL DB script,
    //     then create a new local card above it (N=2) for the incoming
    //     payload script. Result (newest-on-top):
    //         N=2  ←  incoming (edited)  payload script
    //         N=1  ←  original DB script (untouched)
    //     This keeps the original accessible during the session even while
    //     the node's local .text has been shadowed for Player-mode auto-load.
    //     Skipped when the two scripts are identical (unedited return) to
    //     avoid a redundant duplicate card.
    const hasOriginal = typeof originalDbScript === 'string' && originalDbScript.length > 0;
    const originalDiffers = hasOriginal && originalDbScript !== script;
    if (originalDiffers && typeof setChatText === 'function') {
      setChatText(originalDbScript);
      if (typeof createCard === 'function') createCard({ kind: 'local' });
    }

    // 5b. Populate the (now-topmost) local card with the payload script.
    if (script !== null && typeof setChatText === 'function') {
      setChatText(script);
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
