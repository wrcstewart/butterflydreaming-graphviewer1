/*
 * module_wire_tables.js — the wire format for JSP deep links.
 *
 * SINGLE SOURCE OF TRUTH. This file is authored HERE, in the BD repo, and
 * copied into each standalone module repo by `sync_module_tables.sh`.
 * Never hand-edit a copy; edit this and re-run the script.
 *
 * WHY A COPY RATHER THAN A FETCH. The standalones live on GitHub Pages and
 * must keep working when this machine is off — that is the whole point of a
 * self-contained link. Fetching this table from graph.virtualfictions.uk at
 * load would make every shared link depend on the laptop being awake.
 *
 * WHY SHORT KEYS RATHER THAN POSITIONS. A positional array is 24 chars
 * shorter, and its failure mode is silent: if the two copies of the order ever
 * diverge, every value after the divergence is mis-assigned — symmetry becomes
 * depth — with no way for the reader to detect it. With keys, order carries no
 * meaning: an unknown key is ignored, a missing key falls back to its default.
 * Drift degrades instead of corrupting. That is worth 24 characters.
 *
 * RULES
 *   - Keys are EXACTLY two characters. The decoder splits on that.
 *   - Adding a key is safe and needs no version bump; old readers ignore it.
 *   - RENAMING or REMOVING a key is a breaking change: bump `wire_version`,
 *     which travels in the URL (`kv1`), so an old reader refuses loudly
 *     instead of decoding wrongly.
 *
 * URL SHAPE
 *   ?j=<tag>v<wire_version>.<node uuid>.<pairs>~<score>
 *   e.g. ?j=kv1.80429777-….sy8,de2,st50,…,bg%230a0a0f,we1.5~axiom%3A%20F%2BF…
 *   Each pair is the two-char key followed by the percent-encoded value.
 *   The `~score` tail is optional. `#` MUST be encoded — a literal one would
 *   start the fragment and truncate the payload.
 */
(function (root) {
  root.BD_WIRE_TABLES = {
    bd_V_Kolam: {
      tag: 'k',
      wire_version: 1,
      // two-char key -> %%bd_ directive name
      keys: {
        sy: 'symmetry',
        de: 'depth',
        st: 'step',
        an: 'angle',
        am: 'angle_minutes',
        ad: 'angle_drift',
        cs: 'colour_speed',
        sk: 'stroke',
        sa: 'saturation',
        li: 'lightness',
        bg: 'background',
        we: 'weight'
      }
    }
  };


  // ── The codec itself lives here too ─────────────────────────────────────
  // One implementation, shared by BD and every standalone. Two copies of a
  // parser is the same drift risk as two copies of a table, and harder to
  // spot: they would disagree only on edge cases.
  root.BD_JSP = {
    // Returns a ?j= URL, or null meaning "use the ?data= envelope instead".
    // Null whenever the script contains anything the table cannot express, so
    // a new directive makes links LONGER rather than silently losing a value.
    encode: function (baseUrl, script, nodeUrl, moduleId) {
      const spec = root.BD_WIRE_TABLES[moduleId];
      if (!spec || typeof script !== 'string' || !script) return null;
      const vals = {}, score = [];
      let inScore = false;
      for (const line of script.split('\n')) {
        if (line.startsWith('%%bd_score')) { inScore = true; continue; }
        if (line.startsWith('%%bd_]'))     { inScore = false; continue; }
        if (inScore) { score.push(line); continue; }
        if (!line.trim()) continue;
        const m = /^%%bd_(\w+)\s*(.*)$/.exec(line);
        if (!m) return null;                       // prose — cannot carry it
        if (m[1] === 'module') continue;
        vals[m[1]] = m[2];
      }
      const byName = {};
      Object.keys(spec.keys).forEach((k) => { byName[spec.keys[k]] = k; });
      const unknown = Object.keys(vals).filter((n) => !byName[n]);
      if (unknown.length) {
        if (root.console) console.log('[JSP] using ?data= — not in wire table: ' + unknown.join(', '));
        return null;
      }
      const uuid  = String(nodeUrl || '').replace(/^butterflydreaming\.org\/n\//, '');
      const pairs = Object.keys(vals).map((n) => byName[n] + encodeURIComponent(vals[n])).join(',');
      const tail  = score.length ? '~' + encodeURIComponent(score.join('\n')) : '';
      return baseUrl + '?j=' + spec.tag + 'v' + spec.wire_version + '.' + uuid + '.' + pairs + tail;
    },

    // Returns {script, node_url} or null. NEVER throws: decodeURIComponent
    // raises URIError on a malformed percent sequence, and callers run inside
    // async initialisers where an uncaught throw silently skips their default
    // fallback — leaving a module on "Waiting for script..." forever.
    decode: function (raw) {
      try { return root.BD_JSP._decode(raw); }
      catch (err) {
        if (root.console) console.warn('[JSP] decode threw, falling back:', err && err.message);
        return null;
      }
    },

    _decode: function (raw) {
      if (!raw) return null;
      const tables = root.BD_WIRE_TABLES, byTag = root.BD_WIRE_BY_TAG;
      if (!tables || !byTag) { console.warn('[JSP] wire tables missing'); return null; }
      // Split on the FIRST TWO dots only — values contain dots (weight 1.5).
      const d1 = raw.indexOf('.'); if (d1 < 0) return null;
      const d2 = raw.indexOf('.', d1 + 1); if (d2 < 0) return null;
      const tagPart = raw.slice(0, d1), nodeId = raw.slice(d1 + 1, d2);
      let rest = raw.slice(d2 + 1);
      const m = /^([a-z]+)v(\d+)$/.exec(tagPart);
      if (!m) { console.warn('[JSP] unrecognised tag', tagPart); return null; }
      const moduleId = byTag[m[1]];
      if (!moduleId) { console.warn('[JSP] unknown module tag', m[1]); return null; }
      const spec = tables[moduleId];
      if (Number(m[2]) !== spec.wire_version) {
        console.warn('[JSP] wire version ' + m[2] + ' but this build knows ' +
                     spec.wire_version + ' — refusing to decode. Re-run sync_module_tables.sh.');
        return null;
      }
      let score = '';
      const tilde = rest.indexOf('~');
      if (tilde >= 0) { score = decodeURIComponent(rest.slice(tilde + 1)); rest = rest.slice(0, tilde); }
      const lines = ['%%bd_module ' + moduleId];
      rest.split(',').forEach((pair) => {
        if (!pair) return;
        const key = pair.slice(0, 2), val = pair.slice(2), name = spec.keys[key];
        if (!name) { console.warn('[JSP] ignoring unknown key', key); return; }
        if (val === '') return;
        lines.push('%%bd_' + name + ' ' + decodeURIComponent(val));
      });
      if (score) { lines.push('%%bd_score ['); lines.push(score); lines.push('%%bd_]'); }
      return { script: lines.join('\n') + '\n',
               node_url: nodeId ? ('butterflydreaming.org/n/' + nodeId) : null };
    }
  };

  // tag -> module id, derived so the two can never disagree.
  root.BD_WIRE_BY_TAG = Object.keys(root.BD_WIRE_TABLES).reduce(function (acc, id) {
    acc[root.BD_WIRE_TABLES[id].tag] = id;
    return acc;
  }, {});
})(typeof window !== 'undefined' ? window : globalThis);
