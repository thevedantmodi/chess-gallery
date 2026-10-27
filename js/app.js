import { Chess } from "../vendor/chess.js";
import { Engine, cpWhite, winPct, moveAccuracy } from "./engine.js";
import { Board } from "./board.js";
import { db, settings, save, saveNow, uid, resetAll, persist } from "./store.js";
import { fx } from "./fx.js";

/* ───────────────────────── helpers ───────────────────────── */

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function monthKey(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

let toastTimer = 0;
function toast(msg) {
  $(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 1800);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {
      /* ignore */
    }
    ta.remove();
  }
  toast("Copied");
}

function sheet(html, init) {
  const root = $("#sheet-root");
  root.innerHTML = `<div class="scrim"><div class="sheet">${html}</div></div>`;
  const sc = root.firstElementChild;
  sc.addEventListener("click", (e) => {
    if (e.target === sc) closeSheet();
  });
  if (init) init(root.querySelector(".sheet"));
}
function closeSheet() {
  $("#sheet-root").innerHTML = "";
}
function confirmSheet(title, body, yes, onYes) {
  sheet(
    `<h2>${esc(title)}</h2><p class="muted" style="margin:0 0 16px">${esc(body)}</p>
     <div class="stack"><button class="btn block" data-s="yes">${esc(yes)}</button>
     <button class="btn ghost block" data-s="no">Cancel</button></div>`,
    (el) => {
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-s]");
        if (!b) return;
        closeSheet();
        if (b.dataset.s === "yes") onYes();
      });
    },
  );
}
function promotionSheet(color, cb) {
  const pcs = ["Q", "R", "B", "N"];
  sheet(
    `<h2>Promote to</h2><div class="promo">${pcs
      .map((p) => `<button data-p="${p.toLowerCase()}" aria-label="${p}"><i class="pc ${color}${p}"></i></button>`)
      .join("")}</div>`,
    (el) =>
      el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-p]");
        if (!b) return;
        closeSheet();
        cb(b.dataset.p);
      }),
  );
}

/* ───────────────────────── engine & opponents ───────────────────────── */

let eng = null;
try {
  eng = new Engine();
} catch (e) {
  console.error("Engine failed to start", e);
}

const BOTS = [
  { id: "tourist", name: "The Tourist", label: "~800", skill: 0, depth: 1, time: 150, line: "Just looking. Mostly lost." },
  { id: "visitor", name: "The Visitor", label: "1320", rating: 1320, time: 600, line: "Wanders in. The pieces wander too." },
  { id: "docent", name: "The Docent", label: "1500", rating: 1500, time: 700, line: "Knows every label by heart." },
  { id: "guide", name: "The Guide", label: "1700", rating: 1700, time: 800, line: "Keeps the tour moving." },
  { id: "archivist", name: "The Archivist", label: "1900", rating: 1900, time: 900, line: "Remembers every game you lost." },
  { id: "curator", name: "The Curator", label: "2200", rating: 2200, time: 1000, line: "Chooses what hangs. And what falls." },
  { id: "director", name: "The Director", label: "2600", rating: 2600, time: 1200, line: "Signs off on every move." },
  { id: "stockfish", name: "Stockfish", label: "3190", rating: 3190, time: 1500, line: "The permanent collection." },
];
const FRIEND = { id: "friend", name: "A friend", label: "pass & play", pass: true, line: "Pass the phone across the seat." };
const botById = (id) => (id === "friend" ? FRIEND : BOTS.find((b) => b.id === id) || BOTS[2]);
function unlocked(i) {
  if (settings.unlockAll || i === 0) return true;
  return (db.beaten[BOTS[i - 1].id] || 0) > 0;
}

/* ───────────────────────── state ───────────────────────── */

const S = {
  tab: "play",
  setup: { bot: "tourist", color: "random" },
  p: null, // active game
  pb: null, // play board
  r: null, // open review
  rb: null,
  t: null, // retake session
  tb: null,
};

const kingSq = (g, color) => {
  for (const row of g.board()) for (const c of row) if (c && c.type === "k" && c.color === color) return c.square;
  return null;
};

/* ───────────────────────── tabs & theme ───────────────────────── */

function go(tab) {
  S.tab = tab;
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("on", v.id === "v-" + tab));
  document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-current", t.dataset.tab === tab ? "page" : "false"));
  ({ play: renderPlay, games: renderGames, retake: renderRetake, settings: renderSettings })[tab]();
  $("#main").scrollTo(0, 0);
  updateTabDot();
}
function updateTabDot() {
  const n = db.puzzles.filter((p) => p.solved < 2).length;
  const tab = $('.tab[data-tab="retake"]');
  tab.querySelector(".dot")?.remove();
  if (n && S.tab !== "retake") tab.insertAdjacentHTML("beforeend", '<span class="dot"></span>');
}

let switching = false;
function setTheme(theme) {
  const root = document.documentElement;
  try {
    localStorage.setItem("theme", theme);
    localStorage.setItem("theme-manual", "1");
  } catch {
    /* ignore */
  }
  const apply = () => {
    root.setAttribute("data-theme", theme);
    const m = document.querySelectorAll('meta[name="theme-color"]');
    m.forEach((el) => el.setAttribute("content", theme === "dark" ? "#1c1c1c" : "#ededeb"));
  };
  if (root.getAttribute("data-theme") === theme) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
  if (switching) return;
  switching = true;
  root.setAttribute("data-lights", "off");
  setTimeout(() => {
    apply();
    setTimeout(() => {
      root.removeAttribute("data-lights");
      switching = false;
    }, 60);
  }, 180);
}

/* ───────────────────────── PLAY ───────────────────────── */

function renderPlay() {
  const el = $("#v-play");
  if (!S.p) return renderSetup(el);
  const p = S.p;
  const opp = p.bot;
  el.innerHTML = `
    <div class="reveal">
      <div class="opp"><b>${esc(opp.name)}</b><span class="muted">${esc(opp.label)}</span></div>
      <div class="boardrow"><div id="b-play"></div><div class="gauge off" id="gauge"><i></i></div></div>
      <div class="status"><span id="status"></span><span class="muted" id="evalnum"></span></div>
      <div class="actions" id="actions"></div>
      <div class="strip" id="strip"></div>
      <div id="over"></div>
    </div>`;
  S.pb = new Board($("#b-play"), {
    canMove: (sq) => canMovePlay(sq),
    onSelect: (sq) => {
      p.sel = sq;
      if (sq) fx.tap();
      drawPlay();
    },
    onMove: (from, to, o) => tryMove(from, to, o),
  });
  S.pb.orient = p.orient;
  S.pb._layout();
  drawPlay();
  updateGauge();
}

