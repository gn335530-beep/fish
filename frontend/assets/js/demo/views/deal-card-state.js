/* 協議卡與評價卡共用：判斷卡片是否仍代表目前訂單狀態。 */

import { state } from "../store.js";
import { cardStatusForDeal } from "../deal-state.js";

/* 同一筆訂單可能有好幾張協議卡；只有最後一張跟著目前訂單狀態。 */
export function isCurrentCard(card, messageId) {
  const rows = (state.messages || []).filter(function (message) {
    return message.card && message.card.type === card.type &&
      String(message.card.deal_id) === String(card.deal_id);
  });
  if (!rows.length) return true;
  if (messageId == null) return false;
  return String(rows[rows.length - 1].id) === String(messageId);
}

export function currentDealFor(card) {
  const deal = state.deal;
  if (!deal || String(deal.id) !== String(card.deal_id)) return null;
  return deal;
}

/* 最新卡片顯示目前訂單狀態；沒有訊息（例如單獨渲染）時沿用卡片本身。 */
export function displayStatusOf(card, messageId) {
  const deal = currentDealFor(card);
  if (!deal || !(state.messages || []).length || !isCurrentCard(card, messageId)) {
    return card.status;
  }
  return cardStatusForDeal(deal) || card.status;
}
