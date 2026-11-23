# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla JavaScript Tetris on HTML5 Canvas. No dependencies, no `package.json`, no build step, no test suite, no linter. The README and all user-facing UI text are in Spanish — keep new UI strings in Spanish.

## Running

Open `index.html` directly in a browser, or serve the folder statically (recommended):

```bash
python -m http.server 8000   # then open http://localhost:8000
```

There are no automated tests; verify changes by playing the game in a browser.

## Architecture

Three files: `index.html` (DOM: `#board` canvas, `#next-canvas` preview, HUD spans, shared `#overlay`), `style.css` (dark theme), and `game.js`, which holds all logic as top-level functions sharing module-level mutable state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `animId`, …). `init()` resets all of it and is also the restart handler.

Key conventions in `game.js`:

- **One index means piece type, cell value, and color.** `PIECES[i]` shapes are filled with the value `i`, `COLORS[i]` is its color, and board cells store that same `i` (`0` = empty). Index `0` of both arrays is `null`. Adding or reordering a piece requires keeping these aligned, and `randomPiece()` hardcodes `* 7`.
- **Pieces** are `{ type, shape, x, y }` where `shape` is a square matrix; rotation is `rotateCW` (transpose + reverse) and `tryRotate` applies simple horizontal kicks `[0, -1, 1, -2, 2]` (not SRS).
- **`collide(shape, x, y)`** is the single source of truth for movement, rotation, ghost projection (`ghostY`), gravity, and game-over detection (a freshly `spawn()`ed piece that collides triggers `endGame()`). Rows with `y < 0` are allowed.
- **Locking path:** `lockPiece()` → `merge()` → `clearLines()` (updates lines/score/level/`dropInterval`) → `spawn()`.
- **Game loop:** `loop()` runs via `requestAnimationFrame`, accumulates `dt` into `dropAccum`, and steps gravity when it exceeds `dropInterval`. Pause and game over stop the loop with `cancelAnimationFrame(animId)`; unpausing restarts it by calling `loop()` directly.
- **Overlay** (`#overlay`) is shared by the PAUSA and GAME OVER states; only its title/score text changes.
- **Scoring/speed:** `LINE_SCORES[cleared] * level`; hard drop +2/row, soft drop +1/row; level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 − (level − 1) × 90)` ms.

If `COLS`, `ROWS`, or `BLOCK` change, the `<canvas id="board">` `width`/`height` in `index.html` must be updated to `COLS × BLOCK` by `ROWS × BLOCK`. The next-piece preview assumes a 4×4 grid of 30px cells on a 120×120 canvas.
