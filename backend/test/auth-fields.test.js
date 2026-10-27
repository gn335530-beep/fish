/* 會員欄位：role 與 completed_orders 不再出現在任何會員回應。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { patch } = require("../lib/store");

test.before(start);
test.after(stop);

function assertNoLegacyFields(user) {
  assert.ok(user);
  assert.equal(Object.prototype.hasOwnProperty.call(user, "role"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(user, "completed_orders"), false);
  assert.equal(typeof user.completed_deals, "number");
}

test("註冊、登入與 me 回應都不含 role 與 completed_orders", async function () {
  const created = await call("POST", "/api/auth/register", {
    body: {
      username: "0988000099",
      password: "secret9",
      display_name: "新會員",
      city: "新北市",
      role: "SELLER"
    }
  });
  assert.equal(created.status, 201);
  assertNoLegacyFields(created.body.data.user);

  const login = await call("POST", "/api/auth/login", {
    body: { username: "0988000099", password: "secret9" }
  });
  assert.equal(login.status, 200);
  assertNoLegacyFields(login.body.data.user);

  const me = await call("GET", "/api/auth/me", { token: created.body.data.token });
  assert.equal(me.status, 200);
  assertNoLegacyFields(me.body.data);
});

test("舊資料即使有 role 與 completed_orders 也不外洩", async function () {
  patch("users", 2, { role: "SELLER", completed_orders: 9 });

  const me = await call("GET", "/api/auth/me", { token: tokens.buyer });
  assertNoLegacyFields(me.body.data);

  const login = await call("POST", "/api/auth/login", {
    body: { username: "0922222222", password: "pw2" }
  });
  assertNoLegacyFields(login.body.data.user);
});
