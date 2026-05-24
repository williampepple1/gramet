document.addEventListener("DOMContentLoaded", async () => {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  const badge = document.getElementById("configBadge");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const correctBtn = document.getElementById("correctBtn");
  const paraphraseBtn = document.getElementById("paraphraseBtn");

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

  function showToast(text, isError) {
    const existing = document.querySelector(".gp-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "gp-toast";
    toast.style.cssText = "position:fixed;bottom:12px;left:12px;right:12px;padding:8px 12px;border-radius:6px;font-size:12px;text-align:center;z-index:9999;" +
      (isError ? "background:#fbe9e7;color:#c62828;" : "background:#e8f5e9;color:#2e7d32;");
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  async function handlePopupAction(action, btn) {
    btn.disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString().trim()
      });
      if (result?.result) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action, text: result.result });
        } catch (sendErr) {
          showToast("Couldn't reach the page. Try reloading it.", true);
        }
      } else {
        showToast("Select some text on the page first.", true);
      }
    } catch (err) {
      showToast("This page doesn't support text selection via the extension.", true);
    } finally {
      btn.disabled = false;
    }
  }

  correctBtn.addEventListener("click", () => handlePopupAction("correctGrammar", correctBtn));
  paraphraseBtn.addEventListener("click", () => handlePopupAction("paraphrase", paraphraseBtn));
});
