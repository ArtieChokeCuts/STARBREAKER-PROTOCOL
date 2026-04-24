# Starbreaker Protocol

Starbreaker Protocol is a browser-playable cockpit shooter: a clean glass HUD, sprite ships in a Three.js scene, and a hyperwarp star tunnel built for mouse, touch, and keyboard.

## What is included

- A modern fullscreen cockpit layout with less visual clutter
- Three.js rendering with generated sprite ships, bullets, bosses, particles, and warp rings
- Cinematic cartoon sprite atlas with cockpit-facing player, enemy, projectile, explosion, and smoke frames
- Mouse click-hold and touch drag-to-shoot controls
- Keyboard support for desktop play
- Six escalating sectors, two boss encounters, upgrade drafts, dash, EMP, combo scoring, and local best score
- Static-site release flow for GitHub Pages

## Play locally

Open `index.html` in a browser, or serve the folder with any static server. The game loads Three.js from a CDN, so the GitHub Pages link is the best way to share it from a phone.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Controls

- Mouse: move aim, click and hold to fire
- Touch: drag on the playfield to aim and fire
- `WASD` or arrow keys: aim/evade
- `J` or `Enter`: fire from keyboard
- `Shift`: dash
- `Space`: EMP when fully charged
- `P` or `Esc`: pause
- `FULL`: request browser fullscreen where the browser allows it

## Release on GitHub

1. Put these files at the repository root.
2. Commit and push to GitHub.
3. Enable GitHub Pages for the branch.
4. Share the Pages URL.

Mobile browsers will play from the link. Some iPhone and Android browser chrome may remain visible unless the browser allows fullscreen or the player installs the page to the home screen.

## Files

- `index.html`: page shell, cockpit overlays, and HUD
- `styles.css`: responsive cockpit visuals
- `game.js`: Three.js sprite engine, gameplay, audio, controls, and progression
- `assets/sprites/starbreaker-cinematic-atlas.svg`: 8 x 6 animated sprite sheet
- `assets/sprites/starbreaker-cinematic-atlas.json`: frame map for the cinematic atlas
- `sw.js`: cleanup script for older cached versions
- `icons/`: browser tab and sharing artwork
