const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

async function getApiKey() {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  return apiKey;
}

async function callDeepSeek(systemPrompt, userText) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("API key not configured. Please set your DeepSeek API key in the extension options.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText }
        ],
        temperature: 0.3,
        max_tokens: 2048
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`API error (${response.status}). Please check your API key and try again.`);
      } else if (response.status === 429) {
        throw new Error("Rate limited by DeepSeek. Please wait a moment and try again.");
      } else {
        throw new Error(`API error (${response.status}). DeepSeek service may be experiencing issues.`);
      }
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Unexpected API response format.");
    }
    return content;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "correctGrammar",
      title: "Correct Grammar",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "paraphrase",
      title: "Paraphrase",
      contexts: ["selection"]
    });
  });
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { action: "togglePanel" }).catch(() => {});
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, {
    action: info.menuItemId,
    text: info.selectionText
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "correctGrammar") {
    const systemPrompt = `You are a professional English grammar and spelling corrector. Correct any grammar, spelling, and punctuation errors in the given text. Return ONLY the corrected text without any explanations, markdown, or formatting. Preserve the original meaning and tone as much as possible.`;
    callDeepSeek(systemPrompt, request.text)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "paraphrase") {
    const systemPrompt = `You are a professional paraphrasing assistant. Rewrite the given text to improve clarity, flow, and word choice while preserving the original meaning. Make it sound more natural and professional. Return ONLY the paraphrased text without any explanations, markdown, or formatting.`;
    callDeepSeek(systemPrompt, request.text)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === "checkTyping") {
    const systemPrompt = `You are an English grammar and spelling corrector. If the text has NO errors, reply with the exact word "CLEAN". If there are errors, return ONLY the fully corrected version of the text without any explanations, markdown, or formatting.`;
    callDeepSeek(systemPrompt, request.text)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
