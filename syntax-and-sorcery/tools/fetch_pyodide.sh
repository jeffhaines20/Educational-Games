#!/usr/bin/env bash
# Download the Pyodide core files (the same version the game loads from the CDN)
# into tools/.cache/pyodide so browser tests can run fast and offline.
#   bash tools/fetch_pyodide.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="$(node -e "global.window=global;require('$HERE/../js/config.js');console.log(SS.config.pyodideVersion)" 2>/dev/null || echo 0.29.5)"
DEST="$HERE/.cache/pyodide"
if [ -f "$DEST/pyodide.js" ] && [ "$(cat "$DEST/.version" 2>/dev/null)" = "$VERSION" ]; then
  echo "Pyodide $VERSION already in $DEST"; exit 0
fi
TMP="$(mktemp -d)"
( cd "$TMP" && npm pack "pyodide@$VERSION" --silent >/dev/null && tar xzf "pyodide-$VERSION.tgz" )
rm -rf "$DEST" && mkdir -p "$DEST"
cp "$TMP"/package/{pyodide.js,pyodide.asm.js,pyodide.asm.wasm,python_stdlib.zip,pyodide-lock.json} "$DEST"/
echo "$VERSION" > "$DEST/.version"
rm -rf "$TMP"
echo "Pyodide $VERSION ready in $DEST"