function renderSetup(el) {
  const resume = db.current;
  const rb = resume && botById(resume.bot);
  // Keep the selection valid: default to the furthest opponent you've unlocked.
  const openIdx = BOTS.map((_, i) => i).filter(unlocked);
  const selIdx = BOTS.findIndex((b) => b.id === S.setup.bot);
  if (S.setup.bot !== "friend" && (selIdx < 0 || !unlocked(selIdx))) S.setup.bot = BOTS[openIdx[openIdx.length - 1]].id;
  const firstLocked = BOTS.findIndex((_, i) => !unlocked(i));
  const rows = BOTS.map((b, i) => {
    const open = unlocked(i);
    if (!open && i !== firstLocked) return "";
    const wins = db.beaten[b.id] || 0;
    return `<button data-a="bot" data-id="${b.id}" aria-pressed="${S.setup.bot === b.id}" ${open ? "" : "disabled"}>
      <span class="name">${esc(b.name)}</span><span class="end">${open ? esc(b.label) : "Locked"}</span>
      <span class="sub">${open ? esc(b.line) : "Beat " + esc(BOTS[i - 1].name) + " to unlock"}</span>
      <span class="sub end">${wins ? "Won " + wins : ""}</span></button>`;
  }).join("");
  const more = firstLocked < 0 ? 0 : BOTS.length - firstLocked - 1;
  el.innerHTML = `
    <div class="reveal">
      ${
        resume
          ? `<div class="placard" style="margin-bottom:24px"><span class="label">In progress</span>
              <h2>Versus ${esc(rb.name)}</h2>
              <div class="meta">${resume.sans.length} moves played</div>
              <div class="actions"><button class="text-btn ul" data-a="resume" style="font-weight:700">Resume</button>
              <button class="text-btn ul" data-a="discard">Discard</button></div></div>`
          : ""
      }
      <div class="group-head"><span>Opponent</span><span class="count">${openIdx.length} of ${BOTS.length} open</span></div>
      <div class="rows">${rows}
        <button data-a="bot" data-id="friend" aria-pressed="${S.setup.bot === "friend"}">
          <span class="name">${FRIEND.name}</span><span class="end">${FRIEND.label}</span><span class="sub">${FRIEND.line}</span></button>
      </div>
      ${more ? `<p class="muted" style="margin:10px 0 0">${more} more open up as you win.</p>` : ""}
      <div class="group-head"><span>Colour</span></div>
      <div class="seg" style="padding:8px 0">
        ${["white", "black", "random"]
          .map(
            (c, i) =>
              `${i ? '<span class="sep">|</span>' : ""}<button class="text-btn ul" data-a="color" data-c="${c}" aria-pressed="${S.setup.color === c}">${cap(c)}</button>`,
          )
          .join("")}
      </div>
      <p class="muted" id="offline-line" style="margin:12px 0 0"></p>
      <div class="startbar"><button class="btn block" data-a="start">Start game</button></div>
    </div>`;
  paintOfflineLine();
}

function startGame() {
  const bot = botById(S.setup.bot);
  let color = S.setup.color;
  if (color === "random") color = Math.random() < 0.5 ? "w" : "b";
  else color = color === "white" ? "w" : "b";
  if (bot.pass) color = "w";
  S.p = { game: new Chess(), bot, color, orient: color, id: uid(), thinking: false, sel: null, hint: null, over: false, rec: null };
  db.current = { sans: [], bot: bot.id, color };
  save();
  renderPlay();
  fx.shutter();
  if (!bot.pass && color === "b") engineMove();
}

function resumeGame() {
  const c = db.current;
  if (!c) return;
  const g = new Chess();
  try {
    for (const s of c.sans) g.move(s);
  } catch {
    db.current = null;
    save();
    return renderPlay();
  }
  const bot = botById(c.bot);
  S.p = { game: g, bot, color: c.color, orient: c.color, id: uid(), thinking: false, sel: null, hint: null, over: false, rec: null };
  renderPlay();
  if (!bot.pass && g.turn() !== c.color && !g.isGameOver()) engineMove();
}

function canInteract() {
  const p = S.p;
  return !!p && !p.over && !p.thinking && (p.bot.pass || p.game.turn() === p.color);
}
function canMovePlay(sq) {
  const p = S.p;
  if (!canInteract()) return false;
  const pc = p.game.get(sq);
  return !!pc && pc.color === p.game.turn();
}

function drawPlay(anim) {
  const p = S.p;
  if (!p || !S.pb || !$("#status")) return;
  const g = p.game;
  const hist = g.history({ verbose: true });
  const last = hist[hist.length - 1];
  const targets = p.sel ? [...new Set(g.moves({ square: p.sel, verbose: true }).map((m) => m.to))] : [];
  S.pb.render({
    fen: g.fen(),
    last: last ? [last.from, last.to] : null,
    sel: p.sel,
    targets,
    arrows: p.hint ? [{ from: p.hint.slice(0, 2), to: p.hint.slice(2, 4), cls: "go" }] : [],
    check: g.inCheck() ? kingSq(g, g.turn()) : null,
    interactive: canInteract(),
  });
  if (anim && last) S.pb.animate(last.from, last.to);

  let st;
  if (p.over) st = p.rec ? `${p.rec.result} · ${p.rec.reason}` : "Game over";
  else if (p.thinking) st = `${p.bot.name} is thinking…`;
  else if (p.bot.pass) st = `${g.turn() === "w" ? "White" : "Black"} to move` + (g.inCheck() ? " · Check" : "");
  else st = "Your move" + (g.inCheck() ? " · Check" : "");
  $("#status").textContent = p.hintSan && !p.over && p.hint ? `Hint: ${p.hintSan}` : st;

  const sans = hist.map((m) => m.san);
  let strip = "";
  sans.forEach((s, i) => {
    if (i % 2 === 0) strip += `${i / 2 + 1}. `;
    strip += i === sans.length - 1 ? `<b>${esc(s)}</b> ` : `${esc(s)} `;
  });
  const sp = $("#strip");
  sp.innerHTML = strip || "No moves yet";
  sp.scrollLeft = sp.scrollWidth;

  const gauge = $("#gauge");
  gauge.classList.toggle("off", !settings.gauge || p.bot.pass);
  gauge.classList.toggle("top", p.orient === "b");

  const act = $("#actions");
  if (p.over) {
    act.innerHTML = "";
    drawOver();
  } else {
    act.innerHTML = `
      ${p.bot.pass ? "" : '<button class="text-btn ul" data-a="hint">Hint</button>'}
      <button class="text-btn ul" data-a="undo" ${hist.length ? "" : "disabled"}>Undo</button>
      <button class="text-btn ul" data-a="flip">Flip</button>
      <button class="text-btn ul" data-a="resign">Resign</button>`;
    $("#over").innerHTML = "";
  }
}

