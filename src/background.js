const DEFAULT_SETTINGS = {
  apiEndpoint: "https://api.example.com/furigana",
  apiKey: "",
  useProxy: true
};

const CONTEXT_MENU_ID = "furigana-maker";

async function loadSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

async function callFuriganaApi(text) {
  const settings = await loadSettings();
  if (!settings.apiEndpoint) {
    throw new Error("API endpoint is not configured.");
  }

  const headers = {
    "Content-Type": "application/json"
  };

  if (!settings.useProxy && settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  if (!settings.useProxy && !settings.apiKey) {
    throw new Error("API key is required when not using a proxy.");
  }

  const response = await fetch(settings.apiEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "API request failed.");
  }

  return response.json();
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Furigana Maker",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) {
    return;
  }

  const selectionText = info.selectionText?.trim();
  if (!selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      type: "furigana:apply-result",
      ok: false,
      error: "No text selected."
    });
    return;
  }

  try {
    const data = await callFuriganaApi(selectionText);
    chrome.tabs.sendMessage(tab.id, {
      type: "furigana:apply-result",
      ok: true,
      data,
      selectionText
    });
  } catch (error) {
    chrome.tabs.sendMessage(tab.id, {
      type: "furigana:apply-result",
      ok: false,
      error: error.message ?? "API request failed."
    });
  }
});
