/* 協議卡：品項、條件、狀態與同意／退回／取消操作。 */

import { state } from "../store.js";
import { escapeHtml, money, dateTimeOf, definitionRow } from "./html.js";
import { cardStatusForDeal, isActionable, isPendingCard } from "../deal-state.js";
import { cardStatusLabel } from "../deal-labels.js";
import { currentDealFor, displayStatusOf, isCurrentCard } from "./deal-card-state.js";

const CANCEL_REASONS = [
  ["SELLER_OUT_OF_STOCK", "釣客缺貨"],
  ["BUYER_CHANGED_MIND", "買家改變心意"],
  ["TERMS_MISMATCH", "條件不合"],
  ["OTHER", "其他"]
];

function dealCardActions(card, messageId) {
  const deal = currentDealFor(card);
  if (!state.room || state.room.type !== "deal" || !deal) return "";
  if (!isCurrentCard(card, messageId) || !isActionable(deal)) return "";
  const status = displayStatusOf(card, messageId);
  if (!(state.messages || []).length && status !== cardStatusForDeal(deal)) return "";
  const mine = state.user && String(card.initiator_id) === String(state.user.id);
  const dealId = escapeHtml(card.deal_id);
  let html = "";

  if (isPendingCard(status) && !mine) {
    html += '<div class="fm-card__acts">' +
      '<button type="button" class="fm-card__primary" data-action="deal-agree" data-deal="' +
      dealId + '">同意</button>' +
      '<button type="button" data-action="deal-reject" data-deal="' + dealId + '">退回</button>' +
      "</div>";
  }

  const selected = (state.cancelReasons || {})[card.deal_id] || "";
  html += '<div class="fm-card__cancel">' +
    '<select data-cancel-reason="' + dealId + '" aria-label="取消原因">' +
    '<option value=""' + (selected ? "" : " selected") + ">選擇原因…</option>" +
    CANCEL_REASONS.map(function (reason) {
      return '<option value="' + reason[0] + '"' +
        (reason[0] === selected ? " selected" : "") + ">" + reason[1] + "</option>";
    }).join("") +
    "</select>" +
    '<button type="button" data-action="deal-cancel" data-deal="' + dealId + '">取消協議</button>' +
    "</div>";
  return html;
}

export function renderDealCard(card, messageId) {
  const items = card.items || [];
  const status = displayStatusOf(card, messageId);
  return '<div class="fm-card fm-card--deal">' +
    '<div class="fm-card__deal-head"><b>協議</b><span class="fm-card__pill">' +
    escapeHtml(cardStatusLabel(status, "協議")) + '</span></div>' +
    '<ul class="fm-card__deal-items">' + items.map(function (item) {
      return "<li><span>" + escapeHtml(item.title) + " × " + Number(item.quantity || 0) + " 尾</span>" +
        "<span>" + money(Math.round(Number(item.unit_price || 0) * Number(item.quantity || 0))) + "</span></li>";
    }).join("") + "</ul>" +
    '<dl class="fm-card__deal-terms">' +
    definitionRow("整單金額", money(card.final_price)) +
    definitionRow("面交地點", card.meetup_location) +
    definitionRow("面交時間", dateTimeOf(card.meetup_time)) +
    "</dl>" +
    dealCardActions(card, messageId) +
    "</div>";
}
