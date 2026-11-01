/* 交易房浮動商品條：目前商品、加購與發送交易入口。 */

import { state } from "../store.js";
import { escapeHtml } from "./html.js";
import { canEditDeal } from "../deal-state.js";
import { itemSpecies, itemPriceText } from "./deal-item-text.js";
import { renderProposalPanel } from "./deal-propose.js";
import { renderAddonPanel } from "./deal-addon.js";

function itemRow(item) {
  return '<div class="fm-deal-strip__row">' +
    '<b>' + escapeHtml(itemSpecies(item)) + '</b>' +
    '<span>剩 ' + Number(item.available || 0) + ' 尾</span>' +
    '<span>' + itemPriceText(item) + '</span>' +
    '</div>';
}

function actions(items, open) {
  if (open) {
    return '<div class="fm-deal-strip__acts">' +
      '<button type="button" data-action="close-sheet">收起</button></div>';
  }
  return '<div class="fm-deal-strip__acts">' +
    '<button type="button" data-action="toggle-addon">加購</button>' +
    '<button type="button" class="fm-deal-strip__primary" data-action="toggle-propose"' +
    (items.length ? "" : " disabled") + '>發送交易</button></div>';
}

export function renderDealStrip() {
  const deal = state.deal;
  const items = (deal && deal.items) || [];
  const open = state.proposeOpen || state.addonOpen;
  const editable = canEditDeal(deal, state.user);
  return '<div class="fm-deal-panel">' +
    '<div class="fm-deal-strip">' +
    (items.length ? items.map(itemRow).join("") : '<p class="fm-deal-strip__empty">尚未加入商品</p>') +
    (editable ? actions(items, open) : "") +
    '</div>' +
    (editable && state.proposeOpen ? renderProposalPanel() : "") +
    (editable && state.addonOpen ? renderAddonPanel() : "") +
    '</div>';
}
