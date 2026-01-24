const DEFAULT_SETTINGS = {
  apiEndpoint: "https://api.example.com/furigana",
  apiKey: "",
  useProxy: true
};

async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "furigana:analyze") {
    return false;
  }

  callFuriganaApi(message.text)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
