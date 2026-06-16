// viewer.js — ButterflyDreaming Graph Viewer

const DWELL_MS   = 200;   // ms before tooltip displays
const DWELL_FIRE = 300;   // ms before DWELL_MS to fire prefetch query

// Vertical top of main graph canvas — tooltips must not appear above this line
const BARS_BOTTOM = 158; // bc-spacer(50) + help-bar(26) + cy-buddy(36) + gap(10) + cy-you(36)

const isTouchDevice = navigator.maxTouchPoints > 0;
let mediaFilesList = [];  // populated via WebSocket on connect
const helpText = isTouchDevice
  ? 'Tap to read — double tap to navigate.'
  : 'Hover to read — click to navigate.';

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

// --- Neo4j → Cytoscape element builders ---

function shortText(text, wordCount) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  return words.length <= wordCount
    ? words.join(' ')
    : words.slice(0, wordCount).join(' ') + '…';
}

function getTextNodeLabel(props) {
  if (props.gateway) return props.source_text || shortText(props.text, 5);
  if (props.section_title && props.title) return props.title;
  const src = props.source_text;
  const seq = props.seq;
  if (src && seq !== undefined && seq !== null) return `${seq}: ${src}`;
  return shortText(props.text, 5);
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
        'width': 48,
        'height': 21,
        'shape': 'round-rectangle',
        'background-color': 'data(colour)',
        'background-opacity': 0.85,
        'color': '#ffffff',
        'label': 'data(display_name)',
        'font-size': '7px',
        'text-max-width': '43px',
        'border-width': 0,
        'overlay-padding': 4,
      }
    },
  ];
}

// --- Layout ---

