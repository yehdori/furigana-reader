const PANEL_ID = "furigana-reader-panel";
const STYLE_ID = "furigana-reader-style";
let cachedRange = null;
let panelHideTimer = null;
let panelFadeTimer = null;
const PANEL_FADE_DELAY_MS = 5000;
const PANEL_FADE_DURATION_MS = 400;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.furigana-group {
  border-radius: 4px;
  padding: 0 2px;
  transition: background-color 120ms ease;
}
.furigana-highlight {
  border-radius: 4px;
  padding: 0 2px;
  transition: background-color 120ms ease;
}
.furigana-highlight rt {
  border-radius: 4px;
  padding: 0 2px;
  transition: background-color 120ms ease;
}
.furigana-highlight:hover,
.furigana-highlight.is-active {
  background-color: rgba(255, 227, 150, 0.7);
}
.furigana-highlight:hover rt,
.furigana-highlight.is-active rt {
  background-color: rgba(255, 227, 150, 0.7);
}
`;
  document.head.appendChild(style);
}

function ensurePanel() {
  let panel = document.getElementById(PANEL_ID);
  if (panel) {
    return panel;
  }

  panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.position = "fixed";
  panel.style.top = "16px";
  panel.style.right = "16px";
  panel.style.width = "360px";
  panel.style.maxHeight = "80vh";
  panel.style.overflow = "auto";
  panel.style.background = "white";
  panel.style.border = "1px solid #ddd";
  panel.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  panel.style.padding = "12px";
  panel.style.zIndex = "999999";
  panel.style.fontFamily = "system-ui, sans-serif";
  panel.style.transition = `opacity ${PANEL_FADE_DURATION_MS}ms ease`;
  panel.style.opacity = "1";
  panel.innerHTML =
    "<strong>Furigana Reader</strong><div id=\"furigana-reader-content\" style=\"margin-top:8px\"></div>";

  document.body.appendChild(panel);
  panel.addEventListener("transitionend", () => {
    if (panel.style.opacity === "0") {
      panel.remove();
    }
  });
  return panel;
}

function renderPanelMessage(message) {
  const panel = ensurePanel();
  const content = panel.querySelector("#furigana-reader-content");
  if (!content) {
    return;
  }

  content.textContent = message;
  schedulePanelFade(panel);
}

function getSelectionRange() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  return selection.getRangeAt(0);
}

function replaceSelectionWithHtml(html) {
  ensureStyle();
  const range = getSelectionRange() ?? cachedRange;
  if (!range) {
    renderPanelMessage("No text selection found on the page.");
    return false;
  }

  const container = document.createElement("span");
  container.innerHTML = html;
  markRubyNodes(container);
  const fragment = document.createDocumentFragment();
  while (container.firstChild) {
    fragment.appendChild(container.firstChild);
  }

  range.deleteContents();
  range.insertNode(fragment);

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }

  cachedRange = null;
  return true;
}

function handleFuriganaResult(payload) {
  if (!payload.ok) {
    renderPanelMessage(payload.error ?? "Unknown error.");
    return;
  }

  const data = payload.data ?? {};
  const html =
    typeof data.html === "string"
      ? data.html
      : typeof data.furigana === "string"
        ? data.furigana
        : JSON.stringify(data, null, 2);

  const applied = replaceSelectionWithHtml(html);
  if (applied) {
    renderPanelMessage("Furigana applied to the selected text.");
  }
}

function schedulePanelFade(panel) {
  if (panelHideTimer) {
    clearTimeout(panelHideTimer);
    panelHideTimer = null;
  }
  if (panelFadeTimer) {
    clearTimeout(panelFadeTimer);
    panelFadeTimer = null;
  }

  panel.style.opacity = "1";
  panel.style.pointerEvents = "auto";

  panelFadeTimer = setTimeout(() => {
    panel.style.opacity = "0";
    panel.style.pointerEvents = "none";
    panelHideTimer = setTimeout(() => {
      if (panel.isConnected) {
        panel.remove();
      }
    }, PANEL_FADE_DURATION_MS + 50);
  }, PANEL_FADE_DELAY_MS);
}

function markRubyNodes(root) {
  if (!root || root.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  if (root.tagName === "RUBY") {
    root.classList.add("furigana-highlight");
    return;
  }

  for (const child of Array.from(root.children)) {
    markRubyNodes(child);
  }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest?.("ruby.furigana-highlight");
  if (!target) {
    return;
  }

  const active = document.querySelectorAll(".furigana-highlight.is-active");
  active.forEach((node) => {
    if (node !== target) {
      node.classList.remove("is-active");
    }
  });

  target.classList.toggle("is-active");
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "furigana:cache-selection") {
    const range = getSelectionRange();
    cachedRange = range ? range.cloneRange() : null;
    return;
  }

  if (message?.type === "furigana:apply-result") {
    handleFuriganaResult(message);
  }
});
