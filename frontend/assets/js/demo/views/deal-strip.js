/* 交易房浮動商品條：目前商品、加購與發送交易入口。 */

import { state } from "../store.js";
import { escapeHtml } from "./html.js";
import { canEditDeal, isBuyerOf, isReopenableDeal } from "../deal-state.js";
import { itemSummary } from "./deal-item-text.js";
import { renderProposalPanel } from "./deal-propose.js";
import { renderAddonPanel } from "./deal-addon.js";

function itemBlock(item) {
  const summary = itemSummary(item);
  return '<div class="fm-deal-strip__row">' +
    '<b>' + escapeHtml(summary.species) + '</b>' +
    '<div class="fm-deal-strip__meta">' +
      (summary.condition ? '<span>' + escapeHtml(summary.condition) + '</span>' : '') +
      '<span>' + escapeHtml(summary.remainingText) + '</span>' +
      '<span>' + escapeHtml(summary.priceText) + '</span>' +
    '</div>' +
    '</div>';
}

function actions(items, reinitiate) {
  return '<div class="fm-deal-strip__acts">' +
    (reinitiate ? "" : '<button type="button" data-action="toggle-addon">加購</button>') +
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
    return '<div class="fm-deal-panel">' + renderProposalPanel() + '</div>';
  }
  if (editable && state.addonOpen) {
    return '<div class="fm-deal-panel">' + renderAddonPanel() + '</div>';
  }

  return '<div class="fm-deal-panel">' +
    '<div class="fm-deal-strip">' +
    '<div class="fm-deal-strip__grid">' +
    '<div class="fm-deal-strip__list">' +
    (items.length ? items.map(itemBlock).join("") : '<p class="fm-deal-strip__empty">尚未加入商品</p>') +
    '</div>' +
    (editable || reinitiate ? actions(items, reinitiate) : "") +
    '</div>' +
    '</div>' +
    '</div>';
}
