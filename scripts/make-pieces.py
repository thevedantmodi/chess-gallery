"""Generate the Staunton piece set into vendor/pieces/*.svg.

Black set: near-black fill, white outline. White set: light-grey fill, black outline. Both get a soft
drop shadow. Each piece is a union of simple shapes: an outline pass (thick stroke) then a fill pass,
so seams between shapes vanish. Inner detail lines are drawn on top.
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "vendor" / "pieces"

BASE = '<rect x="22" y="80" width="56" height="9" rx="4"/><rect x="29" y="72" width="42" height="10" rx="4"/>'

# (shapes, detail strokes)
PIECES = {
    "P": (
        '<circle cx="50" cy="26" r="12"/><rect x="37" y="38" width="26" height="6" rx="3"/>'
        '<path d="M41 44Q42 60 32 73H68Q58 60 59 44z"/>' + BASE,
        ["M37 41h26"],
    ),
    "R": (
        '<path d="M26 34V14h11v7h6v-7h14v7h6v-7h11v20z"/><rect x="31" y="32" width="38" height="6" rx="2"/>'
        '<path d="M34 38L31 73H69L66 38z"/>' + BASE,
        ["M30 35h40", "M36 52h28"],
    ),
    "N": (
        '<path d="M27 76C27 60 31 50 40 43C34 44 29 48 24 53L18 46C21 38 32 31 40 26L38 14L47 21L52 10L58 21'
        'C72 27 77 50 73 76z"/>' + BASE,
        ["M37 33l-3 5", "M43 52q8-6 14-18"],
        '<circle cx="45" cy="30" r="2.6" class="d"/>',
    ),
    "B": (
        '<circle cx="50" cy="10" r="5"/><path d="M50 15C62 24 66 34 62 44H38C34 34 38 24 50 15z"/>'
        '<rect x="34" y="44" width="32" height="7" rx="3.5"/><path d="M41 51Q42 62 33 73H67Q58 62 59 51z"/>' + BASE,
        ["M50 24v13M44 30h12", "M43 40q-4-8 1-14"],
    ),
    "Q": (
        '<path d="M27 46L21 22L37 33L41 16L50 31L59 16L63 33L79 22L73 46z"/>'
        '<circle cx="21" cy="20" r="4"/><circle cx="41" cy="14" r="4"/><circle cx="59" cy="14" r="4"/><circle cx="79" cy="20" r="4"/>'
        '<path d="M34 46L31 73H69L66 46z"/>' + BASE,
        ["M30 48h40", "M37 60h26"],
    ),
    "K": (
        '<rect x="46.5" y="2" width="7" height="22" rx="1.5"/><rect x="40" y="8" width="20" height="7" rx="1.5"/>'
        '<path d="M31 46C28 30 38 22 50 22C62 22 72 30 69 46z"/><rect x="29" y="44" width="42" height="7" rx="3.5"/>'
        '<path d="M35 51L31 73H69L65 51z"/>' + BASE,
        ["M50 24v18", "M30 47h40", "M37 62h26"],
    ),
}
STYLE = {"w": ("#d9d9d9", "#101010"), "b": ("#161616", "#f2f2f2")}

for side, (fill, line) in STYLE.items():
    for p, parts in PIECES.items():
        shapes, strokes, *extra = parts
        detail = "".join(f'<path d="{d}"/>' for d in strokes)
        extra = (extra[0] if extra else "").replace('class="d"', f'fill="{line}" stroke="none"')
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            '<defs><filter id="s" x="-20%" y="-20%" width="150%" height="150%">'
            '<feDropShadow dx="1.5" dy="2.5" stdDeviation="1.6" flood-color="#000" flood-opacity=".55"/></filter></defs>'
            '<g filter="url(#s)">'
            f'<g fill="{line}" stroke="{line}" stroke-width="5" stroke-linejoin="round">{shapes}</g>'
            f'<g fill="{fill}" stroke="none">{shapes}</g></g>'
            f'<g fill="none" stroke="{line}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{detail}</g>'
            f"{extra}</svg>"
        )
        (OUT / f"{side}{p}.svg").write_text(svg)
