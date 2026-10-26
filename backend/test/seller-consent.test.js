/* 販賣確認：第一次寫入時間、重複呼叫不覆寫、未登入拒絕。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");

test.before(start);
test.after(stop);

test("未確認使用者的 seller_terms_accepted_at 是 null", async function () {
  const me = await call("GET", "/api/auth/me", { token: tokens.seller });
  assert.equal(me.body.data.seller_terms_accepted_at, null);
});

test("第一次確認寫入時間，重複呼叫不覆寫", async function () {
  const first = await call("POST", "/api/users/seller-consent", { token: tokens.seller });
  assert.equal(first.status, 200);
  assert.ok(first.body.data.user.seller_terms_accepted_at);
  const stamp = first.body.data.user.seller_terms_accepted_at;

  const second = await call("POST", "/api/users/seller-consent", { token: tokens.seller });
  assert.equal(second.status, 200);
  assert.equal(second.body.data.user.seller_terms_accepted_at, stamp);

  const me = await call("GET", "/api/auth/me", { token: tokens.seller });
  assert.equal(me.body.data.seller_terms_accepted_at, stamp);
});

test("未登入不能記錄販賣確認", async function () {
  const result = await call("POST", "/api/users/seller-consent");
  assert.equal(result.status, 401);
  assert.equal(result.body.code, "UNAUTHORIZED");
});
