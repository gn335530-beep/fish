/* 協議卡：魚種、販售數量、最終價格、面交資訊與收件方確認。 */

import { state } from "../store.js";
import { escapeHtml, money, dateTimeOf, definitionRow } from "./html.js";
import { isActionable, isPendingCard, cardStatusTone } from "../deal-state.js";
import { cardStatusLabel } from "../deal-labels.js";
import { currentDealFor, displayStatusOf, isCurrentCard } from "./deal-card-state.js";
import { itemSpecies, totalQuantity } from "./deal-item-text.js";

function statusClass(status) {
  return " fm-card__pill--" + cardStatusTone(status);
}

function dealCardActions(card, messageId) {
  const deal = currentDealFor(card);
  if (!deal || !isCurrentCard(card, messageId) || !isActionable(deal)) return "";
  const status = displayStatusOf(card, messageId);
  if (!isPendingCard(status)) return "";
  const mine = state.user && String(card.initiator_id) === String(state.user.id);
  if (mine) return "";
  return '<div class="fm-card__acts">' +
    '<button type="button" class="fm-card__primary" data-action="deal-agree" data-deal="' +
    escapeHtml(card.deal_id) + '">確認</button></div>';
}

export function renderDealCard(card, messageId) {
  const items = card.items || [];
  const status = displayStatusOf(card, messageId);
  const tails = totalQuantity(items);
  return '<div class="fm-card fm-card--deal">' +
    '<div class="fm-card__deal-head"><b>協議</b><span class="fm-card__pill' + statusClass(status) + '">' +
    escapeHtml(cardStatusLabel(status, "協議")) + '</span></div>' +
    '<ul class="fm-card__deal-items">' + items.map(function (item) {
      return "<li><span>" + escapeHtml(itemSpecies(item)) + "</span></li>";
    }).join("") + "</ul>" +
    '<dl class="fm-card__deal-terms">' +
    definitionRow("販售數量", tails + " 尾") +
    definitionRow("最終價格", money(card.final_price)) +
    definitionRow("面交時間", dateTimeOf(card.meetup_time)) +
    definitionRow("面交地點", card.meetup_location) +
    "</dl>" +
    dealCardActions(card, messageId) +
    "</div>";
}
