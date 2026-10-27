"""Render the mark to PNG app icons with headless Chromium.  python scripts/make-icons.py"""
import os, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
BG, INK = "#ededeb", "#141414"
MARK = """<svg viewBox="0 0 40 30" fill="none" stroke="%s" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="%d" height="%d">
<path d="M4 9h8l2-4h12l2 4h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z"/>
<rect x="30" y="6" width="5" height="3"/><circle cx="20" cy="18" r="8.5"/>
<circle cx="20" cy="14.6" r="2"/><path d="M17.6 22.4l1.1-4.2h2.6l1.1 4.2z"/><path d="M16.9 22.4h6.2"/></svg>"""

def page(size, frac):
    w = int(size * frac); h = int(w * 30 / 40)
    return f"<body style='margin:0;background:{BG};width:{size}px;height:{size}px;display:grid;place-items:center'>{MARK % (INK, w, h)}</body>"

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, size, frac in [("icon-192", 192, .66), ("icon-512", 512, .66), ("icon-maskable-512", 512, .5), ("apple-touch-icon", 180, .66)]:
        pg = b.new_page(viewport={"width": size, "height": size})
        pg.set_content(page(size, frac))
        pg.screenshot(path=str(ROOT / "icons" / f"{name}.png"))
    b.close()
print("icons written")
