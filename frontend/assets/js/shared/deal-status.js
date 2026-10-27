/* 訂單狀態唯一來源：文案、卡片對應、可操作狀態與逾時原因；classic 頁面與 ESM 共用。 */

const DEAL = {
  DRAFT: "訂單草稿",
  PENDING_REVIEW: "等待確認",
  NEGOTIATING: "協商中",
  CONFIRMED: "已成交",
  CANCELLED: "已取消"
};

const CARD = {
  pending: DEAL.PENDING_REVIEW,
  rejected: "已退回",
  confirmed: DEAL.CONFIRMED,
  cancelled: DEAL.CANCELLED,
  expired: "已逾時"
};

const NOTE = {
  PENDING_REVIEW: "等待對方回覆（30 分鐘內）",
  NEGOTIATING: "協商中，等待對方重新送出",
  CONFIRMED: "雙方已同意，交易成立",
  CANCELLED: "這筆訂單已取消"
};

/* 草稿沒有協議卡，因此對應為 null。 */
const CARD_STATUS = {
  DRAFT: null,
  PENDING_REVIEW: "pending",
  NEGOTIATING: "rejected",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled"
};

const CARD_ORDER_STATUS = {};
Object.keys(CARD_STATUS).forEach(function (dealStatus) {
  const cardStatus = CARD_STATUS[dealStatus];
  if (cardStatus) CARD_ORDER_STATUS[cardStatus] = dealStatus;
});
CARD_ORDER_STATUS.expired = "CANCELLED";

const ACTION_STATUS = ["PENDING_REVIEW", "NEGOTIATING"];
const EXPIRED_REASONS = ["LOCK_EXPIRED", "HOLD_EXPIRED"];

function statusOf(value) {
  return value && typeof value === "object" ? value.deal_status : value;
}

function dealStatusLabel(status, fallback) {
  return DEAL[status] || fallback || "訂單";
}

function cardStatusLabel(status, fallback) {
  return CARD[status] || fallback || "協議";
}

function dealStatusNote(status) {
  return NOTE[status] || "";
}

function cardStatusOf(dealStatus) {
  return CARD_STATUS[dealStatus] || null;
}

function cardStatusForDeal(deal) {
  if (!deal) return null;
  if (statusOf(deal) === "CANCELLED" && EXPIRED_REASONS.indexOf(deal.cancel_reason) !== -1) {
    return "expired";
  }
  return cardStatusOf(statusOf(deal));
}

function isActionable(deal) {
  return !!deal && ACTION_STATUS.indexOf(statusOf(deal)) !== -1;
}

function canResend(deal, userId) {
  return !!deal && statusOf(deal) === "NEGOTIATING" && userId != null &&
    String(deal.rejected_by) === String(userId);
}

function isPendingCard(cardStatus) {
  return cardStatus === "pending";
}

function isDraft(value) {
  return statusOf(value) === "DRAFT";
}

function isNegotiating(value) {
  return statusOf(value) === "NEGOTIATING";
}

function isConfirmed(value) {
  return statusOf(value) === "CONFIRMED";
}

function isFinished(value) {
  const status = statusOf(value);
  return status === "CONFIRMED" || status === "CANCELLED";
}

window.DealStatus = {
  DEAL: DEAL,
  CARD: CARD,
  NOTE: NOTE,
  CARD_STATUS: CARD_STATUS,
  CARD_ORDER_STATUS: CARD_ORDER_STATUS,
  ACTION_STATUS: ACTION_STATUS,
  EXPIRED_REASONS: EXPIRED_REASONS,
  dealStatusLabel: dealStatusLabel,
  cardStatusLabel: cardStatusLabel,
  dealStatusNote: dealStatusNote,
  cardStatusOf: cardStatusOf,
  cardStatusForDeal: cardStatusForDeal,
  isActionable: isActionable,
  canResend: canResend,
  isPendingCard: isPendingCard,
  isDraft: isDraft,
  isNegotiating: isNegotiating,
  isConfirmed: isConfirmed,
  isFinished: isFinished
};