function drawOver() {
  const p = S.p;
  const rec = p.rec;
  if (!rec) return;
  const bot = p.bot;
  const i = BOTS.findIndex((b) => b.id === bot.id);
  const won = !bot.pass && ((rec.result === "1-0" && p.color === "w") || (rec.result === "0-1" && p.color === "b"));
  const lost = !bot.pass && !won && rec.result !== "1/2-1/2";
  let quote = "";
  if (bot.pass) quote = "Hung and signed.";
  else if (won) quote = i >= 0 && i < BOTS.length - 1 ? `Next wall: ${BOTS[i + 1].name}.` : "You've cleared the gallery.";
  else if (lost) quote = "Develop the game to see where it turned.";
  else quote = "A draw. Honours even.";
  const w = rec.white;
  const b = rec.black;
  $("#over").innerHTML = `
    <div class="placard reveal" style="margin-top:16px">
      <span class="label">Game ${db.games.length}</span>
      <h2>${esc(w)} — ${esc(b)}</h2>
      <div class="meta">${esc(rec.result.replace("1/2-1/2", "½–½"))} · ${esc(rec.reason)} · ${rec.plies} plies · ${fmtDate(rec.date)}</div>
      <div class="quote">${esc(quote)}</div>
    </div>
    <div class="stack">
      <button class="btn block" data-a="review-new">Develop this game</button>
      <button class="btn ghost block" data-a="rematch">Rematch</button>
      <button class="btn ghost block" data-a="newgame">New game</button>
    </div>`;
}

function tryMove(from, to) {
  const p = S.p;
  if (!canInteract()) return;
  const cands = p.game.moves({ square: from, verbose: true }).filter((m) => m.to === to);
  if (!cands.length) return;
  if (cands.length > 1) {
    return promotionSheet(p.game.turn(), (pr) => doMove({ from, to, promotion: pr }));
  }
  doMove({ from, to, promotion: cands[0].promotion });
}

function doMove(m) {
  const p = S.p;
  if (!p || p.over) return;
  let mv;
  try {
    mv = p.game.move(m);
  } catch {
    return;
  }
  p.sel = null;
  p.hint = null;
  p.hintSan = null;
  const g = p.game;
  const kind = g.inCheck() ? "check" : mv.captured ? "capture" : "move";
  if (!g.isGameOver()) fx.play(kind);
  if (mv.captured || g.inCheck()) fx.shutter();
  drawPlay(true);
  db.current = { sans: g.history(), bot: p.bot.id, color: p.color };
  save();
  updateGauge();
  if (checkEnd()) return;
  if (!p.bot.pass && g.turn() !== p.color) engineMove();
}

async function engineMove() {
  const p = S.p;
  if (!p || !eng) return;
  const id = p.id;
  p.thinking = true;
  drawPlay();
  const t0 = performance.now();
  const r = await eng.go({
    fen: p.game.fen(),
    elo: p.bot.rating,
    skill: p.bot.skill,
    depth: p.bot.depth,
    movetime: p.bot.time,
    tag: "play",
    prio: 2,
  });
  await sleep(Math.max(0, 450 - (performance.now() - t0)));
  if (S.p !== p || p.id !== id || p.over) return;
  p.thinking = false;
  if (!r || !r.best) return drawPlay();
  doMove({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] });
}

function setGauge(cp) {
  const pct = winPct(cp);
  const i = $("#gauge i");
  if (i) i.style.height = pct + "%";
  const n = $("#evalnum");
  if (n) n.textContent = (cp >= 0 ? "+" : "") + (cp / 100).toFixed(1);
}
async function updateGauge() {
  const p = S.p;
  if (!p || !settings.gauge || p.bot.pass || !eng) return;
  const r = await eng.go({ fen: p.game.fen(), depth: 10, movetime: 300, tag: "gauge", prio: 1 });
  if (r && S.p === p && !p.over) setGauge(cpWhite(r));
}

function checkEnd() {
  const p = S.p;
  const g = p.game;
  if (!g.isGameOver()) return false;
  let result;
  let reason;
  if (g.isCheckmate()) {
    result = g.turn() === "w" ? "0-1" : "1-0";
    reason = "Checkmate";
  } else {
    result = "1/2-1/2";
    reason = g.isStalemate()
      ? "Stalemate"
      : g.isInsufficientMaterial()
        ? "Insufficient material"
        : g.isThreefoldRepetition()
          ? "Threefold repetition"
          : "Fifty-move rule";
  }
  finishGame(result, reason);
  return true;
}

function finishGame(result, reason) {
  const p = S.p;
  p.over = true;
  p.thinking = false;
  p.hint = null;
  p.hintSan = null;
  p.sel = null;
  p.id = uid();
  const won = !p.bot.pass && ((result === "1-0" && p.color === "w") || (result === "0-1" && p.color === "b"));
  const lost = !p.bot.pass && !won && result !== "1/2-1/2";
  fx.play(won ? "win" : lost ? "lose" : "end");
  fx.shutter();
  const you = p.bot.pass ? null : "You";
  const white = p.bot.pass ? "White" : p.color === "w" ? you : p.bot.name;
  const black = p.bot.pass ? "Black" : p.color === "b" ? you : p.bot.name;
  const g = p.game;
  g.setHeader("White", white);
  g.setHeader("Black", black);
  g.setHeader("Date", new Date().toISOString().slice(0, 10).replace(/-/g, "."));
  g.setHeader("Result", result);
  const rec = {
    id: uid(),
    date: new Date().toISOString(),
    pgn: g.pgn(),
    userColor: p.color,
    white,
    black,
    result,
    reason,
    bot: p.bot.id,
    plies: g.history().length,
    review: null,
  };
  db.games.unshift(rec);
  p.rec = rec;
  db.current = null;
  if (won && !p.bot.pass) db.beaten[p.bot.id] = (db.beaten[p.bot.id] || 0) + 1;
  save();
  drawPlay();
}

/* ───────────────────────── GAMES ───────────────────────── */

