/* 交易房開啟流程：房間唯一性、訂單草稿加購、權限與系統訊息。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { createDb } = require("./fixture");

process.env.FISHMATCH_DB = createDb();
const app = require("../app");

let server = null;
let base = "";
const tokens = {};
const seen = {};

async function call(method, suffix, options) {
  const opts = options || {};
  const headers = {};
  if (opts.token) headers.Authorization = "Bearer " + opts.token;
  if (opts.body) headers["Content-Type"] = "application/json";
  const response = await fetch(base + suffix, {
    method: method,
    headers: headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  return { status: response.status, body: await response.json() };
}

async function initiate(productId, quantity, token) {
  return call("POST", "/api/deals/initiate-channel", {
    token: token || tokens.buyer,
    body: { product_id: productId, quantity: quantity }
  });
}

test.before(async function () {
  await new Promise(function (resolve) {
    server = app.listen(0, resolve);
  });
  base = "http://127.0.0.1:" + server.address().port;
  const accounts = [
    ["buyer", "0922222222", 2],
    ["seller", "0911111111", 1],
    ["third", "0933333333", 3]
  ];
  for (const account of accounts) {
    const result = await call("POST", "/api/auth/login", {
      body: { username: account[1], password: "pw" + account[2] }
    });
    tokens[account[0]] = result.body.data.token;
  }
});

test.after(function () {
  if (server) server.close();
});

test("買家開啟交易房並建立草稿訂單", async function () {
  const result = await initiate("prd_a", 1);
  assert.equal(result.status, 200);
  const data = result.body.data;
  assert.equal(data.conversation.type, "deal");
  assert.equal(data.conversation.peer.username, "0911111111");
  assert.equal(data.deal.deal_status, "DRAFT");
  assert.equal(data.deal.items.length, 1);
  assert.equal(data.deal.items[0].unit_price, 1400);
  assert.equal(data.conversation.order.item_count, 1);
  assert.equal(data.conversation.order.final_price, 1400);
  seen.conversation = data.conversation.id;
  seen.deal = data.deal.id;
});

test("釣客的對話清單會出現新交易房與未讀通知", async function () {
  const result = await call("GET", "/api/conversations", { token: tokens.seller });
  const room = result.body.data.find(function (item) { return item.id === seen.conversation; });
  assert.ok(room);
  assert.equal(room.type, "deal");
  assert.ok(room.unread_count >= 1);
  assert.equal(room.order.status, "DRAFT");
});

test("同一釣客的第二個商品進同一房、同一筆草稿", async function () {
  const result = await initiate("prd_b", 1);
  assert.equal(result.body.data.conversation.id, seen.conversation);
  assert.equal(result.body.data.deal.id, seen.deal);
  assert.equal(result.body.data.deal.items.length, 2);
  assert.equal(result.body.data.deal.items_total, 2930);
  assert.equal(result.body.data.conversation.order.item_count, 2);
});

test("同一商品再加購會累加尾數，不新增項目", async function () {
  const result = await initiate("prd_a", 1);
  assert.equal(result.body.data.deal.items.length, 2);
  assert.equal(result.body.data.deal.items[0].quantity, 2);
  assert.equal(result.body.data.deal.items_total, 4330);
});

test("不同釣客建立另一間房與另一筆訂單", async function () {
  const result = await initiate("prd_c", 1);
  assert.notEqual(result.body.data.conversation.id, seen.conversation);
  assert.notEqual(result.body.data.deal.id, seen.deal);
  assert.equal(result.body.data.deal.items.length, 1);
});

test("系統訊息有 seq，且看得到加入訂單的內容", async function () {
  const result = await call("GET", "/api/conversations/" + seen.conversation + "/messages", {
    token: tokens.buyer
  });
  const system = result.body.data.filter(function (message) { return message.type === "system"; });
  assert.ok(system.length >= 2);
  assert.ok(system.every(function (message) { return Number(message.seq) > 0; }));
  assert.ok(system.some(function (message) { return message.text.indexOf("已進入交易洽談") !== -1; }));
});

test("釣客送的訊息，買家用增量序號輪詢看得到", async function () {
  await call("POST", "/api/chat/message", {
    token: tokens.seller,
    body: { conversation_id: seen.conversation, text: "還有貨嗎" }
  });
  const before = await call("GET", "/api/conversations/" + seen.conversation + "/messages", {
    token: tokens.buyer
  });
  const lastSeq = Number(before.body.data[before.body.data.length - 1].seq);
  const result = await call("GET", "/api/conversations/" + seen.conversation + "/messages?after_seq=" + lastSeq, {
    token: tokens.buyer
  });
  assert.equal(result.body.data.length, 0);

  await call("POST", "/api/chat/message", {
    token: tokens.buyer,
    body: { conversation_id: seen.conversation, text: "有，想要 2 尾" }
  });
  const polled = await call("GET", "/api/conversations/" + seen.conversation + "/messages?after_seq=" + lastSeq, {
    token: tokens.seller
  });
  assert.equal(polled.body.data[0].text, "有，想要 2 尾");

  const list = await call("GET", "/api/conversations", { token: tokens.seller });
  const room = list.body.data.find(function (item) { return item.id === seen.conversation; });
  assert.equal(room.unread_count, 1);
});

test("房間參與者只有買家與釣客，第三人讀寫都被拒", async function () {
  const read = await call("GET", "/api/conversations/" + seen.conversation + "/messages", {
    token: tokens.third
  });
  assert.equal(read.status, 403);
  assert.equal(read.body.code, "FORBIDDEN");

  const write = await call("POST", "/api/chat/message", {
    token: tokens.third,
    body: { conversation_id: seen.conversation, text: "亂入" }
  });
  assert.equal(write.status, 403);
});

test("超過可售尾數回 409 並指出商品", async function () {
  const result = await initiate("prd_a", 3);
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "INSUFFICIENT_QUANTITY");
  assert.equal(result.body.product_id, "prd_a");
  assert.equal(result.body.in_draft, 2);
});

test("累計加入的尾數超過可售也回 409", async function () {
  const result = await initiate("prd_a", 1);
  assert.equal(result.status, 409);
  assert.equal(result.body.available, 2);
  assert.equal(result.body.in_draft, 2);
});

test("不能洽談自己上架的商品", async function () {
  const result = await initiate("prd_a", 1, tokens.seller);
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "OWN_PRODUCT");
});
