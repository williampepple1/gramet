const apiKeyInput = document.getElementById("apiKey");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const msg = document.getElementById("msg");
const testBtn = document.getElementById("testBtn");
const testInput = document.getElementById("testInput");
const testResult = document.getElementById("testResult");

function showMsg(text, type) {
  msg.className = `msg ${type}`;
  msg.textContent = text;
  msg.style.display = "block";
  setTimeout(() => { msg.style.display = "none"; }, 3000);
}

function showTestResult(text, type) {
  testResult.className = `msg ${type}`;
  testResult.textContent = text;
  testResult.style.display = "block";
}

chrome.storage.local.get("apiKey", (data) => {
  if (data.apiKey) {
    apiKeyInput.value = data.apiKey;
  }
});

saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showMsg("Please enter an API key.", "error");
    return;
  }
  if (!key.startsWith("sk-")) {
    showMsg("Invalid key format. DeepSeek keys start with 'sk-'.", "error");
    return;
  }
  chrome.storage.local.set({ apiKey: key }, () => {
    showMsg("API key saved successfully!", "success");
  });
});

clearBtn.addEventListener("click", () => {
  chrome.storage.local.remove("apiKey", () => {
    apiKeyInput.value = "";
    showMsg("API key cleared.", "success");
  });
});

testBtn.addEventListener("click", async () => {
  const text = testInput.value.trim() || "She dont like coffee.";
  const key = apiKeyInput.value.trim();
  if (!key) {
    showTestResult("Save an API key first.", "error");
    return;
  }
  showTestResult("", "");
  testResult.innerHTML = '<span style="color:#888">⏳ Connecting...</span>';
  testResult.style.display = "block";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "Fix the grammar. Return ONLY the corrected text." },
          { role: "user", content: text }
        ],
        temperature: 0,
        max_tokens: 256
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      showTestResult(`Error (${res.status}). Please check your API key and try again.`, "error");
      return;
    }
    const data = await res.json();
    const corrected = data?.choices?.[0]?.message?.content;
    if (!corrected) {
      showTestResult("Unexpected API response format.", "error");
      return;
    }
    showTestResult(`✅ Original: "${text}"\n✅ Corrected: "${corrected}"`, "success");
  } catch (err) {
    if (err.name === "AbortError") {
      showTestResult("Request timed out. Please try again.", "error");
    } else {
      showTestResult(`Connection failed: ${err.message}`, "error");
    }
  }
});
