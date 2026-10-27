// Stockfish 19 (lite, single-threaded WASM) running in a Web Worker on the device.
// One engine, a priority queue: moves and hints jump ahead of background analysis.

const ENGINE_URL = new URL("../vendor/stockfish-19-lite-single.js", import.meta.url).href;

export class Engine {
  constructor() {
    this.w = new Worker(ENGINE_URL);
    this.listeners = new Set();
    this.queue = [];
    this.busy = false;
    this.w.onmessage = (e) => {
      const line = String(e.data);
      for (const f of [...this.listeners]) f(line);
    };
    this.ready = this._boot();
  }

  _once(test) {
    return new Promise((res) => {
      const f = (l) => {
        if (test(l)) {
          this.listeners.delete(f);
          res(l);
        }
      };
      this.listeners.add(f);
    });
  }

  async _boot() {
    const ok = this._once((l) => l === "uciok");
    this.w.postMessage("uci");
    await ok;
    this.w.postMessage("setoption name Hash value 32");
    const rd = this._once((l) => l === "readyok");
    this.w.postMessage("isready");
    await rd;
  }

  /**
   * Search a position. Resolves { best, cp, mate, pv, depth } with scores from WHITE's
   * point of view, or null if a newer job with the same `tag` replaced this one.
   *   elo / skill: limit strength (omit both for full strength)
   *   depth / movetime(ms): whichever is hit first ends the search
   *   prio: higher runs first (play/hint = 2, gauge/puzzle = 1, review = 0)
   */
  go({ fen, depth, movetime, elo, skill, tag, prio = 0 }) {
    return new Promise((resolve) => {
      if (tag) {
        this.queue = this.queue.filter((j) => {
          if (j.tag === tag) {
            j.resolve(null);
            return false;
          }
          return true;
        });
      }
      this.queue.push({ fen, depth, movetime, elo, skill, tag, prio, resolve });
      this._pump();
    });
  }

  async _pump() {
    if (this.busy) return;
    if (!this.queue.length) return;
    let bi = 0;
    for (let i = 1; i < this.queue.length; i++) if (this.queue[i].prio > this.queue[bi].prio) bi = i;
    const job = this.queue.splice(bi, 1)[0];
    this.busy = true;
    try {
      await this.ready;
      job.resolve(await this._run(job));
    } catch {
      job.resolve(null);
    }
    this.busy = false;
    this._pump();
  }

  _run(job) {
    return new Promise((resolve) => {
      const w = this.w;
      const white = job.fen.split(" ")[1] === "w";
      if (job.elo && job.elo < 3190) {
        w.postMessage("setoption name UCI_LimitStrength value true");
        w.postMessage(`setoption name UCI_Elo value ${job.elo}`);
        w.postMessage("setoption name Skill Level value 20");
      } else if (job.skill != null) {
        w.postMessage("setoption name UCI_LimitStrength value false");
        w.postMessage(`setoption name Skill Level value ${job.skill}`);
      } else {
        w.postMessage("setoption name UCI_LimitStrength value false");
        w.postMessage("setoption name Skill Level value 20");
      }
      let cp = null;
      let mate = null;
      let pv = [];
      let depth = 0;
      const f = (l) => {
        if (l.startsWith("info") && l.includes(" score ") && !l.includes("multipv 2")) {
          const m = l.match(/ depth (\d+).* score (cp|mate) (-?\d+).* pv (.+)$/);
          if (m) {
            depth = +m[1];
            const v = +m[3] * (white ? 1 : -1);
            if (m[2] === "cp") {
              cp = v;
              mate = null;
            } else {
              mate = v;
              cp = null;
            }
            pv = m[4].trim().split(/\s+/);
          }
        } else if (l.startsWith("bestmove")) {
          this.listeners.delete(f);
          const b = l.split(/\s+/)[1];
          resolve({ best: b && b !== "(none)" ? b : null, cp, mate, pv, depth });
        }
      };
      this.listeners.add(f);
      w.postMessage(`position fen ${job.fen}`);
      const lim = [];
      if (job.depth) lim.push(`depth ${job.depth}`);
      if (job.movetime) lim.push(`movetime ${job.movetime}`);
      w.postMessage(`go ${lim.join(" ") || "depth 10"}`);
    });
  }

  /** Cut the current search short (its result still resolves). */
  stop() {
    this.w.postMessage("stop");
  }
}

/** Centipawns from White's view, with mates folded in and everything capped at ±1000. */
export function cpWhite(r) {
  if (!r) return 0;
  if (r.mate != null) return r.mate > 0 ? 1000 : -1000;
  return Math.max(-1000, Math.min(1000, r.cp ?? 0));
}

/** Lichess' win-probability curve, for judging how much a move cost. */
export function winPct(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Lichess' per-move accuracy from a win% drop. */
export function moveAccuracy(drop) {
  const a = 103.1668100711649 * Math.exp(-0.04354415386753951 * drop) - 3.166924740191411;
  return Math.max(0, Math.min(100, a));
}