function runLayout(cy, parentNode = null) {
  const visible = cy.elements(':visible');
  if (visible.nodes().length <= 1) {
    cy.fit(visible, 120);
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
    cy.fit(visible, 80);

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
    cy.fit(visible, 80);

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

function showSessionExpired() {
  document.getElementById('session-expired').classList.add('active');
}

function setupInteractions(cy, wsRef, addBadge, youCy, buddyCy, pairingState) {

  async function safeQuery(type, query, params = {}) {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      if (Date.now() - wsRef.lastActivity > wsRef.maxIdleMs) {
        // Truly idle for > 60 min — session ended
        throw new Error('session_expired');
      }
      // Socket dropped (e.g. mobile background/screen lock) but within session window
      // — reconnect transparently so the user can continue without interruption
      wsRef.current = await connectWS();
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
  let lastClusterNode = null;
  let currentClusterColour = null;
  let lastParentNode = null;

  // --- Help text with downloading indicator ---
  const helpEl = document.getElementById('help-text');
  let currentHelpText = helpEl.textContent;
  let isDownloading = false;

  function setHelpText(text) {
    currentHelpText = text;
    helpEl.textContent = isDownloading ? text + ' — downloading' : text;
  }

  function setDownloading(active) {
    isDownloading = active;
    helpEl.textContent = isDownloading ? currentHelpText + ' — downloading' : currentHelpText;
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
      position: { x: 0, y: 18 }
    });
    const chip = youCy.getElementById(id);
    if (abbreviated)  chip.addClass('abbreviated');
    if (isSubfamily)  chip.addClass('subfamily');
    const w = chip.width();
    chip.position({ x: youChipX + w / 2, y: 18 });

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
      if (sendWs && sendWs.readyState === WebSocket.OPEN) {
        sendWs.send(JSON.stringify({
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
        }));
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
      position: { x: 0, y: 18 }
    });
    const chip = buddyCy.getElementById(id);
    if (abbreviated)  chip.addClass('abbreviated');
    if (isSubfamily)  chip.addClass('subfamily');
    const w = chip.width();
    chip.position({ x: buddyChipX + w / 2, y: 18 });

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

  let buddyHoveredId = null;
  buddyContainer.addEventListener('mousemove', evt => {
    if (recentTouch) return;
    const rect    = buddyContainer.getBoundingClientRect();
    const pan     = buddyCy.pan();
    const canvasX = evt.clientX - rect.left - pan.x;
    const canvasY = evt.clientY - rect.top  - pan.y;
    const hit = buddyCy.nodes().filter(n => {
      const bb = n.boundingBox();
      return canvasX >= bb.x1 && canvasX <= bb.x2 && canvasY >= bb.y1 && canvasY <= bb.y2;
    }).first();
    if (!hit.length) { buddyHoveredId = null; hideTooltip(); return; }
    if (hit.id() === buddyHoveredId) return;
    buddyHoveredId = hit.id();
    const content = buildBuddyChipTooltip(hit);
    if (!content) { hideTooltip(); return; }
    tooltip.textContent = content;
    tooltip.style.display = 'block';
    const bb = hit.renderedBoundingBox();
    positionTooltip(rect.left + (bb.x1 + bb.x2) / 2, rect.bottom);
  });
  buddyContainer.addEventListener('mouseleave', () => { buddyHoveredId = null; hideTooltip(); });

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
        buddyTouchPending = null;
        hideTooltip();
        if (main.length) handleNodeTap(main);
      } else {
        const content = buildBuddyChipTooltip(chip);
        if (content) {
          tooltip.textContent = content;
          tooltip.style.display = 'block';
          tooltip.style.left = '14px';
          tooltip.style.top  = (buddyContainer.getBoundingClientRect().bottom + 6) + 'px';
        }
        buddyTouchPending = chip.id();
        buddyTouchTimer = setTimeout(() => { buddyTouchPending = null; buddyTouchTimer = null; }, 800);
      }
      return;
    }

    hideTooltip();
    if (main.length) handleNodeTap(main);
  });

  // --- youCy chip interactions ---

  const youContainer = document.getElementById('cy-you');
  let youTouchPending = null;
  let youTouchTimer   = null;

  let youHoveredId = null;
  youContainer.addEventListener('mousemove', evt => {
    if (recentTouch) return;
    const rect    = youContainer.getBoundingClientRect();
    const pan     = youCy.pan();
    const canvasX = evt.clientX - rect.left - pan.x;
    const canvasY = evt.clientY - rect.top  - pan.y;
    const hit = youCy.nodes().filter(n => {
      const bb = n.boundingBox();
      return canvasX >= bb.x1 && canvasX <= bb.x2 && canvasY >= bb.y1 && canvasY <= bb.y2;
    }).first();
    if (!hit.length) { youHoveredId = null; hideTooltip(); return; }
    if (hit.id() === youHoveredId) return;
    youHoveredId = hit.id();
    const main = cy.getElementById(hit.data('mainId'));
    if (!main.length) { hideTooltip(); return; }
    const content = buildTooltipContent(main);
    if (!content) { hideTooltip(); return; }
    tooltip.textContent = content;
    tooltip.style.display = 'block';
    const bb = hit.renderedBoundingBox();
    positionTooltip(rect.left + (bb.x1 + bb.x2) / 2, rect.bottom);
  });
  youContainer.addEventListener('mouseleave', () => { youHoveredId = null; hideTooltip(); });

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
        youTouchPending = null;
        hideTooltip();
        handleNodeTap(main);
      } else {
        const content = buildTooltipContent(main);
        if (content) {
          tooltip.textContent = content;
          tooltip.style.display = 'block';
          const rect = youContainer.getBoundingClientRect();
          tooltip.style.left = '14px';
          tooltip.style.top  = (rect.bottom + 6) + 'px';
        }
        youTouchPending = chip.id();
        youTouchTimer = setTimeout(() => { youTouchPending = null; youTouchTimer = null; }, 800);
      }
      return;
    }

    hideTooltip();
    handleNodeTap(main);
  });

  function markRecentTouch() {
    recentTouch = true;
    clearTimeout(recentTouchTimer);
    recentTouchTimer = setTimeout(() => { recentTouch = false; }, 600);
  }

  // Tooltip

  function buildTooltipContent(node) {
    const type = node.data('type');
    if (type === 'root')     return node.data('text') || node.data('name') || 'ButterflyDreaming';
    if (type === 'Entry')    return node.data('text') || node.data('name') || '';
    if (type === 'Family')   return node.data('text') || node.data('name') || '';
    if (type === 'Cluster')   return node.data('text') || node.data('label') || node.data('name') || '';
    if (type === 'TextNode') {
      const title = node.data('title') || '';
      const text = node.data('text') || '';
      const body = text.split('\n').filter(l => l.trim()).join('\n');
      return title ? `${title}\n${body}` : body;
    }
    return '';
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

  // Desktop hover dwell — skipped if a touch event recently fired
  cy.on('mouseover', 'node', evt => {
    if (recentTouch) return;
    const rp = evt.renderedPosition;
    startDwell(evt.target, rp.x, rp.y, false);
  });

  cy.on('mousemove', 'node', evt => {
    if (recentTouch) return;
    if (tooltip.style.display !== 'none') {
      positionTooltip(evt.renderedPosition.x, evt.renderedPosition.y);
    } else if (!dwellTimer) {
      // mouseover can be missed on fast entry — mousemove rescues it
      const rp = evt.renderedPosition;
      startDwell(evt.target, rp.x, rp.y, false);
    }
  });

  cy.on('mouseout', 'node', () => {
    if (recentTouch) return;
    // Delay so cursor can move onto an interactive tooltip without it disappearing
    setTimeout(() => {
      if (!tooltip.matches(':hover')) { cancelDwell(); hideTooltip(); }
    }, 100);
  });

  tooltip.addEventListener('mouseleave', () => { cancelDwell(); hideTooltip(); });

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
      cy.fit(cy.elements(':visible'), 60);
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
    cy.edges().filter(e =>
      e.source().visible() && e.target().visible() && e.data('type') !== 'CHILD'
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
    editSelectedClusterId  = null;
    editSelectedTextNodeId = null;
  }

  function applyEditChipSelection(selectedClusterId) {
    editSelectedClusterId = selectedClusterId;
    const selectedCluster = cy.getElementById(selectedClusterId);
    const selectedColour  = selectedCluster.data('colour');
    const selectedName    = selectedCluster.data('display_name') || selectedCluster.data('name') || '';

    const chipW = 48, chipH = 21;

    // Clear text node selection when cluster focus changes
    if (editSelectedTextNodeId) {
      cy.getElementById(editSelectedTextNodeId).removeStyle('border-width border-color border-opacity');
      editSelectedTextNodeId = null;
    }

    // All chips full opacity; selected gets a 2px white border expanding into gap space
    cy.nodes('[type="ClusterEditChip"]').forEach(chip => {
      const sel = chip.data('mainClusterId') === selectedClusterId;
      chip.style({
        'opacity':        1.0,
        'width':          sel ? chipW + 4 : chipW,
        'height':         sel ? chipH + 4 : chipH,
        'border-width':   sel ? 2 : 0,
        'border-color':   '#ffffff',
        'border-opacity': 1,
      });
    });

    // Update the current cluster node above the text grid to reflect the selection
    if (lastClusterNode && lastClusterNode.length) {
      lastClusterNode.style({
        'background-color': selectedColour,
        'label':            selectedName,
      });
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
  }

  function applyEditTextSelection(node) {
    const chipW = 48, chipH = 21;

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

    // Grey border on chips linked to this text node, except the currently selected cluster chip
    cy.nodes('[type="ClusterEditChip"]').forEach(chip => {
      const cid = chip.data('mainClusterId');
      if (cid === editSelectedClusterId) return;  // leave selected chip unchanged
      const linked = linkedClusterIds.has(cid);
      chip.style({
        'width':          linked ? chipW + 4 : chipW,
        'height':         linked ? chipH + 4 : chipH,
        'border-width':   linked ? 2 : 0,
        'border-color':   '#888888',
        'border-opacity': linked ? 1 : 0,
      });
    });
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
    const nodeW    = Math.max(40, Math.min(70, Math.round(640 / cols)));
    const nodeH    = Math.round(nodeW * 0.57);
    const fontSize = nodeW >= 60 ? 12 : nodeW >= 50 ? 11 : 10;
    const gapX     = 10;
    const gapY     = 10;
    const originX  = 50;
    const clusterX = 0;
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

      const chipW = 48, chipH = 21, chipGapX = 5, chipGapY = 5;
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
      padding: 50,
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
        expandToCluster(node);
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

    if (node.data('name') === 'Settling') {
      const defaultTrack = mediaFilesList.find(f => /^D_/i.test(f.name))?.name || mediaFilesList[0]?.name || '';
      toggleMediaBar('Settling', defaultTrack);
      setHelpText('Optionally, use the player above.');
    } else if (type === 'Cluster') {
      setHelpText('Enter one of the Works shown');
    } else if (type === 'TextNode' && node.data('section_title')) {
      setHelpText('To return enter a text node, search rectangle or breadcrumb');
    } else if (type === 'TextNode' && node.data('gateway')) {
      setHelpText(isTouchDevice ? 'Double tap a node for further context' : 'Click a node for further context');
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
          tapResetTimer = setTimeout(() => { touchPendingNodeId = null; tapResetTimer = null; }, 800);
        }
        return;
      }

      const sameNode    = touchPendingNodeId === node.id();
      const withinWindow = tapResetTimer !== null;
      clearTimeout(tapResetTimer);
      tapResetTimer = null;

      if (sameNode && withinWindow) {
        // Double tap (two taps within 800ms) — navigate regardless of tooltip state
        hideTooltip();
        touchPendingNodeId = null;
        handleNodeTap(node);
      } else if (tooltipNodeId === node.id()) {
        // Tap same node while its tooltip is showing — dismiss
        hideTooltip();
        touchPendingNodeId = node.id();
        tapResetTimer = setTimeout(() => { touchPendingNodeId = null; tapResetTimer = null; }, 800);
      } else {
        // Show tooltip for this node
        hideTooltip();
        touchPendingNodeId = node.id();
        showTooltip(node, 0, 0, true);
        tapResetTimer = setTimeout(() => { touchPendingNodeId = null; tapResetTimer = null; }, 800);
      }
      return;
    }

    // Desktop click — navigate immediately
    hideTooltip();
    touchPendingNodeId = null;
    handleNodeTap(node);
  });

  // Tap on empty canvas — hide tooltip and reset touch state
  cy.on('tap', evt => {
    if (evt.target !== cy) return;
    if (isTouchEvent(evt)) {
      hideTooltip();
      clearTimeout(tapResetTimer);
      tapResetTimer = null;
      touchPendingNodeId = null;
    }
  });

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
    if (!wsNow || wsNow.readyState !== WebSocket.OPEN) { devStatus('ws not open'); return; }
    wsNow.addEventListener('message', function handler(event) {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.type !== 'write_hints') return;
      wsNow.removeEventListener('message', handler);
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
    wsNow.send(JSON.stringify({ type: 'write_hints', code, hints }));
    devStatus('writing…');
  });

  document.getElementById('dev-reset').addEventListener('click', () => {
    if (!lastParentNode) { devStatus('tap a family first'); return; }
    runLayout(cy, lastParentNode);
    devStatus('reset');
  });

  return { appendBuddyChip, resetBuddyBar };

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
    if (!nr || nr <= 0) return;
    if (badges.has(node.id())) {
      badges.get(node.id()).textContent = String(nr);
      return;
    }
    const div = document.createElement('div');
    div.textContent = String(nr);
    div.style.cssText = 'position:absolute;font-size:9px;font-family:sans-serif;line-height:1;display:none;transform:translate(-50%,-100%);';
    div.style.color = node.data('gateway') ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.65)';
    overlay.appendChild(div);
    badges.set(node.id(), div);
  }

  return { addBadge };
}

