"""Generate the piece themes into vendor/pieces/<theme>/*.svg (original flat shapes).

Both themes are New York skylines; both colours use the same buildings.
  a "Landmarks"  P water tower, R Guggenheim, N Flatiron, B Chrysler, K One WTC, Q 270 Park Ave
                 colours: taxi yellow (white side) vs harbour teal (black side)
  b "Supertalls" P brownstone, R 30 Rock, N 432 Park, B Steinway Tower, K Empire State, Q Central Park Tower
                 colours: black and white
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / "vendor" / "pieces"

GROUND = '<rect x="18" y="87" width="64" height="5" rx="2.5"/>'


def lines(*segs):
    """Window/detail strokes in the contrast colour; each seg is an SVG path 'd'."""
    return "".join(f'<path d="{s}" fill="none" stroke="{{d}}" stroke-width="2.5" stroke-linecap="round"/>' for s in segs)


A = {
    "P": (  # water tower
        '<rect x="37" y="62" width="4" height="26"/><rect x="59" y="62" width="4" height="26"/>'
        '<rect x="35" y="40" width="30" height="24" rx="2"/><path d="M32 40L50 24l18 16z"/>',
        lines("M35 48h30", "M35 56h30", "M41 76h18"),
    ),
    "R": (  # Guggenheim
        '<path d="M40 88L36 74h28l-4 14z"/><path d="M36 74L31 60h38l-5 14z"/><path d="M31 60L26 46h48l-5 14z"/>'
        '<path d="M32 46Q50 20 68 46z"/>',
        lines("M38 67h24", "M33 53h34", "M50 46V30"),
    ),
    "N": (  # Flatiron
        '<path d="M28 88V48l32-34 12 10v64z"/><rect x="26" y="46" width="48" height="5"/>',
        lines("M40 62v18M50 56v24M60 50v30"),
    ),
    "B": (  # Chrysler
        '<rect x="37" y="52" width="26" height="36"/><path d="M35 52Q50 22 65 52z"/><path d="M48 30L50 6l2 24z"/>',
        lines("M42 52Q50 36 58 52", "M42 64v14M50 64v14M58 64v14"),
    ),
    "K": (  # One WTC
        '<rect x="28" y="78" width="44" height="10"/><path d="M34 78L41 32h18l7 46z"/><path d="M48 32L50 4l2 28z"/>',
        lines("M45 40l-3 32M50 40v32M55 40l3 32"),
    ),
    "Q": (  # 270 Park Avenue
        '<path d="M32 88L39 46V22l11-12 11 12v24l7 42z"/>',
        lines("M33 86L46 52M67 86L54 52", "M50 22v22", "M44 34h12"),
    ),
}

B = {
    "P": (  # brownstone with stoop
        '<rect x="32" y="44" width="38" height="44"/><rect x="29" y="39" width="44" height="7"/>'
        '<path d="M32 72L18 88h14z"/>',
        lines("M40 54v8M54 54v8M40 70v8M54 70v8"),
    ),
    "R": (  # 30 Rock
        '<path d="M28 88V56h6V40h6V20h20v20h6v16h6v32z"/>',
        lines("M45 28v50M50 28v50M55 28v50", "M34 62v18M66 62v18"),
    ),
    "N": (  # 432 Park
        '<rect x="38" y="12" width="24" height="76"/><rect x="26" y="62" width="14" height="26"/>',
        lines("M44 12v76M50 12v76M56 12v76", "M38 28h24M38 44h24M38 60h24M38 76h24"),
    ),
    "B": (  # Steinway Tower
        '<rect x="37" y="62" width="26" height="26"/><rect x="40" y="38" width="20" height="26"/>'
        '<rect x="44" y="16" width="12" height="24"/><path d="M44 16Q50 2 56 16z"/>',
        lines("M43 70v10M50 70v10M57 70v10", "M46 44v14M54 44v14", "M50 22v10"),
    ),
    "Q": (  # Central Park Tower
        '<path d="M38 88V28l4-9 4 9 4-22 4 22 4-9 4 9v60z"/>',
        lines("M44 40v36M50 40v36M56 40v36"),
    ),
    "K": (  # Empire State
        '<rect x="26" y="66" width="48" height="22"/><rect x="34" y="46" width="32" height="22"/>'
        '<rect x="40" y="30" width="20" height="18"/><rect x="44" y="20" width="12" height="12"/>'
        '<rect x="48.5" y="4" width="3" height="18"/>',
        lines("M38 72v10M50 72v10M62 72v10M42 52v10M58 52v10M50 36v6"),
    ),
}

# theme -> (shapes, {side: (fill, outline, detail)})
THEMES = {
    "a": (A, {"w": ("#f5c32c", "#1b1b1b", "#1b1b1b"), "b": ("#1f7a82", "#1b1b1b", "#f3efe4")}),
    "b": (B, {"w": ("#f4f1ea", "#1b1b1b", "#1b1b1b"), "b": ("#2b2d31", "#1b1b1b", "#f4f1ea")}),
}

for name, (shapes, sides) in THEMES.items():
    out = ROOT / name
    out.mkdir(parents=True, exist_ok=True)
    for side, (fill, stroke, detail) in sides.items():
        for p, (body, det) in shapes.items():
            # black-outlined pieces vanish on dark squares only if the outline matches; light outline for dark fills
            line = "#f4f1ea" if (side == "b" and name == "b") else stroke
            svg = (
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
                f'<g fill="{fill}" stroke="{line}" stroke-width="2.5" stroke-linejoin="round">{body}{GROUND}</g>'
                + det.format(d=detail)
                + "</svg>"
            )
            (out / f"{side}{p}.svg").write_text(svg)
