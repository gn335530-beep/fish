/* 面板外殼：掛載、開關、視圖切換、未讀與尺寸。 */

import { createBodyRenderer } from "./body-render.js";
import { shellHtml } from "./panel-shell.js";
import { initVoice } from "../voice.js";
import { handleMarketWeightInput, handleMarketUnitChange } from "./market-card.js";

let refs = null;
let handlers = {};
let api = null;
let bodyRenderer = null;

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
  setBody: function (html, options) {
    if (bodyRenderer) bodyRenderer.setBody(html, options);
  },
  setFooter: function (visible) { refs.form.hidden = !visible; },
  setHeader: function (title, subHtml) {
    refs.title.textContent = title;
    refs.sub.innerHTML = subHtml || "";
    refs.sub.hidden = !subHtml;
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
  /* 以批次第一則為錨點：整批放得下就滾到底，放不下就把第一則對齊頂端。 */
  scrollToStart: function (seq) {
    const body = refs.body;
    const node = body.querySelector('[data-seq="' + String(seq) + '"]');
    if (!node) {
      body.scrollTop = body.scrollHeight;
      return;
    }
    const offset = node.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
    if (body.scrollHeight - offset <= body.clientHeight) {
      body.scrollTop = body.scrollHeight;
    } else {
      body.scrollTop = Math.max(0, offset - 8);
    }
  },
  openFilePicker: function () { refs.file.click(); }
};

export function mountPanel(options) {
  if (document.getElementById("fm-bot")) return api;

  handlers = options || {};
  const wrapper = document.createElement("div");
  wrapper.id = "fm-bot";
  wrapper.className = "fm-bot";
  wrapper.innerHTML = shellHtml();
  document.body.appendChild(wrapper);

  refs = {
    panel: document.getElementById("fm-panel"),
    body: document.getElementById("fm-body"),
    form: document.getElementById("fm-form"),
    input: document.getElementById("fm-input"),
    file: document.getElementById("fm-file"),
    toggle: document.getElementById("fm-toggle"),
    badge: document.getElementById("fm-badge"),
    title: document.getElementById("fm-title"),
    sub: document.getElementById("fm-sub"),
    voice: document.getElementById("fm-voice")
  };

  bodyRenderer = createBodyRenderer({ body: refs.body, onRender: handlers.onRender });
  initVoice({
    button: refs.voice,
    input: refs.input,
    onError: function (message) {
      if (handlers.onVoiceError) handlers.onVoiceError(message);
    }
  });

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
  refs.body.addEventListener("input", function (event) {
    const market = event.target.closest("[data-market-weight]");
    if (market) handleMarketWeightInput(market);
    const field = event.target.closest("[data-field]");
    if (field && handlers.onInput) handlers.onInput(field.dataset.field, field.value);
    const review = event.target.closest("[data-review-deal]");
    const comment = event.target.closest("[data-review-comment]");
    if (review && comment && handlers.onReviewComment) {
      handlers.onReviewComment(review.dataset.reviewDeal, comment.value);
    }
  });
  refs.body.addEventListener("change", function (event) {
    const unit = event.target.closest("[data-market-unit]");
    if (unit) {
      handleMarketUnitChange(unit);
      return;
    }
    const addon = event.target.closest("[data-addon-qty]");
    if (addon && handlers.onSelect) handlers.onSelect(addon.dataset.addonQty, addon.value);
    const reason = event.target.closest("[data-cancel-reason]");
    if (reason && handlers.onReason) handlers.onReason(reason.dataset.cancelReason, reason.value);
    const review = event.target.closest("[data-review-deal]");
    if (!review) return;
    const field = event.target.closest("[data-review-field]");
    if (field && handlers.onReviewField) {
      handlers.onReviewField(review.dataset.reviewDeal, field.dataset.reviewField, field.value);
    }
    const tag = event.target.closest("[data-review-tag]");
    if (tag && handlers.onReviewTag) {
      handlers.onReviewTag(review.dataset.reviewDeal, tag.dataset.reviewTag, tag.checked);
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && api.isOpen()) api.close();
  });

  return api;
}
