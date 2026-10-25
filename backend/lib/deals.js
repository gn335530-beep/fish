/* 交易房與訂單：找或建立唯一的房間與草稿、對外樣貌與協議狀態。 */

const { all, findById, insert, patch, nextCode } = require("./store");
const { productAvailability } = require("./orders");
const { itemsOf, itemsTotal } = require("./deal-items");
const { fail } = require("./http");

const DRAFT_STATUS = "DRAFT";
const ACTIVE_STATUS = ["PENDING_REVIEW", "NEGOTIATING"];
const LOCK_MINUTES = 30;

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

/* 一個交易房同時最多一筆進行中訂單（02-domain 6.2）。 */
function hasActiveDeal(conversationId, exceptId) {
  return all("deals").some(function (deal) {
    return String(deal.conversation_id) === String(conversationId)
      && String(deal.id) !== String(exceptId)
      && ACTIVE_STATUS.indexOf(deal.deal_status) !== -1;
  });
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
    updated_at: now,
    confirmed_at: null
  });
}

/* 訂單對外的樣貌：項目附上目前可售尾數，金額重算。 */
function decorateDeal(deal) {
  const items = itemsOf(deal).map(function (item) {
    const stock = productAvailability(item.product_id);
    return Object.assign({}, item, { available: stock ? stock.available : 0 });
  });
  return Object.assign({}, deal, { items: items, items_total: itemsTotal(items) });
}

function isParticipant(deal, userId) {
  return String(deal.buyer_id) === String(userId) || String(deal.seller_id) === String(userId);
}

function isBuyer(deal, userId) {
  return String(deal.buyer_id) === String(userId);
}

function dealIdOf(req) {
  const body = req.body || {};
  return req.params.id || body.deal_id || req.query.deal_id || "";
}

/* 取得訂單並檢查參與者；失敗時直接回應並回傳 null。 */
function requireDeal(req, res) {
  const deal = findById("deals", dealIdOf(req));
  if (!deal) {
    fail(res, 404, "DEAL_NOT_FOUND", "找不到訂單");
    return null;
  }
  if (!isParticipant(deal, req.user.id)) {
    fail(res, 403, "FORBIDDEN", "你不是這筆訂單的參與者");
    return null;
  }
  return deal;
}

function requireDraft(deal, res, message) {
  if (deal.deal_status !== DRAFT_STATUS) {
    fail(res, 409, "INVALID_DEAL_STATUS", message || "只有草稿訂單可以修改");
    return false;
  }
  return true;
}

/* 發起方送出提案即視為自己已簽，鎖定 30 分鐘。 */
function applyProposal(deal, userId, terms, now) {
  const buyer = isBuyer(deal, userId);
  return patch("deals", deal.id, {
    deal_status: "PENDING_REVIEW",
    deal_terms: terms,
    initiator_id: Number(userId),
    buyer_confirmed: buyer,
    seller_confirmed: !buyer,
    lock_expires_at: new Date(new Date(now).getTime() + LOCK_MINUTES * 60000).toISOString(),
    hold_expires_at: null,
    rejected_by: null,
    cancelled_by: null,
    cancel_reason: null,
    confirmed_at: null,
    updated_at: now
  });
}

module.exports = {
  DRAFT_STATUS: DRAFT_STATUS,
  findConversation: findConversation,
  createConversation: createConversation,
  draftOf: draftOf,
  hasActiveDeal: hasActiveDeal,
  createDeal: createDeal,
  decorateDeal: decorateDeal,
  isParticipant: isParticipant,
  isBuyer: isBuyer,
  requireDeal: requireDeal,
  requireDraft: requireDraft,
  applyProposal: applyProposal
};
