/* 交易紀錄：列表、排序、角色、快照與空狀態。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { initiate, propose, respond } = require("./deal-helpers");
const { patch } = require("../lib/store");

const seen = {};

test.after(stop);

test.before(async function () {
  await start();

  const room1 = await initiate("prd_a", 1, tokens.buyer);
  seen.deal1 = room1.body.data.deal.id;
  await propose(seen.deal1, tokens.buyer);
  await respond(seen.deal1, "AGREE", tokens.seller);

  const room2 = await initiate("prd_b", 1, tokens.buyer);
  seen.deal2 = room2.body.data.deal.id;
  await propose(seen.deal2, tokens.buyer);

  const room3 = await initiate("prd_c", 1, tokens.third);
  seen.deal3 = room3.body.data.deal.id;
});

test("列表只含自己的訂單，依時間由新到舊", async function () {
  const result = await call("GET", "/api/deals", { token: tokens.buyer });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.length, 2);
  assert.equal(result.body.data[0].id, seen.deal2);
  assert.equal(result.body.data[1].id, seen.deal1);
  assert.ok(result.body.data[0].created_at >= result.body.data[1].created_at);
});

test("列表顯示品項數、金額、評價狀態與對方", async function () {
  const result = await call("GET", "/api/deals", { token: tokens.buyer });
  const row = result.body.data.find(function (item) { return item.id === seen.deal1; });
  assert.equal(row.deal_status, "CONFIRMED");
  assert.equal(row.role, "buyer");
  assert.equal(row.item_count, 1);
  assert.equal(row.total_quantity, 1);
  assert.equal(row.final_price, 1200);
  assert.equal(row.my_reviewed, false);
  assert.equal(row.peer.display_name, "釣客甲");
});

test("釣客從自己的角度看得到同一筆訂單", async function () {
  const result = await call("GET", "/api/deals", { token: tokens.seller });
  assert.equal(result.body.data.length, 2);
  const row = result.body.data.find(function (item) { return item.id === seen.deal1; });
  assert.equal(row.role, "seller");
  assert.equal(row.peer.display_name, "買家乙");
});

test("單筆詳情包含多品項快照與面交資訊", async function () {
  const result = await call("GET", "/api/deals/" + seen.deal1, { token: tokens.buyer });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.peer.display_name, "釣客甲");
  assert.equal(result.body.data.role, "buyer");
  assert.equal(result.body.data.items.length, 1);
  assert.match(result.body.data.items[0].title, /石斑/);
  assert.equal(result.body.data.deal_terms.meetup_location, "基隆火車站南站");
});

test("商品日後改價，歷史訂單快照不變", async function () {
  patch("products", "prd_a", { price: 9999 });

  const result = await call("GET", "/api/deals/" + seen.deal1, { token: tokens.buyer });
  assert.equal(result.body.data.items[0].unit_price, 1400);
  assert.ok(result.body.data.items[0].photo_url);
});

test("非參與者不能讀單筆訂單", async function () {
  const result = await call("GET", "/api/deals/" + seen.deal1, { token: tokens.third });
  assert.equal(result.status, 403);
});

test("沒有訂單時列表是空陣列", async function () {
  const registered = await call("POST", "/api/auth/register", {
    body: { username: "0955555555", password: "pw555", display_name: "新買家", city: "新北市" }
  });
  const result = await call("GET", "/api/deals", { token: registered.body.data.token });
  assert.deepEqual(result.body.data, []);
});

test("另一位使用者的列表不含別人的訂單", async function () {
  const result = await call("GET", "/api/deals", { token: tokens.third });
  assert.equal(result.body.data.length, 1);
  assert.equal(result.body.data[0].id, seen.deal3);
  assert.equal(result.body.data[0].peer.display_name, "釣客丁");
});
