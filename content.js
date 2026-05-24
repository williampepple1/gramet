let toolbar = null;
let tooltip = null;
let selectedText = "";
let isProcessing = false;

function createToolbar() {
  toolbar = document.createElement("div");
  toolbar.id = "grammar-pro-toolbar";
  toolbar.innerHTML = `
    <button id="gp-correct" title="Correct Grammar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      Correct
    </button>
    <button id="gp-paraphrase" title="Paraphrase">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l6-6-6-6"/><path d="M12 19h8"/></svg>
      Paraphrase
    </button>
  `;
  document.body.appendChild(toolbar);

  document.getElementById("gp-correct").addEventListener("click", () => handleAction("correctGrammar"));
  document.getElementById("gp-paraphrase").addEventListener("click", () => handleAction("paraphrase"));
}

function createTooltip() {
  tooltip = document.createElement("div");
  tooltip.id = "grammar-pro-tooltip";
  tooltip.innerHTML = `
    <div id="gp-tooltip-header">
      <span id="gp-tooltip-title">Grammar Pro</span>
      <button id="gp-tooltip-close">&times;</button>
    </div>
    <div id="gp-tooltip-content"></div>
    <div id="gp-tooltip-actions">
      <button id="gp-apply">Replace</button>
      <button id="gp-copy">Copy</button>
    </div>
  `;
  document.body.appendChild(tooltip);

  document.getElementById("gp-tooltip-close").addEventListener("click", hideTooltip);
  document.getElementById("gp-apply").addEventListener("click", applyToText);
  document.getElementById("gp-copy").addEventListener("click", copyResult);
}

function showToolbar(x, y) {
  if (!toolbar) createToolbar();
  toolbar.style.left = `${x}px`;
  toolbar.style.top = `${y + 10}px`;
  toolbar.classList.add("visible");
}

function hideToolbar() {
  if (toolbar) toolbar.classList.remove("visible");
}

function showTooltip() {
  if (!tooltip) createTooltip();
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;

  const top = rect.bottom + scrollY + 8;
  const left = rect.left + scrollX;

  tooltip.style.left = `${Math.max(10, Math.min(left, window.innerWidth + scrollX - 360))}px`;
  tooltip.style.top = `${top}px`;
  tooltip.classList.add("visible");
}

function hideTooltip() {
  if (tooltip) {
    tooltip.classList.remove("visible");
    document.getElementById("gp-tooltip-content").textContent = "";
  }
}

function showLoading() {
  const content = document.getElementById("gp-tooltip-content");
  content.innerHTML = '<div class="gp-loading"><div class="gp-spinner"></div> Processing...</div>';
}

function showResult(text) {
  const content = document.getElementById("gp-tooltip-content");
  content.textContent = text;
}

function showError(msg) {
  const content = document.getElementById("gp-tooltip-content");
  content.innerHTML = `<div class="gp-error">${msg}</div>`;
}

async function handleAction(action) {
  if (isProcessing) return;
  isProcessing = true;
  hideToolbar();
  showTooltip();
  showLoading();
  document.getElementById("gp-tooltip-title").textContent =
    action === "correctGrammar" ? "Corrected Text" : "Paraphrased Text";

  try {
    const response = await chrome.runtime.sendMessage({
      action,
      text: selectedText
    });

    if (response.success) {
      showResult(response.result);
    } else {
      showError(response.error || "Something went wrong. Check your API key in settings.");
    }
  } catch (err) {
    showError("Failed to reach extension. Reload the page.");
  } finally {
    isProcessing = false;
  }
}

function applyToText() {
  const result = document.getElementById("gp-tooltip-content").textContent;
  if (!result) return;

  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT" ||
      activeEl.isContentEditable)) {
    if (activeEl.isContentEditable) {
      activeEl.focus();
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, result);
    } else {
      const start = activeEl.selectionStart;
      const end = activeEl.selectionEnd;
      activeEl.value = activeEl.value.substring(0, start) + result + activeEl.value.substring(end);
      activeEl.selectionStart = activeEl.selectionEnd = start + result.length;
    }
  } else {
    replaceSelectionText(result);
  }
  hideTooltip();
}

function replaceSelectionText(replacement) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(replacement));
  selection.removeAllRanges();
}

function copyResult() {
  const text = document.getElementById("gp-tooltip-content").textContent;
  if (text) {
    navigator.clipboard.writeText(text).catch(() => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    });
  }
}

document.addEventListener("mouseup", (e) => {
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 1) {
      selectedText = text;
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      showToolbar(rect.left + scrollX, rect.top + scrollY);
    } else {
      hideToolbar();
    }
  }, 10);
});

document.addEventListener("mousedown", (e) => {
  if (tooltip && !tooltip.contains(e.target) && !(toolbar && toolbar.contains(e.target))) {
    hideTooltip();
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "correctGrammar" || request.action === "paraphrase") {
    selectedText = request.text;
    handleAction(request.action);
  }
});
