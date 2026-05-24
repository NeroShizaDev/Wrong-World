# Wrong World

Wrong World is a small React game prototype built with Vite. The first checkpoint contains the main menu art, audio assets, a playable reality-console loop, and Git LFS rules for binary game files.

## Commands

```powershell
npm install
npm run dev
npm run build
```

## Project start rules

- Keep source, config, docs, and small text files in normal Git.
- Keep large binary assets in Git LFS: art, audio, video, layered source files.
- Do not commit generated folders like `node_modules/` or `dist/`.
- Make a commit before large agent edits, then another commit after a working build.

## Current loop

- `NEW GAME` starts a new run.
- `LOAD REALITY` restores the last saved browser-local state.
- `SCAN`, `PATCH`, `DISTORT`, and `RESET` change the reality state and save progress.
