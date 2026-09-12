# Deep Linking — corpus text-size measurements

**Measured 2026-09-11** against the live Memgraph corpus (477 nodes, 2,715 edges)
via `bolt://localhost:7687`. Figures are for the `text` property of `:TextNode` —
the content field the viewer renders.

## Summary

| Group | n | Avg chars | Median | Max | Min |
|---|---|---|---|---|---|
| **All TextNodes** | 211 | **592** | 555 | **1,796** | 8 |
| Prose only (non-module) | 207 | 597 | 568 | 1,796 | 8 |
| **Module nodes** | 4 | **331** | 301 | **424** | 298 |

Total across all 211 nodes: **~125,000 characters** (124,995 chars / 125,125 bytes).

Longest node in the corpus: *Clever Elsie (part 3)* (Grimm's Fairy Tales) — 1,796 chars.

## Module nodes

The Kolam / Fractal / music nodes, individually:

| Node | Module | Chars |
|---|---|---|
| `bd_M_Fractal_001` | Fractal | 424 |
| `bd_M_ABC_001` | ABC / music | 304 |
| `bd_V_Kolam_001` | Kolam | 298 |
| `bd_V_Kolam_002` | Kolam | 298 |

A module node's `text` **is** the directive script in full — `%%bd_module bd_V_Kolam`,
`%%bd_symmetry 8`, the `%%bd_score` block and the rest. There is no separate script
storage, so these figures are the complete content. They are small because they are
parameter lists; the Fractal node leads only because it carries L-system rules
(`%%bd_axiom`, two `%%bd_rule` lines) plus scale and timing directives.

## Two caveats on the numbers

**`size()` in Memgraph counts BYTES, not characters.** `size("道德經")` returns 9,
not 3. Character counts above were therefore computed in Python over the dumped
strings (`len()` on `str`, i.e. codepoints), not by Cypher.

**It happens not to matter yet, and that will change.** The corpus currently holds
no CJK at all — the Tao Te Ching and Zhuangzi nodes are English translations — so
chars and bytes differ by only 130 across the whole corpus (a few curly quotes and
dashes). Once Chinese source text is ingested, that gap opens wide and `size()`
stops being a usable character count.

## Field notes

`text` is the content field. Two neighbours are easy to mistake for it:

- `source_text` (all 211 nodes) is the **work title** — "Tao Te Ching" — not content.
- `raw_text` (198 nodes) is a near-duplicate of `text`: byte-identical on 193 of 198.

## Method

```cypher
MATCH (n:TextNode)
RETURN n.text AS text, n.title AS title,
       n.hasModuleScript AS mod, n.source_text AS src
```

Dumped to JSON through `neo4j-driver`, then counted in Python. Module nodes are
identified by `n.hasModuleScript IS NOT NULL` (values: `bd_V_Kolam`, `bd_M_Fractal`,
`bd_M_ABC`).

---

# Deep-link URL sizes and the real ceiling

**Measured 2026-09-11.** All limit figures below are *probed against the live
hosts*, not quoted from documentation.

## The envelope

`buildExternalWebsiteUrl()` ([viewer.js:10685](viewer.js#L10685)) builds:

```
{script, node_url, name, source_text, title}
  → JSON.stringify → UTF-8 → btoa → encodeURIComponent → `${base}?data=${…}`
```

Base64 is 1.33x, then `encodeURIComponent` triples every `+` `/` `=`, and the
JSON keys and base URL add a fixed tail. Measured end-to-end inflation is
**1.84x the raw text** — not the ~1.33x that base64 alone suggests.

## Current single-node links

| | Chars |
|---|---|
| Average full URL | 1,090 |
| Median | 1,042 |
| **Longest in corpus** | **2,708** |
| Shortest | 276 |

Nodes exceeding 8,000 chars: **0 of 211**. Exceeding 16,000: **0 of 211**.
Today's deep links are nowhere near any limit.

## The actual limits (probed, by binary search on query length)

| Host | Max accepted | Fails with |
|---|---|---|
| GitHub Pages (module standalones) | **~7,995 chars** | `414 URI Too Long` |
| Express direct (`localhost:8080`) | ~16,157 chars | `431 Header Fields Too Large` |
| Cloudflare tunnel → Express | ~15,962 chars | `431` |

**The binding constraint is GitHub Pages at ~8 KB — and that is where every
module standalone lives.** It is an order of magnitude below any browser limit
(Chromium caps URLs at ~2 MB, Firefox has no hard cap, Safari is commonly cited
around 80 KB — all irrelevant here). Cloudflare is not the constraint either;
the tunnel matches Express because Node's own 16 KB header cap binds first.

So: **do not size deep links against browser limits. Size them against 8 KB.**

## Collage payloads — graphics + text + music

A combined payload (Kolam script + one text node + ABC score) in the same
envelope shape:

| Collage | JSON | Plain URL | deflate + base64 |
|---|---|---|---|
| Median-length text node | 1,606 | **2,208** | 1,134 |
| Longest text node (1,796) | 2,834 | **3,842** | 1,656 |
| Longest + Fractal instead of ABC | 2,955 | **4,000** | 1,702 |

**A three-part collage fits comfortably** — worst case 4,000 chars against a
7,995 ceiling, roughly 2x headroom.

### Where it breaks

Worst case (longest text nodes first), graphics + music + N text nodes:

| N text nodes | Plain URL | Deflated | Fits 8 KB? |
|---|---|---|---|
| 1 | 3,840 | 1,624 | both |
| 2 | 6,088 | 2,680 | both |
| **3** | **8,276** | 3,622 | **plain FAILS**, deflated fine |
| 8 | 18,100 | 7,612 | deflated only |
| **9** | 19,892 | **8,260** | **both fail** |

Plain encoding takes **two** long text nodes. Compression takes **eight**.

## Two ways past the ceiling, if the collage grows

**1. Use a fragment, not a query — `#data=` instead of `?data=`.**
A fragment is never sent to the server, so GitHub Pages' 8 KB limit stops
applying entirely and only the browser's (much larger) limit remains. This is
the cheaper fix by far: no compression, no payload format change. It does mean
the receiving page must read `location.hash` rather than `URLSearchParams`, and
BD's own `handleReturnFromStandalone` ([viewer.js:11172](viewer.js#L11172))
would need the same change to stay symmetric.

**2. Compress — `CompressionStream('deflate-raw')` is native in modern browsers**
(Chrome 80+, Safari 16.4+, Firefox 113+; no library). Worth **2.3x** on collage
payloads, because JSON keys and repeated `%%bd_` directive prefixes compress
well. This also fits the project rule that BD derives high-data presentation on
the client.

Doing both makes payload size a non-issue for any plausible collage.

## Method

Limits probed with `curl` binary-searching query length per host, recording the
first non-200. Payload sizes computed by replicating the `buildExternalWebsiteUrl`
pipeline byte-for-byte in Python over the dumped corpus.

---

# IMPLEMENTED 2026-09-11 — payloads now travel in the fragment

All deep-link payloads moved from `?data=` to `#data=`. Receivers accept both;
senders emit only `#data=`.

## Verified after the change

| Request | Before | After |
|---|---|---|
| 20,000-char payload → GitHub Pages | `414` | **`200`** |
| 20,000-char payload → BD Express | `431` | **`200`** |

The limits are not raised — they no longer apply, because a fragment is never
placed in the request line.

## Sites changed

Senders (now emit `#data=`):
- `viewer.js` `buildExternalWebsiteUrl()` — BD → standalone
- `viewer.js` BD self-link (Copy Link)
- `preview.html` × 4 — standalone → BD (`graph.virtualfictions.uk/#data=`)

Receivers (accept `#data=` first, `?data=` as fallback):
- `viewer.js` `handleReturnFromStandalone()`
- `preview.html` × 4 — `bd_V_Kolam`, `bd_M_ABC`, `bd_M_Fractal`, plus BD's local
  `V_Kolam/` copy

## Deployment order — this mattered

Receivers were shipped to GitHub Pages **first**, as a no-op, and Pages was
polled until all three actually served the new code. Only then were the senders
flipped. Flipping the sender first would have broken every Jump and Copy link
for as long as Pages took to rebuild — observed here as roughly 50 seconds, but
it is not guaranteed. Any future change to the payload format needs the same
two-phase order, for the same reason: **the standalones deploy on someone
else's schedule.**

## Not done, deliberately

**Compression and base64url are not in.** Current payloads max out at 2,708
chars, so neither is needed yet, and both change the payload format — which
would mean a second deploy dance. The collage module is where they earn their
place, and it can be born with `{v:1, …}` + deflate + base64url from its first
link, with no legacy to support.

**`encodeURIComponent` is retained** on the way out. A fragment read raw is
immune to the `+ → space` rule, so it could be dropped for ~5%, but keeping it
means the URL survives anything that re-parses it as a query.

## Still true after the change

Refresh behaviour is unchanged: `handleReturnFromStandalone` still clears the
payload from the URL bar via `history.replaceState(…, pathname)`, which drops
query *and* fragment, so a refresh does not re-fire the flow.

The debugging trap is now live: a `#data=` payload appears in **no** request
log, **no** Network tab entry and **no** `document.referrer`. When a link
appears not to deliver, read `location.hash` in the console — the request will
always look empty, and that is correct, not a symptom.

## Gotcha found in testing — a fragment-only navigation does not reload

Symptom: Jump worked, but a **copied** link opened the standalone showing the
**default script**. The clipboard was innocent — verified at 678 bytes with zero
line breaks, decoding to the correct live script.

Cause: **changing only the fragment does not reload the document.** The browser
fires `hashchange` and nothing else, so `loadInitialScript()` never ran again and
the tab kept whatever script it already had. `window.open` (Jump) always makes a
fresh document, which is why only the paste path failed. `?data=` never had this
failure mode — a query change is always a full navigation.

Fix (all five receivers):

```js
window.addEventListener('hashchange', () => {
  if (window.location.hash.startsWith('#data=')) window.location.reload();
});
```

Loop-safe: nothing in any of these files assigns `location.hash`.

**Note for the collage module:** this reload is a deliberate restoration of the
old semantics, not the only option. Re-applying the payload *without* reloading
is the nicer behaviour — a collage could be rearranged and re-linked live — but
it needs the load path factored out of the IIFE so it can be called twice. Worth
doing there; not worth destabilising four deployed players for.

### Red herring, recorded so it isn't chased twice

A URL pasted into Notes appears to break after `…/bd_V_Kolam/` with space left
on the line. That is ordinary text layout: everything after the final `/` is one
unbreakable ~600-char token, so the renderer breaks at the last legal
opportunity. The clipboard contains no newline.

### Verified on the live page (CDP-driven Chrome, 2026-09-11)

| Step | Result |
|---|---|
| Navigate to `#data=` symmetry 21 | textarea shows 21 |
| Change **only** the fragment to symmetry 34 | load event fires, textarea shows 34 |

That second row is the gesture that was failing: replacing the URL of an
already-running standalone.

### Known remaining limitation — re-pasting an IDENTICAL link

Edit the script locally, then paste back the **same** link to reset it: nothing
happens. Measured — 0 load events, local edit (symmetry 99) survives.

The hash is unchanged, so no `hashchange` fires; there is no event to hook, and
it cannot be fixed from inside the page. **Reload (⌘R) resets it.**

This is a real, narrow regression against `?data=`: re-entering an identical URL
containing a query reloads, whereas an identical URL differing only by fragment
does not. Accepted rather than worked around — the alternative is polling
`location.hash`, which costs a timer forever to serve one rare gesture that
already has a keyboard shortcut.

---

# The real sharing ceiling: 659 chars (macOS data detector)

**Measured 2026-09-11 via `NSDataDetector` directly.** This is the limit that
actually governs links a person clicks on a Mac or iPhone — it is an order of
magnitude tighter than GitHub's 8 KB and four orders tighter than the browser's.

| URL length | Detected |
|---|---|
| ≤ **659 chars** | full URL |
| ≥ **660 chars** | **57 chars** — `https://…/preview.html#data`, payload gone |

Over the limit the detector falls back to a short, conservative match that stops
before the `=`. The browser then loads `preview.html` with fragment `#data`,
which fails `startsWith('#data=')`, so the page shows DEFAULT_SCRIPT. Symptom:
*"the link opens the default script"* — from Notes, Mail, Messages, anything
using macOS data detection.

**This is NOT caused by the move to `#data=`.** The identical payload as
`?data=` truncates the same way at the same length (57/684, measured side by
side). It has always been broken for long links; a Kolam script carrying a
`%%bd_score` block is simply the first to cross 659.

Pasting into the **browser address bar** is unaffected — no data detection is
involved. Only click-a-link-in-an-app is.

## Compression clears it

| Same payload | URL chars | Detected |
|---|---|---|
| base64 + percent-encoding (current) | 684 | **CUT** |
| deflate + base64url | **438** | full |

So `CompressionStream('deflate-raw')` is not a nice-to-have for the collage
module — it is what keeps an ordinary single-node link clickable in Notes today.
This supersedes the "deliberately not done" note above: the 8 KB server limit
was never the binding constraint for sharing; **659 is.**

Format shape when implemented: a distinct marker (e.g. `#z=`) rather than
overloading `#data=`, so receivers can tell compressed from legacy without
guessing, and old links keep working.

## Why it worked before: the `name` field, not the script

The script never grew. The **envelope** did.

| Payload shape | URL chars | ≤ 659? |
|---|---|---|
| Pre-2026-07-17 (no `name`) | **654** | yes |
| Current (with `name`) | **686** | **no** |
| Current + deflate + base64url | **434** | yes |

`name` was added to the payload on 2026-07-17 (module-node identity for EV's
source-context). It costs ~32 chars and pushed the URL from 654 to 686 —
across the detector's 659 limit. **The link had been sitting 5 characters
under the ceiling.**

So deep links broke for app-clicks ~2 months ago, silently, and not because of
`?` → `#`: both forms are the same length and both truncate at 660. An older
saved link (in Stickies, say) still works because it *is* a pre-2026-07-17
payload, still 654 chars.

The stored, unedited `bd_V_Kolam_001` node also produces 686 — the
`%%bd_score` block is not the variable. Any payload-shape change is a
sharing-compatibility change, and there is no room left to absorb one.

### The other route to the same symptom — a real newline

If a genuine newline lands at the wrap point, the detector stops at **40
chars**: `https://wrcstewart.github.io/bd_V_Kolam/` — which returns 200 and
serves symmetry 8, i.e. the default. Measured.

BD does not emit one (copy verified at 678 bytes, zero newlines) and Notes
stores the URL unbroken (verified by reading a test note back). The visible
break when pasting is soft wrap. But anything that hard-wraps a URL in transit
produces this, and it is indistinguishable from the length failure by symptom
alone. Tell them apart by the detected length: **57 = too long, 40 = newline.**

---

# SOLVED — copy a real hyperlink, not plain text

**The 659-char limit applies to PLAIN TEXT ONLY.** `NSDataDetector` scans text
to *find* URLs. An `<a href>` is an attribute, already a link, so nothing scans
it and no length rule reaches it.

Measured through `NSAttributedString.initWithHTML…` — the exact AppKit importer
an app runs when you paste HTML into it:

| href length | After import |
|---|---|
| 659 | intact |
| 660 | **intact** (plain text dies here) |
| 1,200 | intact |
| 5,000 | intact |
| 20,000 | intact |
| **100,000** | **intact** |

The ceiling is not raised, it is **removed**.

## What ships

`copyLinkText` (BD) and `copyTextSmart` (standalones) now write **two clipboard
flavours**:

- `text/html` — `<a href="<full url>">ButterflyDreaming — bd_V_Kolam_001</a>`
- `text/plain` — the bare URL, unchanged

Paste into Notes, Mail, Messages or Stickies and you get a clickable phrase
naming what it opens. Paste into the address bar or a terminal and you get the
URL exactly as before. Both work; neither is degraded.

Degrades twice over: no `ClipboardItem` → plain text; rich write throws → plain
text. Script copying (not a URL) stays plain — an anchor there would be nonsense.

## What this means for the design

**Compression is no longer required, and neither is corpus hosting.** Those were
answers to a limit that has gone. Links stay self-contained — still working with
the laptop off, still no server, still permanent — and a 3-node collage at ~955
chars is now perfectly clickable, as would be one ten times larger.

Both remain worth having later for their own reasons: compression to keep links
from looking absurd, ids-plus-deltas to make them legible and updatable. Neither
is now load-bearing.

**Side benefit:** a pasted link reads as *"ButterflyDreaming — bd_V_Kolam_001"*
instead of 686 characters of base64 — which also disposes of the "looks like
malware" objection to sharing these at all.

---

# REVERTED to `?data=` (2026-09-12, at the user's request)

Senders emit `?data=` again. **Receivers still accept both**, so hash links
already copied keep working, and the `hashchange` reload stays for the same
reason.

## What this costs

The request-line limit comes back: **GitHub Pages 414 over ~7,995 chars**,
BD's Express 431 over ~16,157. A three-node collage encodes to 8,276, so it
will fail on a button press — no sharing involved. That is the constraint the
fragment move was made to remove; it is now back.

## What it does NOT change

The Notes truncation. Measured twice, side by side, through `NSDataDetector`:

| Form | 650 chars | 684 chars |
|---|---|---|
| `?data=` | full | **cut to 57** |
| `#data=` | full | **cut to 57** |

Identical. The detector's limit is on **length**, and both forms are the same
length for the same payload. Reverting does not address it.

The fix that does address it — copying a real `<a href>` — is **independent of
transport** and stays in place. It works the same with `?data=`.

## If the hash is nonetheless suspected

Things genuinely specific to the fragment, all fixed and none matching the
reported symptom:

- a fragment-only navigation does not reload (fixed: `hashchange` → reload)
- `location.hash` is not percent-decoded (fixed: explicit `decodeURIComponent`)
- re-pasting an identical link fires no event (documented, reload resets it)

None of these produce "a pasted link opens the default script in Notes"; they
affect an already-open tab. The 659-char detector limit does produce exactly
that, and does so for `?data=` too.
