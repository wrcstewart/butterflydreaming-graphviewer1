#!/bin/sh
# Syntax-check an ES MODULE the way a browser parses it.
#
# 2026-09-23 — written after `node --check viewer.js` reported success on a
# file containing a duplicate `const`, which stopped the whole application
# dead: no graph, no socket, and no error banner, because a module that fails
# to PARSE never runs the handler that would have reported it.
#
# --check without --input-type treats the file as CommonJS. viewer.js is a
# module (it has top-level `import`), and the two dialects do not agree about
# what is an error. Every "parses" reported here today was meaningless.
for f in "$@"; do
  if node --input-type=module --check < "$f" 2>/tmp/bd_modcheck.err; then
    echo "ok   $f"
  else
    echo "FAIL $f"; sed -n '1,6p' /tmp/bd_modcheck.err; exit 1
  fi
done
