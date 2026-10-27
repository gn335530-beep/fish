/* 前端會員快取：不再保存 role，orders 只取 completed_deals。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = function (path) { return fs.readFileSync(new URL(path, import.meta.url), "utf8"); };
const clientSource = read("../assets/js/api/client.js");
const authSource = read("../assets/js/api/auth.js");
const loginSource = read("../assets/js/pages/login.js");

function context() {
  const ctx = vm.createContext({
    window: {},
    localStorage: {
      getItem: function () { return null; },
      setItem: function () {},
      removeItem: function () {}
    }
  });
  vm.runInContext(clientSource, ctx);
  return ctx;
}

test("前端會員快取不再有 role，也不 fallback 到 completed_orders", function () {
  const ctx = context();
  const user = vm.runInContext(
    "window.HaisenAPI.toLocalUser({ completed_deals: 5, completed_orders: 9 })",
    ctx
  );

  assert.equal(Object.prototype.hasOwnProperty.call(user, "role"), false);
  assert.equal(user.orders, 5);
});

test("原始碼不再送出或提到 role 與 completed_orders", function () {
  assert.doesNotMatch(clientSource, /role\s*:|completed_orders/);
  assert.doesNotMatch(authSource, /role\s*:|completed_orders/);
  assert.doesNotMatch(loginSource, /role\s*:/);
});
