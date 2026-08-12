# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is currently empty scaffolding: `index.html` has no content yet. The game itself has not been implemented.

## Goal

Build the classic game Arkanoid using plain HTML, CSS, and JavaScript, with **zero external dependencies** (no frameworks, no libraries, no build tools, no package manager). Everything should run directly in the browser by opening `index.html` — no build/compile step.

## Architecture expectations

Since there is no build tooling, keep the structure simple and directly runnable:
- `index.html` — entry point, loads CSS and JS via plain `<link>`/`<script>` tags.
- Prefer a `<canvas>`-based rendering approach for the game (paddle, ball, bricks), driven by a JS game loop (`requestAnimationFrame`).
- Keep game logic in plain `.js` files loaded via `<script>` tags (or a single `<script type="module">` if splitting into ES modules) — do not introduce bundlers or npm dependencies.
- No CSS/JS frameworks — hand-written CSS and vanilla JS only.

## Running the game

Since there are no dependencies or build steps, verify changes by opening `index.html` directly in a browser (or serving the directory with any static file server) and playing the game manually — there are no automated tests or lint/build commands configured in this repo.
