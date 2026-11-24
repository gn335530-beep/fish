/* 魚種槽位模型優先：行情與導購以模型的 species_code 為先，名稱與規則式抽取只作 fallback。 */

import test from "node:test";
import assert from "node:assert/strict";
import { setupAiTest, USER_CITY } from "./ai-fixtures.js";

const CATALOG = [
  { species_code: 2141, official_name: "土魠", aliases: ["土魠魚"] },
  { species_code: 2722, official_name: "黑鯛", aliases: [] },
  { species_code: 2201, official_name: "石斑魚", aliases: [] }
];

const PRODUCTS = [
  { id: "prd_a", fish_species: "石斑魚", region: "高雄市", quantity: 2, price: 1000, condition: "活體" },
  { id: "prd_b", fish_species: "黑鯛", region: "高雄市", quantity: 2, price: 900, condition: "活體" }
];

let aiReply = null;
let marketError = null;

const ai = await setupAiTest({
  user: USER_CITY,
  handle: async function (path) {
    if (path === "/api/ai/reply") return { data: aiReply };
    if (path.indexOf("/api/market/codes") === 0) {
      return { data: { query: null, candidates: CATALOG } };
    }
    if (path.indexOf("/api/market/prices") === 0) {
      if (marketError) throw marketError;
      return { data: { found: false } };
    }
    if (path.indexOf("/api/market/quote") === 0) return { data: { found: false } };
    if (path.indexOf("/api/products") === 0) return { data: PRODUCTS };
    throw new Error("unexpected path: " + path);
  }
});

const store = ai.store;
const flow = ai.flow;
const requests = ai.requests;

function reply(intent, slots) {
  return {
    handled: true, intent: intent, slots: slots || {},
    reply_text: "AI 的回覆", sources: [], tool_results: {}
  };
}

function marketCall() {
  const entry = requests.find(function (item) {
    return item.path.indexOf("/api/market/quote") === 0 ||
      item.path.indexOf("/api/market/prices") === 0;
  });
  return entry ? decodeURIComponent(entry.path) : "";
}

function productCards() {
  return store.state.messages.filter(function (message) {
    return message.card && message.card.type === "product";
  }).map(function (message) { return message.card.product_id; });
}

function assistantText() {
  return store.state.messages.filter(function (message) {
    return message.sender_id === "ai";
  }).map(function (message) { return message.text || ""; }).join("\n");
}

test.beforeEach(function () {
  ai.reset();
  aiReply = { handled: false };
  marketError = null;
});

test("行情：模型只給 species_code 時依代碼查價，不採句子裡的魚名", async function () {
  aiReply = reply("MARKET", { species_code: 2141 });
  await flow.submitText("我想要知道土魠的價格");
  const url = marketCall();
  assert.match(url, /^\/api\/market\/prices\?/);
  assert.match(url, /code=2141/);
  assert.doesNotMatch(url, /q=/);
});

test("行情：同時有 species_code 與 fish_species 時以代碼為準", async function () {
  aiReply = reply("MARKET", { fish_species: "土魠", species_code: 2141 });
  await flow.submitText("土魠多少錢");
  assert.match(marketCall(), /^\/api\/market\/prices\?/);
});

test("行情：模型只給 fish_species 時依名稱查價", async function () {
  aiReply = reply("MARKET", { fish_species: "土魠" });
  await flow.submitText("土魠多少錢");
  const url = marketCall();
  assert.match(url, /^\/api\/market\/quote\?/);
  assert.match(url, /q=土魠/);
});

test("行情：模型沒給魚種時仍由規則式抽取查價", async function () {
  aiReply = reply("MARKET", {});
  await flow.submitText("土魠多少錢");
  const url = marketCall();
  assert.match(url, /^\/api\/market\/quote\?/);
  assert.match(url, /q=土魠/);
});

test("行情：模型給的代碼查無時回查無訊息", async function () {
  aiReply = reply("MARKET", { species_code: 9999 });
  marketError = Object.assign(new Error("查無此魚種代碼"), {
    status: 404, data: { code: "SPECIES_NOT_FOUND", message: "查無此魚種代碼" }
  });
  await flow.submitText("這條多少錢");
  assert.match(assistantText(), /查無此魚種代碼/);
});

test("導購：模型給 species_code 時依代碼對應名稱篩選商品", async function () {
  aiReply = reply("BUY", { species_code: 2722 });
  await flow.submitText("幫我找石斑");
  assert.deepEqual(productCards(), ["prd_b"]);
});

test("導購：模型只給 fish_species 時依名稱篩選商品", async function () {
  aiReply = reply("BUY", { fish_species: "黑鯛" });
  await flow.submitText("幫我找石斑");
  assert.deepEqual(productCards(), ["prd_b"]);
});

test("導購：模型沒給魚種時仍由規則式抽取篩選商品", async function () {
  aiReply = reply("BUY", {});
  await flow.submitText("幫我找石斑");
  assert.deepEqual(productCards(), ["prd_a"]);
});
