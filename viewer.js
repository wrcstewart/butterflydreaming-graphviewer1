// viewer.js — ButterflyDreaming Graph Viewer

const DWELL_MS   = 200;   // ms before tooltip displays
const DWELL_FIRE = 300;   // ms before DWELL_MS to fire prefetch query

// Vertical top of main graph canvas — tooltips must not appear above this line
const BARS_BOTTOM = 132; // bc-spacer(50) + cy-buddy(36) + gap(10) + cy-you(36)

const FAMILY_COLOURS = {
  Nature:   '#4A8C4F',
  Emotion:  '#C0504D',
  Reason:   '#4A7BC0',
  Spirit:   '#9B6B9B',
  Symbolic: '#C09A3A',
  Arts:     '#C47A5A',
};

const EDGE_COLOURS = {
  RESONATES_WITH: '#4A90D9',
  BRIDGES_TO:     '#E8A838',
  ECHOES:         '#9B59B6',
  TAGGED_AS:      '#888888',
  CHILD:          '#4A8C4F',
  GIVES:          '#E85A38',
  CONTAINS:       '#444444',
  DESCENDS_FROM:  '#444444',
};

const EDGE_WIDTHS = {
  RESONATES_WITH: 2,
  BRIDGES_TO:     4,
  ECHOES:         1,
  TAGGED_AS:      1,
  CHILD:          2,
  GIVES:          2,
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
  const src = props.source_text;
  const seq = props.seq;
  if (src && seq !== undefined && seq !== null) return `${src}: ${seq}`;
  return shortText(props.text, 5);
}

