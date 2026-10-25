/* 交易測試共用：建立房間、提案、回應、取消與讀訊息。 */

const { call, tokens } = require("./client");

function terms(dealId, overrides) {
  return Object.assign({
    deal_id: dealId,
    final_price: 1200,
    meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T17:30:00+08:00"
  }, overrides || {});
}

function initiate(productId, quantity, token) {
  return call("POST", "/api/deals/initiate-channel", {
    token: token || tokens.buyer,
    body: { product_id: productId, quantity: quantity }
  });
}

function propose(dealId, token, overrides) {
  return call("POST", "/api/deals/propose", {
    token: token,
    body: terms(dealId, overrides)
  });
}

function respond(dealId, action, token) {
  return call("POST", "/api/deals/respond", {
    token: token,
    body: { deal_id: dealId, action: action }
  });
}

function cancel(dealId, reason, token) {
  return call("POST", "/api/deals/cancel", {
    token: token,
    body: { deal_id: dealId, reason: reason }
  });
}

async function messagesOf(conversationId, token) {
  const result = await call("GET", "/api/conversations/" + conversationId + "/messages?limit=100", {
    token: token
  });
  return result.body.data;
}

module.exports = {
  terms: terms,
  initiate: initiate,
  propose: propose,
  respond: respond,
  cancel: cancel,
  messagesOf: messagesOf
};
