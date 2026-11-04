// Pure matching logic, shared by the service worker, the popup and the tests. No chrome.* here.

// Launcher pages for known apps. Each can be switched off in the popup.
export const BUILT_IN_APPS = {
  slack: { label: "Slack", patterns: [/slack\.com\/ssb\//, /app\.slack\.com\/.*\bopen\b/] },
  linear: { label: "Linear", patterns: [/linear\.app\/.*\/desktop/] },
  notion: { label: "Notion", patterns: [/notion\.(so|com)\/native\//] },
};

export const DEFAULT_DELAY_MS = 1500;
export const MAX_DELAY_MS = 30000;

export function defaultSettings() {
  return { disabledApps: [], patterns: [], delayMs: DEFAULT_DELAY_MS };
}

/** Merge stored values over the defaults, dropping anything unknown or mistyped. */
export function normalize(stored = {}) {
  const settings = defaultSettings();
  if (Array.isArray(stored.disabledApps)) {
    settings.disabledApps = stored.disabledApps.filter((id) => id in BUILT_IN_APPS);
  }
  if (Array.isArray(stored.patterns)) {
    settings.patterns = [
      ...new Set(stored.patterns.filter((p) => typeof p === "string").map(cleanPattern)),
    ].filter(Boolean);
  }
  const delay = Number(stored.delayMs);
  if (Number.isFinite(delay)) settings.delayMs = Math.min(Math.max(0, delay), MAX_DELAY_MS);
  return settings;
}

// Your own patterns are URL prefixes without the scheme, where * matches anything:
// "app.notion.com/native/" or "*.zoom.us/j/*/launch". Friendlier than regexes, and nothing to
// mistype into an invalid one.

/** Trims a pattern and strips any scheme someone pasted along with it. */
export function cleanPattern(pattern) {
  return pattern.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
}

export function patternToRegExp(pattern) {
  const body = cleanPattern(pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\/]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}`, "i");
}

const withoutScheme = (url) => url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");

/**
 * What closes this URL: { app: "notion" }, { pattern: "app.notion.com/native/" }, or null.
 * Only http(s) pages are ever closed.
 */
export function matchLauncher(url, settings) {
  if (!/^https?:\/\//i.test(url)) return null;
  for (const [id, app] of Object.entries(BUILT_IN_APPS)) {
    if (settings.disabledApps.includes(id)) continue;
    if (app.patterns.some((re) => re.test(url))) return { app: id };
  }
  const bare = withoutScheme(url);
  for (const pattern of settings.patterns) {
    if (patternToRegExp(pattern).test(bare)) return { pattern };
  }
  return null;
}

/** A human label for a match result. */
export function describeMatch(match) {
  if (!match) return "";
  return match.app ? BUILT_IN_APPS[match.app].label : match.pattern;
}

// Path segments that look like ids (page ids, team ids, tokens) get cut, so a suggestion
// matches every launcher tab from that app rather than just this one.
const looksLikeId = (segment) =>
  segment.length >= 20 || (segment.length >= 6 && /\d/.test(segment)) || /^\d+$/.test(segment);

/**
 * Suggests a pattern for "close tabs like this one": host plus the leading path segments up to
 * the first id-like one (at most three).
 *   https://app.notion.com/native/p/3f34…?deepLinkOpenNewTab=true → app.notion.com/native/p/
 */
export function suggestPattern(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "";
  }
  if (!/^https?:$/.test(parsed.protocol)) return "";
  const segments = parsed.pathname.split("/").filter(Boolean);
  const kept = [];
  for (const segment of segments) {
    if (looksLikeId(segment) || kept.length === 3) break;
    kept.push(segment);
  }
  // A trailing slash only when more path follows, so ".../ssb/redirect" still matches itself.
  const tail = kept.length < segments.length && kept.length > 0 ? "/" : "";
  return `${parsed.host}/${kept.join("/")}${tail}`;
}

/** True for a pattern that would close every page on a site ("example.com/"). */
export function isWholeSite(pattern) {
  return !/\/./.test(cleanPattern(pattern).replace(/\/\*$/, "/"));
}