function buildNodeData(n) {
  const labels = n.labels || [];
  const props = flattenProps(n.properties || {});
  const id = getElementId(n);

  if (labels.includes('Family')) {
    return Object.assign({}, props, {
      id, type: 'Family',
      display_name: props.name || '',
      colour: FAMILY_COLOURS[props.name] || '#aaaaaa',
    });
  }
  if (labels.includes('Cluster')) {
    const fc = FAMILY_COLOURS[props.family_primary];
    return Object.assign({}, props, {
      id, type: 'Cluster',
      // display_name: short form for in-node rendering (Neo4j property, 1-2 words)
      // label:        full name for tooltip (Neo4j property, preserved from props)
      display_name: props.display_name || props.name || '',
      colour: fc ? desaturate(fc) : '#666666',
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
    colour: props.family_colour || EDGE_COLOURS[type] || '#666666',
    width: EDGE_WIDTHS[type] || 1,
  });
}

// --- Cytoscape stylesheet ---

function buildStyle() {
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(colour)',
        'background-opacity': 0.8,
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
        'width': 53,
        'height': 22,
        'font-size': '10px',
        'text-max-width': '48px',
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
      selector: 'node[type="TextNode"]',
      style: {
        'width': 120,
        'height': 34,
        'background-color': '#111111',
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
        'opacity': 0.65,
        'target-arrow-shape': 'none',
      }
    },
    {
      selector: 'edge[type="CHILD"]',
      style: {
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.2,
        'opacity': 1,
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
      selector: 'node[type="Search_CW"]',
      style: {
        'shape': 'rectangle',
        'width': 108,
        'height': 34,
        'border-width': 1,
        'border-color': function(node) {
          const hex = (node.data('colour') || '#666666').replace('#', '');
          const r = Math.round(parseInt(hex.slice(0,2), 16) / 3).toString(16).padStart(2,'0');
          const g = Math.round(parseInt(hex.slice(2,4), 16) / 3).toString(16).padStart(2,'0');
          const b = Math.round(parseInt(hex.slice(4,6), 16) / 3).toString(16).padStart(2,'0');
          return `#${r}${g}${b}`;
        },
        'border-opacity': 0.6,
        'font-size': '10px',
        'text-max-width': '101px',
      }
    },
    {
      selector: 'edge[type="HAS_SEARCH_CW"]',
      style: {
        'line-color': '#aaaaaa',
        'width': 1,
        'line-style': 'dashed',
        'opacity': 0.75,
        'target-arrow-shape': 'none',
      }
    },
    {
      selector: 'edge[type="HAS_GATEWAY"]',
      style: {
        'line-color': '#aaaaaa',
        'width': 1,
        'line-style': 'solid',
        'opacity': 0.75,
        'target-arrow-shape': 'none',
      }
    },
    {
      selector: 'edge[type="DESCENDS_FROM"]',
      style: { 'opacity': 0.5, 'target-arrow-shape': 'none' }
    },
    {
      selector: 'node[type="TextNode"][?gateway]',
      style: {
        'text-transform': 'uppercase',
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
      selector: 'node.read-mode-section',
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

function setupInteractions(cy, wsRef, addBadge, youCy, buddyCy, pairingState, readModeState) {

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
  let lastSearchCWNode = null;
  let syntheticEdgeIds = new Set();
  let readModeActive   = false;

  // --- You breadcrumb chips ---
  let youChipCount = 0;
  let youChipX = 0;
  let lastYouChipId = null;
  let lastYouSourceText = null;

  function chipWidth(type) {
    if (type === 'Family')    return 53;
    if (type === 'TextNode')  return 120;
    if (type === 'Search_CW') return 108;
    return 70; // Cluster
  }

  function addYouChip(node) {
    const type       = node.data('type');
    const sourceText = type === 'TextNode' ? (node.data('source_text') || null) : null;
    const seq        = node.data('seq') ?? null;
    const abbreviated = type === 'TextNode' && sourceText !== null && sourceText === lastYouSourceText;
    const w           = abbreviated ? 40 : chipWidth(type);
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
        clusterNodeId: lastClusterNode ? lastClusterNode.id() : null,
        gateway:       node.data('gateway') || false,
      },
      position: { x: youChipX + w / 2, y: 18 }
    });
    if (abbreviated) youCy.getElementById(id).addClass('abbreviated');
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
    youCy.getElementById(id).addClass('latest');
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
            gateway:       node.data('gateway') || false,
            clusterNodeId: lastClusterNode ? lastClusterNode.id() : null,
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
    const w           = abbreviated ? 40 : chipWidth(type);
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
        gateway:       data.gateway || false,
        clusterNodeId: data.clusterNodeId || null,
      },
      position: { x: buddyChipX + w / 2, y: 18 }
    });
    if (lastBuddyChipId) {
      buddyCy.add({
        group: 'edges',
        data: { id: 'buddy_e_' + id, source: lastBuddyChipId, target: id, colour: '#333333', weight: 0.2 }
      });
    }
    if (abbreviated) buddyCy.getElementById(id).addClass('abbreviated');
    buddyCy.getElementById(id).addClass('latest');
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
    if (chip.data('type') === 'Search_CW') {
      const work        = chip.data('name') || '';
      const clusterNode = cy.getElementById(chip.data('clusterNodeId'));
      const clusterName = clusterNode.length ? clusterNode.data('name') : '';
      return (work && clusterName) ? `${work} : filtered by: ${clusterName}` : work;
    }
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
    let content;
    if (hit.data('type') === 'Search_CW') {
      // Use stored clusterNodeId — not lastClusterNode which reflects current nav state
      const work        = hit.data('name') || '';
      const clusterNode = cy.getElementById(hit.data('clusterNodeId'));
      const clusterName = clusterNode.length ? clusterNode.data('name') : '';
      content = (work && clusterName) ? `${work} : filtered by: ${clusterName}` : work;
    } else {
      const main = cy.getElementById(hit.data('mainId'));
      if (!main.length) { hideTooltip(); return; }
      content = buildTooltipContent(main);
    }
    if (!content) { hideTooltip(); return; }
    tooltip.textContent = content;
    tooltip.style.display = 'block';
    const bb = hit.renderedBoundingBox();
    positionTooltip(rect.left + (bb.x1 + bb.x2) / 2, rect.bottom);
  });
  youContainer.addEventListener('mouseleave', () => { youHoveredId = null; hideTooltip(); });

  youCy.on('tap', 'node', evt => {
    const chip = evt.target;

    // Resolve main graph node — for Search_CW the original may have been cleared,
    // so fall back to a data proxy carrying stored source_text/name/colour
    let main = cy.getElementById(chip.data('mainId'));
    if (!main.length) {
      if (chip.data('type') === 'Search_CW') {
        const clusterNode = cy.getElementById(chip.data('clusterNodeId'));
        if (clusterNode.length) lastClusterNode = clusterNode;
        const d = {
          type: 'Search_CW',
          source_text: chip.data('source_text'),
          name:        chip.data('name'),
          colour:      chip.data('colour'),
        };
        main = { data: k => d[k], id: () => chip.data('mainId') };
      } else {
        return;
      }
    } else if (chip.data('type') === 'Search_CW') {
      const clusterNode = cy.getElementById(chip.data('clusterNodeId'));
      if (clusterNode.length) lastClusterNode = clusterNode;
    }

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
    if (type === 'Search_CW') {
      const work = node.data('name') || '';
      const cluster = lastClusterNode ? lastClusterNode.data('name') : '';
      return (work && cluster) ? `${work} : filtered by: ${cluster}` : work;
    }
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

    cy.nodes('[type="Cluster"]:visible').addClass('family-view');
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

  // Search_CW — virtual cluster-work navigation nodes

  function clearSearchCWNodes() {
    cy.$('[type="Search_CW"]').remove();
    syntheticEdgeIds.forEach(id => { const el = cy.getElementById(id); if (el.length) el.remove(); });
    syntheticEdgeIds.clear();
    lastSearchCWNode = null;
  }

  async function expandToCluster(clusterNode) {
    clearFamilyView();
    lastClusterNode = clusterNode;
    currentClusterColour = clusterNode.data('colour');
    clearSearchCWNodes();
    saveState();
    activeNodeId = clusterNode.id();
    cy.elements().hide();

    clusterNode.show();
    const connEdges = clusterNode.connectedEdges();
    connEdges.forEach(edge => {
      const other = edge.source().id() === clusterNode.id() ? edge.target() : edge.source();
      if (other.data('type') === 'Family') { edge.show(); other.show(); }
    });
    runLayout(cy);

    const clusterName = clusterNode.data('name');
    let records;
    try {
      records = await safeQuery('scwCreate',
        'MATCH (n:TextNode)-[]->(c:Cluster {name: $clusterName}) ' +
        'WHERE n.gateway = false ' +
        'RETURN DISTINCT n.source_text AS work, count(n) AS chapterCount ' +
        'ORDER BY chapterCount DESC',
        { clusterName }
      );
    } catch (err) {
      if (err.message === 'session_expired') {
        showSessionExpired();
      } else {
        console.error('[BD] Search_CW create error:', err);
      }
      return;
    }

    if (!records.length) return;

    for (const rec of records) {
      const work = rec.work;
      const count = Number(rec.chapterCount || 0);
      if (!work) continue;
      const nodeId = 'search_cw_' + work.replace(/\W+/g, '_');
      cy.add([
        {
          group: 'nodes',
          data: {
            id: nodeId,
            type: 'Search_CW',
            name: work,
            display_name: work,
            colour: currentClusterColour,
            n_r: count,
            source_text: work,
          }
        },
        {
          group: 'edges',
          data: {
            id: 'scw_edge_' + nodeId,
            source: clusterNode.id(),
            target: nodeId,
            type: 'HAS_SEARCH_CW',
            colour: '#666666',
          }
        }
      ]);
      addBadge(cy.getElementById(nodeId));
    }
    runLayout(cy);

    // After fCoSE settles, arrange tracker nodes in a horizontal row below the cluster
    setTimeout(() => {
      const trackers = cy.nodes('[type="Search_CW"]:visible');
      if (!trackers.length) return;
      const spacing = 110;
      const rowX = clusterNode.position().x - ((trackers.length - 1) * spacing) / 2;
      const rowY = clusterNode.position().y + 150;
      trackers.forEach((n, i) => n.position({ x: rowX + i * spacing, y: rowY }));
      cy.fit(cy.elements(':visible'), 60);
    }, 500);
  }

  async function handleSearchCWTap(node) {
    if (!lastClusterNode) return;
    const work = node.data('source_text');
    const clusterName = lastClusterNode.data('name');
    let records;
    try {
      records = await safeQuery('scwClick',
        'MATCH (gw:TextNode {source_text: $work, gateway: true}) ' +
        'OPTIONAL MATCH (n:TextNode {source_text: $work, gateway: false})-[]->(c:Cluster {name: $clusterName}) ' +
        'RETURN gw, n',
        { work, clusterName }
      );
    } catch (err) {
      if (err.message === 'session_expired') {
        showSessionExpired();
      } else {
        console.error('[BD] Search_CW click error:', err);
      }
      return;
    }

    const showIds = new Set([lastClusterNode.id()]);
    let gwId = null;
    for (const rec of records) {
      if (rec.gw) { const id = getElementId(rec.gw); showIds.add(id); if (!gwId) gwId = id; }
      if (rec.n)  showIds.add(getElementId(rec.n));
    }

    // Guarantee a visible line from cluster to gateway even if no direct relationship exists
    if (gwId) {
      const synId = 'syn_gw_' + gwId;
      if (!cy.getElementById(synId).length) {
        cy.add({ group: 'edges', data: {
          id: synId, source: lastClusterNode.id(), target: gwId,
          type: 'HAS_GATEWAY', colour: '#aaaaaa',
        }});
        syntheticEdgeIds.add(synId);
      }
    }

    lastSearchCWNode = node;
    cy.$('[type="Search_CW"]').hide();

    saveState();
    activeNodeId = node.id();
    cy.elements().hide();
    showIds.forEach(id => { const el = cy.getElementById(id); if (el.length) el.show(); });
    // Show non-CHILD edges between visible nodes (cluster↔gateway, chapter↔cluster, etc.)
    // CHILD sequence arrows suppressed — too many for corpus navigation context
    cy.edges().filter(e =>
      e.source().visible() && e.target().visible() && e.data('type') !== 'CHILD'
    ).show();
    runLayout(cy);
  }

  function exitReadMode() {
    if (!readModeActive) return;
    readModeActive = false;
    cy.$('.read-mode-section').forEach(n => {
      n.removeClass('read-mode-section');
      n.removeStyle('background-color background-opacity width height font-size');
    });
  }

  async function handleReadModeTap(node) {
    const work = node.data('source_text') || node.data('name');
    if (!work) return;

    const clusterNode   = lastClusterNode;
    const clusterName   = clusterNode ? clusterNode.data('name')   : null;
    const clusterColour = clusterNode ? clusterNode.data('colour') : null;

    let records;
    try {
      records = await safeQuery('readModeSeq',
        'MATCH (n:TextNode {source_text: $work}) RETURN n ORDER BY n.seq',
        { work }
      );
    } catch (err) {
      if (err.message === 'session_expired') showSessionExpired();
      else console.error('[BD] Read mode error:', err);
      return;
    }

    let clusterLinkedUrls = new Set();
    if (clusterName) {
      try {
        const cr = await safeQuery('readModeCluster',
          'MATCH (n:TextNode {source_text: $work})-[]->(c:Cluster {name: $clusterName}) ' +
          'WHERE n.gateway = false RETURN n.url AS url',
          { work, clusterName }
        );
        clusterLinkedUrls = new Set(cr.map(r => r.url).filter(Boolean));
      } catch (err) {
        console.error('[BD] Read mode cluster error:', err);
      }
    }

    let gwId = null;
    const sectionIds = [];
    for (const rec of records) {
      if (!rec.n) continue;
      const id = getElementId(rec.n);
      if (rec.n.properties && rec.n.properties.gateway) {
        if (!gwId) gwId = id;
      } else {
        sectionIds.push(id);
      }
    }
    if (!gwId) return;

    lastSearchCWNode = node;
    cy.$('[type="Search_CW"]').hide();

    saveState();
    readModeActive = true;
    activeNodeId   = null;
    cy.elements().hide();

    if (clusterNode && clusterNode.length) clusterNode.show();
    const gwEl = cy.getElementById(gwId);
    if (gwEl.length) gwEl.show();

    // Snake grid layout — sizing must come first so inline styles apply before positioning
    const seqNodes = sectionIds
      .map(id => cy.getElementById(id))
      .filter(n => n.length)
      .sort((a, b) => (a.data('seq') ?? 0) - (b.data('seq') ?? 0));

    const count    = seqNodes.length;
    const cols     = Math.min(15, Math.max(5, Math.round(Math.sqrt(count))));
    const nodeW    = Math.max(40, Math.min(70, Math.round(640 / cols)));
    const nodeH    = Math.round(nodeW * 0.57);
    const fontSize = nodeW >= 60 ? 12 : nodeW >= 50 ? 11 : 10;
    const gapX     = 10;

    sectionIds.forEach(id => {
      const n = cy.getElementById(id);
      if (!n.length) return;
      n.show();
      n.addClass('read-mode-section');
      const linked = clusterLinkedUrls.has(n.data('url'));
      n.style({
        'width':              nodeW,
        'height':             nodeH,
        'font-size':          fontSize + 'px',
        'background-color':   linked && clusterColour ? clusterColour : '#1a1a1a',
        'background-opacity': linked && clusterColour ? 0.65 : 1,
      });
    });

    const gapY    = 10;
    const stepX   = nodeW + gapX;
    const stepY   = nodeH + gapY;
    const originX = 50;
    const headerY = 30;

    const positions = {};

    // Header row: cluster then gateway
    let hx = originX;
    if (clusterNode && clusterNode.length) {
      positions[clusterNode.id()] = { x: hx, y: headerY };
      hx += stepX * 2;
    }
    positions[gwId] = { x: hx, y: headerY };

    // Snake grid: odd rows run right-to-left
    const gridY = headerY + stepY * 2;
    seqNodes.forEach((n, i) => {
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

  function updateSearchCWVisibility(node) {
    if (!lastClusterNode) return;
    if (lastSearchCWNode !== null) return;
    // Phase 1 — octagons only valid in cluster/TextNode context, not Family or root
    const scwNodes = cy.$('[type="Search_CW"]');
    if (!scwNodes.length) return;
    if (node.data('type') !== 'TextNode') {
      scwNodes.hide();
      cy.$('[type="HAS_SEARCH_CW"]').hide();
      return;
    }
    const connected = node.neighborhood('node').filter(n => n.id() === lastClusterNode.id()).length > 0;
    scwNodes[connected ? 'show' : 'hide']();
    cy.$('[type="HAS_SEARCH_CW"]')[connected ? 'show' : 'hide']();
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

    if (readModeActive && type !== 'Search_CW') exitReadMode();

    if (addChip && (type === 'Family' || type === 'Cluster' || type === 'TextNode' || type === 'Search_CW')) {
      addYouChip(node);
    }

    if (type === 'Search_CW') {
      if (readModeState.enabled) {
        handleReadModeTap(node);
      } else {
        handleSearchCWTap(node);
      }
      return;
    }

    if (node.id() === activeNodeId) {
      if (type === 'TextNode') {
        expandChildLevel();
      } else if (type === 'Family') {
        expandToFamily(node);  // re-run layout on repeat tap (fCoSE randomize:true gives new arrangement)
      } else {
        restoreState();
        activeNodeId = null;
      }
    } else {
      if (type === 'Cluster') {
        expandToCluster(node);
      } else if (type === 'Family') {
        expandToFamily(node);
      } else {
        expandToNode(node);
        updateSearchCWVisibility(node);
      }
    }

    if (node.data('name') === 'Settling') {
      toggleMediaBar('Settling', 'ChineseSad1.mp3');
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
    div.style.color = 'rgba(255,255,255,0.65)';
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
    const div = document.createElement('div');
    div.textContent = String(nr);
    div.style.cssText = 'position:absolute;font-size:9px;font-family:sans-serif;line-height:1;display:none;transform:translate(-50%,-100%);';
    div.style.color = 'rgba(255,255,255,0.65)';
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

async function init() {
  // Auto-reload if the initial data load hangs (e.g. cold Memgraph connection
  // on first server start). Server warms up the pool on startup so the second
  // load should be instant.
  const loadWatchdog = setTimeout(() => location.reload(), 10000);

  let ws;
  try {
    ws = await connectWS();
  } catch (err) {
    clearTimeout(loadWatchdog);
    console.error('Server connection error:', err);
    alert('Could not connect to server.\n\nIs server.js running?\n  node server.js');
    return;
  }

  let records, clusterColourRecords, cfRecords;
  try {
    [records, clusterColourRecords, cfRecords] = await Promise.all([
      queryWS(ws, 'graph',
        'MATCH (n)-[r]->(m) RETURN n, r, m'),
      queryWS(ws, 'clusterColours',
        'MATCH (c:Cluster)-[r]-(f:Family) ' +
        'WITH c, f, r.weight AS w ORDER BY w DESC ' +
        'WITH c, collect(f)[0] AS pf ' +
        'RETURN c.name AS name, pf.hex AS colour'),
      queryWS(ws, 'clusterFamily',
        'MATCH (c:Cluster)-[r]-(f:Family) RETURN c, r, f'),
    ]);
  } catch (err) {
    clearTimeout(loadWatchdog);
    console.error('Query error:', err);
    alert('Could not load graph data. See browser console for details.');
    return;
  }

  clearTimeout(loadWatchdog);
  // Build element maps (deduplicate nodes and edges by ID)
  const nodesById = new Map();
  const edgesById = new Map();

  for (const rec of records) {
    const n = rec.n;
    const r = rec.r;
    const m = rec.m;
    const nId = getElementId(n);
    const mId = getElementId(m);
    const rId = getElementId(r);
    if (!nodesById.has(nId)) nodesById.set(nId, buildNodeData(n));
    if (!nodesById.has(mId)) nodesById.set(mId, buildNodeData(m));
    if (!edgesById.has(rId)) edgesById.set(rId, buildEdgeData(r, n, m));
  }

  // Ensure all Cluster-Family edges are present.
  // Some Cluster-Family edges are missing from the main query due to elementId
  // inconsistency in Memgraph — the same node returns different elementIds in
  // different query contexts. Resolve by name so edges always connect to the
  // nodes already registered in nodesById.
  const clusterIdByName = new Map();
  const familyIdByName  = new Map();
  nodesById.forEach(nd => {
    if (nd.type === 'Cluster') clusterIdByName.set(nd.name, nd.id);
    if (nd.type === 'Family')  familyIdByName.set(nd.name, nd.id);
  });

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
    edgesById.delete(rId);   // remove raw-rId entry that Cytoscape would drop anyway
    edgesById.set(cfEdgeId, ed);
  }

  // Post-process cluster colours from highest-weighted family connection
  const clusterColours = new Map();
  for (const rec of clusterColourRecords) {
    const name = rec.name;
    const colour = rec.colour;
    if (name && colour) clusterColours.set(name, colour);
  }
  nodesById.forEach(nd => {
    if (nd.type === 'Cluster' && clusterColours.has(nd.name)) {
      nd.colour = clusterColours.get(nd.name);
    }
  });

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

  const pairingState  = { active: false };
  const readModeState = { enabled: false };

  const pairBtn        = document.getElementById('pair-btn');
  const pairStatus     = document.getElementById('pair-status');
  const readModeToggle  = document.getElementById('read-mode-toggle');
  readModeState.enabled = readModeToggle.checked;
  readModeToggle.addEventListener('change', () => { readModeState.enabled = readModeToggle.checked; });

  pairBtn.addEventListener('click', () => {
    wsRef.lastActivity = Date.now();
    pairBtn.disabled = true;
    ws.send(JSON.stringify({ type: 'ready_to_pair' }));
  });

  const { addBadge }      = setupNrBadges(cy);
  const { appendBuddyChip, resetBuddyBar } = setupInteractions(cy, wsRef, addBadge, youCy, buddyCy, pairingState, readModeState);

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
