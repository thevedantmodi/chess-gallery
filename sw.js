// Offline-first service worker. Everything the app needs (engine, rules, pieces, fonts) is
// precached on first visit, so after that it runs with no connection at all.
// Bump VERSION when you ship a new build.
const VERSION = "v6";
const CACHE = `chess-gallery-${VERSION}`;

const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "js/app.js",
  "js/engine.js",
  "js/board.js",
  "js/store.js",
  "js/fx.js",
  "vendor/chess.js",
  "vendor/stockfish-19-lite-single.js",
  "vendor/stockfish-19-lite-single.wasm",
  "fonts/Geist-Regular.ttf",
  "fonts/Geist-SemiBold.ttf",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  ...["a", "b"].flatMap((t) =>
    ["wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP"].map((p) => `vendor/pieces/${t}/${p}.svg`),
  ),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((p) => new Request(p, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const IMMUTABLE = /\.(wasm|ttf|svg|png)$/;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) {
        // Code and pages refresh quietly in the background when there is a connection;
        // the big static files never need to.
        if (!IMMUTABLE.test(url.pathname)) {
          fetch(req)
            .then((res) => res.ok && caches.open(CACHE).then((c) => c.put(req, res)))
            .catch(() => {});
        }
        return hit;
      }
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => (req.mode === "navigate" ? caches.match("index.html") : Response.error()));
    }),
  );
});
