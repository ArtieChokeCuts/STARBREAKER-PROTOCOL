# Starbreaker Protocol

Starbreaker Protocol is a stylish arcade shooter built as a zero-dependency web game. It is designed to be dropped into a GitHub repository and published as a static site, with a black-sky neon shell inspired by the look and feel of Kinetic Audio Box.

## What is included

- A fullscreen-first glass HUD inspired by Kinetic Audio Box
- A canvas-based shooter with 6 waves, 2 bosses, and upgrade drafts
- Keyboard, touch, and mouse click-hold support
- Browser-based fullscreen support on browsers that allow it
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

## Browser fullscreen behavior

- From a normal mobile browser link, the game will load responsively and play with touch controls.
- On desktop browsers and some Android browsers, the `Fullscreen` button can expand the game area inside the browser window.
- Some mobile browsers, especially on iPhone and iPad, may still keep browser chrome visible even while playing.

## Controls

- `WASD` or arrow keys: move
- Mouse: move to aim, click and hold to steer-fire
- `Shift`: dash
- `Space`: trigger EMP when fully charged
- `P` or `Esc`: pause
- Touch devices: drag on the playfield to steer-fire, use the on-screen `Dash` and `EMP` buttons

## Files

- `index.html`: page shell and UI
- `styles.css`: visual design and responsive layout
- `game.js`: gameplay, rendering, audio, and progression
- `sw.js`: cleanup script that unregisters older cached PWA versions if someone visited an earlier build
- `icons/`: browser tab and sharing artwork

## Customization ideas

- Change the title and story flavor in `index.html`
- Tweak balance numbers in `game.js`
- Replace the color palette in `styles.css`
- Add your own soundtrack or art assets if you want to push the presentation further
