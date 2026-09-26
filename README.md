# DZIP — Distraction Zipper

A Chrome extension that locks you into focused work.

## What it does

- **Focus mode** — click the on-page toggle, list your tasks, and you're locked in.
- **Task-Locked exit** — you can't leave Focus mode until every task is checked off with typed proof of what you actually did.
- **Zip picker** — hover to highlight any page element, click to hide it behind a small "Zipped. Click to unzip" bar. Hidden elements persist across reloads (per site).
- **Isolate mode** — click one element (a video, an article) and everything else on the page is hidden, leaving just that.

Built for Hack Club's Frictionless (Stardance) mission.

## Files

- `manifest.json` — Chrome MV3 extension manifest
- `content.js` — main logic: Focus mode, task lock, zip/unzip picker, isolate mode
- `content.css` — styling for the unzip bar
- `popup.html` / `popup.js` — toolbar popup for toggling Focus mode

## Install (unpacked, for testing)

1. Clone this repo
2. Go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this folder
5. Refresh any open tab — a "Start Focus" button will appear top-right
