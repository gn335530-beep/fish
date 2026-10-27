/* 訂單狀態顯示文案的單一來源；classic 頁面與 ESM 共用這個全域。 */

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

window.DealStatusLabels = { DEAL: DEAL, CARD: CARD, NOTE: NOTE };

window.dealStatusLabel = function (status, fallback) {
  return DEAL[status] || fallback || "訂單";
};

window.cardStatusLabel = function (status, fallback) {
  return CARD[status] || fallback || "協議";
};

window.dealStatusNote = function (status) {
  return NOTE[status] || "";
};
