/* 發送交易面板：數量、售價、面交時間、面交地點與確認。 */

import { state } from "../store.js";
import { escapeHtml } from "./html.js";
import { totalQuantity } from "./deal-item-text.js";

export function renderProposalPanel() {
  const deal = state.deal || {};
  const items = deal.items || [];
  const single = items.length === 1;
  const proposal = state.proposal || {};
  const tails = totalQuantity(items);
  const max = single ? Math.max(0, Number(items[0].available || 0)) : 0;
  return '<div class="fm-deal-sheet">' +
    '<label class="fm-deal-sheet__field">數量' +
    (single
      ? '<input type="number" min="1" max="' + max + '" step="1" data-field="quantity" value="' +
        escapeHtml(proposal.quantity) + '" aria-label="數量">'
      : '<span class="fm-deal-sheet__readonly">' + tails + ' 尾</span>') +
    '</label>' +
    '<label class="fm-deal-sheet__field">售價' +
    '<input type="number" min="1" step="1" data-field="final_price" value="' +
    escapeHtml(proposal.final_price) + '" aria-label="售價">' +
    '</label>' +
    '<label class="fm-deal-sheet__field">面交時間' +
    '<input type="datetime-local" data-field="meetup_time" value="' +
    escapeHtml(proposal.meetup_time) + '" aria-label="面交時間">' +
    '</label>' +
    '<label class="fm-deal-sheet__field">面交地點' +
    '<input type="text" maxlength="100" data-field="meetup_location" value="' +
    escapeHtml(proposal.meetup_location) + '" placeholder="例：基隆火車站南站" aria-label="面交地點">' +
    '</label>' +
    '<div class="fm-deal-sheet__acts">' +
    '<button type="button" class="fm-deal-sheet__primary" data-action="submit-proposal">確認</button>' +
    '</div>' +
    '</div>';
}
