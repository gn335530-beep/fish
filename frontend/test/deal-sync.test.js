/* 協議輪詢同步：last_order 狀態或時間改變時重取訂單。 */

import test from "node:test";
import assert from "node:assert/strict";
import { calls, PENDING, ROOM, fresh, dealCard } from "./deal-sync-helpers.js";

const { state, update } = await import("../assets/js/demo/store.js");
const poll = await import("../assets/js/demo/poll.js");

test("輪詢看到 last_order 狀態或時間改變就重取訂單", async function () {
  calls.length = 0;
  update({
    user: { id: 1 },
    room: Object.assign({}, ROOM),
    deal: Object.assign({}, PENDING),
    messages: [dealCard("pending")],
    conversations: [fresh({
      order: null,
      last_order: { id: "deal_1", status: "CONFIRMED", item_count: 1, total_quantity: 1, final_price: 1200, updated_at: "2026-10-27T10:00:05.000Z" }
    })]
  });

  await poll.syncOpenRoom();

  assert.deepEqual(calls, ["/api/deals/deal_1"]);
  assert.equal(state.deal.deal_status, "CONFIRMED");
  assert.equal(state.room.order, null);
  assert.equal(state.room.last_order.status, "CONFIRMED");
});

test("last_order 沒變就不重取訂單", async function () {
  calls.length = 0;
  const confirmed = Object.assign({}, PENDING, {
    deal_status: "CONFIRMED",
    updated_at: "2026-10-27T10:00:05.000Z"
  });
  update({
    user: { id: 1 },
    room: Object.assign({}, ROOM, {
      order: null,
      last_order: { id: "deal_1", status: "CONFIRMED", updated_at: confirmed.updated_at }
    }),
    deal: confirmed,
    conversations: [fresh({
      order: null,
      last_order: { id: "deal_1", status: "CONFIRMED", updated_at: confirmed.updated_at }
    })]
  });

  await poll.syncOpenRoom();

  assert.deepEqual(calls, []);
});
