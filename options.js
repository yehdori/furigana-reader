const DEFAULT_SETTINGS = {
  apiEndpoint: "https://api.openai.com/v1/responses",
  apiKey: ""
};

const apiEndpointInput = document.getElementById("api-endpoint");
const apiKeyInput = document.getElementById("api-key");
const status = document.getElementById("status");

async function restore() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  apiEndpointInput.value = stored.apiEndpoint ?? DEFAULT_SETTINGS.apiEndpoint;
  apiKeyInput.value = stored.apiKey ?? "";
}

async function save() {
  await chrome.storage.local.set({
    apiEndpoint: apiEndpointInput.value.trim(),
    apiKey: apiKeyInput.value.trim()
  });

  status.textContent = "Saved.";
  setTimeout(() => {
    status.textContent = "";
  }, 2000);
}

document.getElementById("save").addEventListener("click", (event) => {
  event.preventDefault();
  save();
});

restore();
