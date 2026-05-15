// viewer.js — ButterflyDreaming Graph Viewer

const ROOT_ID = '__root__';

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

function buildNodeData(n) {
  const labels = n.labels || [];
  const props = flattenProps(n.properties || {});
  const id = getElementId(n);

  if (labels.includes('Family')) {
    return Object.assign({}, props,
      { id, type: 'Family', label: props.name || '', colour: FAMILY_COLOURS[props.name] || '#aaaaaa' }
    );
  }
  if (labels.includes('Cluster')) {
    const fc = FAMILY_COLOURS[props.family_primary];
    return Object.assign({}, props,
      { id, type: 'Cluster', label: props.name || '', colour: fc ? desaturate(fc) : '#666666' }
    );
  }
  if (labels.includes('TextNode')) {
    return Object.assign({}, props,
      { id, type: 'TextNode', label: props.text || '', colour: '#111111' }
    );
  }
  return Object.assign({}, props, { id, type: 'Unknown', label: '', colour: '#555555' });
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
    type,
    colour: EDGE_COLOURS[type] || '#666666',
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
        'label': '',
        'border-width': 0,
        'overlay-padding': 8,
      }
    },
    {
      selector: 'node[type="root"]',
      style: {
        'width': 14,
        'height': 14,
        'background-color': '#FFD700',
      }
    },
    {
      selector: 'node[type="Family"]',
      style: {
        'width': 40,
        'height': 40,
      }
    },
    {
      selector: 'node[type="Cluster"]',
      style: {
        'width': 26,
        'height': 26,
      }
    },
    {
      selector: 'node[type="TextNode"]',
      style: {
        'width': 22,
        'height': 22,
        'background-color': '#111111',
        'border-color': '#aaaaaa',
        'border-width': 1.5,
        'shape': 'round-rectangle',
      }
    },
    {
      selector: 'edge',
      style: {
        'line-color': 'data(colour)',
        'width': 'data(width)',
        'curve-style': 'bezier',
        'opacity': 0.65,
        'target-arrow-shape': 'none',
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
    randomize: false,
    fit: true,
    padding: 60,
    nodeSeparation: 75,
    idealEdgeLength: 100,
    nodeRepulsion: 4500,
    gravity: 0.25,
  }).run();
}

// --- Interactions ---

function setupInteractions(cy) {
  const tooltip = document.getElementById('label-tooltip');
  let dwellTimer = null;
  const history = [];
  let activeNodeId = null;

  // Tooltip

  function showTooltip(node, x, y) {
    const type = node.data('type');
    let content = '';
    if (type === 'root') {
      content = 'ButterflyDreaming';
    } else if (type === 'Family' || type === 'Cluster') {
      content = node.data('name') || node.data('label') || '';
    } else if (type === 'TextNode') {
      const text = node.data('text') || '';
      const lines = text.split('\n').filter(l => l.trim());
      content = lines.slice(0, 6).join('\n');
      if (lines.length > 6) content += '\n…';
    }
    if (!content) return;
    tooltip.textContent = content;
    tooltip.style.display = 'block';
    positionTooltip(x, y);
  }

  function positionTooltip(x, y) {
    const pad = 14;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    let left = x + pad;
    let top  = y + pad;
    if (left + tw > window.innerWidth  - pad) left = x - tw - pad;
    if (top  + th > window.innerHeight - pad) top  = y - th - pad;
    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
  }

  function hideTooltip() {
    clearTimeout(dwellTimer);
    dwellTimer = null;
    tooltip.style.display = 'none';
  }

  cy.on('mouseover', 'node', evt => {
    clearTimeout(dwellTimer);
    const rp = evt.renderedPosition;
    dwellTimer = setTimeout(() => showTooltip(evt.target, rp.x, rp.y), 400);
  });

  cy.on('mousemove', 'node', evt => {
    const rp = evt.renderedPosition;
    if (tooltip.style.display !== 'none') {
      positionTooltip(rp.x, rp.y);
    }
  });

  cy.on('mouseout', 'node', () => hideTooltip());

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

  function expandToNode(node) {
    saveState();
    activeNodeId = node.id();
    cy.elements().hide();

    if (node.id() === ROOT_ID) {
      // Root state: show root, synthetic edges (for layout), all Family nodes
      node.show();
      cy.edges('[type="__root_edge__"]').show();
      cy.nodes('[type="Family"]').show();
    } else {
      // One-hop rule: show node + immediate neighbours, excluding root and synthetic edges
      node.show();
      node.closedNeighborhood()
        .filter(el => el.id() !== ROOT_ID)
        .filter(el => el.data('type') !== '__root_edge__')
        .show();
    }

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

  // Tap handler

  cy.on('tap', 'node', evt => {
    hideTooltip();
    const node = evt.target;

    if (node.id() === activeNodeId) {
      // Second tap on active node
      if (node.data('type') === 'TextNode') {
        expandChildLevel();
      } else {
        restoreState();
        activeNodeId = null;
      }
      return;
    }

    expandToNode(node);
  });

  // Reset button

  document.getElementById('reset-btn').addEventListener('click', () => {
    hideTooltip();
    history.length = 0;
    activeNodeId = null;
    cy.elements().hide();
    const root = cy.getElementById(ROOT_ID);
    root.show();
    cy.fit(root, 120);
  });
}

// --- Boot ---

async function init() {
  const stored = (typeof NEO4J_PASSWORD !== 'undefined') ? NEO4J_PASSWORD : '';
  const password = (stored && stored !== 'change_me')
    ? stored
    : window.prompt('Neo4j password:');

  if (!password) return;

  let driver;
  let records;

  try {
    driver = neo4j.driver(
      'neo4j://127.0.0.1:7687',
      neo4j.auth.basic('neo4j', password)
    );
    const session = driver.session({ database: 'neo4j' });
    try {
      const result = await session.run('MATCH (n)-[r]->(m) RETURN n, r, m');
      records = result.records;
    } finally {
      await session.close();
    }
  } catch (err) {
    console.error('Neo4j error:', err);
    alert('Could not connect to Neo4j.\n\nIs it running on bolt://127.0.0.1:7687?\nSee the browser console for details.');
    if (driver) await driver.close().catch(() => {});
    return;
  }

  await driver.close().catch(() => {});

  // Build element maps (deduplicate nodes and edges by ID)
  const nodesById = new Map();
  const edgesById = new Map();

  for (const rec of records) {
    const n = rec.get('n');
    const r = rec.get('r');
    const m = rec.get('m');
    const nId = getElementId(n);
    const mId = getElementId(m);
    const rId = getElementId(r);
    if (!nodesById.has(nId)) nodesById.set(nId, buildNodeData(n));
    if (!nodesById.has(mId)) nodesById.set(mId, buildNodeData(m));
    if (!edgesById.has(rId)) edgesById.set(rId, buildEdgeData(r, n, m));
  }

  // Assemble Cytoscape elements
  const elements = [
    { data: { id: ROOT_ID, type: 'root', label: 'ButterflyDreaming', colour: '#FFD700' } },
  ];

  let syntheticIdx = 0;
  nodesById.forEach(nd => {
    elements.push({ data: nd });
    if (nd.type === 'Family') {
      elements.push({ data: {
        id: '__root_edge_' + (syntheticIdx++),
        source: ROOT_ID,
        target: nd.id,
        type: '__root_edge__',
        colour: '#000000',
        width: 0,
      }});
    }
  });

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
  const root = cy.getElementById(ROOT_ID);
  root.show();
  cy.fit(root, 120);

  setupInteractions(cy);
}

window.addEventListener('DOMContentLoaded', init);
