"""Generate the 8-bit piece set into vendor/pieces/*.svg.

Each piece is a 14-wide silhouette drawn as text ('#' filled, 'x' detail). The outline, the lit left
edge and the shaded right edge are derived automatically on a 16x16 pixel canvas, then written as
crisp SVG rects (runs of the same colour are merged).
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "vendor" / "pieces"
N = 16

SPRITES = {
    "P": [
        ".....####.....",
        "....######....",
        "....######....",
        ".....####.....",
        "....######....",
        ".....####.....",
        ".....####.....",
        "....######....",
        "...########...",
        "..##########..",
        "..##########..",
    ],
    "R": [
        "..##..##..##..",
        "..##..##..##..",
        "..##########..",
        "..##########..",
        "...########...",
        "....######....",
        "....######....",
        "....######....",
        "....######....",
        "...########...",
        "..##########..",
        ".############.",
        ".############.",
    ],
    "N": [
        "....#.#.......",
        "...#####......",
        "..#x#####.....",
        ".#########....",
        "###########...",
        "###########...",
        ".x#########...",
        ".....######...",
        "....#######...",
        "....########..",
        "...##########.",
        ".############.",
        ".############.",
    ],
    "B": [
        "......##......",
        ".....####.....",
        ".....####.....",
        "....##xx##....",
        "....#xxxx#....",
        "....##xx##....",
        "....######....",
        ".....####.....",
        "...########...",
        ".....####.....",
        "....######....",
        "...########...",
        "..##########..",
        ".############.",
    ],
    "Q": [
        "#...#.##.#...#",
        "#...#.##.#...#",
        "##.########.##",
        ".############.",
        "..##########..",
        "....######....",
        "....######....",
        "....######....",
        "...########...",
        "....######....",
        "....######....",
        "...########...",
        "..##########..",
        ".############.",
    ],
    "K": [
        "......##......",
        "....######....",
        "......##......",
        "......##......",
        "...########...",
        "..##########..",
        "..##########..",
        "...########...",
        "....######....",
        "...########...",
        "....######....",
        "...########...",
        "..##########..",
        ".############.",
    ],
}

# o outline, f fill, h lit edge, s shaded edge, x detail
PALETTE = {
    "w": dict(o="#15151c", f="#dcdce2", h="#ffffff", s="#9090a0", x="#15151c"),
    "b": dict(o="#f0f0f4", f="#2c2c34", h="#4c4c58", s="#131318", x="#f0f0f4"),
}


def build(rows):
    """Place the silhouette bottom-aligned on a 16x16 grid and derive outline and shading."""
    g = [["." for _ in range(N)] for _ in range(N)]
    top = 14 - len(rows) + 1
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                g[top + y][1 + x] = ch  # '#' or 'x'
    solid = lambda x, y: 0 <= x < N and 0 <= y < N and g[y][x] != "."
    out = [r[:] for r in g]
    for y in range(N):
        for x in range(N):
            if g[y][x] == ".":
                if any(solid(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    out[y][x] = "o"
            elif g[y][x] == "#":
                if not solid(x + 1, y):
                    out[y][x] = "s"
                elif not solid(x - 1, y) or not solid(x, y - 1):
                    out[y][x] = "h"
                else:
                    out[y][x] = "f"
    return out


def svg(grid, pal):
    rects = []
    for y, row in enumerate(grid):
        x = 0
        while x < N:
            ch = row[x]
            if ch == ".":
                x += 1
                continue
            k = x
            while k < N and row[k] == ch:
                k += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{k - x}" height="1" fill="{pal[ch if ch != "#" else "f"]}"/>')
            x = k
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">{"".join(rects)}</svg>'


for p, rows in SPRITES.items():
    grid = build(rows)
    for side, pal in PALETTE.items():
        (OUT / f"{side}{p}.svg").write_text(svg(grid, pal))