// --- WebSocket helpers ---

function connectWS() {
  return new Promise((resolve, reject) => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}`);
    ws.onopen  = () => resolve(ws);
    ws.onerror = ()  => reject(new Error('WebSocket connection failed'));
  });
}

function queryWS(ws, type, query, params = {}) {
  return new Promise((resolve, reject) => {
    function handler(event) {
      let msg;
      try { msg = JSON.parse(event.data); } catch (e) { return; }
      if (msg.type !== type) return;
      ws.removeEventListener('message', handler);
      if (msg.error) reject(new Error(msg.error));
      else resolve(msg.records);
    }
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ type, query, params }));
  });
}

// --- Boot ---

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


async function init() {
  document.getElementById('help-text').textContent = helpText;


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
      try { ws = await connectWS(); break; }
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
      ws.close(); // close so stale message listeners are dropped
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

  computeBlendedColours(cy);
  cy.elements().hide();
  const root = cy.nodes('[type="root"]').first();
  root.show();
  cy.fit(root, 120);

  const MAX_IDLE_MS = 60 * 60 * 1000; // 60 min idle → session considered ended
  const wsRef = { current: ws, lastActivity: Date.now(), maxIdleMs: MAX_IDLE_MS };

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
    userZoomingEnabled: false,
    userPanningEnabled: false,
    boxSelectionEnabled: false,
  });

  const buddyCy = cytoscape({
    container: document.getElementById('cy-buddy'),
    elements: [],
    style: buildStyle(),
    layout: { name: 'preset' },
    zoom: 1,
    userZoomingEnabled: false,
    userPanningEnabled: false,
    boxSelectionEnabled: false,
  });

  const pairingState = { active: false };

  const pairBtn    = document.getElementById('pair-btn');
  const pairStatus = document.getElementById('pair-status');

  pairBtn.addEventListener('click', () => {
    wsRef.lastActivity = Date.now();
    pairBtn.disabled = true;
    ws.send(JSON.stringify({ type: 'ready_to_pair' }));
  });

  document.getElementById('edit-mode-cb').addEventListener('change', e => {
    if (editModeUnlocked) {
      editModeActive = e.target.checked;
      return;
    }
    // Validate against server using the code already in the dev-code field
    const code = document.getElementById('dev-code').value.trim();
    if (!code) { e.target.checked = false; return; }
    const wsNow = wsRef.current;
    if (!wsNow || wsNow.readyState !== WebSocket.OPEN) { e.target.checked = false; return; }
    const devStatusEl = document.getElementById('dev-status');
    wsNow.addEventListener('message', function handler(event) {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.type !== 'write_hints') return;
      wsNow.removeEventListener('message', handler);
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
    wsNow.send(JSON.stringify({ type: 'write_hints', code, hints: [] }));
  });

  const { addBadge }      = setupNrBadges(cy);
  const { appendBuddyChip, resetBuddyBar } = setupInteractions(cy, wsRef, addBadge, youCy, buddyCy, pairingState);

  const userCountPanel = document.getElementById('user-count-panel');

  ws.send(JSON.stringify({ type: 'get_user_count' }));
  ws.send(JSON.stringify({ type: 'get_media_files' }));

  ws.addEventListener('message', event => {
    let msg;
    try { msg = JSON.parse(event.data); } catch (e) { return; }
    if (msg.type === 'user_count') {
      userCountPanel.textContent = `${msg.count} connected`;
      userCountPanel.classList.add('active');
      return;
    }
    if (msg.type === 'media_files') {
      mediaFilesList = msg.files;
      return;
    }
    if (msg.type === 'wait_state') {
      pairStatus.textContent = 'Waiting...';
    } else if (msg.type === 'paired') {
      resetBuddyBar();
      pairBtn.style.display = 'none';
      pairStatus.textContent = 'Paired';
      pairingState.active = true;
    } else if (msg.type === 'buddy_disconnected') {
      pairingState.active = false;
      buddyCy.nodes().addClass('buddy-gone');
      pairStatus.textContent = 'Waiting...';
      ws.send(JSON.stringify({ type: 'ready_to_pair' }));
    } else if (msg.type === 'buddy_breadcrumb') {
      appendBuddyChip(msg.data);
    }
  });
}

window.addEventListener('DOMContentLoaded', init);

// iOS Safari bfcache: when the user presses the browser back button, Safari may
// restore a frozen JS snapshot (an earlier graph state) rather than navigating away.
// Force a reload in that case so the browser back button behaves normally.
window.addEventListener('pageshow', event => {
  if (event.persisted) window.location.reload();
});
