# Chess

A fully offline chess app for your phone, with an 8-bit look.
Stockfish 19 runs on the device (WebAssembly), so there is no server, no account and no signal needed.

## Features

### Play
- **Eight opponents**, each unlocked by beating the one before. Strength runs from The Tourist (~800)
  through The Visitor (1320), The Docent (1500), The Guide (1700), The Archivist (1900), The Curator (2200)
  and The Director (2600) to full-strength Stockfish (3190).
- **Pass and play** with a friend on the same phone.
- Choose White, Black or random.
- Tap a piece then a square, or drag it. Legal moves are highlighted, and pawn promotion asks what you want.
- **Hint** shows the engine's best move with an arrow. **Undo**, **Flip** the board and **Resign** are always there.
- **Resume** an unfinished game after closing the app.
- Optional **eval gauge**, a thin bar beside the board. Leave it off to train your eye.
- An "unlock every opponent" switch skips the ladder.

### Games
- Every game is saved on the device, with result, opponent and move count. Delete any of them.
- **Import** Lichess or Chess.com games by pasting a PGN. **Copy PGN** and **Copy all games** export them.
- Step through any game with the move list.

### Analyze
- Tap **Analyze** and Stockfish checks every move of a finished game.
- You get an **accuracy score**, an **eval graph** and every move labelled as an inaccuracy, mistake or blunder.
- Arrows on the board show your move against the engine's choice.
- **Copy for Claude** copies the position and a question so you can ask an AI *why* a move was bad.

### Puzzles
- Your own blunders and mistakes become puzzles: the position from your game, where a better move existed.
- Find the best move. Wrong answers can retry, **Reveal** shows the answer and **Skip** moves on.
- Tracks your **streak**, best streak and solved count. A position is mastered after two correct solves.

### Look and feel
- **Pixel-art pieces**: a black set and a white set, in the style of an 8-bit sprite sheet.
- Two **board colour schemes**, Sand and Slate (Settings, Board).
- **Light and Dark** themes, following your phone by default.
- Buttons, tabs and rows respond to touch and hover with press and lift animations.
  Reduced-motion settings are respected.
- Haptic taps and synthesized sounds (no audio files). Both can be switched off.

### Offline and private
- Works in airplane mode once installed. Settings shows whether the app is **Ready offline**.
- Install it to the Home Screen as a standalone app with its own icon.
- Games, puzzles and progress are stored only on the device. **Erase everything** wipes them.
- The only network use is the first load.

## Put it on your phone (once, with signal)

It's a static site, no build step. Deploy to Vercel:

    npx vercel --prod

Or import the repo in the Vercel dashboard (framework: Other, no build command, output dir `.`).

Then on the phone, **while online**:

1. Open the URL in Safari (iPhone) or Chrome (Android).
2. Share → **Add to Home Screen** (Android: **Install app**).
3. Open it from the home screen once. Settings → Offline should say **Ready offline**.
4. Test it: airplane mode, reopen, play.

Installing matters on iPhone: Safari can clear a website's stored data after a week of
no use, but an app added to the Home Screen is exempt.

## Run locally

    python3 -m http.server 8099 --bind 127.0.0.1    # then open http://127.0.0.1:8099

(Service workers need https or localhost.)

## Updating

Edit anything, redeploy, and bump `VERSION` in `sw.js`. Phones pick up the new
version the next time they open it with a connection.

## Layout

    index.html  manifest.webmanifest  sw.js
    css/app.css          Design tokens: colours, type, hairlines, easing, Light | Dark
    js/app.js            screens and game flow
    js/board.js          tap + drag board
    js/engine.js         Stockfish worker wrapper (priority queue)
    js/store.js, fx.js   local storage; haptics and sound
    vendor/              Stockfish 19 lite (1.7 MB wasm), chess.js, pixel-art piece SVGs
    icons/               app icon and favicon (the white knight)
    scripts/make-pieces.py   generates vendor/pieces from text sprites
    scripts/make-icons.py    renders icons/ from the knight sprite (needs Pillow)

## Licences

Stockfish is GPLv3 (source: github.com/official-stockfish/Stockfish, and
github.com/nmrugg/stockfish.js for the WebAssembly build). If you publish this site,
publish its source too. chess.js is BSD-2. Pieces are original (make-pieces.py).
Geist is OFL.
