# Husky Desktop Pet (Electron)

This repository is intentionally overwritten to contain only the latest Husky desktop pet implementation.

## Run

```bash
npm install
npm start
```

## Included files

- `package.json`
- `main.js`
- `preload.js`
- `index.html`
- `renderer.js`
- `style.css`

## Features

- Transparent frameless always-on-top desktop pet window.
- Tray menu with show/hide, topmost toggle, settings, and quit.
- Runtime animation frame discovery from `assets/*.png`.
- Autonomous `idle / walk / sleep` state machine.
- Click, double-click, right-click interactions with speech bubble.
- Configurable reminder intervals.
- Configurable pet size (200 / 156 / 128).
