# close-launcher-tabs

Chrome extension that closes the leftover tab Slack, Linear, etc. open right
before launching their desktop app.

## Install

1. `git clone https://github.com/krwenholz/close-launcher-tabs.git`
2. Open `chrome://extensions`, turn on **Developer mode**
3. **Load unpacked** → pick the cloned folder

Update with `git pull`, then hit reload on the extension card.

## Tuning

If a launcher tab isn't closing, its URL isn't in `LAUNCHER_PATTERNS`:

1. Set `DEBUG = true` in `background.js` and reload the extension
2. Click **service worker** on the extension card to open its console
3. Trigger the tab, copy the logged URL, add a regex for it
4. Reload; set `DEBUG` back to `false` once it works

Tabs closing before the app opens? Raise `CLOSE_DELAY_MS`.
