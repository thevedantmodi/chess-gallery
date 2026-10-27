"""Generate the piece themes into vendor/pieces/<theme>/*.svg (original flat silhouettes).

Both themes are New York skylines; both colours use the same buildings. Solid fills, windows as
cut-outs, a darker right face for depth, a thin same-hue edge so pieces read on both square colours.
  a "Landmarks"  P water tower, R Guggenheim, N Flatiron, B Chrysler, K One WTC, Q 270 Park Ave
                 colours: taxi yellow (white side) vs harbour teal (black side)
  b "Supertalls" P brownstone, R 30 Rock, N 432 Park, B Steinway Tower, K Empire State, Q Central Park Tower
                 colours: black and white
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / "vendor" / "pieces"

GROUND = "M20 86h60v3H20z"


def hole(x, y, w, h):
    """Rectangular sub-path; inside an evenodd path it cuts a window."""
    return f"M{x} {y}h{w}v{h}h-{w}z"


def grid(x0, y0, cols, rows, w, h, dx, dy):
    return "".join(hole(x0 + c * dx, y0 + r * dy, w, h) for c in range(cols) for r in range(rows))


# Each piece is a list of path 'd' strings (one element each, evenodd so windows cut through).
A = {
    "P": [  # wooden water tower on a steel frame
        "M35 34L50 18l15 16z",
        "M37 34h26v28H37z" + hole(37, 41, 26, 2) + hole(37, 50, 26, 2),
        "M39 62h4v24h-4zM57 62h4v24h-4z",
        "M43 64l14 20-3 2-14-20zM57 64L43 84l3 2 14-20z",
        "M49 12h2v7h-2z",
    ],
    "R": [  # Guggenheim: widening ziggurat under a low glass dome
        "M37 88V78h26v10zM33 78V66h34v12zM29 66V54h42v12zM25 54V44h50v10z"
        + hole(40, 82, 6, 4) + hole(54, 82, 6, 4),
        "M29 44Q50 26 71 44z",
        "M48 30h4v4h-4z",
    ],
    "N": [  # Flatiron: tall prow with a heavy cornice
        "M24 88V36L50 26L66 32V88z" + grid(29, 42, 3, 5, 5, 6, 7, 9) + grid(53, 43, 2, 5, 4, 6, 5.5, 9),
        "M22 36L50 24L68 31V35L50 29L22 40z",
    ],
    "B": [  # Chrysler: setback shaft, terraced steel crown, needle
        "M30 88V74H36V50H64V74H70V88z" + grid(41, 56, 3, 2, 4, 7, 6, 9),
        "M36 50C36 34 43 24 50 18C57 24 64 34 64 50z"
        + "M44 44l3-6 3 6zM50 44l3-6 3 6zM41 36l3-5 3 5zM53 36l3-5 3 5zM47 29l3-5 3 5z",
        "M49 20L50 4l1 16z",
    ],
    "K": [  # One WTC: tapering prism, parapet, spire
        "M32 88L38 28H62L68 88z" + grid(41, 34, 3, 7, 4, 4, 6, 7),
        "M44 24h12v4H44z",
        "M49 24L50 3l1 21z",
    ],
    "Q": [  # 270 Park Avenue: stepped taper, angled crown
        "M26 88L32 64H36L40 44H43L46 26L50 10L54 26L57 44H60L64 64H68L74 88z"
        + grid(44, 48, 2, 5, 4, 4, 8, 7) + hole(47, 76, 6, 10),
    ],
}

B = {
    "P": [  # brownstone with a stoop and cornice
        "M30 36H70V88H30z" + grid(36, 44, 2, 3, 7, 10, 18, 14),
        "M27 32H73V38H27z",
        "M30 74L16 88H30z",
    ],
    "R": [  # 30 Rock: stepped slab
        "M32 88V58H36V40H40V22H44V12H56V22H60V40H64V58H68V88z" + grid(45, 18, 2, 8, 3, 7, 7, 8),
    ],
    "N": [  # 432 Park: square-grid tower, open floors, low neighbour
        "M40 6H60V88H40z" + grid(42.5, 10, 2, 9, 7, 6, 8, 8.6) + hole(40, 38, 20, 3) + hole(40, 62, 20, 3),
        "M26 66H40V88H26z",
    ],
    "B": [  # Steinway Tower: pencil-thin, terraced
        "M36 88V68H40V48H44V16L50 5L56 16V48H60V68H64V88z"
        + hole(47, 20, 6, 3) + grid(46, 30, 2, 6, 2, 8, 6, 9) + hole(43, 74, 4, 8) + hole(53, 74, 4, 8),
    ],
    "Q": [  # Central Park Tower: podium, slim shaft, raked crown
        "M30 88V74H40V50H43V20L57 8V50H60V74H70V88z" + grid(46, 24, 2, 5, 3, 6, 5, 9),
        "M49 2h2v8h-2z",
    ],
    "K": [  # Empire State
        "M28 88V62H36V52H40V34H44V26H46V18H48V9H52V18H54V26H56V34H60V52H64V62H72V88z"
        + grid(32, 66, 4, 2, 4, 8, 10, 10) + hole(46, 38, 3, 10) + hole(51, 38, 3, 10),
        "M48.5 9L50 0l1.5 9z",
    ],
}

# theme -> (shapes, {side: (fill, edge)})
THEMES = {
    "a": (A, {"w": ("#f2b705", "#a67c00"), "b": ("#17606a", "#0b3a41")}),
    "b": (B, {"w": ("#fbf9f4", "#8d8678"), "b": ("#24262b", "#6b6f78")}),
}

for name, (shapes, sides) in THEMES.items():
    out = ROOT / name
    out.mkdir(parents=True, exist_ok=True)
    for side, (fill, edge) in sides.items():
        for p, parts in shapes.items():
            body = "".join(f'<path d="{d}"/>' for d in parts + [GROUND])
            svg = (
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill-rule="evenodd">'
                f'<clipPath id="c">{body}</clipPath>'
                f'<g fill="{fill}" stroke="{edge}" stroke-width="1.2" stroke-linejoin="round">{body}</g>'
                '<rect x="50" y="0" width="50" height="100" fill="#000" fill-opacity=".2" clip-path="url(#c)"/>'
                "</svg>"
            )
            (out / f"{side}{p}.svg").write_text(svg)
