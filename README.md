# close-launcher-tabs

Chrome extension that closes the leftover tab Slack, Linear, Notion, etc. open right before
launching their desktop app.

## Install

Chrome loads it straight from a folder; there's no build step. Any folder works;
`~/Applications/CloseLauncherTabs` keeps it with your other apps.

```sh
git clone https://github.com/krwenholz/close-launcher-tabs.git ~/Applications/CloseLauncherTabs
```

Open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and pick that
folder. Pin it from Chrome's puzzle-piece menu so its popup is one click away.

**Update:** `git -C ~/Applications/CloseLauncherTabs pull`, then click **Reload extension** at the
bottom of the popup. Your settings carry over: the manifest pins the extension id, so it stays the
same across updates and even if you move the folder.

Prefer a download? Each version is also a zip on the
[Releases](https://github.com/krwenholz/close-launcher-tabs/releases) page.

## Teaching it a new launcher tab

Click the toolbar icon while the stray tab is open. The popup suggests a pattern from its URL with
the ids trimmed off (`app.notion.com/native/p/` for a Notion page link). Check it, then **Add and
close this tab**. Every tab like it closes on its own from then on.

Tab already gone? **Recent tabs** lists the last ten pages loaded since Chrome started; click
**Use** next to one to fill in the pattern.

Patterns are URL prefixes without `https://`, and `*` matches anything: `zoom.us/j/*/launch`. The
popup warns when a pattern would match a whole site.

Also in the popup: switch off the built-in Slack, Linear and Notion rules, remove your own
patterns, and set how long to wait before closing. Raise the wait if the desktop app doesn't open
because the tab closes too soon.

## Privacy

It needs `tabs` to read tab URLs and `storage` for its settings. Settings (your patterns, the
delay, which built-ins are on) live in `chrome.storage.sync`. The recent-tabs list lives in
`chrome.storage.session`, which is kept in memory and cleared when Chrome quits. No network
requests.

## Develop

- `background.js`: service worker; closes matching tabs and records recent ones.
- `match.js`: the pure matching logic (built-in rules, patterns, suggestions). No `chrome.*`.
- `popup.html` / `popup.js` / `popup.css`: the toolbar popup.
- `node --test` runs `test/`. CI runs it on every push, and on `main` publishes a GitHub Release
  with a zip whenever `version` in `manifest.json` is new. Bump it to release.

The manifest's `key` is public and only fixes the extension id. Its private key was thrown away;
it's only needed to pack a `.crx`, which unpacked installs don't use.
