/* 協議卡：魚種、販售數量、最終價格、面交資訊與收件方確認。 */

import { state } from "../store.js";
import { escapeHtml, money, dateTimeOf, definitionRow } from "./html.js";
import { isActionable, isPendingCard, cardStatusTone } from "../deal-state.js";
import { cardStatusLabel } from "../deal-labels.js";
import { currentDealFor, displayStatusOf, isCurrentCard } from "./deal-card-state.js";
import { itemSpecies, totalQuantity } from "./deal-item-text.js";
import { renderCancelConfirmCard } from "./deal-cancel-card.js";

function statusClass(status) {
  return " fm-card__pill--" + cardStatusTone(status);
}

function canRespond(card, messageId) {
  const deal = currentDealFor(card);
  if (!deal || !isCurrentCard(card, messageId) || !isActionable(deal)) return false;
  const status = displayStatusOf(card, messageId);
  if (!isPendingCard(status)) return false;
  return !(state.user && String(card.initiator_id) === String(state.user.id));
}

function dealCardActions(card, messageId) {
  if (!canRespond(card, messageId)) return "";
  const dealId = escapeHtml(card.deal_id);
  return '<div class="fm-card__acts">' +
    '<button type="button" data-action="deal-cancel-open" data-deal="' + dealId + '">取消</button>' +
    '<button type="button" class="fm-card__primary" data-action="deal-agree" data-deal="' +
    dealId + '">確認</button></div>';
}

function speciesList(items) {
  const names = items.map(itemSpecies).filter(Boolean);
  if (!names.length) return "<b>交易品項</b>";
  return names.map(function (name) {
    return "<b>" + escapeHtml(name) + "</b>";
  }).join("");
}

function priceRow(card) {
  return '<div class="fm-card__deal-price"><dt>最終價格</dt><dd><b>' +
    escapeHtml(money(card.final_price)) + "</b></dd></div>";
}

export function renderDealCard(card, messageId) {
  if (state.cancelOpen === String(card.deal_id) && canRespond(card, messageId)) {
    return renderCancelConfirmCard(card);
  }
  const items = card.items || [];
  const status = displayStatusOf(card, messageId);
  return '<div class="fm-card fm-card--deal">' +
    '<span class="fm-card__deal-kicker">協議</span>' +
    '<div class="fm-card__deal-top">' +
    '<div class="fm-card__deal-species">' + speciesList(items) + "</div>" +
    '<span class="fm-card__pill' + statusClass(status) + '">' +
    escapeHtml(cardStatusLabel(status, "協議")) + "</span>" +
    "</div>" +
    '<dl class="fm-card__deal-terms">' +
    definitionRow("販售數量", totalQuantity(items) + " 尾") +
    priceRow(card) +
    definitionRow("面交時間", dateTimeOf(card.meetup_time)) +
    definitionRow("面交地點", card.meetup_location) +
    "</dl>" +
    dealCardActions(card, messageId) +
    "</div>";
}
