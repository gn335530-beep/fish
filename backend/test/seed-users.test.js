/* 種子資料：每位使用者都有固定且合法的縣市，啟動不需再補值。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { CITIES } = require("../lib/regions");

const seed = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "db.seed.json"), "utf8")
);

test("每位種子使用者都有合法縣市", function () {
  assert.ok(seed.users.length > 0);
  for (const user of seed.users) {
    assert.ok(user.city, "使用者 " + user.id + " 缺少縣市");
    assert.ok(CITIES.indexOf(user.city) !== -1, "使用者 " + user.id + " 縣市不合法：" + user.city);
  }
});
