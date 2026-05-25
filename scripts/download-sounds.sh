#!/usr/bin/env bash
# Optional FF8 Triple Triad SFX from triple-triad-html5 reference
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/src/renderer/assets/sounds"
BASE="https://raw.githubusercontent.com/itdelatrisu/triple-triad-html5/master/sounds"

mkdir -p "$DEST"

for f in sound-select.wav sound-card.wav sound-turn.wav sound-special.wav sound-invalid.wav sound-start.wav; do
  out="${f#sound-}"
  curl -fsSL "$BASE/$f" -o "$DEST/$out" && echo "ok $out" || echo "warn: $f"
done

echo "Sounds saved to $DEST"
