// Closes the leftover tab that apps like Slack, Linear and Notion open just to hand off to their
// desktop app (via slack://, linear://, notion://, etc.). What counts as a launcher tab lives in
// match.js and the settings set in the toolbar popup.

import { matchLauncher, normalize } from "./match.js";

const RECENT_LIMIT = 10;

// Settings are cached for the life of the worker and dropped whenever the popup changes them.
let settings = null;
const getSettings = async () => (settings ??= normalize(await chrome.storage.sync.get(null)));
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "sync") settings = null;
});

// The last few tab loads, so the popup can offer "close tabs like this" for a tab that's already
// gone. Kept in storage.session: memory only, cleared when Chrome quits.
let recentWrite = Promise.resolve();
const remember = (entry) => {
  recentWrite = recentWrite.then(async () => {
    const { recent = [] } = await chrome.storage.session.get("recent");
    const next = [entry, ...recent.filter((r) => r.url !== entry.url)].slice(0, RECENT_LIMIT);
    await chrome.storage.session.set({ recent: next });
  }).catch(() => {});
  return recentWrite;
};

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== "complete" || !/^https?:/.test(tab.url ?? "")) return;

  const current = await getSettings();
  const match = matchLauncher(tab.url, current);
  void remember({ url: tab.url, at: Date.now(), closed: Boolean(match) });
  if (!match) return;

  // The tab may already be gone by the time the timer fires; ignore that.
  setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), current.delayMs);
});
