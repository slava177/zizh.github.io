#!/usr/bin/env python3
"""Make the web copies of the photos on the Travel and Models pages.

The originals stay out of git and out of the site (see .gitignore and _config.yml):
photography/ holds the Travel page's, scaled_models/ the Models page's, each named like
2023-07-22-machu-picchu.heic. For every photo there, this writes three JPEGs into
images/travel/ or images/models/:

    <name>.jpg              at most 1600px on its long side, for the full-screen view
    small/<name>-480.jpg    480px wide, for the grid on phones
    small/<name>-800.jpg    800px wide, for the grid on larger screens

and prints the photo's camera settings, ready to paste under `specs:` in
_data/travel.yml or _data/models.yml. Photos whose copies are newer than the original
are skipped; pass --force to redo them all. Videos are not handled here (see README.md).

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
SMALL_WIDTHS = (480, 800)
CAMERA_NAMES = {"ILCE-6000": "Sony α6000", "LE2100": "OnePlus 9"}


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


def specs(exif):
    """Camera, focal length (35 mm equivalent), shutter speed, aperture and ISO, as far as the EXIF has them."""
    settings = exif.get_ifd(0x8769)
    found = {}
    if exif.get(0x0110):
        model = exif[0x0110].strip("\0 ")
        found["Camera"] = CAMERA_NAMES.get(model, model)
    if settings.get(0xA405):  # left out when the camera doesn't give the 35 mm equivalent
        found["Focal length"] = f"{settings[0xA405]} mm"
    shutter = settings.get(0x829A)
    if shutter:
        shutter = float(shutter)
        found["Shutter speed"] = f"{shutter:g} sec" if shutter >= 1 else f"1/{round(1 / shutter)} sec"
    if settings.get(0x829D):
        found["Aperture"] = f"f/{float(settings[0x829D]):g}"
    if settings.get(0x8827):
        found["ISO"] = settings[0x8827]
    return found


def save(image, out, size, icc, quality):
    copy = image.copy()
    copy.thumbnail(size, Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    # No EXIF in the copies (it would only make them bigger); the color profile stays.
    copy.save(out, "JPEG", quality=quality, optimize=True, progressive=True, icc_profile=icc)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--force", action="store_true", help="redo every photo, not just new or changed ones")
    force = parser.parse_args().force

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
            settings = specs(image.getexif())
            image = ImageOps.exif_transpose(image).convert("RGB")
            save(image, full, (FULL_SIZE, FULL_SIZE), icc, quality=82)
            for out, width in zip(smalls, SMALL_WIDTHS):
                save(image, out, (width, 10 * width), icc, quality=80)

            print(f"{full}  ({image.width}x{image.height} original)")
            for key, value in settings.items():
                print(f"    {key}: {value}")


if __name__ == "__main__":
    main()
