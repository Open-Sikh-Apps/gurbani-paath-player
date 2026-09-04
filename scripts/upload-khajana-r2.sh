#!/usr/bin/env bash
# Upload publish/upload tree to R2. Resume via upload-done.txt. Never touches khajana/.
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COPY_ROOT="${KHAJANA_COPY_ROOT:-$(cd "$APP_ROOT/../audio-khajana-local-copy" && pwd)}"
UPLOAD_DIR="${UPLOAD_DIR:-$COPY_ROOT/upload}"
BUCKET="${R2_BUCKET:-gurbaniaudioplayerfiles}"
CACHE_CONTROL="public, max-age=31536000, immutable"
DONE_FILE="$COPY_ROOT/upload-done.txt"

if [[ ! -d "$UPLOAD_DIR/audio" ]]; then
  echo "Missing $UPLOAD_DIR/audio — run: npm run khajana:build-catalogue" >&2
  exit 1
fi

touch "$DONE_FILE"

put_object() {
  local key="$1"
  local file="$2"
  local type="$3"
  if grep -qxF "$key" "$DONE_FILE"; then
    echo "skip $key"
    return 0
  fi
  echo "put $key"
  npx wrangler r2 object put "$BUCKET/$key" \
    --file "$file" \
    --remote \
    --content-type "$type" \
    --cache-control "$CACHE_CONTROL"
  echo "$key" >>"$DONE_FILE"
}

cd "$UPLOAD_DIR"
while IFS= read -r rel; do
  put_object "$rel" "$UPLOAD_DIR/$rel" "audio/mpeg"
done < <(find audio -type f -name '*.mp3' | sort)

if [[ -f "$UPLOAD_DIR/images/sggsj.jpg" ]]; then
  put_object "images/sggsj.jpg" "$UPLOAD_DIR/images/sggsj.jpg" "image/jpeg"
fi

echo "Done. Next: copy catalogue.json and catalogue.version.json into gurbani-paath-player-catalogue and push."
