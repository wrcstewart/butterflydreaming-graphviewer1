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

  // tag -> module id, derived so the two can never disagree.
  root.BD_WIRE_BY_TAG = Object.keys(root.BD_WIRE_TABLES).reduce(function (acc, id) {
    acc[root.BD_WIRE_TABLES[id].tag] = id;
    return acc;
  }, {});
})(typeof window !== 'undefined' ? window : globalThis);
