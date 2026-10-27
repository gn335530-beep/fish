/* 取消核心：使用者取消與逾時掃描共用同一份欄位更新、卡片同步與系統訊息。 */

const { patch } = require("./store");
const { syncDealCard } = require("./cards");
const { systemMessage } = require("./messages");

const CANCEL_REASONS = {
  SELLER_OUT_OF_STOCK: "釣客缺貨",
  BUYER_CHANGED_MIND: "買家改變心意",
  TERMS_MISMATCH: "條件不合",
  OTHER: "其他"
};

/* options：operator（使用者 id 或 "system"）、reason、cardStatus、message。 */
function cancelDeal(deal, options, now) {
  const input = options || {};
  const updated = patch("deals", deal.id, {
    deal_status: "CANCELLED",
    cancelled_by: input.operator,
    cancel_reason: input.reason,
    lock_expires_at: null,
    hold_expires_at: null,
    updated_at: now
  });
  syncDealCard(deal.id, input.cardStatus);
  systemMessage(deal.conversation_id, input.message);
  return updated;
}

module.exports = {
  CANCEL_REASONS: CANCEL_REASONS,
  cancelDeal: cancelDeal
};
