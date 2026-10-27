/* 訂單狀態文案：前端只有 shared/deal-status.js 一份 map。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

const labels = await import("../assets/js/demo/deal-labels.js");

test("訂單、協議卡與狀態說明共用同一份文案", function () {
  assert.equal(labels.dealStatusLabel("DRAFT"), "訂單草稿");
  assert.equal(labels.dealStatusLabel("CONFIRMED"), "已成交");
  assert.equal(labels.dealStatusLabel("WHATEVER", "洽談中"), "洽談中");
  assert.equal(labels.cardStatusLabel("expired"), "已逾時");
  assert.equal(labels.cardStatusLabel("pending"), "等待確認");
  assert.equal(labels.dealStatusNote("PENDING_REVIEW"), "等待對方回覆（30 分鐘內）");
  assert.equal(labels.dealStatusNote("CONFIRMED"), "雙方已同意，交易成立");
});
