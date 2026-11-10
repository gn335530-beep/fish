/* 發送交易面板：商品摘要、數量、售價、面交時間、地點與確認。 */

import { state } from "../store.js";
import { escapeHtml } from "./html.js";
import { itemSummary, totalQuantity } from "./deal-item-text.js";

function productSummary(items) {
  return items.map(function (item) {
    const summary = itemSummary(item);
    return '<div class="fm-deal-propose__product-row">' +
      '<b>' + escapeHtml(summary.species) + '</b>' +
      (summary.condition ? '<span>' + escapeHtml(summary.condition) + '</span>' : '') +
      '<span>' + escapeHtml(summary.summaryText) + '</span>' +
      '</div>';
  }).join("");
}

function quantityField(single, items, proposal) {
  if (!single) {
    return '<label class="fm-deal-sheet__field">數量' +
      '<span class="fm-deal-sheet__readonly">' + totalQuantity(items) + ' 尾</span></label>';
  }
  const max = Math.max(0, Number(items[0].available || 0));
  return '<label class="fm-deal-sheet__field">數量' +
    '<input type="number" min="1" max="' + max + '" step="1" data-field="quantity" value="' +
    escapeHtml(proposal.quantity) + '" aria-label="數量"></label>';
}

export function renderProposalPanel() {
  const deal = state.deal || {};
  const items = deal.items || [];
  const single = items.length === 1;
  const proposal = state.proposal || {};
  return '<div class="fm-deal-sheet fm-deal-sheet--propose">' +
    '<div class="fm-deal-propose__product">' +
    '<div class="fm-deal-propose__product-list">' + productSummary(items) + '</div>' +
    '<button type="button" class="fm-deal-propose__close" data-action="close-sheet">收起</button>' +
    '</div>' +
    '<div class="fm-deal-propose__fields">' +
    quantityField(single, items, proposal) +
    '<label class="fm-deal-sheet__field">售價' +
    '<input type="number" min="1" step="1" data-field="final_price" value="' +
    escapeHtml(proposal.final_price) + '" aria-label="售價"></label>' +
    '</div>' +
    '<div class="fm-deal-propose__bottom">' +
    '<div class="fm-deal-propose__times">' +
    '<label class="fm-deal-sheet__field">面交時間' +
    '<input type="datetime-local" data-field="meetup_time" value="' +
    escapeHtml(proposal.meetup_time) + '" aria-label="面交時間"></label>' +
    '<label class="fm-deal-sheet__field">面交地點' +
    '<input type="text" maxlength="100" data-field="meetup_location" value="' +
    escapeHtml(proposal.meetup_location) + '" placeholder="例：基隆火車站南站" aria-label="面交地點"></label>' +
    '</div>' +
    '<div class="fm-deal-sheet__acts">' +
    '<button type="button" class="fm-deal-sheet__primary" data-action="submit-proposal">確認</button>' +
    '</div>' +
    '</div>' +
    '</div>';
}
