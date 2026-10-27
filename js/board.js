// A board you can tap or drag. One class serves play, review and retake.

const FILES = "abcdefgh";

function parseFen(fen) {
  const out = {};
  fen
    .split(" ")[0]
    .split("/")
    .forEach((row, ri) => {
      let f = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) f += +ch;
        else {
          out[FILES[f] + (8 - ri)] = (ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase();
          f++;
        }
      }
    });
  return out;
}

export class Board {
  /**
   * handlers: {
   *   canMove(sq) -> bool       can the piece on sq be picked up?
   *   onSelect(sq|null)         a square was tapped / a drag began
   *   onMove(from, to)          a move was attempted
   * }
   */
  constructor(el, handlers = {}) {
    this.el = el;
    this.h = handlers;
    this.orient = "w";
    this.s = { fen: "8/8/8/8/8/8/8/8 w - - 0 1", interactive: false, targets: [], sel: null };
    this.drag = null;
    el.classList.add("board");
    this._layout();
    el.addEventListener("pointerdown", (e) => this._down(e));
    el.addEventListener("pointermove", (e) => this._move(e));
    el.addEventListener("pointerup", (e) => this._up(e));
    el.addEventListener("pointercancel", () => this._cancel());
  }

  _layout() {
    this.el.innerHTML = "";
    this.sqs = {};
    const ranks = this.orient === "w" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const files = this.orient === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    for (const r of ranks) {
      for (const f of files) {
        const sq = FILES[f] + r;
        const d = document.createElement("div");
        d.dataset.sq = sq;
        d.className = "sq " + ((f + r) % 2 === 1 ? "d" : "l");
        if (f === files[0]) d.insertAdjacentHTML("beforeend", `<span class="co r">${r}</span>`);
        if (r === ranks[7]) d.insertAdjacentHTML("beforeend", `<span class="co f">${FILES[f]}</span>`);
        this.sqs[sq] = d;
        this.el.appendChild(d);
      }
    }
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("class", "arrows");
    this.svg.setAttribute("viewBox", "0 0 8 8");
    this.el.appendChild(this.svg);
  }

  flip(o) {
    this.orient = o ?? (this.orient === "w" ? "b" : "w");
    this._layout();
    this.render(this.s);
  }

  /** s: {fen, last:[a,b], sel, targets:[sq], marks:{sq:'good'|'bad'|'last'}, arrows:[{from,to,cls}], check, interactive} */
  render(s) {
    this.s = { targets: [], marks: {}, arrows: [], interactive: false, ...s };
    const pieces = parseFen(this.s.fen);
    const tg = new Set(this.s.targets);
    const marks = { ...this.s.marks };
    if (this.s.last) for (const q of this.s.last) marks[q] = marks[q] || "last";
    for (const sq in this.sqs) {
      const d = this.sqs[sq];
      let cls = "sq " + (d.classList.contains("l") ? "l" : "d");
      if (marks[sq]) cls += " " + marks[sq];
      if (this.s.sel === sq) cls += " sel";
      if (this.s.check === sq) cls += " chk";
      if (tg.has(sq)) cls += " tgt" + (pieces[sq] ? " cap" : "");
      d.className = cls;
      const old = d.querySelector(".pc");
      const p = pieces[sq];
      if (!p) {
        if (old) old.remove();
      } else if (!old) {
        d.insertAdjacentHTML("afterbegin", `<i class="pc ${p}"></i>`);
      } else if (!old.classList.contains(p)) {
        old.className = "pc " + p;
      } else {
        old.classList.remove("lift");
      }
    }
    this._arrows(this.s.arrows);
  }

  _center(sq) {
    const f = FILES.indexOf(sq[0]);
    const r = +sq[1];
    return this.orient === "w" ? [f + 0.5, 8 - r + 0.5] : [7 - f + 0.5, r - 0.5];
  }

