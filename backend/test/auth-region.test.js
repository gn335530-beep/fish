/* 註冊縣市：必填、清單驗證、「臺」正規化，以及個人檔案縣市。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");

test.before(start);
test.after(stop);

function register(overrides) {
  return call("POST", "/api/auth/register", {
    body: Object.assign({
      username: "0988000001",
      password: "secret1",
      display_name: "海女",
      city: "新北市"
    }, overrides || {})
  });
}

test("註冊沒填縣市回 400 MISSING_REGION", async function () {
  const result = await register({ username: "0988000002", city: "" });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "MISSING_REGION");
});

test("不在縣市清單回 400 INVALID_REGION", async function () {
  const result = await register({ username: "0988000003", city: "火星市" });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "INVALID_REGION");
});

test("臺北市入庫與回應為台北市，登入與 me 也一致", async function () {
  const created = await register({ username: "0988000004", city: "臺北市" });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.user.city, "台北市");
  assert.equal(created.body.data.user.region, "台北市");

  const me = await call("GET", "/api/auth/me", { token: created.body.data.token });
  assert.equal(me.body.data.city, "台北市");

  const login = await call("POST", "/api/auth/login", {
    body: { username: "0988000004", password: "secret1" }
  });
  assert.equal(login.body.data.user.city, "台北市");
});

test("個人檔案縣市驗證並正規化", async function () {
  const normalized = await call("PUT", "/api/users/profile", {
    token: tokens.buyer,
    body: { city: "臺中市" }
  });
  assert.equal(normalized.status, 200);
  assert.equal(normalized.body.data.city, "台中市");

  const invalid = await call("PUT", "/api/users/profile", {
    token: tokens.buyer,
    body: { city: "火星市" }
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, "INVALID_REGION");
});
