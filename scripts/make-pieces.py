"""Generate the flat piece set into vendor/pieces/*.svg (original geometric shapes, no third-party art)."""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "vendor" / "pieces"

BASE = '<rect x="24" y="80" width="52" height="9" rx="4.5"/>'

SHAPES = {
    "P": '<circle cx="50" cy="31" r="13"/><path d="M37 78c0-16 4-24 13-30 9 6 13 14 13 30z"/>' + BASE,
    "R": '<path d="M29 17h11v9h6v-9h8v9h6v-9h11v21l-9 8v24l9 8v3H29v-3l9-8V46l-9-8z"/>' + BASE,
    "B": '<circle cx="50" cy="15" r="6"/><path d="M50 22c14 10 22 22 22 34 0 8-6 14-12 17l3 7H37l3-7c-6-3-12-9-12-17 0-12 8-24 22-34z"/>' + BASE,
    "N": '<path d="M27 80c0-22 8-38 22-50l-8-8 4-9 12 6c16 4 28 22 28 61z"/>' + BASE,
    "Q": '<circle cx="21" cy="26" r="6"/><circle cx="36" cy="16" r="6"/><circle cx="50" cy="13" r="6"/><circle cx="64" cy="16" r="6"/><circle cx="79" cy="26" r="6"/><path d="M18 36l14 24 6-30 12 28 12-28 6 30 14-24-6 42H24z"/>' + BASE,
    "K": '<path d="M46 8h8v8h8v8h-8v8h-8v-8h-8v-8h8z"/><path d="M50 34c12 0 26 6 26 22 0 8-4 14-10 18l4 6H30l4-6c-6-4-10-10-10-18 0-16 14-22 26-22z"/>' + BASE,
}
# detail cut-outs drawn in the contrast colour
DETAIL = {
    "B": '<path d="M44 34l12 12" fill="none" stroke="{d}" stroke-width="4" stroke-linecap="round"/>',
    "N": '<circle cx="56" cy="38" r="3.5" fill="{d}"/>',
}
COLORS = {"w": ("#f7f5f0", "#2b2b2b", "#2b2b2b"), "b": ("#2f3136", "#2f3136", "#f7f5f0")}

for c, (fill, stroke, detail) in COLORS.items():
    for p, body in SHAPES.items():
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            f'<g fill="{fill}" stroke="{stroke}" stroke-width="{3 if c == "w" else 0}" stroke-linejoin="round">{body}</g>'
            + DETAIL.get(p, "").format(d=detail)
            + "</svg>"
        )
        (OUT / f"{c}{p}.svg").write_text(svg)
