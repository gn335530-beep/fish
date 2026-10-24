/* 訂單與商品的衍生計算：可售尾數、商品狀態、逾時釋放。 */

const { all, patch, insert, nextCode } = require("./store");

const ACTIVE_STATUS = ["PENDING_REVIEW", "NEGOTIATING"];

function itemsOf(deal) {
  return Array.isArray(deal.items) ? deal.items : [];
}

function isActive(deal) {
  return ACTIVE_STATUS.indexOf(deal.deal_status) !== -1;
}

/* 某商品目前被進行中訂單保留的尾數。 */
function reservedFor(productId, deals) {
  return deals.filter(isActive).reduce(function (sum, deal) {
    return sum + itemsOf(deal)
      .filter(function (item) { return String(item.product_id) === String(productId); })
      .reduce(function (s, item) { return s + Number(item.quantity || 0); }, 0);
  }, 0);
}

function statusOf(available, reserved) {
  if (available <= 0) return "SOLD_OUT";
  if (reserved > 0) return "PARTIALLY_RESERVED";
  return "ACTIVE";
}

/* 商品對外的完整樣貌：庫存與價格衍生欄位都在這裡算。 */
function decorateProduct(product, deals) {
  const quantity = Number(product.quantity || 0);
  const sold = Number(product.sold_quantity || 0);
  const reserved = reservedFor(product.id, deals);
  const available = Math.max(0, quantity - sold - reserved);
  const unitPrice = quantity > 0 ? Math.round(Number(product.price || 0) / quantity) : 0;
  const avgWeight = quantity > 0 ? Number((Number(product.weight_kg || 0) / quantity).toFixed(2)) : 0;
  return Object.assign({}, product, {
    reserved_quantity: reserved,
    available: available,
    unit_price: unitPrice,
    avg_weight_kg: avgWeight,
    status: statusOf(available, reserved)
  });
}

function decorateProducts(products) {
  const deals = all("deals");
  return products.map(function (product) { return decorateProduct(product, deals); });
}

/* 卡片訊息跟著訂單狀態同步，讓重新載入後仍顯示正確結果。 */
function syncDealCard(dealId, status) {
  all("messages").forEach(function (message) {
    if (!message.card || message.card.type !== "deal") return;
    if (String(message.card.deal_id) !== String(dealId)) return;
    patch("messages", message.id, {
      card: Object.assign({}, message.card, { status: status })
    });
  });
}

function systemMessage(conversationId, text) {
  insert("messages", {
    id: nextCode("messages", "msg"),
    conversation_id: conversationId,
    sender_id: "system",
    type: "system",
    text: text,
    image_url: null,
    card: null,
    created_at: new Date().toISOString()
  });
}

function expireDeal(deal, reason, message) {
  patch("deals", deal.id, {
    deal_status: "CANCELLED",
    cancelled_by: "system",
    cancel_reason: reason
  });
  syncDealCard(deal.id, "expired");
  systemMessage(deal.conversation_id, message);
}

/* 讀取時惰性掃描，不需要背景排程。 */
function sweepExpired() {
  const now = Date.now();
  all("deals").forEach(function (deal) {
    if (deal.deal_status === "PENDING_REVIEW" && deal.lock_expires_at) {
      if (new Date(deal.lock_expires_at).getTime() < now) {
        expireDeal(deal, "LOCK_EXPIRED", "協議已逾時未回覆，保留的數量已釋放。");
      }
      return;
    }
    if (deal.deal_status === "NEGOTIATING" && deal.hold_expires_at) {
      if (new Date(deal.hold_expires_at).getTime() < now) {
        expireDeal(deal, "HOLD_EXPIRED", "協商已逾時，保留的數量已釋放。");
      }
    }
  });
}

module.exports = {
  ACTIVE_STATUS: ACTIVE_STATUS,
  itemsOf: itemsOf,
  isActive: isActive,
  reservedFor: reservedFor,
  decorateProduct: decorateProduct,
  decorateProducts: decorateProducts,
  syncDealCard: syncDealCard,
  systemMessage: systemMessage,
  sweepExpired: sweepExpired
};
