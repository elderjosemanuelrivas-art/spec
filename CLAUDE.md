# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The game is **implemented and playable**. Four specs have been written, approved and
implemented (`specs/01`–`specs/04`). Current features: 3 levels, lives, score, progressive
ball speed, brick-break particles, floating score popups, synthesized audio with mute,
and pause.

## Goal

Build the classic game Arkanoid using plain HTML, CSS, and JavaScript, with **zero external
dependencies** (no frameworks, no libraries, no build tools, no package manager). Everything
runs directly in the browser by opening `index.html` — no build/compile step.

## Files

- `index.html` — entry point: HUD (`#hud-score`, `#hud-lives`, `#hud-level`), the 480x640
  `<canvas id="game">`, two overlays (`#overlay` win/gameover with restart button,
  `#pause-overlay` without one), and the `#key-hints` legend.
- `style.css` — hand-written, dark theme, `.hidden` toggles the overlays.
- `script.js` — all game logic, ~635 lines, loaded via a plain `<script>` tag.
- `specs/` — the spec-driven history of the project. Read before changing behavior.

## Architecture (`script.js`)

Single file, no modules. Top-to-bottom: constants → audio → `state` → input listeners →
update functions → draw functions → the loop.

- **State** lives in one global `state` object: `{ lives, score, status, level, paddle, ball,
  bricks, particles, popups }`. Mutated in place — there is no immutability convention here.
- **`state.status`** is `'ready' | 'paused' | 'win' | 'gameover'`. Note: SPEC 01 mentions a
  `'playing'` value that the code never actually uses — `'ready'` covers both pre-launch and
  active play. Do not "fix" this by adding `'playing'` without a spec.
- **Loop** is `loop(timestamp)` → `update()` → `draw()` → `requestAnimationFrame`. The
  `'win' | 'gameover' | 'paused'` guard sits in `update()`; particles/popups keep animating on
  win/gameover but freeze on pause (deliberate, see SPEC 04 decisions).
- **Levels** are `LEVEL_LAYOUTS`: an array of 5 strings of 8 chars, `#` = brick, `.` = empty.
  `createBricks(level)` reads them. Adding a level = adding one entry, no logic changes.
- **Collision** is swept, not naive: the ball keeps `prevX`/`prevY` and `collidePaddle()` /
  `bounceOffBrick()` use the previous position to pick the bounce axis and avoid tunneling.
  Do not replace this with an AABB overlap test.
- **Audio** is Web Audio API synthesized in code — no audio files in the repo.
  `playToneSound(freq)` for walls (880 Hz) and paddle (523 Hz); `playBrickBreakSound()` builds
  a filtered white-noise buffer. `ensureAudioContext()` is called on first launch because
  browsers block audio before a user gesture.
- **Difficulty** is time-based: `updateDifficulty(timestamp)` raises `ball.speed` every
  10 s up to `MAX_BALL_SPEED`. Pause compensates by adding the paused duration to `startTime`.
- **Tuning values are named constants** at the top of the file. Change those, not literals
  buried in the functions.

## Invariants set by the specs

These are closed decisions. Do not change them without a new spec:

- Keyboard only — `←`/`→` move, `Space` launches, `P` pauses, `M` mutes. Click also launches;
  no other mouse/touch support.
- 10 points per brick, identical for every row.
- Advancing a level refills lives to `INITIAL_LIVES` and keeps the accumulated score.
- Ball speed is **not** reset between levels — that is the main difficulty ramp, on purpose.
- No persistence of any kind (no localStorage, no high scores).
- No power-ups, no multi-hit bricks.

## Workflow: spec-driven

This repo uses two skills in `.claude/skills/`:

1. `/spec <description>` — designs a spec through questions and writes `specs/NN-slug.md` with
   status `borrador`. **Never writes code.**
2. The human re-reads it and changes the status to `aprobado` by hand. The agent never does this.
3. `/spec-impl NN-slug` — refuses to run unless the status means approved, creates the branch
   `spec-NN-slug`, and implements the plan step by step, pausing after each step for a diff
   review. **Never commits automatically.**

Specs are written in **Spanish** and follow a fixed section order (Scope / Data model /
Implementation plan / Acceptance criteria / Decisions / Identified risks / What is not in this
spec). Match the existing ones. Behavior changes go through a spec first — not straight into
`script.js`.

## Running the game

No dependencies, no build step. Open `index.html` directly in a browser (or serve the folder
with any static file server) and play it manually. There are no automated tests, linters or
build commands in this repo — verification is the acceptance-criteria checklist of the relevant
spec.
