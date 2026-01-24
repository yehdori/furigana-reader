const DEFAULT_SETTINGS = {
  apiEndpoint: "https://api.example.com/furigana",
  apiKey: "",
  useProxy: true
};

const endpointInput = document.getElementById("api-endpoint");
const apiKeyInput = document.getElementById("api-key");
const useProxyInput = document.getElementById("use-proxy");
const status = document.getElementById("status");

async function restore() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  endpointInput.value = stored.apiEndpoint ?? DEFAULT_SETTINGS.apiEndpoint;
  apiKeyInput.value = stored.apiKey ?? "";
  useProxyInput.checked = stored.useProxy ?? true;
}

async function save() {
  await chrome.storage.local.set({
    apiEndpoint: endpointInput.value.trim(),
    apiKey: apiKeyInput.value.trim(),
    useProxy: useProxyInput.checked
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
