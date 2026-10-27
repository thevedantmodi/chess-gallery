"""Generate the 8-bit piece set into vendor/pieces/*.svg.

Silhouettes were traced from the reference sprite sheet (9x18 pixels per piece, knight 10 wide).
Black pieces are a solid silhouette; white pieces get a dark outline, a white lit edge, light fill and
a shaded right edge, derived from the same silhouette. Written as crisp SVG rects on a 19x19 canvas.
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "vendor" / "pieces"
N = 19  # canvas; pieces are bottom-aligned and centred

MASKS = {
    "P": [
        "...###...",
        "..#####..",
        "..#####..",
        "..#####..",
        "...###...",
        ".#######.",
        ".#######.",
        "..#####..",
        "..#####..",
        ".#######.",
        ".#######.",
        "#########",
        "#########",
        ".#######.",
    ],
    "R": [
        ".##.#.##.",
        ".#######.",
        ".#######.",
        "#########",
        "#########",
        ".#######.",
        "..#####..",
        "..#####..",
        "..#####..",
        "..#####..",
        "..#####..",
        ".#######.",
        ".#######.",
        "#########",
        "#########",
        ".#######.",
    ],
    "N": [
        "......#...",
        "....####..",
        "...######.",
        "..########",
        ".#########",
        "##########",
        "##########",
        ".#########",
        "...######.",
        "..#######.",
        "..#######.",
        "...#####..",
        "...#####..",
        "..#######.",
        "..#######.",
        ".#########",
        ".#########",
        "..#######.",
    ],
    "B": [
        "....#....",
        "...###...",
        "..#####..",
        "...###...",
        "..#####..",
        ".#######.",
        ".#######.",
        ".#######.",
        "..#####..",
        ".#######.",
        ".#######.",
        "..#####..",
        "..#####..",
        ".#######.",
        ".#######.",
        "#########",
        "#########",
        ".#######.",
    ],
    "Q": [
        "#...#...#",
        "#.#.#.#.#",
        "#########",
        ".#######.",
        "..#####..",
        ".#######.",
        ".#######.",
        "..#####..",
        "..#####..",
        ".#######.",
        ".#######.",
        "..#####..",
        "..#####..",
        ".#######.",
        ".#######.",
        "#########",
        "#########",
        ".#######.",
    ],
    "K": [
        "....#....",
        "...###...",
        "....#....",
        "...###...",
        "..#####..",
        ".#######.",
        ".#######.",
        "..#####..",
        "..#####..",
        ".#######.",
        ".#######.",
        "..#####..",
        "..#####..",
        ".#######.",
        ".#######.",
        "#########",
        "#########",
        ".#######.",
    ],
}
# single pixels (row, col) inside the mask: knight's eye
DETAIL = {"N": [(4, 4)]}

DARK, FILL, SHADE, LIGHT = "#2b2829", "#c8c0b8", "#9b948c", "#f1eee8"
BLACK, EYE_ON_BLACK = "#312c2d", "#a39d9b"


def place(rows):
    """Return {(x, y): True} for the silhouette, bottom-aligned and centred on the canvas."""
    top = N - len(rows)
    left = (N - 9) // 2
    return {(left + x, top + y): (x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == "#"}


def colour_grid(piece, side):
    rows = MASKS[piece]
    cells = place(rows)
    solid = lambda x, y: (x, y) in cells
    col = {}
    for (x, y), (mx, my) in cells.items():
        if side == "b":
            col[(x, y)] = BLACK
            continue
        edge = not (solid(x - 1, y) and solid(x + 1, y) and solid(x, y - 1) and solid(x, y + 1))
        col[(x, y)] = DARK if edge else FILL
    if side == "w":  # lit left, shaded right, per run of interior pixels
        for y in range(N):
            x = 0
            while x < N:
                if col.get((x, y)) == FILL:
                    k = x
                    while col.get((k, y)) == FILL:
                        k += 1
                    n = k - x
                    if n >= 2:
                        col[(k - 1, y)] = SHADE
                    if n >= 4:
                        col[(x, y)] = LIGHT
                    x = k
                else:
                    x += 1
    for r, c in DETAIL.get(piece, []):
        pos = next(p for p, (mx, my) in cells.items() if (my, mx) == (r, c))
        col[pos] = DARK if side == "w" else EYE_ON_BLACK
    return col


def svg(col):
    rects = []
    for y in range(N):
        x = 0
        while x < N:
            c = col.get((x, y))
            if not c:
                x += 1
                continue
            k = x
            while col.get((k, y)) == c:
                k += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{k - x}" height="1" fill="{c}"/>')
            x = k
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" shape-rendering="crispEdges">{"".join(rects)}</svg>'


for p in MASKS:
    for side in "wb":
        (OUT / f"{side}{p}.svg").write_text(svg(colour_grid(p, side)))
