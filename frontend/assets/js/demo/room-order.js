/* 房間摘要的單一取值規則：進行中訂單優先，否則最新一筆；沒有訂單才算無摘要。 */

import { dealStatusLabel, cardStatusLabel } from "./deal-labels.js";
import { cardStatusForDeal, isConfirmedCard } from "./deal-state.js";
import { money } from "./views/html.js";

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
  /* 訂單列表沿用「已成交」；協議卡才使用「已確認」。 */
  if (isConfirmedCard(cardStatus)) return dealStatusLabel(order.status, "已成交");
  return cardStatus ? cardStatusLabel(cardStatus) : dealStatusLabel(order.status, "洽談中");
}

/* 收件匣與訂單面板共用同一段摘要文字。 */
export function orderSummaryText(order) {
  if (!order) return "";
  return orderStatusLabel(order) + " · " + Number(order.item_count || 0) + " 項 · " +
    Number(order.total_quantity || 0) + " 尾 · " + money(order.final_price);
}
