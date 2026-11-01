/* 取消核心：使用者取消與逾時掃描共用同一份欄位更新、卡片同步與系統訊息。 */

const { patch } = require("./store");
const { syncDealCard } = require("./cards");
const { systemMessage, cardMessage } = require("./messages");

/* options：operator、reason、note、cardStatus、message、cancelledCard。 */
function cancelDeal(deal, options, now) {
  const input = options || {};
  const updated = patch("deals", deal.id, {
    deal_status: "CANCELLED",
    cancelled_by: input.operator,
    cancel_reason: input.reason,
    cancel_note: input.note || null,
    lock_expires_at: null,
    hold_expires_at: null,
    updated_at: now
  });
  syncDealCard(deal.id, input.cardStatus);
  systemMessage(deal.conversation_id, input.message);
  if (input.cancelledCard) {
    cardMessage(deal.conversation_id, "system", {
      type: "deal_cancelled",
      deal_id: deal.id,
      note: input.note || ""
    });
  }
  return updated;
}

module.exports = {
  cancelDeal: cancelDeal
};
