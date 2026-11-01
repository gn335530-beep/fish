/* 取消訊息卡：雙方都看得到的取消原因紀錄。 */

import { escapeHtml, definitionRow } from "./html.js";

export function renderDealCancelledCard(card) {
  return '<div class="fm-card fm-card--cancelled">' +
    '<div class="fm-card__deal-head"><b>協議已被取消</b></div>' +
    '<dl class="fm-card__deal-terms">' +
    definitionRow("取消原因", card.note || "未填寫") +
    '</dl>' +
    '</div>';
}
