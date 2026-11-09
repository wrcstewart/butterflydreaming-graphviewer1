// build_guides.mjs — 2026-11-09.  node build_guides.mjs
//
// Turns the guide markdown into servable HTML. Run it after editing any
// `*Guide.md`; it rewrites the matching `*_guide.html` and says what it did.
//
// WHY A BUILD STEP RATHER THAN A SECOND HAND-WRITTEN FILE. The author asked for
// the guide as HTML in the main folder, "easy to find", and possibly the basis
// of a collection to be uploaded later. Writing the HTML by hand would leave two
// copies of the same prose to drift apart — this repo has already paid for that
// twice, with two copies of `music_module.html` and with a copy of the triangle
// scan that got tested instead of the code. So the MARKDOWN IS THE SOURCE, the
// HTML is generated, and the generated file says so in its footer.
//
// A CONVENTION FOR EVERY GUIDE IN THIS COLLECTION, from the author: *"you
// should define the parameters and output of any function briefly even if
// further explained later"*. So the FIRST time a guide names a function, it
// gives a fenced block with the signature, each parameter, and what comes back
// — including what is NOT a parameter where that is the surprise, as `seed` is
// for height01. A guide that names five functions and defines none makes the
// reader hold five unknowns while reading about something else.
//
// It handles only the markdown this collection actually uses — headings,
// paragraphs, tables, fenced code, lists, rules, bold, italic, inline code and
// links. That is a deliberate limit rather than an oversight: a general markdown
// parser is a dependency, and an unsupported construct here fails loudly in the
// output rather than silently producing something odd.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const GUIDES = readdirSync('.').filter(f => /Guide\.md$/.test(f));

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Inline markup. Order matters: code first, so that nothing inside backticks is
// further interpreted — an id like `__init__` or a formula with asterisks in it
// would otherwise be mangled.
function inline(s) {
  const code = [];
  // A NUL-delimited placeholder, not a bare number in spaces: the first version
  // used a space-digit-space marker and would have turned any plain number in
  // the prose -- "4 pairs", "7 octaves" -- into a code span indexing an array
  // that had nothing at that position. NUL cannot occur in the source, and
  // esc() does not touch it.
  s = s.replace(/`([^`]+)`/g, (_, c) => {
    code.push(c);
    return '\u0000' + (code.length - 1) + '\u0000';
  });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, h) => `<a href="${h}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + esc(code[+i]) + '</code>');
  // Fail loudly rather than shipping a mangled line.
  if (s.indexOf('\u0000') !== -1) throw new Error('unrestored code placeholder: ' + s.slice(0, 90));
  return s;
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function convert(md, sourceName) {
  const lines = md.split('\n');
  const out = [];
  const toc = [];
  let title = '', subtitle = '';
  let i = 0;

  // The h1 is the page title and is emitted separately from the body.
  while (i < lines.length && !lines[i].startsWith('# ')) i++;
  if (i < lines.length) { title = lines[i].slice(2).trim(); i++; }

  const flushPara = buf => {
    if (!buf.length) return;
    const text = inline(buf.join(' ').trim());
    if (!subtitle && out.length === 0) { subtitle = text; }
    else out.push('<p>' + text + '</p>');
    buf.length = 0;
  };

  let para = [];
  for (; i < lines.length; i++) {
    const L = lines[i];

    if (/^```/.test(L)) {                       // fenced code
      flushPara(para);
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      out.push('<pre><code>' + esc(body.join('\n')) + '</code></pre>');
      continue;
    }

    if (/^\|/.test(L)) {                        // a table
      flushPara(para);
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i].replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
        i++;
      }
      i--;
      // row 1 is the header, row 2 the alignment rule, which is discarded
      const head = rows[0];
      const body = rows.slice(2);
      const blank = head.every(c => c === '');
      out.push('<div class="tablewrap"><table>');
      if (!blank) {
        out.push('<thead><tr>' + head.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead>');
      }
      out.push('<tbody>');
      for (const r of body) {
        out.push('<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>');
      }
      out.push('</tbody></table></div>');
      continue;
    }

    if (/^###\s/.test(L)) {
      flushPara(para);
      const t = L.replace(/^###\s*/, '').trim();
      out.push(`<h3 id="${slug(t)}">${inline(t)}</h3>`);
      continue;
    }
    if (/^##\s/.test(L)) {
      flushPara(para);
      const t = L.replace(/^##\s*/, '').trim();
      const id = slug(t);
      toc.push({ id, t });
      out.push(`<h2 id="${id}">${inline(t)}</h2>`);
      continue;
    }
    if (/^---\s*$/.test(L)) { flushPara(para); out.push('<hr>'); continue; }

    if (/^[-*]\s/.test(L)) {                    // a bullet list
      flushPara(para);
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        let item = lines[i].replace(/^[-*]\s*/, '');
        i++;
        // continuation lines are indented
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) item += ' ' + lines[i++].trim();
        items.push(item);
      }
      i--;
      out.push('<ul>' + items.map(t => '<li>' + inline(t) + '</li>').join('') + '</ul>');
      continue;
    }

    if (L.trim() === '') { flushPara(para); continue; }
    para.push(L.trim());
  }
  flushPara(para);

  const tocHtml = toc.length
    // A plain list, not an <ol>: the headings carry their own numbers (and the
    // prose cross-references them as "see 7"), so an ordered list numbered them
    // twice — "1. 1. The one idea".
    ? '<nav class="toc"><b>Contents</b><ul>' +
      toc.map(s => `<li><a href="#${s.id}">${inline(s.t)}</a></li>`).join('') +
      '</ul></nav>'
    : '';

  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="guide.css">
<!--
  GENERATED FILE — do not edit.
  Source: ${sourceName}.  Rebuild with: node build_guides.mjs
-->
<main>
<h1>${inline(title)}</h1>
${subtitle ? '<p>' + subtitle + '</p>' : ''}
${tocHtml}
${out.join('\n')}
<footer>
Generated from <code>${esc(sourceName)}</code> by <code>build_guides.mjs</code> —
edit the markdown, not this file. Claims here can be checked with
<code>node terrain_selftest.mjs</code>.
</footer>
</main>
</html>
`;
}

let n = 0;
for (const src of GUIDES) {
  // NoiseTerrainGuide.md -> noise_terrain_guide.html
  const out = src.replace(/\.md$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase() + '.html';
  const html = convert(readFileSync(src, 'utf8'), src);
  writeFileSync(out, html);
  console.log(`  ${src}  ->  ${out}   ${html.length.toLocaleString()} bytes`);
  n++;
}
console.log(`  ${n} guide${n === 1 ? '' : 's'} built. Served at http://localhost:8080/<name>.html`);
