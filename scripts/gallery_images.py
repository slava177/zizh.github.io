#!/usr/bin/env python3
"""Make the web copies of the photos on the Travel and Models pages.

The originals stay out of git and out of the site (see .gitignore and _config.yml):
photography/ holds the Travel page's, scaled_models/ the Models page's, each named like
2023-07-22-machu-picchu.heic. For every photo there (but not in folders inside them, such
as photography/not-on-site/), this writes three JPEGs into images/travel/ or images/models/:

    <name>.jpg              at most 1600px on its long side, for the full-screen view
    small/<name>-480.jpg    480px wide, for the grid on phones
    small/<name>-800.jpg    800px wide, for the grid on larger screens

Photos whose copies are newer than the original are skipped; pass --force to redo them
all. Videos are not handled here (see README.md).

Then it writes the width and height of every photo in images/travel/ and images/models/,
clips' stills included, to _data/photo_sizes.yml, for the pages to lay the photos out by
their shapes. Pass --sizes to do only that, as after adding a clip.

Needs macOS (sips reads HEIC) and Pillow. Run it from the top of the repository:

    python3 scripts/gallery_images.py
"""

import argparse
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

FOLDERS = {"photography": "images/travel", "scaled_models": "images/models"}
PHOTO_TYPES = {".heic", ".jpg", ".jpeg", ".png"}
FULL_SIZE = 1600
SIZES = Path("_data/photo_sizes.yml")
SMALL_WIDTHS = (480, 800)


def load(path):
    """The photo as a Pillow image. Pillow can't read HEIC, so sips converts those first."""
    if path.suffix.lower() != ".heic":
        return Image.open(path)
    with tempfile.TemporaryDirectory() as tmp:
        jpeg = Path(tmp) / "photo.jpg"
        subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "100", str(path), "--out", str(jpeg)],
                       check=True, capture_output=True)
        image = Image.open(jpeg)
        image.load()
        return image


def save(image, out, size, icc, quality):
    copy = image.copy()
    copy.thumbnail(size, Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    # No EXIF in the copies (it would only make them bigger); the color profile stays.
    copy.save(out, "JPEG", quality=quality, optimize=True, progressive=True, icc_profile=icc)


def write_sizes():
    """Every web copy's width and height, by page and name, into _data/photo_sizes.yml."""
    lines = [
        "# The width and height of each photo in images/travel/ and images/models/ (for a clip,",
        "# its still), written by scripts/gallery_images.py: don't edit it by hand. The Travel",
        "# and Scale Models pages lay the photos out by their shapes (_layouts/gallery.html).",
    ]
    for web_dir in FOLDERS.values():
        lines += ["", f"{Path(web_dir).name}:"]
        for path in sorted(Path(web_dir).glob("*.jpg")):
            with Image.open(path) as image:
                lines.append(f"  {path.stem}: [{image.width}, {image.height}]")
    SIZES.write_text("\n".join(lines) + "\n")
    print(f"{SIZES}  (sizes of the photos)")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--force", action="store_true", help="redo every photo, not just new or changed ones")
    parser.add_argument("--sizes", action="store_true", help="only write the photos' sizes to " + str(SIZES))
    args = parser.parse_args()
    force = args.force
    if args.sizes:
        write_sizes()
        return

    for source_dir, web_dir in FOLDERS.items():
        for path in sorted(Path(source_dir).glob("*")):
            if path.suffix.lower() not in PHOTO_TYPES:
                continue
            full = Path(web_dir) / f"{path.stem}.jpg"
            smalls = [Path(web_dir) / "small" / f"{path.stem}-{width}.jpg" for width in SMALL_WIDTHS]
            if not force and all(out.exists() and out.stat().st_mtime > path.stat().st_mtime for out in [full, *smalls]):
                continue

            image = load(path)
            icc = image.info.get("icc_profile")
            image = ImageOps.exif_transpose(image).convert("RGB")
            save(image, full, (FULL_SIZE, FULL_SIZE), icc, quality=82)
            for out, width in zip(smalls, SMALL_WIDTHS):
                save(image, out, (width, 10 * width), icc, quality=80)

            print(f"{full}  ({image.width}x{image.height} original)")

    write_sizes()


if __name__ == "__main__":
    main()
