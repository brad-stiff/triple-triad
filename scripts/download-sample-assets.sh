#!/usr/bin/env bash
# Downloads a starter set of ripped FF8 Triple Triad assets for local dev.
# Full card set: see README.md (Spriters Resource / Mamoruanime rip).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/src/renderer/assets"
CARDS="$ASSETS/cards"
BASE="https://raw.githubusercontent.com/itdelatrisu/triple-triad-html5/master/img"

mkdir -p "$CARDS"

echo "Downloading board and card frames..."
curl -fsSL "$BASE/board-mat.jpg" -o "$ASSETS/board.png" || true
curl -fsSL "$BASE/card.png" -o "$ASSETS/frame-blue.png" || true
curl -fsSL "$BASE/card.png" -o "$ASSETS/frame-red.png" || true

echo "Downloading starter card art (IDs 001–005)..."
for i in 001 002 003 004 005; do
  curl -fsSL "$BASE/cards/$i.png" -o "$CARDS/$i.png" || echo "warn: failed $i"
done

echo "Done. Assets in $ASSETS"
echo "For all 110 cards, download from:"
echo "  https://www.spriters-resource.com/playstation/finalfantasy8/asset/35819/"
echo "  or clone https://github.com/itdelatrisu/triple-triad-html5 and copy img/cards/*.png"
