#!/usr/bin/env bash
# Downloads ripped FF8 Triple Triad assets for local dev (110 cards + board/frames).
# Source: https://github.com/itdelatrisu/triple-triad-html5 (mod-pack card art)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/src/renderer/assets"
CARDS="$ASSETS/cards"
BASE="https://raw.githubusercontent.com/itdelatrisu/triple-triad-html5/master/img"

mkdir -p "$CARDS"

echo "Downloading board and card frames..."
curl -fsSL "$BASE/board-mat.jpg" -o "$ASSETS/board.png"
curl -fsSL "$BASE/card.png" -o "$ASSETS/frame-blue.png"
cp "$ASSETS/frame-blue.png" "$ASSETS/frame-red.png"

echo "Downloading all 110 card images..."
failed=0
for id in $(seq 1 110); do
  file=$(printf '%03d.png' "$id")
  if curl -fsSL "$BASE/cards/$file" -o "$CARDS/$file"; then
    printf '.'
  else
    printf 'x'
    failed=$((failed + 1))
  fi
done
echo

count=$(find "$CARDS" -maxdepth 1 -name '*.png' | wc -l | tr -d ' ')
echo "Done: $count card PNGs in $CARDS"
if [[ "$failed" -gt 0 ]]; then
  echo "Warning: $failed downloads failed" >&2
  exit 1
fi
