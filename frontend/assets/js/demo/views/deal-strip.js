/* 交易房浮動購物車：目前商品、數量控制、移除、選購／加購與發送交易。 */

import { state } from "../store.js";
import { escapeHtml } from "./html.js";
import { canEditDeal, isBuyerOf, isReopenableDeal } from "../deal-state.js";
import { itemSummary } from "./deal-item-text.js";
import { renderProposalPanel } from "./deal-propose.js";
import { renderAddonPanel } from "./deal-addon.js";

function itemBlock(item, editable) {
  const summary = itemSummary(item);
  const quantity = Number(item.quantity || 0);
  const max = summary.remaining;
  const control = editable
    ? '<div class="fm-deal-strip__item-acts">' +
      '<label class="fm-deal-strip__qty">尾數<input type="number" min="1" max="' + max +
      '" step="1" data-item-qty="' + escapeHtml(item.item_id) + '" value="' + quantity +
      '" aria-label="' + escapeHtml(summary.species) + ' 尾數"></label>' +
      '<button type="button" class="fm-deal-strip__remove" data-action="item-remove" data-item="' +
      escapeHtml(item.item_id) + '">移除</button></div>'
    : "";
  return '<div class="fm-deal-strip__row">' +
    '<div class="fm-deal-strip__main">' +
    '<b>' + escapeHtml(summary.species) + '</b>' +
    '<div class="fm-deal-strip__meta">' +
      (summary.condition ? '<span>' + escapeHtml(summary.condition) + '</span>' : "") +
      '<span>數量 ' + quantity + ' 尾</span>' +
      '<span>' + escapeHtml(summary.remainingText) + '</span>' +
      '<span>' + escapeHtml(summary.priceText) + '</span>' +
    "</div></div>" + control +
    "</div>";
}

function actions(items, reinitiate) {
  return '<div class="fm-deal-strip__acts">' +
    (reinitiate ? "" : '<button type="button" data-action="toggle-addon">' +
      (items.length ? "加購" : "選購") + "</button>") +
    '<button type="button" class="fm-deal-strip__primary" data-action="toggle-propose"' +
    (items.length ? "" : " disabled") + '>發送交易</button></div>';
}

export function renderDealStrip() {
  const deal = state.deal;
  const items = (deal && deal.items) || [];
  const editable = canEditDeal(deal, state.user);
  const reinitiate = !editable && isBuyerOf(deal, state.user) &&
    isReopenableDeal(deal) && items.length > 0;

  if (editable && state.proposeOpen) {
    return '<div class="fm-deal-panel">' + renderProposalPanel() + "</div>";
  }
  if (editable && state.addonOpen) {
    return '<div class="fm-deal-panel">' + renderAddonPanel() + "</div>";
  }

  return '<div class="fm-deal-panel">' +
    '<div class="fm-deal-strip">' +
    '<div class="fm-deal-strip__grid">' +
    '<div class="fm-deal-strip__list">' +
    (items.length
      ? items.map(function (item) { return itemBlock(item, editable); }).join("")
      : '<p class="fm-deal-strip__empty">尚未加入商品</p>') +
    "</div>" +
    (editable || reinitiate ? actions(items, reinitiate) : "") +
    "</div>" +
    "</div>" +
    "</div>";
}
