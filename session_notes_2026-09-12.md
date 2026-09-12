# Session notes — 2026-09-11/12

Deep-link sizing, investigated to a conclusion and then largely reverted. Plus
a memory-index repair and a documentation tidy.

Ended with transport `?data=` and plain-text copy — i.e. **functionally where
the day started**. What changed is that the constraint is now measured and
written down instead of guessed at.

Canary **green** (`#copy-link-btn`). Reference: `DeepLinking.md`, which opens
with a START HERE summary.

---

## 1. Getting running again

Machine had shut down. Memgraph was already up in Docker; started the BD server
and the cloudflared tunnel. 477 nodes / 2,715 edges — the usual corpus.

Grace period was at the 5 s development value; restarted at 10 s on request.
Note that 10 s is still far below Socket.IO's 60 s `connectionStateRecovery`
window, so it does **not** save a pair across a phone screen-lock. Set
`BD_GRACE_MS=65000` for that.

## 2. Corpus text measurements

Average `text` per `:TextNode` is **592 chars**, max 1,796, total ~125,000
across 211 nodes. The four module nodes average 331.

**`size()` in Memgraph counts BYTES, not characters** — `size("道德經")` returns
9, not 3. It happens not to matter yet (the corpus is currently all English
translations, so chars and bytes differ by 130 in total) but it will the moment
Chinese source text is ingested.

## 3. The deep-link investigation

Started as "how long can a link be", ended somewhere more specific.

