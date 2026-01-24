const DEFAULT_SETTINGS = {
  apiEndpoint: "https://api.openai.com/v1/responses",
  apiKey: ""
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

  if (!settings.apiKey) {
    throw new Error("API key is required.");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${settings.apiKey}`
  };

  const response = await fetch(settings.apiEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text:
                "You are a Japanese ruby annotator. Return ONLY HTML with <ruby> and <rt> tags. Do not include markdown, code fences, explanations, or extra text. Preserve the original text order and punctuation. Only add ruby for kanji that appear in the input. If a word contains no kanji, leave it as plain text. Preserve line breaks exactly as in the input. If the input already contains <ruby>, preserve it and do not alter those parts."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Add furigana (ruby tags) to the following Japanese text. Output ONLY HTML with <ruby> and <rt> tags, no extra commentary.\n\nText:\n${text}`
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "API request failed.");
  }

  const data = await response.json();
  const outputText =
    typeof data.output_text === "string"
      ? data.output_text
      : data.output?.[0]?.content?.find((item) => item.type === "output_text")
          ?.text ??
        data.output?.[0]?.content?.[0]?.text;

  if (!outputText) {
    throw new Error("API response did not include output text.");
  }

  return { html: outputText };
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