function renderGames() {
  if (S.r) return renderReview();
  const el = $("#v-games");
  if (!db.games.length) {
    el.innerHTML = `<div class="reveal empty"><div class="placard"><span class="label">The collection</span>
      <h2>Nothing hung yet</h2><div class="meta">Games you finish are kept here, on this device, ready to review without a connection.</div>
      <div class="actions"><button class="text-btn ul" data-a="tab" data-t="play" style="font-weight:700">Play a game</button>
      <button class="text-btn ul" data-a="import">Import PGN</button></div></div></div>`;
    return;
  }
  const groups = {};
  for (const g of db.games) (groups[monthKey(g.date)] ||= []).push(g);
  let html = `<div class="row-between reveal" style="margin-bottom:16px"><h2>Games</h2><button class="text-btn ul" data-a="import">Import PGN</button></div>`;
  for (const [month, list] of Object.entries(groups)) {
    html += `<div class="group-head"><span>${esc(month)}</span><span class="count">${list.length}</span></div><div class="rows">`;
    for (const g of list) {
      const acc = g.review ? g.review.summary[g.userColor]?.acc : null;
      html += `<button data-a="open" data-id="${g.id}">
        <span class="name">${esc(g.white)} — ${esc(g.black)}</span>
        <span class="end">${esc(g.result.replace("1/2-1/2", "½–½"))}</span>
        <span class="sub">${g.plies} plies · ${esc(g.reason)} · ${fmtDate(g.date)}</span>
        <span class="sub end">${acc != null ? acc + "%" : "Undeveloped"}</span></button>`;
    }
    html += "</div>";
  }
  el.innerHTML = html;
}

function loadGameData(rec) {
  const c = new Chess();
  c.loadPgn(rec.pgn);
  const moves = c.history({ verbose: true });
  const g = new Chess();
  const fens = [g.fen()];
  for (const m of moves) {
    g.move(m.san);
    fens.push(g.fen());
  }
  return { moves, fens };
}

function openReview(id, idx) {
  const rec = db.games.find((g) => g.id === id);
  if (!rec) return;
  let data;
  try {
    data = loadGameData(rec);
  } catch {
    return toast("Couldn't read that game");
  }
  S.r = { rec, ...data, idx: 0, busy: false, token: uid() };
  const rv = rec.review;
  if (idx != null) S.r.idx = idx;
  else if (rv) {
    const k = keyMoments(S.r);
    S.r.idx = k.length ? k[0] : 0;
  }
  go("games");
}

function keyMoments(R) {
  const rv = R.rec.review;
  if (!rv) return [];
  return rv.plies
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.label && (p.label === "blunder" || p.label === "mistake") && p.color === R.rec.userColor)
    .map(({ i }) => i);
}

function renderReview() {
  const R = S.r;
  const rec = R.rec;
  const el = $("#v-games");
  const rv = rec.review;
  const N = R.moves.length;
  let summary = "";
  if (rv) {
    const col = (c, name) => {
      const s = rv.summary[c];
      return `<div><div class="label">${esc(name)}</div><div class="big" style="margin:6px 0 4px">${s.acc}%</div>
        <div class="muted">${s.blunder} blunders<br>${s.mistake} mistakes<br>${s.inaccuracy} inaccuracies</div></div>`;
    };
    summary = `<div class="group-head"><span>Accuracy</span><span class="count">developed</span></div>
      <div class="twocol" style="margin-top:12px">${col("w", rec.white)}${col("b", rec.black)}</div>`;
  }
  el.innerHTML = `
    <div class="reveal">
      <div class="row-between"><button class="text-btn ul" data-a="rback">← Games</button><span class="muted">${fmtDate(rec.date)}</span></div>
      <h2 style="margin-top:8px">${esc(rec.white)} — ${esc(rec.black)}</h2>
      <div class="muted">${esc(rec.result.replace("1/2-1/2", "½–½"))} · ${esc(rec.reason)}</div>
      <div class="boardrow"><div id="b-rev"></div><div class="gauge ${rv ? "" : "off"}" id="rgauge"><i></i></div></div>
      <div class="twocol" style="gap:8px">
        <button class="btn ghost" data-a="rprev">← Prev</button><button class="btn ghost" data-a="rnext">Next →</button>
      </div>
      <div class="row-between" style="margin-top:8px"><span class="muted" id="rpos"></span>
        ${rv ? '<button class="text-btn ul" data-a="rkey">Next key moment</button>' : ""}</div>
      <div class="caption" id="rcap"></div>
      <div id="rcopy"></div>
      ${
        rv
          ? ""
          : `<div class="stack"><button class="btn block" data-a="develop" id="devbtn">Develop this game</button>
             <div class="progress" id="prog" hidden><i></i></div>
             <p class="muted" style="margin:0">Stockfish checks every position on your phone. About ${Math.max(10, Math.round(N * 0.7))} seconds.</p></div>`
      }
      ${summary}
      ${rv ? '<svg class="graph" id="graph"></svg>' : ""}
      <div class="group-head"><span>Moves</span><span class="count">${N}</span></div>
      <div class="movelist" id="mlist"></div>
      <div class="actions" style="margin-top:20px">
        <button class="text-btn ul" data-a="copypgn">Copy PGN</button>
        <button class="text-btn ul" data-a="delgame">Delete</button>
      </div>
    </div>`;
  S.rb = new Board($("#b-rev"), {});
  S.rb.orient = rec.userColor || "w";
  S.rb._layout();
  const gr = $("#rgauge");
  gr.classList.toggle("top", S.rb.orient === "b");
  drawReview();
  const g = $("#graph");
  if (g) {
    const seek = (e) => {
      const r = g.getBoundingClientRect();
      R.idx = Math.max(0, Math.min(N, Math.round(((e.clientX - r.left) / r.width) * N)));
      drawReview();
    };
    g.addEventListener("pointerdown", (e) => {
      g.setPointerCapture(e.pointerId);
      seek(e);
      g._down = true;
    });
    g.addEventListener("pointermove", (e) => g._down && seek(e));
    g.addEventListener("pointerup", () => (g._down = false));
  }
}

