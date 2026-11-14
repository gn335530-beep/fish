/* 配額提示：助手暫時無法回覆時顯示，不寫入訊息。 */

import { escapeHtml } from "./html.js";

export function renderAiRetry(notice) {
  return '<div class="fm-chat fm-retry" aria-live="polite">' +
    '<div class="fm-msg fm-msg--other">' +
    '<div class="fm-msg__meta">小幫手</div>' +
    '<div class="fm-msg__bubble">' +
    '<span>' + escapeHtml(notice) + '</span>' +
    '<button type="button" class="fm-retry__button" data-action="ai-retry" ' +
    'aria-label="重試 AI 回覆">重試</button>' +
    '</div></div></div>';
}
