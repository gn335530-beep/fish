/* 訂單與商品的衍生計算：可售尾數、商品狀態、逾時釋放。 */

const { all, findById, patch, insert, nextCode, nextSeq } = require("./store");

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

/* 有保留就先算洽談中；全部售完且沒有保留才是 SOLD_OUT。 */
function statusOf(available, reserved) {
  if (reserved > 0) return "PARTIALLY_RESERVED";
  if (available <= 0) return "SOLD_OUT";
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
    price_per_taijin: product.price_per_taijin == null ? null : product.price_per_taijin,
    price_auto: product.price_auto === true,
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

/* 單一商品目前的可售尾數；商品不存在時回 null。 */
function productAvailability(productId) {
  const product = findById("products", productId);
  if (!product) return null;
  const decorated = decorateProduct(product, all("deals"));
  return { product: product, decorated: decorated, available: decorated.available };
}

/* 卡片狀態跟著訂單走；只更新最新的協議卡，較早的卡留作歷史。 */
function syncDealCard(dealId, status) {
  const cards = all("messages").filter(function (message) {
    return message.card && message.card.type === "deal"
      && String(message.card.deal_id) === String(dealId);
  });
  cards.sort(function (a, b) { return Number(b.seq) - Number(a.seq); });
  if (!cards.length) return;
  patch("messages", cards[0].id, {
    card: Object.assign({}, cards[0].card, { status: status })
  });
}

function addMessage(conversationId, fields) {
  const now = new Date().toISOString();
  const message = insert("messages", Object.assign({
    id: nextCode("messages", "msg"),
    seq: nextSeq("messages"),
    conversation_id: conversationId,
    image_url: null,
    card: null,
    created_at: now
  }, fields));
  patch("conversations", conversationId, { last_message_at: now });
  return message;
}

function systemMessage(conversationId, text) {
  return addMessage(conversationId, { sender_id: "system", type: "system", text: text });
}

function cardMessage(conversationId, senderId, card) {
  return addMessage(conversationId, {
    sender_id: senderId,
    type: "card",
    text: "",
    card: card
  });
}

function expireDeal(deal, reason, message) {
  const now = new Date().toISOString();
  patch("deals", deal.id, {
    deal_status: "CANCELLED",
    cancelled_by: "system",
    cancel_reason: reason,
    lock_expires_at: null,
    hold_expires_at: null,
    updated_at: now
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
  productAvailability: productAvailability,
  syncDealCard: syncDealCard,
  addMessage: addMessage,
  systemMessage: systemMessage,
  cardMessage: cardMessage,
  sweepExpired: sweepExpired
};
