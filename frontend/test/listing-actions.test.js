/* 上架紀錄動作：按鈕依狀態顯示與確認。 */

import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  newContext, withRows, html, row, ACTIVE, DELISTED, SOLD
} from "./listing-action-fixtures.js";

test("動作按鈕依狀態顯示：上架中可下架、已下架可重新上架與刪除、已售出可刪除", function () {
  const harness = newContext();

  withRows(harness, [ACTIVE]);
  const active = html(harness);
  assert.match(active, /data-listing-action="delist"[^>]*>下架/);
  assert.doesNotMatch(active, /data-listing-action="relist"/);
  assert.doesNotMatch(active, /data-listing-action="delete"/);

  withRows(harness, [DELISTED]);
  vm.runInContext("listingHistory.tab = 'delisted'", harness.ctx);
  const delisted = html(harness);
  assert.match(delisted, /data-listing-action="relist"[^>]*>重新上架/);
  assert.match(delisted, /data-listing-action="delete"[^>]*>刪除/);

  withRows(harness, [SOLD]);
  vm.runInContext("listingHistory.tab = 'sold'", harness.ctx);
  const sold = html(harness);
  assert.match(sold, /data-listing-action="delete"[^>]*>刪除/);
  assert.doesNotMatch(sold, /data-listing-action="relist"/);
});

test("已下架但沒有未售尾數時只顯示刪除", function () {
  const harness = newContext();
  const noStock = row("prd_no_stock", {
    quantity: 2, sold_quantity: 2, delisted_at: "2026-11-09T05:00:00.000Z",
    available: 0, status: "DELISTED"
  });
  withRows(harness, [noStock]);
  vm.runInContext("listingHistory.tab = 'delisted'", harness.ctx);
  const markup = html(harness);
  assert.doesNotMatch(markup, /data-listing-action="relist"/);
  assert.match(markup, /data-listing-action="delete"/);
});

test("下架經確認後呼叫 API、顯示 toast 並重新載入", async function () {
  const harness = newContext();
  withRows(harness, [ACTIVE]);

  assert.doesNotMatch(html(harness), /確定下架|data-listing-cancel/);

  await vm.runInContext("listingAction('delist', 'prd_active')", harness.ctx);
  assert.deepEqual(harness.calls, [{ action: "delist", id: "prd_active" }]);
  assert.equal(harness.confirms.length, 1);
  assert.match(harness.confirms[0], /確定下架？/);
  assert.deepEqual(harness.toasts, ["已下架"]);
  assert.deepEqual(harness.events, ["haisen:products-changed"]);
  assert.equal(harness.state.loads, 1);
});

test("確認按取消時不呼叫 API", async function () {
  const harness = newContext({ confirm: false });
  withRows(harness, [ACTIVE]);

  await vm.runInContext("listingAction('delist', 'prd_active')", harness.ctx);

  assert.equal(harness.calls.length, 0);
  assert.equal(harness.confirms.length, 1);
});
