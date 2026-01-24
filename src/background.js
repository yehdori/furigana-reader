const DEFAULT_SETTINGS = {
  apiEndpoint: "https://api.openai.com/v1/responses",
  apiKey: ""
};

const CONTEXT_MENU_ID = "furigana-maker";

function isReceivingEndMissing(error) {
  const message = error?.message ?? String(error);
  return message.includes("Receiving end does not exist");
}

async function sendMessageToTab(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch (error) {
    if (isReceivingEndMissing(error)) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["src/content.js"]
        });
        await chrome.tabs.sendMessage(tabId, message);
        return true;
      } catch (injectionError) {
        console.warn(
          "Furigana Reader: unable to inject content script.",
          injectionError
        );
        return false;
      }
    }

    console.warn("Furigana Reader: failed to send message.", error);
    return false;
  }
}

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
              type: "input_text",
              text:
                "You are a Japanese ruby annotator. Return ONLY HTML with <ruby> and <rt> tags. Do not include markdown, code fences, explanations, or extra text. Preserve the original text order and punctuation. Only add ruby for kanji that appear in the input. If a word contains no kanji, leave it as plain text. Preserve line breaks exactly as in the input. If the input already contains <ruby>, preserve it and do not alter those parts."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
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
  const outputText = extractOutputText(data);

  if (!outputText) {
    const refusalText = extractRefusalText(data);
    const errorText =
      typeof data?.error?.message === "string"
        ? data.error.message
        : typeof data?.error === "string"
          ? data.error
          : null;
    throw new Error(
      refusalText ||
        errorText ||
        "API response did not include output text."
    );
  }

  return { html: outputText };
}

function extractOutputText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const outputItem = data?.output?.find((item) => item.type === "message") ??
    data?.output?.[0];
  const contentItems = outputItem?.content ?? [];
  const outputTextItem = contentItems.find(
    (item) => item.type === "output_text" || item.type === "text"
  );

  if (typeof outputTextItem?.text === "string" && outputTextItem.text.trim()) {
    return outputTextItem.text;
  }

  if (typeof contentItems?.[0]?.text === "string" && contentItems[0].text.trim()) {
    return contentItems[0].text;
  }

  const choice = data?.choices?.[0];
  if (
    typeof choice?.message?.content === "string" &&
    choice.message.content.trim()
  ) {
    return choice.message.content;
  }

  if (typeof choice?.text === "string" && choice.text.trim()) {
    return choice.text;
  }

  return "";
}

function extractRefusalText(data) {
  const outputItem = data?.output?.find((item) => item.type === "message") ??
    data?.output?.[0];
  const contentItems = outputItem?.content ?? [];
  const refusalItem = contentItems.find((item) => item.type === "refusal");
  if (typeof refusalItem?.refusal === "string" && refusalItem.refusal.trim()) {
    return refusalItem.refusal;
  }

  return "";
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

  await sendMessageToTab(tab.id, { type: "furigana:cache-selection" });

  const selectionText = info.selectionText?.trim();
  if (!selectionText) {
    await sendMessageToTab(tab.id, {
      type: "furigana:apply-result",
      ok: false,
      error: "No text selected."
    });
    return;
  }

  try {
    const data = await callFuriganaApi(selectionText);
    await sendMessageToTab(tab.id, {
      type: "furigana:apply-result",
      ok: true,
      data,
      selectionText
    });
  } catch (error) {
    await sendMessageToTab(tab.id, {
      type: "furigana:apply-result",
      ok: false,
      error: error.message ?? "API request failed."
    });
  }
});
