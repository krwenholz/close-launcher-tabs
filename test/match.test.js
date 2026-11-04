import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultSettings,
  isWholeSite,
  matchLauncher,
  normalize,
  patternToRegExp,
  suggestPattern,
} from "../match.js";

const NOTION = "https://app.notion.com/native/p/3f34034b5b8181a5878bf7dc1ecadc9d?deepLinkOpenNewTab=true";

test("built-in apps match their launcher pages and nothing else", () => {
  const s = defaultSettings();
  assert.deepEqual(matchLauncher(NOTION, s), { app: "notion" });
  assert.deepEqual(matchLauncher("https://www.notion.so/native/abc", s), { app: "notion" });
  assert.deepEqual(matchLauncher("https://acme.slack.com/ssb/redirect", s), { app: "slack" });
  assert.deepEqual(matchLauncher("https://linear.app/acme/issue/ACM-1/desktop", s), { app: "linear" });
  assert.equal(matchLauncher("https://www.notion.so/acme/Roadmap-3f34", s), null);
  assert.equal(matchLauncher("https://app.notion.com/p/3f34", s), null);
  assert.equal(matchLauncher("https://app.slack.com/client/T123/C456", s), null);
});

test("a disabled app no longer matches", () => {
  const s = normalize({ disabledApps: ["notion"] });
  assert.equal(matchLauncher(NOTION, s), null);
});

test("only web pages are ever closed", () => {
  const s = normalize({ patterns: ["*"] });
  assert.equal(matchLauncher("chrome://extensions", s), null);
  assert.deepEqual(matchLauncher("https://example.com/", s), { pattern: "*" });
});

test("user patterns are scheme-less URL prefixes with * wildcards", () => {
  const s = normalize({ patterns: ["zoom.us/j/*/launch", "https://figma.com/desktop/"] });
  assert.deepEqual(s.patterns, ["zoom.us/j/*/launch", "figma.com/desktop/"]);
  assert.deepEqual(matchLauncher("https://zoom.us/j/123/launch?pwd=x", s), {
    pattern: "zoom.us/j/*/launch",
  });
  assert.ok(matchLauncher("http://figma.com/desktop/file/1", s));
  assert.equal(matchLauncher("https://zoom.us/j/123", s), null);
  // Anchored at the host: a URL that merely mentions the pattern doesn't match.
  assert.equal(matchLauncher("https://evil.test/?next=figma.com/desktop/", s), null);
});

test("regex characters in patterns are literal", () => {
  assert.ok(patternToRegExp("a.com/x?y=(1)").test("a.com/x?y=(1)"));
  assert.ok(!patternToRegExp("a.com/x").test("aXcom/x"));
});

test("normalize drops junk and clamps the delay", () => {
  const s = normalize({ disabledApps: ["nope", "slack"], patterns: ["", " a.com/x ", 3, "a.com/x"], delayMs: 1e9 });
  assert.deepEqual(s, { disabledApps: ["slack"], patterns: ["a.com/x"], delayMs: 30000 });
  assert.equal(normalize({ delayMs: "soon" }).delayMs, 1500);
  assert.equal(normalize({ delayMs: -5 }).delayMs, 0);
});

test("suggestions keep the path up to the first id", () => {
  assert.equal(suggestPattern(NOTION), "app.notion.com/native/p/");
  assert.equal(suggestPattern("https://acme.slack.com/ssb/redirect"), "acme.slack.com/ssb/redirect");
  assert.equal(suggestPattern("https://zoom.us/j/84512345678?pwd=abc"), "zoom.us/j/");
  assert.equal(suggestPattern("https://example.com/a/b/c/d/e"), "example.com/a/b/c/");
  assert.equal(suggestPattern("https://example.com/?launch=1"), "example.com/");
  assert.equal(suggestPattern("chrome://extensions"), "");
  assert.equal(suggestPattern("not a url"), "");
  // A suggestion always matches the tab it came from.
  for (const url of [NOTION, "https://acme.slack.com/ssb/redirect", "https://zoom.us/j/845123?x"]) {
    assert.ok(patternToRegExp(suggestPattern(url)).test(url.replace(/^https:\/\//, "")), url);
  }
});

test("whole-site patterns are flagged", () => {
  assert.ok(isWholeSite("example.com/"));
  assert.ok(isWholeSite("example.com"));
  assert.ok(isWholeSite("example.com/*"));
  assert.ok(!isWholeSite("app.notion.com/native/"));
  assert.ok(!isWholeSite("example.com/?launch=1"));
});
