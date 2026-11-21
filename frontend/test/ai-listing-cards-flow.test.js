/* listing 卡片流程：行情卡由官方 API 產生、ask 不顯示、草稿卡不加提示文字。 */

import test from "node:test";
import assert from "node:assert/strict";
import { USER_CITY, setupAiTest } from "./ai-fixtures.js";

const MARKET = {
  found: true,
  species_code: 2101,
  species_name: "鬼頭刀",
  official_name: "鬼頭刀",
  scope: "city",
  region: "高雄市",
  trade_date: "2026-10-22",
  price_per_kg: 100,
  price_per_taijin: 60,
  is_aquaculture: false,
  source: "農業部漁產品交易行情",
  source_url: "https://example.com/market",
  fetched_at: "2026-10-22T00:00:00.000Z",
  quality: "official",
  history: []
};

let aiReply = null;

const ai = await setupAiTest({
  user: USER_CITY,
  handle: async function (path) {
    if (path === "/api/ai/reply") return { data: aiReply };
    if (path.indexOf("/api/market/prices") === 0 || path.indexOf("/api/market/quote") === 0) {
      return { data: MARKET };
    }
    throw new Error("unexpected path: " + path);
  }
});

const store = ai.store;
const flow = ai.flow;
const assistantView = await import("../assets/js/demo/views/assistant.js");
const { renderCard } = await import("../assets/js/demo/views/cards.js");

const DRAFT = {
  fish_species: "鬼頭刀",
  species_code: 2101,
  quantity: 2,
  condition: "放血冰鎮",
  photo_url: "/uploads/a.jpg",
  price: null,
  price_per_taijin: null
};

function listingReply(overrides) {
  return {
    handled: true,
    intent: "SELL",
    slots: {},
    listing: Object.assign({
      reply_text: null,
      corrections: [],
      draft_changes: {},
      correction_history: [],
      protected_names: [],
      condition_proposal: null,
      next_action: "ask"
    }, overrides || {}),
    reply_text: null,
    sources: [],
    tool_results: {}
  };
}

function setRoom() {
  store.update({
    room: { id: "conv_1", type: "assistant", context: { mode: "listing", draft: DRAFT, last_cards: [] } }
  });
}

test.beforeEach(function () {
  ai.reset();
  aiReply = { handled: false };
});

test("show_market_card 時以官方行情產生行情卡", async function () {
  aiReply = listingReply({ reply_text: "目前行情如下。", next_action: "show_market_card" });
  setRoom();

  await flow.submitText("2尾");

  const html = assistantView.renderAssistant();
  assert.match(html, /行情卡/);
  assert.match(html, /鬼頭刀/);
  assert.match(html, /60/);
});

test("next_action 為 ask 時不顯示行情卡", async function () {
  aiReply = listingReply({ reply_text: "請提供整批售價。", next_action: "ask" });
  setRoom();

  await flow.submitText("2尾");

  assert.doesNotMatch(assistantView.renderAssistant(), /行情卡/);
});

test("草稿卡本身不加「想修改直接告訴我」", function () {
  const html = renderCard({ type: "draft", draft: DRAFT }, "msg_1");
  assert.doesNotMatch(html, /想修改直接告訴我/);
});
