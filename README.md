# Wrong World

Wrong World is a small React game prototype built with Vite. It currently runs as a branching text adventure about dying, remembering why you died, and using that knowledge to break out of a bugged isekai room.

## Commands

```powershell
npm install
npm run dev
npm run build
npm run build:exe
```

The Windows portable executable is generated at `release/Wrong World 0.1.0.exe`.

## Project start rules

- Keep source, config, docs, and small text files in normal Git.
- Keep large binary assets in Git LFS: art, audio, video, layered source files.
- Do not commit generated folders like `node_modules/` or `dist/`.
- Make a commit before large agent edits, then another commit after a working build.

## Current loop

- `ПРОСНУТЬСЯ` starts the run.
- Each death unlocks memory and adds an entry to the death collection.
- Some choices appear only after the player has learned from previous deaths.
- The computer can launch nested copies of the game with degrading graphics modes.
- Death and memory collection progress is saved in browser `localStorage`.
- `Arts/wrong-world-menu-v2.png` is used for both the title screen and the first room scene.
- Music cues are mapped by scene: boot menu, main game loop, window death, regular deaths, and victory.
