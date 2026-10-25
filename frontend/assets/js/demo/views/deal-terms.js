/* 協議表單、條件摘要與狀態說明。 */

import { state } from "../store.js";
import { escapeHtml, money, dateTimeOf } from "./html.js";
import { canResend } from "../deal-state.js";

const STATUS_NOTE = {
  PENDING_REVIEW: "等待對方回覆（30 分鐘內）",
  NEGOTIATING: "協商中，等待對方重新送出",
  CONFIRMED: "雙方已同意，交易成立",
  CANCELLED: "這筆訂單已取消"
};

function mayResend(deal) {
  return canResend(deal, state.user && state.user.id);
}

export function proposalForm() {
  const proposal = state.proposal || {};
  const resend = mayResend(state.deal);
  return '<div class="fm-order__form">' +
    '<label>整單金額<input type="number" min="1" step="1" data-field="final_price" value="' +
    escapeHtml(proposal.final_price) + '"></label>' +
    '<label>面交地點<input type="text" maxlength="100" data-field="meetup_location" value="' +
    escapeHtml(proposal.meetup_location) + '" placeholder="例：基隆火車站南站"></label>' +
    '<label>面交時間<input type="datetime-local" data-field="meetup_time" value="' +
    escapeHtml(proposal.meetup_time) + '"></label>' +
    '<div class="fm-order__acts"><button type="button" data-action="toggle-propose">取消</button>' +
    '<button type="button" class="fm-order__primary" data-action="submit-proposal">' +
    (resend ? "重新送出" : "送出協議") + "</button></div>" +
    "</div>";
}

export function termsBlock(deal) {
  const terms = deal.deal_terms || {};
  return '<dl class="fm-order__terms">' +
    "<div><dt>整單金額</dt><dd>" + money(terms.final_price) + "</dd></div>" +
    "<div><dt>面交地點</dt><dd>" + escapeHtml(terms.meetup_location) + "</dd></div>" +
    "<div><dt>面交時間</dt><dd>" + escapeHtml(dateTimeOf(terms.meetup_time)) + "</dd></div>" +
    "</dl>";
}

export function statusNote(deal) {
  if (deal.deal_status === "NEGOTIATING") {
    return mayResend(deal)
      ? "已退回，可修改條件後重新送出（15 分鐘內）"
      : "協商中，等待對方重新送出";
  }
  return STATUS_NOTE[deal.deal_status] || "";
}
