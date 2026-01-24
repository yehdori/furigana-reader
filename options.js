const DEFAULT_SETTINGS = {
  apiKey: ""
};

const apiKeyInput = document.getElementById("api-key");
const status = document.getElementById("status");

async function restore() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  apiKeyInput.value = stored.apiKey ?? "";
}

async function save() {
  await chrome.storage.local.set({
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
