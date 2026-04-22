# Starbreaker Protocol

Starbreaker Protocol is a stylish arcade shooter built as a zero-dependency web game. It is designed to be dropped into a GitHub repository and published as a static site.

## What is included

- A responsive landing page and HUD
- A canvas-based shooter with 6 waves, 2 bosses, and upgrade drafts
- Keyboard and touch support
- Installable PWA support for mobile home-screen launch
- Fullscreen shortcut support on browsers that allow it
- Local high-score persistence with `localStorage`
- No build tooling or package install required

## How to run locally

Because this project is plain static web content, you can open `index.html` directly in a browser.

## How to release it on GitHub

1. Create a new GitHub repository.
2. Upload the files in this folder to the repository root.
3. Commit and push.
4. Enable GitHub Pages for the repository.
5. Point Pages at the branch and folder that contains these files.

Once Pages finishes deploying, the game will be live as a shareable website.

## Mobile fullscreen behavior

- From a normal mobile browser link, the game will load responsively and play with touch controls.
- On Android and other supported browsers, the `Install App` button can trigger an install prompt once the site is hosted over HTTPS.
- On iPhone and iPad, use `Share` -> `Add to Home Screen` after opening the live GitHub Pages link.
- After installing from the home screen, the game launches in standalone app-style mode with safe-area handling.

## Controls

- `WASD` or arrow keys: move
- `Shift`: dash
- `Space`: trigger EMP when fully charged
- `P` or `Esc`: pause
- Touch devices: drag on the playfield to move, use the on-screen `Dash` and `EMP` buttons

## Files

- `index.html`: page shell and UI
- `styles.css`: visual design and responsive layout
- `game.js`: gameplay, rendering, audio, and progression
- `manifest.webmanifest`: install metadata for PWA support
- `sw.js`: offline cache and app shell service worker
- `icons/`: app icons for install prompts and home-screen launch

## Customization ideas

- Change the title and story flavor in `index.html`
- Tweak balance numbers in `game.js`
- Replace the color palette in `styles.css`
- Add your own soundtrack or art assets if you want to push the presentation further
