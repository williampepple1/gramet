let toolbar = null;
let tooltip = null;
let selectedText = "";
let isProcessing = false;
let mouseupTimer = null;

let panel = null;
let panelVisible = false;
let dragState = { isDragging: false, startX: 0, startY: 0, panelX: 0, panelY: 0 };
let monitoredElement = null;
let typeTimer = null;
let panelBusy = false;
let pendingText = null;

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
      <span id="gp-tooltip-title">Gramet</span>
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

function getPanelEl(id) {
  return panel ? panel.querySelector(`#${id}`) : null;
}

function createPanel() {
  panel = document.createElement("div");
  panel.id = "gramet-panel";
  panel.innerHTML = `
    <div id="gramet-panel-header">
      <span id="gramet-panel-title">Gramet</span>
      <div id="gramet-panel-header-actions">
        <button id="gramet-panel-settings" title="Settings">&#9881;</button>
        <button id="gramet-panel-close" title="Close">&times;</button>
      </div>
    </div>
    <div id="gramet-panel-body">
      <div id="gramet-panel-status">Click a text field and start typing...</div>
      <div class="gp-loading" id="gramet-panel-spinner" style="display:none"><div class="gp-spinner"></div> Checking...</div>
      <div id="gramet-panel-suggestion"></div>
      <div id="gramet-panel-actions">
        <button id="gramet-panel-replace">Replace</button>
        <button id="gramet-panel-dismiss">Dismiss</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  const header = panel.querySelector("#gramet-panel-header");
  header.addEventListener("mousedown", onPanelDragStart);

  panel.querySelector("#gramet-panel-close").addEventListener("click", hidePanel);
  panel.querySelector("#gramet-panel-settings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
  panel.querySelector("#gramet-panel-replace").addEventListener("click", replaceTypedText);
  panel.querySelector("#gramet-panel-dismiss").addEventListener("click", dismissSuggestion);

  panel.style.right = "20px";
  panel.style.top = "100px";
}

function showPanel() {
  if (!panel) createPanel();
  panel.classList.add("visible");
  panelVisible = true;
  startMonitoring();
}

function hidePanel() {
  if (panel) {
    panel.classList.remove("visible");
    panelVisible = false;
    stopMonitoring();
  }
}

function togglePanel() {
  if (panelVisible) {
    hidePanel();
  } else {
    showPanel();
  }
}

function onPanelDragStart(e) {
  if (e.target.closest("button")) return;
  dragState.isDragging = true;
  dragState.startX = e.clientX;
  dragState.startY = e.clientY;
  const rect = panel.getBoundingClientRect();
  dragState.panelX = rect.left;
  dragState.panelY = rect.top;
  document.addEventListener("mousemove", onPanelDragMove);
  document.addEventListener("mouseup", onPanelDragEnd);
  e.preventDefault();
}

function onPanelDragMove(e) {
  if (!dragState.isDragging) return;
  if (!(e.buttons & 1)) { onPanelDragEnd(); return; }
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  panel.style.left = `${Math.max(0, Math.min(dragState.panelX + dx, window.innerWidth - 320))}px`;
  panel.style.top = `${Math.max(0, dragState.panelY + dy)}px`;
  panel.style.right = "auto";
}

function onPanelDragEnd() {
  dragState.isDragging = false;
  document.removeEventListener("mousemove", onPanelDragMove);
  document.removeEventListener("mouseup", onPanelDragEnd);
}

function startMonitoring() {
  document.addEventListener("focusin", onFocusIn, true);
  document.addEventListener("focusout", onFocusOut, true);
  document.addEventListener("input", onInput, true);
  setPanelStatus("Click a text field and start typing...");
}

function stopMonitoring() {
  document.removeEventListener("focusin", onFocusIn, true);
  document.removeEventListener("focusout", onFocusOut, true);
  document.removeEventListener("input", onInput, true);
  if (typeTimer) clearTimeout(typeTimer);
  monitoredElement = null;
  pendingText = null;
}

function isEditable(el) {
  if (!el) return false;
  return el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable;
}

function onFocusIn(e) {
  if (!panelVisible) return;
  if (isEditable(e.target)) {
    monitoredElement = e.target;
    setPanelStatus("Listening...");
  }
}

function onFocusOut(e) {
  if (!panelVisible || !monitoredElement) return;
  if (e.target !== monitoredElement) return;
  if (typeTimer) clearTimeout(typeTimer);
  const text = (monitoredElement.value || monitoredElement.textContent || "").trim();
  if (text.length >= 10 && !panelBusy) {
    checkTyping(text);
  }
}

function onInput(e) {
  if (!panelVisible || !monitoredElement) return;
  if (e.target !== monitoredElement) return;
  if (typeTimer) clearTimeout(typeTimer);

  const text = (monitoredElement.value || monitoredElement.textContent || "").trim();
  const lastChar = text.slice(-1);

  if (text.length >= 10 && (lastChar === "." || lastChar === "?" || lastChar === "!")) {
    typeTimer = setTimeout(() => {
      if (text.length >= 10) checkTyping(text);
    }, 300);
    return;
  }

  if (text.length >= 10) {
    setPanelStatus("Typing...");
  }

  typeTimer = setTimeout(() => {
    const current = (monitoredElement.value || monitoredElement.textContent || "").trim();
    if (current.length >= 10) checkTyping(current);
  }, 600);
}

async function checkTyping(text) {
  if (panelBusy) {
    pendingText = text;
    return;
  }
  panelBusy = true;
  pendingText = null;
  setPanelStatus("Checking...");
  showPanelSpinner(true);

  try {
    const response = await chrome.runtime.sendMessage({
      action: "checkTyping",
      text
    });

    if (response.success) {
      const corrected = response.result.trim();
      const cleanResponses = ["CLEAN", "CLEAN.", "NO ERRORS", "NO ERRORS.", "CORRECT", "CORRECT."];
      if (cleanResponses.includes(corrected.toUpperCase()) || corrected === text) {
        setPanelStatus("No errors found");
        hidePanelSuggestion();
      } else {
        showPanelSuggestion(corrected);
        setPanelStatus("");
      }
    } else {
      hidePanelSuggestion();
      setPanelStatus(response.error || "Check your API key.");
    }
  } catch (err) {
    hidePanelSuggestion();
    setPanelStatus("Connection failed. Reload the page.");
  } finally {
    panelBusy = false;
    showPanelSpinner(false);
    if (pendingText) {
      checkTyping(pendingText);
    }
  }
}

function showPanelSuggestion(text) {
  const el = getPanelEl("gramet-panel-suggestion");
  const actions = getPanelEl("gramet-panel-actions");
  if (el) { el.textContent = text; el.classList.add("show"); }
  if (actions) actions.classList.add("show");
  if (panel) panel.classList.add("has-suggestion");
}

function hidePanelSuggestion() {
  const el = getPanelEl("gramet-panel-suggestion");
  const actions = getPanelEl("gramet-panel-actions");
  if (el) { el.textContent = ""; el.classList.remove("show"); }
  if (actions) actions.classList.remove("show");
  if (panel) panel.classList.remove("has-suggestion");
}

function setPanelStatus(text) {
  const el = getPanelEl("gramet-panel-status");
  if (el) el.textContent = text;
}

function showPanelSpinner(show) {
  const el = getPanelEl("gramet-panel-spinner");
  if (el) el.style.display = show ? "flex" : "none";
}

function replaceTypedText() {
  const suggestionEl = getPanelEl("gramet-panel-suggestion");
  const corrected = suggestionEl ? suggestionEl.textContent : "";
  if (!corrected) return;

  if (monitoredElement && isEditable(monitoredElement)) {
    if (monitoredElement.isContentEditable) {
      monitoredElement.focus();
      const range = document.createRange();
      range.selectNodeContents(monitoredElement);
      range.deleteContents();
      range.insertNode(document.createTextNode(corrected));
    } else {
      monitoredElement.value = corrected;
      monitoredElement.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  dismissSuggestion();
  setPanelStatus("Corrected!");
}

function dismissSuggestion() {
  hidePanelSuggestion();
  if (monitoredElement && isEditable(monitoredElement)) {
    setPanelStatus("Listening...");
  } else {
    setPanelStatus("Click a text field and start typing...");
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
  if (tooltip && !tooltip.contains(e.target) && !(toolbar && toolbar.contains(e.target)) && !(panel && panel.contains(e.target))) {
    hideTooltip();
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "correctGrammar" || request.action === "paraphrase") {
    selectedText = request.text;
    handleAction(request.action);
  }
  if (request.action === "togglePanel") {
    togglePanel();
  }
});

const removalObserver = new MutationObserver(() => {
  if (toolbar && !document.body.contains(toolbar)) {
    toolbar = null;
  }
  if (tooltip && !document.body.contains(tooltip)) {
    tooltip = null;
  }
  if (panel && !document.body.contains(panel)) {
    panel = null;
    panelVisible = false;
    stopMonitoring();
  }
});
removalObserver.observe(document.body, { childList: true });
