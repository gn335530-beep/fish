/* 協議狀態轉換：同意成交、退回協商、取消釋放。 */

const { findById, patch } = require("./store");
const { itemsOf, syncDealCard, systemMessage } = require("./orders");
const { reviewCardMessage } = require("./reviews");

const HOLD_MINUTES = 15;

const CANCEL_REASONS = {
  SELLER_OUT_OF_STOCK: "釣客缺貨",
  BUYER_CHANGED_MIND: "買家改變心意",
  TERMS_MISMATCH: "條件不合",
  OTHER: "其他"
};

/* 同意即成交：項目計入已售、雙方完成數 +1。保留量因狀態離開進行中而自動釋放。 */
function agree(deal, now) {
  itemsOf(deal).forEach(function (item) {
    const product = findById("products", item.product_id);
    if (!product) return;
    patch("products", product.id, {
      sold_quantity: Number(product.sold_quantity || 0) + Number(item.quantity || 0)
    });
  });

  [deal.buyer_id, deal.seller_id].forEach(function (userId) {
    const user = findById("users", userId);
    if (!user) return;
    patch("users", user.id, {
      completed_deals: Number(user.completed_deals || 0) + 1
    });
  });

  const updated = patch("deals", deal.id, {
    deal_status: "CONFIRMED",
    buyer_confirmed: true,
    seller_confirmed: true,
    lock_expires_at: null,
    hold_expires_at: null,
    rejected_by: null,
    confirmed_at: now,
    updated_at: now
  });
  syncDealCard(deal.id, "confirmed");
  systemMessage(deal.conversation_id, "雙方都同意了，這筆交易成立。");
  reviewCardMessage(updated);
  return updated;
}

/* 退回進入協商中，保留 15 分鐘；由退回方修改條件後重送。 */
function reject(deal, userId, now) {
  const updated = patch("deals", deal.id, {
    deal_status: "NEGOTIATING",
    rejected_by: Number(userId),
    lock_expires_at: null,
    hold_expires_at: new Date(new Date(now).getTime() + HOLD_MINUTES * 60000).toISOString(),
    updated_at: now
  });
  syncDealCard(deal.id, "rejected");
  systemMessage(deal.conversation_id, "協議已退回，可修改條件後重新送出（保留 15 分鐘）。");
  return updated;
}

/* 任一方取消：選原因、立刻釋放保留尾數、留下系統訊息。 */
function cancel(deal, userId, reason, now) {
  const wasAgreement = deal.deal_status !== "DRAFT";
  const updated = patch("deals", deal.id, {
    deal_status: "CANCELLED",
    cancelled_by: Number(userId),
    cancel_reason: reason,
    lock_expires_at: null,
    hold_expires_at: null,
    updated_at: now
  });
  syncDealCard(deal.id, "cancelled");
  systemMessage(deal.conversation_id,
    (wasAgreement ? "協議已取消" : "訂單已取消") +
    "（" + CANCEL_REASONS[reason] + "），保留的尾數已釋放。");
  return updated;
}

module.exports = {
  HOLD_MINUTES: HOLD_MINUTES,
  CANCEL_REASONS: CANCEL_REASONS,
  agree: agree,
  reject: reject,
  cancel: cancel
};
