/* 協議表單、條件摘要與狀態說明。 */

import { state } from "../store.js";
import { escapeHtml, money, dateTimeOf, definitionRow } from "./html.js";
import { canResend, isNegotiating } from "../deal-state.js";
import { dealStatusNote } from "../deal-labels.js";

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
    definitionRow("整單金額", money(terms.final_price)) +
    definitionRow("面交地點", terms.meetup_location) +
    definitionRow("面交時間", dateTimeOf(terms.meetup_time)) +
    "</dl>";
}

export function statusNote(deal) {
  if (isNegotiating(deal)) {
    return mayResend(deal)
      ? "已退回，可修改條件後重新送出（15 分鐘內）"
      : dealStatusNote(deal.deal_status);
  }
  return dealStatusNote(deal.deal_status);
}
