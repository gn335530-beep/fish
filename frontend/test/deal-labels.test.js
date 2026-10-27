/* 訂單狀態：文案、卡片對應、可操作清單與逾時原因只有共用模組一份。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

globalThis.window = {};

await import("../assets/js/shared/deal-status.js");
const shared = globalThis.window.DealStatus;
const labels = await import("../assets/js/demo/deal-labels.js");
const state = await import("../assets/js/demo/deal-state.js");

test("每個訂單狀態都有顯示文案與卡片對應，草稿沒有協議卡", function () {
  Object.keys(shared.DEAL).forEach(function (status) {
    assert.ok(labels.dealStatusLabel(status), status);
    assert.ok(Object.prototype.hasOwnProperty.call(shared.CARD_STATUS, status), status);
  });
  assert.equal(shared.CARD_STATUS.DRAFT, null);
});

test("每個可出現的協議卡狀態都有文案並對應到訂單狀態", function () {
  Object.keys(shared.CARD).forEach(function (cardStatus) {
    assert.ok(labels.cardStatusLabel(cardStatus), cardStatus);
    const dealStatus = shared.CARD_ORDER_STATUS[cardStatus];
    assert.ok(dealStatus, cardStatus);
    assert.ok(shared.DEAL[dealStatus], cardStatus + " -> " + dealStatus);
  });
});

test("逾時原因顯示已逾時，不是已取消", function () {
  assert.equal(state.cardStatusForDeal({ deal_status: "CANCELLED", cancel_reason: "LOCK_EXPIRED" }), "expired");
  assert.equal(state.cardStatusForDeal({ deal_status: "CANCELLED", cancel_reason: "HOLD_EXPIRED" }), "expired");
  assert.equal(state.cardStatusForDeal({ deal_status: "CANCELLED", cancel_reason: "OTHER" }), "cancelled");
  assert.equal(labels.cardStatusLabel("expired"), "已逾時");
});

test("可操作、可重送與已結束只由共用模組判定", function () {
  assert.equal(state.isActionable({ deal_status: "PENDING_REVIEW" }), true);
  assert.equal(state.isActionable({ deal_status: "NEGOTIATING" }), true);
  assert.equal(state.isActionable({ deal_status: "CONFIRMED" }), false);
  assert.equal(state.canResend({ deal_status: "NEGOTIATING", rejected_by: 2 }, 2), true);
  assert.equal(state.canResend({ deal_status: "PENDING_REVIEW", rejected_by: 2 }, 2), false);
  assert.equal(state.isPendingCard("pending"), true);
  assert.equal(state.isPendingCard("confirmed"), false);
  assert.equal(state.isFinished({ deal_status: "CONFIRMED" }), true);
  assert.equal(state.isFinished("CANCELLED"), true);
  assert.equal(state.isFinished({ deal_status: "DRAFT" }), false);
});

test("demo 層不再保留自己的狀態字串或規則", function () {
  const dir = new URL("../assets/js/demo", import.meta.url);
  const tokens = [
    "\"DRAFT\"", "\"PENDING_REVIEW\"", "\"NEGOTIATING\"", "\"CONFIRMED\"", "\"CANCELLED\"",
    "\"LOCK_EXPIRED\"", "\"HOLD_EXPIRED\"",
    "\"pending\"", "\"rejected\"", "\"confirmed\"", "\"cancelled\"", "\"expired\""
  ];
  const files = fs.readdirSync(dir, { recursive: true })
    .filter(function (file) { return file.endsWith(".js"); });
  files.forEach(function (file) {
    const source = fs.readFileSync(new URL(file, dir.href + "/"), "utf8");
    tokens.forEach(function (token) {
      assert.equal(source.indexOf(token), -1, file + ": " + token);
    });
  });
});