function drawReview() {
  const R = S.r;
  if (!R || !S.rb) return;
  const rv = R.rec.review;
  const N = R.moves.length;
  const i = R.idx;
  const fen = R.fens[i];
  const pl = rv && i < N ? rv.plies[i] : null;
  const m = i < N ? R.moves[i] : null;
  const prev = i > 0 ? R.moves[i - 1] : null;
  const marks = {};
  const arrows = [];
  if (m) {
    if (pl && pl.label) {
      marks[m.from] = "bad";
      marks[m.to] = "bad";
      arrows.push({ from: m.from, to: m.to, cls: "bad" });
      if (pl.best && pl.best !== m.from + m.to + (m.promotion || "")) arrows.push({ from: pl.best.slice(0, 2), to: pl.best.slice(2, 4), cls: "go" });
    } else {
      arrows.push({ from: m.from, to: m.to, cls: "neutral" });
    }
  }
  const chess = new Chess(fen);
  S.rb.render({
    fen,
    last: prev ? [prev.from, prev.to] : null,
    marks,
    arrows,
    check: chess.inCheck() ? kingSq(chess, chess.turn()) : null,
  });

  $("#rpos").textContent = i < N ? `Before move ${i + 1} of ${N}` : `Final position · ${N} moves`;
  const num = m ? `${Math.floor(i / 2) + 1}${m.color === "w" ? "." : "…"}` : "";
  let cap = "";
  let copyBtn = "";
  if (!m) cap = `<span class="muted">${esc(R.rec.result.replace("1/2-1/2", "½–½"))} · ${esc(R.rec.reason)}</span>`;
  else if (!pl) cap = `<b>${num} ${esc(m.san)}</b> <span class="muted">Develop the game to see how this move held up.</span>`;
  else {
    const isBest = pl.best === m.from + m.to + (m.promotion || "");
    const ev = `${pl.cpAfter >= 0 ? "+" : ""}${(pl.cpAfter / 100).toFixed(1)}`;
    if (pl.label) {
      cap = `<b>${num} ${esc(m.san)}</b> <span class="tag-${pl.label}">${cap_(pl.label)}</span> — the engine preferred <span class="best">${esc(pl.bestSan)}</span>.`;
      copyBtn = `<div class="actions"><button class="text-btn ul" data-a="claude">Copy for Claude</button></div>`;
    } else {
      cap = `<b>${num} ${esc(m.san)}</b> <span class="muted">${isBest ? "Engine's top choice." : "Solid."} Eval ${ev}.</span>`;
    }
  }
  $("#rcap").innerHTML = cap;
  $("#rcopy").innerHTML = copyBtn;
  $("#rgauge i").style.height = rv ? winPct(rv.cps[i]) + "%" : "50%";

  const ml = $("#mlist");
  let html = "";
  for (let k = 0; k < N; k += 2) {
    html += `<span class="n">${k / 2 + 1}.</span>`;
    for (const j of [k, k + 1]) {
      if (j >= N) {
        html += "<span></span>";
        continue;
      }
      const p = rv && rv.plies[j];
      const tag = p && p.label ? ` ${p.label}` : "";
      const badge = p && p.label === "blunder" ? "??" : p && p.label === "mistake" ? "?" : p && p.label === "inaccuracy" ? "?!" : "";
      html += `<button data-a="rgo" data-i="${j}" class="${j === i ? "on" : ""}${tag}">${esc(R.moves[j].san)}${badge}</button>`;
    }
  }
  ml.innerHTML = html;
  drawGraph();
}

function cap_(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function drawGraph() {
  const R = S.r;
  const g = $("#graph");
  const rv = R && R.rec.review;
  if (!g || !rv) return;
  const W = g.clientWidth || 320;
  const H = 72;
  g.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const N = R.moves.length;
  const y = (cp) => H / 2 - (Math.max(-600, Math.min(600, cp)) / 600) * (H / 2 - 6);
  const x = (i) => (N ? (i / N) * W : 0);
  const pts = rv.cps.map((c, i) => `${x(i).toFixed(1)},${y(c).toFixed(1)}`).join(" ");
  let dots = "";
  rv.plies.forEach((p, i) => {
    if (p.label === "blunder" && p.color === R.rec.userColor)
      dots += `<circle cx="${x(i).toFixed(1)}" cy="${y(rv.cps[i]).toFixed(1)}" r="3" fill="#e5484d"/>`;
  });
  g.innerHTML =
    `<line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="var(--rule)" stroke-width="1"/>` +
    `<polyline fill="none" stroke="var(--ink)" stroke-width="1.5" points="${pts}"/>${dots}` +
    `<line x1="${x(R.idx)}" x2="${x(R.idx)}" y1="0" y2="${H}" stroke="var(--ink)" stroke-width="1"/>`;
}

async function develop() {
  const R = S.r;
  if (!R || R.busy || !eng) return;
  const rec = R.rec;
  const token = R.token;
  R.busy = true;
  const btn = $("#devbtn");
  const prog = $("#prog");
  btn.disabled = true;
  prog.hidden = false;
  const N = R.moves.length;
  const cps = [];
  const bests = [];
  for (let i = 0; i <= N; i++) {
    if (S.r !== R || R.token !== token) {
      R.busy = false;
      return;
    }
    btn.textContent = `Developing… ${i} / ${N + 1}`;
    prog.firstElementChild.style.width = (i / (N + 1)) * 100 + "%";
    const c = new Chess(R.fens[i]);
    if (c.isGameOver()) {
      cps.push(c.isCheckmate() ? (c.turn() === "w" ? -1000 : 1000) : 0);
      bests.push(null);
      continue;
    }
    const r = await eng.go({ fen: R.fens[i], depth: 12, movetime: 900, prio: 0 });
    cps.push(cpWhite(r));
    bests.push(r ? r.best : null);
  }
  const plies = [];
  const acc = { w: [], b: [] };
  const cnt = { w: { blunder: 0, mistake: 0, inaccuracy: 0 }, b: { blunder: 0, mistake: 0, inaccuracy: 0 } };
  const newPuzzles = [];
  for (let i = 0; i < N; i++) {
    const m = R.moves[i];
    const white = m.color === "w";
    const before = white ? cps[i] : -cps[i];
    const after = white ? cps[i + 1] : -cps[i + 1];
    const uci = m.from + m.to + (m.promotion || "");
    const drop = bests[i] && uci === bests[i] ? 0 : Math.max(0, winPct(before) - winPct(after));
    const label = drop >= 30 ? "blunder" : drop >= 20 ? "mistake" : drop >= 10 ? "inaccuracy" : null;
    let bestSan = null;
    if (bests[i]) {
      try {
        bestSan = new Chess(R.fens[i]).move({ from: bests[i].slice(0, 2), to: bests[i].slice(2, 4), promotion: bests[i][4] }).san;
      } catch {
        /* ignore */
      }
    }
    plies.push({ color: m.color, best: bests[i], bestSan, drop: Math.round(drop), label, cpAfter: cps[i + 1] });
    acc[m.color].push(moveAccuracy(drop));
    if (label) cnt[m.color][label]++;
    if (
      (label === "blunder" || label === "mistake") &&
      bests[i] &&
      rec.userColor === m.color &&
      rec.bot !== "friend" &&
      !db.puzzles.some((p) => p.fen === R.fens[i] && p.best === bests[i])
    ) {
      newPuzzles.push({ id: uid(), fen: R.fens[i], best: bests[i], bestSan, bestCp: before, played: m.san, gameId: rec.id, ply: i, solved: 0 });
    }
  }
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 100);
  rec.review = { cps, plies, summary: { w: { acc: avg(acc.w), ...cnt.w }, b: { acc: avg(acc.b), ...cnt.b } } };
  db.puzzles.push(...newPuzzles);
  save();
  R.busy = false;
  fx.play("good");
  fx.shutter();
  const k = keyMoments(R);
  R.idx = k.length ? k[0] : 0;
  renderReview();
  updateTabDot();
  if (newPuzzles.length) toast(`${newPuzzles.length} added to Retake`);
}

