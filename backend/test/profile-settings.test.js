/* 設定頁後端：電話格式與唯一、頭像白名單、一次更新多欄位，token 不因改電話失效。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");

test.before(start);
test.after(stop);

test("電話格式錯誤回 400 INVALID_PHONE", async function () {
  const result = await call("PUT", "/api/users/profile", {
    token: tokens.otherSeller,
    body: { phone: "0812345678" }
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "INVALID_PHONE");
});

test("電話重複回 409 PHONE_TAKEN", async function () {
  const result = await call("PUT", "/api/users/profile", {
    token: tokens.third,
    body: { phone: "0911111111" }
  });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "PHONE_TAKEN");
});

test("一次更新暱稱、電話、頭像與地址，token 仍有效且可用新電話登入", async function () {
  const updated = await call("PUT", "/api/users/profile", {
    token: tokens.buyer,
    body: {
      display_name: "小魚新名字",
      phone: "0955555555",
      avatar_url: "/uploads/buyer-avatar.jpg",
      city: "臺中市",
      district: "西區",
      address_line: "公益路 1 號"
    }
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.display_name, "小魚新名字");
  assert.equal(updated.body.data.username, "0955555555");
  assert.equal(updated.body.data.avatar_url, "/uploads/buyer-avatar.jpg");
  assert.equal(updated.body.data.city, "台中市");
  assert.equal(updated.body.data.district, "西區");
  assert.equal(updated.body.data.address_line, "公益路 1 號");

  const me = await call("GET", "/api/auth/me", { token: tokens.buyer });
  assert.equal(me.status, 200);
  assert.equal(me.body.data.username, "0955555555");

  const login = await call("POST", "/api/auth/login", {
    body: { username: "0955555555", password: "pw2" }
  });
  assert.equal(login.status, 200);

  const oldLogin = await call("POST", "/api/auth/login", {
    body: { username: "0922222222", password: "pw2" }
  });
  assert.equal(oldLogin.status, 401);
});

test("頭像只接受 /uploads/... 或空字串，空字串代表移除", async function () {
  const invalid = await call("PUT", "/api/users/profile", {
    token: tokens.seller,
    body: { avatar_url: "https://example.com/a.jpg" }
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, "INVALID_AVATAR");

  const saved = await call("PUT", "/api/users/profile", {
    token: tokens.seller,
    body: { avatar_url: "/uploads/seller-avatar.jpg" }
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.avatar_url, "/uploads/seller-avatar.jpg");

  const removed = await call("PUT", "/api/users/profile", {
    token: tokens.seller,
    body: { avatar_url: "" }
  });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.avatar_url, "");
});

test("縣市必填且需在既有清單，暱稱仍為 2 到 20 字", async function () {
  const noCity = await call("PUT", "/api/users/profile", {
    token: tokens.third,
    body: { city: "" }
  });
  assert.equal(noCity.status, 400);
  assert.equal(noCity.body.code, "INVALID_REGION");

  const badCity = await call("PUT", "/api/users/profile", {
    token: tokens.third,
    body: { city: "火星市" }
  });
  assert.equal(badCity.status, 400);
  assert.equal(badCity.body.code, "INVALID_REGION");

  const shortName = await call("PUT", "/api/users/profile", {
    token: tokens.third,
    body: { display_name: "甲" }
  });
  assert.equal(shortName.status, 400);
  assert.equal(shortName.body.code, "INVALID_NICKNAME");
});
