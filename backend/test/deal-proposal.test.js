/* 協議提案：欄位驗證、30 分鐘鎖定、協議卡、保留與可售不足。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");

const seen = {};

function terms(overrides) {
  return Object.assign({
    deal_id: seen.dealA,
    final_price: 1200,
    meetup_location: "基隆火車站南站 7-11 門口",
    meetup_time: "2026-10-26T17:30:00+08:00"
  }, overrides || {});
}

async function initiate(productId, quantity, token) {
  return call("POST", "/api/deals/initiate-channel", {
    token: token || tokens.buyer,
    body: { product_id: productId, quantity: quantity }
  });
}

test.after(stop);

test.before(async function () {
  await start();
  const roomA = await initiate("prd_a", 1);
  seen.dealA = roomA.body.data.deal.id;
  seen.convA = roomA.body.data.conversation.id;

  const roomB = await initiate("prd_a", 2, tokens.third);
  seen.dealB = roomB.body.data.deal.id;

  const roomC = await initiate("prd_c", 1, tokens.third);
  seen.dealC = roomC.body.data.deal.id;
});

test("缺少面交地點時不能送出", async function () {
  const result = await call("POST", "/api/deals/propose", {
    token: tokens.buyer,
    body: terms({ meetup_location: "" })
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "MISSING_TERMS");
});

test("整單金額必須大於 0", async function () {
  const result = await call("POST", "/api/deals/propose", {
    token: tokens.buyer,
    body: terms({ final_price: 0 })
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "INVALID_PRICE");
});

test("釣客也可以發起協議，簽核記在釣客身上", async function () {
  const result = await call("POST", "/api/deals/propose", {
    token: tokens.otherSeller,
    body: { deal_id: seen.dealC, final_price: 450, meetup_location: "琉球漁港", meetup_time: "2026-10-26T09:00:00+08:00" }
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.deal.deal_status, "PENDING_REVIEW");
  assert.equal(result.body.data.deal.seller_confirmed, true);
  assert.equal(result.body.data.deal.buyer_confirmed, false);
});

test("全部尾數被保留時，狀態仍是洽談中而不是已售出", async function () {
  const result = await call("GET", "/api/products/prd_c", { token: tokens.third });
  const product = result.body.data;
  assert.equal(product.reserved_quantity, 1);
  assert.equal(product.available, 0);
  assert.equal(product.status, "PARTIALLY_RESERVED");
});

test("買家送出協議後進入待回覆並鎖定 30 分鐘", async function () {
  const before = Date.now();
  const result = await call("POST", "/api/deals/propose", {
    token: tokens.buyer,
    body: terms()
  });
  assert.equal(result.status, 200);

  const deal = result.body.data.deal;
  assert.equal(deal.deal_status, "PENDING_REVIEW");
  assert.equal(deal.buyer_confirmed, true);
  assert.equal(deal.seller_confirmed, false);
  assert.equal(deal.initiator_id, 2);
  assert.equal(deal.deal_terms.final_price, 1200);
  assert.equal(deal.deal_terms.meetup_location, "基隆火車站南站 7-11 門口");
  const lockMinutes = (new Date(deal.lock_expires_at).getTime() - before) / 60000;
  assert.ok(lockMinutes > 29 && lockMinutes < 31);
});

test("協議卡與系統訊息會出現在交易房", async function () {
  const result = await call("GET", "/api/conversations/" + seen.convA + "/messages?limit=100", {
    token: tokens.seller
  });
  const card = result.body.data.find(function (message) {
    return message.card && message.card.type === "deal";
  });
  assert.ok(card);
  assert.equal(card.card.status, "pending");
  assert.equal(card.card.final_price, 1200);
  assert.equal(card.card.meetup_location, "基隆火車站南站 7-11 門口");
  assert.equal(card.card.items[0].quantity, 1);
  assert.ok(result.body.data.some(function (message) {
    return message.type === "system" && message.text.indexOf("已送出協議") !== -1;
  }));
});

test("提案後商品保留尾數，可售與狀態正確", async function () {
  const result = await call("GET", "/api/products/prd_a", { token: tokens.buyer });
  const product = result.body.data;
  assert.equal(product.reserved_quantity, 1);
  assert.equal(product.available, 1);
  assert.equal(product.status, "PARTIALLY_RESERVED");
});

test("可售不足時回 409、指出商品，訂單維持草稿", async function () {
  const result = await call("POST", "/api/deals/propose", {
    token: tokens.third,
    body: terms({ deal_id: seen.dealB, final_price: 2600 })
  });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "INSUFFICIENT_QUANTITY");
  assert.equal(result.body.product_id, "prd_a");
  assert.equal(result.body.available, 1);

  const deal = await call("GET", "/api/deals/" + seen.dealB, { token: tokens.third });
  assert.equal(deal.body.data.deal_status, "DRAFT");
});

test("非參與者不能提案", async function () {
  const result = await call("POST", "/api/deals/propose", {
    token: tokens.otherSeller,
    body: terms()
  });
  assert.equal(result.status, 403);
});

test("同一個房間不能同時有兩筆進行中訂單", async function () {
  const room = await initiate("prd_b", 1);
  const draft = room.body.data.deal.id;
  const result = await call("POST", "/api/deals/propose", {
    token: tokens.buyer,
    body: terms({ deal_id: draft, final_price: 1500 })
  });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "DEAL_IN_PROGRESS");
});