  _arrows(list) {
    let html = "";
    for (const a of list) {
      const [x1, y1] = this._center(a.from);
      const [x2, y2] = this._center(a.to);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const head = 0.42;
      const ex = x2 - ux * head * 0.9;
      const ey = y2 - uy * head * 0.9;
      const px = -uy;
      const py = ux;
      const sx = x1 + ux * 0.25;
      const sy = y1 + uy * 0.25;
      html +=
        `<g class="${a.cls || "go"}" opacity=".85">` +
        `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke-width=".17" stroke-linecap="round"/>` +
        `<polygon stroke="none" points="${x2 - ux * 0.02},${y2 - uy * 0.02} ${ex + px * 0.26},${ey + py * 0.26} ${ex - px * 0.26},${ey - py * 0.26}"/>` +
        `</g>`;
    }
    this.svg.innerHTML = html;
  }

  /** Slide the piece now on `to` in from `from`. */
  animate(from, to) {
    const a = this.sqs[from];
    const b = this.sqs[to];
    const pc = b && b.querySelector(".pc");
    if (!a || !pc) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    pc.style.zIndex = 2;
    pc
      .animate(
        [{ transform: `translate(${ra.left - rb.left}px, ${ra.top - rb.top}px)` }, { transform: "none" }],
        { duration: 190, easing: "cubic-bezier(0.2, 0, 0, 1)" },
      )
      .finished.then(() => (pc.style.zIndex = ""))
      .catch(() => {});
  }

  _sqAt(x, y) {
    const r = this.el.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
    const c = Math.min(7, Math.floor(((x - r.left) / r.width) * 8));
    const rw = Math.min(7, Math.floor(((y - r.top) / r.height) * 8));
    const f = this.orient === "w" ? c : 7 - c;
    const rank = this.orient === "w" ? 8 - rw : rw + 1;
    return FILES[f] + rank;
  }

  _down(e) {
    if (!this.s.interactive) return;
    const sq = this._sqAt(e.clientX, e.clientY);
    if (!sq) return;
    this.drag = { sq, x: e.clientX, y: e.clientY, moving: false, ghost: null, id: e.pointerId };
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  _move(e) {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moving) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 7) return;
      if (!this.h.canMove || !this.h.canMove(d.sq)) {
        this.drag = null;
        return;
      }
      d.moving = true;
      this.h.onSelect && this.h.onSelect(d.sq);
      const src = this.sqs[d.sq].querySelector(".pc");
      if (src) {
        const g = src.cloneNode();
        g.classList.add("drag-ghost");
        const w = this.el.getBoundingClientRect().width / 8;
        g.style.width = g.style.height = w + "px";
        document.body.appendChild(g);
        d.ghost = g;
        src.classList.add("lift");
      }
    }
    if (d.ghost) {
      d.ghost.style.left = e.clientX + "px";
      d.ghost.style.top = e.clientY + "px";
    }
  }

  _up(e) {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    if (d.ghost) d.ghost.remove();
    const sq = this._sqAt(e.clientX, e.clientY);
    if (d.moving) {
      const from = d.sq;
      const pc = this.sqs[from].querySelector(".pc");
      if (pc) pc.classList.remove("lift");
      if (sq && sq !== from && this.s.targets.includes(sq)) {
        this.h.onMove && this.h.onMove(from, sq, { dragged: true });
      }
      return;
    }
    if (!sq) return;
    this._tap(sq);
  }

  _cancel() {
    const d = this.drag;
    this.drag = null;
    if (d && d.ghost) d.ghost.remove();
    for (const pc of this.el.querySelectorAll(".pc.lift")) pc.classList.remove("lift");
  }

  _tap(sq) {
    const { sel, targets } = this.s;
    if (sel && targets.includes(sq)) {
      this.h.onMove && this.h.onMove(sel, sq, {});
    } else if (sel === sq) {
      this.h.onSelect && this.h.onSelect(null);
    } else if (this.h.canMove && this.h.canMove(sq)) {
      this.h.onSelect && this.h.onSelect(sq);
    } else {
      this.h.onSelect && this.h.onSelect(null);
    }
  }
}
