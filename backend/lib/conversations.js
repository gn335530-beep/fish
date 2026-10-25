/* 對話的共用查詢與摘要，供 chat 與 chat-messages 兩組路由使用。 */

const { all, findById } = require("./store");
const { publicUser } = require("./auth");
const { itemsOf } = require("./orders");
const { fail } = require("./http");

const AI_PEER = { id: "ai", display_name: "小幫手", username: "" };
const ACTIVE_ORDER = ["DRAFT", "PENDING_REVIEW", "NEGOTIATING"];

function isParticipant(conversation, userId) {
  return (conversation.user_ids || []).some(function (id) {
    return String(id) === String(userId);
  });
}

function messagesOf(conversationId) {
  return all("messages").filter(function (m) {
    return String(m.conversation_id) === String(conversationId);
  });
}

function activeOrder(conversationId) {
  return all("deals")
    .filter(function (d) {
      return String(d.conversation_id) === String(conversationId)
        && ACTIVE_ORDER.indexOf(d.deal_status) !== -1;
    })
    .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); })[0] || null;
}

function orderSummary(deal) {
  const items = itemsOf(deal);
  return {
    id: deal.id,
    status: deal.deal_status,
    item_count: items.length,
    total_quantity: items.reduce(function (sum, item) { return sum + Number(item.quantity || 0); }, 0),
    final_price: deal.deal_terms ? Number(deal.deal_terms.final_price || 0) : Number(deal.items_total || 0),
    updated_at: deal.updated_at || deal.created_at || null
  };
}

function peerOf(conversation, userId) {
  if (conversation.type === "assistant") return AI_PEER;
  const otherId = String(conversation.buyer_id) === String(userId)
    ? conversation.seller_id
    : conversation.buyer_id;
  return publicUser(findById("users", otherId)) || { id: otherId, display_name: "對方", username: "" };
}

function unreadCount(conversation, userId) {
  const readAt = (conversation.read_at || {})[String(userId)] || "";
  return messagesOf(conversation.id).filter(function (m) {
    if (String(m.sender_id) === String(userId)) return false;
    /* 助手房的系統訊息不算未讀；交易房的系統訊息是開房與加購通知，要讓對方看到。 */
    if (m.type === "system" && conversation.type !== "deal") return false;
    return !readAt || m.created_at > readAt;
  }).length;
}

function summary(conversation, user) {
  const messages = messagesOf(conversation.id);
  const deal = activeOrder(conversation.id);
  return {
    id: conversation.id,
    type: conversation.type,
    mode: conversation.mode,
    context: conversation.context,
    peer: peerOf(conversation, user.id),
    order: deal ? orderSummary(deal) : null,
    last_message: messages.length ? messages[messages.length - 1] : null,
    unread_count: unreadCount(conversation, user.id),
    created_at: conversation.created_at,
    last_message_at: conversation.last_message_at || null
  };
}

/* 取得房間並檢查權限；失敗時直接回應並回傳 null。 */
function requireRoom(req, res) {
  const conversation = findById("conversations", req.params.id);
  if (!conversation) {
    fail(res, 404, "CONVERSATION_NOT_FOUND", "找不到對話");
    return null;
  }
  if (!isParticipant(conversation, req.user.id)) {
    fail(res, 403, "FORBIDDEN", "你沒有這段對話的權限");
    return null;
  }
  return conversation;
}

module.exports = {
  AI_PEER: AI_PEER,
  isParticipant: isParticipant,
  messagesOf: messagesOf,
  orderSummary: orderSummary,
  summary: summary,
  unreadCount: unreadCount,
  requireRoom: requireRoom
};
