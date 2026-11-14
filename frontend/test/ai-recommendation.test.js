/* 商品推薦：文字＋商品卡、context 進入 shopping，後續「第 2 個」可接續。 */

import test from "node:test";
import assert from "node:assert/strict";
import { USER_CITY, IDLE, createMessageFactory, installApi } from "./ai-fixtures.js";

let requests = [];
let aiReply = null;

const messageOf = createMessageFactory();

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

installApi({
  messageOf: messageOf,
  onRequest: function (path, body) {
    requests.push({ path: path, body: body });
  },
  handle: async function (path) {
    if (path === "/api/ai/reply") return { data: aiReply };
    if (path === "/api/products/prd_2") return { data: product("prd_2", "黑鯛") };
    throw new Error("unexpected path: " + path);
  }
});

const store = await import("../assets/js/demo/store.js");
const flow = await import("../assets/js/demo/flow.js");

flow.initFlow({
  render: function () {},
  scrollEnd: function () {},
  scrollToBatch: function () {},
  notify: function (error) { throw error; }
});

test.beforeEach(function () {
  messageOf.reset();
  requests = [];
  aiReply = { handled: false };
  store.update({
    user: USER_CITY,
    room: { id: "conv_1", type: "assistant", context: IDLE },
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

test("規則判為 BUY 時仍採用後端 PRODUCT_RECOMMEND 與工具商品卡", async function () {
  aiReply = {
    handled: true,
    intent: "PRODUCT_RECOMMEND",
    reply_text: "找到澎湖的現流石斑。",
    slots: {},
    sources: [],
    tool_results: { products: [product("prd_1", "石斑")] }
  };

  await flow.submitText("有沒有澎湖的魚");

  const cards = store.state.messages.filter(function (message) {
    return message.card && message.card.type === "product";
  });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].card.product_id, "prd_1");
  assert.equal(store.state.room.context.mode, "shopping");
  assert.deepEqual(store.state.room.context.last_cards, ["prd_1"]);
  const text = store.state.messages.filter(function (message) {
    return message.sender_id === "ai";
  }).map(function (message) { return message.text; }).join("\n");
  assert.match(text, /找到澎湖的現流石斑/);
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
