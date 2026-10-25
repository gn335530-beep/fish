/* 交易房與草稿訂單的共用邏輯：找或建立、加入項目、金額計算。 */

const { all, insert, patch, nextCode } = require("./store");
const { itemsOf } = require("./orders");

const DRAFT_STATUS = "DRAFT";

function itemSubtotal(item) {
  return Math.round(Number(item.unit_price || 0) * Number(item.quantity || 0));
}

function itemsTotal(items) {
  return items.reduce(function (sum, item) { return sum + itemSubtotal(item); }, 0);
}

/* 交易房以一組買家與釣客為單位（ADR 0001），不限商品。 */
function findConversation(buyerId, sellerId) {
  return all("conversations").find(function (c) {
    return c.type === "deal"
      && String(c.buyer_id) === String(buyerId)
      && String(c.seller_id) === String(sellerId);
  }) || null;
}

function createConversation(buyerId, sellerId, now) {
  return insert("conversations", {
    id: nextCode("conversations", "conv"),
    type: "deal",
    user_ids: [Number(buyerId), Number(sellerId)],
    buyer_id: Number(buyerId),
    seller_id: Number(sellerId),
    mode: "HUMAN",
    context: null,
    archived: false,
    read_at: {},
    created_at: now,
    last_message_at: now
  });
}

function draftOf(conversationId) {
  const drafts = all("deals").filter(function (deal) {
    return String(deal.conversation_id) === String(conversationId)
      && deal.deal_status === DRAFT_STATUS;
  });
  drafts.sort(function (a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });
  return drafts[0] || null;
}

function createDeal(conversation, initiatorId, now) {
  return insert("deals", {
    id: nextCode("deals", "deal"),
    conversation_id: conversation.id,
    buyer_id: conversation.buyer_id,
    seller_id: conversation.seller_id,
    initiator_id: initiatorId,
    items: [],
    items_total: 0,
    deal_terms: null,
    deal_status: DRAFT_STATUS,
    buyer_confirmed: false,
    seller_confirmed: false,
    lock_expires_at: null,
    hold_expires_at: null,
    review_status: { buyer_reviewed: false, seller_reviewed: false },
    cancelled_by: null,
    cancel_reason: null,
    created_at: now,
    confirmed_at: null
  });
}

function nextItemId(items) {
  const max = items.reduce(function (m, item) {
    return Math.max(m, Number(String(item.item_id || "").replace(/\D/g, "")) || 0);
  }, 0);
  return "itm_" + String(max + 1).padStart(2, "0");
}

/* 項目是商品快照：之後商品改價或售出都不影響已加入的內容。 */
function snapshot(product, quantity, itemId) {
  return {
    item_id: itemId,
    product_id: product.id,
    title: product.title,
    photo_url: product.photo_url,
    unit_price: Number(product.unit_price || 0),
    weight_kg: product.weight_kg,
    quantity: Number(quantity)
  };
}

/* 某一商品在草稿裡已加入的尾數。 */
function quantityOf(deal, productId) {
  if (!deal) return 0;
  return itemsOf(deal).filter(function (item) {
    return String(item.product_id) === String(productId);
  }).reduce(function (sum, item) { return sum + Number(item.quantity || 0); }, 0);
}

/* 同一商品再加購時累加尾數，不新增第二個項目。 */
function addItem(deal, product, quantity) {
  const items = itemsOf(deal).map(function (item) { return Object.assign({}, item); });
  const existing = items.find(function (item) {
    return String(item.product_id) === String(product.id);
  });

  if (existing) existing.quantity = Number(existing.quantity || 0) + Number(quantity);
  else items.push(snapshot(product, quantity, nextItemId(items)));

  return patch("deals", deal.id, { items: items, items_total: itemsTotal(items) });
}

module.exports = {
  findConversation: findConversation,
  createConversation: createConversation,
  draftOf: draftOf,
  createDeal: createDeal,
  quantityOf: quantityOf,
  addItem: addItem
};
