/* 協議與卡片同步測試共用：假 API、訂單摘要與卡片資料。 */

const calls = [];

globalThis.window = {
  HaisenAPI: {
    getToken: function () { return "token"; },
    request: async function (path) {
      calls.push(path);
      if (path === "/api/deals/deal_1") {
        return {
          data: {
            id: "deal_1",
            deal_status: "CONFIRMED",
            updated_at: "2026-10-27T10:00:05.000Z",
            review_status: { buyer_reviewed: true, seller_reviewed: false },
            items: []
          }
        };
      }
      throw new Error("unexpected request: " + path);
    }
  }
};

export const PENDING = {
  id: "deal_1",
  deal_status: "PENDING_REVIEW",
  updated_at: "2026-10-27T10:00:00.000Z",
  review_status: { buyer_reviewed: false, seller_reviewed: false },
  items: []
};

export const ROOM = {
  id: "conv_1",
  type: "deal",
  order: { id: "deal_1", status: "PENDING_REVIEW", item_count: 1, total_quantity: 1, final_price: 1200, updated_at: PENDING.updated_at },
  last_order: { id: "deal_1", status: "PENDING_REVIEW", item_count: 1, total_quantity: 1, final_price: 1200, updated_at: PENDING.updated_at },
  peer: { display_name: "對方" },
  mode: "HUMAN"
};

export function fresh(overrides) {
  return Object.assign({}, ROOM, overrides || {});
}

export function dealCard(status) {
  return {
    id: "msg_1",
    seq: 1,
    type: "card",
    sender_id: 2,
    created_at: "2026-10-27T09:00:00.000Z",
    card: {
      type: "deal", deal_id: "deal_1", status: status || "pending", initiator_id: 2,
      final_price: 1200, meetup_location: "基隆火車站", meetup_time: "2026-10-27T10:00:00.000Z", items: []
    }
  };
}

export function reviewCard(dealId) {
  return {
    id: "msg_2",
    seq: 2,
    type: "card",
    sender_id: "system",
    created_at: "2026-10-27T09:00:00.000Z",
    card: {
      type: "review", deal_id: dealId || "deal_1", buyer_id: 2, seller_id: 1,
      buyer_reviewed: false, seller_reviewed: false
    }
  };
}

export { calls };
