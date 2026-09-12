#!/bin/bash
# Copy module_wire_tables.js from BD (the authoring source) into each
# standalone module repo, and into BD's own served module directories.
#
# The standalones are separate repos deployed on GitHub's schedule, so a copy
# is the only way they can read this table without depending on this machine
# being awake. Run this after ANY edit to module_wire_tables.js, then commit
# and push each repo that changed.
set -u
SRC="$(cd "$(dirname "$0")" && pwd)/module_wire_tables.js"
[ -f "$SRC" ] || { echo "missing $SRC"; exit 1; }

# Only repos that actually READ the table. Add a line when a module gains a
# JSP decoder — an unused copy is just a file that can drift unnoticed.
TARGETS=(
  "/Users/williamstewart2/bd_V_Kolam/module_wire_tables.js"
  "/Users/williamstewart2/butterflydreaming_graphviewer1/V_Kolam/module_wire_tables.js"
  # "/Users/williamstewart2/bd_M_ABC/module_wire_tables.js"      # no decoder yet
  # "/Users/williamstewart2/bd_M_Fractal/module_wire_tables.js"  # no decoder yet
)

changed=0
for t in "${TARGETS[@]}"; do
  d=$(dirname "$t")
  if [ ! -d "$d" ]; then echo "  skip (no dir): $d"; continue; fi
  if [ -f "$t" ] && cmp -s "$SRC" "$t"; then
    echo "  same: $t"
  else
    cp "$SRC" "$t" && echo "  UPDATED: $t" && changed=$((changed+1))
  fi
done
echo "$changed cop$([ $changed -eq 1 ] && echo y || echo ies) updated."
[ $changed -gt 0 ] && echo "Commit and push each repo that changed."
exit 0
