import {
  BUILT_IN_APPS,
  cleanPattern,
  describeMatch,
  isWholeSite,
  matchLauncher,
  normalize,
  suggestPattern,
} from "./match.js";

const $ = (id) => document.getElementById(id);

let settings = normalize(await chrome.storage.sync.get(null));
const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

const save = async (changes) => {
  settings = normalize({ ...settings, ...changes });
  await chrome.storage.sync.set(settings);
  render();
};

const addPattern = async (pattern) => {
  const clean = cleanPattern(pattern);
  if (!clean) return false;
  await save({ patterns: [...settings.patterns, clean] });
  return true;
};

const li = (...children) => {
  const item = document.createElement("li");
  item.append(...children);
  return item;
};
const span = (text, className) => {
  const el = document.createElement("span");
  el.textContent = text;
  el.className = className;
  return el;
};
const button = (text, onClick, title = "") => {
  const el = document.createElement("button");
  el.type = "button";
  el.textContent = text;
  el.title = title;
  el.addEventListener("click", onClick);
  return el;
};

// "This tab": what happens to it, and a suggested pattern if nothing closes it yet.
function renderThisTab() {
  const url = activeTab?.url ?? "";
  const web = /^https?:/.test(url);
  $("current-url").textContent = web ? url : "Not a web page.";
  const match = web ? matchLauncher(url, settings) : null;
  $("current-status").textContent = match ? `Closes automatically (${describeMatch(match)}).` : "";
  $("current-status").className = match ? "status closes" : "status";
  $("add-form").hidden = !web || Boolean(match);
  if (web && !match && !$("pattern").value) $("pattern").value = suggestPattern(url);
  updateWarning();
}

function updateWarning() {
  const pattern = $("pattern").value;
  const warning = $("warning");
  if (cleanPattern(pattern) && isWholeSite(pattern)) {
    warning.textContent = "This matches every page on the site. Add more of the path.";
    warning.hidden = false;
  } else {
    warning.hidden = true;
  }
}

async function renderRecent() {
  const { recent = [] } = await chrome.storage.session.get("recent");
  const list = $("recent");
  list.replaceChildren();
  if (!recent.length) list.append(li(span("Nothing loaded since Chrome started.", "empty")));
  for (const { url } of recent) {
    const match = matchLauncher(url, settings);
    list.append(
      li(
        span(url, "url"),
        match
          ? span("closes", "tag")
          : button("Use", () => {
              $("pattern").value = suggestPattern(url);
              $("add-form").hidden = false;
              updateWarning();
              $("pattern").focus();
            }),
      ),
    );
  }
}

function renderPatterns() {
  const list = $("patterns");
  list.replaceChildren();
  if (!settings.patterns.length) list.append(li(span("None yet.", "empty")));
  for (const pattern of settings.patterns) {
    list.append(
      li(
        span(pattern, "url"),
        button("Remove", () => save({ patterns: settings.patterns.filter((p) => p !== pattern) })),
      ),
    );
  }
}

function renderApps() {
  const apps = $("apps");
  apps.replaceChildren();
  for (const [id, app] of Object.entries(BUILT_IN_APPS)) {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = !settings.disabledApps.includes(id);
    box.addEventListener("change", () =>
      save({
        disabledApps: box.checked
          ? settings.disabledApps.filter((d) => d !== id)
          : [...settings.disabledApps, id],
      }),
    );
    const label = document.createElement("label");
    label.append(box, app.label);
    apps.append(label);
  }
}

function render() {
  renderThisTab();
  void renderRecent();
  renderPatterns();
  renderApps();
  $("delay").value = String(settings.delayMs);
}

$("pattern").addEventListener("input", updateWarning);
$("add-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!(await addPattern($("pattern").value))) return;
  const closesThis = activeTab?.url && matchLauncher(activeTab.url, settings);
  if (closesThis) await chrome.tabs.remove(activeTab.id);
});
$("add-only").addEventListener("click", async () => {
  if (await addPattern($("pattern").value)) $("pattern").value = "";
  render();
});
$("delay").addEventListener("change", () => save({ delayMs: Number($("delay").value) }));
$("reload").addEventListener("click", () => chrome.runtime.reload());
$("version").textContent = `v${chrome.runtime.getManifest().version}`;

render();
