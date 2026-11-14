/* 商品推薦：文字＋商品卡、context 進入 shopping，後續「第 2 個」可接續。 */

import test from "node:test";
import assert from "node:assert/strict";

let seq = 0;
let requests = [];
let aiReply = null;

function messageOf(body) {
  seq += 1;
  return {
    id: "msg_" + seq,
    seq: seq,
    conversation_id: body.conversation_id,
    sender_id: body.sender_type === "ai" ? "ai" : 2,
    type: body.card ? "card" : "text",
    text: body.text || "",
    card: body.card || null,
    created_at: "2026-11-14T00:00:00.000Z"
  };
}

function product(id, name) {
  return {
    id: id,
    fish_species: name,
    photo_url: "/uploads/" + id + ".jpg",
    price: 1000,
    price_per_taijin: 200,
    quantity: 2,
    available: 2,
    reserved_quantity: 0,
    condition: "放血冰鎮",
    region: "高雄市",
    status: "ACTIVE"
  };
}

globalThis.window = {
  HaisenAPI: {
    getToken: function () { return "token"; },
    BASE: "http://api.test",
    request: async function (path, options) {
      requests.push({ path: path, body: options && options.body });
      if (path === "/api/chat/message") return { data: messageOf((options && options.body) || {}) };
      if (path === "/api/ai/reply") return { data: aiReply };
      if (path === "/api/products/prd_2") return { data: product("prd_2", "黑鯛") };
      throw new Error("unexpected path: " + path);
    }
  }
};

const store = await import("../assets/js/demo/store.js");
const flow = await import("../assets/js/demo/flow.js");

flow.initFlow({
  render: function () {},
  scrollEnd: function () {},
  scrollToBatch: function () {},
  notify: function (error) { throw error; }
});

test.beforeEach(function () {
  seq = 0;
  requests = [];
  aiReply = { handled: false };
  store.update({
    user: { id: 2, city: "高雄市", seller_terms_accepted_at: "2026-10-27T00:00:00.000Z" },
    room: { id: "conv_1", type: "assistant", context: { mode: "idle", draft: null, last_cards: [] } },
    messages: [],
    lastSeq: 0,
    aiPending: 0
  });
});

test("PRODUCT_RECOMMEND 寫入文字與商品卡，context 進入 shopping", async function () {
  aiReply = {
    handled: true,
    intent: "PRODUCT_RECOMMEND",
    reply_text: "這兩批石斑與黑鯛都適合乾煎。",
    slots: {},
    sources: [],
    tool_results: { products: [product("prd_1", "石斑"), product("prd_2", "黑鯛")] }
  };

  await flow.submitText("有什麼適合乾煎的魚");

  const cards = store.state.messages.filter(function (message) {
    return message.card && message.card.type === "product";
  });
  assert.equal(cards.length, 2);
  assert.equal(store.state.room.context.mode, "shopping");
  assert.deepEqual(store.state.room.context.last_cards, ["prd_1", "prd_2"]);
  assert.doesNotMatch(JSON.stringify(store.state.messages), /"location"|"phone"|"address"/);
});

test("推薦後說「第 2 個」會接續上一批商品卡", async function () {
  aiReply = {
    handled: true,
    intent: "PRODUCT_RECOMMEND",
    reply_text: "推薦這兩批。",
    slots: {},
    sources: [],
    tool_results: { products: [product("prd_1", "石斑"), product("prd_2", "黑鯛")] }
  };
  await flow.submitText("有什麼適合乾煎的魚");

  aiReply = { handled: false, error_code: "LLM_DISABLED", retryable: false };
  await flow.submitText("第 2 個");

  assert.equal(store.state.room.context.selected_product_id, "prd_2");
  const text = store.state.messages.filter(function (message) {
    return message.sender_id === "ai";
  }).map(function (message) { return message.text; }).join("\n");
  assert.match(text, /第 2 個商品/);
  assert.match(text, /黑鯛/);
});
