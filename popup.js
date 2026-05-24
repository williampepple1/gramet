document.addEventListener("DOMContentLoaded", async () => {
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  const badge = document.getElementById("configBadge");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  if (!apiKey) {
    badge.style.display = "block";
    statusDot.classList.add("disabled");
    statusText.textContent = "Not configured";
  } else {
    statusText.textContent = "Ready";
  }

  document.getElementById("openOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById("openOptionsLink").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  async function sendToActiveTab(action) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    chrome.tabs.sendMessage(tab.id, { action });
  }

  document.getElementById("correctBtn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const sel = window.getSelection().toString().trim();
          return sel;
        }
      }).then(([result]) => {
        if (result.result) {
          chrome.tabs.sendMessage(tab.id, { action: "correctGrammar", text: result.result });
        } else {
          alert("Select text on the page first.");
        }
      });
    });
  });

  document.getElementById("paraphraseBtn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString().trim()
      }).then(([result]) => {
        if (result.result) {
          chrome.tabs.sendMessage(tab.id, { action: "paraphrase", text: result.result });
        } else {
          alert("Select text on the page first.");
        }
      });
    });
  });
});
