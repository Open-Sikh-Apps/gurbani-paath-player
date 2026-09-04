#!/usr/bin/env python3
"""Write catalogue title/artist/album/track onto upload/ mp3s. Keep ReplayGain. No artwork."""

from __future__ import annotations

import csv
import json
import os
import subprocess
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent.parent
VENV_PYTHON = APP_ROOT / ".venv-khajana" / "bin" / "python3"

try:
    from mutagen.id3 import ID3, TALB, TCON, TIT2, TPE1, TPE2, TRCK, TXXX, ID3NoHeaderError
except ImportError:
    if not VENV_PYTHON.is_file():
        subprocess.check_call(
            [sys.executable, "-m", "venv", str(APP_ROOT / ".venv-khajana")]
        )
    subprocess.check_call([str(VENV_PYTHON), "-m", "pip", "install", "mutagen"])
    os.execv(str(VENV_PYTHON), [str(VENV_PYTHON), str(Path(__file__).resolve()), *sys.argv[1:]])
COPY_ROOT = Path(
    os.environ.get(
        "KHAJANA_COPY_ROOT",
        APP_ROOT.parent / "audio-khajana-local-copy",
    )
)
UPLOAD_DIR = COPY_ROOT / "upload"
CATALOGUE_PATH = COPY_ROOT / "catalogue.json"
MOCK_PATH = APP_ROOT / "src/catalogue/mock-catalogue.json"
MANIFEST_PATH = COPY_ROOT / "manifest.csv"
BYTE_SIZE_MAX = 512 * 1024 * 1024


def load_id3(path: Path) -> ID3:
    try:
        return ID3(path)
    except ID3NoHeaderError:
        return ID3()


def tag_file(
    path: Path,
    *,
    title: str,
    artist: str,
    album: str,
    track_no: int,
    track_total: int,
) -> None:
    tags = load_id3(path)
    replaygain = [
        frame
        for frame in tags.getall("TXXX")
        if (frame.desc or "").upper().startswith("REPLAYGAIN")
    ]
    for key in list(tags):
        del tags[key]
    tags.add(TIT2(encoding=3, text=[title]))
    tags.add(TPE1(encoding=3, text=[artist]))
    tags.add(TPE2(encoding=3, text=[artist]))
    tags.add(TALB(encoding=3, text=[album]))
    tags.add(TRCK(encoding=3, text=[f"{track_no}/{track_total}"]))
    tags.add(TCON(encoding=3, text=["Speech"]))
    for frame in replaygain:
        tags.add(
            TXXX(encoding=3, desc=frame.desc, text=list(frame.text)),
        )
    # v2.4 UTF-8; do not add APIC — one JPEG per file would add hundreds of MB.
    tags.save(path, v2_version=4)


def main() -> None:
    if not CATALOGUE_PATH.is_file():
        raise SystemExit(f"Missing {CATALOGUE_PATH}")
    catalogue = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))
    reciters = {row["id"]: row["name"]["en"] for row in catalogue["reciters"]}
    scriptures = {row["id"]: row["name"]["en"] for row in catalogue["scriptures"]}
    sizes: dict[str, int] = {}

    for collection in catalogue["collections"]:
        reciter = reciters[collection["reciterId"]]
        scripture = scriptures[collection["scriptureId"]]
        album = f"{scripture} — {reciter}"
        tracks = collection["tracks"]
        total = len(tracks)
        for index, track in enumerate(tracks, start=1):
            rel = track["url"].lstrip("/")
            path = UPLOAD_DIR / rel
            if not path.is_file():
                raise SystemExit(f"Missing {path}")
            tag_file(
                path,
                title=track["title"]["en"],
                artist=reciter,
                album=album,
                track_no=index,
                track_total=total,
            )
            size = path.stat().st_size
            if not (1 <= size <= BYTE_SIZE_MAX):
                raise SystemExit(f"byteSize {size} out of range for {path}")
            track["byteSize"] = size
            sizes[track["id"]] = size
        print(f"{reciter}: {total} tagged")

    payload = json.dumps(catalogue, indent=2, ensure_ascii=False) + "\n"
    CATALOGUE_PATH.write_text(payload, encoding="utf-8")
    MOCK_PATH.write_text(payload, encoding="utf-8")

    if MANIFEST_PATH.is_file():
        with MANIFEST_PATH.open(encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))
            fieldnames = list(rows[0].keys()) if rows else []
        for row in rows:
            track_id = row.get("track_id")
            if track_id in sizes:
                row["byte_size"] = str(sizes[track_id])
        with MANIFEST_PATH.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    print(f"Tagged {len(sizes)} files and refreshed byteSize")


if __name__ == "__main__":
    main()