/* ───────────────────────── RETAKE ───────────────────────── */

function renderRetake() {
  const el = $("#v-retake");
  if (S.t && S.t.active) return renderPuzzle();
  const open = db.puzzles.filter((p) => p.solved < 2);
  const done = db.puzzles.length - open.length;
  el.innerHTML = `
    <div class="reveal">
      <h2>Retake</h2>
      <p class="muted" style="margin:6px 0 0">Positions from your own games where a better move was on the board. Find it this time.</p>
      <div class="group-head" style="margin-top:24px"><span>Session</span><span class="count">${open.length} waiting</span></div>
      <div class="twocol" style="margin:14px 0 20px">
        <div><div class="label">Streak</div><div class="big" style="margin-top:6px">${db.stats.streak}</div><div class="muted">best ${db.stats.best}</div></div>
        <div><div class="label">Solved</div><div class="big" style="margin-top:6px">${db.stats.solved}</div><div class="muted">${done} mastered</div></div>
      </div>
      ${
        open.length
          ? `<button class="btn block" data-a="tstart">Start retaking</button>`
          : `<div class="placard"><span class="label">Nothing waiting</span><div class="meta">Develop a finished game in the Games tab. Your blunders and mistakes arrive here as puzzles.</div>
             <div class="actions"><button class="text-btn ul" data-a="tab" data-t="games" style="font-weight:700">Go to Games</button></div></div>`
      }
    </div>`;
}

function startRetake() {
  const open = db.puzzles.filter((p) => p.solved < 2).map((p) => p.id);
  for (let i = open.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [open[i], open[j]] = [open[j], open[i]];
  }
  S.t = { active: true, list: open.slice(0, 10), i: 0, tries: 0, done: false, revealed: false, busy: false, solvedNow: 0, sel: null };
  renderRetake();
}

function curPuzzle() {
  return db.puzzles.find((p) => p.id === S.t.list[S.t.i]);
}

function renderPuzzle() {
  const T = S.t;
  const el = $("#v-retake");
  if (T.i >= T.list.length) {
    el.innerHTML = `<div class="reveal"><div class="placard"><span class="label">Session complete</span><h2>${T.solvedNow} of ${T.list.length} found</h2>
      <div class="meta">Streak ${db.stats.streak} · best ${db.stats.best}</div>
      <div class="actions"><button class="text-btn ul" data-a="tend" style="font-weight:700">Done</button></div></div></div>`;
    return;
  }
  const pz = curPuzzle();
  const turn = pz.fen.split(" ")[1];
  T.chess = new Chess(pz.fen);
  T.sel = null;
  T.tries = 0;
  T.done = false;
  T.revealed = false;
  el.innerHTML = `
    <div class="reveal">
      <div class="row-between"><button class="text-btn ul" data-a="tend">← Retake</button><span class="muted">${T.i + 1} of ${T.list.length}</span></div>
      <h2 style="margin-top:8px">${turn === "w" ? "White" : "Black"} to move</h2>
      <div class="muted">In your game you played ${esc(pz.played)}. Find something better.</div>
      <div class="boardrow"><div id="b-pz"></div><div class="gauge off"><i></i></div></div>
      <div class="caption" id="pzcap"></div>
      <div class="actions" id="pzact"></div>
    </div>`;
  S.tb = new Board($("#b-pz"), {
    canMove: (sq) => {
      if (T.done || T.busy) return false;
      const pc = T.chess.get(sq);
      return !!pc && pc.color === T.chess.turn();
    },
    onSelect: (sq) => {
      T.sel = sq;
      if (sq) fx.tap();
      drawPuzzle();
    },
    onMove: (from, to) => attempt(from, to),
  });
  S.tb.orient = turn;
  S.tb._layout();
  drawPuzzle();
}

function drawPuzzle(extra = {}) {
  const T = S.t;
  const pz = curPuzzle();
  if (!pz || !S.tb) return;
  const targets = T.sel ? [...new Set(T.chess.moves({ square: T.sel, verbose: true }).map((m) => m.to))] : [];
  const arrows = T.revealed ? [{ from: pz.best.slice(0, 2), to: pz.best.slice(2, 4), cls: "go" }] : [];
  S.tb.render({
    fen: extra.fen || T.chess.fen(),
    sel: T.sel,
    targets,
    arrows,
    marks: extra.marks || {},
    interactive: !T.done && !T.busy,
  });
  const act = $("#pzact");
  if (T.done) act.innerHTML = `<button class="btn block" data-a="tnext" style="margin-top:8px">${T.i + 1 >= T.list.length ? "Finish" : "Next position"}</button>`;
  else act.innerHTML = `<button class="text-btn ul" data-a="treveal">Reveal</button><button class="text-btn ul" data-a="tskip">Skip</button>`;
}

async function attempt(from, to) {
  const T = S.t;
  if (T.done || T.busy) return;
  const pz = curPuzzle();
  const cands = T.chess.moves({ square: from, verbose: true }).filter((m) => m.to === to);
  if (!cands.length) return;
  if (cands.length > 1) return promotionSheet(T.chess.turn(), (pr) => judge(from, to, pr));
  judge(from, to, cands[0].promotion);
}

