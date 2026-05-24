# Gramet

AI-powered grammar correction and paraphrasing Chrome extension using the DeepSeek API. Select text on any webpage and fix grammar, spelling, and punctuation errors — or rewrite text for clarity and flow.

## Features

- **Grammar Correction** — Fixes grammar, spelling, and punctuation in selected text
- **Paraphrasing** — Rewrites text to improve clarity, flow, and word choice
- **Inline Toolbar** — Floating toolbar appears automatically when you select text
- **Right-Click Menu** — Access correction and paraphrasing from the context menu
- **Popup Controls** — Quick access via the extension toolbar icon
- **Inline Replacement** — Replace text directly in inputs, textareas, and contentEditable fields

## Installation

1. Clone or download this repository
2. Get a DeepSeek API key from [platform.deepseek.com](https://platform.deepseek.com/api_keys)
3. Open Chrome and navigate to `chrome://extensions`
4. Enable **Developer mode** (toggle in the top-right corner)
5. Click **Load unpacked** and select the project folder
6. Click the extension icon, open **Settings**, and enter your API key

## Usage

### Inline Toolbar
1. Select text on any webpage
2. A floating toolbar appears near your selection
3. Click **Correct** to fix grammar or **Paraphrase** to rewrite
4. View the result in the tooltip — click **Replace** to apply or **Copy** to clipboard

### Right-Click Menu
1. Select text on any webpage
2. Right-click and choose **Correct Grammar** or **Paraphrase**

### Extension Popup
1. Click the Gramet icon in the toolbar
2. Ensure text is selected on the current page
3. Click **Correct Grammar** or **Paraphrase**

## Project Structure

| File | Purpose |
|---|---|
| `manifest.json` | Chrome extension manifest (Manifest V3) |
| `background.js` | Service worker — API calls, context menu setup, message routing |
| `content.js` | Content script — floating toolbar, tooltip, text replacement |
| `popup.html` / `popup.js` | Extension popup UI |
| `options.html` / `options.js` | Settings page — API key management and connection test |
| `styles.css` | Styles for the injected toolbar and tooltip |
| `icons/` | Extension icons (16, 48, 128 px) |

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Save API key locally |
| `activeTab` | Access the current tab for text selection |
| `contextMenus` | Right-click menu items |
| `scripting` | Execute scripts to read selected text from the popup |
| `https://api.deepseek.com/*` | Communicate with the DeepSeek API |

## Privacy

Your API key is stored in Chrome's local storage and is only sent to the DeepSeek API. No data is collected, logged, or sent to any third party.

## License

MIT
