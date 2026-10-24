// TEMPORARY MEASUREMENT PROBE — DELETE WHEN THE STEPPER SPACINGS ARE SETTLED.
//
// WHY THIS IS ONE FILE AND NOT A BLOCK PER MODULE. The author asked for the
// stepper column's spacings to be looked at, warned that "what has appeared an
// easy slight adjustment has caused a lot of iterations", and then made the
// point that settles the shape of the instrument: *the music steppers will need
// the same solution, so would not a collage be better to instrument?*
//
// Right, and for a stronger reason than coverage. A COLLAGE is where
// `--bd-col-max` and `body.sharing-lane` come into play, so two stepper groups
// stack in ONE lane — the tightest that lane ever gets. Measure there and the
// single-module case is a subset. Measure only V_Kolam3D and the binding
// constraint is never seen.
//
// It also has to cross two different structures, which is why it probes by
// selector rather than by knowing any module's markup:
//
//   · V_Kolam3D  — a static `.control-panel` holding `.control-row`s
//   · M_DroneFrac — `#control-panel`, EMPTY in the markup and filled by JS
//
// Loaded as `<script src="/spacing_probe.js">` by both. A module opened as a
// standalone simply 404s it and nothing happens, which is correct for
// throwaway diagnostics. Only `bd_collage_layout` handlers can share a lane,
// and today that is V_Kolam3D and M_DroneFrac alone — M_Fractal and M_Music do
// not implement it, so they cannot be measured in that state yet.
//
// MEASURES ONLY. It changes no layout, sets no style, and touches no class.

(function spacingProbe() {
  'use strict';

  // Every plausible stepper container across the two module families. Probing
  // a superset costs nothing — a selector that matches nothing is skipped —
  // and means this file needs no knowledge of which module loaded it.
  const TARGETS = [
    '.control-panel',        // V_Kolam3D, V_Kolam
    '#control-panel',        // M_DroneFrac, M_Fractal, M_Music (JS-filled)
    '.panel.visual-panel',
    '.panel.player-panel',
    '.module-layout',
    '.canvas-wrapper',
  ];

  // The widest child is what actually decides whether the box is big enough,
  // and it is not always the first child or a known class — so measure them.
  function widestChild(el) {
    let w = 0, which = '';
    for (const c of el.children) {
      const b = c.getBoundingClientRect();
      if (b.width > w) { w = b.width; which = c.className || c.tagName; }
    }
    return { w: Math.round(w), which: String(which).slice(0, 28) };
  }

  function px(el, prop) {
    try { return getComputedStyle(el).getPropertyValue(prop).trim(); }
    catch (_) { return '?'; }
  }

  function measure(why) {
    try {
      const who = (document.title || location.pathname).slice(0, 34);
      const lane = px(document.documentElement, '--bd-col-max') || '(unset)';
      console.log('[spacing] ── ' + why + ' | ' + who +
        ' | viewport ' + window.innerWidth + 'x' + window.innerHeight +
        ' | phone-rule ' + window.matchMedia('(max-width: 500px)').matches +
        ' | sharing-lane ' + document.body.classList.contains('sharing-lane') +
        ' | --bd-col-max ' + lane +
        ' | body.class ' + String(document.body.className || '(none)').slice(0, 70));

      for (const sel of TARGETS) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const b = el.getBoundingClientRect();
        // offsetWidth - clientWidth is the ONLY honest scrollbar measure: an
        // overlay scrollbar reports 0 and a classic one 8-17, and which you get
        // depends on the OS and browser rather than on any CSS here.
        const barV = el.offsetWidth - el.clientWidth;
        const barH = el.offsetHeight - el.clientHeight;
        const kid  = widestChild(el);
        // How many gradient layers survived the cascade. The author reports
        // seeing no scroll shadow, and a `background` SHORTHAND overriding
        // background-image is exactly how that happens.
        const layers = String(px(el, 'background-image')).split('gradient(').length - 1;
        // WHAT IS ACTUALLY TOO WIDE. The widest DIRECT child cannot explain a
        // 19px horizontal overflow in V_Kolam3D's panel (scrollWidth 147 against
        // clientWidth 128, while the widest child measured 113), so the culprit
        // is a descendant — a <select> at its intrinsic option width is the
        // likely one. Name it rather than guess: every descendant whose right
        // edge passes the panel's content edge, with enough of its identity to
        // find it in the file.
        try {
          const pr = el.getBoundingClientRect();
          const over = [];
          el.querySelectorAll('*').forEach((d) => {
            const db = d.getBoundingClientRect();
            if (db.width > 0 && Math.round(db.right - pr.left) > el.clientWidth) {
              over.push(d.tagName.toLowerCase() +
                (d.id ? '#' + d.id : '') +
                (d.className ? '.' + String(d.className).trim().split(/\s+/).join('.') : '') +
                ' w' + Math.round(db.width) +
                ' right+' + Math.round(db.right - pr.left));
            }
          });
          if (over.length) {
            console.log('[spacing]    !! ' + sel + ' OVERFLOWING descendants (' +
                        over.length + '): ' + over.slice(0, 6).join(' // '));
          }
        } catch (_) {}
        console.log('[spacing]    ' + sel.padEnd(22) +
          ' box ' + Math.round(b.width) + 'x' + Math.round(b.height) +
          ' | client ' + el.clientWidth + 'x' + el.clientHeight +
          ' | scroll ' + el.scrollWidth + 'x' + el.scrollHeight +
          ' | pad ' + px(el, 'padding-left') + '/' + px(el, 'padding-right') +
          ' | bars v' + barV + ' h' + barH +
          ' | overflow-y ' + (el.scrollHeight > el.clientHeight) +
          ' x ' + (el.scrollWidth > el.clientWidth) +
          ' | css-overflow ' + px(el, 'overflow-x') + '/' + px(el, 'overflow-y') +
          ' | widest-child ' + kid.w + 'px (' + kid.which + ')' +
          ' | slack ' + (el.clientWidth - kid.w) + 'px' +
          ' | bg-layers ' + layers);
      }
    } catch (err) {
      console.warn('[spacing] probe failed: ' + (err && err.message));
    }
  }

  // FOUR SAMPLES, because the thing being measured arrives in stages and a
  // single early reading would describe a layout that no longer exists:
  //   · two frames   — flex has settled, the canvas has been sized
  //   · 900 ms       — BD has posted bd_ui_config (host-chrome reserve)
  //   · 2500 ms      — a JS-filled music panel has its rows, and a collage has
  //                    had time to post bd_collage_layout and set the lane
  //   · on resize    — debounced, for the author dragging a window narrow
  requestAnimationFrame(() => requestAnimationFrame(() => measure('settled')));
  setTimeout(() => measure('after-host-config'), 900);
  setTimeout(() => measure('after-collage-layout'), 2500);

  let t = null;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => measure('resize'), 250);
  });

  // And on demand, so a state reached by hand (a collage assembled, the lane
  // shared) can be measured at the moment it is on screen.
  window.bdSpacing = () => measure('on-request');
  console.log('[spacing] probe loaded — call bdSpacing() to sample on demand');
})();
