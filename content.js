let lastSelectionRange = null;

function extractTextFromSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    lastSelectionRange = null;
    return "";
  }

  const text = selection.toString().trim();
  if (!text) {
    lastSelectionRange = null;
    return "";
  }

  lastSelectionRange = selection.getRangeAt(0).cloneRange();
  return text;
}

function renderResultInSelection(result) {
  if (!lastSelectionRange) {
    console.warn("Furigana Reader: no active selection to replace.");
    return;
  }

  const fragment = document.createDocumentFragment();
  if (result.html) {
    const template = document.createElement("template");
    template.innerHTML = result.html.trim();
    fragment.appendChild(template.content);
  } else {
    const span = document.createElement("span");
    span.textContent = result.furigana ?? JSON.stringify(result, null, 2);
    fragment.appendChild(span);
  }

  lastSelectionRange.deleteContents();
  lastSelectionRange.insertNode(fragment);
  lastSelectionRange = null;
  window.getSelection()?.removeAllRanges();
}

async function requestFurigana() {
  const text = extractTextFromSelection();
  if (!text) {
    console.warn("Furigana Reader: select some text first.");
    return;
  }

  const response = await chrome.runtime.sendMessage({
    type: "furigana:analyze",
    text
  });

  if (!response?.ok) {
    console.error("Furigana Reader:", response?.error ?? "Unknown error");
    return;
  }

  renderResultInSelection(response.data);
}

requestFurigana();
