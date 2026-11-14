/* 工具結果卡片：CHAT 行情卡與 WEB 資料來源卡。 */

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

globalThis.window = {
  HaisenAPI: {
    getToken: function () { return "token"; },
    BASE: "http://api.test",
    request: async function (path, options) {
      requests.push({ path: path, body: options && options.body });
      if (path === "/api/chat/message") return { data: messageOf((options && options.body) || {}) };
      if (path === "/api/ai/reply") return { data: aiReply };
      throw new Error("unexpected path: " + path);
    }
  }
};

const store = await import("../assets/js/demo/store.js");
const flow = await import("../assets/js/demo/flow.js");
const assistantView = await import("../assets/js/demo/views/assistant.js");

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

test("CHAT 有行情工具結果時，文字後附既有行情卡", async function () {
  aiReply = {
    handled: true,
    intent: "CHAT",
    reply_text: "石斑魚今天有行情。",
    slots: {},
    sources: [],
    tool_results: {
      market: {
        found: true,
        species_code: 2201,
        species_name: "石斑魚",
        official_name: "石斑魚",
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
      }
    }
  };

  await flow.submitText("石斑跟黑鯛哪個比較貴");
  const html = assistantView.renderAssistant();
  assert.match(html, /行情卡/);
  assert.match(html, /石斑魚/);
  assert.match(html, /60/);
});

test("WEB 回覆寫入資料來源卡，最多三個連結", async function () {
  aiReply = {
    handled: true,
    intent: "WEB",
    reply_text: "今天多雲短暫雨。",
    slots: {},
    sources: [
      { title: "中央氣象署", url: "https://www.cwa.gov.tw/a" },
      { title: "新聞", url: "https://example.com/b" },
      { title: "第二新聞", url: "https://example.com/c" },
      { title: "多餘來源", url: "https://example.com/d" }
    ],
    tool_results: {}
  };

  await flow.submitText("今天天氣如何");
  const html = assistantView.renderAssistant();
  assert.match(html, /資料來源/);
  assert.match(html, /中央氣象署/);
  assert.equal((html.match(/<a /g) || []).length, 3);
});
