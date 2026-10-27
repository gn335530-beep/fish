/* 卡片同步：協議卡與評價卡跟著目前訂單狀態顯示。 */

import test from "node:test";
import assert from "node:assert/strict";
import { PENDING, ROOM, dealCard, reviewCard } from "./deal-sync-helpers.js";

const { update } = await import("../assets/js/demo/store.js");
const messages = await import("../assets/js/demo/views/messages.js");

test("舊的協議卡跟著目前訂單顯示成交且沒有操作", function () {
  update({
    user: { id: 1 },
    room: Object.assign({}, ROOM, { order: null }),
    deal: Object.assign({}, PENDING, { deal_status: "CONFIRMED" }),
    messages: [dealCard("pending")]
  });

  const html = messages.renderMessages();

  assert.match(html, /已成交/);
  assert.doesNotMatch(html, /等待確認/);
  assert.doesNotMatch(html, /deal-agree|deal-reject|deal-cancel/);
});

test("舊的評價卡跟著訂單顯示已評價", function () {
  update({
    user: { id: 2 },
    room: Object.assign({}, ROOM, { order: null }),
    deal: Object.assign({}, PENDING, {
      deal_status: "CONFIRMED",
      review_status: { buyer_reviewed: true, seller_reviewed: false }
    }),
    messages: [reviewCard()]
  });

  const html = messages.renderMessages();

  assert.match(html, /已評價/);
  assert.doesNotMatch(html, /deal-review/);
});

test("同一房間有更新的訂單時，舊訂單評價卡仍會更新", function () {
  update({
    user: { id: 2 },
    room: {
      id: "conv_1",
      type: "deal",
      order: { id: "deal_2", status: "DRAFT" },
      last_order: { id: "deal_2", status: "DRAFT", updated_at: "2026-10-27T11:00:00.000Z" },
      orders: [
        {
          id: "deal_2", status: "DRAFT", updated_at: "2026-10-27T11:00:00.000Z",
          review_status: { buyer_reviewed: false, seller_reviewed: false }
        },
        {
          id: "deal_1", status: "CONFIRMED", updated_at: "2026-10-27T10:00:05.000Z",
          review_status: { buyer_reviewed: true, seller_reviewed: false }
        }
      ]
    },
    deal: { id: "deal_2", deal_status: "DRAFT", updated_at: "2026-10-27T11:00:00.000Z" },
    messages: [reviewCard()]
  });

  const html = messages.renderMessages();

  assert.match(html, /已評價/);
  assert.doesNotMatch(html, /deal-review/);
});

test("逾時的協議卡跟著訂單顯示已逾時，不是已取消", function () {
  update({
    user: { id: 1 },
    room: Object.assign({}, ROOM, { order: null }),
    deal: Object.assign({}, PENDING, { deal_status: "CANCELLED", cancel_reason: "LOCK_EXPIRED" }),
    messages: [dealCard("pending")]
  });

  const html = messages.renderMessages();

  assert.match(html, /已逾時/);
  assert.doesNotMatch(html, /已取消/);
  assert.doesNotMatch(html, /deal-agree|deal-reject|deal-cancel/);
});

test("較早的協議卡維持歷史狀態，不跟著新狀態走", function () {
  const older = dealCard("rejected");
  older.id = "msg_old";
  older.seq = 1;
  const newer = dealCard("confirmed");
  newer.id = "msg_new";
  newer.seq = 2;
  update({
    user: { id: 1 },
    room: ROOM,
    deal: Object.assign({}, PENDING, { deal_status: "CONFIRMED" }),
    messages: [older, newer]
  });

  const html = messages.renderMessages();

  assert.match(html, /已退回/);
  assert.match(html, /已成交/);
});
