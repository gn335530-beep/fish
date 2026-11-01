/* 面板內文的套用：輸入中凍結重畫，閒置或失焦後再補畫一次。 */

import { isEditable, shouldHold, IDLE_LIMIT } from "./body-guard.js";

/* 失焦後延後補畫，避免把剛按下的按鈕換掉而吃掉點擊。 */
const FOCUS_RELEASE_DELAY = 120;

export function createBodyRenderer(options) {
  const body = options.body;
  const onRender = options.onRender || function () {};
  let pending = false;
  let forcePending = false;
  let forceNext = false;
  let composing = false;
  let lastActivityAt = 0;
  let idleTimer = null;
  let lastHtml = "";

  function focusedField() {
    const active = document.activeElement;
    if (!active || !body.contains(active)) return null;
    return isEditable(active) ? active : null;
  }

  function clearIdle() {
    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = null;
  }

  function scheduleIdle() {
    clearIdle();
    if (!pending || composing) return;
    const wait = Math.max(0, IDLE_LIMIT - (Date.now() - lastActivityAt)) + 20;
    idleTimer = window.setTimeout(function () {
      idleTimer = null;
      if (!pending || composing) return;
      onRender();
    }, wait);
  }

  function markActivity() {
    lastActivityAt = Date.now();
    if (pending && !composing) scheduleIdle();
  }

  function apply(html) {
    const active = document.activeElement;
    const inside = active && body.contains(active);
    const id = inside ? active.id : "";
    const field = inside ? active.getAttribute("data-field") : "";
    const start = inside && typeof active.selectionStart === "number" ? active.selectionStart : null;
    const end = inside && typeof active.selectionEnd === "number" ? active.selectionEnd : null;

    body.innerHTML = html;
    lastHtml = html;
    pending = false;
    forcePending = false;
    clearIdle();

    if (!inside) return;
    const next = id
      ? document.getElementById(id)
      : body.querySelector('[data-field="' + field + '"]');
    if (!next) return;
    next.focus();
    if (start === null) return;
    try { next.setSelectionRange(start, end); } catch (error) { /* 數字欄位不支援 */ }
  }

  function setBody(html, settings) {
    const force = forceNext || !!(settings && settings.force);
    forceNext = false;
    if (html === lastHtml) {
      pending = false;
      forcePending = false;
      clearIdle();
      return;
    }
    if (composing) {
      pending = true;
      forcePending = forcePending || force;
      return;
    }
    if (force) {
      apply(html);
      return;
    }
    const hold = shouldHold({
      composing: false,
      editable: !!focusedField(),
      idleMs: Date.now() - lastActivityAt
    });
    if (hold) {
      pending = true;
      scheduleIdle();
      return;
    }
    apply(html);
  }

  body.addEventListener("focusin", function (event) {
    if (isEditable(event.target)) markActivity();
  });
  body.addEventListener("input", markActivity);
  body.addEventListener("change", markActivity);
  body.addEventListener("compositionstart", function () {
    composing = true;
  });
  body.addEventListener("compositionend", function () {
    composing = false;
    lastActivityAt = Date.now();
    if (forcePending) {
      forceNext = true;
      window.setTimeout(function () {
        if (!composing) onRender();
      }, 0);
      return;
    }
    scheduleIdle();
  });
  body.addEventListener("focusout", function () {
    window.setTimeout(function () {
      if (composing || focusedField()) return;
      if (pending) onRender();
    }, FOCUS_RELEASE_DELAY);
  });

  return { setBody: setBody };
}
