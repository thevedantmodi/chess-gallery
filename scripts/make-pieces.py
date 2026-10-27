"""Generate the piece set into vendor/pieces/*.svg.

White = New York, Black = San Francisco. Each piece is a skyline landmark (original flat shapes).
  NY: K Empire State, Q Chrysler, R Woolworth, B One WTC, N Flatiron, P brownstone + water tower
  SF: K Salesforce Tower, Q Transamerica, R Coit Tower, B Sutro Tower, N Golden Gate, P Victorian
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "vendor" / "pieces"

GROUND = '<rect x="18" y="87" width="64" height="5" rx="2.5"/>'


def lines(*segs):
    """Window/detail strokes in the contrast colour: each seg is an SVG path 'd'."""
    return "".join(f'<path d="{s}" fill="none" stroke="{{d}}" stroke-width="2.5" stroke-linecap="round"/>' for s in segs)


# body (fill + outline) and detail (contrast colour) per piece
NY = {
    "P": (
        '<rect x="30" y="58" width="40" height="30"/><rect x="27" y="53" width="46" height="7"/>'
        '<rect x="41" y="38" width="18" height="15"/><path d="M39 38L50 28l11 10z"/>',
        lines("M38 68v6M50 68v6M62 68v6"),
    ),
    "R": (
        '<rect x="26" y="60" width="48" height="28"/><rect x="32" y="30" width="36" height="32"/>'
        '<path d="M32 30V18h8v6h6v-6h8v6h6v-6h8v12z"/>',
        lines("M40 38v16M50 38v16M60 38v16M36 70v10M50 70v10M64 70v10"),
    ),
    "N": (
        '<path d="M28 88V50l30-34 14 10v62z"/>',
        lines("M40 58v22M50 48v32M60 40v40"),
    ),
    "B": (
        '<path d="M30 88L41 32h7L50 5l2 27h7l11 56z"/>',
        lines("M45 44l-4 34M55 44l4 34"),
    ),
    "Q": (
        '<rect x="34" y="50" width="32" height="38"/><path d="M34 50Q50 18 66 50z"/><path d="M48 28L50 6l2 22z"/>',
        lines("M42 50Q50 32 58 50", "M42 62v16M50 62v16M58 62v16"),
    ),
    "K": (
        '<rect x="26" y="66" width="48" height="22"/><rect x="34" y="46" width="32" height="22"/>'
        '<rect x="40" y="30" width="20" height="18"/><rect x="44" y="20" width="12" height="12"/>'
        '<rect x="48.5" y="4" width="3" height="18"/>',
        lines("M38 72v10M50 72v10M62 72v10M42 52v10M58 52v10M50 36v6"),
    ),
}
SF = {
    "P": (
        '<rect x="30" y="56" width="40" height="32"/><path d="M26 58L50 34l24 24z"/>',
        lines("M38 66v10", "M60 64v14") + '<circle cx="50" cy="47" r="3" fill="{d}"/>',
    ),
    "R": (
        '<rect x="30" y="76" width="40" height="12"/><rect x="38" y="30" width="24" height="48"/>'
        '<rect x="34" y="20" width="32" height="12" rx="2"/><rect x="44" y="10" width="12" height="10" rx="2"/>',
        lines("M45 38v32M50 38v32M55 38v32", "M40 26h20"),
    ),
    "N": (
        '<rect x="36" y="16" width="8" height="72"/><rect x="56" y="16" width="8" height="72"/>'
        '<rect x="36" y="30" width="28" height="5"/><rect x="36" y="50" width="28" height="5"/>'
        '<rect x="22" y="72" width="70" height="6"/>'
        '<path d="M64 18Q80 62 92 70" fill="none" stroke="currentColor" stroke-width="3"/>',
        "",
    ),
    "B": (
        '<path d="M26 88L36 26h6L38 88z"/><path d="M74 88L64 26h-6l4 62z"/>'
        '<path d="M44 88L47 12l3-9 3 9 3 76z"/>',
        lines("M40 50h20", "M38 68h24"),
    ),
    "Q": (
        '<path d="M30 88L47 24h6l17 64z"/><path d="M48 24L50 5l2 19z"/>'
        '<rect x="33" y="38" width="9" height="26"/><rect x="58" y="38" width="9" height="26"/>',
        lines("M46 44h8M44 56h12M42 68h16"),
    ),
    "K": (
        '<path d="M36 88V40Q36 16 50 16Q64 16 64 40v48z"/><rect x="48.5" y="4" width="3" height="14"/>',
        lines("M42 40v36M50 28v48M58 40v36"),
    ),
}

# (fill, outline, detail) per side
STYLE = {"w": (NY, "#f1ece0", "#1f2937", "#1f2937"), "b": (SF, "#d9432f", "#1f2937", "#f1ece0")}

for c, (set_, fill, stroke, detail) in STYLE.items():
    for p, (body, det) in set_.items():
        body = body.replace("currentColor", stroke)
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            f'<g fill="{fill}" stroke="{stroke}" stroke-width="2.5" stroke-linejoin="round">{body}{GROUND}</g>'
            + det.format(d=detail)
            + "</svg>"
        )
        (OUT / f"{c}{p}.svg").write_text(svg)
