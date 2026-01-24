const PANEL_ID = "furigana-reader-panel";
let cachedRange = null;

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
  panel.innerHTML =
    "<strong>Furigana Reader</strong><div id=\"furigana-reader-content\" style=\"margin-top:8px\"></div>";

  document.body.appendChild(panel);
  return panel;
}

function renderPanelMessage(message) {
  const panel = ensurePanel();
  const content = panel.querySelector("#furigana-reader-content");
  if (!content) {
    return;
  }

  content.textContent = message;
}

function getSelectionRange() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  return selection.getRangeAt(0);
}

function replaceSelectionWithHtml(html) {
  const range = getSelectionRange() ?? cachedRange;
  if (!range) {
    renderPanelMessage("No text selection found on the page.");
    return false;
  }

  const container = document.createElement("span");
  container.innerHTML = html;
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
