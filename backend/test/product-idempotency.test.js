/* 商品建立冪等：同釣客同 client_request_id 只建立一筆，重送回同一商品。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { create } = require("./product-helpers");

test.before(start);
test.after(stop);

function mineOf(token) {
  return call("GET", "/api/products/mine", { token: token });
}

test("同釣客同 client_request_id 重送回 200 同一商品，不新增第二筆", async function () {
  const key = "pub_same_key";
  const before = await mineOf(tokens.seller);
  const first = await create({ client_request_id: key });
  const afterFirst = await mineOf(tokens.seller);
  const second = await create({ client_request_id: key });
  const afterSecond = await mineOf(tokens.seller);

  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(second.body.data.id, first.body.data.id);
  assert.equal(second.body.data.title, first.body.data.title);
  assert.equal(afterFirst.body.data.length, before.body.data.length + 1);
  assert.equal(afterSecond.body.data.length, before.body.data.length + 1);
  assert.equal(first.body.data.client_request_id, undefined);
  assert.equal(second.body.data.client_request_id, undefined);

  const mine = await mineOf(tokens.seller);
  const rows = mine.body.data.filter(function (row) { return row.id === first.body.data.id; });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].client_request_id, undefined);

  const detail = await call("GET", "/api/products/" + first.body.data.id);
  assert.equal(detail.body.data.client_request_id, undefined);
  const list = await call("GET", "/api/products");
  const publicRow = list.body.data.find(function (row) { return row.id === first.body.data.id; });
  assert.equal(publicRow.client_request_id, undefined);
});

test("不同 client_request_id 建立兩筆商品", async function () {
  const first = await create({ client_request_id: "pub_diff_a" });
  const second = await create({ client_request_id: "pub_diff_b" });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.notEqual(first.body.data.id, second.body.data.id);
});

test("沒有 client_request_id 時維持可建立多筆商品", async function () {
  const first = await create();
  const second = await create();

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.notEqual(first.body.data.id, second.body.data.id);
});

test("相同 client_request_id 由不同釣客使用互不影響", async function () {
  const key = "pub_shared";
  const first = await create({ client_request_id: key });
  const second = await create({ client_request_id: key }, tokens.otherSeller);

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.notEqual(first.body.data.id, second.body.data.id);
  assert.equal(second.body.data.seller_id, 4);
});

test("空白或格式不合法的 client_request_id 視同沒有帶", async function () {
  const first = await create({ client_request_id: "not valid!" });
  const second = await create({ client_request_id: "not valid!" });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.notEqual(first.body.data.id, second.body.data.id);

  const spaced = await create({ client_request_id: "  pub_spaced  " });
  const spacedAgain = await create({ client_request_id: "  pub_spaced  " });
  assert.equal(spaced.status, 201);
  assert.equal(spacedAgain.status, 201);
  assert.notEqual(spaced.body.data.id, spacedAgain.body.data.id);

  const tooLong = "a".repeat(81);
  const long = await create({ client_request_id: tooLong });
  const longAgain = await create({ client_request_id: tooLong });
  assert.equal(long.status, 201);
  assert.equal(longAgain.status, 201);
  assert.notEqual(long.body.data.id, longAgain.body.data.id);
});

test("同識別碼搭配不同內容時回傳第一次建立的商品", async function () {
  const key = "pub_first_wins";
  const first = await create({ client_request_id: key, fish_species: "石斑", quantity: 1 });
  const second = await create({
    client_request_id: key,
    fish_species: "花枝",
    quantity: 3,
    price: 2000
  });

  assert.equal(second.status, 200);
  assert.equal(second.body.data.id, first.body.data.id);
  assert.equal(second.body.data.fish_species, "石斑");
  assert.equal(second.body.data.quantity, 1);
});

test("商品硬刪後不保留識別碼，同識別碼可建立新商品", async function () {
  const key = "pub_deleted";
  const first = await create({ client_request_id: key });
  await call("POST", "/api/products/" + first.body.data.id + "/delist", { token: tokens.seller });
  const removed = await call("DELETE", "/api/products/" + first.body.data.id, { token: tokens.seller });

  assert.equal(removed.status, 200);
  const second = await create({ client_request_id: key });
  assert.equal(second.status, 201);
  assert.notEqual(second.body.data.id, first.body.data.id);
});
