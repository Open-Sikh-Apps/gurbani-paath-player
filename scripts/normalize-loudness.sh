#!/usr/bin/env bash
# Copy khajana reciter folders to out/, then apply album ReplayGain to the
# MP3 bitstream (global_gain). Tags alone would not change nitro-player volume.
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COPY_ROOT="${KHAJANA_COPY_ROOT:-$(cd "$APP_ROOT/../audio-khajana-local-copy" && pwd)}"
KHAJANA_DIR="${KHAJANA_DIR:-$COPY_ROOT/khajana}"
OUT_DIR="${OUT_DIR:-$COPY_ROOT/out}"

FOLDERS=(
  "Sampooran Path - Bhai Mehnga Singh Ji (Orig)"
  "Sampooran Path - Bhai Sarwan Singh Ji (140 tracks, 78 Hrs)"
  "Sampooran Path - Giani Baljit Singh Ji (128 Hrs)"
  "Sampooran Path - Bhai Pishora Singh Ji (Orig)"
  "Sampooran Paath - Bhai Bhupinder Singh"
  "Sampooran Path - Giani Sahib Singh Ji (Markande Wale)"
)

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Copy chosen reciter folders from khajana/ into out/, then run album-mode
loudness (no re-encode) on each folder as one album.

  --sample N     Copy only the first N mp3s per folder (into out-sample/)
  --folder KEY   One reciter: mehngasingh | sarwansingh | baljitsingh | pishorasingh | bhupindersingh | sahibsingh
  --copy-only    Copy, do not run gain
  --force        Overwrite an existing destination folder
  --dry-run      Print rsync/gain commands; do not write
  -h, --help

Env: KHAJANA_COPY_ROOT, KHAJANA_DIR, OUT_DIR

Install (applies gain to the file, unlike rsgain tags):
  brew install M-Igashi/tap/mp3rgain
  # or: brew install mp3gain
EOF
}

SAMPLE=""
FOLDER_KEY=""
COPY_ONLY=0
FORCE=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sample)
      SAMPLE="${2:?--sample needs a count}"
      shift 2
      ;;
    --folder)
      FOLDER_KEY="${2:?--folder needs a key}"
      shift 2
      ;;
    --copy-only) COPY_ONLY=1; shift ;;
    --force) FORCE=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

folder_key() {
  local name="$1"
  case "$name" in
    *Mehnga*) echo mehngasingh ;;
    *Sarwan*) echo sarwansingh ;;
    *Baljit*) echo baljitsingh ;;
    *Pishora*) echo pishorasingh ;;
    *Bhupinder*) echo bhupindersingh ;;
    *Sahib*) echo sahibsingh ;;
    *) echo unknown ;;
  esac
}

selected_folders() {
  local name key
  for name in "${FOLDERS[@]}"; do
    key="$(folder_key "$name")"
    if [[ -z "$FOLDER_KEY" || "$key" == "$FOLDER_KEY" ]]; then
      printf '%s\n' "$name"
    fi
  done
}

if [[ -n "$SAMPLE" && ! "$SAMPLE" =~ ^[1-9][0-9]*$ ]]; then
  echo "--sample must be a positive integer." >&2
  exit 2
fi

if [[ -n "$FOLDER_KEY" ]]; then
  if ! selected_folders | grep -q .; then
    echo "Unknown --folder '$FOLDER_KEY'. Use mehngasingh|sarwansingh|baljitsingh|pishorasingh|bhupindersingh|sahibsingh." >&2
    exit 2
  fi
fi

if [[ ! -d "$KHAJANA_DIR" ]]; then
  echo "Missing khajana dir: $KHAJANA_DIR" >&2
  exit 1
fi

dest_root="$OUT_DIR"
if [[ -n "$SAMPLE" ]]; then
  dest_root="${OUT_DIR}-sample"
fi

find_gain_tool() {
  if command -v mp3rgain >/dev/null 2>&1; then
    echo mp3rgain
    return
  fi
  if command -v mp3gain >/dev/null 2>&1; then
    echo mp3gain
    return
  fi
  echo ""
}

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'DRY: '
    printf '%q ' "$@"
    printf '\n'
    return 0
  fi
  "$@"
}

