# Chess Gallery

A fully offline chess app for your phone, in the Photo Maps design language.
Stockfish 19 runs on the device (WebAssembly), so there is no server and no signal needed.

- **Play** a ladder of eight opponents (Tourist ~800 up to full-strength Stockfish), or pass the phone to a friend.
- **Games** keeps every game on the device. Tap **Develop** and Stockfish checks each move,
  gives you an accuracy score, an eval graph, and red/green arrows (your move vs. the engine's).
  **Copy for Claude** copies the position + a question so you can ask *why*.
- **Retake** turns your own blunders into puzzles.
- Import games from Lichess / Chess.com by pasting a PGN.
- Haptics and synthesized sounds. Shutter clicks on captures and checks.

## Put it on your phone (once, with signal)

It's a static site, no build step. Deploy to Vercel:

    cd chess-gallery && npx vercel --prod

Or import the repo in the Vercel dashboard (framework: Other, no build command, output dir `.`).

Then on the phone, **while online**:

1. Open the URL in Safari (iPhone) or Chrome (Android).
2. Share → **Add to Home Screen** (Android: **Install app**).
3. Open it from the home screen once. Settings → Offline should say **Ready offline**.
4. Test it: airplane mode, reopen, play.

Installing matters on iPhone: Safari can clear a website's stored data after a week of
no use, but an app added to the Home Screen is exempt.

## Run locally

    python3 -m http.server 8099      # then open http://localhost:8099

(Service workers need https or localhost.)

## Updating

Edit anything, redeploy, and bump `VERSION` in `sw.js`. Phones pick up the new
version the next time they open it with a connection.

## Layout

    index.html  manifest.webmanifest  sw.js
    css/app.css          Photo Maps tokens: colours, type, hairlines, easing, Light | Dark
    js/app.js            screens and game flow
    js/board.js          tap + drag board
    js/engine.js         Stockfish worker wrapper (priority queue)
    js/store.js, fx.js   local storage; haptics and sound
    vendor/              Stockfish 19 lite (1.7 MB wasm), chess.js, flat piece SVGs
    scripts/make-icons.py, make-pieces.py

## Licences

Stockfish is GPLv3 (source: github.com/official-stockfish/Stockfish, and
github.com/nmrugg/stockfish.js for the WebAssembly build). If you publish this site,
publish its source too. chess.js is BSD-2. Pieces are original (make-pieces.py).
Geist is OFL.
