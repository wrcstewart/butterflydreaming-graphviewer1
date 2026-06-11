// viewer.js — ButterflyDreaming Graph Viewer

const DWELL_MS   = 200;   // ms before tooltip displays
const DWELL_FIRE = 300;   // ms before DWELL_MS to fire prefetch query

// Vertical top of main graph canvas — tooltips must not appear above this line
const BARS_BOTTOM = 158; // bc-spacer(50) + help-bar(26) + cy-buddy(36) + gap(10) + cy-you(36)

const isTouchDevice = navigator.maxTouchPoints > 0;
const helpText = isTouchDevice
  ? 'Single tap any node to read — double tap to navigate.'
  : 'Hover any node to read — click to navigate.';

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
  ];
}

// --- Layout ---

function runLayout(cy) {
  const visible = cy.elements(':visible');
  if (visible.nodes().length <= 1) {
    cy.fit(visible, 120);
    return;
  }

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
  } else {
    // Cluster / content views — fCoSE as normal.
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

  // --- You breadcrumb chips ---
  let youChipCount = 0;
  let youChipX = 0;
  let lastYouChipId = null;
  let lastYouSourceText = null;

  function addYouChip(node) {
    const type        = node.data('type');
    const sourceText  = type === 'TextNode' ? (node.data('source_text') || null) : null;
    const seq         = node.data('seq') ?? null;
    const abbreviated = type === 'TextNode' && sourceText !== null && sourceText === lastYouSourceText;
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
    const abbreviated = type === 'TextNode' && sourceText !== null && sourceText === lastBuddySourceText;
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
        if (main.length) handleNodeTap(main, false);
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
    if (main.length) handleNodeTap(main, false);
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
        handleNodeTap(main, false);
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
    handleNodeTap(main, false);
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
      const lines = text.split('\n').filter(l => l.trim());
      let body = lines.slice(0, 6).join('\n');
      if (lines.length > 6) body += '\n…';
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

  function saveState() {
    history.push(cy.elements(':visible').map(el => el.id()));
  }

  function restoreState() {
    if (history.length === 0) return false;
    const ids = new Set(history.pop());
    cy.elements().hide();
    cy.elements().filter(el => ids.has(el.id())).show();
    runLayout(cy);
    return true;
  }

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
    activeNodeId = familyNode.id();
    cy.elements().hide();
    familyNode.show();

    // Show all DESCENDS_FROM edges connected to this family (both directions)
    // and their neighbouring nodes — gives Conversations context above and Buds below
    const descEdges = familyNode.connectedEdges('[type="DESCENDS_FROM"]');
    descEdges.show();
    descEdges.connectedNodes().show();

    runLayout(cy);
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
    runLayout(cy);
  }

  function exitSnakeView() {
    cy.$('.snake-section').forEach(n => {
      n.removeClass('snake-section');
      n.removeStyle('background-color background-opacity width height font-size');
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
    const stepX    = nodeW + gapX;
    const stepY    = nodeH + gapY;
    const originX  = 50;
    const headerY  = 30;

    parts.forEach(n => {
      n.show();
      n.addClass('snake-section');
      const linked = clusterNode &&
        n.outgoers('edge[type="CLUSTER_REL"]')
         .filter(e => e.target().id() === clusterNode.id()).length > 0;
      n.style({
        'width':              nodeW,
        'height':             nodeH,
        'font-size':          fontSize + 'px',
        'background-color':   linked && clusterColour ? clusterColour : '#1a1a1a',
        'background-opacity': 0.7,
      });
    });

    const positions = {};
    let hx = originX;
    if (clusterNode && clusterNode.length) {
      positions[clusterNode.id()] = { x: hx, y: headerY };
      hx += stepX * 2;
    }
    positions[titlePage.id()] = { x: hx, y: headerY };

    const gridY = headerY + stepY * 2;
    parts.forEach((n, i) => {
      const row      = Math.floor(i / cols);
      const col      = i % cols;
      const snakeCol = (row % 2 === 0) ? col : (cols - 1 - col);
      positions[n.id()] = { x: originX + snakeCol * stepX, y: gridY + row * stepY };
    });

    cy.layout({
      name: 'preset',
      positions,
      animate: true,
      animationDuration: 400,
      fit: true,
      padding: 40,
    }).run();
  }

  // Media bar

  const mediaBar = document.getElementById('media-bar');

  function fmtTime(s) {
    if (!isFinite(s)) return '–:––';
    const m = Math.floor(s / 60);
    return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  }

  function toggleMediaBar(label, audioSrc) {
    if (mediaBar.classList.contains('active') && mediaBar.dataset.node === label) {
      return;  // already open — only ✕ closes the player
    }
    const existingAudio = mediaBar.querySelector('audio');
    if (existingAudio) { existingAudio.pause(); existingAudio.src = ''; }
    mediaBar.innerHTML =
      `<span class="media-label">${label}</span>` +
      `<button class="mp-btn" aria-label="play">▶</button>` +
      `<span class="mp-time">–:–– / –:––</span>` +
      `<audio src="${audioSrc}"></audio>` +
      `<button class="media-close" aria-label="close">✕</button>`;
    mediaBar.dataset.node = label;
    mediaBar.classList.add('active');

    const audio = mediaBar.querySelector('audio');
    const btn   = mediaBar.querySelector('.mp-btn');
    const time  = mediaBar.querySelector('.mp-time');

    btn.addEventListener('click', () => {
      if (audio.paused) { audio.play(); btn.textContent = '⏸'; }
      else              { audio.pause(); btn.textContent = '▶'; }
    });
    audio.addEventListener('timeupdate', () => {
      time.textContent = fmtTime(audio.currentTime) + ' / ' + fmtTime(audio.duration);
    });
    audio.addEventListener('ended', () => { btn.textContent = '▶'; });
  }

  mediaBar.addEventListener('click', evt => {
    if (evt.target.classList.contains('media-close')) {
      mediaBar.classList.remove('active');
      mediaBar.dataset.node = '';
      mediaBar.innerHTML = '';
    }
  });

  // Tap handler

  function handleNodeTap(node, addChip = true) {
    wsRef.lastActivity = Date.now();
    const type = node.data('type');

    if (addChip && (type === 'Family' || type === 'Cluster' || type === 'TextNode')) {
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

    const helpEl = document.getElementById('help-text');
    if (node.data('name') === 'Settling') {
      toggleMediaBar('Settling', 'ChineseSad1.mp3');
      helpEl.textContent = 'Optionally, use the player at the top right.';
    } else if (type === 'Cluster') {
      helpEl.textContent = 'Enter one of the Works shown';
    } else if (type === 'TextNode' && node.data('section_title')) {
      helpEl.textContent = 'To return enter a text node, search rectangle or breadcrumb';
    } else if (type === 'TextNode' && !node.data('gateway')) {
      helpEl.textContent = 'Enter the grey section title to see the whole story/poem etc';
    } else if (type === 'Family' && node.hasClass('subfamily')) {
      helpEl.textContent = 'Keep browsing or, enter a rectangle.';
    } else if (type === 'Family') {
      helpEl.textContent = 'Choose a sub family or a search term (rectangle)';
    } else {
      helpEl.textContent = helpText;
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

  const { addBadge }      = setupNrBadges(cy);
  const { appendBuddyChip, resetBuddyBar } = setupInteractions(cy, wsRef, addBadge, youCy, buddyCy, pairingState);

  ws.addEventListener('message', event => {
    let msg;
    try { msg = JSON.parse(event.data); } catch (e) { return; }
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
