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

chrome.storage.sync.get("apiKey", (data) => {
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
  chrome.storage.sync.set({ apiKey: key }, () => {
    showMsg("API key saved successfully!", "success");
  });
});

clearBtn.addEventListener("click", () => {
  chrome.storage.sync.remove("apiKey", () => {
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
  showTestResult("Testing...", "");
  testResult.className = "msg";
  testResult.innerHTML = '<span style="color:#888">⏳ Connecting...</span>';
  testResult.style.display = "block";

  try {
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
      })
    });
    if (!res.ok) {
      const err = await res.text();
      showTestResult(`Error (${res.status}): ${err.slice(0, 200)}`, "error");
      return;
    }
    const data = await res.json();
    const corrected = data.choices[0].message.content;
    showTestResult(`✅ Original: "${text}"\n✅ Corrected: "${corrected}"`, "success");
  } catch (err) {
    showTestResult(`Connection failed: ${err.message}`, "error");
  }
});
