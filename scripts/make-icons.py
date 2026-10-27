"""Render the app icons: the white 8-bit knight on a slate tile, pixel-exact.

Reads the sprite from vendor/pieces/wN.svg, so run make-pieces.py first.  Needs Pillow.
  python3 scripts/make-icons.py
"""
import pathlib, re
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
BG = (47, 59, 74)  # slate
GLYPH = "wN"


def sprite():
    """Pixel dict {(x, y): (r, g, b)} cropped to its bounding box."""
    svg = (ROOT / "vendor" / "pieces" / f"{GLYPH}.svg").read_text()
    px = {}
    for x, y, w, h, fill in re.findall(r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="#(\w{6})"', svg):
        rgb = tuple(int(fill[i : i + 2], 16) for i in (0, 2, 4))
        for dx in range(int(w)):
            px[(int(x) + dx, int(y))] = rgb
    x0 = min(x for x, _ in px); y0 = min(y for _, y in px)
    return {(x - x0, y - y0): c for (x, y), c in px.items()}


def tile(size, frac):
    px = sprite()
    sw = max(x for x, _ in px) + 1; sh = max(y for _, y in px) + 1
    k = max(1, int(size * frac) // sh)
    img = Image.new("RGB", (size, size), BG)
    ox, oy = (size - sw * k) // 2, (size - sh * k) // 2
    for (x, y), c in px.items():
        img.paste(c, (ox + x * k, oy + y * k, ox + (x + 1) * k, oy + (y + 1) * k))
    return img


icons = ROOT / "icons"
for name, size, frac in [
    ("icon-32", 32, 0.8), ("icon-192", 192, 0.7), ("icon-512", 512, 0.7),
    ("icon-maskable-512", 512, 0.52), ("apple-touch-icon", 180, 0.7),
]:
    tile(size, frac).save(icons / f"{name}.png")

# scalable favicon with the same pixels
px = sprite()
sw = max(x for x, _ in px) + 1; sh = max(y for _, y in px) + 1
pad = 3
rects = "".join(f'<rect x="{x + pad}" y="{y + pad}" width="1" height="1" fill="#{c[0]:02x}{c[1]:02x}{c[2]:02x}"/>' for (x, y), c in sorted(px.items()))
(icons / "favicon.svg").write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {sw + 2 * pad} {sh + 2 * pad}" shape-rendering="crispEdges">'
    f'<rect width="100%" height="100%" rx="3" fill="rgb{BG}"/>{rects}</svg>'
)
print("icons written")
