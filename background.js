const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

async function getApiKey() {
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  return apiKey;
}

async function callDeepSeek(systemPrompt, userText) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("API key not configured. Please set your DeepSeek API key in the extension options.");
  }

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
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

chrome.runtime.onInstalled.addListener(() => {
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
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
});
