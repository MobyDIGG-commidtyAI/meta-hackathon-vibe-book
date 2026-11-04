#!/usr/bin/env bash
# Builds the extension for a deployed VibeBook: copies extension/ to dist/vibebook-extension with config.js
# pointing at your server, and zips it. Load the folder unpacked, or hand the zip to someone else.
#   extension/package.sh https://vibebook.example.com
set -euo pipefail
url="${1:-}"
if [[ ! "$url" =~ ^https?://[^/]+$ ]]; then
  echo "usage: $0 https://your-vibebook-host   (scheme and host only, no trailing slash)" >&2
  exit 1
fi
if [[ "$url" == http://* && ! "$url" =~ ^http://(localhost|127\.0\.0\.1)(:[0-9]+)?$ ]]; then
  echo "warning: Chrome blocks an http:// panel inside facebook.com; use https unless it's localhost" >&2
fi
root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/dist/vibebook-extension"
rm -rf "$out" "$root/dist/vibebook-extension.zip"
mkdir -p "$out"
cp "$root"/extension/{manifest.json,background.js,content.js,panel.html,panel.css,panel.js} "$out"/
printf '// Where the VibeBook web app runs (set by extension/package.sh).\nglobalThis.VIBEBOOK_APP_URL = "%s";\n' "$url" > "$out/config.js"
echo "unpacked: $out"
if command -v zip >/dev/null; then
  (cd "$root/dist" && zip -qr vibebook-extension.zip vibebook-extension)
  echo "zip:      $root/dist/vibebook-extension.zip"
else
  echo "(no zip command here: share the folder, or install zip for a .zip)"
fi
