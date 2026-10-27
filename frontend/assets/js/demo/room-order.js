/* 房間摘要的單一取值規則：進行中訂單優先，否則最新一筆；沒有訂單才算無摘要。 */

import { dealStatusLabel, cardStatusLabel } from "./deal-labels.js";
import { cardStatusForDeal } from "./deal-state.js";
import { money } from "./views/html.js";

export function summaryOfDeal(deal) {
  const items = deal.items || [];
  return {
    id: deal.id,
    status: deal.deal_status,
    item_count: items.length,
    total_quantity: items.reduce(function (sum, item) {
      return sum + Number(item.quantity || 0);
    }, 0),
    final_price: deal.deal_terms
      ? Number(deal.deal_terms.final_price || 0)
      : Number(deal.items_total || 0),
    cancel_reason: deal.cancel_reason || null
  };
}

export function preferredOrder(room) {
  if (!room || room.type !== "deal") return null;
  return room.order || room.last_order || null;
}

/* 逾時在資料上也是取消狀態，摘要要依原因顯示「已逾時」。 */
export function orderStatusLabel(order) {
  if (!order) return "";
  const cardStatus = cardStatusForDeal({
    deal_status: order.status,
    cancel_reason: order.cancel_reason
  });
  return cardStatus ? cardStatusLabel(cardStatus) : dealStatusLabel(order.status, "洽談中");
}

/* 收件匣與訂單面板共用同一段摘要文字。 */
export function orderSummaryText(order) {
  if (!order) return "";
  return orderStatusLabel(order) + " · " + Number(order.item_count || 0) + " 項 · " +
    Number(order.total_quantity || 0) + " 尾 · " + money(order.final_price);
}
