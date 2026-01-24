function extractText() {
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    return selection.toString().trim();
  }

  return document.body.innerText.trim();
}

function ensurePanel() {
  let panel = document.getElementById("furigana-reader-panel");
  if (panel) {
    return panel;
  }

  panel = document.createElement("div");
  panel.id = "furigana-reader-panel";
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
  panel.innerHTML = "<strong>Furigana Reader</strong><div id=\"furigana-reader-content\" style=\"margin-top:8px\"></div>";

  document.body.appendChild(panel);
  return panel;
}

function renderResult(result) {
  const panel = ensurePanel();
  const content = panel.querySelector("#furigana-reader-content");
  if (!content) {
    return;
  }

  if (result.html) {
    content.innerHTML = result.html;
    return;
  }

  content.textContent = result.furigana ?? JSON.stringify(result, null, 2);
}

async function requestFurigana() {
  const text = extractText();
  if (!text) {
    renderResult({ furigana: "No text found on the page." });
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "furigana:analyze",
    text
  });

  if (!response?.ok) {
    renderResult({ furigana: response?.error ?? "Unknown error" });
    return;
  }

  renderResult(response.data);
}

requestFurigana();
