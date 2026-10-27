/* 對話式交易引擎的 API 呼叫層，統一經過既有的 HaisenAPI.request。 */

import { request as call } from "../api/request.js";

export function isLoggedIn() {
  return !!window.HaisenAPI && !!window.HaisenAPI.getToken();
}

export function logout() {
  if (window.HaisenAPI) window.HaisenAPI.logout();
}

export function fetchMe() {
  return call("/api/auth/me");
}

export function createAssistant() {
  return call("/api/conversations/assistant", { method: "POST" });
}

export function listConversations() {
  return call("/api/conversations");
}

export function listMessages(conversationId, afterSeq) {
  const query = "?after_seq=" + (Number(afterSeq) || 0) + "&limit=100";
  return call("/api/conversations/" + encodeURIComponent(conversationId) + "/messages" + query);
}

export function sendMessage(conversationId, payload) {
  const body = Object.assign({ conversation_id: conversationId }, payload || {});
  return call("/api/chat/message", { method: "POST", body: body });
}

export function updateContext(conversationId, patch) {
  return call("/api/conversations/" + encodeURIComponent(conversationId) + "/context", {
    method: "PUT",
    body: patch
  });
}

export function markRead(conversationId) {
  return call("/api/conversations/" + encodeURIComponent(conversationId) + "/read", { method: "POST" });
}

export function clearConversation(conversationId, keepFromSeq) {
  return call("/api/conversations/" + encodeURIComponent(conversationId) + "/clear", {
    method: "POST",
    body: { keep_from_seq: keepFromSeq }
  });
}

export function deleteConversation(conversationId) {
  return call("/api/conversations/" + encodeURIComponent(conversationId), { method: "DELETE" });
}

export function sellerConsent() {
  return call("/api/users/seller-consent", { method: "POST" });
}

/* 由商品開啟或沿用交易房與草稿訂單。 */
export function initiateChannel(productId, quantity) {
  return call("/api/deals/initiate-channel", {
    method: "POST",
    body: { product_id: productId, quantity: Number(quantity) || 1 }
  });
}

export function getDeal(dealId) {
  return call("/api/deals/" + encodeURIComponent(dealId));
}

export function addDealItem(dealId, productId, quantity) {
  return call("/api/deals/items", {
    method: "POST",
    body: { deal_id: dealId, product_id: productId, quantity: Number(quantity) }
  });
}

export function updateDealItem(dealId, itemId, quantity) {
  return call("/api/deals/items/" + encodeURIComponent(itemId), {
    method: "PATCH",
    body: { deal_id: dealId, quantity: Number(quantity) }
  });
}

export function removeDealItem(dealId, itemId) {
  return call("/api/deals/items/" + encodeURIComponent(itemId) +
    "?deal_id=" + encodeURIComponent(dealId), { method: "DELETE" });
}

export function clearDealItems(dealId) {
  return call("/api/deals/items?deal_id=" + encodeURIComponent(dealId), { method: "DELETE" });
}

export function proposeDeal(dealId, terms) {
  return call("/api/deals/propose", {
    method: "POST",
    body: Object.assign({ deal_id: dealId }, terms || {})
  });
}

export function respondDeal(dealId, action) {
  return call("/api/deals/respond", {
    method: "POST",
    body: { deal_id: dealId, action: action }
  });
}

export function cancelDeal(dealId, reason) {
  return call("/api/deals/cancel", {
    method: "POST",
    body: { deal_id: dealId, reason: reason }
  });
}

export function submitReview(dealId, review) {
  return call("/api/reviews/submit", {
    method: "POST",
    body: Object.assign({ deal_id: dealId }, review || {})
  });
}
