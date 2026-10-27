"""Generate the piece themes into vendor/pieces/<theme>/*.svg.

Minimalist metallic pieces built from three primitives: isometric prisms, pyramids and spheres,
each shaded with brushed-metal gradients (lit top, mid left face, dark right face).
  a "Platinum"  polished silver (white side) vs gunmetal (black side)
  b "Gold"      champagne gold (white side) vs obsidian (black side)
Height order: K > Q > B > R > N > P.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / "vendor" / "pieces"
CX = 50


def P(*pts):
    return " ".join(f"{x:.2f},{y:.2f}" for x, y in pts)


def prism(w, yt, yb, slot=False):
    """Square prism seen isometrically: [(face, points)]. yt/yb are the left/right edge heights."""
    d, l, r = w * 0.25, CX - w / 2, CX + w / 2
    out = [
        ("l", P((l, yt), (CX, yt + d), (CX, yb + d), (l, yb))),
        ("r", P((CX, yt + d), (r, yt), (r, yb), (CX, yb + d))),
        ("t", P((l, yt), (CX, yt - d), (r, yt), (CX, yt + d))),
    ]
    if slot:  # hollow top, for the rook
        s = 0.3
        out.append(("s", P((CX - w * s, yt), (CX, yt - d * 0.6), (CX + w * s, yt), (CX, yt + d * 0.6))))
    return out


def pyramid(w, yb, ytip):
    d, l, r = w * 0.25, CX - w / 2, CX + w / 2
    return [
        ("l", P((l, yb), (CX, yb + d), (CX, ytip))),
        ("r", P((CX, yb + d), (r, yb), (CX, ytip))),
    ]


def wedge(w, yt, yb, f):
    """Prism whose top slopes down toward the front-right by f."""
    d, l, r = w * 0.25, CX - w / 2, CX + w / 2
    return [
        ("l", P((l, yt), (CX, yt + d + f), (CX, yb + d), (l, yb))),
        ("r", P((CX, yt + d + f), (r, yt + f), (r, yb), (CX, yb + d))),
        ("t", P((l, yt), (CX, yt - d), (r, yt + f), (CX, yt + d + f))),
    ]


def sphere(cy, r):
    return [("o", (CX, cy, r))]


PLINTH = prism(46, 80, 88)

SHAPES = {
    "P": prism(26, 60, 80) + sphere(48, 11),
    "R": prism(26, 38, 80) + prism(34, 24, 38, slot=True),
    "N": prism(34, 66, 80) + wedge(26, 30, 66, 16),
    "B": prism(24, 44, 80) + pyramid(24, 44, 8),
    "Q": prism(32, 56, 80) + prism(22, 28, 56) + sphere(18, 9),
    "K": prism(34, 58, 80) + prism(22, 32, 58) + prism(6, 8, 32) + prism(20, 16, 20),
}

# metal ramps: (offset, colour) stops per face; brushed bands give the polished look
SILVER = dict(
    t=[(0, "#ffffff"), (1, "#d3dae2")],
    l=[(0, "#f4f6f9"), (0.45, "#c3cad3"), (0.5, "#8f99a6"), (1, "#dde2e8")],
    r=[(0, "#b8c0ca"), (0.45, "#8a94a1"), (0.5, "#5a6471"), (1, "#8c96a3")],
    o=[(0, "#ffffff"), (0.45, "#b9c1cb"), (1, "#566170")],
)
GUNMETAL = dict(
    t=[(0, "#6a7280"), (1, "#323843")],
    l=[(0, "#4a515d"), (0.45, "#2e333c"), (0.5, "#1a1d23"), (1, "#3a404a")],
    r=[(0, "#2a2f37"), (0.45, "#181b20"), (0.5, "#0b0c0f"), (1, "#1c1f25")],
    o=[(0, "#8a93a1"), (0.4, "#363c47"), (1, "#0d0f12")],
)
GOLD = dict(
    t=[(0, "#fff6d0"), (1, "#ecd07a")],
    l=[(0, "#fbe9a5"), (0.45, "#dcb95a"), (0.5, "#a8802a"), (1, "#e9cf7d")],
    r=[(0, "#c9a042"), (0.45, "#a47c2a"), (0.5, "#6f4f16"), (1, "#a67f2e")],
    o=[(0, "#fffbe6"), (0.4, "#e0bd5c"), (1, "#7a5718")],
)
OBSIDIAN = dict(
    t=[(0, "#4b4f5a"), (1, "#1c1e24")],
    l=[(0, "#33363f"), (0.45, "#1f2127"), (0.5, "#0e0f12"), (1, "#2a2d34")],
    r=[(0, "#1a1c21"), (0.45, "#0f1013"), (0.5, "#050506"), (1, "#121316")],
    o=[(0, "#7d828f"), (0.4, "#23262d"), (1, "#050506")],
)
THEMES = {"a": {"w": SILVER, "b": GUNMETAL}, "b": {"w": GOLD, "b": OBSIDIAN}}


def gradients(pal):
    out = []
    for k, stops in pal.items():
        s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
        if k == "o":
            out.append(f'<radialGradient id="g{k}" cx=".35" cy=".3" r=".8">{s}</radialGradient>')
        else:
            out.append(f'<linearGradient id="g{k}" x1="0" y1="0" x2="1" y2="1">{s}</linearGradient>')
    return "".join(out)


def render(parts, pal):
    out = []
    for face, geo in parts:
        if face == "o":
            cx, cy, r = geo
            out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#go)"/>')
        elif face == "s":
            out.append(f'<polygon points="{geo}" fill="#000" fill-opacity=".45" stroke="none"/>')
        else:
            out.append(f'<polygon points="{geo}" fill="url(#g{face})"/>')
    return "".join(out)


for name, sides in THEMES.items():
    out = ROOT / name
    out.mkdir(parents=True, exist_ok=True)
    for side, pal in sides.items():
        for p, parts in SHAPES.items():
            svg = (
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
                f"<defs>{gradients(pal)}</defs>"
                '<g stroke="#fff" stroke-opacity=".28" stroke-width=".7" stroke-linejoin="round">'
                f"{render(PLINTH, pal)}{render(parts, pal)}</g></svg>"
            )
            (out / f"{side}{p}.svg").write_text(svg)
