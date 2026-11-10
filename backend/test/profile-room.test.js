/* 由個人資訊開交易房：自己不可開、沿用同方向房間、有／無商品與純聊天房刪除。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { propose, messagesOf } = require("./deal-helpers");

test.before(start);
test.after(stop);

function initiateRoom(sellerId, token) {
  return call("POST", "/api/deals/initiate-room", {
    token: token || tokens.buyer,
    body: { seller_id: sellerId }
  });
}

test("開房需要登入，且不能對自己開房", async function () {
  const anonymous = await call("POST", "/api/deals/initiate-room", {
    body: { seller_id: 1 }
  });
  assert.equal(anonymous.status, 401);

  const own = await initiateRoom(1, tokens.seller);
  assert.equal(own.status, 400);
  assert.equal(own.body.code, "OWN_PROFILE");
});

test("對方有公開商品時建立空草稿並沿用同方向房間", async function () {
  const first = await initiateRoom(1);
  assert.equal(first.status, 200);
  assert.equal(first.body.data.has_products, true);
  assert.equal(first.body.data.conversation.type, "deal");
  assert.equal(first.body.data.conversation.peer.id, 1);
  assert.equal(first.body.data.deal.deal_status, "DRAFT");
  assert.deepEqual(first.body.data.deal.items, []);
  assert.equal(first.body.data.conversation.order.id, first.body.data.deal.id);

  const messages = await messagesOf(first.body.data.conversation.id, tokens.buyer);
  assert.equal(messages.some(function (m) { return m.text === "已進入交易洽談。"; }), true);

  const second = await initiateRoom(1);
  assert.equal(second.body.data.conversation.id, first.body.data.conversation.id);
  assert.equal(second.body.data.deal.id, first.body.data.deal.id);

  const rooms = await call("GET", "/api/conversations", { token: tokens.buyer });
  const samePair = rooms.body.data.filter(function (room) {
    return room.type === "deal" && room.peer.id === 1;
  });
  assert.equal(samePair.length, 1);
});

test("已有進行中訂單時回傳同一筆，不建立新草稿", async function () {
  const room = await initiateRoom(1);
  const dealId = room.body.data.deal.id;
  await call("POST", "/api/deals/items", {
    token: tokens.buyer,
    body: { deal_id: dealId, product_id: "prd_a", quantity: 1 }
  });
  await propose(dealId, tokens.buyer);

  const again = await initiateRoom(1);
  assert.equal(again.status, 200);
  assert.equal(again.body.data.deal.id, dealId);
  assert.equal(again.body.data.deal.deal_status, "PENDING_REVIEW");

  const rooms = await call("GET", "/api/conversations", { token: tokens.buyer });
  const samePair = rooms.body.data.filter(function (item) {
    return item.type === "deal" && item.peer.id === 1;
  });
  assert.equal(samePair.length, 1);
  assert.equal(samePair[0].order.id, dealId);

  const mine = await call("GET", "/api/products/mine", { token: tokens.seller });
  for (const product of mine.body.data) {
    await call("POST", "/api/products/" + product.id + "/delist", { token: tokens.seller });
  }
  const noProducts = await initiateRoom(1);
  assert.equal(noProducts.body.data.has_products, false);
  assert.equal(noProducts.body.data.deal.id, dealId);
  assert.equal(noProducts.body.data.deal.deal_status, "PENDING_REVIEW");
});

test("對方沒有公開商品時只開純聊天房，且任何時候都能刪除", async function () {
  const room = await initiateRoom(3);
  assert.equal(room.status, 200);
  assert.equal(room.body.data.has_products, false);
  assert.equal(room.body.data.deal, null);
  assert.equal(room.body.data.conversation.order, null);
  assert.equal(room.body.data.conversation.deletable, true);

  const messages = await messagesOf(room.body.data.conversation.id, tokens.buyer);
  assert.equal(messages.some(function (m) { return m.text === "已開啟對話。"; }), true);

  const deleted = await call("DELETE", "/api/conversations/" + room.body.data.conversation.id, {
    token: tokens.buyer
  });
  assert.equal(deleted.status, 200);
});

test("反向交易建立另一間房，方向固定", async function () {
  const forward = await initiateRoom(1, tokens.buyer);
  const reverse = await initiateRoom(2, tokens.seller);

  assert.notEqual(forward.body.data.conversation.id, reverse.body.data.conversation.id);
  assert.equal(forward.body.data.conversation.peer.id, 1);
  assert.equal(reverse.body.data.conversation.peer.id, 2);
  assert.equal(reverse.body.data.has_products, false);
});
