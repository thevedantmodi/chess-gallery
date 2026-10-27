"""Generate the 8-bit piece set into vendor/pieces/*.svg.

Each piece is a text silhouette (11 wide, up to 14 tall): '#' is body, 'o' is a detail pixel cut into the
body (eye, mitre slit, crown gaps). Every piece gets a dark 1px outline so it reads on light and dark
squares; the body is then shaded (lit left edge, shaded right edge) in a light or dark palette. Written as
crisp SVG rects on a 16x16 canvas, bottom-aligned and centred.
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "vendor" / "pieces"
N = 16
W = 11

MASKS = {
    "P": [
        "....###....",
        "...#####...",
        "...#####...",
        "....###....",
        "...#####...",
        "....###....",
        "...#####...",
        "..#######..",
        ".#########.",
        "###########",
    ],
    "R": [
        "###.###.###",
        "###########",
        ".#########.",
        "..#######..",
        "...#####...",
        "...#####...",
        "...#####...",
        "...#####...",
        "..#######..",
        ".#########.",
        "###########",
        "###########",
    ],
    "N": [
        "....#.#....",
        "...#####...",
        "..#######..",
        ".#########.",
        "##o#######.",
        "#########..",
        "###..#####.",
        "##...######",
        "......#####",
        ".....######",
        "....#######",
        "...########",
        "..#########",
        ".##########",
    ],
    "B": [
        ".....#.....",
        "....###....",
        "...#####...",
        "...##o##...",
        "...#####...",
        "....###....",
        "...#####...",
        "....###....",
        "...#####...",
        "..#######..",
        ".#########.",
        "###########",
    ],
    "Q": [
        "#...#.#...#",
        "##.##.##.##",
        "###########",
        ".#########.",
        "..#######..",
        "...#####...",
        "...#####...",
        "...#####...",
        "..#######..",
        ".#########.",
        "###########",
        "###########",
    ],
    "K": [
        ".....#.....",
        "...#####...",
        ".....#.....",
        "..#######..",
        ".#########.",
        "###########",
        ".#########.",
        "..#######..",
        "...#####...",
        "..#######..",
        ".#########.",
        "###########",
        "###########",
    ],
}

OUTLINE = "#1f1b1c"
WHITE = {"fill": "#e6dfd4", "light": "#ffffff", "shade": "#a8a095", "detail": OUTLINE}
BLACK = {"fill": "#4a4445", "light": "#7a7273", "shade": "#2c2829", "detail": "#d6d0cb"}


def colour_grid(piece, side):
    pal = WHITE if side == "w" else BLACK
    rows = MASKS[piece]
    top = N - 1 - len(rows)
    left = (N - W) // 2
    body = {}
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in "#o":
                body[(left + x, top + y)] = ch
    col = {}
    for (x, y), ch in body.items():
        col[(x, y)] = pal["detail"] if ch == "o" else pal["fill"]
    # outline: any empty pixel 4-adjacent to the body
    for (x, y) in body:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) not in body:
                col[(x + dx, y + dy)] = OUTLINE
    # lit left, shaded right, per run of body pixels
    for y in range(N):
        x = 0
        while x < N:
            if body.get((x, y)) == "#":
                k = x
                while body.get((k, y)) == "#":
                    k += 1
                n = k - x
                if n >= 2:
                    col[(k - 1, y)] = pal["shade"]
                if n >= 3:
                    col[(x, y)] = pal["light"]
                x = k
            else:
                x += 1
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