**Measured, against the live hosts rather than documentation:** GitHub Pages
refuses a request line over **~7,995 chars** (`414`); BD's Express over
**~16,157** (`431`, Node's 16 KB header cap). Cloudflare is not the constraint —
the tunnel matches Express because Express binds first.

A three-node collage encodes to **8,276 chars**, so it would fail **on a button
press**, sharing not involved. `window.open` is a real navigation to GitHub even
though both tabs are on this laptop.

So the payload moved to `#data=` — a fragment is never placed in the request
line, so no host's length limit can apply. Verified: a 20,000-char payload
answered 200 where it had answered 414/431.

### Two fragment gotchas, both found by the user testing

1. **A fragment-only navigation does not reload the document.** Pasting a fresh
   `#data=` link into a tab already showing the page kept the old script —
   "the deep link gave me the default". Jump was fine because `window.open`
   always makes a new document, which is exactly why only Copy failed. Fixed
   with `hashchange` → reload. Unfixable remainder: re-pasting an *identical*
   link fires no event at all; reload resets it.
2. **`location.hash` is not percent-decoded** the way `URLSearchParams.get()`
   is. Decode explicitly or `%2B` reaches `atob()` and the page falls silently
   back to `DEFAULT_SCRIPT`.

## 4. The actual cause, which was neither the hash nor a newline

Links kept failing from Notes. Two theories were wrong.

**macOS `NSDataDetector`** — the engine behind "Open Link" in Notes, Mail,
Messages and Stickies — scans **plain text** and silently truncates any URL over
**659 chars**, returning a 57-char match. Real links are ~686.

**Proven by controlled test:** two `?data=` links, identical payload shape,
differing only by 48 chars of `title` padding. 654 arrived (symmetry 5); 702 did
not (symmetry 3). Then the same 702-char link went through **Yahoo Mail
intact** — a web app whose linkifier makes an `<a href>` rather than scanning
text.

So the whole thing reduces to one rule:

| how the URL reaches the click | limit |
|---|---|
| plain text scanned by Apple data detection | **659 chars** |
| a real `<a href>` | none measured, to 100,000 |

**It broke on 2026-07-17**, when the `name` field joined the payload and took
the URL from 654 to 686. It had been sitting **5 chars** under the ceiling. An
older saved link still works because it *is* an older, shorter payload.

### The failure signature is symmetry 3, not 8

`DEFAULT_SCRIPT` is `%%bd_symmetry 3`. The **8** is the slider's `fallback` for
an out-of-range value (`min:1, max:16`), and is also what `…/bd_V_Kolam/`
(index.html — a different page) renders. Any test marker must be in 1..16, or a
*working* link renders as 8 and looks broken. Nearly walked into that with a
test link carrying symmetry 21.

### Dead ends, recorded so they are not chased again

- **The fragment was never the cause.** `?data=` and `#data=` truncate
  identically — both full at 650, both cut to 57 at 684, measured twice.
- **There is no newline.** Clipboard verified at 0 newline chars. The apparent
  break is Notes wrapping at the last legal point — which is why it *moved*
  (after `bd_V_Kolam/` under `#`, after `?` under `?`) when the format changed.
  A character cannot relocate itself.
- **Open Graph previews cannot be fixed by switching to `?`.** The standalones
  are on GitHub Pages: zero `og:` tags, byte-identical HTML for any query
  string. Dynamic tags need a server that is not in that path.

## 5. Two changes built, shipped, then reverted

Both at the user's request, and both fully deployed before reverting:

- **`#data=` transport.** Reverted to `?data=`. Receivers still accept both and
  the `hashchange` reload stays — inert, kept so 09-11 links resolve.
- **Rich `<a href>` clipboard.** Copy wrote `text/html` (a real anchor, which
  data detection never scans) beside `text/plain`. Removed the 659 limit
  entirely — hrefs survived at 100,000 chars. Reverted because the anchor label
  showed when pasting into Messages.

The cost of the revert: the ~8 KB request-line limit is live again, so the
collage module is blocked in its current shape.

## 6. JSP — designed, not built

A module script is a human-readable serialisation for storage; it has no
business being the transport format. A Kolam's state is twelve numbers carried
in 298 chars of directive text.

| | Kolam | ABC | Fractal |
|---|---|---|---|
| current URL | 650 | 664 | 822 |
| JSP URL | **181** | **266** | **188** |

Per-script deflate is only **1.44–1.82x** — an earlier claim of 2.3x was a
whole-collage figure, where repeated keys give deflate something to work with.

**ABC lags because it is 75% score.** Parameters compress to nothing; a score is
irreducible — the notes *are* the payload. Design around the params/content
split, not "all directives are equal".

A three-node collage of saved nodes is **87 chars**, against 1,730 inline today.

## 7. Housekeeping

**`MEMORY.md` was 29 KB against a ~24 KB load limit**, so it was being truncated
and entries past the cut were invisible to new sessions. Trimmed to 15 KB by
appending each over-long entry's detail verbatim to its topic file *before*
shortening the index line. Nothing deleted; pre-trim state at `398a508`.

**`DOCS_INDEX.md` rewritten** past/present/future. It still claimed 38 files
when there were 74, and 19 were missing. The eleven small corpus text-edit notes
are now one section, verified applied against the live DB.

**`PLANNING_REGISTER.md`** gained eight designs and two corrected statuses:
`convergence_node.md`'s "zero hits" evidence had become misleading (12 hits now,
all Explore vocabulary — the idea was absorbed, the design never built), and
"retire breadcrumb bars" is **done** (`BREADCRUMB_BARS = false`).

**Untracked files resolved.** `config.js.bak-*` carried the database password
and was *not* ignored — one `git add -A` would have published it. Now ignored,
along with root-level mp3s (scoped with a leading `/` so the tracked
bass-recorder samples are not caught). Migration scripts and the Tao Te Ching
ingest notes are now tracked; the 14 cypher fragments were a verified exact
duplicate and were removed.

## 8. A process failure

Commit `1058448` was described in its message as a `.gitignore` change. It
committed **34 files** — the `.gitignore` heredoc and the `git add`/`commit` ran
in one shell invocation, so files that had just stopped being reported as
untracked were swept in.

No `.mp3`, no `config.js` and no `config.js.bak` entered it, so the new ignore
rules did hold, and everything that went in was material since agreed to track.
But the message did not describe the change. Corrected in `f82a4fb`'s message.

**The lesson is the existing one, sharpened:** stage by name *and* in a separate
invocation from anything that alters what git considers untracked.
