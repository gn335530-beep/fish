/* 面板外殼：掛載、開關、視圖切換、未讀與尺寸。 */

const SHELL = "" +
  '<section class="fm-panel" id="fm-panel" hidden aria-label="一支釣小幫手">' +
  '  <header class="fm-panel__head">' +
  '    <span class="fm-panel__avatar" aria-hidden="true">魚</span>' +
  '    <div class="fm-panel__title"><b>一支釣小幫手 <em class="fm-build">v3</em></b><span id="fm-status">找魚・上架・交易</span></div>' +
  '    <button type="button" class="fm-icon" data-action="inbox" aria-label="收件匣" title="收件匣">☰</button>' +
  '    <button type="button" class="fm-icon" data-action="minimize" aria-label="縮小" title="縮小">─</button>' +
  '    <button type="button" class="fm-icon" data-action="close" aria-label="關閉" title="關閉">✕</button>' +
  '  </header>' +
  '  <div class="fm-panel__body" id="fm-body" aria-live="polite"></div>' +
  '  <form class="fm-panel__foot" id="fm-form">' +
  '    <button type="button" class="fm-attach" data-action="photo" aria-label="上傳照片" title="上傳照片">📷</button>' +
  '    <input type="text" id="fm-input" placeholder="輸入訊息…" autocomplete="off" maxlength="500" aria-label="訊息">' +
  '    <button type="submit" class="fm-send">送出</button>' +
  '  </form>' +
  '</section>' +
  '<input type="file" id="fm-file" accept="image/*" hidden>' +
  '<button type="button" class="fm-toggle" id="fm-toggle" aria-expanded="false" aria-controls="fm-panel" aria-label="開啟小幫手">' +
  '  <span class="fm-toggle__mark" aria-hidden="true">✦</span>' +
  '  <span class="fm-toggle__badge" id="fm-badge" hidden>0</span>' +
  '</button>';

let refs = null;
let handlers = {};
let api = null;

function setOpen(open) {
  refs.panel.hidden = !open;
  refs.toggle.setAttribute("aria-expanded", String(open));
  refs.toggle.setAttribute("aria-label", open ? "關閉小幫手" : "開啟小幫手");
  if (open) {
    refs.input.focus();
    api.scrollToEnd(true);
  }
}

api = {
  open: function () {
    setOpen(true);
    if (handlers.onOpen) handlers.onOpen();
  },
  close: function () { setOpen(false); },
  toggle: function () {
    const next = refs.panel.hidden;
    setOpen(next);
    if (next && handlers.onOpen) handlers.onOpen();
  },
  isOpen: function () { return !refs.panel.hidden; },
  setBody: function (html) { refs.body.innerHTML = html; },
  setStatus: function (text) { refs.status.textContent = text; },
  setFooter: function (visible) { refs.form.hidden = !visible; },
  setView: function (view) {
    refs.panel.classList.toggle("fm-panel--wide", view === "deal");
  },
  setBadge: function (count) {
    const value = Number(count) || 0;
    refs.badge.hidden = value <= 0;
    refs.badge.textContent = value > 99 ? "99+" : String(value);
  },
  scrollToEnd: function (force) {
    const body = refs.body;
    const nearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
    if (force || nearBottom) body.scrollTop = body.scrollHeight;
  },
  openFilePicker: function () { refs.file.click(); }
};

export function mountPanel(options) {
  if (document.getElementById("fm-bot")) return api;

  handlers = options || {};
  const wrapper = document.createElement("div");
  wrapper.id = "fm-bot";
  wrapper.className = "fm-bot";
  wrapper.innerHTML = SHELL;
  document.body.appendChild(wrapper);

  refs = {
    panel: document.getElementById("fm-panel"),
    body: document.getElementById("fm-body"),
    form: document.getElementById("fm-form"),
    input: document.getElementById("fm-input"),
    file: document.getElementById("fm-file"),
    toggle: document.getElementById("fm-toggle"),
    badge: document.getElementById("fm-badge"),
    status: document.getElementById("fm-status")
  };

  refs.toggle.addEventListener("click", function () { api.toggle(); });
  refs.file.addEventListener("change", function () {
    const file = refs.file.files && refs.file.files[0];
    refs.file.value = "";
    if (file && handlers.onPhoto) handlers.onPhoto(file);
  });
  refs.form.addEventListener("submit", function (event) {
    event.preventDefault();
    const text = refs.input.value.trim();
    if (!text) return;
    refs.input.value = "";
    handlers.onSubmit(text);
  });
  refs.panel.addEventListener("click", function (event) {
    const node = event.target.closest("[data-action]");
    if (!node) return;
    handlers.onAction(node.dataset.action, node.dataset);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && api.isOpen()) api.close();
  });

  return api;
}