async function judge(from, to, promotion) {
  const T = S.t;
  const pz = curPuzzle();
  const uci = from + to + (promotion || "");
  const after = new Chess(pz.fen);
  after.move({ from, to, promotion });
  const turn = pz.fen.split(" ")[1];
  T.sel = null;
  T.busy = true;
  drawPuzzle({ fen: after.fen(), marks: { [from]: "last", [to]: "last" } });
  S.tb.animate(from, to);
  $("#pzcap").innerHTML = '<span class="muted">Checking…</span>';
  let ok = uci === pz.best;
  if (!ok && !after.isGameOver() && eng) {
    const r = await eng.go({ fen: after.fen(), depth: 10, movetime: 500, prio: 2 });
    if (r) {
      const cp = cpWhite(r);
      const mover = turn === "w" ? cp : -cp;
      ok = mover >= pz.bestCp - 40;
    }
  } else if (!ok && after.isCheckmate()) ok = true;
  if (S.t !== T || curPuzzle() !== pz) return;
  if (ok) {
    T.busy = false;
    T.done = true;
    fx.play("good");
    fx.shutter();
    pz.solved += 1;
    db.stats.solved += 1;
    db.stats.streak += 1;
    db.stats.best = Math.max(db.stats.best, db.stats.streak);
    T.solvedNow += 1;
    save();
    $("#pzcap").innerHTML = `<b>${uci === pz.best ? "Correct" : "Also good"}.</b> <span class="muted">The engine's choice was <span class="best">${esc(pz.bestSan)}</span>.</span>`;
    drawPuzzle({ fen: after.fen(), marks: { [from]: "good", [to]: "good" } });
  } else {
    T.tries += 1;
    fx.play("bad");
    db.stats.streak = 0;
    save();
    $("#pzcap").innerHTML = `<b>Not quite.</b> <span class="muted">${T.tries >= 2 ? "Tap Reveal if you're stuck." : "Try again."}</span>`;
    drawPuzzle({ fen: after.fen(), marks: { [from]: "bad", [to]: "bad" } });
    await sleep(750);
    T.busy = false;
    if (S.t === T && curPuzzle() === pz && !T.done) drawPuzzle();
  }
}

/* ───────────────────────── SETTINGS ───────────────────────── */

let swReady = false;
function paintOfflineLine() {
  const els = document.querySelectorAll("#offline-line, #offline-pill");
  els.forEach((el) => {
    el.innerHTML = swReady
      ? '<span class="offline-pill">Ready offline — play it on the subway.</span>'
      : '<span class="offline-pill wait">Saving for offline use… keep this open for a moment.</span>';
  });
}

function renderSettings() {
  const el = $("#v-settings");
  const onoff = (key) =>
    `<div class="seg"><button class="text-btn ul" data-a="set" data-k="${key}" data-v="1" aria-pressed="${!!settings[key]}">On</button><span class="sep">|</span>
     <button class="text-btn ul" data-a="set" data-k="${key}" data-v="0" aria-pressed="${!settings[key]}">Off</button></div>`;
  const row = (label, sub, ctl) =>
    `<div class="row-between" style="padding:14px 0;border-bottom:1px solid var(--rule);align-items:flex-start"><div><div>${label}</div>${sub ? `<div class="muted" style="font-size:13px;max-width:240px">${sub}</div>` : ""}</div>${ctl}</div>`;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  el.innerHTML = `
    <div class="reveal">
      <div class="group-head"><span>Offline</span></div>
      <p id="offline-pill" style="margin:12px 0 4px"></p>
      ${
        standalone
          ? '<p class="muted" style="margin:0">Installed. Everything runs on this device.</p>'
          : '<p class="muted" style="margin:0">Install it: open the Share menu in Safari and choose Add to Home Screen (on Android, Install app). Do it once while you have signal.</p>'
      }
      <div class="group-head"><span>Play</span></div>
      ${row("Sound", "Wooden clicks, synthesized. No files.", onoff("sound"))}
      ${row("Haptics", "A tap when pieces land.", onoff("haptics"))}
      ${row("Eval gauge", "A thin bar beside the board. Off trains your eye.", onoff("gauge"))}
      ${row("Unlock every opponent", "Skip the ladder.", onoff("unlockAll"))}
      <div class="group-head"><span>Data</span><span class="count">${db.games.length} game${db.games.length === 1 ? "" : "s"}</span></div>
      <div class="actions" style="margin-top:10px">
        <button class="text-btn ul" data-a="exportall">Copy all games (PGN)</button>
        <button class="text-btn ul" data-a="erase">Erase everything</button>
      </div>
      <p class="muted" style="margin-top:8px">Games, puzzles and progress are stored only on this device.</p>
      <div class="group-head"><span>Credits</span></div>
      <p class="muted" style="margin:10px 0 0;line-height:1.5">Engine: Stockfish 19 (GPLv3), compiled to WebAssembly by Nathan Rugg.<br>
      Rules: chess.js (BSD-2). Pieces: original flat set.<br>Type: Geist (OFL). Design: Photo Maps.</p>
    </div>`;
  paintOfflineLine();
}

/* ───────────────────────── PGN import ───────────────────────── */

function importSheet() {
  let color = "w";
  sheet(
    `<h2>Import PGN</h2>
     <textarea id="pgn" placeholder="Paste a game from Lichess or Chess.com"></textarea>
     <div class="seg" style="margin:12px 0"><span class="muted">I played</span>
       <button class="text-btn ul" data-c="w" aria-pressed="true">White</button><span class="sep">|</span>
       <button class="text-btn ul" data-c="b" aria-pressed="false">Black</button></div>
     <div class="stack"><button class="btn block" data-s="go">Import</button><button class="btn ghost block" data-s="no">Cancel</button></div>`,
    (el) => {
      el.addEventListener("click", (e) => {
        const c = e.target.closest("[data-c]");
        if (c) {
          color = c.dataset.c;
          el.querySelectorAll("[data-c]").forEach((b) => b.setAttribute("aria-pressed", String(b === c)));
          return;
        }
        const b = e.target.closest("[data-s]");
        if (!b) return;
        if (b.dataset.s === "no") return closeSheet();
        const text = $("#pgn").value.trim();
        const g = new Chess();
        try {
          g.loadPgn(text);
          if (!g.history().length) throw new Error("empty");
        } catch {
          return toast("Couldn't read that PGN");
        }
        const h = g.header();
        let result = h.Result && h.Result !== "*" ? h.Result : "*";
        let reason = "Imported";
        if (g.isCheckmate()) {
          result = g.turn() === "w" ? "0-1" : "1-0";
          reason = "Checkmate";
        } else if (g.isDraw()) {
          result = "1/2-1/2";
          reason = "Draw";
        } else if (result !== "*") reason = "Result " + result;
        const rec = {
          id: uid(),
          date: new Date().toISOString(),
          pgn: g.pgn(),
          userColor: color,
          white: h.White || "White",
          black: h.Black || "Black",
          result,
          reason,
          bot: null,
          plies: g.history().length,
          review: null,
        };
        db.games.unshift(rec);
        save();
        closeSheet();
        S.r = null;
        openReview(rec.id, 0);
      });
    },
  );
}

