"""Prepare small transparent WebP copies of the supplied PNG artwork."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
icons = root / "assets/images/background/icons"
sources = root / "design-sources/background-icons"
for name in ("facebook", "lazada", "shopee", "tiki", "tiktok", "website", "zalo"):
    source = sources / f"{name}-clean.png"
    target = icons / f"{name}.webp"
    with Image.open(source) as image:
        image.convert("RGBA").resize((320, 320), Image.Resampling.LANCZOS).save(
            target, "WEBP", quality=90, method=6
        )
    print(f"{name}: {source.stat().st_size:,} -> {target.stat().st_size:,} bytes")
