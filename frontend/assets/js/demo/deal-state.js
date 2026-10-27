/* 訂單狀態與協議卡狀態的對應，供視圖判斷目前有效的卡。 */

const CARD_STATUS = {
  PENDING_REVIEW: "pending",
  NEGOTIATING: "rejected",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled"
};

const ACTION_STATUS = ["PENDING_REVIEW", "NEGOTIATING"];
const EXPIRED_REASONS = ["LOCK_EXPIRED", "HOLD_EXPIRED"];

export function cardStatusOf(dealStatus) {
  return CARD_STATUS[dealStatus] || null;
}

/* 逾時在資料上也是 CANCELLED，卡片要依原因顯示「已逾時」。 */
export function cardStatusForDeal(deal) {
  if (!deal) return null;
  if (deal.deal_status === "CANCELLED" && EXPIRED_REASONS.indexOf(deal.cancel_reason) !== -1) {
    return "expired";
  }
  return cardStatusOf(deal.deal_status);
}

/* 只有待回覆與協商中的訂單還能同意、退回或取消。 */
export function isActionable(deal) {
  return !!deal && ACTION_STATUS.indexOf(deal.deal_status) !== -1;
}

export function canResend(deal, userId) {
  return !!deal && deal.deal_status === "NEGOTIATING" && userId != null &&
    String(deal.rejected_by) === String(userId);
}
