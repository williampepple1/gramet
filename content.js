let toolbar = null;
let tooltip = null;
let selectedText = "";
let isProcessing = false;
let mouseupTimer = null;

function getEl(id) {
  return tooltip ? tooltip.querySelector(`#${id}`) : null;
}

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

  toolbar.querySelector("#gp-correct").addEventListener("click", () => handleAction("correctGrammar"));
  toolbar.querySelector("#gp-paraphrase").addEventListener("click", () => handleAction("paraphrase"));
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

  tooltip.querySelector("#gp-tooltip-close").addEventListener("click", hideTooltip);
  tooltip.querySelector("#gp-apply").addEventListener("click", applyToText);
  tooltip.querySelector("#gp-copy").addEventListener("click", copyResult);
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

  const top = rect.bottom + 8;
  const left = rect.left;

  tooltip.style.left = `${Math.max(10, Math.min(left, window.innerWidth - 360))}px`;
  tooltip.style.top = `${Math.min(top, window.innerHeight - 280)}px`;
  tooltip.classList.add("visible");
}

function hideTooltip() {
  if (tooltip) {
    tooltip.classList.remove("visible");
    const content = getEl("gp-tooltip-content");
    if (content) content.textContent = "";
  }
}

function showLoading() {
  const content = getEl("gp-tooltip-content");
  if (content) content.innerHTML = '<div class="gp-loading"><div class="gp-spinner"></div> Processing...</div>';
}

function showResult(text) {
  const content = getEl("gp-tooltip-content");
  if (content) content.textContent = text;
}

function showError(msg) {
  const content = getEl("gp-tooltip-content");
  if (content) {
    const div = document.createElement("div");
    div.className = "gp-error";
    div.textContent = msg;
    content.replaceChildren(div);
  }
}

async function handleAction(action) {
  if (isProcessing) return;
  if (selectedText.length > 8000) {
    showError("Selected text is too long. Please select a shorter portion.");
    return;
  }
  isProcessing = true;
  hideToolbar();
  showTooltip();
  showLoading();
  const titleEl = getEl("gp-tooltip-title");
  if (titleEl) {
    titleEl.textContent =
      action === "correctGrammar" ? "Corrected Text" : "Paraphrased Text";
  }

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
  const contentEl = getEl("gp-tooltip-content");
  const result = contentEl ? contentEl.textContent : "";
  if (!result) return;

  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === "TEXTAREA" || activeEl.tagName === "INPUT" ||
      activeEl.isContentEditable)) {
    if (activeEl.isContentEditable) {
      activeEl.focus();
      const sel = window.getSelection();
      if (sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(result));
      }
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
  const contentEl = getEl("gp-tooltip-content");
  const text = contentEl ? contentEl.textContent : "";
  if (text) {
    navigator.clipboard.writeText(text).catch(() => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    });
  }
}

document.addEventListener("mouseup", (e) => {
  if (mouseupTimer) clearTimeout(mouseupTimer);
  mouseupTimer = setTimeout(() => {
    if (isProcessing) return;
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 1) {
      selectedText = text;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const x = Math.max(5, Math.min(rect.left, window.innerWidth - 180));
      const y = Math.max(5, rect.top - 40);
      showToolbar(x, y);
    } else {
      hideToolbar();
    }
  }, 150);
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

const removalObserver = new MutationObserver(() => {
  if (toolbar && !document.body.contains(toolbar)) {
    toolbar = null;
  }
  if (tooltip && !document.body.contains(tooltip)) {
    tooltip = null;
  }
});
removalObserver.observe(document.body, { childList: true });
