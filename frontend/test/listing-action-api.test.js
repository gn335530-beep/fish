/* 上架紀錄動作：重新上架與失敗回饋。 */

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { newContext, withRows, DELISTED, SOLD } from "./listing-action-fixtures.js";

test("重新上架不跳確認，直接呼叫 API 並顯示成功訊息", async function () {
  const harness = newContext();
  withRows(harness, [DELISTED]);
  vm.runInContext("listingHistory.tab = 'delisted'", harness.ctx);

  await vm.runInContext("listingAction('relist', 'prd_delisted')", harness.ctx);

  assert.deepEqual(harness.calls, [{ action: "relist", id: "prd_delisted" }]);
  assert.equal(harness.confirms.length, 0);
  assert.deepEqual(harness.toasts, ["已重新上架"]);
  assert.equal(harness.state.loads, 1);
});

test("刪除失敗時顯示後端訊息並重新載入列表", async function () {
  const harness = newContext({ failure: "請先下架商品" });
  withRows(harness, [SOLD]);
  vm.runInContext("listingHistory.tab = 'sold'", harness.ctx);

  await vm.runInContext("listingAction('delete', 'prd_sold')", harness.ctx);

  assert.deepEqual(harness.calls, [{ action: "delete", id: "prd_sold" }]);
  assert.deepEqual(harness.toasts, ["請先下架商品"]);
  assert.equal(harness.state.loads, 1);
});