copy_folder() {
  local src="$1" dest="$2"
  run mkdir -p "$dest"
  if [[ -n "$SAMPLE" ]]; then
    local tmp
    tmp="$(mktemp)"
    # Sorted names so a sample of 3 is repeatable; Python so we do not need GNU head -z.
    python3 - "$src" "$SAMPLE" "$tmp" <<'PY'
import os, sys
src, n, dest = sys.argv[1], int(sys.argv[2]), sys.argv[3]
names = sorted(
    f for f in os.listdir(src)
    if f.lower().endswith(".mp3") and not f.startswith(".")
)
with open(dest, "w", encoding="utf-8") as fh:
    for name in names[:n]:
        fh.write(name + "\n")
PY
    run rsync -a --files-from="$tmp" "$src/" "$dest/"
    rm -f "$tmp"
  else
    run rsync -a --exclude '.DS_Store' --include '*.mp3' --include '*.MP3' --include '*/' --exclude '*' "$src/" "$dest/"
  fi
}

apply_album_gain() {
  local dest="$1"
  local tool="$2"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "DRY: $tool -a -k -c -p --skip-errors $dest/*.mp3"
    return 0
  fi
  local files=()
  local f
  shopt -s nullglob
  for f in "$dest"/*.mp3 "$dest"/*.MP3; do
    [[ -f "$f" ]] && files+=("$f")
  done
  shopt -u nullglob
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No mp3s in $dest" >&2
    return 1
  fi
  echo "Album gain on ${#files[@]} files in $(basename "$dest") ($tool)"
  # -a one album for the whole reciter; -k/-c so batch does not stop on clip prompts.
  if [[ "$tool" == mp3rgain ]]; then
    run mp3rgain -a -k -c -p --skip-errors "${files[@]}"
  else
    run mp3gain -a -k -c -p "${files[@]}"
  fi
}

TO_PROCESS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && TO_PROCESS+=("$line")
done < <(selected_folders)
if [[ ${#TO_PROCESS[@]} -eq 0 ]]; then
  echo "No folders selected." >&2
  exit 1
fi

GAIN_TOOL=""
if [[ "$COPY_ONLY" -eq 0 ]]; then
  GAIN_TOOL="$(find_gain_tool)"
  if [[ -z "$GAIN_TOOL" ]]; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "Warning: mp3rgain/mp3gain not on PATH yet. Dry-run will pretend mp3rgain." >&2
      echo "  brew install M-Igashi/tap/mp3rgain" >&2
      GAIN_TOOL=mp3rgain
    else
      echo "Need mp3rgain or mp3gain (rsgain only writes tags; nitro-player ignores them)." >&2
      echo "  brew install M-Igashi/tap/mp3rgain" >&2
      exit 1
    fi
  fi
fi

echo "khajana: $KHAJANA_DIR"
echo "dest:    $dest_root"
echo "tool:    ${GAIN_TOOL:-none (copy-only)}"

for name in "${TO_PROCESS[@]}"; do
  src="$KHAJANA_DIR/$name"
  dest="$dest_root/$name"
  if [[ ! -d "$src" ]]; then
    echo "Missing source folder: $src" >&2
    exit 1
  fi
  if [[ -d "$dest" && "$FORCE" -eq 0 ]]; then
    shopt -s nullglob
    existing=( "$dest"/*.mp3 "$dest"/*.MP3 )
    shopt -u nullglob
    if [[ ${#existing[@]} -gt 0 ]]; then
      echo "Refusing to overwrite $dest (pass --force)." >&2
      exit 1
    fi
  fi
  echo "Copy $name"
  copy_folder "$src" "$dest"
  if [[ "$COPY_ONLY" -eq 0 ]]; then
    apply_album_gain "$dest" "$GAIN_TOOL"
  fi
done

echo "Done. Compare a quiet and a loud original vs dest, then run without --sample."
