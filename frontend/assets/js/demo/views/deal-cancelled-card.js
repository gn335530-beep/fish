/* 取消訊息卡：雙方都看得到的取消原因紀錄。 */

import { escapeHtml } from "./html.js";

export function renderDealCancelledCard(card) {
  return '<div class="fm-card fm-card--cancelled">' +
    '<span class="fm-card__cancel-title">協議已被取消</span>' +
    '<div class="fm-card__cancel-reason">' +
    "<span>取消原因</span>" +
    "<p>" + escapeHtml(card.note || "未填寫") + "</p>" +
    "</div>" +
    "</div>";
}
