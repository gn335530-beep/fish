/* 加購面板：列出同一位釣客的所有商品，批次填入加購數量。 */

import { state } from "../store.js";
import { escapeHtml } from "./html.js";
import { itemSpecies, itemPriceText } from "./deal-item-text.js";

function inDraftOf(productId) {
  return ((state.deal && state.deal.items) || []).reduce(function (sum, item) {
    return String(item.product_id) === String(productId) ? sum + Number(item.quantity || 0) : sum;
  }, 0);
}

function addonRow(product) {
  const available = Number(product.available) || 0;
  const max = Math.max(0, available - inDraftOf(product.id));
  const value = (state.addonQty || {})[product.id];
  return '<div class="fm-addon__row">' +
    '<div class="fm-addon__name"><b>' + escapeHtml(itemSpecies(product)) + '</b>' +
    '<span>剩 ' + available + ' 尾 · ' + itemPriceText(product) + '</span></div>' +
    '<input type="number" min="0" max="' + max + '" step="1" data-addon-qty="' +
    escapeHtml(product.id) + '" value="' + escapeHtml(value == null ? "" : value) + '"' +
    (max > 0 ? "" : " disabled") + ' aria-label="加購數量">' +
    '</div>';
}

export function renderAddonPanel() {
  const rows = state.addons || [];
  return '<div class="fm-deal-sheet fm-deal-sheet--addon">' +
    '<div class="fm-addon__list">' +
    (rows.length ? rows.map(addonRow).join("") : '<p class="fm-addon__empty">目前沒有可加購的商品</p>') +
    '</div>' +
    '<div class="fm-deal-sheet__acts">' +
    '<button type="button" data-action="addon-cancel">取消</button>' +
    '<button type="button" class="fm-deal-sheet__primary" data-action="addon-submit">確認</button>' +
    '</div>' +
    '</div>';
}
