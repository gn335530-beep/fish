/* 訂單狀態與協議卡狀態的對應，供視圖判斷目前有效的卡。 */

const CARD_STATUS = {
  PENDING_REVIEW: "pending",
  NEGOTIATING: "rejected",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled"
};

export function cardStatusOf(dealStatus) {
  return CARD_STATUS[dealStatus] || null;
}

export function isLiveCard(card, deal) {
  if (!deal || String(card.deal_id) !== String(deal.id)) return false;
  const status = cardStatusOf(deal.deal_status);
  return !!status && card.status === status;
}

export function canResend(deal, userId) {
  return !!deal && deal.deal_status === "NEGOTIATING" && userId != null &&
    String(deal.rejected_by) === String(userId);
}
