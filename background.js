// Closes the leftover tab that apps like Slack and Linear open just to hand
// off to their desktop app (via slack://, linear://, etc.).

// URLs that count as launcher tabs. Add your own; see README for tuning.
const LAUNCHER_PATTERNS = [
  /slack\.com\/ssb\//,
  /app\.slack\.com\/.*\bopen\b/,
  /linear\.app\/.*\/desktop/,
  /notion\.(so|com)\/native\//,
];

// Delay before closing, so the desktop handoff has time to fire.
const CLOSE_DELAY_MS = 1500;

// Log every tab load to the service worker console.
const DEBUG = false;

const isLauncher = (url) => LAUNCHER_PATTERNS.some((re) => re.test(url));

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status !== "complete" || !tab.url) return;

  const match = isLauncher(tab.url);
  if (DEBUG) console.log(match ? "CLOSE" : "skip ", tab.url);
  if (!match) return;

  // The tab may already be gone by the time the timer fires; ignore that.
  setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), CLOSE_DELAY_MS);
});