/* ───────────────────────── events ───────────────────────── */

const actions = {
  tab: (d) => {
    if (d.t === "games") S.r = null;
    go(d.t);
  },
  bot: (d) => {
    S.setup.bot = d.id;
    fx.tap();
    renderPlay();
  },
  color: (d) => {
    S.setup.color = d.c;
    renderPlay();
  },
  start: startGame,
  resume: resumeGame,
  discard: () => {
    db.current = null;
    save();
    renderPlay();
  },
  hint: async () => {
    const p = S.p;
    if (!canInteract() || !eng) return;
    $("#status").textContent = "Looking…";
    const r = await eng.go({ fen: p.game.fen(), depth: 14, movetime: 800, prio: 2 });
    if (!r || !r.best || S.p !== p || p.over) return;
    p.hint = r.best;
    try {
      p.hintSan = new Chess(p.game.fen()).move({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] }).san;
    } catch {
      p.hintSan = null;
    }
    drawPlay();
  },
  undo: () => {
    const p = S.p;
    if (!p || p.over) return;
    p.id = uid();
    p.thinking = false;
    p.game.undo();
    if (!p.bot.pass && p.game.history().length && p.game.turn() !== p.color) p.game.undo();
    p.sel = null;
    p.hint = null;
    p.hintSan = null;
    db.current = { sans: p.game.history(), bot: p.bot.id, color: p.color };
    save();
    drawPlay();
    updateGauge();
    if (!p.bot.pass && p.game.turn() !== p.color) engineMove();
  },
  flip: () => {
    const p = S.p;
    p.orient = p.orient === "w" ? "b" : "w";
    S.pb.flip(p.orient);
    drawPlay();
  },
  resign: () => {
    const p = S.p;
    confirmSheet("Resign this game?", "It will be saved to Games.", "Resign", () => {
      if (!S.p || S.p.over) return;
      const loser = p.bot.pass ? p.game.turn() : p.color;
      finishGame(loser === "w" ? "0-1" : "1-0", "Resignation");
    });
  },
  "review-new": () => {
    const id = S.p.rec.id;
    S.p = null;
    S.r = null;
    openReview(id);
  },
  rematch: () => {
    const { bot, color } = S.p;
    S.setup.bot = bot.id;
    S.setup.color = bot.pass ? "white" : color === "w" ? "black" : "white";
    S.p = null;
    startGame();
  },
  newgame: () => {
    S.p = null;
    renderPlay();
  },
  open: (d) => openReview(d.id),
  rback: () => {
    if (S.r) S.r.token = uid();
    S.r = null;
    go("games");
  },
  rprev: () => {
    S.r.idx = Math.max(0, S.r.idx - 1);
    fx.tap();
    drawReview();
  },
  rnext: () => {
    S.r.idx = Math.min(S.r.moves.length, S.r.idx + 1);
    fx.tap();
    drawReview();
  },
  rgo: (d) => {
    S.r.idx = +d.i;
    drawReview();
    $("#b-rev").scrollIntoView({ block: "nearest", behavior: "smooth" });
  },
  rkey: () => {
    const k = keyMoments(S.r);
    if (!k.length) return toast("No big mistakes. Nicely played.");
    S.r.idx = k.find((i) => i > S.r.idx) ?? k[0];
    drawReview();
  },
  develop,
  claude: () => {
    const R = S.r;
    const pl = R.rec.review.plies[R.idx];
    const m = R.moves[R.idx];
    copy(
      `Position (FEN): ${R.fens[R.idx]}\n${m.color === "w" ? "White" : "Black"} played ${m.san}. Stockfish preferred ${pl.bestSan} (${pl.label}). Why was ${m.san} worse, and what was the idea behind ${pl.bestSan}?`,
    );
  },
  copypgn: () => copy(S.r.rec.pgn),
  delgame: () =>
    confirmSheet("Delete this game?", "This also removes its retake positions.", "Delete", () => {
      const id = S.r.rec.id;
      db.games = db.games.filter((g) => g.id !== id);
      db.puzzles = db.puzzles.filter((p) => p.gameId !== id);
      save();
      S.r = null;
      go("games");
    }),
  import: importSheet,
  tstart: startRetake,
  tend: () => {
    S.t = null;
    go("retake");
  },
  tnext: () => {
    S.t.i += 1;
    renderPuzzle();
  },
  tskip: () => {
    S.t.i += 1;
    renderPuzzle();
  },
  treveal: () => {
    const T = S.t;
    const pz = curPuzzle();
    db.stats.streak = 0;
    T.revealed = true;
    T.done = true;
    $("#pzcap").innerHTML = `<b>The engine's choice:</b> <span class="best">${esc(pz.bestSan)}</span>. <span class="muted">You'll see this one again.</span>`;
    drawPuzzle();
  },
  set: (d) => {
    settings[d.k] = d.v === "1";
    fx.configure({ sound: settings.sound, haptics: settings.haptics });
    fx.tap();
    save();
    renderSettings();
  },
  exportall: () => copy(db.games.map((g) => g.pgn).join("\n\n")),
  erase: () =>
    confirmSheet("Erase everything?", "Games, puzzles and progress on this device will be deleted.", "Erase", () => {
      resetAll();
      S.p = null;
      S.r = null;
      S.t = null;
      go("settings");
      toast("Erased");
    }),
};

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-a]");
  if (t && actions[t.dataset.a]) {
    e.preventDefault();
    actions[t.dataset.a](t.dataset);
  }
});

document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    if (t.dataset.tab === "games") S.r = null;
    go(t.dataset.tab);
  }),
);
document.querySelectorAll(".theme-switch [data-option]").forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.option)));
$("#logo").addEventListener("click", () => {
  fx.shutter();
  go("play");
});

window.addEventListener("resize", () => S.r && drawGraph());

/* ───────────────────────── boot ───────────────────────── */

fx.configure({ sound: settings.sound, haptics: settings.haptics });
persist();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  navigator.serviceWorker.ready.then(() => {
    swReady = true;
    paintOfflineLine();
  });
}

go("play");

// Test hook (harmless in production).
window.__cg = { S, db, eng, go };
