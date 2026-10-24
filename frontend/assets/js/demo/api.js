/* 對話式交易引擎的 API 呼叫層，統一經過既有的 HaisenAPI.request。 */

function client() {
  if (!window.HaisenAPI) throw new Error("API 用戶端未載入");
  return window.HaisenAPI;
}

async function call(path, options) {
  const result = await client().request(path, Object.assign({ auth: true }, options || {}));
  return result.data;
}

export function isLoggedIn() {
  return !!window.HaisenAPI && !!window.HaisenAPI.getToken();
}

export function logout() {
  if (window.HaisenAPI) window.HaisenAPI.logout();
}

export function fetchMe() {
  return call("/api/auth/me");
}

export function ensureAssistant() {
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

export function listProducts(params) {
  const query = new URLSearchParams(params || {}).toString();
  return call("/api/products" + (query ? "?" + query : ""));
}

export function getProduct(productId) {
  return call("/api/products/" + encodeURIComponent(productId));
}

export function createProduct(payload) {
  return call("/api/products/create", { method: "POST", body: payload });
}

export function clearConversation(conversationId, keepFromSeq) {
  return call("/api/conversations/" + encodeURIComponent(conversationId) + "/clear", {
    method: "POST",
    body: { keep_from_seq: keepFromSeq }
  });
}
